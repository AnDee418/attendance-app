import React, { useState, memo, useCallback } from 'react';
import { useRouter } from 'next/router';
import { 
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Sector 
} from 'recharts';

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
  vacationRequests,
  standardHours = 160  // デフォルト値を設定
}) {
  const router = useRouter();
  const isMySchedulePage = router.pathname.includes('my-schedule');
  const isMemberSchedulePage = router.pathname.includes('member-schedule');

  // 休暇系の勤務種別かどうかを判定
  const isLeaveType = (workType) => {
    return ['公休', '有給休暇', '有休'].includes(workType);
  };

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

    // 該当するデータを集計
    let matchingRecords = 0;
    
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
      }
    }
    
    return totalMinutes / 60;
  };

  const getVacationStatus = (date, employeeName) => {
    if (!vacationRequests || !vacationRequests.data) return null;
    
    const dateStr = getLocalDateString(date);
    const request = vacationRequests.data.find(r => 
      r.date === dateStr && 
      r.employeeName === employeeName
    );
    
    return request;
  };

  // 月内の日付一覧を取得
  const daysInMonth = getDaysInMonth(currentDate);
  
  // 土日祝日の判定
  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // 日曜(0)または土曜(6)
  };
  
  // 今日の日付
  const today = new Date();
  const isToday = (date) => {
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // 勤務種別に応じたスタイルを返す関数
  const getWorkTypeStyle = (workType) => {
    if (!workType) return { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', badge: 'bg-gray-200 text-gray-700' };
    
    switch (workType) {
      case '出勤':
        return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-800' };
      case '在宅':
        return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', badge: 'bg-green-100 text-green-800' };
      case '公休':
      case '有給休暇':
      case '有休':
        return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-800' };
      case '半休':
        return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800' };
      default:
        return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-700' };
    }
  };

  // 休憩時間の合計を計算する関数
  const calculateTotalBreakTime = (breaks) => {
    if (!breaks || breaks.length === 0) return "0分";
    
    let totalMinutes = 0;
    
    breaks.forEach(brk => {
      // 時間を分に変換
      const startParts = brk.breakStart.split(':').map(num => parseInt(num, 10));
      const endParts = brk.breakEnd.split(':').map(num => parseInt(num, 10));
      
      if (startParts.length === 2 && endParts.length === 2) {
        const startMinutes = startParts[0] * 60 + startParts[1];
        const endMinutes = endParts[0] * 60 + endParts[1];
        
        // 終了時間が開始時間より前の場合は翌日と解釈
        if (endMinutes >= startMinutes) {
          totalMinutes += endMinutes - startMinutes;
        } else {
          totalMinutes += (24 * 60 - startMinutes) + endMinutes;
        }
      }
    });
    
    // 時間と分に変換
    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}時間${minutes > 0 ? `${minutes}分` : ''}`;
    }
    
    return `${totalMinutes}分`;
  };

  // 月間進捗率を計算する関数を追加
  const calculateProgressPercentage = (schedules, date, userName, standardHours) => {
    const plannedHours = calculatePlannedWorkingHours(schedules, date, userName);
    const actualHours = calculateActualWorkingHoursForClock(schedules, date, userName);
    
    if (plannedHours <= 0) return 0;
    
    const percent = (actualHours / plannedHours) * 100;
    return Math.min(100, Math.max(0, Math.round(percent))); // 0〜100の範囲に制限
  };

  // サマリーカードの開閉状態を管理するステート（初期値はfalse=閉じた状態）
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  
  // 開閉を切り替える関数
  const toggleSummary = () => {
    setIsSummaryExpanded(prev => !prev);
  };

  // サマリーカード用の期間表示（21日〜20日）
  const getPayrollPeriod = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // 前月21日
    const startDate = new Date(year, month - 1, 21);
    
    // 当月20日
    const endDate = new Date(year, month, 20);
    
    // 年をまたぐ場合の処理
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth() + 1; // JavaScriptの月は0始まり
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth() + 1;
    
    // 年月日の形式で返す
    return `${startYear}年${startMonth}月21日〜${endYear}年${endMonth}月20日`;
  };

  // 日付リスト期間の取得（1日〜月末日）
  const getMonthPeriod = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // 月初日
    const startDate = new Date(year, month, 1);
    
    // 月末日（翌月の0日 = 当月末日）
    const endDate = new Date(year, month + 1, 0);
    
    return `${startDate.getDate()}日〜${endDate.getDate()}日`;
  };

  return (
    <>
      {/* サマリーカード - 開閉機能付き */}
      {showSummaryCard && userData && (
        <div className="bg-white rounded-lg shadow-md mb-4 overflow-hidden">
          {/* コンパクト化したヘッダー部分 */}
          <div 
            className="bg-blue-600 text-white p-2.5 cursor-pointer flex justify-between items-center"
            onClick={toggleSummary}
          >
            <div className="flex flex-col w-full">
              <div className="flex flex-col sm:flex-row sm:items-center">
                <h2 className="text-base font-semibold">
                  {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月度の勤務概要
                </h2>
                <span className="text-xs bg-blue-500 text-blue-50 px-2 py-0.5 rounded mt-1 sm:mt-0 sm:ml-2 inline-block">
                  {getPayrollPeriod(currentDate)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={`h-4 w-4 transition-transform duration-300 ${isSummaryExpanded ? 'rotate-180' : ''}`}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          
          {/* 開閉するコンテンツ部分 */}
          <div 
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isSummaryExpanded 
                ? 'max-h-[1000px] opacity-100' 
                : 'max-h-0 opacity-0'
            }`}
          >
            <div className="p-5">
              {/* グリッドレイアウトをスマホ対応に修正 */}
              <div className="grid grid-cols-1 gap-6">
                {/* 勤務時間の棒グラフ */}
                <div className="bg-gray-50 rounded-lg p-4 shadow-sm">
                  <h3 className="text-md font-medium text-gray-700 mb-2">勤務時間分析</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={[
                        {
                          name: '計画',
                          時間: parseFloat(calculatePlannedWorkingHours(userSchedules, currentDate, userData.data[0]).toFixed(1)),
                          color: '#3b82f6'
                        },
                        {
                          name: '実績',
                          時間: parseFloat(calculateActualWorkingHoursForClock(userSchedules, currentDate, userData.data[0]).toFixed(1)),
                          color: '#10b981'
                        },
                        {
                          name: '標準',
                          時間: parseFloat(standardHours?.toFixed(1) || 0),
                          color: '#6b7280'
                        }
                      ]}
                      margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis unit="h" tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value) => [`${value}時間`, '勤務時間']}
                        labelStyle={{ fontWeight: 'bold' }}
                        contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}
                      />
                      <Bar dataKey="時間" radius={[4, 4, 0, 0]}>
                        {[0, 1, 2].map((index) => (
                          <Cell key={`cell-${index}`} fill={[0, 1, 2][index] === 0 ? '#3b82f6' : [0, 1, 2][index] === 1 ? '#10b981' : '#6b7280'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  
                  <div className="mt-3 grid grid-cols-3 gap-1 text-center text-xs">
                    <div className="bg-blue-50 p-2 rounded-md">
                      <div className="font-semibold text-blue-600">計画</div>
                      <div className="text-lg mt-1">{calculatePlannedWorkingHours(userSchedules, currentDate, userData.data[0]).toFixed(1)}h</div>
                    </div>
                    <div className="bg-green-50 p-2 rounded-md">
                      <div className="font-semibold text-green-600">実績</div>
                      <div className="text-lg mt-1">{calculateActualWorkingHoursForClock(userSchedules, currentDate, userData.data[0]).toFixed(1)}h</div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-md">
                      <div className="font-semibold text-gray-600">標準</div>
                      <div className="text-lg mt-1">{standardHours?.toFixed(1) || 0}h</div>
                    </div>
                  </div>
                </div>
                
                {/* 勤務種別の円グラフ */}
                <div className="bg-gray-50 rounded-lg p-4 shadow-sm">
                  <h3 className="text-md font-medium text-gray-700 mb-2">勤務種別内訳</h3>
                  <WorkTypePieChart 
                    userSchedules={userSchedules} 
                    currentDate={currentDate} 
                    userName={userData.data[0]}
                  />
                </div>
              </div>
              
              {/* 進捗状況表示 */}
              <div className="mt-6 bg-gray-50 rounded-lg p-4 shadow-sm">
                <h3 className="text-md font-medium text-gray-700 mb-3">月間進捗状況</h3>
                <div className="relative pt-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs font-semibold inline-block text-blue-600">
                        勤務時間進捗
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-blue-600">
                        {calculateProgressPercentage(userSchedules, currentDate, userData.data[0], standardHours)}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-blue-200">
                    <div 
                      style={{ width: `${calculateProgressPercentage(userSchedules, currentDate, userData.data[0], standardHours)}%` }} 
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    今月の予定勤務時間に対する実績: {calculateActualWorkingHoursForClock(userSchedules, currentDate, userData.data[0]).toFixed(1)}h / {calculatePlannedWorkingHours(userSchedules, currentDate, userData.data[0]).toFixed(1)}h
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 閉じた状態でのサマリー表示（コンパクト版） */}
          <div 
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isSummaryExpanded 
                ? 'max-h-0 opacity-0' 
                : 'max-h-16 opacity-100 p-2'
            }`}
          >
            <div className="flex justify-between items-center text-sm">
              <div className="flex flex-wrap gap-3">
                <div className="bg-blue-50 px-2 py-1 rounded">
                  <span className="text-xs text-gray-500">計画:</span>
                  <span className="font-medium ml-1 text-blue-700">
                    {calculatePlannedWorkingHours(userSchedules, currentDate, userData.data[0]).toFixed(1)}h
                  </span>
                </div>
                <div className="bg-green-50 px-2 py-1 rounded">
                  <span className="text-xs text-gray-500">実績:</span>
                  <span className="font-medium ml-1 text-green-700">
                    {calculateActualWorkingHoursForClock(userSchedules, currentDate, userData.data[0]).toFixed(1)}h
                  </span>
                </div>
                <div className="bg-gray-50 px-2 py-1 rounded">
                  <span className="text-xs text-gray-500">標準:</span>
                  <span className="font-medium ml-1 text-gray-700">
                    {standardHours.toFixed(1)}h
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 日付リスト */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* 日付リストセクションのヘッダー - member-scheduleページに組み込み */}
        {isMemberSchedulePage && (
          <div className="bg-gray-50 p-3 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-base font-semibold text-gray-800">
                  行動予定・実績一覧
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月の日別行動記録 ({getMonthPeriod(currentDate)})
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 text-xs">
                  <span className="inline-block w-3 h-3 bg-blue-500 rounded-full"></span>
                  <span className="text-gray-600">計画</span>
                </div>
                <div className="flex items-center space-x-1 text-xs">
                  <span className="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
                  <span className="text-gray-600">実績</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {daysInMonth.map((day, dayIndex) => {
            const dateString = getLocalDateString(day);
            
            // この日付のスケジュールを抽出
            const plannedSchedule = userSchedules.find(s => 
              s[0] === dateString && s[1] === userData?.data[0] && s[5] === '予定'
            );
            const clockbookSchedule = userSchedules.find(s => 
              s[0] === dateString && s[1] === userData?.data[0] && s[5] === '出勤簿'
            );
            
            // この日付の休暇申請を確認
            const vacationStatus = getVacationStatus(day, userData?.data[0]);
            
            // この日付の業務詳細を抽出
            const dayDetails = workDetails?.filter(detail => 
              detail.date === dateString && detail.employeeName === userData?.data[0]
            );
            
            // この日付の休憩情報を抽出
            const dayBreaks = breakData?.filter(br => 
              br.date === dateString && br.employeeName === userData?.data[0]
            );
            
            // この日に何かしらのデータがあるか？
            const hasDayData = plannedSchedule || clockbookSchedule || 
                              (dayDetails && dayDetails.length > 0) || vacationStatus;
            
            // 勤務種別が休暇系かどうか
            const isPlannedLeave = plannedSchedule && isLeaveType(plannedSchedule[4]);
            const isActualLeave = clockbookSchedule && isLeaveType(clockbookSchedule[4]);
            
            // 曜日名を取得
            const dayOfWeekJP = ['日', '月', '火', '水', '木', '金', '土'][day.getDay()];
            
            // 実績の表示条件を確認
            const hasActualData = clockbookSchedule !== null;
            
            return (
              <div 
                key={dateString} 
                className={`ios-optimize rounded-lg border ${
                  isToday(day) ? 'border-blue-300 bg-blue-50/50' : 
                  isPlannedLeave || isActualLeave || vacationStatus ? 'border-purple-200 bg-purple-50/30' :
                  isWeekend(day) ? 'border-gray-200 bg-gray-50/50' : 'border-gray-100'
                }`}
              >
                <div className="p-3">
                  {/* 日付ヘッダー */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className={`ios-text text-lg font-bold mr-2 ${
                        isToday(day) ? 'text-blue-700' : 
                        day.getDay() === 0 ? 'text-red-600' : 
                        day.getDay() === 6 ? 'text-blue-600' : 'text-gray-800'
                      }`}>
                        {day.getDate()}
                      </div>
                      <div className={`ios-text text-sm ${
                        isToday(day) ? 'text-blue-600' : 
                        day.getDay() === 0 ? 'text-red-500' : 
                        day.getDay() === 6 ? 'text-blue-500' : 'text-gray-500'
                      }`}>
                        ({dayOfWeekJP})
                      </div>
                      
                      {/* 休暇の種類を表示 */}
                      {(isPlannedLeave || isActualLeave || vacationStatus) && (
                        <div className="ml-2 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-medium">
                          {(vacationStatus && vacationStatus.type) || 
                           (isActualLeave && clockbookSchedule[4]) ||
                           (isPlannedLeave && plannedSchedule[4])}
                        </div>
                      )}
                    </div>
                    
                    {isMySchedulePage && (
                      <button
                        onClick={() => onAddButtonClick(day)}
                        className="ios-optimize flex items-center text-xs font-medium px-2.5 py-1 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-full transition-colors border border-blue-600 active:translate-y-0.5 shadow-sm"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-0.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        追加
                      </button>
                    )}
                  </div>
        
                  {/* スケジュールコンテンツ */}
                  {hasDayData ? (
                    <div className="space-y-3">
                      {/* 公休・有休の場合は大きく表示 */}
                      {(isPlannedLeave || isActualLeave || (vacationStatus && vacationStatus.type)) && (
                        <div className="ios-optimize bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-center justify-center">
                          <span className="ios-text text-xl font-bold text-purple-700">
                            {(vacationStatus && vacationStatus.type) || 
                             (isActualLeave && clockbookSchedule[4]) ||
                             (isPlannedLeave && plannedSchedule[4]) || 
                             '休暇'}
                          </span>
                        </div>
                      )}
              
                      {/* 予定の表示（休暇でない場合、かつ実績がない場合のみ） */}
                      {plannedSchedule && !isPlannedLeave && !clockbookSchedule && (
                        <div className="ios-optimize rounded-lg border border-blue-200 bg-blue-50 p-3 shadow-sm">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="ios-text px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                              予定: {plannedSchedule[4]}
                            </span>
                            {plannedSchedule[6] && (
                              <span className="ios-text text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-lg border border-blue-200">
                                {plannedSchedule[6]}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <div className="flex-1">
                              {plannedSchedule[2] && plannedSchedule[3] ? (
                                <div className="flex items-center">
                                  <span className={`ios-text ${getWorkTypeStyle(plannedSchedule[4]).text}`}>
                                    {plannedSchedule[2]} - {plannedSchedule[3]}
                                  </span>
                                </div>
                              ) : (
                                <div className="text-gray-400">時間未設定</div>
                              )}
                            </div>
                                </div>
                              </div>
                      )}
                      
                      {/* 実績の表示（休暇でない場合） */}
                      {clockbookSchedule && !isActualLeave && (
                        <div className="ios-optimize rounded-lg border border-green-200 bg-green-50 p-3 shadow-sm">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="ios-text px-2.5 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                              実績: {clockbookSchedule[4]}
                            </span>
                            {clockbookSchedule[6] && (
                              <span className="ios-text text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-lg border border-green-200">
                                {clockbookSchedule[6]}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <div className="flex-1">
                              {clockbookSchedule[2] && clockbookSchedule[3] ? (
                                <div className="flex items-center">
                                  <span className="ios-text text-green-700">
                                    {clockbookSchedule[2]} - {clockbookSchedule[3]}
                                  </span>
                                </div>
                              ) : (
                                <div className="text-gray-400">時間未設定</div>
                              )}
                            </div>
                            
                            {/* 休憩時間の表示 - よりコンパクトで控えめなデザイン */}
                            {dayBreaks && dayBreaks.length > 0 && (
                              <div className="mt-2 flex items-center text-xs text-gray-500 bg-gray-50 rounded-md px-2 py-1 border border-gray-200">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 text-gray-400 mr-1 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                                <span className="font-medium mr-1 flex-shrink-0">休憩:</span>
                                
                                {dayBreaks.length <= 2 ? (
                                  // 休憩が2つ以下の場合はインラインで表示
                                  <span className="truncate">
                                    {dayBreaks.map((brk, i) => (
                                      <span key={i} className="whitespace-nowrap">
                                        {brk.breakStart}-{brk.breakEnd}
                                        {i < dayBreaks.length - 1 ? ', ' : ''}
                                      </span>
                                    ))}
                                  </span>
                                ) : (
                                  // 休憩が3つ以上の場合は件数と合計時間を表示
                                  <span>
                                    {dayBreaks.length}件 (合計: {calculateTotalBreakTime(dayBreaks)})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
              
                      {/* 業務詳細の表示（予定/実績に関わらず表示） - 落ち着いたおしゃれなデザイン */}
                      {dayDetails && dayDetails.length > 0 && (
                        <div className="mt-4">
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center">
                              <span className="ios-text px-3 py-1 rounded-full bg-gray-200 text-gray-700 text-xs font-medium">
                                業務詳細
                              </span>
                            </div>
                            <span className="text-xs text-gray-400">{dayDetails.length}件</span>
                          </div>
                          <div className="space-y-2.5">
                            {dayDetails.map((detail, idx) => {
                              // 業務内容に基づいて色を決定（バリエーションを増やす）- より落ち着いた色合い
                              const colorIndex = Math.abs(detail.workTitle.charCodeAt(0) % 5);
                              const colorClasses = [
                                { bg: 'from-blue-200 to-blue-100', shadow: 'shadow-sm', hover: 'from-blue-300 to-blue-200', text: 'text-blue-600' },
                                { bg: 'from-purple-200 to-purple-100', shadow: 'shadow-sm', hover: 'from-purple-300 to-purple-200', text: 'text-purple-600' },
                                { bg: 'from-amber-200 to-amber-100', shadow: 'shadow-sm', hover: 'from-amber-300 to-amber-200', text: 'text-amber-600' },
                                { bg: 'from-emerald-200 to-emerald-100', shadow: 'shadow-sm', hover: 'from-emerald-300 to-emerald-200', text: 'text-emerald-600' },
                                { bg: 'from-indigo-200 to-indigo-100', shadow: 'shadow-sm', hover: 'from-indigo-300 to-indigo-200', text: 'text-indigo-600' },
                              ][colorIndex];
                              
                              return (
                              <div 
                                key={idx} 
                                  className={`ios-optimize group rounded-lg p-0.5 bg-gradient-to-r ${colorClasses.bg} hover:${colorClasses.hover} transition-all duration-200 transform hover:scale-[1.005] active:scale-[0.995] cursor-pointer ${colorClasses.shadow}`}
                                  onClick={() => onWorkDetailClick(detail)}
                                >
                                  <div className="bg-white rounded-lg p-3 h-full">
                                    <div className="flex flex-col">
                                      <div className="flex items-center justify-between mb-1.5">
                                        <h4 className={`ios-text text-sm font-medium truncate group-hover:${colorClasses.text} transition-colors duration-200 flex-1`}>
                                          {detail.workTitle}
                                        </h4>
                                        <div className="flex-shrink-0 ml-2">
                                          <span className="ios-text px-2 py-0.5 text-xs font-medium bg-white rounded-md whitespace-nowrap transition-colors duration-200 border border-gray-100 text-gray-500">
                                            {detail.workStart}-{detail.workEnd}
                                          </span>
                                        </div>
                                      </div>
                                      
                                      {detail.detail && (
                                        <div className="relative overflow-hidden">
                                          <p className="ios-text text-xs text-gray-500 line-clamp-1 group-hover:line-clamp-2 transition-all duration-300">
                                          {detail.detail}
                                        </p>
                                          <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-t from-white to-transparent group-hover:opacity-0 transition-opacity duration-200"></div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="ios-text text-center text-gray-400 p-3 mt-2 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                      {isMySchedulePage ? "予定がありません。「追加」から登録できます。" : "予定がありません。"}
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

// 勤務種別の円グラフコンポーネントを修正
function WorkTypePieChart({ userSchedules, currentDate, userName }) {
  // 勤務種別ごとのデータを集計
  const workTypeData = React.useMemo(() => {
    const typeCount = {};
    
    userSchedules.forEach(schedule => {
      const scheduleDate = new Date(schedule[0]);
      const month = scheduleDate.getMonth();
      const year = scheduleDate.getFullYear();
      
      if (month === currentDate.getMonth() && year === currentDate.getFullYear() && schedule[1] === userName) {
        const workType = schedule[4] || '未設定';
        typeCount[workType] = (typeCount[workType] || 0) + 1;
      }
    });
    
    const colors = {
      '出勤': '#3b82f6',
      '在宅': '#10b981',
      '休暇': '#8b5cf6',
      '公休': '#6b7280',
      '有給休暇': '#f59e0b',
      '半休': '#ec4899',
      '移動': '#ef4444',
      '未設定': '#9ca3af'
    };
    
    return Object.entries(typeCount).map(([type, count]) => ({
      name: type,
      value: count,
      fill: colors[type] || '#9ca3af'
    }));
  }, [userSchedules, currentDate, userName]);
  
  return (
    <div style={{ width: '100%' }} className="h-auto">
      {workTypeData.length > 0 ? (
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={workTypeData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                label={false}
                labelLine={false}
              >
                {workTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`${value}日`, '日数']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex items-center justify-center h-[180px] text-gray-400">
          データがありません
        </div>
      )}
      
      {/* 凡例部分を改善 - より見やすく */}
      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2 text-xs">
        {workTypeData.map((entry, index) => (
          <div key={index} className="flex items-center bg-white px-2 py-1 rounded-md shadow-sm">
            <div className="w-3 h-3 rounded-full mr-1.5 flex-shrink-0" style={{ backgroundColor: entry.fill }}></div>
            <span className="truncate font-medium">{entry.name}</span>
            <span className="ml-auto text-gray-600">{entry.value}日</span>
          </div>
        ))}
      </div>
    </div>
  );
} 