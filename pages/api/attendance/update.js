// pages/api/attendance/update.js
import sheets from '../../../lib/googleSheets';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = '勤務記録';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { rowIndex, date, employeeName, startTime, endTime } = req.body;
    if (!rowIndex || !date || !employeeName || !startTime || !endTime) {
      return res.status(400).json({ error: '必要な項目が不足しています。' });
    }
    try {
      // シート上の行番号は 1-based で指定
      const range = `'${SHEET_NAME}'!A${rowIndex}:D${rowIndex}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: range,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[date, employeeName, startTime, endTime]],
        },
      });
      res.status(200).json({ message: '勤怠情報を更新しました。' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: '勤怠情報の更新に失敗しました。' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
