// pages/api/attendance.js
import sheets from '../../lib/googleSheets';
import { authOptions } from './auth/[...nextauth]';


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { date, employeeName, startTime, endTime, workType, recordType, totalWorkTime } = req.body;

    // スプレッドシートに書き込むデータを準備
    const values = [
      [date, employeeName, startTime, endTime, workType, recordType, totalWorkTime]
    ];

    // スプレッドシートに書き込み
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: '勤務記録!A:G', // 列を1つ追加（G列に実労働時間）
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values,
      },
    });

    res.status(200).json({ message: 'Success' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
