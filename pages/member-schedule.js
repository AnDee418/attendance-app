import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import {
  UserCircleIcon,
  ShieldCheckIcon,
  BriefcaseIcon,
  DocumentTextIcon,
  UserIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import IconSlider from '../components/icon-slider';
import { useSwipeable } from 'react-swipeable';
import MonthlyListSection from '../components/MonthlyListSection';
import WorkDetailModal from '../components/WorkDetailModal';
import LoadingSpinner from '../components/LoadingSpinner';

// ヘルパー関数：月の表示（例：2023年10月）
const formatMonth = (date) => {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
};

// ヘルパー関数：規定勤務時間を取得（21日以降は翌月の設定を使用）
const getStandardWorkingHours = (date, settingsData) => {
  if (!settingsData || !settingsData.workHours) return 160;
  const month = date.getMonth() + 1;
  const day = date.getDate();
  let configMonth = month;
  if (day >= 21) {
    configMonth = month + 1;
    if (configMonth > 12) configMonth = 1;
  }
  return settingsData.workHours[configMonth.toString()] || 160;
};

// ヘルパー関数：実労働時間計算（出勤簿レコード）
// 対象期間は「21日～20日区切り」
const calculateActualWorkingHoursForClock = (schedules, currentDate, userName) => {
  let totalHours = 0;
  const selectedMonth = currentDate.getMonth();
  const selectedYear = currentDate.getFullYear();
  
  const startDate = new Date(selectedYear, selectedMonth - 1, 21);
  const endDate = new Date(selectedYear, selectedMonth, 20);
  
  schedules.forEach(schedule => {
    const scheduleDate = new Date(schedule[0]);
    if (isNaN(scheduleDate.getTime())) return;
    
    if (
      scheduleDate.getTime() >= startDate.getTime() &&
      scheduleDate.getTime() <= endDate.getTime() &&
      schedule[1] === userName &&
      schedule[5] === '出勤簿'
    ) {
      const workHours = parseFloat(schedule[6]) || 0;
      totalHours += workHours;
    }
  });
  
  return Math.round(totalHours * 10) / 10;
};

// ヘルパー関数：予定勤務時間計算（予定レコード）
// 対象期間は「21日～20日区切り」
const calculatePlannedWorkingHours = (schedules, currentDate, userName) => {
  let totalHours = 0;
  const selectedMonth = currentDate.getMonth();
  const selectedYear = currentDate.getFullYear();
  const startDate = new Date(selectedYear, selectedMonth - 1, 21);
  const endDate = new Date(selectedYear, selectedMonth, 20);
  schedules.forEach(schedule => {
    const scheduleDate = new Date(schedule[0]);
    if (isNaN(scheduleDate.getTime())) {
      return;
    }
    if (
      scheduleDate.getTime() >= startDate.getTime() &&
      scheduleDate.getTime() <= endDate.getTime() &&
      schedule[1] === userName &&
      schedule[5] === '予定'
    ) {
      const workingHours = parseFloat(schedule[6]) || 0;
      totalHours += workingHours;
    }
  });
  return Math.round(totalHours * 10) / 10;
};

// ヘルパー関数：勤務種別件数の集計
const calculateWorkTypeCounts = (schedules, type = '予定') => {
  const counts = {};
  const WORK_TYPES = {
    '出勤': {},
    '在宅': {},
    '休暇': {},
    '半休': {},
    '遅刻': {}
  };
  Object.keys(WORK_TYPES).forEach(workType => {
    counts[workType] = schedules.filter(s => s[4] === workType && s[5] === type).length;
  });
  return counts;
};

// 日付を "en-CA" 形式に変換するヘルパー関数
const getLocalDateString = (date) => date.toLocaleDateString('en-CA');

// アカウント種別の定義（schedules.js と同様）
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

// WORK_TYPES の定義（schedules.js と一致）
const WORK_TYPES = {
  '出勤': { bgColor: 'bg-blue-50', textColor: 'text-blue-600', borderColor: 'border-blue-100' },
  '在宅': { bgColor: 'bg-green-50', textColor: 'text-green-600', borderColor: 'border-green-100' },
  '休暇': { bgColor: 'bg-red-50', textColor: 'text-red-600', borderColor: 'border-red-100' },
  '半休': { bgColor: 'bg-yellow-50', textColor: 'text-yellow-600', borderColor: 'border-yellow-100' },
  '遅刻': { bgColor: 'bg-orange-50', textColor: 'text-orange-600', borderColor: 'border-orange-100' }
};

// 月の全日付を生成するヘルパー関数を追加
const getDaysInMonth = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days = [];
  
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  return days;
};

