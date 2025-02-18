import { useState } from 'react';
import AttendanceForm from './AttendanceForm';

export default function ClockbookForm({ 
  initialAttendance,
  onSubmit,
  onClose,
}) {
  const [attendance, setAttendance] = useState(initialAttendance);
  const [breakRecords, setBreakRecords] = useState([{ breakStart: '', breakEnd: '', recordType: '出勤簿' }]);
  const [message, setMessage] = useState('');

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      await onSubmit(attendance, breakRecords);
      setAttendance(prev => ({
        ...prev,
        startTime: '',
        endTime: '',
        workType: '出勤',
      }));
      setBreakRecords([{ breakStart: '', breakEnd: '', recordType: '出勤簿' }]);
      onClose();
    } catch (error) {
      setMessage(error.message || 'エラーが発生しました');
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl overflow-y-auto max-h-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-semibold">{attendance.date} の勤務記録</h2>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800 text-3xl">&times;</button>
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
  );
} 