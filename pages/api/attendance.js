// pages/api/attendance.js
import sheets from '../../lib/googleSheets';
import { authOptions } from './auth/[...nextauth]';

export default async function handler(req, res) {
  // GET メソッドの場合、シートから勤務記録を取得して返す
  if (req.method === 'GET') {
    try {
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: '勤務記録!A:G',
      });
      // result.data.values に勤務記録の各行が入っています
      const rows = result.data.values || [];
      
      // フィルタリングパラメータがある場合はデータを絞り込む
      if (req.query.month && req.query.year) {
        const targetMonth = parseInt(req.query.month, 10);
        const targetYear = parseInt(req.query.year, 10);
        
        // 最大件数制限を設定
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 500;
        
        // データをフィルタリング
        const filteredRows = rows.filter((row, index) => {
          if (index >= limit) return false;
          
          const rowDate = new Date(row[0]);
          return !isNaN(rowDate.getTime()) &&
                 rowDate.getMonth() + 1 === targetMonth &&
                 rowDate.getFullYear() === targetYear;
        });
        
        return res.status(200).json({ data: filteredRows });
      }
      
      return res.status(200).json({ data: rows });
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  // POST メソッドの場合、勤務記録をシートに書き込む
  else if (req.method === 'POST') {
    try {
      const { date, employeeName, startTime, endTime, workType, recordType, totalWorkTime } = req.body;
      
      console.log("API受信データ:", req.body);
      
      // 勤務種別が「勤務種別」の場合は「出勤」に修正
      const correctedWorkType = workType === '勤務種別' ? '出勤' : workType;

      // 既存データの確認
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: '勤務記録!A:G',
      });
      
      const rows = result.data.values || [];
      const existingRowIndex = rows.findIndex(row => 
        row[0] === date && 
        row[1] === employeeName && 
        row[5] === recordType
      );
      
      if (existingRowIndex !== -1) {
        // 既存データを削除
        const rowsToKeep = rows.filter((row, index) => 
          !(row[0] === date && 
            row[1] === employeeName && 
            row[5] === recordType)
        );
        
        // シートをクリアして新しいデータを書き込み
        await sheets.spreadsheets.values.clear({
          spreadsheetId: process.env.GOOGLE_SHEET_ID,
          range: '勤務記録!A:G',
        });
        
        // フィルタリングした行を書き戻し
        if (rowsToKeep.length > 0) {
          await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: '勤務記録!A:G',
            valueInputOption: 'RAW',
            requestBody: {
              values: rowsToKeep,
            },
          });
        }
      }

      // スプレッドシートに書き込むデータを準備
      const values = [
        [date, employeeName, startTime, endTime, correctedWorkType, recordType, totalWorkTime]
      ];
      
      console.log("シートに書き込むデータ:", values);

      // スプレッドシートに書き込み
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: '勤務記録!A:G', 
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values,
        },
      });

      return res.status(200).json({ message: '勤務記録を更新しました。' });
    } catch (error) {
      console.error('Error posting attendance:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  // PUT メソッドの場合、既存の勤務記録を更新
  else if (req.method === 'PUT') {
    try {
      const { id, ...attendance } = req.body;
      
      // Google Sheetsに更新をかける
      // ...
      
      res.status(200).json({ success: true, message: '勤務記録が更新されました' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  // DELETE メソッドを追加
  else if (req.method === 'DELETE') {
    try {
      const { date, employeeName, recordType } = req.query;
      
      // 該当する行を検索して削除
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: '勤務記録!A:G',
      });
      
      const rows = result.data.values || [];
      const rowsToKeep = rows.filter(row => 
        !(row[0] === date && 
          row[1] === employeeName && 
          row[5] === recordType)
      );
      
      // シートをクリアして新しいデータを書き込み
      await sheets.spreadsheets.values.clear({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: '勤務記録!A:G',
      });
      
      if (rowsToKeep.length > 0) {
        await sheets.spreadsheets.values.append({
          spreadsheetId: process.env.GOOGLE_SHEET_ID,
          range: '勤務記録!A:G',
          valueInputOption: 'RAW',
          requestBody: {
            values: rowsToKeep,
          },
        });
      }
      
      return res.status(200).json({ message: 'Successfully deleted' });
    } catch (error) {
      console.error('Error deleting attendance:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  // GET も POST も DELETE もそれ以外の場合、405 エラーを返す
  else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
