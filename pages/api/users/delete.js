import sheets from '../../../lib/googleSheets';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const USERS_SHEET_NAME = 'Users';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'ユーザーIDが必要です。' });
  }

  try {
    // 1. まず現在のデータを取得
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${USERS_SHEET_NAME}'!A:G`, // アイコンURLも含めるためG列まで
    });
    const rows = result.data.values || [];

    // 2. 削除対象の行を特定（ユーザーIDは2列目[インデックス1]）
    const rowIndex = rows.findIndex(row => row[1] === userId);
    if (rowIndex === -1) {
      return res.status(404).json({ error: 'ユーザーが見つかりません。' });
    }

    // 3. 行を削除（空の値で上書き）
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${USERS_SHEET_NAME}'!A${rowIndex + 1}:G${rowIndex + 1}`,
    });

    res.status(200).json({ message: 'ユーザーを削除しました。' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'ユーザーの削除に失敗しました。' });
  }
} 