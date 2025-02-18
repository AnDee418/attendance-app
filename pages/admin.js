// pages/admin.js
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  UserPlusIcon,
  UserGroupIcon,
  ClockIcon,
  CalendarDaysIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState({
    workHours: {
      '4': 160, // 4月 (3/21～4/20)
      '5': 160, // 5月 (4/21～5/20)
      '6': 160, // 6月 (5/21～6/20)
      '7': 160, // 7月 (6/21～7/20)
      '8': 160, // 8月 (7/21～8/20)
      '9': 160, // 9月 (8/21～9/20)
      '10': 160, // 10月 (9/21～10/20)
      '11': 160, // 11月 (10/21～11/20)
      '12': 160, // 12月 (11/21～12/20)
      '1': 160, // 1月 (12/21～1/20)
      '2': 160, // 2月 (1/21～2/20)
      '3': 160  // 3月 (2/21～3/20)
    },
    paidLeave: {
      baseCount: 10
    }
  });

  useEffect(() => {
    console.log('Current pathname:', router.pathname);
    console.log('Session status:', status);
    console.log('Session data:', session);
  }, [router.pathname, session, status]);

  // 認証チェックを修正
  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
      return;
    }

    if (!session.user?.isAdmin) {
      router.push('/');
      return;
    }
  }, [session, status, router]);

  // デバッグ用のログ出力を追加
  useEffect(() => {
    console.log('Admin page - Current pathname:', router.pathname);
    console.log('Admin page - Session status:', status);
    console.log('Admin page - Session data:', session);
  }, [router.pathname, session, status]);

  // 既存の認証チェック useEffect の下に追加
  useEffect(() => {
    if (session && session.user?.isAdmin) {
      (async () => {
        try {
          const res = await fetch('/api/settings');
          if (res.ok) {
            const data = await res.json();
            // APIから取得した設定データがある場合は state を更新
            setSettings({
              workHours: data.workHours || settings.workHours,
              paidLeave: data.paidLeave || settings.paidLeave,
            });
          }
        } catch (error) {
          console.error('設定データの取得に失敗しました', error);
        }
      })();
    }
  }, [session]);

  const handleSettingsChange = (category, field, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const handleSubmit = async (category) => {
    // 設定の保存処理を実装
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          data: settings[category]
        })
      });
      if (res.ok) {
        alert('設定を保存しました');
      }
    } catch (error) {
      alert('設定の保存に失敗しました');
    }
  };

  // 期間の日数を計算する関数
  const getMonthInfo = (month) => {
    const year = new Date().getFullYear();
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    
    // 期間の開始日と終了日を設定
    const startDate = new Date(prevYear, prevMonth - 1, 21);
    const endDate = new Date(year, month - 1, 20);

    // 期間の日数を計算
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 for inclusive

    return {
      label: `${month}月 (${prevMonth}/21～${month}/20)`,
      days: diffDays
    };
  };

  // ユーザー管理セクションのリンクを修正
  const handleNavigation = (path) => {
    router.push(path);
  };

  // ローディング状態の処理を修正
  if (status === 'loading') {
    return <div className="p-4 text-center">Loading...</div>;
  }

  // 認証チェックを修正
  if (!session || !session.user?.isAdmin) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">管理者設定</h1>
      
      {/* ユーザー管理セクション */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">ユーザー管理</h2>
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/account-issuance"
            className="flex items-center justify-center gap-2 bg-blue-600 text-white p-4 rounded-xl hover:bg-blue-700 transition-colors"
          >
            <UserPlusIcon className="h-6 w-6" />
            <span className="font-medium">新規アカウント作成</span>
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center justify-center gap-2 bg-green-600 text-white p-4 rounded-xl hover:bg-green-700 transition-colors"
          >
            <UserGroupIcon className="h-6 w-6" />
            <span className="font-medium">ユーザー管理・編集</span>
          </Link>
        </div>
      </section>

      {/* 月別最大就業時間設定セクション */}
      <section className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <ClockIcon className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-700">月別最大就業時間設定</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3].map((month) => {
            const { label, days } = getMonthInfo(month);
            return (
              <div key={month} className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <label className="text-sm font-medium text-gray-600 truncate">
                    {label}
                  </label>
                  <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded flex-shrink-0">
                    {days}日間
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={settings.workHours[month]}
                    onChange={(e) => handleSettingsChange('workHours', month.toString(), parseInt(e.target.value))}
                    className="w-full p-1.5 border rounded"
                    min="0"
                    max="300"
                  />
                  <span className="text-xs text-gray-500 flex-shrink-0">時間</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 text-xs text-gray-500">
          <p>※ 各月の期間は前月21日から当月20日までの実日数です</p>
          <p>※ 月の最大就業時間を設定してください</p>
        </div>
        <button
          onClick={() => handleSubmit('workHours')}
          className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          最大就業時間設定を保存
        </button>
      </section>

      {/* 有給休暇設定セクション */}
      <section className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-700">有給休暇設定</h2>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">基本付与日数</label>
          <input
            type="number"
            value={settings.paidLeave.baseCount}
            onChange={(e) =>
              handleSettingsChange('paidLeave', 'baseCount', parseInt(e.target.value))
            }
            className="w-full p-2 border rounded-lg"
            min="0"
          />
        </div>
        <button
          onClick={() => handleSubmit('paidLeave')}
          className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          有給休暇設定を保存
        </button>
      </section>
    </div>
  );
}
