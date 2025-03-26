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
import { useRouter } from 'next/router';

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
  
  // 「業務」アカウントタイプのユーザーデータも確実に含めるようにデバッグ
  let businessTypeDataCount = 0;
  
  schedules.forEach(schedule => {
    if (!Array.isArray(schedule) || schedule.length < 7) {
      console.log('無効なスケジュールデータ:', schedule);
      return;
    }
    
    if (!schedule[0] || !schedule[1] || !schedule[5] || !schedule[6]) {
      console.log('不完全なスケジュールデータ:', schedule);
      return;
    }
    
    try {
      // 日付文字列を明示的にパース - YYYY-MM-DD形式を想定
      let scheduleDate;
      if (typeof schedule[0] === 'string') {
        const [year, month, day] = schedule[0].split('-').map(Number);
        scheduleDate = new Date(year, month - 1, day);
      } else {
        scheduleDate = new Date(schedule[0]);
      }
      
      if (isNaN(scheduleDate.getTime())) {
        console.log('無効な日付:', schedule[0]);
        return;
      }

      const dateKey = scheduleDate.toLocaleDateString('en-CA');
      const isInDateRange = scheduleDate >= startDate && scheduleDate <= endDate;
      const isMatchingUser = schedule[1] === userName;
      const isClockbookRecord = schedule[5] === '出勤簿';
      const hasWorkingHours = schedule[6] && typeof schedule[6] === 'string';

      // 「業務」アカウントタイプの処理確認
      if (isMatchingUser && isClockbookRecord) {
        businessTypeDataCount++;
      }

      if (isInDateRange && isMatchingUser && isClockbookRecord && hasWorkingHours) {
        // ここで詳細なログを出力
        console.log(`日付: ${dateKey}, 名前: ${schedule[1]}, 種別: ${schedule[5]}, 時間: ${schedule[6]}`);
        
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

  console.log(`業務関連データ件数: ${businessTypeDataCount}件`);
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

// 月内の全日付を生成するヘルパー関数を追加
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

export default function SchedulesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [workDetails, setWorkDetails] = useState([]);
  const [breakData, setBreakData] = useState([]);
  const [settings, setSettings] = useState(null);
  const [view, setView] = useState('user'); // 'list' または 'monthly'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredUser, setHoveredUser] = useState(null);
  const [vacationRequests, setVacationRequests] = useState({ data: [] });

  // 現在の月を状態として保持
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // データ読み込みの状態を保持
  const [dataLoadStatus, setDataLoadStatus] = useState({
    users: false,
    schedules: false,
    workDetails: false,
    breakData: false,
    settings: false,
    vacationRequests: false
  });
  
  // 一括で読み込み状態を更新する関数
  const updateLoadStatus = (key, value) => {
    setDataLoadStatus(prev => ({ ...prev, [key]: value }));
  };

  // 休暇申請を取得する関数
  const fetchVacationRequests = async () => {
    try {
      updateLoadStatus('vacationRequests', false);
      const res = await fetch('/api/vacation-requests');
      const data = await res.json();
      setVacationRequests(data);
      updateLoadStatus('vacationRequests', true);
    } catch (err) {
      console.error('休暇申請の取得に失敗しました:', err);
      setError('休暇申請の取得に失敗しました');
      updateLoadStatus('vacationRequests', true);
    }
  };

  // ユーザースケジュールを取得する
  const fetchUserSchedules = async (month, year) => {
    updateLoadStatus('schedules', false);
    setIsLoading(true);
    
    try {
      // 前月のデータも取得するために、前月の情報を計算
      let prevMonth = month - 1;
      let prevYear = year;
      
      if (prevMonth < 1) {
        prevMonth = 12;
        prevYear = year - 1;
      }
      
      console.log(`schedules.js: データ取得開始 - ${year}年${month}月と${prevYear}年${prevMonth}月`);
      
      // 現在の月と前月のデータを両方取得（より大きな上限値を設定）
      const [currentMonthResponse, prevMonthResponse] = await Promise.all([
        fetch(`/api/attendance?month=${month}&year=${year}&limit=2000`),
        fetch(`/api/attendance?month=${prevMonth}&year=${prevYear}&limit=2000`)
      ]);
      
      if (!currentMonthResponse.ok) throw new Error(`当月データの取得に失敗: ${currentMonthResponse.status}`);
      if (!prevMonthResponse.ok) throw new Error(`前月データの取得に失敗: ${prevMonthResponse.status}`);
      
      const currentMonthData = await currentMonthResponse.json();
      const prevMonthData = await prevMonthResponse.json();
      
      // 両方のデータを結合
      const combinedData = [...(prevMonthData.data || []), ...(currentMonthData.data || [])];
      
      console.log(`schedules.js: 取得データ総数 - 前月=${prevMonthData.data?.length || 0}件, 当月=${currentMonthData.data?.length || 0}件, 合計=${combinedData.length}件`);
      
      // データ検証: 配列である必要がある
      if (!Array.isArray(combinedData)) {
        console.error('schedules.js: データ形式エラー - 配列ではありません', combinedData);
        throw new Error('スケジュールデータの形式が正しくありません');
      }
      
      // データサンプルを出力
      if (combinedData.length > 0) {
        console.log('schedules.js: データサンプル（最初の5件）:', combinedData.slice(0, 5));
      } else {
        console.warn('schedules.js: 取得データがありません');
      }
      
      // 「業務」アカウントタイプのデータを確認
      const businessTypeRecords = combinedData.filter(row => 
        Array.isArray(row) && row.length >= 6 && row[5] === '出勤簿'
      );
      
      console.log(`schedules.js: 出勤簿データ数=${businessTypeRecords.length}件`);
      if (businessTypeRecords.length > 0) {
        console.log('schedules.js: 出勤簿データサンプル:', businessTypeRecords.slice(0, 3));
      }
      
      // 「業務」ユーザー（例：後藤 和敏）のデータを特別に確認
      const businessUserName = '後藤 和敏'; // 特定のユーザー名
      const businessUserRecords = combinedData.filter(row =>
        Array.isArray(row) && row.length >= 2 && row[1] === businessUserName
      );
      
      console.log(`schedules.js: ${businessUserName}のデータ=${businessUserRecords.length}件`);
      if (businessUserRecords.length > 0) {
        console.log(`schedules.js: ${businessUserName}のデータサンプル:`, businessUserRecords);
      }
      
      // 日付の範囲を確認
      const dates = new Set();
      combinedData.forEach(row => {
        if (Array.isArray(row) && row[0]) {
          dates.add(row[0]);
        }
      });
      console.log(`schedules.js: 取得データの日付数=${dates.size}件`);
      console.log('schedules.js: 日付一覧:', [...dates].sort());
      
      // データを設定
      setSchedules(combinedData);
      updateLoadStatus('schedules', true);
    } catch (err) {
      console.error('schedules.js: スケジュールデータの取得に失敗しました:', err);
      setError('スケジュールデータの取得に失敗しました');
      updateLoadStatus('schedules', true);
    } finally {
      setIsLoading(false);
    }
  };

  // 初期表示時のデータ取得
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // ユーザー一覧を取得
        try {
          updateLoadStatus('users', false);
          const res = await fetch('/api/users');
          const data = await res.json();
          if (data.data) {
            console.log(`schedules.js: ユーザーデータ取得 - ${data.data.length}人`);
            setUsers(data.data);
          }
          updateLoadStatus('users', true);
        } catch (err) {
          console.error('ユーザー情報の取得に失敗しました:', err);
          updateLoadStatus('users', true);
        }

        // スケジュールデータを取得
        await fetchUserSchedules(currentDate.getMonth() + 1, currentDate.getFullYear());
        
        // 業務詳細を取得
        try {
          updateLoadStatus('workDetails', false);
          const res = await fetch('/api/workdetail');
          const data = await res.json();
          if (data.data) {
            console.log(`schedules.js: 業務詳細データ取得 - ${data.data.length}件`);
            setWorkDetails(data.data);
          }
          updateLoadStatus('workDetails', true);
        } catch (err) {
          console.error('業務詳細の取得に失敗しました:', err);
          updateLoadStatus('workDetails', true);
        }
        
        // 設定値を取得
        try {
          updateLoadStatus('settings', false);
          const res = await fetch('/api/settings');
          const data = await res.json();
          console.log('schedules.js: 設定データ取得');
          setSettings(data);
          updateLoadStatus('settings', true);
        } catch (err) {
          console.error('設定情報の取得に失敗しました:', err);
          updateLoadStatus('settings', true);
        }

        // 休憩情報を取得
        try {
          updateLoadStatus('breakData', false);
          const res = await fetch('/api/break');
          const data = await res.json();
          
          if (data.data) {
            // データ形式変換
            const formattedBreakData = data.data.map(row => ({
              date: row[0],
              employeeName: row[1],
              breakStart: row[2],
              breakEnd: row[3],
              recordType: row[4],
            }));
            console.log(`schedules.js: 休憩データ取得 - ${formattedBreakData.length}件`);
            setBreakData(formattedBreakData);
          }
          updateLoadStatus('breakData', true);
        } catch (err) {
          console.error('休憩情報の取得に失敗しました:', err);
          updateLoadStatus('breakData', true);
        }
        
        // 休暇申請データを取得
        await fetchVacationRequests();
        
      } catch (error) {
        console.error('データロード中にエラーが発生しました:', error);
        setError('データの読み込み中にエラーが発生しました。');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);
  
  // 月が変更されたらデータを再取得
  useEffect(() => {
    fetchUserSchedules(currentDate.getMonth() + 1, currentDate.getFullYear());
  }, [currentDate]);

  // 月移動処理
  const handleMonthChange = (delta) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  // ユーザーをアカウント種別と所属でグループ化する関数
  const groupUsersByTypeAndDepartment = (users) => {
    // セッションに基づく権限フィルタリングを適用
    let filteredUsers = users;
    
    // セッション情報の詳細なデバッグログ
    console.log("▼▼▼ schedules.js - セッション情報 ▼▼▼");
    console.log({
      isLoggedIn: !!session,
      user: session?.user ? {
        name: session.user.name,
        accountType: session.user.accountType || 'なし',
        affiliation: session.user.affiliation || 'なし',
        location: session.user.location || 'なし',
        isAdmin: !!session.user.isAdmin
      } : 'セッションなし',
      availableUsers: users.length
    });
    
    // アルバイトユーザーの場合は同じ所属地のユーザーのみにフィルタリング
    if (session?.user?.accountType === 'アルバイト') {
      console.log("▶ アルバイトユーザーのフィルタリングを開始します");
      
      // 所属地情報を取得（優先順位: location -> affiliation）
      const userLocation = session.user.location || session.user.affiliation || '';
      
      if (userLocation) {
        console.log(`▶ フィルター条件: 所属地「${userLocation}」を含むユーザーのみ表示`);
        console.log(`▶ フィルタリング前のユーザー数: ${users.length}名`);
        
        // 所属地でフィルタリング
        filteredUsers = users.filter(user => {
          // ユーザーの所属地を取得
          const userDepartment = user.data[4] || '';
          
          // 完全一致と部分一致の両方を試す
          const isExactMatch = userDepartment === userLocation;
          const isPartialMatch = userDepartment.includes(userLocation);
          const isMatched = isExactMatch || isPartialMatch;
          
          // 詳細なマッチング情報をログ出力
          console.log(`▶ ${user.data[0]} (所属: ${userDepartment || '未設定'}) - 完全一致: ${isExactMatch}, 部分一致: ${isPartialMatch}, 表示: ${isMatched}`);
          
          return isMatched;
        });
        
        console.log(`▶ フィルタリング結果: ${filteredUsers.length}名のユーザーを表示します`);
        console.log("▲▲▲ フィルタリング完了 ▲▲▲");
      } else {
        console.warn('⚠ 警告: アルバイトユーザーですが、所属地情報がありません');
      }
    }
    
    const grouped = {};
    filteredUsers.forEach(user => {
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
                onClick={() => setView('user')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${
                  view === 'user'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ViewColumnsIcon className="w-4 h-4" />
                ユーザービュー
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${
                  view === 'list'
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
      {view === 'user' ? (
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
                    
                    // userWorkHoursの代わりに、各ユーザーごとにその場で計算
                    // 実績勤務時間を計算
                    const actualHours = calculateActualWorkingHoursForClock(
                      schedules.filter(s => s[1] === userName), 
                      currentDate, 
                      userName
                    );
                    
                    // 予定勤務時間を計算
                    const plannedWorkingHours = calculatePlannedWorkingHours(
                      schedules.filter(s => s[1] === userName), 
                      currentDate, 
                      userName
                    );
                    
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
            breakData={breakData}
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