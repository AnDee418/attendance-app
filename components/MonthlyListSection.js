import React from 'react';
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
  getLocalDateString
}) {
  const router = useRouter();
  const isMySchedulePage = router.pathname.includes('my-schedule');

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg p-4">
        <div className="space-y-3">
          {getDaysInMonth(currentDate).map(date => {
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
              console.log('Comparing dates:', {
                recDate,
                targetDate,
                employeeName: rec.employeeName,
                userData: userData?.data[0],
                recordType: rec.recordType
              });
              return (
                userData &&
                rec.employeeName === userData.data[0] &&
                recDate === targetDate &&
                rec.recordType === '予定'
              );
            });
            
            console.log(`Details for ${getLocalDateString(date)}:`, dayDetails);
            
            // 該当日の出退勤の予定レコードを取得
            const attendanceRecordForDate = userSchedules.find(s => 
              new Date(s[0]).toDateString() === date.toDateString() && 
              s[5] === '予定'
            );
            
            // 該当日の休憩記録を取得
            const breakRecordsForDate = breakData.filter(br => 
              new Date(br.date).toDateString() === date.toDateString() &&
              br.recordType === '予定'
            );
            
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
                  </div>
                </div>
        
                <div className="px-4 py-3 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-white bg-opacity-75 backdrop-blur-sm rounded-xl p-3 shadow-sm hover:shadow transition-all duration-300">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-6 h-6 rounded-lg bg-blue-400 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700">勤務時間</span>
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
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-400 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700">休憩時間</span>
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
          
                  {dayDetails.length > 0 && (
                    <div className="bg-white bg-opacity-75 backdrop-blur-sm rounded-xl p-3 shadow-sm">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-6 h-6 rounded-lg bg-purple-400 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-700">業務詳細</span>
                      </div>
                      <div className="space-y-2">
                        {dayDetails.map((detail, idx) => (
                          <div key={idx} className="group bg-gray-50 hover:bg-blue-50 rounded-lg p-2.5 transition-all duration-300">
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
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
} 