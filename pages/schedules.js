import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  UserCircleIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  ShieldCheckIcon, 
  BriefcaseIcon, 
  DocumentTextIcon, 
  UserIcon 
} from '@heroicons/react/24/outline';

// 月の表示用ヘルパー関数
const formatMonth = (date) => {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
};

// 規定勤務時間の定義：設定値から該当期間の労働時間を取得する（21日を境に翌月の設定を使用）
const getStandardWorkingHours = (date, settingsData) => {
  if (!settingsData || !settingsData.workHours) return 160;
  const month = date.getMonth() + 1;
  const day = date.getDate();
  let configMonth = month;
  // 21日以降は翌月の設定を利用（年末の場合は1月に繰り越す）
  if (day >= 21) {
    configMonth = month + 1;
    if (configMonth > 12) configMonth = 1;
  }
  return settingsData.workHours[configMonth.toString()] || 160;
};

// 勤務時間計算用ヘルパー関数
const calculateWorkingHours = (schedules, currentDate) => {
  let totalMinutes = 0;
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  schedules.forEach(schedule => {
    const scheduleDate = new Date(schedule[0]);
    if (
      scheduleDate.getMonth() === currentMonth && 
      scheduleDate.getFullYear() === currentYear
    ) {
      const [startHour, startMin] = schedule[2].split(':').map(Number);
      const [endHour, endMin] = schedule[3].split(':').map(Number);
      totalMinutes += (endHour * 60 + endMin) - (startHour * 60 + startMin);
    }
  });
  return Math.round(totalMinutes / 60);
};

// 実動時間計算（出勤簿の実労働時間カラムの合計）
// 対象期間は「21日～20日区切り」、対象ユーザー、種別が '出勤簿'
const calculateActualWorkingHoursForClock = (schedules, currentDate, userName) => {
  let totalHours = 0;
  const selectedMonth = currentDate.getMonth();
  const selectedYear = currentDate.getFullYear();
  
  // 「21日～20日区切り」の期間
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
  
  return Math.round(totalHours * 10) / 10; // 小数点第1位まで
};

// 進捗状況に応じた色を返す関数
const getProgressColor = (percentage) => {
  if (percentage >= 100) return 'bg-green-500';
  if (percentage >= 80) return 'bg-blue-500';
  if (percentage >= 50) return 'bg-yellow-500';
  return 'bg-gray-500';
};

// アカウント種別の定義
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

// 勤務種別の定義
const WORK_TYPES = {
  '出勤': { bgColor: 'bg-blue-50', textColor: 'text-blue-600', borderColor: 'border-blue-100' },
  '在宅': { bgColor: 'bg-green-50', textColor: 'text-green-600', borderColor: 'border-green-100' },
  '休暇': { bgColor: 'bg-red-50', textColor: 'text-red-600', borderColor: 'border-red-100' },
  '半休': { bgColor: 'bg-yellow-50', textColor: 'text-yellow-600', borderColor: 'border-yellow-100' },
  '遅刻': { bgColor: 'bg-orange-50', textColor: 'text-orange-600', borderColor: 'border-orange-100' }
};

// 勤務種別ごとの集計を計算する関数
const calculateWorkTypeCounts = (schedules, type = '予定') => {
  const counts = {};
  Object.keys(WORK_TYPES).forEach(workType => {
    counts[workType] = schedules.filter(s => s[4] === workType && s[5] === type).length;
  });
  return counts;
};

// 時間差分を計算する関数
const calculateHoursDifference = (total, standard) => {
  const diff = total - standard;
  return {
    value: Math.abs(diff),
    isPositive: diff >= 0,
    text: `${diff >= 0 ? '+' : '-'}${Math.abs(diff)}h`
  };
};

// 時間のフォーマット関数
const formatTimeWithDiff = (time, total) => {
  const diff = time - total;
  return {
    time,
    diff: diff > 0 ? `+${diff}` : diff.toString()
  };
};

/**
 * 予定の勤務時間（実労働時間カラム、現在G列）の合計を計算する関数
 * 対象期間は「21日～20日区切り」
 * 条件：対象期間内、ユーザー名が一致、種別が「予定」
 * ※ 日付比較は getTime() を用いています
 */
const calculatePlannedWorkingHours = (schedules, currentDate, userName) => {
  let totalHours = 0;
  const selectedMonth = currentDate.getMonth();
  const selectedYear = currentDate.getFullYear();

  // 「21日～20日区切り」の期間
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

  return Math.round(totalHours * 10) / 10; // 小数点第1位まで表示
};

