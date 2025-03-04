// lib/googleSheets.js
import { google } from 'googleapis';

const auth = new google.auth.JWT(
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  null,
  // 改行コードの置換に注意（環境変数では "\\n" となっている場合があるため）
  process.env.GOOGLE_PRIVATE_KEY 
    ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') 
    : undefined,
  ['https://www.googleapis.com/auth/spreadsheets']
);

const sheets = google.sheets({ version: 'v4', auth });

export default sheets;

// sheets のエクスポートを削除（各APIルートで個別に作成する）
