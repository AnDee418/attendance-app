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
} from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import AddMenu from './AddMenu';
import NotificationModal from './NotificationModal';

export default function Layout({ children, title }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

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
      <main className="flex-1 pt-20 pb-24 px-4">{children}</main>

      {/* 下部ナビゲーション */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
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