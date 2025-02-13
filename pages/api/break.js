// pages/api/break.js
import sheets from '../../lib/googleSheets';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = '休憩記録';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { date, employeeName, breakStart, breakEnd, recordType } = req.body;
    if (!date || !employeeName || !breakStart || !breakEnd || !recordType) {
      return res.status(400).json({ error: '必要な項目が不足しています。' });
    }
    try {
      // 休憩記録では、範囲を A:E とし、最後の列に recordType を保存
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A:E`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[date, employeeName, breakStart, breakEnd, recordType]],
        },
      });
      res.status(200).json({ message: '休憩記録を登録しました。' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: '休憩記録の登録に失敗しました。' });
    }
  } else if (req.method === 'GET') {
    try {
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A:E`,
      });
      const rows = result.data.values || [];
      res.status(200).json({ data: rows });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: '休憩記録の取得に失敗しました。' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
