import React, { useState, memo, useCallback } from 'react';
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

// コンポーネント定義
function MonthlyListSection({ 
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
  const calculatePlannedWorkingHours = useCallback((schedules, date, userName) => {
    if (!schedules || !Array.isArray(schedules)) return 0;
    
    let totalMinutes = 0;
    const targetMonth = date.getMonth();
    const targetYear = date.getFullYear();
    
    // 日付の文字列比較ではなく数値比較にする（パフォーマンス向上）
    const startDayValue = new Date(targetYear, targetMonth - 1, 21).valueOf();
    const endDayValue = new Date(targetYear, targetMonth, 20, 23, 59, 59).valueOf();

    for (let i = 0; i < schedules.length; i++) {
      const schedule = schedules[i];
      if (!Array.isArray(schedule)) continue;
      
      const scheduleDate = new Date(schedule[0]);
      if (isNaN(scheduleDate.valueOf())) continue;
      
      const scheduleDateValue = scheduleDate.valueOf();
      if (scheduleDateValue >= startDayValue && 
          scheduleDateValue <= endDayValue && 
          schedule[1] === userName && 
          schedule[5] === '予定' && 
          schedule[6] && typeof schedule[6] === 'string') {
        
        const workHours = parseJapaneseTimeString(schedule[6]);
        totalMinutes += Math.round(workHours * 60);
      }
    }
    
    return totalMinutes / 60;
  }, [parseJapaneseTimeString]);

  const calculateActualWorkingHoursForClock = (schedules, date, userName) => {
    if (!schedules || !Array.isArray(schedules)) return 0;
    
    let totalMinutes = 0;
    const selectedMonth = date.getMonth();
    const selectedYear = date.getFullYear();
    
    // 前月21日から当月20日までの期間を設定
    const startDate = new Date(selectedYear, selectedMonth - 1, 21, 0, 0, 0);
    const endDate = new Date(selectedYear, selectedMonth, 20, 23, 59, 59);
    
    console.log('MonthlyListSection: 計算期間（実績）', 
      startDate.toLocaleDateString(), '〜', 
      endDate.toLocaleDateString(), 
      'Month:', selectedMonth + 1
    );
    console.log('対象ユーザー:', userName);

    // 該当するデータを集計
    let matchingRecords = 0;
    
    // for...ofループに変更して各スケジュールを処理
    for (const schedule of schedules) {
      if (!Array.isArray(schedule)) continue;
      
      const scheduleDate = new Date(schedule[0]);
      if (isNaN(scheduleDate.getTime())) continue;

      // 日付範囲のチェックを明確に
      const isInDateRange = scheduleDate >= startDate && scheduleDate <= endDate;
      if (!isInDateRange) continue;

      // ユーザー名とレコードタイプのチェック
      if (
        schedule[1] === userName &&
        schedule[5] === '出勤簿' &&
        schedule[6] && typeof schedule[6] === 'string'
      ) {
        matchingRecords++;
        const workHours = parseJapaneseTimeString(schedule[6]);
        totalMinutes += Math.round(workHours * 60);
        
        console.log('実績該当:', 
          scheduleDate.toLocaleDateString(), 
          schedule[1], 
          schedule[5], 
          '時間:', schedule[6], 
          '→', workHours, '時間'
        );
      }
    }

    console.log('合計該当レコード数:', matchingRecords);
    console.log('合計勤務時間(分):', totalMinutes, '時間:', totalMinutes / 60);
    
    return totalMinutes / 60;
  };

  const calculateWorkTypeCounts = (schedules, type = '予定') => {
    const counts = {};
    const WORK_TYPES = {
      '出勤': {},
      '在宅': {},
      '移動': {},
      '公休': {},
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
    const userName = userData.data[0]; // ユーザー名
    plannedWorkingHours = calculatePlannedWorkingHours(userSchedules, currentDate, userName);
    actualHours = calculateActualWorkingHoursForClock(userSchedules, currentDate, userName);
    plannedCounts = calculateWorkTypeCounts(userSchedules, '予定');
    clockbookCounts = calculateWorkTypeCounts(userSchedules, '出勤簿');
    standardHours = getStandardWorkingHours(currentDate);
  }

  // 月の全日付
  const daysInMonth = getDaysInMonth(currentDate);

  // 日付ごとに表示に必要なデータを作成
  const daysData = daysInMonth.map(day => {
    const dateString = getLocalDateString(day);
    
    // ユーザーがない場合は空のデータを返す
    if (!userData) {
      return { date: day, dateString };
    }
    
    const userName = userData.data[0]; // ユーザー名

    // ユーザーの当日のスケジュールを検索
    const daySchedules = userSchedules.filter(
      s => s[0] === dateString && s[1] === userName
    );

    // 予定と実績を分離
    const plannedSchedule = daySchedules.find(s => s[5] === '予定');
    const clockbookSchedule = daySchedules.find(s => s[5] === '出勤簿');

    // 当日の業務詳細を検索
    let dayDetails = [];
    if (workDetails && Array.isArray(workDetails)) {
      dayDetails = workDetails.filter(
        detail => detail.date === dateString && detail.employeeName === userName
      );
    }

    // 休憩データを検索
    let dayBreaks = [];
    if (breakData && Array.isArray(breakData)) {
      dayBreaks = breakData.filter(
        record => record.date === dateString && record.employeeName === userName
      );
    }

    // 休暇申請データを検索
    let dayVacation = null;
    if (vacationRequests && vacationRequests.data && Array.isArray(vacationRequests.data)) {
      dayVacation = vacationRequests.data.find(
        req => req.date === dateString && req.employeeName === userName
      );
    }

    return {
      date: day,
      dateString,
      plannedSchedule,
      clockbookSchedule,
      dayDetails,
      dayBreaks,
      dayVacation
    };
  });

  return (
    <>
      {showSummaryCard && userData && (
        <div className="mb-8 ios-optimize">
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-4">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {userData.data[6] ? (
                    <img 
                      src={userData.data[6]}
                      alt={userData.data[0]}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                      <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-semibold text-gray-800">{userData.data[0]}</h2>
                  <div className="flex items-center text-sm text-gray-600">
                    <div className="mr-2">{userData.data[4]}</div>
                    <span className="mx-2">•</span>
                    <div className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {userData.data[5]}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">月間予定労働時間</h3>
                  <div className="flex items-end">
                    <div className="text-3xl font-bold text-blue-700">{plannedWorkingHours.toFixed(1)}</div>
                    <div className="ml-1 text-xl text-blue-600">時間</div>
                    <div className="ml-auto text-sm text-gray-500 flex items-center">
                      <span>目標: {standardHours}h</span>
                      <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-medium ${
                        plannedWorkingHours >= standardHours 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {plannedWorkingHours >= standardHours ? '達成' : '未達'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 w-full bg-white rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        plannedWorkingHours >= standardHours 
                          ? 'bg-green-500' 
                          : 'bg-yellow-500'
                      }`}
                      style={{ width: `${Math.min((plannedWorkingHours / standardHours) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">月間実労働時間</h3>
                  <div className="flex items-end">
                    <div className="text-3xl font-bold text-emerald-700">{actualHours.toFixed(1)}</div>
                    <div className="ml-1 text-xl text-emerald-600">時間</div>
                    <div className="ml-auto text-sm text-gray-500 flex items-center">
                      <span>目標: {standardHours}h</span>
                      <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-medium ${
                        actualHours >= standardHours 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {actualHours >= standardHours ? '達成' : '未達'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 w-full bg-white rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        actualHours >= standardHours 
                          ? 'bg-green-500' 
                          : 'bg-yellow-500'
                      }`}
                      style={{ width: `${Math.min((actualHours / standardHours) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    予定
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(plannedCounts).map(([type, count]) => {
                      if (count === 0) return null;
                      return (
                        <div
                          key={`予定-${type}`}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium 
                            ${
                              type === '出勤' ? 'bg-blue-50 text-blue-600' :
                              type === '在宅' ? 'bg-green-50 text-green-600' :
                              type === '移動' ? 'bg-purple-50 text-purple-600' :
                              type === '公休' ? 'bg-red-50 text-red-600' :
                              type === '半休' ? 'bg-yellow-50 text-yellow-600' :
                              'bg-gray-50 text-gray-600'
                            }`}
                        >
                          {type} {count}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    実績
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(clockbookCounts).map(([type, count]) => {
                      if (count === 0) return null;
                      return (
                        <div
                          key={`実績-${type}`}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium 
                            ${
                              type === '出勤' ? 'bg-blue-50 text-blue-600' :
                              type === '在宅' ? 'bg-green-50 text-green-600' :
                              type === '移動' ? 'bg-purple-50 text-purple-600' :
                              type === '公休' ? 'bg-red-50 text-red-600' :
                              type === '半休' ? 'bg-yellow-50 text-yellow-600' :
                              'bg-gray-50 text-gray-600'
                            }`}
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
        </div>
      )}

      <div className="ios-optimize">
        <div className="space-y-6">
          {daysData.map((dayData) => {
            const isToday = dayData.date.toDateString() === new Date().toDateString();
            const { 
              date, 
              dateString, 
              plannedSchedule, 
              clockbookSchedule, 
              dayDetails,
              dayBreaks,
              dayVacation
            } = dayData;
            
            return (
              <div 
                key={dateString} 
                className={`bg-white rounded-xl shadow-sm overflow-hidden border
                  ${isToday ? 'border-blue-300 ring-1 ring-blue-300' : 'border-gray-100'}`}
              >
                <div className="p-4 ios-text">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center
                        ${isToday ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        <span className="text-sm font-bold">{date.getDate()}</span>
                        <span className="text-xs">
                          {['日', '月', '火', '水', '木', '金', '土'][date.getDay()]}
                        </span>
                      </div>
                      
                      <div>
                        {plannedSchedule && (
                          <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mr-1
                            ${
                              plannedSchedule[4] === '出勤' ? 'bg-blue-50 text-blue-600' :
                              plannedSchedule[4] === '在宅' ? 'bg-green-50 text-green-600' :
                              plannedSchedule[4] === '移動' ? 'bg-purple-50 text-purple-600' :
                              plannedSchedule[4] === '公休' ? 'bg-red-50 text-red-600' :
                              plannedSchedule[4] === '半休' ? 'bg-yellow-50 text-yellow-600' :
                              plannedSchedule[4] === '有給休暇' ? 'bg-red-50 text-red-600' :
                              'bg-gray-50 text-gray-600'
                            }`}
                          >
                            {plannedSchedule[4]}
                          </div>
                        )}
                        
                        {clockbookSchedule && (
                          <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 mr-1">
                            実績
                          </div>
                        )}
                        
                        {dayVacation && dayVacation.status === '申請中' && (
                          <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                            休暇申請中
                          </div>
                        )}
                        
                        {dayVacation && dayVacation.status === '許可' && (
                          <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            休暇承認済
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {isMySchedulePage && (
                      <button
                        type="button"
                        onClick={() => onAddButtonClick(date)}
                        className="px-3 py-1.5 bg-white text-blue-600 text-sm border border-blue-200 rounded-lg hover:bg-blue-50 transition-all"
                      >
                        登録
                      </button>
                    )}
                  </div>
                  
                  {/* 勤務情報の表示 */}
                  {(plannedSchedule || clockbookSchedule) && (
                    <div className="mt-3 space-y-4">
                      {/* 予定の表示 */}
                      {plannedSchedule && (
                        <div className="rounded-lg border border-gray-100 p-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                              <svg className="w-4 h-4 mr-1.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              予定
                            </h3>
                            {plannedSchedule[6] && (
                              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                {plannedSchedule[6]}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <div className="flex-1">
                              {plannedSchedule[2] && plannedSchedule[3] ? (
                                <div className="flex items-center">
                                  <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {plannedSchedule[2]} - {plannedSchedule[3]}
                                </div>
                              ) : (
                                <div className="text-gray-400">時間未設定</div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* 実績の表示 */}
                      {clockbookSchedule && (
                        <div className="rounded-lg border border-green-100 bg-green-50 p-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                              <svg className="w-4 h-4 mr-1.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              実績
                            </h3>
                            {clockbookSchedule[6] && (
                              <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded">
                                {clockbookSchedule[6]}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <div className="flex-1">
                              {clockbookSchedule[2] && clockbookSchedule[3] ? (
                                <div className="flex items-center">
                                  <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {clockbookSchedule[2]} - {clockbookSchedule[3]}
                                </div>
                              ) : (
                                <div className="text-gray-400">時間未設定</div>
                              )}
                            </div>
                            
                            {dayBreaks && dayBreaks.length > 0 && (
                              <div className="text-sm text-amber-600">
                                休憩: {dayBreaks.map((brk, i) => (
                                  <span key={i}>
                                    {brk.breakStart}-{brk.breakEnd}
                                    {i < dayBreaks.length - 1 ? ', ' : ''}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* 業務詳細の表示 */}
                      {dayDetails && dayDetails.length > 0 && (
                        <div className="mt-3">
                          <div className="mb-2 flex items-center">
                            <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                              <svg className="w-4 h-4 mr-1.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              業務詳細
                            </h3>
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
                    </div>
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

// コンポーネントをmemoでラップして、比較関数を第二引数として渡す
export default memo(MonthlyListSection, (prevProps, nextProps) => {
  // currentDateが同じ場合は再レンダリングしない
  if (prevProps.currentDate.getTime() === nextProps.currentDate.getTime() &&
      JSON.stringify(prevProps.userData) === JSON.stringify(nextProps.userData) &&
      prevProps.userSchedules.length === nextProps.userSchedules.length) {
    return true; // propsが実質的に同じなら再レンダリングしない
  }
  return false; // propsが変わったら再レンダリングする
}); 