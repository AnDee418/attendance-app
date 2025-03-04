import { useState, useEffect } from 'react';
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

  useEffect(() => {
    const modalContent = document.querySelector('.modal-content');
    if (modalContent) {
      modalContent.scrollTop = 0;
    }
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[110] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl 
        flex flex-col my-4 max-h-[90vh]">
        <div className="flex justify-between items-center sticky top-0 bg-white p-4 border-b z-10">
          <h2 className="text-xl font-semibold truncate">{attendance.date} の勤務記録</h2>
          <button 
            onClick={onClose} 
            className="text-gray-600 hover:text-gray-800 text-2xl ml-2 flex-shrink-0"
          >
            &times;
          </button>
        </div>
        <div className="overflow-y-auto p-4 flex-grow modal-content">
          <form onSubmit={handleSubmit} className="space-y-6">
            <AttendanceForm 
              attendance={attendance}
              breakRecords={breakRecords}
              onAttendanceChange={handleAttendanceChange}
              onBreakChange={handleBreakChange}
              onAddBreak={addBreakRecord}
              onRemoveBreak={removeBreakRecord}
            />
          </form>
        </div>
        <div className="sticky bottom-0 bg-white p-4 border-t flex gap-4">
          <button 
            type="submit" 
            onClick={handleSubmit}
            className="flex-1 bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 
              transition-all duration-200 active:scale-95"
          >
            保存
          </button>
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-700 p-3 rounded-lg hover:bg-gray-200 
              transition-all duration-200 active:scale-95"
          >
            キャンセル
          </button>
        </div>
        {message && <p className="p-4 text-center text-red-600 bg-red-50">{message}</p>}
      </div>
    </div>
  );
} 