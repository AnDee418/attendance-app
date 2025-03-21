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

// iOS向け最適化クラスを追加
const IOS_OPTIMIZE_CLASS = "transform translate3d(0,0,0) backface-visibility-hidden";
const IOS_TEXT_CLASS = "translate3d(0,0,0)";

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

  // 過去の日付かどうかを判定する関数を追加
  const isPastDate = (date) => {
    return date < today && !isToday(date);
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

  const getVacationStatus = (date, employeeName) => {
    if (!vacationRequests || !vacationRequests.data) return null;
    
    const dateStr = getLocalDateString(date);
    const request = vacationRequests.data.find(r => 
      r.date === dateStr && 
      r.employeeName === employeeName
    );
    
    return request;
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
      {/* 日付リスト */}
      <div className={`bg-white rounded-lg shadow-sm overflow-hidden ${IOS_OPTIMIZE_CLASS}`}>
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
            
            // この日付の業務詳細を抽出し、予定と実績に分ける
            const plannedDetails = workDetails?.filter(detail => 
              detail && detail.date === dateString && 
              detail.employeeName === userData?.data[0] && 
              detail.recordType === '予定'
            ) || [];
            
            const clockbookDetails = workDetails?.filter(detail => 
              detail && detail.date === dateString && 
              detail.employeeName === userData?.data[0] && 
              detail.recordType === '出勤簿'
            ) || [];
            
            // この日付の休憩情報を抽出 - 予定/実績に応じて取得
            const plannedBreaks = breakData?.filter(br => 
              br.date === dateString && 
              br.employeeName === userData?.data[0] && 
              br.recordType === '予定'
            ) || [];
            
            const clockbookBreaks = breakData?.filter(br => 
              br.date === dateString && 
              br.employeeName === userData?.data[0] && 
              br.recordType === '出勤簿'
            ) || [];
            
            // この日に何かしらのデータがあるか？
            const hasDayData = plannedSchedule || clockbookSchedule || 
                              plannedDetails.length > 0 || clockbookDetails.length > 0 || 
                              plannedBreaks.length > 0 || clockbookBreaks.length > 0 || 
                              vacationStatus;
            
            // 勤務種別が休暇系かどうか
            const isPlannedLeave = plannedSchedule && isLeaveType(plannedSchedule[4]);
            const isActualLeave = clockbookSchedule && isLeaveType(clockbookSchedule[4]);
            
            // 未報告状態を判定
            const isUnreported = (isPastDate(day) || isToday(day)) && // 今日以前の日付
                              (!clockbookSchedule); // 実績報告がない
            
            // 曜日名を取得
            const dayOfWeekJP = ['日', '月', '火', '水', '木', '金', '土'][day.getDay()];
            
            // 実績の表示条件を確認
            const hasActualData = clockbookSchedule !== null;
            
            return (
              <div 
                key={dateString} 
                className={`${IOS_OPTIMIZE_CLASS} rounded-lg border ${
                  isToday(day) ? 'border-blue-300 bg-blue-50/50' : 
                  isPlannedLeave || isActualLeave || vacationStatus ? 'border-purple-200 bg-purple-50/30' :
                  isUnreported ? 'border-red-300 bg-red-50/30' : // 未報告の場合のスタイル
                  isWeekend(day) ? 'border-gray-200 bg-gray-50/50' : 'border-gray-100'
                }`}
              >
                <div className="p-3">
                  {/* 日付ヘッダー */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className={`${IOS_TEXT_CLASS} text-lg font-bold mr-2 ${
                        isToday(day) ? 'text-blue-700' : 
                        day.getDay() === 0 ? 'text-red-600' : 
                        day.getDay() === 6 ? 'text-blue-600' : 'text-gray-800'
                      }`}>
                        {day.getDate()}
                      </div>
                      <div className={`${IOS_TEXT_CLASS} text-sm ${
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
                        className={`${IOS_OPTIMIZE_CLASS} flex items-center text-xs font-medium px-2.5 py-1 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-full transition-colors border border-blue-600 active:translate-y-0.5 shadow-sm`}
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
                      {/* 未報告表示 */}
                      {isUnreported && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span className="text-sm font-medium text-red-600">未報告</span>
                        </div>
                      )}
              
                      {/* 公休・有休の場合は大きく表示 */}
                      {(isPlannedLeave || isActualLeave || (vacationStatus && vacationStatus.type)) && (
                        <div className={`${IOS_OPTIMIZE_CLASS} bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-center justify-center`}>
                          <span className={`${IOS_TEXT_CLASS} text-xl font-bold text-purple-700`}>
                            {(vacationStatus && vacationStatus.type) || 
                             (isActualLeave && clockbookSchedule[4]) ||
                             (isPlannedLeave && plannedSchedule[4]) || 
                             '休暇'}
                          </span>
                        </div>
                      )}
              
                      {/* 予定の表示（休暇でない場合、かつ実績がない場合のみ） */}
                      {plannedSchedule && !isPlannedLeave && !clockbookSchedule && (
                        <div className={`${IOS_OPTIMIZE_CLASS} rounded-lg border border-blue-200 bg-blue-50 p-3 shadow-sm`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`${IOS_TEXT_CLASS} px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium`}>
                              予定: {plannedSchedule[4]}
                            </span>
                            {plannedSchedule[6] && (
                              <span className={`${IOS_TEXT_CLASS} text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-lg border border-blue-200`}>
                                {plannedSchedule[6]}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <div className="flex-1">
                              {plannedSchedule[2] && plannedSchedule[3] ? (
                                <div className="flex items-center">
                                  <span className={`${IOS_TEXT_CLASS} ${getWorkTypeStyle(plannedSchedule[4]).text}`}>
                                    {plannedSchedule[2]} - {plannedSchedule[3]}
                                  </span>
                                </div>
                              ) : (
                                <div className="text-gray-400">時間未設定</div>
                              )}
                            </div>
                            
                            {/* 予定の休憩時間を表示 - 青系デザイン */}
                            {plannedBreaks && plannedBreaks.length > 0 && (
                              <div className="mt-2 flex items-center text-xs text-blue-600 bg-blue-50 rounded-md px-2 py-1 border border-blue-200">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 text-blue-500 mr-1 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                                <span className="font-medium mr-1 flex-shrink-0">予定休憩:</span>
                                
                                {plannedBreaks.length <= 2 ? (
                                  // 休憩が2つ以下の場合はインラインで表示
                                  <span className="truncate">
                                    {plannedBreaks.map((br, i) => (
                                      <span key={i} className="whitespace-nowrap text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded mx-0.5">
                                        {br.breakStart}-{br.breakEnd}
                                        {i < plannedBreaks.length - 1 ? '' : ''}
                                      </span>
                                    ))}
                                  </span>
                                ) : (
                                  // 休憩が3つ以上の場合は件数と合計時間を表示
                                  <span className="bg-blue-100 px-1.5 py-0.5 rounded text-blue-700">
                                    {plannedBreaks.length}件 (合計: {calculateTotalBreakTime(plannedBreaks)})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* 実績の表示（休暇でない場合） */}
                      {clockbookSchedule && !isActualLeave && (
                        <div className={`${IOS_OPTIMIZE_CLASS} rounded-lg border border-green-200 bg-green-50 p-3 shadow-sm`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`${IOS_TEXT_CLASS} px-2.5 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium`}>
                              実績: {clockbookSchedule[4]}
                            </span>
                            {clockbookSchedule[6] && (
                              <span className={`${IOS_TEXT_CLASS} text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-lg border border-green-200`}>
                                {clockbookSchedule[6]}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <div className="flex-1">
                              {clockbookSchedule[2] && clockbookSchedule[3] ? (
                                <div className="flex items-center">
                                  <span className={`${IOS_TEXT_CLASS} text-green-700`}>
                                    {clockbookSchedule[2]} - {clockbookSchedule[3]}
                                  </span>
                                </div>
                              ) : (
                                <div className="text-gray-400">時間未設定</div>
                              )}
                            </div>
                            
                            {/* 実績の休憩時間を表示 - 緑系デザイン */}
                            {clockbookBreaks && clockbookBreaks.length > 0 && (
                              <div className="mt-2 flex items-center text-xs text-green-600 bg-green-50 rounded-md px-2 py-1 border border-green-200">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 text-green-500 mr-1 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                                <span className="font-medium mr-1 flex-shrink-0">実績休憩:</span>
                                
                                {clockbookBreaks.length <= 2 ? (
                                  // 休憩が2つ以下の場合はインラインで表示
                                  <span className="truncate">
                                    {clockbookBreaks.map((br, i) => (
                                      <span key={i} className="whitespace-nowrap text-green-700 bg-green-100 px-1.5 py-0.5 rounded mx-0.5">
                                        {br.breakStart}-{br.breakEnd}
                                        {i < clockbookBreaks.length - 1 ? '' : ''}
                                      </span>
                                    ))}
                                  </span>
                                ) : (
                                  // 休憩が3つ以上の場合は件数と合計時間を表示
                                  <span className="bg-green-100 px-1.5 py-0.5 rounded text-green-700">
                                    {clockbookBreaks.length}件 (合計: {calculateTotalBreakTime(clockbookBreaks)})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
              
                      {/* 業務詳細の表示（予定のみ） */}
                      {plannedDetails && plannedDetails.length > 0 && (
                        <div className="mt-4">
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center">
                              <span className={`${IOS_TEXT_CLASS} px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium`}>
                                予定業務詳細
                              </span>
                            </div>
                            <span className="text-xs text-gray-400">{plannedDetails.length}件</span>
                          </div>
                          <div className="space-y-2.5">
                            {plannedDetails.map((detail, idx) => {
                              // nullチェックを追加
                              if (!detail || !detail.workTitle) {
                                return null; // 無効なデータは描画しない
                              }
                              
                              // 業務内容に基づいて色を決定（バリエーションを増やす）- より落ち着いた色合い
                              const colorIndex = Math.abs((detail.workTitle.charCodeAt(0) || 0) % 5);
                              const colorClasses = [
                                { bg: 'from-blue-200 to-blue-100', shadow: 'shadow-sm', hover: 'from-blue-300 to-blue-200', text: 'text-blue-600' },
                                { bg: 'from-purple-200 to-purple-100', shadow: 'shadow-sm', hover: 'from-purple-300 to-purple-200', text: 'text-purple-600' },
                                { bg: 'from-amber-200 to-amber-100', shadow: 'shadow-sm', hover: 'from-amber-300 to-amber-200', text: 'text-amber-600' },
                                { bg: 'from-emerald-200 to-emerald-100', shadow: 'shadow-sm', hover: 'from-emerald-300 to-emerald-200', text: 'text-emerald-600' },
                                { bg: 'from-indigo-200 to-indigo-100', shadow: 'shadow-sm', hover: 'from-indigo-300 to-indigo-200', text: 'text-indigo-600' },
                              ][colorIndex] || { bg: 'from-gray-200 to-gray-100', shadow: 'shadow-sm', hover: 'from-gray-300 to-gray-200', text: 'text-gray-600' };  // デフォルト値を追加
                              
                              return (
                              <div 
                                key={idx} 
                                  className={`${IOS_OPTIMIZE_CLASS} group rounded-lg p-0.5 bg-gradient-to-r ${colorClasses.bg} hover:${colorClasses.hover} transition-all duration-200 transform hover:scale-[1.005] active:scale-[0.995] cursor-pointer ${colorClasses.shadow}`}
                                  onClick={() => onWorkDetailClick(detail)}
                                >
                                  <div className="bg-white rounded-lg p-3 h-full">
                                    <div className="flex flex-col">
                                      <div className="flex items-center justify-between mb-1.5">
                                        <h4 className={`${IOS_TEXT_CLASS} text-sm font-medium truncate group-hover:${colorClasses.text} transition-colors duration-200 flex-1`}>
                                          {detail.workTitle}
                                        </h4>
                                        <div className="flex-shrink-0 ml-2">
                                          <span className={`${IOS_TEXT_CLASS} px-2 py-0.5 text-xs font-medium bg-white rounded-md whitespace-nowrap transition-colors duration-200 border border-gray-100 text-gray-500`}>
                                            {detail.workStart}-{detail.workEnd}
                                          </span>
                                        </div>
                                      </div>
                                      
                                      {detail.detail && (
                                        <div className="relative overflow-hidden">
                                          <p className={`${IOS_TEXT_CLASS} text-xs text-gray-500 line-clamp-1 group-hover:line-clamp-2 transition-all duration-300`}>
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
                      
                      {/* 実績業務詳細の表示 */}
                      {clockbookDetails && clockbookDetails.length > 0 && (
                        <div className="mt-4">
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center">
                              <span className={`${IOS_TEXT_CLASS} px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium`}>
                                実績業務詳細
                              </span>
                            </div>
                            <span className="text-xs text-gray-400">{clockbookDetails.length}件</span>
                          </div>
                          <div className="space-y-2.5">
                            {clockbookDetails.map((detail, idx) => {
                              // nullチェックを追加
                              if (!detail || !detail.workTitle) {
                                return null; // 無効なデータは描画しない
                              }
                              
                              // 業務内容に基づいて色を決定 - 実績用の緑系統の色
                              const colorIndex = Math.abs((detail.workTitle.charCodeAt(0) || 0) % 4);
                              const colorClasses = [
                                { bg: 'from-green-200 to-green-100', shadow: 'shadow-sm', hover: 'from-green-300 to-green-200', text: 'text-green-600' },
                                { bg: 'from-emerald-200 to-emerald-100', shadow: 'shadow-sm', hover: 'from-emerald-300 to-emerald-200', text: 'text-emerald-600' },
                                { bg: 'from-teal-200 to-teal-100', shadow: 'shadow-sm', hover: 'from-teal-300 to-teal-200', text: 'text-teal-600' },
                                { bg: 'from-lime-200 to-lime-100', shadow: 'shadow-sm', hover: 'from-lime-300 to-lime-200', text: 'text-lime-600' },
                              ][colorIndex] || { bg: 'from-green-200 to-green-100', shadow: 'shadow-sm', hover: 'from-green-300 to-green-200', text: 'text-green-600' };
                              
                              return (
                              <div 
                                key={idx} 
                                  className={`${IOS_OPTIMIZE_CLASS} group rounded-lg p-0.5 bg-gradient-to-r ${colorClasses.bg} hover:${colorClasses.hover} transition-all duration-200 transform hover:scale-[1.005] active:scale-[0.995] cursor-pointer ${colorClasses.shadow}`}
                                  onClick={() => onWorkDetailClick(detail)}
                                >
                                  <div className="bg-white rounded-lg p-3 h-full">
                                    <div className="flex flex-col">
                                      <div className="flex items-center justify-between mb-1.5">
                                        <h4 className={`${IOS_TEXT_CLASS} text-sm font-medium truncate group-hover:${colorClasses.text} transition-colors duration-200 flex-1`}>
                                          {detail.workTitle}
                                        </h4>
                                        <div className="flex-shrink-0 ml-2">
                                          <span className={`${IOS_TEXT_CLASS} px-2 py-0.5 text-xs font-medium bg-white rounded-md whitespace-nowrap transition-colors duration-200 border border-gray-100 text-gray-500`}>
                                            {detail.workStart}-{detail.workEnd}
                                          </span>
                                        </div>
                                      </div>
                                      
                                      {detail.detail && (
                                        <div className="relative overflow-hidden">
                                          <p className={`${IOS_TEXT_CLASS} text-xs text-gray-500 line-clamp-1 group-hover:line-clamp-2 transition-all duration-300`}>
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
                    <div className={`${IOS_TEXT_CLASS} text-center text-gray-400 p-3 mt-2 bg-gray-50 rounded-lg border border-dashed border-gray-200`}>
                      {isMySchedulePage ? "予定がありません。「追加」から登録できます。" : "予定がありません。"}
                      {/* 何もデータがない場合の未報告表示 */}
                      {isUnreported && (
                        <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span className="text-sm font-medium text-red-600">未報告</span>
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
  // 比較関数を強化して不要な再レンダリングを防止
  if (prevProps.currentDate.getTime() === nextProps.currentDate.getTime() &&
      JSON.stringify(prevProps.userData) === JSON.stringify(nextProps.userData) &&
      prevProps.userSchedules.length === nextProps.userSchedules.length &&
      prevProps.workDetails?.length === nextProps.workDetails?.length &&
      prevProps.breakData?.length === nextProps.breakData?.length) {
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
    
    // デフォルトの色マップを定義（未知のタイプにもフォールバック値を持つように）
    const colors = {
      '出勤': '#3b82f6',
      '在宅': '#10b981',
      '休暇': '#8b5cf6',
      '公休': '#6b7280',
      '有給休暇': '#f59e0b',
      '半休': '#ec4899',
      '移動': '#ef4444',
      '未設定': '#9ca3af',
      'default': '#9ca3af'  // デフォルト色を追加
    };
    
    // nullやundefinedなど異常値のチェックも追加
    return Object.entries(typeCount)
      .filter(([type, count]) => type && count) // 無効なデータをフィルタリング
      .map(([type, count]) => ({
        name: type || '未設定',
        value: count || 0,
        fill: colors[type] || colors['default']
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