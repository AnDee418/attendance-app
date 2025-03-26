// pages/api/break.js
import sheets from '../../lib/googleSheets';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = '休憩記録';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // データの取得方法を変更し、単一オブジェクトまたは配列のどちらにも対応
    const data = req.body;
    
    // 単一のレコードの場合
    if (data.date && data.employeeName) {
      const { date, employeeName, breakStart, breakEnd, recordType } = data;
      
      if (!date || !employeeName) {
        return res.status(400).json({ error: '日付と社員名は必須です。' });
      }
      
      if (breakStart && breakEnd) {
        try {
          // 新しいデータを追加
          await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${SHEET_NAME}'!A:E`,
            valueInputOption: 'RAW',
            requestBody: {
              values: [[date, employeeName, breakStart, breakEnd, recordType]],
            },
          });
          res.status(200).json({ message: '休憩記録を追加しました。' });
        } catch (error) {
          console.error(error);
          res.status(500).json({ error: '休憩記録の更新に失敗しました。' });
        }
      } else {
        res.status(200).json({ message: '休憩記録なし' });
      }
    } 
    // 配列の場合（複数レコード）
    else if (Array.isArray(data) && data.length > 0) {
      try {
        // 有効なレコードのみフィルタリング
        const validRecords = data.filter(record => 
          record.date && 
          record.employeeName && 
          record.breakStart && 
          record.breakEnd && 
          record.recordType
        );
        
        if (validRecords.length === 0) {
          return res.status(200).json({ message: '有効な休憩記録はありませんでした。' });
        }
        
        // 有効なレコードをシートに追加する形式に変換
        const values = validRecords.map(record => [
          record.date,
          record.employeeName,
          record.breakStart,
          record.breakEnd,
          record.recordType
        ]);
        
        // シートに一括追加
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${SHEET_NAME}'!A:E`,
          valueInputOption: 'RAW',
          requestBody: {
            values: values,
          },
        });
        
        res.status(200).json({ message: `${values.length}件の休憩記録を追加しました。` });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: '休憩記録の一括更新に失敗しました。' });
      }
    } else {
      res.status(400).json({ error: 'データ形式が不正です。' });
    }
  } else if (req.method === 'GET') {
    try {
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A:E`,
      });
      const rows = result.data.values || [];
      
      // 月別フィルタリングのサポート
      if (req.query.month && req.query.year) {
        const targetMonth = parseInt(req.query.month, 10);
        const targetYear = parseInt(req.query.year, 10);
        
        console.log(`break.js: フィルタリング - ${targetYear}年${targetMonth}月のデータを取得します`);
        
        // 日付に基づいてフィルタリング
        const filteredRows = rows.filter(row => {
          if (!row[0]) return false;
          
          try {
            const itemDate = new Date(row[0]);
            const itemYear = itemDate.getFullYear();
            const itemMonth = itemDate.getMonth() + 1; // 1-12の範囲
            
            return itemYear === targetYear && itemMonth === targetMonth;
          } catch (e) {
            console.error('日付のパースエラー:', e, row);
            return false;
          }
        });
        
        console.log(`break.js: フィルタリング結果 - ${filteredRows.length}件のデータを返します`);
        return res.status(200).json({ data: filteredRows });
      }
      
      res.status(200).json({ data: rows });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: '休憩記録の取得に失敗しました。' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { date, employeeName, recordType } = req.query;
      
      if (!date || !employeeName || !recordType) {
        return res.status(400).json({ error: '必要なパラメータが不足しています' });
      }
      
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A:E`,
      });
      
      const rows = result.data.values || [];
      const rowsToKeep = rows.filter(row => 
        !(row[0] === date && 
          row[1] === employeeName && 
          row[4] === recordType)
      );
      
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A:E`,
      });
      
      if (rowsToKeep.length > 0) {
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${SHEET_NAME}'!A:E`,
          valueInputOption: 'RAW',
          requestBody: {
            values: rowsToKeep,
          },
        });
      }
      
      return res.status(200).json({ success: true, message: '休憩データが削除されました' });
    } catch (error) {
      console.error('Error deleting break records:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
