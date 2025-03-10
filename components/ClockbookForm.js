import { useState, useEffect } from 'react';
import AttendanceForm from './AttendanceForm';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import ja from 'date-fns/locale/ja';

export default function ClockbookForm({ 
  initialAttendance,
  onSubmit,
  onClose,
}) {
  const [attendance, setAttendance] = useState(initialAttendance);
  const [breakRecords, setBreakRecords] = useState([{ breakStart: '', breakEnd: '', recordType: '出勤簿' }]);
  const [message, setMessage] = useState('');
  const [userAccountType, setUserAccountType] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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

  // コンポーネントのマウント時にユーザーのアカウントタイプを取得
  useEffect(() => {
    const accountType = window.localStorage.getItem('userAccountType') || '';
    setUserAccountType(accountType);
  }, []);
  
  // アカウントタイプに基づく勤務種別リストを取得
  const getWorkTypeOptions = () => {
    const baseOptions = [
      '出勤',
      '在宅',
      '半休',
      '有給休暇'
    ];
    
    // 営業以外のアカウント種別の場合、「休暇」を「公休」に変更し、「移動」を追加
    if (userAccountType !== '営業') {
      return [
        ...baseOptions,
        '公休',   // 「休暇」の代わりに「公休」
        '移動'    // 新たに「移動」を追加
      ];
    } else {
      // 営業の場合は「休暇」を含める
      return [
        ...baseOptions,
        '休暇'
      ];
    }
  };

  const handleWorkTypeChange = (e) => {
    const newWorkType = e.target.value;
    let newStartTime = attendance.startTime;
    let newEndTime = attendance.endTime;
    
    if (['公休', '有給休暇', '休暇'].includes(newWorkType)) {
      newStartTime = '00:00';
      newEndTime = '00:00';
    }
    
    setAttendance(prev => ({
      ...prev,
      workType: newWorkType,
      startTime: newStartTime,
      endTime: newEndTime
    }));
  };

  // 既存データの取得
  useEffect(() => {
    const fetchExistingData = async () => {
      setIsLoading(true);
      try {
        // 既存の勤務記録を取得
        const attendanceRes = await fetch(`/api/attendance?date=${initialAttendance.date}&employeeName=${initialAttendance.employeeName}&recordType=出勤簿`);
        const attendanceData = await attendanceRes.json();
        
        // 既存の休憩記録を取得
        const breakRes = await fetch(`/api/break?date=${initialAttendance.date}&employeeName=${initialAttendance.employeeName}&recordType=出勤簿`);
        const breakData = await breakRes.json();
        
        // 既存データがあれば、それで初期化
        if (attendanceData.data && attendanceData.data.length > 0) {
          const existingAttendance = attendanceData.data[0];
          setAttendance(prev => ({
            ...prev,
            startTime: existingAttendance[2] || '',
            endTime: existingAttendance[3] || '',
            workType: existingAttendance[4] || '出勤',
            totalWorkTime: existingAttendance[6] || ''
          }));
        }
        
        if (breakData.data && breakData.data.length > 0) {
          // 休憩記録が存在する場合はそれを使用
          const existingBreaks = breakData.data
            .filter(row => row[0] === initialAttendance.date && 
                          row[1] === initialAttendance.employeeName && 
                          row[4] === '出勤簿')
            .map(row => ({
              breakStart: row[2] || '',
              breakEnd: row[3] || '',
              recordType: '出勤簿'
            }));
          
          if (existingBreaks.length > 0) {
            setBreakRecords(existingBreaks);
          }
        }
      } catch (error) {
        console.error('データ取得エラー:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (initialAttendance.date && initialAttendance.employeeName) {
      fetchExistingData();
    } else {
      setIsLoading(false);
    }
  }, [initialAttendance.date, initialAttendance.employeeName]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[110] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl 
        flex flex-col my-4 max-h-[90vh]">
        <div className="flex justify-between items-center sticky top-0 bg-white p-4 border-b z-10">
          <h2 className="text-xl font-semibold truncate">
            {attendance.date} の勤務記録 {isLoading ? '(読み込み中...)' : ''}
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-600 hover:text-gray-800 text-2xl ml-2 flex-shrink-0"
          >
            &times;
          </button>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <p className="text-gray-500">データを読み込んでいます...</p>
          </div>
        ) : (
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
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  勤務種別
                </label>
                <select
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={attendance.workType}
                  onChange={handleWorkTypeChange}
                  required
                >
                  {getWorkTypeOptions().map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </form>
          </div>
        )}
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