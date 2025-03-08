// pages/api/workdetail.js
import sheets from '../../lib/googleSheets';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = '業務詳細';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // GETメソッドの場合、シートから業務詳細を取得
    try {
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:H`,
      });
      const rows = result.data.values || [];
      const mappedRows = rows.map(row => ({
        date: row[0],           // 日付
        employeeName: row[1],   // 社員名
        workTitle: row[2],      // 業務タイトル
        workStart: row[3],      // 業務開始時間
        workEnd: row[4],        // 業務終了時間
        workCategory: row[5],   // 種別
        recordType: row[6],     // 登録タイプ
        detail: row[7]          // 詳細 (H列)
      }));
      res.status(200).json({ data: mappedRows });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: '業務詳細の取得に失敗しました。' });
    }
  } else if (req.method === 'POST') {
    try {
      const {
        date,
        employeeName,
        workTitle,
        workStart,
        workEnd,
        detail,
        workCategory,
        recordType
      } = req.body;

      // 必須フィールドの検証を修正：日付と社員名のみを必須とする
      if (!date || !employeeName) {
        res.status(400).json({ error: '日付と社員名は必須です。' });
        return;
      }

      // タイトルか詳細、または開始/終了時間のいずれかが入力されている場合のみ登録
      if (workTitle || detail || workStart || workEnd) {
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!A:H`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [[
              date,           // 日付
              employeeName,   // 社員名
              workTitle || '', // 業務タイトル
              workStart || '', // 業務開始時間
              workEnd || '',   // 業務終了時間
              workCategory || '業務', // 種別
              recordType,     // 登録タイプ
              detail || ''    // 詳細 (H列)
            ]],
          },
        });
        
        res.status(200).json({ message: '業務詳細記録を登録しました。' });
      } else {
        // 詳細情報がない場合は単に成功を返す
        res.status(200).json({ message: '業務詳細なし' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: '業務詳細記録の登録に失敗しました。' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { date, employeeName, recordType } = req.query;
      
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:H`,
      });
      
      const rows = result.data.values || [];
      const rowsToKeep = rows.filter(row => 
        !(row[0] === date && 
          row[1] === employeeName && 
          row[6] === recordType)
      );
      
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:H`,
      });
      
      if (rowsToKeep.length > 0) {
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!A:H`,
          valueInputOption: 'RAW',
          requestBody: {
            values: rowsToKeep,
          },
        });
      }
      
      return res.status(200).json({ message: 'Successfully deleted' });
    } catch (error) {
      console.error('Error deleting workdetail:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
