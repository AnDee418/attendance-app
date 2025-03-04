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

export default function Layout({ children, title, hideNavigation = false }) {
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
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className={hideNavigation ? "pb-0" : "pb-20"}>{children}</main>
      {!hideNavigation && <BottomNavigation />}
    </div>
  );
}
