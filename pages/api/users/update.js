// pages/api/users/update.js
import sheets from '../../../lib/googleSheets';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const USERS_SHEET_NAME = 'Users';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  console.log('Received update request:', req.body); // リクエストデータ

  const { rowIndex, name, userId, password, email, affiliation, accountType, iconUrl, isAdmin } = req.body;
  
  // バリデーション
  if (!rowIndex || rowIndex < 2 || !name || !email || !affiliation || !accountType) {
    console.log('Validation failed:', { rowIndex, name, email, affiliation, accountType });
    return res.status(400).json({ error: '必要な項目が不足しています。' });
  }

  try {
    // 現在のデータを確認
    const currentData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${USERS_SHEET_NAME}'!A${rowIndex}:G${rowIndex}`,
    });
    console.log('Current data:', currentData.data.values?.[0]); // 現在のデータ

    // 更新データを準備
    const updateValues = [
      name,
      userId,
      password,
      email,
      affiliation,
      accountType,
      iconUrl || currentData.data.values?.[0][6] || '', // アイコンURL
      isAdmin ? 'true' : 'false'
    ];
    console.log('Update values:', updateValues); // 更新データ

    // データを更新
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${USERS_SHEET_NAME}'!A${rowIndex}:H${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [updateValues],
      },
    });

    res.status(200).json({ message: 'ユーザー情報を更新しました。' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'ユーザー情報の更新に失敗しました。' });
  }
}
