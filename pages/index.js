// pages/index.js
import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import AttendanceForm from '../components/AttendanceForm';
import WorkDetailModal from '../components/WorkDetailModal';
import LoadingSpinner from '../components/LoadingSpinner';
import ClockbookForm from '../components/ClockbookForm';

// ヘルパー関数: "HH:MM" を分に変換
const timeToMinutes = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

// ヘルパー関数: 分を時間に変換（小数点1桁）
const minutesToHours = (min) => (min / 60).toFixed(1);

// ヘルパー関数: Date を "YYYY-MM-DD" (en-CA) 形式に変換
const getLocalDateString = (date) => date.toLocaleDateString('en-CA');

// 追加: 新しいヘルパー関数群と WORK_TYPES の定義
const calculatePlannedWorkingHours = (schedules, currentDate, userName) => {
  if (!schedules || !Array.isArray(schedules)) return 0;

  let totalMinutes = 0;  // 分単位で合計を管理
  const currentDay = currentDate.getDate();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  let startMonth, startYear, endMonth, endYear;
  
  if (currentDay >= 21) {
    // 今日が21日以降の場合: 当月21日から翌月20日
    startMonth = currentMonth;
    startYear = currentYear;
    endMonth = (currentMonth + 1) % 12;
    endYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  } else {
    // 今日が20日以前の場合: 前月21日から当月20日
    startMonth = (currentMonth + 11) % 12; // 前月 (12で割った余りで1月を考慮)
    startYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    endMonth = currentMonth;
    endYear = currentYear;
  }
  
  // 日付の範囲を修正（時刻を設定して確実に含める）
  const startDate = new Date(startYear, startMonth, 21, 0, 0, 0);
  const endDate = new Date(endYear, endMonth, 20, 23, 59, 59);

  // 対象データのフィルタリング
  const targetSchedules = schedules.filter(schedule => {
    if (!Array.isArray(schedule)) return false;
    
    const scheduleDate = new Date(schedule[0]);
    if (isNaN(scheduleDate.getTime())) return false;

    // 日付の比較を修正（時刻を含めた比較）
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
  const totalHours = totalMinutes / 60;
  return totalHours;
};

// 時間文字列を数値に変換する関数を修正
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
    console.log('時間文字列の変換:', {
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

// calculateActualWorkingHoursForClock 関数内の該当部分を修正
const calculateActualWorkingHoursForClock = (schedules, currentDate, userName) => {
  if (!schedules || !Array.isArray(schedules)) return 0;
  
  let totalMinutes = 0;  // 分単位で合計を管理
  const currentDay = currentDate.getDate();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  let startMonth, startYear, endMonth, endYear;
  
  if (currentDay >= 21) {
    // 今日が21日以降の場合: 当月21日から翌月20日
    startMonth = currentMonth;
    startYear = currentYear;
    endMonth = (currentMonth + 1) % 12;
    endYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  } else {
    // 今日が20日以前の場合: 前月21日から当月20日
    startMonth = (currentMonth + 11) % 12; // 前月 (12で割った余りで1月を考慮)
    startYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    endMonth = currentMonth;
    endYear = currentYear;
  }
  
  const startDate = new Date(startYear, startMonth, 21, 0, 0, 0);
  const endDate = new Date(endYear, endMonth, 20, 23, 59, 59);

  // デバッグ用：計算期間の表示
  console.log('計算期間:', {
    startDate: startDate.toLocaleDateString(),
    endDate: endDate.toLocaleDateString(),
    userName: userName,
    currentDay: currentDay
  });

  // デバッグ用：全スケジュールデータの表示
  console.log('全スケジュールデータ:', schedules);

  // 対象データのフィルタリング
  const targetSchedules = schedules.filter(schedule => {
    // データ構造のチェック
    if (!schedule || !Array.isArray(schedule)) {
      console.log('無効なスケジュールデータ:', schedule);
      return false;
    }
    
    if (!schedule[0] || !schedule[1] || !schedule[5] || !schedule[6]) {
      console.log('不完全なスケジュールデータ:', schedule);
      return false;
    }
    
    try {
      const scheduleDate = new Date(schedule[0]);
      if (isNaN(scheduleDate.getTime())) {
        console.log('無効な日付データ:', schedule[0]);
        return false;
      }

      const isInDateRange = scheduleDate >= startDate && scheduleDate <= endDate;
      const isMatchingUser = schedule[1] === userName;
      const isClockbookRecord = schedule[5] === '出勤簿';
      const hasWorkingHours = schedule[6] && typeof schedule[6] === 'string';

      if (isMatchingUser && isClockbookRecord) {
        console.log('対象データ候補:', {
          date: scheduleDate.toLocaleDateString(),
          inRange: isInDateRange,
          hours: schedule[6]
        });
      }

      return isInDateRange && isMatchingUser && isClockbookRecord && hasWorkingHours;
    } catch (e) {
      console.error('フィルタリング中にエラー:', e, schedule);
      return false;
    }
  });

  // デバッグ用：フィルタリング後のデータ表示
  console.log('フィルタリング後のデータ:', targetSchedules.map(schedule => ({
    date: schedule[0],
    userName: schedule[1],
    recordType: schedule[5],
    workingHours: schedule[6]
  })));

  // フィルタリングされたデータの合計時間を計算
  targetSchedules.forEach(schedule => {
    try {
      const workHours = parseJapaneseTimeString(schedule[6]);
      console.log(`時間加算: ${schedule[0]} - ${schedule[6]} -> ${workHours}時間 (${Math.round(workHours * 60)}分)`);
      totalMinutes += Math.round(workHours * 60);  // 時間を分に変換して加算
    } catch (e) {
      console.error('時間計算中にエラー:', e, schedule);
    }
  });

  // 最後に合計分を時間に戻す
  const totalHours = totalMinutes / 60;
  
  // デバッグ用：計算結果の表示
  console.log('計算結果:', {
    totalMinutes: totalMinutes,
    totalHours: totalHours,
    displayHours: Math.floor(totalHours),
    displayMinutes: Math.round(totalHours * 60) % 60
  });

  return totalHours;  // 丸めは表示時に行うので、ここでは行わない
};

const WORK_TYPES = {
  '出勤': { bgColor: 'bg-blue-50', textColor: 'text-blue-600', borderColor: 'border-blue-100' },
  '在宅': { bgColor: 'bg-green-50', textColor: 'text-green-600', borderColor: 'border-green-100' },
  '休暇': { bgColor: 'bg-red-50', textColor: 'text-red-600', borderColor: 'border-red-100' },
  '半休': { bgColor: 'bg-yellow-50', textColor: 'text-yellow-600', borderColor: 'border-yellow-100' },
  '遅刻': { bgColor: 'bg-orange-50', textColor: 'text-orange-600', borderColor: 'border-orange-100' }
};

const calculateWorkTypeCounts = (schedules, type = '予定') => {
  const counts = {};
  Object.keys(WORK_TYPES).forEach(workType => {
    counts[workType] = schedules.filter(s => s[4] === workType && s[5] === type).length;
  });
  return counts;
};

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

// timeToHoursAndMinutes 関数を修正
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

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // フックはすべて呼び出す（条件分岐前）
  const [attendanceData, setAttendanceData] = useState([]);
  const [breakData, setBreakData] = useState([]);
  const [workDetailData, setWorkDetailData] = useState([]);
  const [totalWorkingHours, setTotalWorkingHours] = useState(0);
  const [workTypeCounts, setWorkTypeCounts] = useState({});
  const [todayWorkDetail, setTodayWorkDetail] = useState([]);
  const [weekWorkDetail, setWeekWorkDetail] = useState({});
  const [todayScheduledTime, setTodayScheduledTime] = useState({ start: '', end: '' });
  const [forceUpdate, setForceUpdate] = useState(false);
  const [plannedWorkingHours, setPlannedWorkingHours] = useState(0);
  const [todayBreak, setTodayBreak] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [settings, setSettings] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAttendance, setEditAttendance] = useState({
    date: new Date().toLocaleDateString('en-CA'),
    employeeName: '',
    startTime: '',
    endTime: '',
    workType: '出勤',
    recordType: '予定',
  });
  const [editBreakRecords, setEditBreakRecords] = useState([{ breakStart: '', breakEnd: '', recordType: '予定' }]);
  const [editWorkDetails, setEditWorkDetails] = useState([{ 
    workTitle: '', 
    workStart: '', 
    workEnd: '', 
    detail: '', 
    workCategory: '業務',
    recordType: '予定' 
  }]);
  const [editMessage, setEditMessage] = useState('');
  const [selectedWorkDetail, setSelectedWorkDetail] = useState(null);

  // ユーザー情報のステートを追加
  const [userAccountType, setUserAccountType] = useState('');

  // 勤務実績報告用のステートを追加
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportAttendance, setReportAttendance] = useState({
    date: new Date().toLocaleDateString('en-CA'),
    employeeName: '',
    startTime: '',
    endTime: '',
    workType: '出勤',
    recordType: '出勤簿',
  });
  const [reportBreakRecords, setReportBreakRecords] = useState([{ breakStart: '', breakEnd: '', recordType: '出勤簿' }]);
  const [reportWorkDetails, setReportWorkDetails] = useState([{ 
    workTitle: '', 
    workStart: '', 
    workEnd: '', 
    detail: '', 
    workCategory: '業務',
    recordType: '出勤簿' 
  }]);
  const [reportMessage, setReportMessage] = useState('');

  // APIからユーザー情報を取得して、アカウントタイプを設定
  useEffect(() => {
    if (session?.user?.userId) {
      fetch('/api/users')
        .then(res => res.json())
        .then(data => {
          if (data.data) {
            const userInfo = data.data.find(user => user.data[1] === session.user.userId);
            if (userInfo) {
              const accountType = userInfo.data[5]; // accountTypeは6番目のインデックス
              setUserAccountType(accountType);
              console.log('Account type:', accountType);
            }
          }
        })
        .catch(error => console.error('Error fetching user info:', error));
    }
  }, [session]);

  // セッションから安全にユーザー名を取得
  const userName = session?.user?.name || '';
  
  // アカウントタイプに基づいて表示制御
  const shouldShowPlannedHours = !['業務', 'アルバイト'].includes(userAccountType);
  console.log('Should show planned hours:', shouldShowPlannedHours);
  
  // 認証状態が unauthenticated の場合、side effect 内で signIn を発動します
  useEffect(() => {
    if (status === 'unauthenticated') {
      signIn();
    }
  }, [status]);
  
  // APIデータの取得（出勤簿、休憩、業務詳細）
  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/attendance')
        .then(res => res.json())
        .then(data => {
          if (data.data) {
            const records = data.data.map(row => ({
              date: row[0],
              employeeName: row[1],
              startTime: row[2],
              endTime: row[3],
              workType: row[4],
              recordType: row[5],
            }));
            const userRecords = records.filter(rec => rec.employeeName === userName);
            setAttendanceData(userRecords);
          }
        });
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
            const userRecords = records.filter(rec => rec.employeeName === userName);
            setBreakData(userRecords);
          }
        });
      fetch('/api/workdetail')
        .then(res => res.json())
        .then(data => {
          if (data.data) {
            const records = data.data.map(row => ({
              date: row.date,
              employeeName: row.employeeName,
              workTitle: row.workTitle,
              workStart: row.workStart,
              workEnd: row.workEnd,
              detail: row.detail,
              workCategory: row.workCategory,
              recordType: row.recordType
            }));
            const userRecords = records.filter(rec => 
              rec.employeeName === userName && 
              rec.recordType === '予定'
            );
            setWorkDetailData(userRecords);
          }
        })
        .catch(error => console.error('Error fetching work details:', error));

      // セッション情報にアイコンURLを追加
      fetch('/api/users')
        .then(res => res.json())
        .then(data => {
          if (data.data) {
            // ログインユーザーの情報を検索（新しいデータ構造に対応）
            const userInfo = data.data.find(user => user.data[1] === session?.user?.userId);
            if (userInfo && userInfo.data[6]) {
              // セッション情報にアイコンURLを追加
              session.user.iconUrl = userInfo.data[6];
              // 強制的に再レンダリング
              setForceUpdate(prev => !prev);
            }
          }
        })
        .catch(error => console.error('Error fetching user info:', error));

      // 追加: /api/schedules および /api/settings の取得
      fetch('/api/schedules')
        .then(res => res.json())
        .then(data => {
          if (data.data) {
            setSchedules(data.data);
          }
        })
        .catch(error => console.error('Error fetching schedules:', error));

      fetch('/api/settings')
        .then(res => res.json())
        .then(data => setSettings(data))
        .catch(error => console.error('Error fetching settings:', error));
    }
  }, [status, session, userName]);

  // 今日の業務詳細と勤務時間
  useEffect(() => {
    const todayStr = getLocalDateString(new Date());
    // デバッグ用のログ出力
    console.log("All WorkDetailData:", workDetailData);
    console.log("Today string:", todayStr);

    // 業務詳細をフィルタリング: 今日の日付かつレコードタイプ "予定"
    const todays = workDetailData.filter(rec => {
      const recDateStr = getLocalDateString(new Date(rec.date));
      const match = recDateStr === todayStr && rec.recordType === '予定';
      if(match) {
         console.log("Matched work detail record:", rec);
      }
      return match;
    });
    console.log("Filtered Today's Work Detail:", todays);
    setTodayWorkDetail(todays);

    // 勤務記録シートから "予定" のレコードを対象に、今日の日付を比較
    const todayAttendance = attendanceData.find(
      rec => getLocalDateString(new Date(rec.date)) === todayStr && rec.recordType === '予定'
    );
    if (todayAttendance) {
      setTodayScheduledTime({
        start: todayAttendance.startTime,
        end: todayAttendance.endTime
      });
    }
  }, [workDetailData, attendanceData]);

  // 今週の業務詳細：曜日ごとにグループ化（月曜～日曜）
  useEffect(() => {
    const today = new Date();
    const day = today.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    monday.setHours(0,0,0,0);
    const weekDetail = {};
    
    // 1週間分の日付を先に作成
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dayName = date.toLocaleDateString('ja-JP', { weekday: 'short' });
      const dateStr = getLocalDateString(date);
      weekDetail[`${dayName} (${dateStr})`] = [];
    }
    
    // 業務詳細を該当する日付に振り分け
    workDetailData.forEach(rec => {
      const recDate = getLocalDateString(new Date(rec.date));
      Object.keys(weekDetail).forEach(key => {
        const weekDateStr = key.split(' ')[1].replace(/[()]/g, '');
        if (recDate === weekDateStr) {
          weekDetail[key].push({
            date: rec.date,
            workTitle: rec.workTitle,
            workStart: rec.workStart,
            workEnd: rec.workEnd,
            detail: rec.detail,
            workCategory: rec.workCategory,
            recordType: rec.recordType
          });
        }
      });
    });
    
    console.log("Week Detail Data:", weekDetail); // デバッグ用
    setWeekWorkDetail(weekDetail);
  }, [workDetailData]);

  // 給与期間（21日始まり20日締め）のラベル生成
  function payrollPeriodLabel() {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    let payrollStart, payrollEnd;
    
    if (currentDay >= 21) {
      // 今日が21日以降の場合: 当月21日から翌月20日
      payrollStart = new Date(currentYear, currentMonth, 21);
      
      // 12月の場合は翌年の1月にする
      if (currentMonth === 11) {
        payrollEnd = new Date(currentYear + 1, 0, 20);
      } else {
        payrollEnd = new Date(currentYear, currentMonth + 1, 20);
      }
    } else {
      // 今日が20日以前の場合: 前月21日から当月20日
      if (currentMonth === 0) {
        // 1月の場合は前年の12月にする
        payrollStart = new Date(currentYear - 1, 11, 21);
      } else {
        payrollStart = new Date(currentYear, currentMonth - 1, 21);
      }
      payrollEnd = new Date(currentYear, currentMonth, 20);
    }
    
    return `${getLocalDateString(payrollStart)} ～ ${getLocalDateString(payrollEnd)}`;
  }

  // 勤務時間と勤務種別内訳の計算（給与期間内のみ）
  useEffect(() => {
    if (attendanceData.length === 0) return;
    
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    let payrollStart, payrollEnd;
    
    if (currentDay >= 21) {
      // 今日が21日以降の場合: 当月21日から翌月20日
      payrollStart = new Date(currentYear, currentMonth, 21);
      
      // 12月の場合は翌年の1月にする
      if (currentMonth === 11) {
        payrollEnd = new Date(currentYear + 1, 0, 20);
      } else {
        payrollEnd = new Date(currentYear, currentMonth + 1, 20);
      }
    } else {
      // 今日が20日以前の場合: 前月21日から当月20日
      if (currentMonth === 0) {
        // 1月の場合は前年の12月にする
        payrollStart = new Date(currentYear - 1, 11, 21);
      } else {
        payrollStart = new Date(currentYear, currentMonth - 1, 21);
      }
      payrollEnd = new Date(currentYear, currentMonth, 20);
    }
    
    let totalMinutes = 0;
    let counts = {};
    attendanceData.forEach(rec => {
      const recDate = new Date(rec.date);
      if (recDate >= payrollStart && recDate <= payrollEnd) {
        const start = timeToMinutes(rec.startTime);
        const end = timeToMinutes(rec.endTime);
        let workMinutes = end - start;
        // 休憩時間の計算
        const breaksForDay = breakData.filter(b => b.date === rec.date);
        let breakMinutes = 0;
        breaksForDay.forEach(b => {
          breakMinutes += timeToMinutes(b.breakEnd) - timeToMinutes(b.breakStart);
        });
        totalMinutes += (workMinutes - breakMinutes);
        counts[rec.workType] = (counts[rec.workType] || 0) + 1;
      }
    });
    setTotalWorkingHours(minutesToHours(totalMinutes));
    setWorkTypeCounts(counts);
  }, [attendanceData, breakData]);

  // 給与期間内の「予定」勤務時間を計算（休憩時間は考慮せず、開始・終了時刻の差分で計算）
  useEffect(() => {
    if (attendanceData.length === 0) return;
    
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    let payrollStart, payrollEnd;
    
    if (currentDay >= 21) {
      // 今日が21日以降の場合: 当月21日から翌月20日
      payrollStart = new Date(currentYear, currentMonth, 21);
      
      // 12月の場合は翌年の1月にする
      if (currentMonth === 11) {
        payrollEnd = new Date(currentYear + 1, 0, 20);
      } else {
        payrollEnd = new Date(currentYear, currentMonth + 1, 20);
      }
    } else {
      // 今日が20日以前の場合: 前月21日から当月20日
      if (currentMonth === 0) {
        // 1月の場合は前年の12月にする
        payrollStart = new Date(currentYear - 1, 11, 21);
      } else {
        payrollStart = new Date(currentYear, currentMonth - 1, 21);
      }
      payrollEnd = new Date(currentYear, currentMonth, 20);
    }
    
    let plannedMinutes = 0;
    attendanceData.forEach(rec => {
      const recDate = new Date(rec.date);
      if (rec.recordType === "予定" && recDate >= payrollStart && recDate <= payrollEnd) {
        plannedMinutes += timeToMinutes(rec.endTime) - timeToMinutes(rec.startTime);
      }
    });
    setPlannedWorkingHours(minutesToHours(plannedMinutes));
  }, [attendanceData]);

  // 今日の「予定」休憩時間を計算
  useEffect(() => {
    const todayStr = getLocalDateString(new Date());
    // 休憩記録シートも同様に、日付を変換して比較
    const todaysBreaks = breakData.filter(
      rec => getLocalDateString(new Date(rec.date)) === todayStr && rec.recordType === '予定'
    );
    setTodayBreak(todaysBreaks);
  }, [breakData]);

  // 現在日付を取得
  const currentDate = new Date();
  
  // ユーザー名が存在する場合のみスケジュールをフィルタリング
  const userSchedules = userName ? schedules.filter(s => Array.isArray(s) && s[1] === userName) : [];
  
  // 実働時間と予定時間を計算（デフォルト値を0に設定）
  const [actualHours, setActualHours] = useState(0);
  const [plannedHours, setPlannedHours] = useState(0);
  
  // 基準時間を取得（デフォルト値を160に設定）
  const computedStandardHours = settings ? getStandardWorkingHours(currentDate, settings) : 160;
  const plannedCounts = calculateWorkTypeCounts(userSchedules, '予定');
  const clockbookCounts = calculateWorkTypeCounts(userSchedules, '出勤簿');

  // 勤務時間の計算を単一の useEffect で行う（重複計算防止）
  useEffect(() => {
    if (!userName || !schedules || schedules.length === 0) return;

    console.log('勤務時間計算開始 - データ数:', schedules.length);
    
    // 日付範囲の計算
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // 21日以降は当月から翌月の期間、20日以前は前月から当月の期間
    let startMonth, startYear, endMonth, endYear;
    
    if (currentDay >= 21) {
      // 今日が21日以降の場合: 当月21日から翌月20日
      startMonth = currentMonth;
      startYear = currentYear;
      endMonth = (currentMonth + 1) % 12;
      endYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    } else {
      // 今日が20日以前の場合: 前月21日から当月20日
      startMonth = (currentMonth + 11) % 12; // 前月 (12で割った余りで1月を考慮)
      startYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      endMonth = currentMonth;
      endYear = currentYear;
    }
    
    const startDate = new Date(startYear, startMonth, 21, 0, 0, 0);
    const endDate = new Date(endYear, endMonth, 20, 23, 59, 59);
    
    console.log('計算期間:', {
      startDate: startDate.toLocaleDateString(),
      endDate: endDate.toLocaleDateString(),
      currentDay: currentDay
    });

    // 初期化
    let actualMinutes = 0;
    let plannedMinutes = 0;
    
    // 重複排除のための日付管理オブジェクト
    const processedClockDates = {};
    const processedPlanDates = {};
    
    // フィルタリング結果を格納する配列
    const filteredClockData = [];
    const filteredPlanData = [];
    
    // データのフィルタリング（重複を排除）
    schedules.forEach(schedule => {
      if (!Array.isArray(schedule) || schedule.length < 7) return;
      if (!schedule[0] || !schedule[1] || !schedule[5] || !schedule[6]) return;
      
      try {
        const scheduleDate = new Date(schedule[0]);
        if (isNaN(scheduleDate.getTime())) return;
        
        const dateKey = getLocalDateString(scheduleDate);
        const isInDateRange = scheduleDate >= startDate && scheduleDate <= endDate;
        const isMatchingUser = schedule[1] === userName;
        const recordType = schedule[5];
        const hasWorkingHours = schedule[6] && typeof schedule[6] === 'string';
        
        if (!isInDateRange || !isMatchingUser || !hasWorkingHours) return;
        
        // 出勤簿データの場合、日付ベースで重複を排除
        if (recordType === '出勤簿') {
          if (!processedClockDates[dateKey]) {
            processedClockDates[dateKey] = true;
            filteredClockData.push(schedule);
          } else {
            console.log(`重複データをスキップ - 出勤簿: ${dateKey}`);
          }
        } 
        // 予定データの場合、日付ベースで重複を排除
        else if (recordType === '予定') {
          if (!processedPlanDates[dateKey]) {
            processedPlanDates[dateKey] = true;
            filteredPlanData.push(schedule);
          } else {
            console.log(`重複データをスキップ - 予定: ${dateKey}`);
          }
        }
      } catch (error) {
        console.error('データフィルタリングエラー:', error);
      }
    });
    
    console.log('フィルタリング結果（重複排除後）:', {
      '出勤簿データ数': filteredClockData.length,
      '予定データ数': filteredPlanData.length
    });
    
    // 詳細情報を出力（確認用）
    console.log('処理対象の出勤簿データ:', filteredClockData.map(s => ({
      date: s[0],
      hours: s[6]
    })));
    
    // 出勤簿データの計算
    filteredClockData.forEach(schedule => {
      try {
        const workHours = parseJapaneseTimeString(schedule[6]);
        console.log(`出勤簿: ${schedule[0]} - ${schedule[6]} -> ${workHours}時間`);
        actualMinutes += Math.round(workHours * 60);
      } catch (error) {
        console.error('出勤簿データ計算エラー:', error);
      }
    });
    
    // 予定データの計算
    filteredPlanData.forEach(schedule => {
      try {
        const workHours = parseJapaneseTimeString(schedule[6]);
        console.log(`予定: ${schedule[0]} - ${schedule[6]} -> ${workHours}時間`);
        plannedMinutes += Math.round(workHours * 60);
      } catch (error) {
        console.error('予定データ計算エラー:', error);
      }
    });
    
    // 分から時間に変換
    const calculatedActualHours = actualMinutes / 60;
    const calculatedPlannedHours = plannedMinutes / 60;
    
    console.log('最終計算結果:', {
      actualMinutes,
      plannedMinutes,
      calculatedActualHours,
      calculatedPlannedHours
    });
    
    // 状態を更新
    setActualHours(calculatedActualHours);
    setPlannedHours(calculatedPlannedHours);
    
  }, [userName, schedules]);

  // 編集用の関数を追加
  const handleEditAttendanceChange = (e) => {
    setEditAttendance({ ...editAttendance, [e.target.name]: e.target.value });
  };

  const handleEditBreakChange = (index, e) => {
    const newBreakRecords = [...editBreakRecords];
    newBreakRecords[index][e.target.name] = e.target.value;
    setEditBreakRecords(newBreakRecords);
  };

  const handleEditWorkDetailChange = (index, e) => {
    const newWorkDetails = [...editWorkDetails];
    newWorkDetails[index][e.target.name] = e.target.value;
    setEditWorkDetails(newWorkDetails);
  };

  const addEditBreakRecord = () => {
    setEditBreakRecords([...editBreakRecords, { breakStart: '', breakEnd: '', recordType: '予定' }]);
  };

  const addEditWorkDetail = () => {
    setEditWorkDetails([...editWorkDetails, { 
      workTitle: '', 
      workStart: '', 
      workEnd: '', 
      detail: '', 
      workCategory: '業務',
      recordType: '予定' 
    }]);
  };

  const removeEditBreakRecord = (index) => {
    if (editBreakRecords.length > 1) {
      setEditBreakRecords(editBreakRecords.filter((_, i) => i !== index));
    }
  };

  const removeEditWorkDetail = (index) => {
    if (editWorkDetails.length > 1) {
      setEditWorkDetails(editWorkDetails.filter((_, i) => i !== index));
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditMessage('');

    try {
      // まず既存のデータを削除
      const today = getLocalDateString(new Date());
      const deleteParams = new URLSearchParams({
        date: today,
        employeeName: userName,
        recordType: '予定'
      });

      // 勤務記録の削除
      await fetch(`/api/attendance?${deleteParams}`, { method: 'DELETE' });
      
      // 休憩記録の削除
      await fetch(`/api/break?${deleteParams}`, { method: 'DELETE' });
      
      // 業務詳細の削除
      await fetch(`/api/workdetail?${deleteParams}`, { method: 'DELETE' });

      // 新しいデータを登録
      // 勤務記録送信
      const resAttendance = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editAttendance),
      });
      if (!resAttendance.ok) throw new Error('勤務記録送信エラー');

      // 休憩記録送信
      for (let record of editBreakRecords) {
        if (record.breakStart || record.breakEnd) {
          const resBreak = await fetch('/api/break', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date: editAttendance.date,
              employeeName: editAttendance.employeeName,
              breakStart: record.breakStart,
              breakEnd: record.breakEnd,
              recordType: record.recordType,
            }),
          });
          if (!resBreak.ok) throw new Error('休憩記録送信エラー');
        }
      }

      // 業務詳細送信
      for (let detail of editWorkDetails) {
        if (detail.workTitle || detail.workStart || detail.workEnd || detail.detail) {
          const resWork = await fetch('/api/workdetail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date: editAttendance.date,
              employeeName: editAttendance.employeeName,
              workTitle: detail.workTitle,
              workStart: detail.workStart,
              workEnd: detail.workEnd,
              detail: detail.detail,
              workCategory: detail.workCategory,
              recordType: detail.recordType,
            }),
          });
          if (!resWork.ok) throw new Error('業務詳細送信エラー');
        }
      }

      setEditMessage('全ての予定が正常に更新されました！');
      // 3秒後にモーダルを閉じた後、Next.js のルーターを利用してページをリロード
      setTimeout(() => {
        setShowEditModal(false);
        router.reload();
      }, 3000);

    } catch (error) {
      console.error('Error updating schedule:', error);
      setEditMessage(error.message || '予定の更新に失敗しました');
    }
  };

  // 編集モーダルを開く際のデータ設定
  const openEditModal = () => {
    const today = getLocalDateString(new Date());
    setEditAttendance({
      date: today,
      employeeName: userName,
      startTime: todayScheduledTime.start || '',
      endTime: todayScheduledTime.end || '',
      workType: '出勤',
      recordType: '予定',
    });
    
    // 休憩時間の設定
    setEditBreakRecords(
      todayBreak.length > 0 
        ? todayBreak.map(br => ({
            breakStart: br.breakStart,
            breakEnd: br.breakEnd,
            recordType: '予定'
          }))
        : [{ breakStart: '', breakEnd: '', recordType: '予定' }]
    );
    
    // 業務詳細の設定
    setEditWorkDetails(
      todayWorkDetail.length > 0
        ? todayWorkDetail.map(detail => ({
            workTitle: detail.workTitle,
            workStart: detail.workStart,
            workEnd: detail.workEnd,
            detail: detail.detail,
            workCategory: detail.workCategory || '業務',
            recordType: '予定'
          }))
        : [{ 
            workTitle: '', 
            workStart: '', 
            workEnd: '', 
            detail: '', 
            workCategory: '業務',
            recordType: '予定' 
          }]
    );
    
    setShowEditModal(true);
  };

  // 勤務実績用の関数を追加
  const handleReportAttendanceChange = (e) => {
    setReportAttendance({ ...reportAttendance, [e.target.name]: e.target.value });
  };

  const handleReportBreakChange = (index, e) => {
    const newBreakRecords = [...reportBreakRecords];
    newBreakRecords[index][e.target.name] = e.target.value;
    setReportBreakRecords(newBreakRecords);
  };

  const handleReportWorkDetailChange = (index, e) => {
    const newWorkDetails = [...reportWorkDetails];
    newWorkDetails[index][e.target.name] = e.target.value;
    setReportWorkDetails(newWorkDetails);
  };

  const addReportBreakRecord = () => {
    setReportBreakRecords([...reportBreakRecords, { breakStart: '', breakEnd: '', recordType: '出勤簿' }]);
  };

  const addReportWorkDetail = () => {
    setReportWorkDetails([...reportWorkDetails, { 
      workTitle: '', 
      workStart: '', 
      workEnd: '', 
      detail: '', 
      workCategory: '業務',
      recordType: '出勤簿' 
    }]);
  };

  const removeReportBreakRecord = (index) => {
    if (reportBreakRecords.length > 1) {
      setReportBreakRecords(reportBreakRecords.filter((_, i) => i !== index));
    }
  };

  const removeReportWorkDetail = (index) => {
    if (reportWorkDetails.length > 1) {
      setReportWorkDetails(reportWorkDetails.filter((_, i) => i !== index));
    }
  };

  // 勤務実績モーダルを開く際のデータ設定
  const openReportModal = () => {
    const today = getLocalDateString(new Date());
    setReportAttendance({
      date: today,
      employeeName: userName,
      startTime: todayScheduledTime.start || '',
      endTime: todayScheduledTime.end || '',
      workType: '出勤',
      recordType: '出勤簿',
    });
    
    setShowReportModal(true);
  };

  // 勤務実績報告の送信処理
  const handleReportSubmit = async (attendance, breakRecords) => {
    try {
      // まず既存のデータを削除
      const today = getLocalDateString(new Date());
      const deleteParams = new URLSearchParams({
        date: today,
        employeeName: userName,
        recordType: '出勤簿'
      });

      // 勤務記録の削除
      await fetch(`/api/attendance?${deleteParams}`, { method: 'DELETE' });
      
      // 休憩記録の削除
      await fetch(`/api/break?${deleteParams}`, { method: 'DELETE' });
      
      // 勤務記録送信
      const resAttendance = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attendance),
      });
      if (!resAttendance.ok) throw new Error('勤務記録送信エラー');

      // 休憩記録送信
      for (let record of breakRecords) {
        if (record.breakStart || record.breakEnd) {
          const resBreak = await fetch('/api/break', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date: attendance.date,
              employeeName: attendance.employeeName,
              breakStart: record.breakStart,
              breakEnd: record.breakEnd,
              recordType: record.recordType,
            }),
          });
          if (!resBreak.ok) throw new Error('休憩記録送信エラー');
        }
      }

      // 送信成功後、モーダルを閉じてページをリロード
      setTimeout(() => {
        setShowReportModal(false);
        router.reload();
      }, 500);

      return true;
    } catch (error) {
      console.error('Error submitting work report:', error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-3">
      {(!userName) ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* ユーザーセクション */}
          <section className="bg-white rounded-2xl shadow-lg p-4 mb-4">
            <div className="flex items-center gap-4">
              {session.user.iconUrl ? (
                <img
                  src={session.user.iconUrl}
                  alt={session.user.name}
                  className="w-16 h-16 rounded-full border-2 border-blue-400 object-cover"
                />
              ) : (
                <UserCircleIcon className="h-16 w-16 text-gray-400" />
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-800 truncate">{session.user.name}</h2>
                <p className="text-sm text-gray-500 truncate">{session.user.affiliation}</p>
              </div>
            </div>
          </section>

          {/* 勤務時間セクション */}
          <section className="bg-white rounded-2xl shadow-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold text-gray-600">勤務時間</h2>
                <p className="text-xs text-gray-500 mt-0.5">{payrollPeriodLabel()}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 左側: 円形プログレスバー */}
              <div className={`flex flex-col items-center justify-center bg-gradient-to-br from-blue-50/50 to-indigo-50/50 rounded-xl p-4 ${
                !shouldShowPlannedHours ? 'lg:col-span-2' : ''
              }`}>
                <div className={`relative ${!shouldShowPlannedHours ? 'w-56 h-56' : 'w-40 h-40'}`}>
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 112 112">
                    <circle
                      cx="56"
                      cy="56"
                      r="52"
                      className="stroke-current text-gray-100"
                      strokeWidth="6"
                      fill="none"
                    />
                    <circle
                      cx="56"
                      cy="56"
                      r="52"
                      className={`stroke-current ${
                        actualHours >= computedStandardHours ? 'text-green-500' : 'text-blue-500'
                      } transition-all duration-1000`}
                      strokeWidth="6"
                      fill="none"
                      strokeDasharray={`${Math.min((actualHours / computedStandardHours) * 327, 327)} 327`}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-center">
                      <div className="flex items-baseline justify-center">
                        <span className={`font-bold text-gray-900 ${!shouldShowPlannedHours ? 'text-5xl' : 'text-4xl'}`}>
                          {timeToHoursAndMinutes(actualHours).hours}
                        </span>
                        <span className={`text-gray-500 mx-0.5 ${!shouldShowPlannedHours ? 'text-xl' : 'text-lg'}`}>h</span>
                        <span className={`font-bold text-gray-900 ${!shouldShowPlannedHours ? 'text-3xl' : 'text-2xl'}`}>
                          {timeToHoursAndMinutes(actualHours).minutes}
                        </span>
                        <span className={`text-gray-500 ${!shouldShowPlannedHours ? 'text-base' : 'text-sm'}`}>m</span>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-gray-500 ${!shouldShowPlannedHours ? 'text-xl' : 'text-lg'}`}>/ </span>
                      <span className={`text-gray-500 ${!shouldShowPlannedHours ? 'text-2xl' : 'text-xl'}`}>{computedStandardHours}</span>
                      <span className={`text-gray-500 ${!shouldShowPlannedHours ? 'text-base' : 'text-sm'}`}>h</span>
                    </div>
                    <span className={`text-gray-500 mt-1 ${!shouldShowPlannedHours ? 'text-base' : 'text-sm'}`}>実働時間</span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className={`px-4 py-2 rounded-full font-medium ${
                    !shouldShowPlannedHours ? 'text-sm' : 'text-xs'
                  } ${
                    actualHours >= computedStandardHours 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {actualHours >= computedStandardHours 
                      ? '目標達成！' 
                      : (() => {
                          const remaining = timeToHoursAndMinutes(computedStandardHours - actualHours);
                          return `残り ${remaining.hours}h ${remaining.minutes}m`;
                        })()
                    }
                  </div>
                </div>
              </div>

              {/* 右側: 予定勤務時間の表示部分 */}
              {shouldShowPlannedHours && (
                <div className="flex flex-col">
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 flex-grow">
                    <div className="bg-blue-50 px-3 py-2 border-b border-blue-100">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                        <h3 className="text-sm font-medium text-gray-700">予定勤務時間</h3>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-6">
                        <div className="text-center flex-1">
                          <div className="flex items-baseline justify-center">
                            <span className="text-4xl font-bold text-blue-600">
                              {timeToHoursAndMinutes(plannedHours).hours}
                            </span>
                            <span className="text-lg text-blue-600 mx-0.5">h</span>
                            <span className="text-2xl font-bold text-blue-600">
                              {timeToHoursAndMinutes(plannedHours).minutes}
                            </span>
                            <span className="text-sm text-blue-600">m</span>
                          </div>
                          <span className="text-sm text-gray-500">予定時間</span>
                        </div>
                        <div className="h-16 w-px bg-gray-200 mx-4"></div>
                        <div className="text-center flex-1">
                          {(() => {
                            const diff = Math.abs(plannedHours - computedStandardHours);
                            const diffTime = timeToHoursAndMinutes(diff);
                            return (
                              <>
                                <div className={`flex items-baseline justify-center ${
                                  Math.abs(plannedHours - computedStandardHours) <= 3
                                    ? 'text-green-600'
                                    : Math.abs(plannedHours - computedStandardHours) <= 9
                                      ? 'text-yellow-600'
                                      : 'text-red-500'
                                }`}>
                                  <span className="text-4xl font-bold">
                                    {plannedHours >= computedStandardHours ? '+' : '-'}
                                    {diffTime.hours}
                                  </span>
                                  <span className="text-lg mx-0.5">h</span>
                                  <span className="text-2xl font-bold">
                                    {diffTime.minutes}
                                  </span>
                                  <span className="text-sm">m</span>
                                </div>
                                <span className="text-sm text-gray-500">基準との差分</span>
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      <div className={`px-4 py-2.5 rounded-lg text-center text-sm font-medium ${
                        Math.abs(plannedHours - computedStandardHours) <= 3
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : Math.abs(plannedHours - computedStandardHours) <= 9
                            ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        <div className="flex items-center justify-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            Math.abs(plannedHours - computedStandardHours) <= 3
                              ? 'bg-green-500'
                              : Math.abs(plannedHours - computedStandardHours) <= 9
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                          }`}></div>
                          {Math.abs(plannedHours - computedStandardHours) <= 3
                            ? "予定時間は基準内です"
                            : Math.abs(plannedHours - computedStandardHours) <= 9
                              ? "予定時間は許容範囲内です"
                              : "予定時間の調整が必要です"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </section>

          {/* 今日の業務詳細セクション */}
          <section className="bg-white rounded-2xl shadow-lg p-3 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-gray-600">今日の業務</h2>
                <div className="text-xs bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full">
                  {getLocalDateString(new Date())}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button
                  onClick={openReportModal}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium 
                    text-green-700 bg-green-50 hover:bg-green-100 
                    active:bg-green-100 active:scale-95 rounded-lg transition-all duration-200 
                    w-full sm:w-auto group"
                  >
                  <svg 
                    className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="2" 
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
                    />
                  </svg>
                  勤務実績を報告
                </button>
                <button
                  onClick={openEditModal}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium 
                    text-blue-700 bg-blue-50 hover:bg-blue-100 
                    active:bg-blue-100 active:scale-95 rounded-lg transition-all duration-200 
                    w-full sm:w-auto group"
                  >
                  <svg 
                    className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="2" 
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
                    />
                  </svg>
                  予定を修正
                </button>
              </div>
            </div>
            
            {/* 勤務時間カード */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {/* 出退勤時間カード */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3">
                <div className="flex items-center mb-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-400 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="ml-2 text-sm font-medium text-gray-700">勤務時間</h3>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-center flex-1">
                    <p className="text-xs text-gray-500">出勤</p>
                    <p className="text-base font-semibold text-blue-600">{todayScheduledTime.start || '--:--'}</p>
                  </div>
                  <div className="h-8 w-px bg-blue-200"></div>
                  <div className="text-center flex-1">
                    <p className="text-xs text-gray-500">退勤</p>
                    <p className="text-base font-semibold text-blue-600">{todayScheduledTime.end || '--:--'}</p>
                  </div>
                </div>
              </div>

              {/* 休憩時間カード */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-3">
                <div className="flex items-center mb-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-400 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <h3 className="ml-2 text-sm font-medium text-gray-700">休憩時間</h3>
                </div>
                {todayBreak.length > 0 ? (
                  <div className="space-y-1">
                    {todayBreak.map((br, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <div className="text-center flex-1">
                          <p className="text-xs text-gray-500">開始</p>
                          <p className="text-base font-semibold text-emerald-600">{br.breakStart}</p>
                        </div>
                        <div className="h-8 w-px bg-emerald-200"></div>
                        <div className="text-center flex-1">
                          <p className="text-xs text-gray-500">終了</p>
                          <p className="text-base font-semibold text-emerald-600">{br.breakEnd}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center mt-2">休憩予定なし</p>
                )}
              </div>
            </div>

            {/* 業務詳細リスト */}
            <div className="mt-3">
              <h3 className="text-sm font-medium text-gray-600 mb-2 flex items-center">
                <div className="w-1 h-4 bg-blue-400 rounded-full mr-2"></div>
                業務詳細
              </h3>
              {todayWorkDetail.length > 0 ? (
                <div className="space-y-2">
                  {todayWorkDetail.map((detail, idx) => {
                    const today = new Date();
                    const detailDate = new Date(detail.date);
                    const isToday = detailDate.toDateString() === today.toDateString();
                    
                    return (
                      <div key={idx} className={`rounded-lg p-3 ${
                        isToday ? 'bg-white/90' : 'bg-white/70'
                      } shadow-sm cursor-pointer hover:bg-blue-50 transition-all duration-300`}
                      onClick={() => setSelectedWorkDetail({
                        ...detail,
                        date: getLocalDateString(detailDate)
                      })}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 rounded-lg bg-white shadow-sm border border-gray-100 flex items-center justify-center">
                                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-800">{detail.workTitle}</h4>
                              {detail.detail && (
                                <p className="text-xs text-gray-500 line-clamp-1">{detail.detail}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <span className="px-2 py-0.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-full whitespace-nowrap">
                              {detail.workStart}-{detail.workEnd}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="w-12 h-12 mx-auto mb-2 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-500">今日の業務詳細はありません</p>
                </div>
              )}
            </div>
          </section>

          {/* 業務詳細モーダル */}
          <WorkDetailModal 
            workDetail={selectedWorkDetail} 
            onClose={() => setSelectedWorkDetail(null)} 
          />

          {/* 今週の業務詳細セクション */}
          <section className="bg-white rounded-2xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold text-gray-600">今週の業務</h2>
              </div>
            </div>
            {Object.keys(weekWorkDetail).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(weekWorkDetail).map(([dayDate, details]) => {
                  const isToday = dayDate.includes(getLocalDateString(new Date()));
                  return (
                    <div key={dayDate} className={`rounded-lg overflow-hidden ${
                      isToday ? 'bg-blue-50' :
                      dayDate.includes('土') ? 'bg-indigo-50' :
                      dayDate.includes('日') ? 'bg-rose-50' :
                      'bg-gray-50 hover:bg-gray-100 transition-colors'
                    }`}>
                      {/* 日付ヘッダー部分 */}
                      <div className={`flex items-center px-4 py-2 border-l-4 ${
                        isToday ? 'border-blue-400' :
                        dayDate.includes('土') ? 'border-indigo-300' :
                        dayDate.includes('日') ? 'border-rose-300' :
                        'border-gray-200'
                      }`}>
                        <span className={`inline-block w-7 h-7 rounded-lg mr-2 flex items-center justify-center text-xs font-bold ${
                          isToday ? 'bg-blue-400 text-white' :
                          dayDate.includes('土') ? 'bg-indigo-400 text-white' :
                          dayDate.includes('日') ? 'bg-rose-400 text-white' :
                          'bg-gray-600 text-white'
                        }`}>
                          {dayDate.split(' ')[0]}
                        </span>
                        <span className={`${
                          isToday ? 'text-blue-700 font-semibold' :
                          dayDate.includes('土') ? 'text-indigo-700' :
                          dayDate.includes('日') ? 'text-rose-700' :
                          'text-gray-700'
                        }`}>
                          {dayDate.split(' ')[1].replace(/[()]/g, '')}
                        </span>
                        {isToday && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full">
                            Today
                          </span>
                        )}
                      </div>

                      {/* 業務詳細部分 */}
                      <div className="px-4 py-2">
                        {details.length > 0 ? (
                          <div className="space-y-2">
                            {details.map((detail, idx) => (
                              <div key={idx} className={`rounded-lg p-3 ${
                                isToday ? 'bg-white/90' : 'bg-white/70'
                              } shadow-sm cursor-pointer hover:bg-blue-50 transition-all duration-300`}
                              onClick={() => setSelectedWorkDetail({
                                ...detail,
                                date: dayDate.split(' ')[1].replace(/[()]/g, '')
                              })}>
                                <div className="flex justify-between items-start gap-2">
                                  <div className="min-w-0 flex-1">
                                    {/* 業務カテゴリーバッジを追加 */}
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                                        {detail.workCategory || '業務'}
                                      </span>
                                    </div>
                                    <h4 className="text-sm font-medium text-gray-700 truncate">
                                      {detail.workTitle}
                                    </h4>
                                    {detail.detail && (
                                      <p className="mt-1 text-xs text-gray-500 line-clamp-2 border-l-2 border-gray-200 pl-2">
                                        {detail.detail}
                                      </p>
                                    )}
                                  </div>
                                  <span className={`flex-shrink-0 text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                                    isToday ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {detail.workStart}-{detail.workEnd}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 italic pl-8">予定なし</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">業務詳細はありません</p>
            )}
          </section>
        </>
      )}
      {showEditModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50 p-0 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl w-full h-full sm:h-auto sm:max-w-3xl overflow-y-auto sm:max-h-[90vh]">
            <div className="sticky top-0 bg-white z-10 flex justify-between items-center p-4 border-b">
              <h2 className="text-xl sm:text-2xl font-semibold">{editAttendance.date} の予定修正</h2>
              <button 
                onClick={() => setShowEditModal(false)} 
                className="text-gray-600 hover:text-gray-800 text-3xl p-2"
              >
                &times;
              </button>
            </div>
            <div className="p-4">
              <form onSubmit={handleEditSubmit} className="space-y-6">
                <AttendanceForm 
                  attendance={editAttendance}
                  breakRecords={editBreakRecords}
                  onAttendanceChange={handleEditAttendanceChange}
                  onBreakChange={handleEditBreakChange}
                  onAddBreak={addEditBreakRecord}
                  onRemoveBreak={removeEditBreakRecord}
                />

                {/* 業務詳細フォーム */}
                <section className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-xl font-semibold mb-3">業務詳細</h3>
                  {editWorkDetails.map((detail, index) => (
                    <div key={index} className="mb-5 border-b border-gray-200 pb-4">
                      <div className="flex flex-col sm:flex-row sm:space-x-4 mb-3">
                        <div className="flex-1 mb-3 sm:mb-0">
                          <label className="block mb-2 font-medium">種別:</label>
                          <select
                            name="workCategory"
                            value={detail.workCategory}
                            onChange={(e) => handleEditWorkDetailChange(index, e)}
                            className="w-full p-3 border rounded-lg text-base"
                          >
                            <option value="業務">業務</option>
                            <option value="販売会">販売会</option>
                            <option value="外出">外出</option>
                            <option value="測定会">測定会</option>
                            <option value="ミーティング">ミーティング</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block mb-2 font-medium">業務タイトル:</label>
                          <input 
                            type="text" 
                            name="workTitle" 
                            placeholder="業務タイトル" 
                            value={detail.workTitle} 
                            onChange={(e) => handleEditWorkDetailChange(index, e)} 
                            className="w-full p-3 border rounded-lg text-base" 
                          />
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:space-x-4 mb-3">
                        <div className="flex-1 mb-3 sm:mb-0">
                          <label className="block mb-2 font-medium">業務開始:</label>
                          <input 
                            type="time" 
                            name="workStart" 
                            value={detail.workStart} 
                            onChange={(e) => handleEditWorkDetailChange(index, e)} 
                            className="w-full p-3 border rounded-lg text-base" 
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block mb-2 font-medium">業務終了:</label>
                          <input 
                            type="time" 
                            name="workEnd" 
                            value={detail.workEnd} 
                            onChange={(e) => handleEditWorkDetailChange(index, e)} 
                            className="w-full p-3 border rounded-lg text-base" 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block mb-2 font-medium">詳細:</label>
                        <textarea
                          name="detail"
                          placeholder="詳細を記入してください"
                          value={detail.detail}
                          onChange={(e) => handleEditWorkDetailChange(index, e)}
                          className="w-full p-3 border rounded-lg text-base h-28"
                        />
                      </div>
                      {editWorkDetails.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeEditWorkDetail(index)}
                          className="mt-3 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition flex items-center justify-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          削除
                        </button>
                      )}
                    </div>
                  ))}
                  <button 
                    type="button" 
                    onClick={addEditWorkDetail} 
                    className="w-full bg-green-500 text-white p-3 rounded-lg hover:bg-green-600 transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    業務詳細を追加
                  </button>
                </section>

                <button 
                  type="submit" 
                  className="w-full bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition text-base font-medium"
                >
                  更新
                </button>
              </form>
              {editMessage && (
                <p className="mt-4 text-center text-green-600 font-medium text-base">{editMessage}</p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* 勤務実績報告モーダル */}
      {showReportModal && (
        <ClockbookForm
          initialAttendance={reportAttendance}
          onSubmit={handleReportSubmit}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}

HomePage.title = 'ホーム';