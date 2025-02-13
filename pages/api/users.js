// pages/api/users.js
import sheets from '../../lib/googleSheets';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const USERS_SHEET_NAME = 'Users';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // ユーザー一覧を取得
    try {
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${USERS_SHEET_NAME}'!A:G`,
      });
      const rows = result.data.values || [];
      
      // 各行にインデックス（行番号）を追加
      const usersWithRowIndex = rows.slice(1).map((row, index) => ({
        rowIndex: index + 2, // ヘッダー行を考慮して+2
        data: row
      }));
      
      console.log('Users with row index:', usersWithRowIndex);
      res.status(200).json({ data: usersWithRowIndex });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'ユーザー情報の取得に失敗しました。' });
    }
  } else if (req.method === 'POST') {
    // 新規ユーザー登録
    const { name, userId, password, email, affiliation, accountType, iconUrl } = req.body;
    if (!name || !userId || !password || !email || !affiliation || !accountType) {
      return res.status(400).json({ error: '必要な項目が不足しています。' });
    }
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${USERS_SHEET_NAME}'!A:G`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[name, userId, password, email, affiliation, accountType, iconUrl || '']],
        },
      });
      res.status(200).json({ message: 'ユーザーアカウントを作成しました。' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'ユーザーアカウントの作成に失敗しました。' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