// 予定の休憩時間を計算する関数
const calculatePlannedBreakHours = (breakRecords, currentDate) => {
  let totalMinutes = 0;
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  breakRecords.forEach(breakRecord => {
    const breakDate = new Date(breakRecord[0]);
    if (
      breakDate.getMonth() === currentMonth && 
      breakDate.getFullYear() === currentYear &&
      breakRecord[4] === '予定'
    ) {
      const [startHour, startMin] = breakRecord[2].split(':').map(Number);
      const [endHour, endMin] = breakRecord[3].split(':').map(Number);
      totalMinutes += (endHour * 60 + endMin) - (startHour * 60 + startMin);
    }
  });
  return Math.round(totalMinutes / 60);
};

export default function SchedulesPage() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [settings, setSettings] = useState(null);
  const [breakRecords, setBreakRecords] = useState([]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchUsers();
      fetchSchedules();
      fetchBreakRecords();
      // APIから設定値を取得してstateに格納（管理者でなくても設定を閲覧可能とする例）
      fetch('/api/settings')
        .then((res) => res.json())
        .then((data) => setSettings(data))
        .catch((error) => console.error('Error fetching settings:', error));
    }
  }, [status, currentDate]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.data) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchSchedules = async () => {
    try {
      const res = await fetch('/api/schedules');
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      if (data.data) {
        setSchedules(data.data);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBreakRecords = async () => {
    try {
      const res = await fetch('/api/break');
      const data = await res.json();
      if (data.data) {
        setBreakRecords(data.data);
      }
    } catch (error) {
      console.error('Error fetching break records:', error);
    }
  };

  const handleMonthChange = (delta) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  if (loading) return <div className="p-4 text-center">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto">
      {/* 月選択ヘッダー＆規定労働時間 */}
      <div className="flex items-center justify-center mb-6">
        <div className="flex flex-col items-center gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg px-6 py-2">
          <div className="flex items-center gap-6">
            <button
              onClick={() => handleMonthChange(-1)}
              className="p-2 focus:outline-none"
            >
              <ChevronLeftIcon className="h-6 w-6 text-white" />
            </button>
            <span className="text-2xl font-bold text-white min-w-[160px] text-center">
              {formatMonth(currentDate)}
            </span>
            <button
              onClick={() => handleMonthChange(1)}
              className="p-2 focus:outline-none"
            >
              <ChevronRightIcon className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="text-sm text-white">
            規定労働時間: {getStandardWorkingHours(currentDate, settings)}時間
          </div>
        </div>
      </div>
      
      {/* ユーザーカードグリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {users.map((user) => {
          const standardHours = getStandardWorkingHours(currentDate, settings);
          const userSchedules = schedules.filter(s => s[1] === user.data[0]);
          const userBreakRecords = breakRecords.filter(b => b[1] === user.data[0]);
          const totalHours = calculateWorkingHours(userSchedules, currentDate);
          const actualHours = calculateActualWorkingHoursForClock(userSchedules, currentDate, user.data[0]);
          const plannedCounts = calculateWorkTypeCounts(userSchedules, '予定');
          const clockbookCounts = calculateWorkTypeCounts(userSchedules, '出勤簿');
          const plannedWorkingHours = calculatePlannedWorkingHours(userSchedules, currentDate, user.data[0]);

          return (
            <Link
              key={user.rowIndex}
              href={`/date-selection?user=${encodeURIComponent(user.data[0])}`}
            >
              <div className="bg-white rounded-xl shadow-sm p-4 divide-y divide-gray-100 cursor-pointer">
                {/* ユーザー情報（カード上部） */}
                <div className="flex items-center gap-3 mb-3">
                  {user.data[6] ? (
                    <img
                      src={user.data[6]}
                      alt={user.data[0]}
                      className="w-14 h-14 rounded-full object-cover border-2 border-gray-100"
                    />
                  ) : (
                    <UserCircleIcon className="w-14 h-14 text-gray-400" />
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{user.data[0]}</h2>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                          accountTypes[user.data[5]]?.bgColor || 'bg-gray-100'
                        } ${accountTypes[user.data[5]]?.textColor || 'text-gray-700'}`}
                      >
                        {accountTypes[user.data[5]]?.icon}
                        <span className="text-xs font-medium">{user.data[5]}</span>
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-xs font-medium text-gray-700">
                        {user.data[4]}
                      </span>
                    </div>
                  </div>
                </div>

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
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium 
                                ${bgColor} ${textColor}`}
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
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium 
                                ${bgColor} ${textColor}`}
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
            </Link>
          );
        })}
      </div>
    </div>
  );
}

SchedulesPage.title = 'みんなの予定';