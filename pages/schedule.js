// pages/schedule.js
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import TileCalendar from '../components/TileCalendar';
import 'react-calendar/dist/Calendar.css';
import ScheduleForm from '../components/ScheduleForm';

export default function SchedulePage() {
  const { data: session, status } = useSession();
  const [displayDate, setDisplayDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState('');

  // スケジュール用基本情報
  const [attendance, setAttendance] = useState({
    date: new Date().toLocaleDateString('en-CA'),
    employeeName: '',
    startTime: '',
    endTime: '',
    workType: '出勤',
    recordType: '予定',
  });

  useEffect(() => {
    if (session) {
      setAttendance(prev => ({ ...prev, employeeName: session.user.name }));
    }
  }, [session]);

  useEffect(() => {
    const localDate = selectedDate.toLocaleDateString('en-CA');
    setAttendance(prev => ({ ...prev, date: localDate }));
  }, [selectedDate]);

  const handleMonthChange = (delta) => {
    const newDate = new Date(displayDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setDisplayDate(newDate);
    setSelectedDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
  };

  const handleSubmit = async (attendance, breakRecords, workDetails) => {
    // 勤務記録送信
    const resAttendance = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attendance),
    });
    
    if (!resAttendance.ok) {
      const data = await resAttendance.json();
      throw new Error(data.error || '勤務記録送信エラー');
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
          throw new Error(data.error || '休憩記録送信エラー');
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
            workCategory: detail.workCategory,
            recordType: detail.recordType,
          }),
        });
        
        if (!resWork.ok) {
          const data = await resWork.json();
          throw new Error(data.error || '業務詳細送信エラー');
        }
      }
    }
    
    setMessage('全ての予定が正常に送信されました！');
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
        <ScheduleForm
          initialAttendance={attendance}
          onSubmit={handleSubmit}
          onClose={() => setShowModal(false)}
        />
      )}
      {message && <p className="mt-4 text-center text-green-600">{message}</p>}
    </div>
  );
}

SchedulePage.title = '予定登録';