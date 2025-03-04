export default function handler(req, res) {
  // セキュリティのため値自体は表示せず、存在するかどうかだけを確認
  const envStatus = {
    GOOGLE_SHEET_ID: {
      exists: !!process.env.GOOGLE_SHEET_ID,
      length: process.env.GOOGLE_SHEET_ID ? process.env.GOOGLE_SHEET_ID.length : 0
    },
    GOOGLE_SERVICE_ACCOUNT_EMAIL: {
      exists: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      length: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL.length : 0
    },
    GOOGLE_PRIVATE_KEY: {
      exists: !!process.env.GOOGLE_PRIVATE_KEY,
      length: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.length : 0
    },
    NEXTAUTH_SECRET: {
      exists: !!process.env.NEXTAUTH_SECRET,
      length: process.env.NEXTAUTH_SECRET ? process.env.NEXTAUTH_SECRET.length : 0
    },
    NEXTAUTH_URL: {
      exists: !!process.env.NEXTAUTH_URL,
      length: process.env.NEXTAUTH_URL ? process.env.NEXTAUTH_URL.length : 0
    }
  };

  return res.status(200).json({
    environment: process.env.NODE_ENV,
    variables: envStatus
  });
} 