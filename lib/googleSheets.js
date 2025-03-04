// lib/googleSheets.js
import { google } from 'googleapis';

// 秘密鍵の前処理関数
function processPrivateKey(key) {
  if (!key) return undefined;
  
  // 余分な引用符を削除
  let processedKey = key;
  if (processedKey.startsWith('"') && processedKey.endsWith('"')) {
    processedKey = processedKey.slice(1, -1);
  }
  
  // バックスラッシュでエスケープされた改行を実際の改行に変換
  processedKey = processedKey.replace(/\\n/g, '\n');
  
  return processedKey;
}

const privateKey = processPrivateKey(process.env.GOOGLE_PRIVATE_KEY);

const auth = new google.auth.JWT(
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  null,
  privateKey,
  ['https://www.googleapis.com/auth/spreadsheets']
);

const sheets = google.sheets({ version: 'v4', auth });

export default sheets;

// sheets のエクスポートを削除（各APIルートで個別に作成する）
