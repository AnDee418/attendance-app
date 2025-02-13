import sheets from '../../lib/googleSheets';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const USERS_SHEET_NAME = 'Users';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { name, userId, password, email, affiliation, accountType } = req.body;

  // バリデーション
  if (!name || !userId || !password || !email || !affiliation || !accountType) {
    return res.status(400).json({ error: '必要な項目が不足しています。' });
  }

  // アカウント種別の検証
  const validAccountTypes = ['管理者', '営業', '業務', 'アルバイト'];
  if (!validAccountTypes.includes(accountType)) {
    return res.status(400).json({ error: '無効なアカウント種別です。' });
  }

  try {
    // ユーザーIDの重複チェック
    const existingUsers = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${USERS_SHEET_NAME}'!A:G`,
    });
    
    const users = existingUsers.data.values || [];
    if (users.some(user => user[1] === userId)) {
      return res.status(400).json({ error: 'このユーザーIDは既に使用されています。' });
    }

    // 新規ユーザーを追加
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${USERS_SHEET_NAME}'!A:G`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[name, userId, password, email, affiliation, accountType, '']],
      },
    });

    res.status(200).json({ message: 'ユーザーアカウントを作成しました。' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'ユーザーアカウントの作成に失敗しました。' });
  }
} 