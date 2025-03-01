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
import { useMediaQuery } from 'react-responsive';

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

// 予定勤務時間計算関数も修正
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
  
  const isDesktop = useMediaQuery({ minWidth: 1024 });
  const [selectedUsers, setSelectedUsers] = useState([]);
  
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
  const actualHoursValue = userData ? calculateActualWorkingHoursForClock(userSchedules, currentDate, userData.data[0]) : 0;
  const plannedHoursValue = userData ? calculatePlannedWorkingHours(userSchedules, currentDate, userData.data[0]) : 0;

  // 時間と分に変換
  const actualTime = timeToHoursAndMinutes(actualHoursValue);
  const plannedTime = timeToHoursAndMinutes(plannedHoursValue);

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
  
  // ユーザー選択の処理を修正
  const handleUserSelect = (user) => {
    if (!isDesktop) return; // PCの場合のみ処理
    
    setSelectedUsers(prev => {
      // すでに選択されている場合は解除
      if (prev.some(u => u.data[1] === user.data[1])) {
        return prev.filter(u => u.data[1] !== user.data[1]);
      }

      // 新しい配列を作成
      const newSelected = [...prev];
      // メインユーザー（URLのユーザー）を含めて最大３人となるように、
      // 追加ユーザーは最大２人まで許容する
      if (newSelected.length === 2) {
         newSelected.shift();
      }
      newSelected.push(user);
      return newSelected;
    });
  };
  
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

      <div className={`mx-auto pb-24 ${isDesktop ? 'max-w-full px-4' : 'max-w-5xl'}`}>
        {isDesktop ? (
          // PC表示の場合
          <div className={`grid gap-6 ${
            selectedUsers.length === 0 
              ? 'max-w-3xl mx-auto' // 1人の場合は中央寄せで幅を制限
              : selectedUsers.length === 1
                ? 'grid-cols-2 max-w-6xl mx-auto' // 2人の場合は2カラムで幅を制限
                : 'grid-cols-3' // 3人の場合は3カラムでフル幅
          }`}>
            {/* メインユーザー */}
            <div className="col-span-1">
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
                {/* その月のリストセクション を MonthlyListSection コンポーネントに置き換え */}
                <MonthlyListSection
                  currentDate={currentDate}
                  workDetails={workDetails}
                  userData={userData}
                  userSchedules={userSchedules}
                  breakData={breakData}
                  getLocalDateString={getLocalDateString}
                  onWorkDetailClick={(detail) => setSelectedWorkDetail(detail)}
                  showSummaryCard={true}
                  timeToHoursAndMinutes={timeToHoursAndMinutes}
                  parseJapaneseTimeString={parseJapaneseTimeString}
                />
              </div>
            </div>
            
            {/* 比較用ユーザー */}
            {selectedUsers.map((compareUser, index) => (
              <div key={compareUser.data[1]} className="col-span-1">
                {/* ユーザー情報カード */}
                <div className="bg-white rounded-xl shadow-sm p-4 cursor-default mb-6">
                  <div className="flex items-center gap-3">
                    {compareUser.data[6] ? (
                      <img
                        src={compareUser.data[6]}
                        alt={compareUser.data[0]}
                        className="w-14 h-14 rounded-full object-cover border-2 border-gray-100"
                      />
                    ) : (
                      <UserCircleIcon className="w-14 h-14 text-gray-400" />
                    )}
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{compareUser.data[0]}</h2>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                            accountTypes[compareUser.data[5]]?.bgColor || 'bg-gray-100'
                          } ${accountTypes[compareUser.data[5]]?.textColor || 'text-gray-700'}`}
                        >
                          {accountTypes[compareUser.data[5]]?.icon}
                          <span className="text-xs font-medium">{compareUser.data[5]}</span>
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-xs font-medium text-gray-700">
                          {compareUser.data[4]}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* スケジュールサマリーとリスト */}
                <MonthlyListSection
                  currentDate={currentDate}
                  workDetails={workDetails.filter(w => w.employeeName === compareUser.data[0])}
                  userData={compareUser}
                  userSchedules={schedules.filter(s => s[1] === compareUser.data[0])}
                  breakData={breakData.filter(b => b.employeeName === compareUser.data[0])}
                  getLocalDateString={getLocalDateString}
                  onWorkDetailClick={(detail) => setSelectedWorkDetail(detail)}
                  showSummaryCard={true}
                  timeToHoursAndMinutes={timeToHoursAndMinutes}
                  parseJapaneseTimeString={parseJapaneseTimeString}
                />
              </div>
            ))}
          </div>
        ) : (
          // モバイル表示の場合（既存の表示）
          <>
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
              {/* その月のリストセクション を MonthlyListSection コンポーネントに置き換え */}
              <MonthlyListSection
                currentDate={currentDate}
                workDetails={workDetails}
                userData={userData}
                userSchedules={userSchedules}
                breakData={breakData}
                getLocalDateString={getLocalDateString}
                onWorkDetailClick={(detail) => setSelectedWorkDetail(detail)}
                showSummaryCard={true}
                timeToHoursAndMinutes={timeToHoursAndMinutes}
                parseJapaneseTimeString={parseJapaneseTimeString}
              />
            </div>
          </>
        )}
      </div>
      
      {/* アイコンスライダーを更新 */}
      <div className="fixed bottom-16 left-0 right-0 z-30">
        <IconSlider 
          currentUserId={userData.data[1]}
          onUserSelect={handleUserSelect}
          selectedUsers={selectedUsers}
          isDesktop={isDesktop}
        />
      </div>

      {/* 業務詳細モーダル */}
      <WorkDetailModal 
        workDetail={selectedWorkDetail} 
        onClose={() => setSelectedWorkDetail(null)} 
      />
    </>
  );
}
