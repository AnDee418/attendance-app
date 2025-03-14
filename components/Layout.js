// components/Layout.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import {
  HomeIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  UserCircleIcon,
  CogIcon,
  ShieldCheckIcon,
  PlusCircleIcon,
  BellIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import AddMenu from './AddMenu';
import NotificationModal from './NotificationModal';
import Tutorial from './Tutorial';

export default function Layout({ children, title }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isTutorialSectionOpen, setIsTutorialSectionOpen] = useState(false);

  // 下部ナビゲーション項目を修正
  const navItems = [
    { name: 'ホーム', href: '/', icon: HomeIcon },
    { name: '自分の予定', href: '/my-schedule', icon: CalendarIcon },
    { name: 'みんなの予定', href: '/schedules', icon: ClipboardDocumentListIcon },
    { 
      name: '設定', 
      href: '/dashboard', 
      icon: ({ className }) => session?.user?.iconUrl ? (
        <img
          src={session.user.iconUrl}
          alt={session.user.name}
          className={`w-6 h-6 rounded-full object-cover`}
        />
      ) : (
        <UserCircleIcon className={className} />
      )
    }
  ];

  // 未処理の申請数を取得する関数
  const fetchPendingRequests = async () => {
    try {
      const response = await fetch('/api/vacation-requests');
      if (response.ok) {
        const data = await response.json();
        setPendingCount(data.pendingCount || 0);
      }
    } catch (error) {
      // エラーログは残す（本番環境でのデバッグに必要）
      console.error('Error fetching pending requests:', error);
    }
  };

  // アルバイトユーザーの承認済み申請を取得する関数
  const fetchApprovedRequests = async () => {
    if (!session?.user?.isAdmin) {
      try {
        const response = await fetch('/api/vacation-requests');
        if (response.ok) {
          const data = await response.json();
          const myApprovedRequests = data.data.filter(req => 
            req.employeeName === session.user.name && 
            req.status === '許可'
          );
          setNotifications(myApprovedRequests);
          const newlyApprovedCount = myApprovedRequests.filter(req => !req.isChecked).length;
          setNotificationCount(newlyApprovedCount);
        }
      } catch (error) {
        // エラーログは残す
        console.error('Error fetching approved requests:', error);
      }
    }
  };

  // 通知を既読にする関数
  const handleMarkAsRead = async (notification) => {
    try {
      const response = await fetch('/api/vacation-requests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'check',
          date: notification.date,
          employeeName: notification.employeeName,
        }),
      });

      if (response.ok) {
        // 通知を更新
        await fetchApprovedRequests();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // 定期的に未処理の申請数と承認済み申請を確認
  useEffect(() => {
    if (session?.user?.isAdmin) {
      fetchPendingRequests();
      const intervalId = setInterval(fetchPendingRequests, 30000);
      return () => clearInterval(intervalId);
    } else if (session?.user) {  // 管理者以外のログインユーザー全て
      fetchApprovedRequests();
      const intervalId = setInterval(fetchApprovedRequests, 30000);
      return () => clearInterval(intervalId);
    }
  }, [session]);

  // メニューの中や設定画面などに以下のようなボタンを追加
  const resetTutorial = (category = null) => {
    if (typeof Tutorial.resetTutorial === 'function') {
      Tutorial.resetTutorial(category);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="fixed top-0 left-0 right-0 bg-blue-600 text-white p-4 flex justify-between items-center z-20 shadow-md">
        <h1 className="text-xl font-bold">{title}</h1>
        <div className="flex items-center gap-3">
          {/* 管理者の場合のみ通知アイコンと管理ボタンを表示 */}
          {session?.user?.isAdmin && (
            <>
              <Link
                href="/vacation-management"
                className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-blue-700 transition-colors"
              >
                <BellIcon className="h-6 w-6" />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </Link>
              <Link
                href="/admin"
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
              >
                <CogIcon className="h-5 w-5" />
                <span className="text-sm">管理</span>
              </Link>
            </>
          )}
          
          {/* アルバイトユーザーの場合の通知アイコン */}
          {session?.user && !session.user.isAdmin && (
            <>
              <button
                onClick={() => setIsNotificationModalOpen(true)}
                className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-blue-700 transition-colors"
              >
                <BellIcon className="h-6 w-6" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {notificationCount}
                  </span>
                )}
              </button>

              <NotificationModal
                isOpen={isNotificationModalOpen}
                onClose={() => setIsNotificationModalOpen(false)}
                notifications={notifications}
                onMarkAsRead={handleMarkAsRead}
              />
            </>
          )}
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 pt-20 pb-24 px-4">
        {/* 設定ページ（dashboard）にチュートリアルボタンを表示 */}
        {router.pathname === '/dashboard' && (
          <div className="mb-6 bg-white rounded-lg shadow overflow-hidden">
            <button 
              onClick={() => setIsTutorialSectionOpen(!isTutorialSectionOpen)}
              className="w-full bg-blue-50 px-4 py-3 border-l-4 border-blue-500 flex justify-between items-center hover:bg-blue-100 transition-colors"
            >
              <h2 className="text-lg font-semibold text-blue-800">アプリチュートリアル</h2>
              {isTutorialSectionOpen ? (
                <ChevronUpIcon className="h-5 w-5 text-blue-600" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 text-blue-600" />
              )}
            </button>
            
            {isTutorialSectionOpen && (
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* すべてのチュートリアルを表示 */}
                  <button 
                    onClick={() => resetTutorial()}
                    className="flex items-center justify-between w-full p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 group"
                  >
                    <div className="flex items-center">
                      <div className="bg-blue-100 p-3 rounded-full mr-4 group-hover:bg-blue-200 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <h3 className="font-medium text-blue-900">全チュートリアルを見る</h3>
                        <p className="text-sm text-blue-700">カテゴリーを選択して必要な説明だけ確認できます</p>
                      </div>
                    </div>
                    <div className="text-blue-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </button>
                  
                  {/* 自分の予定ページのチュートリアル */}
                  <button 
                    onClick={() => resetTutorial('mySchedule')}
                    className="flex items-center justify-between w-full p-4 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200 group"
                  >
                    <div className="flex items-center">
                      <div className="bg-amber-100 p-3 rounded-full mr-4 group-hover:bg-amber-200 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <h3 className="font-medium text-amber-900">自分の予定ページ</h3>
                        <p className="text-sm text-amber-700">予定の追加と勤務実績の登録方法</p>
                      </div>
                    </div>
                    <div className="text-amber-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </button>
                  
                  {/* みんなの予定ページのチュートリアル */}
                  <button 
                    onClick={() => resetTutorial('schedules')}
                    className="flex items-center justify-between w-full p-4 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors border border-cyan-200 group"
                  >
                    <div className="flex items-center">
                      <div className="bg-cyan-100 p-3 rounded-full mr-4 group-hover:bg-cyan-200 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <h3 className="font-medium text-cyan-900">みんなの予定ページ</h3>
                        <p className="text-sm text-cyan-700">ユーザーカードと社員の予定確認方法</p>
                      </div>
                    </div>
                    <div className="text-cyan-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </button>
                  
                  {/* 詳細ページのチュートリアル */}
                  <button 
                    onClick={() => resetTutorial('detailPage')}
                    className="flex items-center justify-between w-full p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200 group"
                  >
                    <div className="flex items-center">
                      <div className="bg-green-100 p-3 rounded-full mr-4 group-hover:bg-green-200 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <h3 className="font-medium text-green-900">詳細ページの使い方</h3>
                        <p className="text-sm text-green-700">カレンダーや社員情報の見方</p>
                      </div>
                    </div>
                    <div className="text-green-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </button>
                  
                  {/* 設定ページのチュートリアル */}
                  <button 
                    onClick={() => resetTutorial('settings')}
                    className="flex items-center justify-between w-full p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200 group"
                  >
                    <div className="flex items-center">
                      <div className="bg-purple-100 p-3 rounded-full mr-4 group-hover:bg-purple-200 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <h3 className="font-medium text-purple-900">設定の使い方</h3>
                        <p className="text-sm text-purple-700">アカウント設定と管理</p>
                      </div>
                    </div>
                    <div className="text-purple-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      
        {children}
      </main>

      {/* 下部ナビゲーション */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <ul className="flex justify-around">
          {navItems.map((item, index) => {
            const isActive = router.pathname === item.href;
            const Icon = item.icon;
            return (
              <li key={index} className="flex-1">
                <Link
                  href={item.href}
                  onClick={item.onClick}
                  className={`flex flex-col items-center justify-center p-2 relative ${
                    isActive
                      ? "text-blue-600"
                      : "text-gray-600 hover:text-blue-500"
                  }`}
                >
                  <div className={`p-2 rounded-full transition-all duration-300 ${
                    isActive 
                      ? "bg-blue-50" 
                      : "hover:bg-gray-100"
                  }`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-xs mt-1">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 追加メニュー */}
      <AddMenu isOpen={isAddMenuOpen} setIsOpen={setIsAddMenuOpen} />
    </div>
  );
}