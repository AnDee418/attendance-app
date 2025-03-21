import React, { useEffect, useState } from 'react';

export default function AttendanceForm({
  attendance,
  breakRecords,
  onAttendanceChange,
  onBreakChange,
  onAddBreak,
  onRemoveBreak,
  onWorkTypeChange,
  isPartTimer = false
}) {
  // 新しい休憩入力用のローカルステート
  const [newBreak, setNewBreak] = useState({
    breakStart: '',
    breakEnd: '',
    recordType: attendance.recordType || '出勤簿'
  });

  // 休憩時間入力後の自動追加処理を追加
  useEffect(() => {
    // 両方の時間が入力されている場合のみ自動追加
    if (newBreak.breakStart && newBreak.breakEnd) {
      const startDate = new Date(`2000/01/01 ${newBreak.breakStart}`);
      const endDate = new Date(`2000/01/01 ${newBreak.breakEnd}`);
      
      // 有効な時間範囲（開始時間が終了時間より前）の場合のみ追加
      if (startDate < endDate) {
        onAddBreak({
          breakStart: newBreak.breakStart, 
          breakEnd: newBreak.breakEnd, 
          recordType: attendance.recordType || '出勤簿'
        });
        
        // 入力欄をリセット
        setNewBreak({
          breakStart: '',
          breakEnd: '',
          recordType: attendance.recordType || '出勤簿'
        });
      }
    }
  }, [newBreak.breakStart, newBreak.breakEnd]);

  // 削除確認用の機能
  const handleBreakDelete = (index) => {
    // モバイルフレンドリーな確認
    if (window.confirm('この休憩時間を削除しますか？')) {
      onRemoveBreak(index);
    }
  };

  // recordTypeが変わったら更新
  useEffect(() => {
    setNewBreak(prev => ({
      ...prev,
      recordType: attendance.recordType || '出勤簿'
    }));
  }, [attendance.recordType]);

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

  // 時間フォーマット用の関数
  const parseTime = (timeString) => {
    if (!timeString) return { hour: '', minute: '' };
    const [hour, minute] = timeString.split(':');
    return { hour, minute };
  };

  // 選択した時間と分から時刻文字列を生成
  const formatTime = (hour, minute) => {
    if (!hour && !minute) return '';
    return `${hour}:${minute}`;
  };

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

  // よく使う時間のグリッド
  const commonTimes = generateTimeGrid();

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

  // 時間の刻みを生成する関数を追加
  const getMinuteOptions = () => {
    return isPartTimer 
      ? ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'] // アルバイトは5分刻み
      : ['00', '15', '30', '45']; // 通常ユーザーは15分刻み
  };

  // 休憩時間の自動追加処理（useEffectではなく、時間選択後に直接実行）
  const handleBreakTimeChange = (field, value) => {
    const updatedBreak = { ...newBreak, [field]: value };
    setNewBreak(updatedBreak);
    
    // 両方の時間が入力されているか確認
    if (updatedBreak.breakStart && updatedBreak.breakEnd) {
      const startDate = new Date(`2000/01/01 ${updatedBreak.breakStart}`);
      const endDate = new Date(`2000/01/01 ${updatedBreak.breakEnd}`);
      
      // 有効な時間範囲（開始時間が終了時間より前）の場合のみ追加
      if (startDate < endDate) {
        // 少し遅延させて追加（UIの更新を確実にするため）
        setTimeout(() => {
          onAddBreak({
            breakStart: updatedBreak.breakStart, 
            breakEnd: updatedBreak.breakEnd, 
            recordType: attendance.recordType || '出勤簿'
          });
          
          // 入力欄をリセット
          setNewBreak({
            breakStart: '',
            breakEnd: '',
            recordType: attendance.recordType || '出勤簿'
          });
        }, 100);
      }
    }
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
              onChange={handleWorkTypeChange}
              required 
              className="w-full p-3 border border-gray-300 rounded-lg bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              {getWorkTypeOptions().map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
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
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <select 
                      name="startTimeHour" 
                      value={parseTime(attendance.startTime).hour || ''}
                      onChange={(e) => {
                        const hour = e.target.value;
                        const { minute } = parseTime(attendance.startTime);
                        handleCustomTimeChange('startTime', formatTime(hour, minute || '00'));
                      }}
                      className="w-full py-3 px-4 appearance-none bg-blue-50 border border-blue-200 rounded-lg text-center text-blue-700 font-medium text-lg shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="">時</option>
                      {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(hour => (
                        <option key={hour} value={hour}>{hour}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <div className="relative">
                    <select 
                      name="startTimeMinute" 
                      value={parseTime(attendance.startTime).minute || ''}
                      onChange={(e) => {
                        const minute = e.target.value;
                        const { hour } = parseTime(attendance.startTime);
                        handleCustomTimeChange('startTime', formatTime(hour || '09', minute));
                      }}
                      className="w-full py-3 px-4 appearance-none bg-blue-50 border border-blue-200 rounded-lg text-center text-blue-700 font-medium text-lg shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="">分</option>
                      {getMinuteOptions().map(minute => (
                        <option key={minute} value={minute}>{minute}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block mb-2 font-medium text-gray-700">退社時間:</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <select 
                      name="endTimeHour" 
                      value={parseTime(attendance.endTime).hour || ''}
                      onChange={(e) => {
                        const hour = e.target.value;
                        const { minute } = parseTime(attendance.endTime);
                        handleCustomTimeChange('endTime', formatTime(hour, minute || '00'));
                      }}
                      className="w-full py-3 px-4 appearance-none bg-blue-50 border border-blue-200 rounded-lg text-center text-blue-700 font-medium text-lg shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="">時</option>
                      {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(hour => (
                        <option key={hour} value={hour}>{hour}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <div className="relative">
                    <select 
                      name="endTimeMinute" 
                      value={parseTime(attendance.endTime).minute || ''}
                      onChange={(e) => {
                        const minute = e.target.value;
                        const { hour } = parseTime(attendance.endTime);
                        handleCustomTimeChange('endTime', formatTime(hour || '18', minute));
                      }}
                      className="w-full py-3 px-4 appearance-none bg-blue-50 border border-blue-200 rounded-lg text-center text-blue-700 font-medium text-lg shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="">分</option>
                      {getMinuteOptions().map(minute => (
                        <option key={minute} value={minute}>{minute}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
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
          
          {/* 休憩記録のサマリー表示 */}
          {breakRecords.length > 0 && (
            <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  休憩時間サマリー
                </span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  {breakRecords.filter(record => 
                    record.breakStart && 
                    record.breakEnd && 
                    record.recordType === (attendance.recordType || '出勤簿')
                  ).length}件の休憩
                </span>
              </div>
              {/* 有効な実績休憩レコードの件数を確認 */}
              {breakRecords.filter(record => 
                record.breakStart && 
                record.breakEnd && 
                record.recordType === (attendance.recordType || '出勤簿')
              ).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {breakRecords
                    .filter(record => 
                      record.breakStart && 
                      record.breakEnd && 
                      record.recordType === (attendance.recordType || '出勤簿')
                    )
                    .map((record, displayIdx) => {
                      // 元の配列内でのインデックスを取得
                      const actualIndex = breakRecords.findIndex(r => 
                        r.breakStart === record.breakStart && 
                        r.breakEnd === record.breakEnd &&
                        r.recordType === record.recordType
                      );
                      
                      return (
                        <div key={displayIdx} className="px-3 py-2 bg-white rounded-md shadow-sm border border-blue-200 flex items-center gap-2">
                          <span className="text-sm text-blue-700 whitespace-nowrap font-medium">
                            {record.breakStart}-{record.breakEnd}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleBreakDelete(actualIndex)}
                            className="text-red-500 w-7 h-7 flex items-center justify-center rounded-full bg-red-50 active:bg-red-100 transition-colors border border-red-100"
                            aria-label="休憩を削除"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      );
                    })
                  }
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center">登録されている休憩はありません</p>
              )}
            </div>
          )}
          
          {/* 新しい休憩記録フォーム - スマホ最適化版 */}
          <div className="mb-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="mb-2 text-sm font-medium text-gray-700 flex items-center">
              <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              新しい休憩を追加
            </div>
            
            {/* スマホ向け時間選択UI - 休憩開始時間 */}
            <div className="mb-3">
              <label className="block mb-1 text-sm font-medium text-gray-700">休憩開始:</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <select 
                    name="newBreakStartHour" 
                    value={newBreak.breakStart.split(':')[0] || ''}
                    onChange={(e) => {
                      const hour = e.target.value;
                      const minute = newBreak.breakStart.split(':')[1] || '00';
                      handleBreakTimeChange('breakStart', formatTime(hour, minute));
                    }}
                    className="w-full py-3 px-4 appearance-none bg-blue-50 border border-blue-200 rounded-lg text-center text-blue-700 font-medium text-lg shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">時</option>
                    {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(hour => (
                      <option key={hour} value={hour}>{hour}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <div className="relative">
                  <select 
                    name="newBreakStartMinute" 
                    value={newBreak.breakStart.split(':')[1] || ''}
                    onChange={(e) => {
                      const minute = e.target.value;
                      const hour = newBreak.breakStart.split(':')[0] || '12';
                      handleBreakTimeChange('breakStart', formatTime(hour, minute));
                    }}
                    className="w-full py-3 px-4 appearance-none bg-blue-50 border border-blue-200 rounded-lg text-center text-blue-700 font-medium text-lg shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">分</option>
                    {getMinuteOptions().map(minute => (
                      <option key={minute} value={minute}>{minute}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            {/* スマホ向け時間選択UI - 休憩終了時間 */}
            <div className="mb-3">
              <label className="block mb-1 text-sm font-medium text-gray-700">休憩終了:</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <select 
                    name="newBreakEndHour" 
                    value={newBreak.breakEnd.split(':')[0] || ''}
                    onChange={(e) => {
                      const hour = e.target.value;
                      const minute = newBreak.breakEnd.split(':')[1] || '00';
                      handleBreakTimeChange('breakEnd', formatTime(hour, minute));
                    }}
                    className="w-full py-3 px-4 appearance-none bg-blue-50 border border-blue-200 rounded-lg text-center text-blue-700 font-medium text-lg shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">時</option>
                    {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(hour => (
                      <option key={hour} value={hour}>{hour}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <div className="relative">
                  <select 
                    name="newBreakEndMinute" 
                    value={newBreak.breakEnd.split(':')[1] || ''}
                    onChange={(e) => {
                      const minute = e.target.value;
                      const hour = newBreak.breakEnd.split(':')[0] || '13';
                      handleBreakTimeChange('breakEnd', formatTime(hour, minute));
                    }}
                    className="w-full py-3 px-4 appearance-none bg-blue-50 border border-blue-200 rounded-lg text-center text-blue-700 font-medium text-lg shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">分</option>
                    {getMinuteOptions().map(minute => (
                      <option key={minute} value={minute}>{minute}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 選択した休憩時間のプレビュー表示 */}
            {(newBreak.breakStart || newBreak.breakEnd) && (
              <div className="mt-2 mb-3 bg-blue-50 rounded-lg p-2 border border-blue-200">
                <p className="text-sm text-blue-700 flex items-center justify-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  新しい休憩: 
                  <span className="ml-1 font-medium">
                    {newBreak.breakStart || '--:--'} - {newBreak.breakEnd || '--:--'}
                  </span>
                </p>
              </div>
            )}

            {/* 入力方法ガイド - スマホユーザー向け */}
            <div className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-lg p-2 border border-gray-200">
              <p className="flex items-start">
                <svg className="w-4 h-4 mr-1 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>休憩開始と終了時間を両方入力すると自動的に追加されます。削除は各休憩時間の右側にある×ボタンをタップしてください。</span>
              </p>
            </div>
          </div>
          
          {/* 休憩時間の合計表示 */}
          {breakRecords.some(record => record.breakStart && record.breakEnd) && (
            <div className="text-center mt-2 mb-2">
              <div className="inline-block bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium border border-green-100">
                <span className="mr-1">合計休憩時間:</span>
                {(() => {
                  let totalBreakMinutes = 0;
                  breakRecords.forEach(record => {
                    if (record.breakStart && record.breakEnd) {
                      const start = new Date(`2000/01/01 ${record.breakStart}`);
                      const end = new Date(`2000/01/01 ${record.breakEnd}`);
                      totalBreakMinutes += (end - start) / (1000 * 60);
                    }
                  });
                  const hours = Math.floor(totalBreakMinutes / 60);
                  const minutes = Math.floor(totalBreakMinutes % 60);
                  return hours > 0 
                    ? `${hours}時間${minutes > 0 ? `${minutes}分` : ''}`
                    : `${minutes}分`;
                })()}
              </div>
            </div>
          )}
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