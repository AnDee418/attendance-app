import { getSession } from 'next-auth/react';
import sheets from '../../lib/googleSheets';

export default async function handler(req, res) {
  try {
    // セッションからユーザー情報を取得
    const session = await getSession({ req });
    if (!session || !session.user) {
      return res.status(401).json({ error: 'ログインが必要です' });
    }

    // ユーザー名を取得
    const userName = session.user.name;
    if (!userName) {
      return res.status(400).json({ error: 'ユーザー名が見つかりません' });
    }

    try {
      // スプレッドシートからユーザー情報を検索
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'ユーザー!A:F',
      });
      
      const rows = result.data.values || [];
      
      // ヘッダー行を除外
      const dataRows = rows.length > 0 ? rows.slice(1) : [];
      
      // ユーザー名に一致する行を検索
      const userRow = dataRows.find(row => row[0] === userName);
      
      if (userRow) {
        // ユーザー情報を返す
        return res.status(200).json({ 
          data: userRow,
          message: 'ユーザー情報を取得しました'
        });
      } else {
        // スプレッドシートに見つからない場合はセッション情報から最低限のデータを返す
        return res.status(200).json({ 
          data: [userName],
          message: 'ユーザー情報はセッションから取得されました'
        });
      }
    } catch (error) {
      console.error('スプレッドシートアクセスエラー:', error);
      // APIエラーの場合はセッション情報から最低限のデータを返す
      return res.status(200).json({ 
        data: [userName],
        message: 'スプレッドシートへのアクセスに失敗しましたが、セッションからユーザー情報を提供します'
      });
    }
  } catch (error) {
    console.error('ユーザーAPI処理エラー:', error);
    return res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
} 