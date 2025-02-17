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
        range: `${SHEET_NAME}!A:G`,
      });
      const rows = result.data.values || [];
      res.status(200).json({ data: rows });
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

      // 必須フィールドの検証
      if (!date || !employeeName || !workTitle) {
        res.status(400).json({ error: 'Missing required fields.' });
        return;
      }

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:G`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            date,           // 日付
            employeeName,   // 社員名
            workTitle,      // 業務タイトル
            workStart,      // 業務開始時間
            workEnd,        // 業務終了時間
            workCategory,   // 種別
            recordType      // 登録タイプ
          ]],
        },
      });

      res.status(200).json({ message: '業務詳細記録を登録しました。' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: '業務詳細記録の登録に失敗しました。' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { date, employeeName, recordType } = req.query;
      
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:G`,
      });
      
      const rows = result.data.values || [];
      const rowsToKeep = rows.filter(row => 
        !(row[0] === date && 
          row[1] === employeeName && 
          row[6] === recordType)
      );
      
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:G`,
      });
      
      if (rowsToKeep.length > 0) {
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEET_NAME}!A:G`,
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
