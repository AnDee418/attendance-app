// pages/api/workdetail.js
import sheets from '../../lib/googleSheets';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = '業務詳細';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
}
