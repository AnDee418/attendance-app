// pages/api/attendance.js
import sheets from '../../lib/googleSheets';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = '勤務記録';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { date, employeeName, startTime, endTime, workType, recordType } = req.body;
    if (!date || !employeeName || !startTime || !endTime || !workType || !recordType) {
      return res.status(400).json({ error: '必要な項目が不足しています。' });
    }
    try {
      // 範囲を A:G とし、最後の列に recordType を保存
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A:G`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[date, employeeName, startTime, endTime, workType, recordType]],
        },
      });
      res.status(200).json({ message: '勤務記録を登録しました。' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: '勤務記録の登録に失敗しました。' });
    }
  } else if (req.method === 'GET') {
    try {
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A:G`,
      });
      const rows = result.data.values || [];
      res.status(200).json({ data: rows });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: '勤務記録の取得に失敗しました。' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
