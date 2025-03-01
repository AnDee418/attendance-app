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
      return res.status(200).json({ data: result.data.values });
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  // POST メソッドの場合、勤務記録をシートに書き込む
  else if (req.method === 'POST') {
    try {
      const { date, employeeName, startTime, endTime, workType, recordType, totalWorkTime } = req.body;

      // スプレッドシートに書き込むデータを準備
      const values = [
        [date, employeeName, startTime, endTime, workType, recordType, totalWorkTime]
      ];

      // スプレッドシートに書き込み
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: '勤務記録!A:G', // G列に実労働時間などのデータが含まれる
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values,
        },
      });

      return res.status(200).json({ message: 'Success' });
    } catch (error) {
      console.error('Error posting attendance:', error);
      return res.status(500).json({ error: 'Internal server error' });
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
