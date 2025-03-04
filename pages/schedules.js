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
import LoadingSpinner from '../components/LoadingSpinner';
import MonthlyListSection from '../components/MonthlyListSection';

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

// 時間文字列を数値に変換する関数を追加
const parseJapaneseTimeString = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  
  // "7時間30分" のような形式から数値を抽出
  const hoursMatch = timeStr.match(/(\d+)時間/);
  const minutesMatch = timeStr.match(/(\d+)分/);
  
  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
  
  // 分を時間に変換する際の丸め誤差を防ぐため、小数点以下10桁まで保持
  const totalHours = Number((hours + (minutes / 60)).toFixed(10));
  
  return totalHours;
};

// timeToHoursAndMinutes 関数を追加
const timeToHoursAndMinutes = (totalHours) => {
  if (isNaN(totalHours)) return { hours: 0, minutes: 0 };
  
  // 時間を分に変換して計算
  const totalMinutes = Math.round(totalHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return {
    hours: hours,
    minutes: minutes
  };
};

// 実働時間計算関数を修正
const calculateActualWorkingHoursForClock = (schedules, currentDate, userName) => {
  if (!schedules || !Array.isArray(schedules)) return 0;
  
  let totalMinutes = 0;
  const selectedMonth = currentDate.getMonth();
  const selectedYear = currentDate.getFullYear();
  const startDate = new Date(selectedYear, selectedMonth - 1, 21, 0, 0, 0);
  const endDate = new Date(selectedYear, selectedMonth, 20, 23, 59, 59);

  // 対象データのフィルタリング
  const targetSchedules = schedules.filter(schedule => {
    if (!Array.isArray(schedule)) return false;
    
    const scheduleDate = new Date(schedule[0]);
    if (isNaN(scheduleDate.getTime())) return false;

    const isInDateRange = scheduleDate >= startDate && scheduleDate <= endDate;
    const isMatchingUser = schedule[1] === userName;
    const isClockbookRecord = schedule[5] === '出勤簿';
    const hasWorkingHours = schedule[6] && typeof schedule[6] === 'string';

    return isInDateRange && isMatchingUser && isClockbookRecord && hasWorkingHours;
  });

  // フィルタリングされたデータの合計時間を計算
  targetSchedules.forEach(schedule => {
    const workHours = parseJapaneseTimeString(schedule[6]);
    totalMinutes += Math.round(workHours * 60);  // 時間を分に変換して加算
  });

  // 最後に合計分を時間に戻す
  return totalMinutes / 60;
};

// 予定勤務時間計算関数も同様に修正
const calculatePlannedWorkingHours = (schedules, currentDate, userName) => {
  if (!schedules || !Array.isArray(schedules)) return 0;
  
  let totalMinutes = 0;
  const selectedMonth = currentDate.getMonth();
  const selectedYear = currentDate.getFullYear();
  const startDate = new Date(selectedYear, selectedMonth - 1, 21, 0, 0, 0);
  const endDate = new Date(selectedYear, selectedMonth, 20, 23, 59, 59);

  // 対象データのフィルタリング
  const targetSchedules = schedules.filter(schedule => {
    if (!Array.isArray(schedule)) return false;
    
    const scheduleDate = new Date(schedule[0]);
    if (isNaN(scheduleDate.getTime())) return false;

    const isInDateRange = scheduleDate >= startDate && scheduleDate <= endDate;
    const isMatchingUser = schedule[1] === userName;
    const isPlannedRecord = schedule[5] === '予定';
    const hasWorkingHours = schedule[6] && typeof schedule[6] === 'string';

    return isInDateRange && isMatchingUser && isPlannedRecord && hasWorkingHours;
  });

  // フィルタリングされたデータの合計時間を計算
  targetSchedules.forEach(schedule => {
    const workHours = parseJapaneseTimeString(schedule[6]);
    totalMinutes += Math.round(workHours * 60);  // 時間を分に変換して加算
  });

  // 最後に合計分を時間に戻す
  return totalMinutes / 60;
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

// 休暇申請データを取得する関数を追加
const fetchVacationRequests = async () => {
  try {
    const response = await fetch('/api/vacation-requests');
    if (!response.ok) throw new Error('休暇申請の取得に失敗しました');
    return await response.json();
  } catch (error) {
    console.error('Error fetching vacation requests:', error);
    return { data: [] };
  }
};

export default function SchedulesPage() {
  const { data: session } = useSession();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [users, setUsers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [settings, setSettings] = useState(null);
  const [breakRecords, setBreakRecords] = useState([]);
  const [vacationRequests, setVacationRequests] = useState(null);

  // ユーザーの表示フィルタリング関数
  const filterUsers = (allUsers) => {
    if (!session?.user) return [];

    // 管理者権限を持っている場合は全ユーザーを表示
    if (session.user.isAdmin) {
      return allUsers;
    }

    const currentUserType = session.user.accountType;
    const currentUserId = session.user.userId;

    switch (currentUserType) {
      case '営業':
      case '業務':
        // 営業と業務のユーザーのみ表示
        return allUsers.filter(user => 
          user.data[5] === '営業' || user.data[5] === '業務'
        );
      case 'アルバイト':
        // 自分のみ表示
        return allUsers.filter(user => 
          user.data[1] === currentUserId
        );
      default:
        return [];
    }
  };

  // ユーザー一覧を取得
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/users');
        const data = await res.json();
        if (data.data) {
          // フィルタリングしたユーザー一覧をセット
          const filteredUsers = filterUsers(data.data);
          setUsers(filteredUsers);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
  }, [session]); // session を依存配列に追加

  // スケジュールを取得
  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const res = await fetch('/api/schedules');
        const data = await res.json();
        if (data.data) {
          setSchedules(data.data);
        }
      } catch (error) {
        console.error('Error fetching schedules:', error);
      }
    };

    fetchSchedules();
  }, []);

  // 設定を取得
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data) {
          setSettings(data);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };

    fetchSettings();
  }, []);

  // 休暇申請データを取得するuseEffectを追加
  useEffect(() => {
    const getVacationRequests = async () => {
      const data = await fetchVacationRequests();
      setVacationRequests(data);
    };
    getVacationRequests();
  }, []);

  const handleMonthChange = (delta) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  // ユーザーをアカウント種別と所属でグループ化する関数
  const groupUsersByTypeAndDepartment = (users) => {
    const grouped = {};
    users.forEach(user => {
      let accountType = user.data[5] || 'その他';
      const department = user.data[4] || 'その他'; // 所属
      
      if (!grouped[accountType]) {
        grouped[accountType] = {};
      }
      if (!grouped[accountType][department]) {
        grouped[accountType][department] = [];
      }
      grouped[accountType][department].push(user);
    });

    // 表示順序を指定（管理者を最初に表示）
    const orderedGroups = {};
    const orderPriority = ['管理者', '営業', '業務', 'アルバイト', 'その他'];
    orderPriority.forEach(type => {
      if (grouped[type]) {
        orderedGroups[type] = grouped[type];
      }
    });

    return orderedGroups;
  };

  if (!session) return <LoadingSpinner />;

  const groupedUsers = groupUsersByTypeAndDepartment(users);

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
      
      {/* ユーザーカードグリッドを更新 */}
      <div className="space-y-8">
        {Object.entries(groupedUsers).map(([accountType, departments]) => (
          <div key={accountType} className="space-y-6">
            {/* アカウント種別ヘッダー */}
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-sm 
                ${accountTypes[accountType]?.bgColor || 'bg-gray-100'}`}>
                {accountTypes[accountType]?.icon || <UserIcon className="h-5 w-5 text-gray-500" />}
                <span className={`font-bold ${accountTypes[accountType]?.textColor || 'text-gray-700'}`}>
                  {accountType}
                </span>
                <span className="text-sm text-gray-500">
                  {Object.values(departments).reduce((acc, curr) => acc + curr.length, 0)}名
                </span>
              </div>
              
              {/* 所属グループタグ */}
              <div className="flex items-center gap-2 flex-wrap">
                {Object.entries(departments).map(([department, departmentUsers]) => (
                  <div key={department} 
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-full 
                      text-sm text-gray-600 border border-gray-100 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    {department}
                    <span className="text-gray-400">{departmentUsers.length}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ユーザーカードグリッド */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(departments).map(([_, departmentUsers]) => 
                departmentUsers.map((user) => {
                  const standardHours = getStandardWorkingHours(currentDate, settings);
                  const userSchedules = schedules.filter(s => s[1] === user.data[0]);
                  const userBreakRecords = breakRecords.filter(b => b[1] === user.data[0]);
                  const totalHours = calculateWorkingHours(userSchedules, currentDate);
                  const actualHours = calculateActualWorkingHoursForClock(userSchedules, currentDate, user.data[0]);
                  const plannedCounts = calculateWorkTypeCounts(userSchedules, '予定');
                  const clockbookCounts = calculateWorkTypeCounts(userSchedules, '出勤簿');
                  const plannedWorkingHours = calculatePlannedWorkingHours(userSchedules, currentDate, user.data[0]);
                  const isWorkTimeUser = user.data[5] === '業務' || user.data[5] === 'アルバイト';

                  return (
                    <Link
                      key={user.rowIndex}
                      href={`/member-schedule?user=${encodeURIComponent(user.data[0])}`}
                      className="block h-full"
                    >
                      <div className="bg-white rounded-xl p-4 h-full
                        shadow-sm relative
                        transition-all duration-200
                        hover:shadow-md hover:bg-gray-50/50
                        active:bg-gray-100/70">
                        
                        {/* ユーザー情報部分 - レイアウトを調整 */}
                        <div className="flex items-start gap-4 mb-4">
                          <div className="flex-shrink-0">
                            {user.data[6] ? (
                              <img
                                src={user.data[6]}
                                alt={user.data[0]}
                                className="w-16 h-16 rounded-full object-cover border-2 border-gray-100"
                              />
                            ) : (
                              <UserCircleIcon className="w-16 h-16 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-grow min-w-0">
                            <h2 className="text-2xl font-bold text-gray-900 truncate">{user.data[0]}</h2>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                                accountTypes[user.data[5]]?.bgColor || 'bg-gray-100'
                              } ${accountTypes[user.data[5]]?.textColor || 'text-gray-700'}`}>
                                {accountTypes[user.data[5]]?.icon}
                                <span className="text-xs font-medium">{user.data[5]}</span>
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-xs font-medium text-gray-700">
                                {user.data[4]}
                              </span>
                            </div>
                          </div>
                          {/* タップ詳細メッセージ */}
                          <span className="text-xs flex items-center gap-0.5 text-blue-500 font-medium">
                            <span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse"></span>
                            詳細
                          </span>
                        </div>

                        {/* 以降のコンテンツ - グリッドレイアウトに変更 */}
                        <div className="flex gap-4">
                          {/* 勤務時間セクション */}
                          <div className={`relative flex flex-col p-3 rounded-lg border ${
                            isWorkTimeUser
                              ? 'bg-purple-50/80 border-purple-100' 
                              : 'bg-blue-50/80 border-blue-100'
                          } w-3/5`}>
                            <span className="text-sm text-gray-500">
                              {isWorkTimeUser ? '実勤務時間' : '予定勤務時間'}
                            </span>
                            <div className="flex mt-1">
                              <div className="w-1/2 flex items-center justify-center">
                                <div className="flex items-baseline">
                                  <span className={`${isWorkTimeUser ? 'text-2xl' : 'text-xl'} font-bold ${isWorkTimeUser ? 'text-purple-600' : 'text-blue-600'}`}>
                                    {(isWorkTimeUser ? actualHours : plannedWorkingHours).toFixed(1)}
                                  </span>
                                  <span className={`ml-1 ${isWorkTimeUser ? 'text-lg' : 'text-base'} ${isWorkTimeUser ? 'text-purple-500' : 'text-blue-500'}`}>
                                    h
                                  </span>
                                </div>
                              </div>
                              <div className={`w-px ${isWorkTimeUser ? 'bg-purple-200' : 'bg-blue-200'}`}></div>
                              <div className="w-1/2 flex items-center justify-center">
                                {(() => {
                                  const diff = Math.abs((isWorkTimeUser ? actualHours : plannedWorkingHours) - standardHours);
                                  return (
                                    <div className="flex items-baseline">
                                      <span className={`text-xl font-bold ${isWorkTimeUser
                                        ? Math.abs(actualHours - standardHours) <= 3
                                          ? 'text-green-600'
                                          : Math.abs(actualHours - standardHours) <= 9
                                            ? 'text-yellow-600'
                                            : 'text-red-500'
                                        : Math.abs(plannedWorkingHours - standardHours) <= 3
                                          ? 'text-green-600'
                                          : Math.abs(plannedWorkingHours - standardHours) <= 9
                                            ? 'text-yellow-600'
                                            : 'text-red-500'
                                      }`}>
                                        {(isWorkTimeUser ? actualHours : plannedWorkingHours) >= standardHours ? '+' : '-'}{diff.toFixed(1)}
                                      </span>
                                      <span className="ml-1 text-lg">h</span>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                            <div 
                              className={`absolute bottom-0 left-0 right-0 text-xs font-bold flex items-center justify-center text-center py-2 rounded 
                                ${
                                  isWorkTimeUser
                                    ? Math.abs(actualHours - standardHours) <= 3
                                      ? 'bg-green-100 text-green-700'
                                      : Math.abs(actualHours - standardHours) <= 9
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-red-100 text-red-700'
                                    : Math.abs(plannedWorkingHours - standardHours) <= 3
                                      ? 'bg-green-100 text-green-700'
                                      : Math.abs(plannedWorkingHours - standardHours) <= 9
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-red-100 text-red-700'
                                }`}
                            >
                              {isWorkTimeUser
                                ? (actualHours >= standardHours)  // 実勤務時間が規定時間以上の場合のみメッセージを表示
                                  ? Math.abs(actualHours - standardHours) <= 3
                                    ? "OK"
                                    : Math.abs(actualHours - standardHours) <= 9
                                      ? "注意"
                                      : "働きすぎ"
                                  : ""  // 実勤務時間が規定時間未満の場合は空文字を表示
                                : Math.abs(plannedWorkingHours - standardHours) <= 3
                                  ? "OK"
                                  : Math.abs(plannedWorkingHours - standardHours) <= 9
                                    ? "許容範囲"
                                    : "予定の修正が必要"}
                            </div>
                          </div>

                          {/* 進捗グラフセクション */}
                          <div className="w-2/5 flex flex-col items-center justify-center">
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
                                <span className="text-2xl font-bold text-gray-900">{actualHours.toFixed(1)}</span>
                                <span className="text-sm text-gray-500">/{standardHours}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 勤務種別チップ - 幅を最大に */}
                        <div className="mt-4 w-full">
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
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

SchedulesPage.title = 'みんなの予定';