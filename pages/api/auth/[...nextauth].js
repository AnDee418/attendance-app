import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import sheets from '../../../lib/googleSheets';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const USERS_SHEET_NAME = 'Users';

async function getUserById(userId) {
  try {
    console.log('シート接続開始:', SPREADSHEET_ID);
    console.log('シート名:', USERS_SHEET_NAME);
    
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${USERS_SHEET_NAME}'!A:H`,
    });
    
    console.log('シートデータ取得:', result.data ? '成功' : '失敗');
    const rows = result.data.values || [];
    console.log('行数:', rows.length);
    
    // 各行は [名前, ID, PASS, メールアドレス, 所属, アカウント種別, アイコンURL, isAdmin] の順
    const userRow = rows.find((row) => row[1] === userId);
    console.log('ユーザー検索結果:', userRow ? '見つかりました' : '見つかりません');
    
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
    console.error('ユーザー情報取得エラー詳細:', error.message);
    console.error('エラースタック:', error.stack);
    return null;
  }
}

// authOptions として設定内容を定義し、named export する
export const authOptions = {
  debug: true,  // デバッグモードを有効化
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        userId: { label: 'ID', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('認証リクエスト:', credentials.userId);
        try {
          const user = await getUserById(credentials.userId);
          console.log('取得したユーザー情報:', user ? '成功' : '失敗');
          
          if (user) {
            console.log('パスワード検証:', user.password === credentials.password);
            if (user.password === credentials.password) {
              return {
                id: user.userId,
                name: user.name,
                email: user.email,
                affiliation: user.affiliation,
                location: user.affiliation,
                accountType: user.accountType,
                isAdmin: user.isAdmin
              };
            }
          }
          
          console.log('認証失敗');
          return null;
        } catch (error) {
          console.error('認証エラー:', error);
          return null;
        }
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
        token.location = user.location;
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
        session.user.location = token.location;
        session.user.accountType = token.accountType;
        session.user.isAdmin = token.isAdmin;
        session.user.iconUrl = token.iconUrl;
      }
      console.log('セッション更新 - ユーザー情報:', {
        name: session.user.name,
        affiliation: session.user.affiliation,
        location: session.user.location,
        accountType: session.user.accountType
      });
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
