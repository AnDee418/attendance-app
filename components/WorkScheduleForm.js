import React, { useEffect } from 'react';

export default function AttendanceForm({
  attendance,
  breakRecords,
  onAttendanceChange,
  onBreakChange,
  onAddBreak,
  onRemoveBreak,
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
  }, [timeDetails]);

  // タイムグリッドを生成する関数
  const generateTimeGrid = (startHour = 8, endHour = 20) => {
    const times = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const formattedHour = hour.toString().padStart(2, '0');
        const formattedMinute = minute.toString().padStart(2, '0');
        times.push(`${formattedHour}:${formattedMinute}`);
      }
    }
    return times;
  };

  // カスタム時間選択用の関数
  const handleCustomTimeChange = (fieldName, value) => {
    onAttendanceChange({
      target: {
        name: fieldName,
        value
      }
    });
  };

  // 休憩時間の選択用の関数
  const handleBreakCustomTimeChange = (index, fieldName, value) => {
    onBreakChange(index, {
      target: {
        name: fieldName,
        value
      }
    });
  };

  return (
    <>
      {/* 勤務記録フォーム */}
      <section className="bg-gray-50 p-4 rounded-lg">
        <div className="space-y-4">
          <div>
            <label className="block mb-1 font-medium text-gray-700">勤務種別:</label>
            <select 
              name="workType" 
              value={attendance.workType} 
              onChange={onAttendanceChange} 
              required 
              className="w-full p-3 border border-gray-300 rounded-lg bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="出勤">出勤</option>
              <option value="公休">公休</option>
              <option value="半休">半休</option>
              <option value="早退">早退</option>
              <option value="遅刻">遅刻</option>
              <option value="有給休暇">有給休暇</option>
              <option value="休日出勤">休日出勤</option>
              <option value="振替出勤">振替出勤</option>
            </select>
          </div>
          <div>
            <label className="block mb-1 font-medium text-gray-700">社員名:</label>
            <input 
              type="text" 
              name="employeeName" 
              value={attendance.employeeName} 
              readOnly 
              className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100" 
            />
          </div>
          {!isLeaveType && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-2 font-medium text-gray-700">出社時間:</label>
                <div className="flex">
                  <select 
                    name="startTimeHour" 
                    value={parseTime(attendance.startTime).hour || ''}
                    onChange={(e) => {
                      const hour = e.target.value;
                      const { minute } = parseTime(attendance.startTime);
                      handleCustomTimeChange('startTime', formatTime(hour, minute || '00'));
                    }}
                    className="flex-1 p-3 border border-gray-300 rounded-l-lg bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">時間</option>
                    {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(hour => (
                      <option key={hour} value={hour}>{hour}時</option>
                    ))}
                  </select>
                  <select 
                    name="startTimeMinute" 
                    value={parseTime(attendance.startTime).minute || ''}
                    onChange={(e) => {
                      const minute = e.target.value;
                      const { hour } = parseTime(attendance.startTime);
                      handleCustomTimeChange('startTime', formatTime(hour || '09', minute));
                    }}
                    className="flex-1 p-3 border border-l-0 border-gray-300 rounded-r-lg bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">分</option>
                    {['00', '15', '30', '45'].map(minute => (
                      <option key={minute} value={minute}>{minute}分</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block mb-2 font-medium text-gray-700">退社時間:</label>
                <div className="flex">
                  <select 
                    name="endTimeHour" 
                    value={parseTime(attendance.endTime).hour || ''}
                    onChange={(e) => {
                      const hour = e.target.value;
                      const { minute } = parseTime(attendance.endTime);
                      handleCustomTimeChange('endTime', formatTime(hour, minute || '00'));
                    }}
                    className="flex-1 p-3 border border-gray-300 rounded-l-lg bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">時間</option>
                    {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(hour => (
                      <option key={hour} value={hour}>{hour}時</option>
                    ))}
                  </select>
                  <select 
                    name="endTimeMinute" 
                    value={parseTime(attendance.endTime).minute || ''}
                    onChange={(e) => {
                      const minute = e.target.value;
                      const { hour } = parseTime(attendance.endTime);
                      handleCustomTimeChange('endTime', formatTime(hour || '18', minute));
                    }}
                    className="flex-1 p-3 border border-l-0 border-gray-300 rounded-r-lg bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">分</option>
                    {['00', '15', '30', '45'].map(minute => (
                      <option key={minute} value={minute}>{minute}分</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 休憩記録フォーム */}
      {!isLeaveType && (
        <section className="bg-gray-50 p-4 rounded-lg mt-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            休憩記録
          </h3>
          {breakRecords.map((record, index) => (
            <div key={index} className="mb-4 bg-white p-4 rounded-lg shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 font-medium text-gray-700">休憩開始:</label>
                  <div className="flex">
                    <select 
                      name="breakStartHour" 
                      value={parseTime(record.breakStart).hour || ''}
                      onChange={(e) => {
                        const hour = e.target.value;
                        const { minute } = parseTime(record.breakStart);
                        handleBreakCustomTimeChange(index, 'breakStart', formatTime(hour, minute || '00'));
                      }}
                      className="flex-1 p-3 border border-gray-300 rounded-l-lg bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="">時間</option>
                      {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(hour => (
                        <option key={hour} value={hour}>{hour}時</option>
                      ))}
                    </select>
                    <select 
                      name="breakStartMinute" 
                      value={parseTime(record.breakStart).minute || ''}
                      onChange={(e) => {
                        const minute = e.target.value;
                        const { hour } = parseTime(record.breakStart);
                        handleBreakCustomTimeChange(index, 'breakStart', formatTime(hour || '12', minute));
                      }}
                      className="flex-1 p-3 border border-l-0 border-gray-300 rounded-r-lg bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="">分</option>
                      {['00', '15', '30', '45'].map(minute => (
                        <option key={minute} value={minute}>{minute}分</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block mb-2 font-medium text-gray-700">休憩終了:</label>
                  <div className="flex">
                    <select 
                      name="breakEndHour" 
                      value={parseTime(record.breakEnd).hour || ''}
                      onChange={(e) => {
                        const hour = e.target.value;
                        const { minute } = parseTime(record.breakEnd);
                        handleBreakCustomTimeChange(index, 'breakEnd', formatTime(hour, minute || '00'));
                      }}
                      className="flex-1 p-3 border border-gray-300 rounded-l-lg bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="">時間</option>
                      {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(hour => (
                        <option key={hour} value={hour}>{hour}時</option>
                      ))}
                    </select>
                    <select 
                      name="breakEndMinute" 
                      value={parseTime(record.breakEnd).minute || ''}
                      onChange={(e) => {
                        const minute = e.target.value;
                        const { hour } = parseTime(record.breakEnd);
                        handleBreakCustomTimeChange(index, 'breakEnd', formatTime(hour || '13', minute));
                      }}
                      className="flex-1 p-3 border border-l-0 border-gray-300 rounded-r-lg bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="">分</option>
                      {['00', '15', '30', '45'].map(minute => (
                        <option key={minute} value={minute}>{minute}分</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              {breakRecords.length > 1 && (
                <button 
                  type="button" 
                  onClick={() => onRemoveBreak(index)}
                  className="w-full mt-3 bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 transition flex items-center justify-center space-x-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                  <span>この休憩を削除</span>
                </button>
              )}
            </div>
          ))}
          <button 
            type="button" 
            onClick={onAddBreak} 
            className="w-full bg-green-50 text-green-600 p-3 rounded-lg hover:bg-green-100 transition flex items-center justify-center space-x-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            <span>休憩を追加</span>
          </button>
        </section>
      )}

      {/* 勤務時間サマリー */}
      {!isLeaveType && timeDetails && (
        <section className="mt-6 bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
              勤務時間サマリー
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 flex justify-between items-center">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <p className="text-blue-700">総勤務時間</p>
                </div>
                <p className="text-lg font-bold text-blue-800">{timeDetails.workTime}</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 flex justify-between items-center">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-amber-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <p className="text-amber-700">休憩時間</p>
                </div>
                <p className="text-lg font-bold text-amber-800">{timeDetails.breakTime}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 flex justify-between items-center border-2 border-green-100">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <p className="text-green-700">実労働時間</p>
                </div>
                <p className="text-lg font-bold text-green-800">{timeDetails.totalTime}</p>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
} 