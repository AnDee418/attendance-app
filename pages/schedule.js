// pages/schedule.js
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

// 自作タイルカレンダーコンポーネント（前月・翌月移動対応）
function TileCalendar({ displayDate, selectedDate, onDateSelect, onMonthChange }) {
  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
  const year = displayDate.getFullYear();
  const month = displayDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const tiles = [];
  for (let i = 0; i < firstDay; i++) {
    tiles.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    tiles.push(new Date(year, month, d));
  }

  // 簡易的な祝日判定（固定祝日例）
  const isJapaneseHoliday = (date) => {
    const mmdd = ("0" + (date.getMonth() + 1)).slice(-2) + "-" + ("0" + date.getDate()).slice(-2);
    const fixedHolidays = ["01-01", "02-11", "04-29", "05-03", "05-04", "05-05", "11-03", "11-23"];
    return fixedHolidays.includes(mmdd);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* 月移動ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => onMonthChange(-1)} className="p-2 text-xl font-bold text-gray-700 hover:text-gray-900">&lt;</button>
        <div className="text-2xl font-bold text-gray-800">
          {year}年 {month + 1}月
        </div>
        <button onClick={() => onMonthChange(1)} className="p-2 text-xl font-bold text-gray-700 hover:text-gray-900">&gt;</button>
      </div>
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center font-bold text-lg text-gray-700">{day}</div>
        ))}
      </div>
      {/* 日付タイル */}
      <div className="grid grid-cols-7 gap-2">
        {tiles.map((date, index) => {
          if (!date) return <div key={index} className="h-24"></div>;
          const localDate = date.toLocaleDateString('en-CA'); // ローカル日付文字列 "YYYY-MM-DD"
          const selectedLocalDate = selectedDate.toLocaleDateString('en-CA');
          const isSelected = selectedLocalDate === localDate;
          let tileClass = "h-24 flex items-center justify-center border rounded-lg cursor-pointer transition transform duration-300 text-2xl font-semibold";
          if (isSelected) {
            tileClass += " bg-gray-800 text-white shadow-2xl scale-110";
          } else if (isJapaneseHoliday(date)) {
            tileClass += " bg-yellow-200 text-gray-800";
          } else if (date.getDay() === 0) {
            tileClass += " bg-red-200 text-gray-800";
          } else if (date.getDay() === 6) {
            tileClass += " bg-blue-200 text-gray-800";
          } else {
            tileClass += " bg-white text-gray-800 hover:bg-gray-100";
          }
          return (
            <div
              key={index}
              className={tileClass}
              onClick={() => onDateSelect(date)}
            >
              <span>{date.getDate()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const { data: session, status } = useSession();
  const [displayDate, setDisplayDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState('');

  // スケジュール用基本情報（recordType は "予定"）
  const [attendance, setAttendance] = useState({
    date: new Date().toLocaleDateString('en-CA'),
    employeeName: '',
    startTime: '',
    endTime: '',
    workType: '出勤',
    recordType: '予定',
  });
  // 休憩記録（recordType: "予定"）
  const [breakRecords, setBreakRecords] = useState([{ breakStart: '', breakEnd: '', recordType: '予定' }]);
  // 業務詳細（recordType: "予定"）に詳細テキストエリアを追加
  const [workDetails, setWorkDetails] = useState([{ workTitle: '', workStart: '', workEnd: '', detail: '', recordType: '予定' }]);

  useEffect(() => {
    if (session) {
      setAttendance(prev => ({ ...prev, employeeName: session.user.name }));
    }
  }, [session]);

  useEffect(() => {
    const localDate = selectedDate.toLocaleDateString('en-CA');
    setAttendance(prev => ({ ...prev, date: localDate }));
  }, [selectedDate]);

  const handleAttendanceChange = (e) => {
    setAttendance({ ...attendance, [e.target.name]: e.target.value });
  };

  const handleBreakChange = (index, e) => {
    const newBreakRecords = [...breakRecords];
    newBreakRecords[index][e.target.name] = e.target.value;
    setBreakRecords(newBreakRecords);
  };

  const handleWorkDetailChange = (index, e) => {
    const newWorkDetails = [...workDetails];
    newWorkDetails[index][e.target.name] = e.target.value;
    setWorkDetails(newWorkDetails);
  };

  const addBreakRecord = () => {
    setBreakRecords([...breakRecords, { breakStart: '', breakEnd: '', recordType: '予定' }]);
  };

  const addWorkDetail = () => {
    setWorkDetails([...workDetails, { workTitle: '', workStart: '', workEnd: '', detail: '', recordType: '予定' }]);
  };

  const removeBreakRecord = (index) => {
    if (breakRecords.length > 1) {
      setBreakRecords(breakRecords.filter((_, i) => i !== index));
    }
  };

  const removeWorkDetail = (index) => {
    if (workDetails.length > 1) {
      setWorkDetails(workDetails.filter((_, i) => i !== index));
    }
  };

  const handleMonthChange = (delta) => {
    const newDate = new Date(displayDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setDisplayDate(newDate);
    setSelectedDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    // 勤務記録送信
    const resAttendance = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attendance),
    });
    if (!resAttendance.ok) {
      const data = await resAttendance.json();
      setMessage(data.error || '勤務記録送信エラー');
      return;
    }
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
        if (!resBreak.ok) {
          const data = await resBreak.json();
          setMessage(data.error || '休憩記録送信エラー');
          return;
        }
      }
    }
    // 業務詳細送信
    for (let detail of workDetails) {
      if (detail.workTitle || detail.workStart || detail.workEnd || detail.detail) {
        const resWork = await fetch('/api/workdetail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: attendance.date,
            employeeName: attendance.employeeName,
            workTitle: detail.workTitle,
            workStart: detail.workStart,
            workEnd: detail.workEnd,
            detail: detail.detail,
            recordType: detail.recordType,
          }),
        });
        if (!resWork.ok) {
          const data = await resWork.json();
          setMessage(data.error || '業務詳細送信エラー');
          return;
        }
      }
    }
    setMessage('全ての予定が正常に送信されました！');
    setAttendance(prev => ({
      ...prev,
      startTime: '',
      endTime: '',
      workType: '出勤',
    }));
    setBreakRecords([{ breakStart: '', breakEnd: '', recordType: '予定' }]);
    setWorkDetails([{ workTitle: '', workStart: '', workEnd: '', detail: '', recordType: '予定' }]);
    setShowModal(false);
  };

  if (status === 'loading') return <div className="p-4 text-center">Loading...</div>;
  if (!session) return null;

  return (
    <div className="p-4">
      <h1 className="text-4xl font-bold text-center mb-6">予定入力</h1>
      <TileCalendar 
        displayDate={displayDate}
        selectedDate={selectedDate}
        onDateSelect={(date) => { setSelectedDate(date); setShowModal(true); }}
        onMonthChange={handleMonthChange}
      />
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl overflow-y-auto max-h-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-3xl font-semibold">{attendance.date} の予定入力</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-600 hover:text-gray-800 text-3xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 勤務記録フォーム */}
              <section className="bg-gray-50 p-4 rounded-lg">
                <div>
                  <label className="block mb-1">社員名:</label>
                  <input 
                    type="text" 
                    name="employeeName" 
                    value={attendance.employeeName} 
                    readOnly 
                    className="w-full p-2 border rounded bg-gray-100" 
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:space-x-4">
                  <div className="flex-1">
                    <label className="block mb-1">出社時間:</label>
                    <input 
                      type="time" 
                      name="startTime" 
                      value={attendance.startTime} 
                      onChange={handleAttendanceChange} 
                      required 
                      className="w-full p-2 border rounded" 
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block mb-1">退社時間:</label>
                    <input 
                      type="time" 
                      name="endTime" 
                      value={attendance.endTime} 
                      onChange={handleAttendanceChange} 
                      required 
                      className="w-full p-2 border rounded" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block mb-1">勤務種別:</label>
                  <select 
                    name="workType" 
                    value={attendance.workType} 
                    onChange={handleAttendanceChange} 
                    required 
                    className="w-full p-2 border rounded bg-white"
                  >
                    <option value="出勤">出勤</option>
                    <option value="公休">公休</option>
                    <option value="有休">有休</option>
                    <option value="半休">半休</option>
                    <option value="早退">早退</option>
                    <option value="遅刻">遅刻</option>
                    <option value="有給休暇">有給休暇</option>
                    <option value="休日出勤">休日出勤</option>
                    <option value="振替出勤">振替出勤</option>
                  </select>
                </div>
              </section>

              {/* 休憩記録フォーム */}
              <section className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-2xl font-semibold mb-2">休憩記録</h3>
                {breakRecords.map((record, index) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-end sm:space-x-4 mb-2">
                    <div className="flex-1">
                      <label className="block mb-1">休憩開始:</label>
                      <input 
                        type="time" 
                        name="breakStart" 
                        value={record.breakStart} 
                        onChange={(e) => handleBreakChange(index, e)} 
                        className="w-full p-2 border rounded" 
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block mb-1">休憩終了:</label>
                      <input 
                        type="time" 
                        name="breakEnd" 
                        value={record.breakEnd} 
                        onChange={(e) => handleBreakChange(index, e)} 
                        className="w-full p-2 border rounded" 
                      />
                    </div>
                    {breakRecords.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removeBreakRecord(index)}
                        className="mt-2 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
                      >
                        削除
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  type="button" 
                  onClick={addBreakRecord} 
                  className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600 transition"
                >
                  休憩記録を追加
                </button>
              </section>

              {/* 業務詳細フォーム */}
              <section className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-2xl font-semibold mb-2">業務詳細</h3>
                {workDetails.map((detail, index) => (
                  <div key={index} className="mb-4 border-b border-gray-200 pb-2">
                    <div>
                      <label className="block mb-1">業務タイトル:</label>
                      <input 
                        type="text" 
                        name="workTitle" 
                        placeholder="業務タイトル" 
                        value={detail.workTitle} 
                        onChange={(e) => handleWorkDetailChange(index, e)} 
                        className="w-full p-2 border rounded mb-1" 
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:space-x-4 mb-1">
                      <div className="flex-1">
                        <label className="block mb-1">業務開始:</label>
                        <input 
                          type="time" 
                          name="workStart" 
                          value={detail.workStart} 
                          onChange={(e) => handleWorkDetailChange(index, e)} 
                          className="w-full p-2 border rounded" 
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block mb-1">業務終了:</label>
                        <input 
                          type="time" 
                          name="workEnd" 
                          value={detail.workEnd} 
                          onChange={(e) => handleWorkDetailChange(index, e)} 
                          className="w-full p-2 border rounded" 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block mb-1">詳細:</label>
                      <textarea
                        name="detail"
                        placeholder="詳細を記入してください"
                        value={detail.detail}
                        onChange={(e) => handleWorkDetailChange(index, e)}
                        className="w-full p-2 border rounded h-24"
                      />
                    </div>
                    {workDetails.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removeWorkDetail(index)}
                        className="mt-2 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
                      >
                        削除
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  type="button" 
                  onClick={addWorkDetail} 
                  className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600 transition"
                >
                  業務詳細を追加
                </button>
              </section>

              <button 
                type="submit" 
                className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 transition"
              >
                送信
              </button>
            </form>
            {message && <p className="mt-4 text-center text-green-600">{message}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