export default function MemberSchedulePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  // クエリパラメータからユーザー識別子を取得（schedules.js で設定した user パラメータ）
  const { user: userQuery } = router.query;
  
  const [userData, setUserData] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [workDetails, setWorkDetails] = useState([]);
  const [settings, setSettings] = useState(null);
  const [breakData, setBreakData] = useState([]);
  
  // 現在の表示月（デフォルトは当月）
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // スワイプハンドラーを追加
  const [swipeDirection, setSwipeDirection] = useState(null);
  
  const [selectedWorkDetail, setSelectedWorkDetail] = useState(null);
  
  // 対象ユーザーの情報を取得
  useEffect(() => {
    if (!userQuery) return;
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          // schedules.js では user.data[0] が名前として使われている前提
          const foundUser = data.data.find(u => u.data[0] === decodeURIComponent(userQuery));
          setUserData(foundUser);
        }
      })
      .catch(err => console.error('Error fetching users:', err));
  }, [userQuery]);
  
  // /api/schedules から勤務記録を取得
  useEffect(() => {
    fetch('/api/schedules')
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          setSchedules(data.data);
        }
      })
      .catch(err => console.error('Error fetching schedules:', err));
  }, []);
  
  // /api/workdetail から業務詳細を取得
  useEffect(() => {
    fetch('/api/workdetail')
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          // 予定のみをフィルタリング
          const filtered = data.data.filter(record => record.recordType === '予定');
          setWorkDetails(filtered);
        }
      })
      .catch(err => console.error('Error fetching work details:', err));
  }, []);
  
  // /api/settings から設定値を取得
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(err => console.error('Error fetching settings:', err));
  }, []);
  
  // /api/break から休憩記録を取得
  useEffect(() => {
    fetch('/api/break')
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          const records = data.data.map(row => ({
            date: row[0],
            employeeName: row[1],
            breakStart: row[2],
            breakEnd: row[3],
            recordType: row[4],
          }));
          if (userData) {
            const userRecords = records.filter(rec => rec.employeeName === userData.data[0]);
            setBreakData(userRecords);
          }
        }
      })
      .catch(err => console.error('Error fetching break data:', err));
  }, [userData]);
  
  // 月移動用の関数
  const handleMonthChange = (delta) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };
  
  // 対象ユーザーの勤務記録（当月のみ抽出）
  const userSchedules = schedules.filter(s =>
    userData && s[1] === userData.data[0] &&
    new Date(s[0]).getMonth() === currentDate.getMonth() &&
    new Date(s[0]).getFullYear() === currentDate.getFullYear()
  );
  
  const standardHours = settings ? getStandardWorkingHours(currentDate, settings) : 160;
  const plannedWorkingHours = userData ? calculatePlannedWorkingHours(userSchedules, currentDate, userData.data[0]) : 0;
  const actualHours = userData ? calculateActualWorkingHoursForClock(userSchedules, currentDate, userData.data[0]) : 0;
  const plannedCounts = userData ? calculateWorkTypeCounts(userSchedules, '予定') : {};
  const clockbookCounts = userData ? calculateWorkTypeCounts(userSchedules, '出勤簿') : {};
  
  // 対象ユーザーの業務詳細（当月のみ抽出）を日付ごとにグループ化
  const monthlyWorkDetails = {};
  workDetails.forEach(record => {
    if (userData && record.employeeName === userData.data[0]) {
      const recDate = new Date(record.date);
      if (recDate.getMonth() === currentDate.getMonth() && recDate.getFullYear() === currentDate.getFullYear()) {
        const options = { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' };
        const key = recDate.toLocaleDateString('ja-JP', options);
        if (!monthlyWorkDetails[key]) {
          monthlyWorkDetails[key] = [];
        }
        monthlyWorkDetails[key].push(record);
      }
    }
  });
  
  // 日付キーを昇順にソート
  const sortedDates = Object.keys(monthlyWorkDetails).sort((a, b) => {
    const dateA = new Date(monthlyWorkDetails[a][0].date);
    const dateB = new Date(monthlyWorkDetails[b][0].date);
    return dateA - dateB;
  });
  
  // スワイプハンドラーを更新
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      handleMonthChange(1);
      setSwipeDirection('left');
      setTimeout(() => setSwipeDirection(null), 300);
    },
    onSwipedRight: () => {
      handleMonthChange(-1);
      setSwipeDirection('right');
      setTimeout(() => setSwipeDirection(null), 300);
    },
    preventDefaultTouchmoveEvent: true,
    trackMouse: false
  });
  
  if (!userData) return <LoadingSpinner />;
  
  return (
    <>
      {/* 指定月オブジェクト */}
      <div className="fixed top-16 right-0 z-30 bg-blue-700 px-3 py-1.5 rounded-bl-lg shadow-md border-l border-b border-blue-500">
        <div className="flex items-center gap-1">
          <button 
            onClick={() => handleMonthChange(-1)}
            className="p-0.5 hover:bg-blue-600 rounded transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4 text-white" />
          </button>
          <span className="text-sm font-medium text-white">{formatMonth(currentDate)}</span>
          <button 
            onClick={() => handleMonthChange(1)}
            className="p-0.5 hover:bg-blue-600 rounded transition-colors"
          >
            <ChevronRightIcon className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto pb-24">
        {/* ユーザー情報カード - スワイプ対象外 */}
        <div className="bg-white rounded-xl shadow-sm p-4 cursor-default mb-6">
          <div className="flex items-center gap-3">
            {userData.data[6] ? (
              <img
                src={userData.data[6]}
                alt={userData.data[0]}
                className="w-14 h-14 rounded-full object-cover border-2 border-gray-100"
              />
            ) : (
              <UserCircleIcon className="w-14 h-14 text-gray-400" />
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{userData.data[0]}</h2>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                    accountTypes[userData.data[5]]?.bgColor || 'bg-gray-100'
                  } ${accountTypes[userData.data[5]]?.textColor || 'text-gray-700'}`}
                >
                  {accountTypes[userData.data[5]]?.icon}
                  <span className="text-xs font-medium">{userData.data[5]}</span>
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-xs font-medium text-gray-700">
                  {userData.data[4]}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* スワイプ可能なコンテンツエリア */}
        <div 
          className={`transition-transform duration-300 ${
            swipeDirection === 'left' ? 'translate-x-[-100px] opacity-0' :
            swipeDirection === 'right' ? 'translate-x-[100px] opacity-0' :
            'translate-x-0 opacity-100'
          }`} 
          {...swipeHandlers}
        >
          {/* スケジュールサマリーカード */}
          <div className="bg-white rounded-xl shadow-sm p-4 divide-y divide-gray-100 cursor-default mb-6">
            {/* 勤務時間セクション */}
            <div className="pt-2 flex flex-row justify-between gap-2">
              <div className="relative flex flex-col pt-2 pb-2 px-3 bg-blue-50/80 rounded-lg border border-blue-100 w-3/5">
                <span className="text-sm text-gray-500">予定勤務時間</span>
                <div className="flex mt-1">
                  <div className="w-3/5 flex items-center justify-center">
                    <span className="text-2xl font-bold text-blue-600">{plannedWorkingHours}</span>
                    <span className="text-2xl text-blue-500 ml-1">時間</span>
                  </div>
                  <div className="w-px bg-blue-200"></div>
                  <div className="w-2/5 flex items-center justify-center">
                    <span className={`text-2xl font-bold ${
                      Math.abs(plannedWorkingHours - standardHours) <= 3
                        ? 'text-green-600'
                        : Math.abs(plannedWorkingHours - standardHours) <= 9
                          ? 'text-yellow-600'
                          : 'text-red-500'
                    }`}>
                      {plannedWorkingHours >= standardHours ? '+' : '-'}
                      {Math.abs(plannedWorkingHours - standardHours)}
                    </span>
                  </div>
                </div>
                <div 
                  className={`absolute bottom-0 left-0 right-0 text-xs font-bold flex items-center justify-center text-center py-2 rounded 
                    ${
                      Math.abs(plannedWorkingHours - standardHours) <= 3
                        ? 'bg-green-100 text-green-700'
                        : Math.abs(plannedWorkingHours - standardHours) <= 9
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                    }`}
                >
                  {Math.abs(plannedWorkingHours - standardHours) <= 3
                    ? "OK"
                    : Math.abs(plannedWorkingHours - standardHours) <= 9
                      ? "許容範囲"
                      : "予定の修正が必要"}
                </div>
              </div>
              <div className="flex flex-col items-center gap-1 w-2/5">
                <div className="relative w-28 h-28">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="56"
                      cy="56"
                      r="52"
                      className="stroke-current text-gray-100"
                      strokeWidth="3"
                      fill="none"
                    />
                    <circle
                      cx="56"
                      cy="56"
                      r="52"
                      className="stroke-current text-green-500"
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray={`${(actualHours / standardHours) * 327} 327`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900">{actualHours}</span>
                    <span className="text-sm text-gray-500">/{standardHours}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 勤務種別チップ */}
            <div className="pt-4">
              <div className="bg-gray-50/50 rounded-lg px-3 py-2 space-y-2 border border-gray-100">
                {/* 予定セクション */}
                <div>
                  <h3 className="text-xs font-medium text-gray-500 mb-1.5 flex items-center">
                    <div className="w-2 h-2 rounded-full bg-blue-400 mr-2"></div>
                    勤務種別（予定）
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(WORK_TYPES).map(([type, { bgColor, textColor }]) => {
                      const count = plannedCounts[type];
                      if (count === 0) return null;
                      return (
                        <div
                          key={`予定-${type}`}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}
                        >
                          {type} {count}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 区切り線 */}
                <div className="border-t border-gray-100"></div>

                {/* 出勤簿セクション */}
                <div>
                  <h3 className="text-xs font-medium text-gray-500 mb-1.5 flex items-center">
                    <div className="w-2 h-2 rounded-full bg-green-400 mr-2"></div>
                    勤務種別（出勤簿）
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(WORK_TYPES).map(([type, { bgColor, textColor }]) => {
                      const count = clockbookCounts[type];
                      if (count === 0) return null;
                      return (
                        <div
                          key={`出勤簿-${type}`}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}
                        >
                          {type} {count}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* その月のリストセクション を MonthlyListSection コンポーネントに置き換え */}
          <MonthlyListSection
            currentDate={currentDate}
            workDetails={workDetails}
            userData={userData}
            userSchedules={userSchedules}
            breakData={breakData}
            getLocalDateString={getLocalDateString}
            onWorkDetailClick={(detail) => setSelectedWorkDetail(detail)}
          />
        </div>
      </div>
      
      {/* アイコンスライダーの固定配置 */}
      <div className="fixed bottom-16 left-0 right-0 z-30">
         <IconSlider currentUserId={userData.data[1]} />
      </div>

      {/* 業務詳細モーダル */}
      <WorkDetailModal 
        workDetail={selectedWorkDetail} 
        onClose={() => setSelectedWorkDetail(null)} 
      />
    </>
  );
}
