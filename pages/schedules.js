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
  UserIcon,
  ViewColumnsIcon,
  ListBulletIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';
import MonthlyListSection from '../components/MonthlyListSection';
import ListView from '../components/ListView';

// 月の表示用ヘルパー関数
const formatMonth = (date) => {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
};

// 規定勤務時間の定義：設定値から該当期間の労働時間を取得する（21日を境に翌月の設定を使用）
const getStandardWorkingHours = (date, settingsData) => {
  if (!settingsData || !settingsData.workHours) return 160;
  
  // 選択された月を基準に計算
  const selectedMonth = date.getMonth() + 1; // JavaScript monthは0オリジン
  
  // 常に選択された月のデータを返す（日付に関わらず）
  return settingsData.workHours[selectedMonth.toString()] || 160;
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
  if (!timeStr || typeof timeStr !== 'string') {
    console.log('無効な時間文字列:', timeStr);
    return 0;
  }
  
  try {
    // "8時間30分" のような形式から数値を抽出
    const hoursMatch = timeStr.match(/(\d+)時間/);
    const minutesMatch = timeStr.match(/(\d+)分/);
    
    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
    
    // "N.M" のような小数点形式も処理
    if (!hoursMatch && !minutesMatch) {
      const floatMatch = timeStr.match(/(\d+(?:\.\d+)?)/);
      if (floatMatch) {
        const floatHours = parseFloat(floatMatch[1]);
        
        // デバッグ用：変換過程の表示
        console.log('小数点形式の時間変換:', {
          original: timeStr,
          parsedValue: floatHours
        });
        
        return floatHours;
      }
    }
    
    // 時間と分を別々に保持して計算
    const totalHours = hours + (minutes / 60);
    
    // デバッグ用：変換過程の表示
    console.log('時間文字列の変換 (schedules.js):', {
      original: timeStr,
      hours: hours,
      minutes: minutes,
      totalHours: totalHours
    });
    
    return totalHours;
  } catch (e) {
    console.error('時間文字列の解析中にエラー:', e, timeStr);
    return 0;
  }
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

// 実働時間計算関数を修正 - 明示的に日付パース処理を追加
const calculateActualWorkingHoursForClock = (schedules, currentDate, userName) => {
  if (!schedules || !Array.isArray(schedules)) return 0;
  
  let totalMinutes = 0;
  const selectedMonth = currentDate.getMonth(); // 0-11の値
  const selectedYear = currentDate.getFullYear();
  
  // 集計開始日の計算 (1月選択時は前年12月対応)
  let startYear = selectedYear;
  let startMonth = selectedMonth - 1;
  
  // 1月の場合は前年12月になるよう調整
  if (startMonth < 0) {
    startMonth = 11; // 12月 (0ベースなので11)
    startYear = selectedYear - 1;
  }
  
  const startDate = new Date(startYear, startMonth, 21, 0, 0, 0);
  const endDate = new Date(selectedYear, selectedMonth, 20, 23, 59, 59);

  // デバッグログを追加
  console.log('schedules.js 計算期間:', 
    startDate.toLocaleDateString(), '〜', 
    endDate.toLocaleDateString(),
    '対象ユーザー:', userName
  );

  // 重複排除のための日付管理オブジェクト
  const processedDates = {};
  
  // 対象データのフィルタリング（重複を排除）
  const targetSchedules = [];
  
  schedules.forEach(schedule => {
    if (!Array.isArray(schedule) || schedule.length < 7) return;
    if (!schedule[0] || !schedule[1] || !schedule[5] || !schedule[6]) return;
    
    try {
      // 日付文字列を明示的にパース - YYYY-MM-DD形式を想定
      let scheduleDate;
      if (typeof schedule[0] === 'string') {
        const [year, month, day] = schedule[0].split('-').map(Number);
        scheduleDate = new Date(year, month - 1, day);
      } else {
        scheduleDate = new Date(schedule[0]);
      }
      
      if (isNaN(scheduleDate.getTime())) return;

      const dateKey = scheduleDate.toLocaleDateString('en-CA');
      const isInDateRange = scheduleDate >= startDate && scheduleDate <= endDate;
      const isMatchingUser = schedule[1] === userName;
      const isClockbookRecord = schedule[5] === '出勤簿';
      const hasWorkingHours = schedule[6] && typeof schedule[6] === 'string';

      if (isInDateRange && isMatchingUser && isClockbookRecord && hasWorkingHours) {
        // 日付ベースでの重複排除
        if (!processedDates[dateKey]) {
          processedDates[dateKey] = true;
          targetSchedules.push(schedule);
        } else {
          console.log(`重複データをスキップ - 出勤簿: ${dateKey} - ${schedule[6]}`);
        }
      }
    } catch (e) {
      console.error('フィルタリング中にエラー:', e, schedule);
    }
  });

  console.log(`${userName}の集計対象レコード数(重複排除後):`, targetSchedules.length);
  
  // フィルタリングされたデータの合計時間を計算
  targetSchedules.forEach(schedule => {
    const workHours = parseJapaneseTimeString(schedule[6]);
    totalMinutes += Math.round(workHours * 60);  // 時間を分に変換して加算
    
    // 詳細なデバッグログ
    console.log('集計:', new Date(schedule[0]).toLocaleDateString(), schedule[6], `→ ${workHours}h (${Math.round(workHours * 60)}分)`);
  });

  console.log(`${userName}の合計時間:`, totalMinutes / 60, '時間');

  // 最後に合計分を時間に戻す
  return totalMinutes / 60;
};

// 予定勤務時間計算関数を index.js と完全に同じ実装に修正
const calculatePlannedWorkingHours = (schedules, currentDate, userName) => {
  if (!schedules || !Array.isArray(schedules)) return 0;

  let totalMinutes = 0;  // 分単位で合計を管理
  const selectedMonth = currentDate.getMonth();
  const selectedYear = currentDate.getFullYear();
  
  // 日付の範囲を修正（時刻を設定して確実に含める）
  let startMonth = selectedMonth - 1;
  let startYear = selectedYear;
  
  // 1月の場合は前年12月になるよう調整
  if (startMonth < 0) {
    startMonth = 11; // 12月 (0ベースなので11)
    startYear = selectedYear - 1;
  }
  
  const startDate = new Date(startYear, startMonth, 21, 0, 0, 0);
  const endDate = new Date(selectedYear, selectedMonth, 20, 23, 59, 59);
  
  console.log(`${userName} 予定計算期間:`, startDate.toLocaleDateString(), '〜', endDate.toLocaleDateString());

  // 重複排除のための日付管理オブジェクト
  const processedDates = {};
  
  // 対象データのフィルタリング（重複を排除）
  const targetSchedules = [];
  
  schedules.forEach(schedule => {
    if (!Array.isArray(schedule) || schedule.length < 7) return;
    if (!schedule[0] || !schedule[1] || !schedule[5] || !schedule[6]) return;
    
    try {
      // 日付文字列を明示的にパース
      let scheduleDate;
      if (typeof schedule[0] === 'string') {
        const [year, month, day] = schedule[0].split('-').map(Number);
        scheduleDate = new Date(year, month - 1, day);
      } else {
        scheduleDate = new Date(schedule[0]);
      }
      
      if (isNaN(scheduleDate.getTime())) return;
      
      const dateKey = scheduleDate.toLocaleDateString('en-CA');
      const isInDateRange = scheduleDate >= startDate && scheduleDate <= endDate;
      const isMatchingUser = schedule[1] === userName;
      const isPlannedRecord = schedule[5] === '予定';
      const hasWorkingHours = schedule[6] && typeof schedule[6] === 'string';

      if (isInDateRange && isMatchingUser && isPlannedRecord && hasWorkingHours) {
        // 日付ベースでの重複排除
        if (!processedDates[dateKey]) {
          processedDates[dateKey] = true;
          targetSchedules.push(schedule);
        } else {
          console.log(`重複データをスキップ - 予定: ${dateKey} - ${schedule[6]}`);
        }
      }
    } catch (e) {
      console.error('フィルタリング中にエラー:', e, schedule);
    }
  });

  // 結果をログに出力
  console.log(`${userName} 予定対象レコード(重複排除後):`, targetSchedules.length);
  
  // フィルタリングされたデータの合計時間を計算
  targetSchedules.forEach(schedule => {
    try {
      const workHours = parseJapaneseTimeString(schedule[6]);
      totalMinutes += Math.round(workHours * 60);  // 時間を分に変換して加算
      
      console.log('予定加算:', schedule[0], schedule[6], `→ ${workHours}h (${Math.round(workHours * 60)}分)`);
    } catch (e) {
      console.error('予定データ計算エラー:', e, schedule);
    }
  });

  // 最後に合計分を時間に戻す
  const totalHours = totalMinutes / 60;
  console.log(`${userName} 予定合計時間:`, totalHours, '時間');
  return totalHours;
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

// 小数点以下1桁に丸める関数
const roundToOneDecimalPlace = (value) => {
  if (isNaN(value)) return 0;
  return Math.round(value * 10) / 10;
};

// 時間のフォーマット関数
const formatTimeWithDiff = (time, total) => {
  const diff = time - total;
  return {
    time,
    diff: diff > 0 ? `+${roundToOneDecimalPlace(diff)}` : roundToOneDecimalPlace(diff).toString()
  };
};

// 予定の休憩時間を計算する関数を修正
const calculatePlannedBreakHours = (breakRecords, currentDate) => {
  let totalMinutes = 0;
  
  // 集計期間を前月21日から当月20日に統一
  const selectedMonth = currentDate.getMonth();
  const selectedYear = currentDate.getFullYear();
  
  // 集計開始日の計算 (1月選択時は前年12月対応)
  let startYear = selectedYear;
  let startMonth = selectedMonth - 1;
  
  // 1月の場合は前年12月になるよう調整
  if (startMonth < 0) {
    startMonth = 11;
    startYear = selectedYear - 1;
  }
  
  const startDate = new Date(startYear, startMonth, 21, 0, 0, 0);
  const endDate = new Date(selectedYear, selectedMonth, 20, 23, 59, 59);

  console.log('休憩時間の計算期間:', startDate.toLocaleDateString(), '〜', endDate.toLocaleDateString());

  breakRecords.forEach(breakRecord => {
    // 日付文字列を明示的にパース
    let breakDate;
    if (typeof breakRecord[0] === 'string') {
      const [year, month, day] = breakRecord[0].split('-').map(Number);
      breakDate = new Date(year, month - 1, day);
    } else {
      breakDate = new Date(breakRecord[0]);
    }
    
    if (isNaN(breakDate.getTime())) return;
    
    if (
      breakDate >= startDate && 
      breakDate <= endDate &&
      breakRecord[4] === '予定'
    ) {
      const [startHour, startMin] = breakRecord[2].split(':').map(Number);
      const [endHour, endMin] = breakRecord[3].split(':').map(Number);
      const breakMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
      totalMinutes += breakMinutes;
      
      console.log('休憩集計:', breakDate.toLocaleDateString(), `${startHour}:${startMin}〜${endHour}:${endMin}`, `→ ${breakMinutes}分`);
    }
  });
  
  console.log('合計休憩時間:', totalMinutes / 60, '時間');
  return totalMinutes / 60;  // 時間単位で返す
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

// データフェッチ関数を修正して前月のデータも取得するように変更
const fetchUserSchedules = async (month, year) => {
  try {
    console.log(`データ取得: ${year}年${month}月の勤怠期間（前月21日〜当月20日）`);
    
    // 単一のAPIコールで必要なデータを取得（APIは21日〜20日のデータを返すよう修正済み）
    const response = await fetch(`/api/attendance?month=${month}&year=${year}&limit=1000`);
    
    if (!response.ok) {
      throw new Error('スケジュールの取得に失敗しました');
    }
    
    const data = await response.json();
    
    console.log(`取得データ: ${data.data?.length || 0}件`);
    
    // 重複チェック - デバッグ用
    const dateMap = {};
    const scheduleData = data.data || [];
    scheduleData.forEach(item => {
      if (Array.isArray(item) && item[0] && item[1] && item[5]) {
        const key = `${item[0]}_${item[1]}_${item[5]}`;
        if (dateMap[key]) {
          console.log(`重複データ検出: ${item[0]} - ${item[1]} - ${item[5]}`);
          dateMap[key]++;
        } else {
          dateMap[key] = 1;
        }
      }
    });
    
    // 重複が多いエントリを表示
    Object.entries(dateMap)
      .filter(([_, count]) => count > 1)
      .forEach(([key, count]) => {
        console.log(`重複エントリ: ${key}, ${count}回出現`);
      });
    
    return scheduleData;
  } catch (error) {
    console.error('Error:', error);
    return [];
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
  const [isLoading, setIsLoading] = useState(false);
  const [userWorkHours, setUserWorkHours] = useState({});
  const [viewMode, setViewMode] = useState('user'); // 'user' or 'list'
  const [workDetails, setWorkDetails] = useState([]);

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
    const loadData = async () => {
      setIsLoading(true);
      const scheduleData = await fetchUserSchedules(
        currentDate.getMonth() + 1,
        currentDate.getFullYear()
      );
      setSchedules(scheduleData);
      setIsLoading(false);
    };
    
    loadData();
  }, [currentDate]);

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

  // 業務詳細データを取得
  useEffect(() => {
    const fetchWorkDetails = async () => {
      try {
        const response = await fetch('/api/workdetail');
        const data = await response.json();
        if (data.data) {
          setWorkDetails(data.data);
        }
      } catch (error) {
        console.error('Error fetching work details:', error);
      }
    };

    fetchWorkDetails();
  }, []);

  // ユーザー別の勤務時間計算
  useEffect(() => {
    if (users && schedules.length > 0) {
      // 各ユーザーの勤務時間をここで事前計算
      const userHours = {};
      console.log('ユーザー数:', users.length);
      console.log('スケジュールデータ数:', schedules.length);
      
      users.forEach(user => {
        const userName = user.data[0];
        // スケジュールデータが大きい場合、処理に時間がかかることを警告
        if (schedules.length > 500) {
          console.warn(`大量のスケジュールデータ(${schedules.length}件)を処理中。パフォーマンスに影響する可能性があります。`);
        }
        
        console.log(`${userName}の勤務時間計算開始...`);
        
        // 重複を排除した正確な計算を行う
        const actual = calculateActualWorkingHoursForClock(schedules, currentDate, userName);
        const planned = calculatePlannedWorkingHours(schedules, currentDate, userName);
        
        userHours[userName] = {
          planned: planned,
          actual: actual
        };
        
        console.log(`${userName}の計算結果:`, { 
          planned: planned.toFixed(1), 
          actual: actual.toFixed(1) 
        });
      });
      
      // 計算結果をログに出力して確認
      console.log('全ユーザーの勤務時間計算結果:', userHours);
      
      // 計算結果をステート変数に保存
      setUserWorkHours(userHours);
    }
  }, [users, schedules, currentDate]);

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

      {/* ビュー切り替えボタン - 固定なし */}
      <div className="bg-white py-3 mb-4 border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-end">
            <div className="inline-flex rounded-lg shadow-sm bg-white p-1">
              <button
                onClick={() => setViewMode('user')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${
                  viewMode === 'user'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ViewColumnsIcon className="w-4 h-4" />
                ユーザービュー
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ListBulletIcon className="w-4 h-4" />
                リストビュー
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* ビューコンテンツ */}
      {viewMode === 'user' ? (
        // 既存のユーザービュー
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
                    const userName = user.data[0];
                    
                    // userWorkHoursが確実に存在するか確認
                    if (!userWorkHours[userName]) {
                      console.warn(`${userName}の事前計算データがありません`);
                    }
                    
                    // 事前計算の結果を使用（再計算しない）
                    const userHour = userWorkHours[userName] || { planned: 0, actual: 0 };
                    const actualHours = userHour.actual;
                    const plannedWorkingHours = userHour.planned;
                    const standardHours = getStandardWorkingHours(currentDate, settings);
                    
                    console.log(`${userName} カード表示時間: 予定=${plannedWorkingHours.toFixed(1)}h, 実績=${actualHours.toFixed(1)}h, 標準=${standardHours}h`);
                    
                    // 勤務種別のカウント計算のみはユーザーフィルタが必要
                    const plannedCounts = calculateWorkTypeCounts(
                      schedules.filter(s => s[1] === userName),
                      '予定'
                    );
                    const clockbookCounts = calculateWorkTypeCounts(
                      schedules.filter(s => s[1] === userName),
                      '出勤簿'
                    );

                    return (
                      <Link
                        key={user.rowIndex}
                        href={`/member-schedule?user=${encodeURIComponent(user.data[0])}&year=${currentDate.getFullYear()}&month=${currentDate.getMonth() + 1}`}
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
                              ['業務', 'アルバイト'].includes(user.data[5])
                                ? 'bg-purple-50/80 border-purple-100' 
                                : 'bg-blue-50/80 border-blue-100'
                            } w-3/5`}>
                              <span className="text-sm text-gray-500">
                                {['業務', 'アルバイト'].includes(user.data[5]) ? '実勤務時間' : '予定勤務時間'}
                              </span>
                              <div className="flex mt-1">
                                <div className="w-1/2 flex items-center justify-center">
                                  <div className="flex items-baseline">
                                    <span className={`${['業務', 'アルバイト'].includes(user.data[5]) ? 'text-2xl' : 'text-xl'} font-bold ${['業務', 'アルバイト'].includes(user.data[5]) ? 'text-purple-600' : 'text-blue-600'}`}>
                                      {roundToOneDecimalPlace(['業務', 'アルバイト'].includes(user.data[5]) ? actualHours : plannedWorkingHours).toFixed(1)}
                                    </span>
                                    <span className={`ml-1 ${['業務', 'アルバイト'].includes(user.data[5]) ? 'text-lg' : 'text-base'} ${['業務', 'アルバイト'].includes(user.data[5]) ? 'text-purple-500' : 'text-blue-500'}`}>
                                      h
                                    </span>
                                  </div>
                                </div>
                                <div className={`w-px ${['業務', 'アルバイト'].includes(user.data[5]) ? 'bg-purple-200' : 'bg-blue-200'}`}></div>
                                <div className="w-1/2 flex items-center justify-center">
                                  {(() => {
                                    // 丸め誤差を修正
                                    const displayValue = ['業務', 'アルバイト'].includes(user.data[5]) ? actualHours : plannedWorkingHours;
                                    const diff = roundToOneDecimalPlace(Math.abs(displayValue - standardHours));
                                    return (
                                      <div className="flex items-baseline">
                                        <span className={`text-xl font-bold ${['業務', 'アルバイト'].includes(user.data[5])
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
                                          {displayValue >= standardHours ? '+' : '-'}{diff.toFixed(1)}
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
                                    ['業務', 'アルバイト'].includes(user.data[5])
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
                                {['業務', 'アルバイト'].includes(user.data[5])
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
                                  <span className="text-2xl font-bold text-gray-900">{roundToOneDecimalPlace(actualHours).toFixed(1)}</span>
                                  <span className="text-sm text-gray-500">/{standardHours}</span>
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
      ) : (
        // 新しいリストビュー - スクロール位置を調整
        <div className="pb-16">
          <ListView
            currentDate={currentDate}
            users={users}
            schedules={schedules}
            workDetails={workDetails}
            breakData={breakRecords}
            parseJapaneseTimeString={parseJapaneseTimeString}
            timeToHoursAndMinutes={timeToHoursAndMinutes}
            standardHours={getStandardWorkingHours(currentDate, settings)}
            headerTopOffset={72} /* アプリヘッダーの高さを考慮したオフセット値を調整 */
            session={session} /* sessionオブジェクトを渡す */
          />
        </div>
      )}
    </div>
  );
}

SchedulesPage.title = 'みんなの予定';