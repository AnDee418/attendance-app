// pages/clockbook.js
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import 'react-calendar/dist/Calendar.css';
import TileCalendar from '../components/TileCalendar';
import AttendanceForm from '../components/AttendanceForm';

export default function ClockbookPage() {
  const { data: session, status } = useSession();
  const [displayDate, setDisplayDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState('');

  // 勤務記録の基本情報（recordTypeは "出勤簿"）
  const [attendance, setAttendance] = useState({
    date: new Date().toLocaleDateString('en-CA'),
    employeeName: '',
    startTime: '',
    endTime: '',
    workType: '出勤',
    recordType: '出勤簿',
  });
  // 休憩記録（recordType: "出勤簿"）※業務詳細フォームは削除
  const [breakRecords, setBreakRecords] = useState([{ breakStart: '', breakEnd: '', recordType: '出勤簿' }]);

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

  const addBreakRecord = () => {
    setBreakRecords([...breakRecords, { breakStart: '', breakEnd: '', recordType: '出勤簿' }]);
  };

  const removeBreakRecord = (index) => {
    if (breakRecords.length > 1) {
      setBreakRecords(breakRecords.filter((_, i) => i !== index));
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
      body: JSON.stringify({
        ...attendance,
        totalWorkTime: attendance.totalWorkTime || ''
      }),
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
    setMessage('全ての記録が正常に送信されました！');
    setAttendance(prev => ({
      ...prev,
      startTime: '',
      endTime: '',
      workType: '出勤',
    }));
    setBreakRecords([{ breakStart: '', breakEnd: '', recordType: '出勤簿' }]);
    setShowModal(false);
  };

  if (status === 'loading') return <div className="p-4 text-center">Loading...</div>;
  if (!session) return null;

  return (
    <div className="p-4">
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
              <h2 className="text-3xl font-semibold">{attendance.date} の勤務記録</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-600 hover:text-gray-800 text-3xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <AttendanceForm 
                attendance={attendance}
                breakRecords={breakRecords}
                onAttendanceChange={handleAttendanceChange}
                onBreakChange={handleBreakChange}
                onAddBreak={addBreakRecord}
                onRemoveBreak={removeBreakRecord}
              />

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

ClockbookPage.title = '出勤簿';
