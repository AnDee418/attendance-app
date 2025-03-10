import React, { useState, useEffect, memo } from 'react';
import { useSession } from 'next-auth/react';
import { useSwipeable } from 'react-swipeable';
import {
  UserCircleIcon,
  ShieldCheckIcon,
  BriefcaseIcon,
  DocumentTextIcon,
  UserIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import MonthlyListSection from '../components/MonthlyListSection';
import IconSlider from '../components/icon-slider';
import ScheduleForm from '../components/ScheduleForm';
import ClockbookForm from '../components/ClockbookForm';
import WorkDetailModal from '../components/WorkDetailModal';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import VacationRequestForm from '../components/VacationRequestForm';
import ActionSelectionModal from '../components/ActionSelectionModal';

// アカウント種別の定義（member-schedule.js と同様）
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

// 月の表示用ヘルパー関数
const formatMonth = (date) => `${date.getFullYear()}年${date.getMonth() + 1}月`;

// ヘルパー関数：日付を "en-CA" 形式に変換
const getLocalDateString = (date) => date.toLocaleDateString('en-CA');

// MonthlyListSectionコンポーネントをメモ化
const MemoizedMonthlyListSection = memo(MonthlyListSection);

export default function MySchedulePage() {
  const { data: session, status } = useSession();
  const [userData, setUserData] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [workDetails, setWorkDetails] = useState([]);
  const [settings, setSettings] = useState(null);
  const [breakData, setBreakData] = useState([]);
  const [vacationRequests, setVacationRequests] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleAttendance, setScheduleAttendance] = useState(null);
  const [editMessage, setEditMessage] = useState('');
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clockbookAttendance, setClockbookAttendance] = useState(null);
  const [showClockbookForm, setShowClockbookForm] = useState(false);
  const [selectedWorkDetail, setSelectedWorkDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showVacationForm, setShowVacationForm] = useState(false);
  const [vacationDate, setVacationDate] = useState(null);

  // データ取得関数を整理して一元化
  const fetchAllData = async (date = currentDate) => {
    setIsLoading(true);
    try {
      // ユーザー名を取得
      const userName = session?.user?.name || '';
      
      // 各APIのエンドポイントからデータを取得
      const [schedulesRes, breakRes, workDetailRes, vacationRes] = await Promise.all([
        fetch('/api/schedules'),
        fetch(`/api/break?employeeName=${encodeURIComponent(userName)}`),
        fetch(`/api/workdetail?employeeName=${encodeURIComponent(userName)}`),
        fetch('/api/vacation-requests')
      ]);
      
      // スケジュールデータの処理
      if (schedulesRes.ok) {
        const data = await schedulesRes.json();
        if (data.data) {
          // 現在月のデータのみをフィルタリングして状態を更新
          const filteredData = data.data.filter(s => {
            const scheduleDate = new Date(s[0]);
            return scheduleDate.getMonth() === date.getMonth() && 
                   scheduleDate.getFullYear() === date.getFullYear();
          });
          setSchedules(filteredData);
        }
      }
      
      // 休憩データの処理
      if (breakRes.ok) {
        const data = await breakRes.json();
        if (data.data) {
          const mappedBreakData = data.data.map(row => ({
            date: row[0],
            employeeName: row[1],
            breakStart: row[2],
            breakEnd: row[3],
            recordType: row[4]
          }));
          setBreakData(mappedBreakData);
        }
      }
      
      // 業務詳細データの処理
      if (workDetailRes.ok) {
        const data = await workDetailRes.json();
        if (data.data) {
          setWorkDetails(data.data);
        }
      }
      
      // 休暇申請データの処理
      if (vacationRes.ok) {
        const data = await vacationRes.json();
        setVacationRequests(data);
      }
    } catch (error) {
      console.error('データの取得中にエラーが発生しました:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // コンポーネントマウント時のデータ取得
  useEffect(() => {
    if (session?.user?.name) {
      fetchAllData();
    }
  }, [session]);

  // 5分ごとのデータ自動更新
  useEffect(() => {
    if (!session?.user?.name) return;
    
    const intervalId = setInterval(() => {
      fetchAllData();
    }, 300000); // 5分ごと
    
    return () => clearInterval(intervalId);
  }, [session]);

  // すべてのuseEffectをここに移動
  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          const foundUser = data.data.find(u => u.data[0] === session?.user?.name);
          setUserData(foundUser);
          // ユーザーのアカウントタイプをローカルストレージに保存
          if (foundUser) {
            window.localStorage.setItem('userAccountType', foundUser.data[5]);
          }
        }
      })
      .catch(err => console.error('Error fetching users:', err));
  }, [session]);

  // 月移動の処理
  const handleMonthChange = (delta) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
    
    // 月が変わったらデータを再取得
    fetchAllData(newDate);
  };
  
  // スワイプ操作で月移動できるように設定
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
    trackMouse: false,
    // iOS向けに最適化
    delta: 10, // スワイプ検出の閾値を上げる
    trackTouch: true,
    rotationAngle: 0
  });
  
  // 現在月かつ該当ユーザーの勤務記録を抽出
  const userSchedules = schedules.filter(s =>
    userData &&
    s[1] === userData.data[0] &&
    new Date(s[0]).getMonth() === currentDate.getMonth() &&
    new Date(s[0]).getFullYear() === currentDate.getFullYear()
  );
  
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

  // handleActionButtonClickを修正
  const handleActionButtonClick = (type) => {
    if (type === 'schedule') {
      // 予定登録の処理
      if (selectedDate && userData) {
        const dateStr = getLocalDateString(selectedDate);
        
        // 既存の予定を検索
        const existingSchedule = userSchedules.find(s => 
          getLocalDateString(new Date(s[0])) === dateStr && s[5] === '予定'
        );
        
        if (existingSchedule) {
          // 編集モード：既存のデータをフォームに設定
          setScheduleAttendance({
            date: dateStr,
            employeeName: userData.data[0],
            startTime: existingSchedule[2],
            endTime: existingSchedule[3],
            workType: existingSchedule[4],
            recordType: '予定'
          });
          
          // 休憩記録の設定
          setEditBreakRecords(
            breakData.filter(b => 
              getLocalDateString(new Date(b.date)) === dateStr &&
              b.employeeName === userData.data[0] &&
              b.recordType === '予定'
            ).length > 0
              ? breakData.filter(b => 
                  getLocalDateString(new Date(b.date)) === dateStr &&
                  b.employeeName === userData.data[0] &&
                  b.recordType === '予定'
                ).map(b => ({
                  breakStart: b.breakStart,
                  breakEnd: b.breakEnd,
                  recordType: '予定'
                }))
              : [{ breakStart: '', breakEnd: '', recordType: '予定' }]
          );

          // 業務詳細の設定
          setEditWorkDetails(
            workDetails.filter(w => 
              getLocalDateString(new Date(w.date)) === dateStr &&
              w.employeeName === userData.data[0] &&
              w.recordType === '予定'
            ).length > 0
              ? workDetails.filter(w => 
                  getLocalDateString(new Date(w.date)) === dateStr &&
                  w.employeeName === userData.data[0] &&
                  w.recordType === '予定'
                ).map(w => ({
                  workTitle: w.workTitle,
                  workStart: w.workStart,
                  workEnd: w.workEnd,
                  detail: w.detail,
                  workCategory: w.workCategory || '業務',
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
        } else {
          // 追加モード：空のフォームを設定
          setScheduleAttendance({
            date: dateStr,
            employeeName: userData.data[0],
            startTime: '',
            endTime: '',
            workType: '出勤',
            recordType: '予定'
          });
          setEditBreakRecords([{ breakStart: '', breakEnd: '', recordType: '予定' }]);
          setEditWorkDetails([{ 
            workTitle: '', 
            workStart: '', 
            workEnd: '', 
            detail: '', 
            workCategory: '業務',
            recordType: '予定' 
          }]);
        }
        setShowScheduleForm(true);
      }
      setSelectedDate(null);
    } else if (type === 'attendance') {
      // 勤務実績登録フォームを表示
      if (selectedDate && userData) {
        const dateStr = getLocalDateString(selectedDate);
        
        // 既存の出勤簿データを検索
        const existingAttendance = userSchedules.find(s => 
          getLocalDateString(new Date(s[0])) === dateStr && 
          s[1] === userData.data[0] && 
          s[5] === '出勤簿'
        );
        
        if (existingAttendance) {
          // 編集モード：既存の出勤簿データを設定
          setClockbookAttendance({
            date: dateStr,
            employeeName: userData.data[0],
            startTime: existingAttendance[2] || '',
            endTime: existingAttendance[3] || '',
            workType: existingAttendance[4] || '出勤',
            recordType: '出勤簿',
            totalWorkTime: existingAttendance[6] || ''
          });
        } else {
          // 追加モード：空の出勤簿フォームを設定
          setClockbookAttendance({
            date: dateStr,
            employeeName: userData.data[0],
            startTime: '',
            endTime: '',
            workType: '出勤',
            recordType: '出勤簿',
            totalWorkTime: ''
          });
        }
        setShowClockbookForm(true);
      }
      setSelectedDate(null);
    } else if (type === 'vacation') {
      // 休暇申請フォームを表示
      if (selectedDate && userData) {
        const dateStr = getLocalDateString(selectedDate);
        setVacationDate({
          date: dateStr,
          employeeName: userData.data[0]
        });
        setShowVacationForm(true);
      }
      setSelectedDate(null);
    }
  };

  // 行動予定の送信処理を修正（上書き対応）
  const handleScheduleSubmit = async (attendanceData, breakRecords, workDetailRecords) => {
    setIsSubmitting(true);
    try {
      const startTime = attendanceData.startTime;
      const endTime = attendanceData.endTime;
      
      // 勤務時間の計算（休暇系の場合は0時間）
      let workingHours = 0;
      
      if (!['公休', '有給休暇', '休暇'].includes(attendanceData.workType) && 
          startTime && endTime && startTime !== '00:00' && endTime !== '00:00') {
        
        // 時間を分に変換
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        
        let startTotalMinutes = startHour * 60 + startMinute;
        let endTotalMinutes = endHour * 60 + endMinute;
        
        // 終了時間が開始時間より前なら日をまたいだと判断
        if (endTotalMinutes < startTotalMinutes) {
          endTotalMinutes += 24 * 60; // 24時間分を追加
        }
        
        // 総勤務時間（分）
        const totalWorkMinutes = endTotalMinutes - startTotalMinutes;
        
        // 休憩時間の計算
        let totalBreakMinutes = 0;
        
        // 休憩レコードがある場合のみ計算（ここを修正）
        if (breakRecords && breakRecords.length > 0) {
          for (const breakRecord of breakRecords) {
            // 空の休憩レコードはスキップ
            if (!breakRecord.breakStart || !breakRecord.breakEnd || 
                breakRecord.breakStart === '' || breakRecord.breakEnd === '') {
              continue;
            }
            
            const [breakStartHour, breakStartMinute] = breakRecord.breakStart.split(':').map(Number);
            const [breakEndHour, breakEndMinute] = breakRecord.breakEnd.split(':').map(Number);
            
            let breakStartTotalMinutes = breakStartHour * 60 + breakStartMinute;
            let breakEndTotalMinutes = breakEndHour * 60 + breakEndMinute;
            
            // 休憩終了時間が休憩開始時間より前なら日をまたいだと判断
            if (breakEndTotalMinutes < breakStartTotalMinutes) {
              breakEndTotalMinutes += 24 * 60;
            }
            
            totalBreakMinutes += breakEndTotalMinutes - breakStartTotalMinutes;
          }
        }
        
        // 実労働時間 = 総勤務時間 - 休憩時間
        const netWorkMinutes = totalWorkMinutes - totalBreakMinutes;
        
        // 時間と分に変換（例: 7時間30分）
        const hours = Math.floor(netWorkMinutes / 60);
        const minutes = netWorkMinutes % 60;
        
        workingHours = `${hours}時間${minutes > 0 ? `${minutes}分` : ''}`;
      }
      
      console.log("送信するデータ:", attendanceData);
      
      // 予定データの送信（新規または更新）
      await fetch('/api/attendance', {
        method: 'POST',  // PUTではなくPOST - 既存のAPIで上書き処理を行う
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...attendanceData,
          recordType: '予定',
          workingHours: workingHours
        }),
      });
      
      // 既存の休憩データをまず削除
      if (attendanceData.date && attendanceData.employeeName) {
        // 削除APIを呼び出し
        await fetch(`/api/break?date=${encodeURIComponent(attendanceData.date)}&employeeName=${encodeURIComponent(attendanceData.employeeName)}&recordType=予定`, {
          method: 'DELETE',
        });
      }
      
      // 新しい休憩データを送信
      for (const breakRecord of breakRecords) {
        if (!breakRecord.breakStart || !breakRecord.breakEnd) continue;
        
        await fetch('/api/break', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            breakStart: breakRecord.breakStart,
            breakEnd: breakRecord.breakEnd,
            date: attendanceData.date,
            employeeName: attendanceData.employeeName,
            recordType: '予定'
          }),
        });
      }
      
      // 既存の業務詳細データをまず削除
      if (attendanceData.date && attendanceData.employeeName) {
        await fetch(`/api/workdetail?date=${encodeURIComponent(attendanceData.date)}&employeeName=${encodeURIComponent(attendanceData.employeeName)}&recordType=予定`, {
          method: 'DELETE',
        });
      }
      
      // 新しい業務詳細データを送信
      for (const detail of workDetailRecords) {
        if (!detail.workTitle || detail.workTitle.trim() === '') continue;
        
        await fetch('/api/workdetail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workTitle: detail.workTitle,
            workStart: detail.workStart,
            workEnd: detail.workEnd,
            detail: detail.detail,
            workCategory: detail.workCategory || '業務',
            date: attendanceData.date,
            employeeName: attendanceData.employeeName,
            recordType: '予定'
          }),
        });
      }
      
      // データを再取得して表示を更新
      await fetchAllData();
      
      // フォームをリセット
      setShowScheduleForm(false);
      setScheduleAttendance(null);
      setEditBreakRecords([{ breakStart: '', breakEnd: '', recordType: '予定' }]);
      setEditWorkDetails([{ 
        workTitle: '', workStart: '', workEnd: '', 
        detail: '', workCategory: '業務', recordType: '予定' 
      }]);
      
      // 成功メッセージを表示
      setEditMessage('予定を保存しました');
      setTimeout(() => setEditMessage(''), 3000);
    } catch (error) {
      console.error('Error:', error);
      setEditMessage('予定の保存中にエラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 出勤簿の送信処理を修正
  const handleClockbookSubmit = async (attendanceData, breakRecords) => {
    setIsSubmitting(true);
    try {
      // デバッグ用にログを追加
      console.log("受け取った勤務データ:", attendanceData);
      
      const startTime = attendanceData.startTime || '';
      const endTime = attendanceData.endTime || '';
      const workType = attendanceData.workType || '出勤';
      
      // 勤務時間の計算（休暇系の場合は特別処理）
      let totalWorkTime = attendanceData.totalWorkTime || '';
      
      // 公休の場合は空の勤務時間
      if (workType === '公休') {
        totalWorkTime = '';
      }
      // 有給休暇の場合はアカウントタイプに応じた固定時間
      else if (workType === '有給休暇') {
        const accountType = window.localStorage.getItem('userAccountType') || '';
        totalWorkTime = accountType === '業務' ? '7時間30分' : '7時間';
      }
      // 通常の勤務の場合は計算
      else if (startTime && endTime && startTime !== '00:00' && endTime !== '00:00') {
        // 時間を分に変換
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        
        let startTotalMinutes = startHour * 60 + startMinute;
        let endTotalMinutes = endHour * 60 + endMinute;
        
        // 終了時間が開始時間より前なら日をまたいだと判断
        if (endTotalMinutes < startTotalMinutes) {
          endTotalMinutes += 24 * 60; // 24時間分を追加
        }
        
        // 総勤務時間（分）
        const totalWorkMinutes = endTotalMinutes - startTotalMinutes;
        
        // 休憩時間の計算
        let totalBreakMinutes = 0;
        
        // 休憩レコードがある場合のみ計算（ここを修正）
        if (breakRecords && breakRecords.length > 0) {
          for (const breakRecord of breakRecords) {
            // 空の休憩レコードはスキップ
            if (!breakRecord.breakStart || !breakRecord.breakEnd || 
                breakRecord.breakStart === '' || breakRecord.breakEnd === '') {
              continue;
            }
            
            const [breakStartHour, breakStartMinute] = breakRecord.breakStart.split(':').map(Number);
            const [breakEndHour, breakEndMinute] = breakRecord.breakEnd.split(':').map(Number);
            
            let breakStartTotalMinutes = breakStartHour * 60 + breakStartMinute;
            let breakEndTotalMinutes = breakEndHour * 60 + breakEndMinute;
            
            // 休憩終了時間が休憩開始時間より前なら日をまたいだと判断
            if (breakEndTotalMinutes < breakStartTotalMinutes) {
              breakEndTotalMinutes += 24 * 60;
            }
            
            totalBreakMinutes += breakEndTotalMinutes - breakStartTotalMinutes;
          }
        }
        
        // 実労働時間 = 総勤務時間 - 休憩時間
        const netWorkMinutes = totalWorkMinutes - totalBreakMinutes;
        
        // 時間と分に変換（例: 7時間30分）
        const hours = Math.floor(netWorkMinutes / 60);
        const minutes = netWorkMinutes % 60;
        
        totalWorkTime = `${hours}時間${minutes > 0 ? `${minutes}分` : ''}`;
      }
      
      // 送信データを明示的に構築
      const submitData = {
        date: attendanceData.date,
        employeeName: attendanceData.employeeName,
        startTime: startTime,
        endTime: endTime,
        workType: workType,
        recordType: '出勤簿',
        totalWorkTime: totalWorkTime
      };
      
      console.log("送信するデータ:", submitData);
      
      // 出勤簿データの送信（新規または更新）
      await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });
      
      // 既存の休憩データをまず削除
      if (attendanceData.date && attendanceData.employeeName) {
        await fetch(`/api/break?date=${encodeURIComponent(attendanceData.date)}&employeeName=${encodeURIComponent(attendanceData.employeeName)}&recordType=出勤簿`, {
          method: 'DELETE',
        });
      }
      
      // 新しい休憩データを送信
      for (const breakRecord of breakRecords) {
        if (!breakRecord.breakStart || !breakRecord.breakEnd) continue;
        
        await fetch('/api/break', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            breakStart: breakRecord.breakStart,
            breakEnd: breakRecord.breakEnd,
            date: attendanceData.date,
            employeeName: attendanceData.employeeName,
            recordType: '出勤簿'
          }),
        });
      }
      
      // データを再取得して表示を更新
      await fetchAllData();
      
      // フォームをリセット
      setShowClockbookForm(false);
      setClockbookAttendance(null);
      setEditBreakRecords([{ breakStart: '', breakEnd: '', recordType: '出勤簿' }]);
      
      // 成功メッセージを表示
      setEditMessage('出勤簿を保存しました');
      setTimeout(() => setEditMessage(''), 3000);
    } catch (error) {
      console.error('Error:', error);
      setEditMessage('出勤簿の保存中にエラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 休暇申請の送信処理を修正
  const handleVacationSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      // 既存のコード...
      
      // フォーム送信後にすべてのデータを再取得
      await fetchAllData();
      
      setShowVacationForm(false);
      setVacationDate(null);
      setEditMessage('休暇申請を送信しました');
      setTimeout(() => setEditMessage(''), 3000);
    } catch (error) {
      console.error('Error submitting vacation request:', error);
      setEditMessage(error.message || '休暇申請の送信に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // この行を削除
  // const isLoading = status === 'loading' || !session || !userData;

  // 代わりに、isLoadingの条件を更新
  const loading = isLoading || status === 'loading' || !session || !userData;

  // 日付選択時の処理を追加
  const handleDateSelect = (date) => {
    setSelectedDate(date);
    
    // 選択された日付に対するアクションボタンを表示するだけ
    // 具体的なアクションは handleActionButtonClick で処理
  };

  return (
    <>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* 月移動用のボタン - z-indexとpositionを調整 */}
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
          
          <div className="max-w-5xl mx-auto pb-24 ios-scroll">
            {/* ユーザー情報カード - マージンを調整 */}
            <div className="bg-white rounded-xl shadow-sm p-4 cursor-default">
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
            
            <div className="mt-4">
              {/* スワイプ可能なコンテンツエリア */}
              <div 
                className={`transition-all duration-300 ${
                  swipeDirection === 'left' ? 'translate-x-[-100px] opacity-0' :
                  swipeDirection === 'right' ? 'translate-x-[100px] opacity-0' :
                  'translate-x-0 opacity-100'
                } ios-optimize`}
                {...swipeHandlers}
              >
                <MemoizedMonthlyListSection
                  currentDate={currentDate}
                  workDetails={workDetails}
                  userData={userData}
                  userSchedules={schedules}
                  breakData={breakData}
                  onAddButtonClick={handleDateSelect}
                  getLocalDateString={getLocalDateString}
                  onWorkDetailClick={(detail) => setSelectedWorkDetail(detail)}
                  vacationRequests={vacationRequests}
                />
              </div>
            </div>
          </div>

          {/* 追加ボタンのモーダル */}
          {selectedDate && (() => {
            const dateStr = getLocalDateString(selectedDate);
            const existingSchedule = userSchedules.find(s => 
              getLocalDateString(new Date(s[0])) === dateStr && s[5] === '予定'
            );
            const hasSchedule = !!existingSchedule;
            const existingAttendance = userSchedules.find(s => 
              getLocalDateString(new Date(s[0])) === dateStr && s[5] === '出勤簿'
            );
            const hasAttendance = !!existingAttendance;
            const isアルバイト = userData && userData.data[5] === 'アルバイト';
            
            return (
              <div className="fixed inset-0 z-[100] flex items-center justify-center">
                <div 
                  className="fixed inset-0 bg-black/40 backdrop-blur-sm" 
                  onClick={() => setSelectedDate(null)}
                />
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                  bg-white rounded-2xl shadow-xl p-6 w-11/12 max-w-sm z-[101] border border-gray-200">
                  <div className="mb-6 text-center">
                    <h3 className="text-xl font-bold text-gray-900">
                      {selectedDate.toLocaleDateString('ja-JP', { 
                        month: 'long', 
                        day: 'numeric',
                        weekday: 'long'
                      })}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">アクションを選択してください</p>
                  </div>
                  <div className="space-y-3">
                    {isアルバイト ? (
                      // アルバイト用のボタン
                      <button
                        className="flex items-center w-full px-4 py-3 text-left text-gray-700 
                          rounded-xl transition-all duration-150
                          bg-blue-50/50 border border-blue-100
                          active:scale-98 active:bg-blue-100/70 group
                          relative overflow-hidden"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActionButtonClick('vacation');
                        }}
                      >
                        <div className="absolute inset-0 bg-blue-100/50 opacity-0 group-active:opacity-100 transition-opacity duration-150"></div>
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 
                          flex items-center justify-center mr-3 z-10
                          group-active:bg-blue-200 transition-colors duration-150
                          border border-blue-200">
                          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="z-10">
                          <div className="font-medium">休暇申請</div>
                          <div className="text-xs text-gray-500 group-active:text-blue-600">
                            休暇の申請を行います
                          </div>
                        </div>
                      </button>
                    ) : (
                      // 通常のスケジュールボタン
                      <button
                        className="flex items-center w-full px-4 py-3 text-left text-gray-700 
                          rounded-xl transition-all duration-150
                          bg-blue-50/50 border border-blue-100
                          active:scale-98 active:bg-blue-100/70 group
                          relative overflow-hidden"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActionButtonClick('schedule');
                        }}
                      >
                        <div className="absolute inset-0 bg-blue-100/50 opacity-0 group-active:opacity-100 transition-opacity duration-150"></div>
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 
                          flex items-center justify-center mr-3 z-10
                          group-active:bg-blue-200 transition-colors duration-150
                          border border-blue-200">
                          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                              d={hasSchedule 
                                ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                : "M12 4v16m8-8H4"} 
                            />
                          </svg>
                        </div>
                        <div className="z-10">
                          <div className="font-medium">
                            {isアルバイト 
                              ? (hasSchedule ? "休暇申請の編集" : "休暇申請")
                              : (hasSchedule ? "行動予定の編集" : "行動予定の追加")
                            }
                          </div>
                          <div className="text-xs text-gray-500 group-active:text-blue-600">
                            {isアルバイト 
                              ? (hasSchedule ? "登録済みの休暇申請を編集します" : "新しい休暇申請を追加します")
                              : (hasSchedule ? "登録済みの予定を編集します" : "新しい予定を追加します")
                            }
                          </div>
                        </div>
                      </button>
                    )}

                    <button
                      className="flex items-center w-full px-4 py-3 text-left text-gray-700 
                        rounded-xl transition-all duration-150
                        bg-emerald-50/50 border border-emerald-100
                        active:scale-98 active:bg-emerald-100/70 group
                        relative overflow-hidden"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleActionButtonClick('attendance');
                      }}
                    >
                      <div className="absolute inset-0 bg-emerald-100/50 opacity-0 group-active:opacity-100 transition-opacity duration-150"></div>
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-100 
                        flex items-center justify-center mr-3 z-10
                        group-active:bg-emerald-200 transition-colors duration-150
                        border border-emerald-200">
                        <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="z-10">
                        <div className="font-medium">
                          {hasAttendance ? "勤務実績の編集" : "勤務実績の登録"}
                        </div>
                        <div className="text-xs text-gray-500 group-active:text-emerald-600">
                          {hasAttendance ? "登録済みの勤務を編集します" : "勤務時間を登録します"}
                        </div>
                      </div>
                    </button>
                  </div>
                  <button
                    className="mt-6 w-full text-center text-sm text-gray-600
                      py-3 transition-all duration-150 rounded-xl
                      bg-gray-50/50 border border-gray-200
                      active:bg-gray-100/70 active:text-gray-800 active:scale-98"
                    onClick={() => setSelectedDate(null)}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            );
          })()}

          {/* 業務詳細モーダル */}
          <WorkDetailModal 
            workDetail={selectedWorkDetail} 
            onClose={() => setSelectedWorkDetail(null)} 
            className="z-[105]"
          />

          {/* ScheduleForm モーダル */}
          {showScheduleForm && scheduleAttendance && (
            <div className="z-[110]">
              <ScheduleForm
                initialAttendance={scheduleAttendance}
                initialBreakRecords={editBreakRecords}
                initialWorkDetails={editWorkDetails}
                onSubmit={handleScheduleSubmit}
                onClose={() => {
                  setShowScheduleForm(false);
                  setScheduleAttendance(null);
                  setEditBreakRecords([{ breakStart: '', breakEnd: '', recordType: '予定' }]);
                  setEditWorkDetails([{ 
                    workTitle: '', 
                    workStart: '', 
                    workEnd: '', 
                    detail: '', 
                    workCategory: '業務',
                    recordType: '予定' 
                  }]);
                }}
              />
            </div>
          )}
          
          {/* 新規追加: ClockbookForm モーダル */}
          {showClockbookForm && clockbookAttendance && (
            <div className="z-[110]">
              <ClockbookForm
                initialAttendance={clockbookAttendance}
                onSubmit={handleClockbookSubmit}
                onClose={() => {
                  setShowClockbookForm(false);
                  setClockbookAttendance(null);
                }}
              />
            </div>
          )}

          {/* 休暇申請フォームを追加 */}
          {showVacationForm && vacationDate && (
            <div className="z-[110]">
              <VacationRequestForm
                initialDate={vacationDate.date}
                employeeName={vacationDate.employeeName}
                onSubmit={handleVacationSubmit}
                onClose={() => {
                  setShowVacationForm(false);
                  setVacationDate(null);
                }}
              />
            </div>
          )}
        </>
      )}
      
      {/* 送信中のオーバーレイ */}
      {isSubmitting && (
        <div className="fixed inset-0 flex items-center justify-center z-[120] bg-black bg-opacity-50">
          <div className="text-white text-2xl">登録中...</div>
        </div>
      )}
    </>
  );
}

MySchedulePage.title = 'スケジュール';
