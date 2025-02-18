import { useState } from 'react';
import AttendanceForm from './AttendanceForm';

export default function ScheduleForm({
  initialAttendance,
  initialBreakRecords,
  initialWorkDetails,
  onSubmit,
  onClose,
}) {
  const [attendance, setAttendance] = useState(initialAttendance);
  const [breakRecords, setBreakRecords] = useState(initialBreakRecords);
  const [workDetails, setWorkDetails] = useState(initialWorkDetails);
  const [message, setMessage] = useState('');

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
    setWorkDetails([
      ...workDetails,
      { 
        workTitle: '', 
        workStart: '', 
        workEnd: '', 
        detail: '', 
        workCategory: '業務',
        recordType: '予定' 
      }
    ]);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      await onSubmit(attendance, breakRecords, workDetails);
      setAttendance((prev) => ({
        ...prev,
        startTime: '',
        endTime: '',
        workType: '出勤',
      }));
      setBreakRecords([{ breakStart: '', breakEnd: '', recordType: '予定' }]);
      setWorkDetails([{
        workTitle: '',
        workStart: '',
        workEnd: '',
        detail: '',
        workCategory: '業務',
        recordType: '予定'
      }]);
      onClose();
    } catch (error) {
      setMessage(error.message || 'エラーが発生しました');
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl 
        overflow-y-auto my-20 max-h-[calc(100vh-160px)]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">{attendance.date} の予定入力</h2>
          <button 
            onClick={onClose} 
            className="text-gray-600 hover:text-gray-800 text-3xl"
          >
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 勤務記録フォーム */}
          <AttendanceForm 
            attendance={attendance}
            breakRecords={breakRecords}
            onAttendanceChange={handleAttendanceChange}
            onBreakChange={handleBreakChange}
            onAddBreak={addBreakRecord}
            onRemoveBreak={removeBreakRecord}
          />

          {/* 業務詳細フォーム */}
          <section className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-2xl font-semibold mb-2">業務詳細</h3>
            {workDetails.map((detail, index) => (
              <div key={index} className="mb-4 border-b border-gray-200 pb-2">
                <div className="flex flex-col sm:flex-row sm:space-x-4 mb-2">
                  <div className="flex-1">
                    <label className="block mb-1">種別:</label>
                    <select
                      name="workCategory"
                      value={detail.workCategory}
                      onChange={(e) => handleWorkDetailChange(index, e)}
                      className="w-full p-2 border rounded"
                    >
                      <option value="業務">業務</option>
                      <option value="販売会">販売会</option>
                      <option value="外出">外出</option>
                      <option value="ミーティング">ミーティング</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block mb-1">業務タイトル:</label>
                    <input 
                      type="text" 
                      name="workTitle" 
                      placeholder="業務タイトル" 
                      value={detail.workTitle} 
                      onChange={(e) => handleWorkDetailChange(index, e)} 
                      className="w-full p-2 border rounded" 
                    />
                  </div>
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

          {/* 送信ボタンとキャンセルボタン */}
          <div className="flex gap-4 mt-6">
            <button 
              type="submit" 
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
        </form>
        {message && <p className="mt-4 text-center text-red-600">{message}</p>}
      </div>
    </div>
  );
} 