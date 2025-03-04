import sheets from '../../lib/googleSheets';

export default async function handler(req, res) {
  try {
    // 環境変数の値を直接確認（秘密鍵は安全のため一部のみ表示）
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const serviceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKeyStart = process.env.GOOGLE_PRIVATE_KEY 
      ? process.env.GOOGLE_PRIVATE_KEY.substring(0, 30) + '...' 
      : 'undefined';
    
    console.log('シートID直接参照:', sheetId);
    
    // スプレッドシートの基本情報を取得するテスト（直接変数を使用）
    try {
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: sheetId
      });
      
      // スプレッドシート情報が取得できた場合
      console.log('スプレッドシート取得成功:', spreadsheet.data.properties.title);
      
      // Usersシートのデータを取得するテスト
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
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
          email: row[3] || 'N/A'
        }))
      });
    } catch (spreadsheetError) {
      // スプレッドシート取得エラーの詳細を返す
      return res.status(500).json({
        success: false,
        stage: 'スプレッドシート取得',
        error: spreadsheetError.message,
        debugInfo: {
          sheetIdExists: !!sheetId,
          sheetIdLength: sheetId ? sheetId.length : 0,
          serviceAccountExists: !!serviceAccount,
          privateKeyStartsWith: privateKeyStart
        }
      });
    }
  } catch (error) {
    console.error('Google Sheetsテストエラー:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
} 