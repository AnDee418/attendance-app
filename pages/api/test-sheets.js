import sheets from '../../lib/googleSheets';

export default async function handler(req, res) {
  try {
    console.log('シートID:', process.env.GOOGLE_SHEET_ID);
    console.log('サービスアカウント:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
    
    // スプレッドシートの基本情報を取得するテスト
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID
    });
    
    // Usersシートのデータを取得するテスト
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Users!A:H',
    });
    
    const rows = result.data.values || [];
    
    return res.status(200).json({
      success: true,
      spreadsheetTitle: spreadsheet.data.properties.title,
      rowCount: rows.length,
      sampleData: rows.slice(0, 3).map(row => ({
        name: row[0] || 'N/A',
        userId: row[1] || 'N/A',
        // パスワードは表示しない
        email: row[3] || 'N/A',
        affiliation: row[4] || 'N/A'
      }))
    });
  } catch (error) {
    console.error('Google Sheetsテストエラー:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
} 