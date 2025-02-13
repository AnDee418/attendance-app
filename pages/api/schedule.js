// pages/api/schedule.js
import sheets from '../../lib/googleSheets';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = '予定';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { date, employeeName, scheduleTitle, scheduleStart, scheduleEnd, detail } = req.body;
    if (!date || !employeeName || !scheduleTitle || !scheduleStart || !scheduleEnd || !detail) {
      res.status(400).json({ error: 'Missing required fields.' });
      return;
    }
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        // シート名をシングルクォーテーションで囲み、A～F列に登録
        range: `'${SHEET_NAME}'!A:F`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[date, employeeName, scheduleTitle, scheduleStart, scheduleEnd, detail]],
        },
      });
      res.status(200).json({ message: '予定記録を登録しました。' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: '予定記録の登録に失敗しました。' });
    }
  } else if (req.method === 'GET') {
    try {
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A:F`,
      });
      const rows = result.data.values || [];
      res.status(200).json({ data: rows });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: '予定記録の取得に失敗しました。' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
