// pages/api/workdetail.js
import sheets from '../../lib/googleSheets';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = '業務詳細';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { date, employeeName, workTitle, workStart, workEnd } = req.body;
    if (!date || !employeeName || !workTitle || !workStart || !workEnd) {
      res.status(400).json({ error: 'Missing required fields.' });
      return;
    }
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:E`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[date, employeeName, workTitle, workStart, workEnd]],
        },
      });
      res.status(200).json({ message: '業務詳細記録を登録しました。' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: '業務詳細記録の登録に失敗しました。' });
    }
  } else if (req.method === 'GET') {
    try {
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:E`,
      });
      const rows = result.data.values || [];
      res.status(200).json({ data: rows });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: '業務詳細記録の取得に失敗しました。' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
