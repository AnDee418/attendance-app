// pages/index.js
import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { UserCircleIcon } from '@heroicons/react/24/outline';

// ヘルパー関数: "HH:MM" を分に変換
const timeToMinutes = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

// ヘルパー関数: 分を時間に変換（小数点1桁）
const minutesToHours = (min) => (min / 60).toFixed(1);

// ヘルパー関数: Date を "YYYY-MM-DD" (en-CA) 形式に変換
const getLocalDateString = (date) => date.toLocaleDateString('en-CA');

// 新しいヘルパー関数を追加
const getProgressColor = (hours) => {
  if (hours >= 160) return 'bg-green-500';
  if (hours >= 120) return 'bg-blue-500';
  return 'bg-blue-400';
};

// ユーザーアイコンの表示コンポーネント
const UserAvatar = ({ user }) => {
  return user?.iconUrl ? (
    <img
      src={user.iconUrl}
      alt={user.name}
      className="w-12 h-12 rounded-full object-cover"
      onError={(e) => {
        console.error('Image load error:', e);
        e.target.src = ''; // エラー時はデフォルトアイコンを表示
        e.target.onerror = null;
      }}
    />
  ) : (
    <UserCircleIcon className="h-12 w-12 text-gray-400" />
  );
};

export default function HomePage() {
  const { data: session, status } = useSession();
  const [attendanceData, setAttendanceData] = useState([]);
  const [breakData, setBreakData] = useState([]);
  const [workDetailData, setWorkDetailData] = useState([]);

  const [totalWorkingHours, setTotalWorkingHours] = useState(0);
  const [workTypeCounts, setWorkTypeCounts] = useState({});

  const [todayWorkDetail, setTodayWorkDetail] = useState([]);
  const [weekWorkDetail, setWeekWorkDetail] = useState({});

  // 今日の業務詳細と勤務時間
  const [todayScheduledTime, setTodayScheduledTime] = useState({ start: '', end: '' });

  // 強制再レンダリング用のstate
  const [forceUpdate, setForceUpdate] = useState(false);

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
            const userRecords = records.filter(rec => rec.employeeName === session.user.name);
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
            const userRecords = records.filter(rec => rec.employeeName === session.user.name);
            setBreakData(userRecords);
          }
        });
      fetch('/api/workdetail')
        .then(res => res.json())
        .then(data => {
          if (data.data) {
            const records = data.data.map(row => ({
              date: row[0],
              employeeName: row[1],
              workTitle: row[2],
              workStart: row[3],
              workEnd: row[4],
              detail: row[5],
            }));
            const userRecords = records.filter(rec => rec.employeeName === session.user.name);
            setWorkDetailData(userRecords);
          }
        });

      // セッション情報にアイコンURLを追加
      fetch('/api/users')
        .then(res => res.json())
        .then(data => {
          if (data.data) {
            // ログインユーザーの情報を検索（新しいデータ構造に対応）
            const userInfo = data.data.find(user => user.data[1] === session.user.userId);
            if (userInfo && userInfo.data[6]) {
              // セッション情報にアイコンURLを追加
              session.user.iconUrl = userInfo.data[6];
              // 強制的に再レンダリング
              setForceUpdate(prev => !prev);
            }
          }
        })
        .catch(error => console.error('Error fetching user info:', error));
    } else if (status === 'unauthenticated') {
      signIn();
    }
  }, [status, session]);

  // 今日の業務詳細と勤務時間
  useEffect(() => {
    const todayStr = getLocalDateString(new Date());
    const todays = workDetailData.filter(rec => rec.date === todayStr);
    setTodayWorkDetail(todays);

    // 今日の勤務予定時間を取得
    const todayAttendance = attendanceData.find(rec => rec.date === todayStr && rec.recordType === '予定');
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
      const recDate = new Date(rec.date);
      if (recDate >= monday && recDate <= new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000)) {
        const dayName = recDate.toLocaleDateString('ja-JP', { weekday: 'short' });
        const dateStr = getLocalDateString(recDate);
        const key = `${dayName} (${dateStr})`;
        if (weekDetail[key]) {
          weekDetail[key].push(rec);
        }
      }
    });
    setWeekWorkDetail(weekDetail);
  }, [workDetailData]);

  // 給与期間（21日始まり20日締め）のラベル生成
  function payrollPeriodLabel() {
    const today = new Date();
    let payrollStart, payrollEnd;
    if (today.getDate() >= 21) {
      payrollStart = new Date(today.getFullYear(), today.getMonth(), 21);
      payrollEnd = new Date(today.getFullYear(), today.getMonth() + 1, 20);
    } else {
      payrollStart = new Date(today.getFullYear(), today.getMonth() - 1, 21);
      payrollEnd = new Date(today.getFullYear(), today.getMonth(), 20);
    }
    return `${getLocalDateString(payrollStart)} ～ ${getLocalDateString(payrollEnd)}`;
  }

  // 勤務時間と勤務種別内訳の計算（給与期間内のみ）
  useEffect(() => {
    if (attendanceData.length === 0) return;
    const today = new Date();
    let payrollStart, payrollEnd;
    if (today.getDate() >= 21) {
      payrollStart = new Date(today.getFullYear(), today.getMonth(), 21);
      payrollEnd = new Date(today.getFullYear(), today.getMonth() + 1, 20);
    } else {
      payrollStart = new Date(today.getFullYear(), today.getMonth() - 1, 21);
      payrollEnd = new Date(today.getFullYear(), today.getMonth(), 20);
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

  if (status === 'loading') return <div className="p-4 text-center">Loading...</div>;
  if (!session) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-3">
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
        <h2 className="text-base font-semibold text-gray-600 mb-2">勤務時間</h2>
        <p className="text-xs text-gray-500 mb-3">{payrollPeriodLabel()}</p>
        
        {/* 円形プログレスバーと時間表示 */}
        <div className="flex items-center justify-between mb-6">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              {/* 背景の円 */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#eee"
                strokeWidth="10"
              />
              {/* プログレスバー */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#3B82F6"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${Math.min((totalWorkingHours / 160) * 283, 283)} 283`}
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-blue-600">{totalWorkingHours}</span>
              <span className="text-sm text-gray-600">時間</span>
            </div>
          </div>
          
          {/* 月間目標 */}
          <div className="flex-1 ml-6">
            <div className="mb-2">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>月間目標</span>
                <span>{totalWorkingHours}/160 時間</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getProgressColor(totalWorkingHours)} transition-all duration-300`}
                  style={{ width: `${Math.min((totalWorkingHours / 160) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* 勤務種別内訳 */}
        <div className="border-t pt-3">
          <h3 className="text-sm font-medium text-gray-600 mb-2">勤務種別</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(workTypeCounts)
              .filter(([type]) => type !== 'undefined' && type !== undefined)
              .map(([type, count]) => (
                <div key={type} className="px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100 flex items-center">
                  <span className="text-sm text-gray-600">{type}</span>
                  <div className="w-px h-3 bg-gray-200 mx-2"></div>
                  <span className="text-sm font-medium text-blue-600">{count}回</span>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* 今日の業務詳細セクション */}
      <section className="bg-white rounded-2xl shadow-lg p-4 mb-4">
        <h2 className="text-base font-semibold text-gray-600 mb-3">今日の業務</h2>
        
        {/* 勤務予定時間 */}
        <div className="mb-4 flex items-center justify-between bg-gray-50 rounded-xl p-3">
          <div className="flex items-center">
            <div className="w-1.5 h-8 bg-blue-400 rounded-full mr-3"></div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">勤務予定時間</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  {todayScheduledTime.start || '--:--'}
                </span>
                <span className="text-gray-400">→</span>
                <span className="text-sm font-medium text-gray-700">
                  {todayScheduledTime.end || '--:--'}
                </span>
              </div>
            </div>
          </div>
          <div className="px-3 py-1 bg-blue-50 rounded-full">
            <span className="text-xs text-blue-600">
              {todayScheduledTime.start && todayScheduledTime.end ? 
                `${Math.round((timeToMinutes(todayScheduledTime.end) - timeToMinutes(todayScheduledTime.start)) / 60)}時間` : 
                '未設定'}
            </span>
          </div>
        </div>

        {/* 業務詳細リスト */}
        {todayWorkDetail.length > 0 ? (
          <div className="space-y-3">
            {todayWorkDetail.map((detail, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">{detail.workTitle}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-600">
                    {detail.workStart} - {detail.workEnd}
                  </span>
                </div>
                {detail.detail && (
                  <div className="mt-2 pl-2 border-l-2 border-gray-200">
                    <p className="text-sm text-gray-500 line-clamp-2">{detail.detail}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">業務詳細はありません</p>
        )}
      </section>

      {/* 今週の業務詳細セクション */}
      <section className="bg-white rounded-2xl shadow-lg p-4">
        <h2 className="text-base font-semibold text-gray-600 mb-3">今週の業務</h2>
        {Object.keys(weekWorkDetail).length > 0 ? (
          <div className="space-y-3">
            {Object.entries(weekWorkDetail).map(([dayDate, details]) => {
              // 今日の日付かどうかを判定
              const isToday = dayDate.includes(getLocalDateString(new Date()));
              return (
                <div key={dayDate} className={`border-l-4 rounded-r-lg pl-4 pb-3 last:pb-0 ${
                  isToday ? 'border-blue-400 bg-blue-50' :
                  dayDate.includes('土') ? 'border-indigo-300 bg-indigo-50' :
                  dayDate.includes('日') ? 'border-rose-300 bg-rose-50' :
                  'border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors'
                }`}>
                  <h3 className="text-sm font-medium mb-2 flex items-center py-2">
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
                  </h3>
                  {details.length > 0 ? (
                    <div className="space-y-2">
                      {details.map((detail, idx) => (
                        <div key={idx} className={`rounded-lg p-3 ${
                          isToday ? 'bg-white shadow-sm' : 'bg-white/80'
                        }`}>
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-700">
                                {detail.workTitle}
                              </span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              isToday ? 'bg-blue-100 text-blue-600' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {detail.workStart}-{detail.workEnd}
                            </span>
                          </div>
                          {detail.detail && (
                            <div className="mt-2 pl-2 border-l-2 border-gray-200">
                              <p className="text-xs text-gray-500 line-clamp-2">
                                {detail.detail}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic pl-8">予定なし</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">業務詳細はありません</p>
        )}
      </section>
    </div>
  );
}
