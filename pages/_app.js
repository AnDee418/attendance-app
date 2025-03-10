// pages/_app.js
import '../styles/globals.css';
import { SessionProvider } from 'next-auth/react';
import Layout from '../components/Layout';
import Head from 'next/head';

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  // 各ページは静的プロパティ title を設定可能。無ければデフォルト "My App"。
  const title = Component.title || "My App";
  return (
    <>
      <Head>
        <title>勤怠管理アプリ</title>
        <meta name="description" content="勤怠管理アプリケーション" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <SessionProvider session={session}>
        <Layout title={title}>
          <Component {...pageProps} />
        </Layout>
      </SessionProvider>
    </>
  );
}

export default MyApp;
