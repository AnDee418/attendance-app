import React, { useEffect } from 'react';

export default function AttendanceForm({
  attendance,
  breakRecords,
  onAttendanceChange,
  onBreakChange,
  onAddBreak,
  onRemoveBreak,
  onWorkTypeChange,
}) {
  // 休暇系の勤務種別かどうかを判定
  const isLeaveType = ['公休', '有給休暇'].includes(attendance.workType);

  // 勤務時間の詳細を計算する関数
  const calculateTimeDetails = () => {
    if (!attendance.startTime || !attendance.endTime) return null;

    // 勤務時間の計算
    const start = new Date(`2000/01/01 ${attendance.startTime}`);
    const end = new Date(`2000/01/01 ${attendance.endTime}`);
    const workMinutes = (end - start) / (1000 * 60);

    // 休憩時間の計算
    let breakMinutes = 0;
    breakRecords.forEach(record => {
      if (record.breakStart && record.breakEnd) {
        const breakStart = new Date(`2000/01/01 ${record.breakStart}`);
        const breakEnd = new Date(`2000/01/01 ${record.breakEnd}`);
        breakMinutes += (breakEnd - breakStart) / (1000 * 60);
      }
    });

    // 実労働時間
    const totalMinutes = workMinutes - breakMinutes;

    // フォーマット関数
    const formatTime = (minutes) => {
      const hours = Math.floor(minutes / 60);
      const mins = Math.floor(minutes % 60);
      return `${hours}時間${mins}分`;
    };

    return {
      workTime: formatTime(workMinutes),
      breakTime: formatTime(breakMinutes),
      totalTime: formatTime(totalMinutes),
      totalMinutes: totalMinutes
    };
  };

  const timeDetails = calculateTimeDetails();

  // 親コンポーネントに実労働時間を渡すためのeffect
  useEffect(() => {
    if (timeDetails) {
      onAttendanceChange({
        target: {
          name: 'totalWorkTime',
          value: timeDetails.totalTime
        }
      });
    }
  }, [timeDetails, onAttendanceChange]);

  // 勤務種別の変更ハンドラを修正
  const handleWorkTypeChange = (e) => {
    // 親コンポーネントの関数を呼び出す
    if (onWorkTypeChange) {
      // 専用のハンドラがある場合はそれを使用
      onWorkTypeChange(e);
    } else {
      // 通常のハンドラを使用
      onAttendanceChange(e);
      
      // 休暇系の場合は時間をリセット
      const newWorkType = e.target.value;
      if (['公休', '有給休暇', '休暇'].includes(newWorkType)) {
        onAttendanceChange({
          target: {
            name: 'startTime',
            value: ''
          }
        });
        onAttendanceChange({
          target: {
            name: 'endTime',
            value: ''
          }
        });
      }
    }
  };

  // 勤務種別の選択肢を動的に生成する関数
  const getWorkTypeOptions = () => {
    // 基本の選択肢（すべてのユーザーに表示）
    const options = [
      '出勤',
      '在宅',
      '半休',
      '早退',
      '遅刻',
      '公休',
      '有給休暇',
      '休日出勤',
      '振替出勤',
      '移動'
    ];
    
    return options;
  };

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
    <>
      {/* 勤務記録フォーム */}
      <section className="bg-gray-50 p-4 rounded-lg">
        <div className="space-y-4">
          <div>
            <label className="block mb-1">勤務種別:</label>
            <select 
              name="workType" 
              value={attendance.workType} 
              onChange={handleWorkTypeChange}
              required 
              className="w-full p-3 border rounded-lg bg-white"
            >
              {getWorkTypeOptions().map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1">社員名:</label>
            <input 
              type="text" 
              name="employeeName" 
              value={attendance.employeeName} 
              readOnly 
              className="w-full p-3 border rounded-lg bg-gray-100" 
            />
          </div>
          {!isLeaveType && (
            <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
              <div className="flex-1">
                <label className="block mb-1">出社時間:</label>
                <select 
                  name="startTime" 
                  value={attendance.startTime} 
                  onChange={onAttendanceChange} 
                  required={!isLeaveType}
                  className="w-full p-3 border rounded-lg" 
                >
                  <option value="">時間を選択</option>
                  {generateTimeOptions()}
                </select>
              </div>
              <div className="flex-1">
                <label className="block mb-1">退社時間:</label>
                <select 
                  name="endTime" 
                  value={attendance.endTime} 
                  onChange={onAttendanceChange} 
                  required={!isLeaveType}
                  className="w-full p-3 border rounded-lg" 
                >
                  <option value="">時間を選択</option>
                  {generateTimeOptions()}
                </select>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 休憩記録フォーム */}
      {!isLeaveType && (
        <section className="bg-gray-50 p-4 rounded-lg mt-4">
          <h3 className="text-lg font-semibold mb-4">休憩記録</h3>
          {breakRecords.map((record, index) => (
            <div key={index} className="mb-4 bg-white p-3 rounded-lg shadow-sm">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">休憩開始:</label>
                  <select 
                    name="breakStart" 
                    value={record.breakStart} 
                    onChange={(e) => onBreakChange(index, e)} 
                    className="w-full p-3 border rounded-lg bg-gray-50" 
                  >
                    <option value="">時間を選択</option>
                    {generateTimeOptions()}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">休憩終了:</label>
                  <select 
                    name="breakEnd" 
                    value={record.breakEnd} 
                    onChange={(e) => onBreakChange(index, e)} 
                    className="w-full p-3 border rounded-lg bg-gray-50" 
                  >
                    <option value="">時間を選択</option>
                    {generateTimeOptions()}
                  </select>
                </div>
                {breakRecords.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => onRemoveBreak(index)}
                    className="w-full mt-2 bg-red-50 text-red-600 p-3 rounded-lg hover:bg-red-100 transition font-medium"
                  >
                    この休憩を削除
                  </button>
                )}
              </div>
            </div>
          ))}
          <button 
            type="button" 
            onClick={onAddBreak} 
            className="w-full bg-green-50 text-green-600 p-3 rounded-lg hover:bg-green-100 transition font-medium"
          >
            + 休憩を追加
          </button>
        </section>
      )}

      {/* 勤務時間サマリー */}
      {!isLeaveType && timeDetails && (
        <section className="mt-4 bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">勤務時間サマリー</h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-blue-50 rounded-lg p-4 flex justify-between items-center">
                <p className="text-blue-600">総勤務時間</p>
                <p className="text-xl font-bold text-blue-800">{timeDetails.workTime}</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 flex justify-between items-center">
                <p className="text-amber-600">休憩時間</p>
                <p className="text-xl font-bold text-amber-800">{timeDetails.breakTime}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 flex justify-between items-center border-2 border-green-100">
                <p className="text-green-600">実労働時間</p>
                <p className="text-xl font-bold text-green-800">{timeDetails.totalTime}</p>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
} 