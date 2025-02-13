// pages/_app.js
import '../styles/globals.css';
import { SessionProvider } from 'next-auth/react';
import Layout from '../components/Layout';

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  // 各ページは静的プロパティ title を設定可能。無ければデフォルト "My App"。
  const title = Component.title || "My App";
  return (
    <SessionProvider session={session}>
      <Layout title={title}>
        <Component {...pageProps} />
      </Layout>
    </SessionProvider>
  );
}

export default MyApp;
