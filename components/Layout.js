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
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import AddMenu from './AddMenu';

export default function Layout({ children, title }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  console.log('Session in Layout:', session);

  // 下部ナビゲーション項目を修正
  const navItems = [
    { name: 'ホーム', href: '/', icon: HomeIcon },
    { name: '予定', href: '/my-schedule', icon: CalendarIcon },
    { name: 'みんな', href: '/schedules', icon: ClipboardDocumentListIcon },
    { 
      name: '追加', 
      href: '#', 
      icon: PlusCircleIcon,
      onClick: () => setIsAddMenuOpen(true)
    },
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

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="fixed top-0 left-0 right-0 bg-blue-600 text-white p-4 flex justify-between items-center z-20 shadow-md">
        <h1 className="text-xl font-bold">{title}</h1>
        {/* 管理者の場合のみ 管理 ボタンを表示 */}
        {session?.user?.isAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
          >
            <CogIcon className="h-5 w-5" />
            <span className="text-sm">管理</span>
          </Link>
        )}
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
