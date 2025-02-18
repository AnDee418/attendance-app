import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import sheets from '../../../lib/googleSheets';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const USERS_SHEET_NAME = 'Users';

async function getUserById(userId) {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${USERS_SHEET_NAME}'!A:H`,
    });
    const rows = result.data.values || [];
    // 各行は [名前, ID, PASS, メールアドレス, 所属, アカウント種別, アイコンURL, isAdmin] の順
    const userRow = rows.find((row) => row[1] === userId);
    if (!userRow) return null;
    return {
      name: userRow[0],
      userId: userRow[1],
      password: userRow[2],
      email: userRow[3],
      affiliation: userRow[4],
      accountType: userRow[5],
      iconUrl: userRow[6],
      isAdmin: userRow[7] === 'true',
    };
  } catch (error) {
    console.error('ユーザー情報取得エラー:', error);
    return null;
  }
}

// authOptions として設定内容を定義し、named export する
export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        userId: { label: 'ID', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const user = await getUserById(credentials.userId);
        if (user && user.password === credentials.password) {
          // 認証成功：必要な情報を返す
          return {
            id: user.userId,
            name: user.name,
            email: user.email,
            affiliation: user.affiliation,
            accountType: user.accountType,
            isAdmin: user.isAdmin
          };
        }
        // 認証失敗
        return null;
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.name = user.name;
        token.userId = user.id;
        token.email = user.email;
        token.affiliation = user.affiliation;
        token.accountType = user.accountType;
        token.isAdmin = user.isAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.name = token.name;
        session.user.userId = token.userId;
        session.user.email = token.email;
        session.user.affiliation = token.affiliation;
        session.user.accountType = token.accountType;
        session.user.isAdmin = token.isAdmin;
        session.user.iconUrl = token.iconUrl;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
};

// NextAuth の初期化処理は default export として行う
export default NextAuth(authOptions);
