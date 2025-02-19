import React, { useState } from 'react';
import { useRouter } from 'next/router';

// ヘルパー関数：月の日付一覧を取得
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

export default function MonthlyListSection({ 
  currentDate, 
  workDetails, 
  userData, 
  userSchedules, 
  breakData,
  onAddButtonClick,
  getLocalDateString,
  onWorkDetailClick,
  showSummaryCard,
  timeToHoursAndMinutes,
  parseJapaneseTimeString,
  vacationRequests
}) {
  const router = useRouter();
  const isMySchedulePage = router.pathname.includes('my-schedule');

  // ※ PC画面でのユーザー選択処理は親コンポーネント側で管理するため、ここからは削除

  // --- 以下、サマリーカード用のヘルパー関数を定義 ---
  const calculatePlannedWorkingHours = (schedules, date, userName) => {
    if (!schedules || !Array.isArray(schedules)) return 0;
    
    let totalMinutes = 0;
    const selectedMonth = date.getMonth();
    const selectedYear = date.getFullYear();
    const startDate = new Date(selectedYear, selectedMonth - 1, 21, 0, 0, 0);
    const endDate = new Date(selectedYear, selectedMonth, 20, 23, 59, 59);

    schedules.forEach(schedule => {
      const scheduleDate = new Date(schedule[0]);
      if (isNaN(scheduleDate.getTime())) return;

      if (
        scheduleDate >= startDate &&
        scheduleDate <= endDate &&
        schedule[1] === userName &&
        schedule[5] === '予定'
      ) {
        const workHours = parseJapaneseTimeString(schedule[6]);
        totalMinutes += Math.round(workHours * 60);
      }
    });

    return totalMinutes / 60;
  };

  const calculateActualWorkingHoursForClock = (schedules, date, userName) => {
    if (!schedules || !Array.isArray(schedules)) return 0;
    
    let totalMinutes = 0;
    const selectedMonth = date.getMonth();
    const selectedYear = date.getFullYear();
    const startDate = new Date(selectedYear, selectedMonth - 1, 21, 0, 0, 0);
    const endDate = new Date(selectedYear, selectedMonth, 20, 23, 59, 59);

    schedules.forEach(schedule => {
      const scheduleDate = new Date(schedule[0]);
      if (isNaN(scheduleDate.getTime())) return;

      if (
        scheduleDate >= startDate &&
        scheduleDate <= endDate &&
        schedule[1] === userName &&
        schedule[5] === '出勤簿'
      ) {
        const workHours = parseJapaneseTimeString(schedule[6]);
        totalMinutes += Math.round(workHours * 60);
      }
    });

    return totalMinutes / 60;
  };

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

  const getStandardWorkingHours = (date) => {
    // 簡易的な実装として標準勤務時間は160とする
    return 160;
  };

  // --- サマリーカード用の値を計算（showSummaryCardがtrueの場合のみ） ---
  let plannedWorkingHours, actualHours, plannedCounts, clockbookCounts, standardHours;
  if (showSummaryCard && userData && userSchedules) {
    plannedWorkingHours = calculatePlannedWorkingHours(userSchedules, currentDate, userData.data[0]);
    actualHours = calculateActualWorkingHoursForClock(userSchedules, currentDate, userData.data[0]);
    plannedCounts = calculateWorkTypeCounts(userSchedules, '予定');
    clockbookCounts = calculateWorkTypeCounts(userSchedules, '出勤簿');
    standardHours = getStandardWorkingHours(currentDate);
  }

  return (
    <>
      {showSummaryCard && (
        <div className="bg-white rounded-xl shadow-sm p-4 divide-y divide-gray-100 cursor-default mb-6">
          <div className="pt-2 flex flex-row justify-between gap-2">
            {/* 予定勤務時間セクション - 業務とアルバイト以外のアカウントのみ表示 */}
            {userData && !['業務', 'アルバイト'].includes(userData.data[5]) && (
              <div className="relative flex flex-col pt-2 pb-2 px-3 bg-blue-50/80 rounded-lg border border-blue-100 w-3/5">
                <span className="text-sm text-gray-500">予定勤務時間</span>
                <div className="flex mt-1">
                  <div className="w-1/2 flex items-center justify-center">
                    <div className="flex items-baseline">
                      <span className="text-2xl font-bold text-blue-600">
                        {plannedWorkingHours.toFixed(1)}
                      </span>
                      <span className="text-lg text-blue-500 mx-0.5">h</span>
                    </div>
                  </div>
                  <div className="w-px bg-blue-200"></div>
                  <div className="w-1/2 flex items-center justify-center">
                    {(() => {
                      const diff = Math.abs(plannedWorkingHours - standardHours);
                      return (
                        <div className="flex items-baseline">
                          <span className={`text-2xl font-bold ${
                            Math.abs(plannedWorkingHours - standardHours) <= 3
                              ? 'text-green-600'
                              : Math.abs(plannedWorkingHours - standardHours) <= 9
                                ? 'text-yellow-600'
                                : 'text-red-500'
                          }`}>
                            {plannedWorkingHours >= standardHours ? '+' : '-'}{diff.toFixed(1)}
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
            )}

            {/* 実勤務時間の円グラフ - 常に表示 */}
            <div className={`flex flex-col items-center gap-1 ${!['業務', 'アルバイト'].includes(userData?.data[5]) ? 'w-2/5' : 'w-full'}`}>
              <div className={`relative ${!['業務', 'アルバイト'].includes(userData?.data[5]) ? 'w-28 h-28' : 'w-36 h-36'}`}>
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx={!['業務', 'アルバイト'].includes(userData?.data[5]) ? "56" : "72"}
                    cy={!['業務', 'アルバイト'].includes(userData?.data[5]) ? "56" : "72"}
                    r={!['業務', 'アルバイト'].includes(userData?.data[5]) ? "52" : "68"}
                    className="stroke-current text-gray-100"
                    strokeWidth="3"
                    fill="none"
                  />
                  <circle
                    cx={!['業務', 'アルバイト'].includes(userData?.data[5]) ? "56" : "72"}
                    cy={!['業務', 'アルバイト'].includes(userData?.data[5]) ? "56" : "72"}
                    r={!['業務', 'アルバイト'].includes(userData?.data[5]) ? "52" : "68"}
                    className="stroke-current text-green-500"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray={`${(actualHours / standardHours) * (!['業務', 'アルバイト'].includes(userData?.data[5]) ? 327 : 427)} ${!['業務', 'アルバイト'].includes(userData?.data[5]) ? 327 : 427}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="flex items-baseline">
                    <span className={`font-bold text-gray-900 ${!['業務', 'アルバイト'].includes(userData?.data[5]) ? 'text-2xl' : 'text-3xl'}`}>
                      {timeToHoursAndMinutes(actualHours).hours}
                    </span>
                    <span className={`text-gray-500 mx-0.5 ${!['業務', 'アルバイト'].includes(userData?.data[5]) ? 'text-lg' : 'text-xl'}`}>h</span>
                    <span className={`font-bold text-gray-900 ${!['業務', 'アルバイト'].includes(userData?.data[5]) ? 'text-xl' : 'text-2xl'}`}>
                      {timeToHoursAndMinutes(actualHours).minutes}
                    </span>
                    <span className={`text-gray-500 ${!['業務', 'アルバイト'].includes(userData?.data[5]) ? 'text-sm' : 'text-base'}`}>m</span>
                  </div>
                  <div className="flex items-baseline">
                    <span className={`text-gray-500 ${!['業務', 'アルバイト'].includes(userData?.data[5]) ? 'text-sm' : 'text-base'}`}>/</span>
                    <span className={`text-gray-500 ml-1 ${!['業務', 'アルバイト'].includes(userData?.data[5]) ? 'text-lg' : 'text-xl'}`}>{standardHours}</span>
                    <span className={`text-gray-500 ${!['業務', 'アルバイト'].includes(userData?.data[5]) ? 'text-xs' : 'text-sm'}`}>h</span>
                  </div>
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
                  {Object.entries(plannedCounts).map(([type, count]) => {
                    if (count === 0) return null;
                    return (
                      <div
                        key={`予定-${type}`}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600"
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
                  {Object.entries(clockbookCounts).map(([type, count]) => {
                    if (count === 0) return null;
                    return (
                      <div
                        key={`出勤簿-${type}`}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600"
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
      )}
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <div className="space-y-3">
          {getDaysInMonth(currentDate).map((date, idx) => {
            const dateKey = date.toLocaleDateString('ja-JP', { 
              weekday: 'short', 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit' 
            });
            const isToday = date.toDateString() === new Date().toDateString();
            const weekday = date.toLocaleDateString('ja-JP', { weekday: 'short' });
            
            // 該当日の業務詳細を取得（デバッグ用ログあり）
            const dayDetails = workDetails.filter(rec => {
              const recDate = getLocalDateString(new Date(rec.date));
              const targetDate = getLocalDateString(date);
              const clockbookDetails = workDetails.filter(cd => 
                getLocalDateString(new Date(cd.date)) === targetDate &&
                cd.employeeName === userData?.data[0] &&
                cd.recordType === '出勤簿'
              );
              return (
                userData &&
                rec.employeeName === userData.data[0] &&
                recDate === targetDate &&
                (clockbookDetails.length > 0 ? 
                  rec.recordType === '出勤簿' : 
                  rec.recordType === '予定')
              );
            });
            
            // 該当日の出退勤の予定レコードを取得
            const attendanceRecordForDate = userSchedules.find(s => {
              const matchDate = new Date(s[0]).toDateString() === date.toDateString();
              // 出勤簿データを優先的に検索
              const clockbookRecord = userSchedules.find(cr => 
                new Date(cr[0]).toDateString() === date.toDateString() && 
                cr[5] === '出勤簿'
              );
              
              // 出勤簿データがある場合はそれを返し、なければ予定データを返す
              if (clockbookRecord) {
                return true && s === clockbookRecord;
              }
              return matchDate && s[5] === '予定';
            });
            
            // 該当日の休憩記録を取得
            const breakRecordsForDate = breakData.filter(br => {
              const matchDate = new Date(br.date).toDateString() === date.toDateString();
              // 出勤簿データを優先的に検索
              const clockbookBreaks = breakData.filter(cbr => 
                new Date(cbr.date).toDateString() === date.toDateString() &&
                cbr.employeeName === userData?.data[0] &&
                cbr.recordType === '出勤簿'
              );
              
              return clockbookBreaks.length > 0 ? 
                (matchDate && br.recordType === '出勤簿' && br.employeeName === userData?.data[0]) :
                (matchDate && br.recordType === '予定' && br.employeeName === userData?.data[0]);
            });
            
            // 該当日の休日申請を確認
            const pendingVacationRequest = vacationRequests?.data?.find(req => {
              // デバッグ用ログは削除済み
              return req.date === getLocalDateString(date) && 
                     req.employeeName === userData?.data[0] && 
                     req.status === '申請中';
            });
            
            let bgClass = 'bg-gray-50';
            let borderClass = 'border-gray-200';
            
            if (isToday) {
              bgClass = 'bg-blue-50';
              borderClass = 'border-blue-400';
            } else if (weekday.includes('土')) {
              bgClass = 'bg-indigo-50';
              borderClass = 'border-indigo-300';
            } else if (weekday.includes('日')) {
              bgClass = 'bg-rose-50';
              borderClass = 'border-rose-300';
            }
            
            return (
              <div key={dateKey} className={`relative rounded-xl overflow-hidden ${bgClass} hover:bg-opacity-80 transition-all duration-300 shadow-sm hover:shadow-md`}>
                {isMySchedulePage && (
                  <>
                    <button
                      className="absolute top-2 right-2 text-xs font-medium bg-white text-gray-700 hover:text-blue-600 
                        rounded-lg px-3 py-1.5 cursor-pointer shadow-sm hover:shadow transition-all duration-300 
                        flex items-center space-x-1 border border-gray-200 hover:border-blue-200 hover:bg-blue-50 z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddButtonClick(date);
                      }}
                    >
                      <svg 
                        className="w-3.5 h-3.5" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth="2" 
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      <span>追加</span>
                    </button>
                  </>
                )}
                
                <div className={`flex items-center px-4 py-3 border-l-4 ${borderClass} bg-white bg-opacity-50 backdrop-blur-sm`}>
                  <div className="flex items-center space-x-3">
                    <span className={`flex items-center justify-center w-10 h-10 rounded-xl text-sm font-bold ${
                      isToday ? 'bg-blue-400 text-white shadow-sm' :
                      weekday.includes('土') ? 'bg-indigo-400 text-white' :
                      weekday.includes('日') ? 'bg-rose-400 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {date.getDate()}
                      <span className="text-xs ml-1">{weekday}</span>
                    </span>
                    {isToday && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-lg font-medium shadow-sm">
                        Today
                      </span>
                    )}
                    {/* 追加：申請中の休日申請がある場合のバッジ */}
                    {pendingVacationRequest && (
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-600 rounded-lg font-medium shadow-sm animate-pulse">
                        {pendingVacationRequest.type}申請中
                      </span>
                    )}
                  </div>
                </div>
        
                <div className="px-4 py-3 space-y-3">
                  {attendanceRecordForDate && ['公休', '有休'].includes(attendanceRecordForDate[4]) ? (
                    // 公休・有休の場合の表示
                    <div className="bg-white bg-opacity-75 backdrop-blur-sm rounded-xl p-6 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className={`text-lg font-bold ${
                          attendanceRecordForDate[4] === '公休' ? 'text-indigo-600' : 'text-emerald-600'
                        }`}>
                          {attendanceRecordForDate[4]}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                          attendanceRecordForDate[5] === '出勤簿' 
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {attendanceRecordForDate[5] === '出勤簿' ? '実績' : '予定'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    // 通常の勤務の場合の表示
                    <>
                      {/* 勤務種別をバッジスタイルで表示 */}
                      {attendanceRecordForDate && (
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 text-xs font-medium bg-white rounded-lg shadow-sm border border-gray-200">
                              {attendanceRecordForDate[4] || '未設定'}
                            </span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                            attendanceRecordForDate[5] === '出勤簿' 
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {attendanceRecordForDate[5] === '出勤簿' ? '実績' : '予定'}
                          </span>
                        </div>
                      )}
              
                      {/* 業務アカウント以外の場合のみ勤務時間と休憩時間を表示 */}
                      {(userData?.data[5] !== '業務' || attendanceRecordForDate?.[5] === '出勤簿') && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="bg-white bg-opacity-75 backdrop-blur-sm rounded-xl p-3 shadow-sm hover:shadow transition-all duration-300">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 rounded-lg bg-blue-400 flex items-center justify-center">
                                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <span className="text-sm font-medium text-gray-700">勤務時間</span>
                              </div>
                              {attendanceRecordForDate && (
                                <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                                  attendanceRecordForDate[5] === '出勤簿' 
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {attendanceRecordForDate[5] === '出勤簿' ? '実績' : '予定'}
                                </span>
                              )}
                            </div>
                            <div className="flex justify-between items-center px-2">
                              <div>
                                <div className="text-xs text-gray-500">出勤</div>
                                <div className="text-base font-semibold text-blue-600">
                                  {attendanceRecordForDate ? attendanceRecordForDate[2] : '--:--'}
                                </div>
                              </div>
                              <div className="h-8 w-px bg-gray-200"></div>
                              <div>
                                <div className="text-xs text-gray-500">退勤</div>
                                <div className="text-base font-semibold text-blue-600">
                                  {attendanceRecordForDate ? attendanceRecordForDate[3] : '--:--'}
                                </div>
                              </div>
                            </div>
                          </div>
                  
                          <div className="bg-white bg-opacity-75 backdrop-blur-sm rounded-xl p-3 shadow-sm hover:shadow transition-all duration-300">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 rounded-lg bg-emerald-400 flex items-center justify-center">
                                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                </div>
                                <span className="text-sm font-medium text-gray-700">休憩時間</span>
                              </div>
                              {breakRecordsForDate.length > 0 && (
                                <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                                  breakRecordsForDate[0].recordType === '出勤簿'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {breakRecordsForDate[0].recordType === '出勤簿' ? '実績' : '予定'}
                                </span>
                              )}
                            </div>
                            {breakRecordsForDate.length > 0 ? (
                              <div className="space-y-1 px-2">
                                {breakRecordsForDate.map((br, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-sm">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-xs text-gray-500">開始</span>
                                      <span className="font-medium text-emerald-600">{br.breakStart}</span>
                                    </div>
                                    <div className="h-4 w-px bg-gray-200 mx-2"></div>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-xs text-gray-500">終了</span>
                                      <span className="font-medium text-emerald-600">{br.breakEnd}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 text-center mt-2">休憩予定なし</p>
                            )}
                          </div>
                        </div>
                      )}
              
                      {/* 業務詳細は常に表示（データがある場合） */}
                      {dayDetails.length > 0 && !['公休', '有休'].includes(attendanceRecordForDate?.[4]) && (
                        <div className={`bg-white bg-opacity-75 backdrop-blur-sm rounded-xl p-3 shadow-sm ${userData?.data[5] === '業務' ? 'mt-0' : 'mt-3'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 rounded-lg bg-purple-400 flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                              </div>
                              <span className="text-sm font-medium text-gray-700">業務詳細</span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                              dayDetails[0].recordType === '出勤簿'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {dayDetails[0].recordType === '出勤簿' ? '実績' : '予定'}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {dayDetails.map((detail, idx) => (
                              <div 
                                key={idx} 
                                className="group bg-gray-50 hover:bg-blue-50 rounded-lg p-2.5 transition-all duration-300 cursor-pointer"
                                onClick={() => {
                                  onWorkDetailClick(detail);
                                }}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center space-x-3 min-w-0">
                                    <div className="flex-shrink-0">
                                      <div className="w-8 h-8 rounded-lg bg-white shadow-sm border border-gray-100 flex items-center justify-center group-hover:border-blue-200 transition-colors duration-300">
                                        <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                      </div>
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-600 transition-colors duration-300">
                                        {detail.workTitle}
                                      </h4>
                                      {detail.detail && (
                                        <p className="text-xs text-gray-500 line-clamp-1 group-hover:text-blue-500 transition-colors duration-300">
                                          {detail.detail}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex-shrink-0">
                                    <span className="px-2 py-1 text-xs font-medium bg-white text-gray-600 group-hover:text-blue-600 rounded-lg shadow-sm whitespace-nowrap transition-colors duration-300">
                                      {detail.workStart}-{detail.workEnd}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
} 