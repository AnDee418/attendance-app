import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { UserCircleIcon, ShieldCheckIcon, BriefcaseIcon, DocumentTextIcon, UserIcon } from '@heroicons/react/24/outline';
import TileCalendar from '../components/TileCalendar';

export default function DateSelectionPage() {
  const router = useRouter();
  const { user } = router.query;
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calendarDate, setCalendarDate] = useState(new Date());

  // 他ページで使用しているバッジ用のアカウント種別定義
  const accountTypes = {
    '管理者': {
      icon: <ShieldCheckIcon className="h-3.5 w-3.5" />,
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700'
    },
    '営業': {
      icon: <BriefcaseIcon className="h-3.5 w-3.5" />,
      bgColor: 'bg-green-100',
      textColor: 'text-green-700'
    },
    '業務': {
      icon: <DocumentTextIcon className="h-3.5 w-3.5" />,
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-700'
    },
    'アルバイト': {
      icon: <UserIcon className="h-3.5 w-3.5" />,
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-700'
    }
  };

  // ユーザー情報を取得
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        const res = await fetch('/api/users');
        const data = await res.json();
        if (data.data) {
          const foundUser = data.data.find(u => u.data[0] === user);
          setUserData(foundUser);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  // 日付選択時のハンドラー
  const handleDateSelect = (date) => {
    // 選択された日付の詳細ページへ遷移
    router.push(`/view?user=${encodeURIComponent(user)}&date=${date.toISOString()}`);
  };

  // 月変更のハンドラーを追加
  const handleMonthChange = (increment) => {
    setCalendarDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() + increment);
      return newDate;
    });
  };

  if (loading || !userData) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* ユーザー情報セクション */}
      <div className="bg-white rounded-xl shadow-sm px-4 py-2 mb-4">
        <div className="flex items-center gap-4">
          {userData.data[6] ? (
            <img
              src={userData.data[6]}
              alt={userData.data[0]}
              className="w-16 h-16 rounded-full object-cover border-2 border-gray-100"
            />
          ) : (
            <UserCircleIcon className="w-16 h-16 text-gray-400" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{userData.data[0]}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                  accountTypes[userData.data[5]]?.bgColor || 'bg-gray-100'
                } ${accountTypes[userData.data[5]]?.textColor || 'text-gray-700'}`}
              >
                {accountTypes[userData.data[5]]?.icon}
                <span className="text-xs font-medium">{userData.data[5]}</span>
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-100 text-xs font-medium text-gray-700">
                {userData.data[4]}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* カレンダー */}
      <TileCalendar 
        onDateSelect={handleDateSelect} 
        displayDate={calendarDate}
        onMonthChange={handleMonthChange} 
      />
    </div>
  );
}
