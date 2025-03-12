import { useState, useEffect } from 'react';
import AttendanceForm from './AttendanceForm';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import ja from 'date-fns/locale/ja';

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
  const [userAccountType, setUserAccountType] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const accountType = window.localStorage.getItem('userAccountType') || '';
    setUserAccountType(accountType);
  }, []);

  // 既存データの取得
  useEffect(() => {
    const fetchExistingData = async () => {
      setIsLoading(true);
      try {
        // 既存の勤務記録を取得
        const attendanceRes = await fetch(`/api/attendance?date=${initialAttendance.date}&employeeName=${initialAttendance.employeeName}&recordType=予定`);
        const attendanceData = await attendanceRes.json();
        
        // 既存の休憩記録を取得
        const breakRes = await fetch(`/api/break?date=${initialAttendance.date}&employeeName=${initialAttendance.employeeName}&recordType=予定`);
        const breakData = await breakRes.json();
        
        // 既存の業務詳細を取得
        const workDetailRes = await fetch(`/api/workdetail?date=${initialAttendance.date}&employeeName=${initialAttendance.employeeName}&recordType=予定`);
        const workDetailData = await workDetailRes.json();
        
        // 既存データがあれば、それで初期化
        if (attendanceData.data && attendanceData.data.length > 0) {
          const existingAttendance = attendanceData.data.find(row => 
            row[0] === initialAttendance.date && 
            row[1] === initialAttendance.employeeName && 
            row[5] === '予定'
          );
          
          if (existingAttendance) {
            setAttendance(prev => ({
              ...prev,
              startTime: existingAttendance[2] || '',
              endTime: existingAttendance[3] || '',
              workType: existingAttendance[4] || '出勤',
              totalWorkTime: existingAttendance[6] || ''
            }));
          }
        }
        
        if (breakData.data && breakData.data.length > 0) {
          // 休憩記録が存在する場合はそれを使用
          const existingBreaks = breakData.data
            .filter(row => row[0] === initialAttendance.date && 
                          row[1] === initialAttendance.employeeName && 
                          row[4] === '予定')
            .map(row => ({
              breakStart: row[2] || '',
              breakEnd: row[3] || '',
              recordType: '予定'
            }));
          
          if (existingBreaks.length > 0) {
            setBreakRecords(existingBreaks);
          }
        }
        
        if (workDetailData.data && workDetailData.data.length > 0) {
          // 業務詳細が存在する場合はそれを使用
          const existingWorkDetails = workDetailData.data
            .filter(item => 
              item.date === initialAttendance.date && 
              item.employeeName === initialAttendance.employeeName && 
              item.recordType === '予定'
            )
            .map(item => ({
              workTitle: item.workTitle || '',
              workStart: item.workStart || '',
              workEnd: item.workEnd || '',
              detail: item.detail || '',
              workCategory: item.workCategory || '業務',
              recordType: '予定'
            }));
          
          if (existingWorkDetails.length > 0) {
            setWorkDetails(existingWorkDetails);
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

  const getWorkTypeOptions = () => {
    const baseOptions = [
      '出勤',
      '在宅',
      '半休',
      '有給休暇'
    ];
    
    if (userAccountType !== '営業') {
      return [
        ...baseOptions,
        '公休',
        '移動'
      ];
    } else {
      return [
        ...baseOptions,
        '休暇'
      ];
    }
  };

  const formattedDate = (() => {
    try {
      if (!attendance.date) return '';
      return format(new Date(attendance.date), 'yyyy年MM月dd日(E)', { locale: ja });
    } catch (e) {
      console.error('日付フォーマットエラー:', e);
      return '';
    }
  })();

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
    
    // 勤務種別が「移動」の場合、すべての業務詳細の種別も「移動」に更新
    if (newWorkType === '移動') {
      const updatedWorkDetails = workDetails.map(detail => ({
        ...detail,
        workCategory: '移動' // カテゴリを移動に変更
      }));
      setWorkDetails(updatedWorkDetails);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      // 送信処理を呼び出す際に、業務詳細オブジェクトのリスト全体を渡す
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

  // 業務アカウントかどうかを判定
  const isGyomuAccount = initialAttendance?.employeeName && 
    typeof window !== 'undefined' && 
    window.localStorage.getItem('userAccountType') === '業務';

  // 15分単位の時間オプションを生成する関数
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const formattedHour = hour.toString().padStart(2, '0');
        const formattedMinute = minute.toString().padStart(2, '0');
        const timeValue = `${formattedHour}:${formattedMinute}`;
        options.push(
          <option key={timeValue} value={timeValue}>
            {timeValue}
          </option>
        );
      }
    }
    return options;
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-[110] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl 
        overflow-y-auto max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center sticky top-0 bg-white p-4 border-b z-10">
          <h2 className="text-xl font-semibold">{formattedDate} の予定入力 {isLoading ? '(読み込み中...)' : ''}</h2>
          <button 
            onClick={onClose} 
            className="text-gray-600 hover:text-gray-800 text-2xl"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <p className="text-gray-500">データを読み込んでいます...</p>
          </div>
        ) : (
          <div className="overflow-y-auto p-4 flex-grow">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 業務アカウントの場合は勤務種別のみ表示 */}
              {isGyomuAccount ? (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="mb-4">
                    <label className="block mb-1">勤務種別:</label>
                    <select
                      name="workType"
                      value={attendance.workType}
                      onChange={handleWorkTypeChange}
                      className="w-full p-2 border rounded"
                    >
                      {getWorkTypeOptions().map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                // 通常のアカウントの場合は全ての項目を表示
                <AttendanceForm 
                  attendance={attendance}
                  breakRecords={breakRecords}
                  onAttendanceChange={handleAttendanceChange}
                  onBreakChange={handleBreakChange}
                  onAddBreak={addBreakRecord}
                  onRemoveBreak={removeBreakRecord}
                />
              )}

              {/* 業務詳細フォーム - 全アカウントで表示 */}
              <section className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-2xl font-semibold mb-2">業務詳細</h3>
                {workDetails.map((detail, index) => (
                  <div key={index} className="mb-4 border-b border-gray-200 pb-2">
                    <div className="flex flex-col sm:flex-row sm:space-x-4 mb-2">
                      <div className="flex-1">
                        <label className="block mb-1">カテゴリ:</label>
                        <select
                          name="workCategory"
                          value={detail.workCategory}
                          onChange={(e) => handleWorkDetailChange(index, e)}
                          className="w-full p-2 border rounded"
                        >
                          <option value="業務">業務</option>
                          <option value="会議">会議</option>
                          <option value="電話">電話</option>
                          <option value="移動">移動</option>
                          <option value="その他">その他</option>
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
                        <select 
                          name="workStart" 
                          value={detail.workStart} 
                          onChange={(e) => handleWorkDetailChange(index, e)} 
                          className="w-full p-2 border rounded" 
                        >
                          <option value="">時間を選択</option>
                          {generateTimeOptions()}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block mb-1">業務終了:</label>
                        <select 
                          name="workEnd" 
                          value={detail.workEnd} 
                          onChange={(e) => handleWorkDetailChange(index, e)} 
                          className="w-full p-2 border rounded" 
                        >
                          <option value="">時間を選択</option>
                          {generateTimeOptions()}
                        </select>
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