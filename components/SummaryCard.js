import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, ResponsiveContainer } from 'recharts';

const SummaryCard = ({
  currentDate,
  userData,
  userSchedules,
  standardHours = 160,
  parseJapaneseTimeString,
  timeToHoursAndMinutes
}) => {
  // サマリーカードの開閉状態を管理するステート（初期値はfalse=閉じた状態）
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  
  // 計算結果を保持するステート
  const [actualHoursValue, setActualHoursValue] = useState(0);
  const [plannedHoursValue, setPlannedHoursValue] = useState(0);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [workTypeData, setWorkTypeData] = useState([]);
  
  // 開閉を切り替える関数
  const toggleSummary = () => {
    setIsSummaryExpanded(prev => !prev);
  };

  /**
   * 日付文字列を標準形式に変換する（YYYY-MM-DD）
   * @param {Date} date - 日付オブジェクト
   * @returns {string} YYYY-MM-DD形式の日付文字列
   */
  const formatDateToString = (date) => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD形式
  };

  /**
   * 実勤務時間計算関数
   * @param {Array} schedules - スケジュールデータの配列
   * @param {Date} date - 選択された月の日付
   * @param {string} userName - ユーザー名
   * @returns {number} 合計勤務時間（時間単位）
   * 
   * 【計算条件】
   * 1. 選択されたユーザーとユーザーの名前と一致するデータ
   * 2. 選択されている月の前月21日から当月20日までの期間のデータ
   * 3. 種別が"出勤簿"のデータ
   * 4. G列（勤務時間）の値を集計
   */
  const calculateActualWorkingHoursForClock = useCallback((schedules, date, userName) => {
    if (!schedules || !Array.isArray(schedules) || !userName) return 0;
    
    // データソースのサンプルを出力（最大5件）
    console.log('実勤務時間計算 - 入力データサンプル:', 
      schedules.slice(0, 5).map(s => Array.isArray(s) ? {
        date: s[0],
        name: s[1],
        type: s[5],
        hours: s[6]
      } : s)
    );
    
    console.log('計算対象ユーザー:', userName);

    let totalMinutes = 0;
    const selectedMonth = date.getMonth();
    const selectedYear = date.getFullYear();
    
    // ===== 期間設定: 前月21日から当月20日まで =====
    let startMonth = selectedMonth - 1;
    let startYear = selectedYear;
    if (startMonth < 0) {
      startMonth = 11; // 12月 (0ベースなので11)
      startYear = selectedYear - 1;
    }
    
    const startDate = new Date(startYear, startMonth, 21, 0, 0, 0);
    const endDate = new Date(selectedYear, selectedMonth, 20, 23, 59, 59);

    const startDateStr = formatDateToString(startDate);
    const endDateStr = formatDateToString(endDate);

    console.log(`実勤務時間計算期間 (${userName}):`, 
      startDate.toLocaleDateString(), '〜', 
      endDate.toLocaleDateString(),
      `(${startDateStr} 〜 ${endDateStr})`
    );

    // 重複排除のための日付管理オブジェクト
    const processedDates = {};
    
    // 対象データのフィルタリング（重複を排除）
    const targetSchedules = [];
    let skippedCount = 0;
    let invalidDateCount = 0;
    let matchedBeforeDedup = 0;
    
    // データフィルタリング前の総件数
    console.log('フィルタリング前の総データ数:', schedules.length);
    
    schedules.forEach(schedule => {
      if (!Array.isArray(schedule) || schedule.length < 7) {
        skippedCount++;
        return;
      }
      if (!schedule[0] || !schedule[1] || !schedule[5] || !schedule[6]) {
        skippedCount++;
        return;
      }
      
      try {
        // 日付文字列を明示的にパース - YYYY-MM-DD形式を想定
        let scheduleDate;
        
        if (typeof schedule[0] === 'string') {
          // 日付文字列のフォーマットをログ出力
          if (targetSchedules.length < 3) {
            console.log('日付文字列フォーマット:', schedule[0]);
          }
          
          // ISO形式（YYYY-MM-DD）の場合
          if (schedule[0].match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = schedule[0].split('-').map(Number);
            scheduleDate = new Date(year, month - 1, day, 12, 0, 0); // 正午に設定して日付の問題を回避
          } else {
            // その他の形式の場合は直接Dateコンストラクタを使用
            scheduleDate = new Date(schedule[0]);
          }
        } else {
          scheduleDate = new Date(schedule[0]);
        }
        
        if (isNaN(scheduleDate.getTime())) {
          invalidDateCount++;
          return;
        }

        const dateKey = formatDateToString(scheduleDate);
        
        // ===== 条件に一致するデータのみ処理 =====
        const isInDateRange = scheduleDate >= startDate && scheduleDate <= endDate;    // 期間条件
        const isMatchingUser = schedule[1] === userName;                               // ユーザー一致条件
        const isClockbookRecord = schedule[5] === '出勤簿';                            // 出勤簿種別条件
        const hasWorkingHours = schedule[6] && typeof schedule[6] === 'string';        // 勤務時間あり条件

        // 条件判定のデバッグ（最初の数件のみ）
        if (targetSchedules.length < 3 && isMatchingUser) {
          console.log('条件判定:', {
            date: dateKey,
            inRange: isInDateRange,
            matchUser: isMatchingUser,
            isClock: isClockbookRecord,
            hasHours: hasWorkingHours,
            hours: schedule[6] || 'なし'
          });
        }

        if (isInDateRange && isMatchingUser && isClockbookRecord && hasWorkingHours) {
          matchedBeforeDedup++;
          
          // 日付ベースでの重複排除（同一日の重複データは最初の1件のみ使用）
          if (!processedDates[dateKey]) {
            processedDates[dateKey] = true;
            targetSchedules.push(schedule);
          } else {
            console.log(`重複データをスキップ - 出勤簿: ${dateKey} - ${schedule[6]}`);
          }
        }
      } catch (e) {
        console.error('データフィルタリング中にエラー:', e);
      }
    });

    console.log('フィルタリング統計:', {
      スキップ件数: skippedCount,
      無効な日付: invalidDateCount,
      重複除去前の一致件数: matchedBeforeDedup,
      最終対象件数: targetSchedules.length
    });

    console.log(`実勤務集計対象データ (${userName}):`, targetSchedules.map(s => ({
      date: s[0],
      hours: s[6]
    })));
    
    // フィルタリングされたデータの合計時間を計算
    let processedHours = [];
    targetSchedules.forEach(schedule => {
      try {
        // G列の勤務時間データを数値に変換
        const workHours = parseJapaneseTimeString(schedule[6]);
        totalMinutes += Math.round(workHours * 60);  // 時間を分に変換して加算
        
        // 処理した時間をログに記録
        processedHours.push({
          date: schedule[0],
          original: schedule[6],
          parsed: workHours,
          minutes: Math.round(workHours * 60)
        });
      } catch (e) {
        console.error('実勤務時間計算エラー:', e);
      }
    });
    
    // 処理した時間の詳細をログ出力
    console.log('処理した実勤務時間:', processedHours);
    
    // 分を時間に変換して返す
    const totalHours = totalMinutes / 60;
    console.log(`実勤務時間合計 (${userName}):`, totalHours.toFixed(1), '時間 (', totalMinutes, '分)');
    return totalHours;
  }, [parseJapaneseTimeString]);

  /**
   * 予定勤務時間計算関数
   * @param {Array} schedules - スケジュールデータの配列
   * @param {Date} date - 選択された月の日付
   * @param {string} userName - ユーザー名
   * @returns {number} 合計勤務時間（時間単位）
   * 
   * 【計算条件】
   * 1. 選択されたユーザーとユーザーの名前と一致するデータ
   * 2. 選択されている月の前月21日から当月20日までの期間のデータ
   * 3. 種別が"予定"のデータ
   * 4. G列（勤務時間）の値を集計
   */
  const calculatePlannedWorkingHours = useCallback((schedules, date, userName) => {
    if (!schedules || !Array.isArray(schedules) || !userName) return 0;
    
    // データソースのサンプルを出力（最大5件）
    console.log('予定勤務時間計算 - 入力データサンプル:', 
      schedules.slice(0, 5).map(s => Array.isArray(s) ? {
        date: s[0],
        name: s[1],
        type: s[5],
        hours: s[6]
      } : s)
    );
    
    let totalMinutes = 0;
    const selectedMonth = date.getMonth();
    const selectedYear = date.getFullYear();
    
    // ===== 期間設定: 前月21日から当月20日まで =====
    let startMonth = selectedMonth - 1;
    let startYear = selectedYear;
    if (startMonth < 0) {
      startMonth = 11; // 12月 (0ベースなので11)
      startYear = selectedYear - 1;
    }
    
    const startDate = new Date(startYear, startMonth, 21, 0, 0, 0);
    const endDate = new Date(selectedYear, selectedMonth, 20, 23, 59, 59);

    const startDateStr = formatDateToString(startDate);
    const endDateStr = formatDateToString(endDate);

    console.log(`予定勤務時間計算期間 (${userName}):`, 
      startDate.toLocaleDateString(), '〜', 
      endDate.toLocaleDateString(),
      `(${startDateStr} 〜 ${endDateStr})`
    );

    // 重複排除のための日付管理オブジェクト
    const processedDates = {};
    
    // 対象データのフィルタリング（重複を排除）
    const targetSchedules = [];
    let skippedCount = 0;
    let invalidDateCount = 0;
    let matchedBeforeDedup = 0;
    
    schedules.forEach(schedule => {
      if (!Array.isArray(schedule) || schedule.length < 7) {
        skippedCount++;
        return;
      }
      if (!schedule[0] || !schedule[1] || !schedule[5] || !schedule[6]) {
        skippedCount++;
        return;
      }
      
      try {
        // 日付文字列を明示的にパース - YYYY-MM-DD形式を想定
        let scheduleDate;
        
        if (typeof schedule[0] === 'string') {
          // ISO形式（YYYY-MM-DD）の場合
          if (schedule[0].match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = schedule[0].split('-').map(Number);
            scheduleDate = new Date(year, month - 1, day, 12, 0, 0); // 正午に設定して日付の問題を回避
          } else {
            // その他の形式の場合は直接Dateコンストラクタを使用
            scheduleDate = new Date(schedule[0]);
          }
        } else {
          scheduleDate = new Date(schedule[0]);
        }
        
        if (isNaN(scheduleDate.getTime())) {
          invalidDateCount++;
          return;
        }

        const dateKey = formatDateToString(scheduleDate);
        
        // ===== 条件に一致するデータのみ処理 =====
        const isInDateRange = scheduleDate >= startDate && scheduleDate <= endDate;    // 期間条件
        const isMatchingUser = schedule[1] === userName;                               // ユーザー一致条件
        const isPlannedRecord = schedule[5] === '予定';                                // 予定種別条件
        const hasWorkingHours = schedule[6] && typeof schedule[6] === 'string';        // 勤務時間あり条件

        // 条件判定のデバッグ（最初の数件のみ）
        if (targetSchedules.length < 3 && isMatchingUser) {
          console.log('予定・条件判定:', {
            date: dateKey,
            inRange: isInDateRange,
            matchUser: isMatchingUser,
            isPlanned: isPlannedRecord,
            hasHours: hasWorkingHours,
            hours: schedule[6] || 'なし'
          });
        }

        if (isInDateRange && isMatchingUser && isPlannedRecord && hasWorkingHours) {
          matchedBeforeDedup++;
          
          // 日付ベースでの重複排除（同一日の重複データは最初の1件のみ使用）
          if (!processedDates[dateKey]) {
            processedDates[dateKey] = true;
            targetSchedules.push(schedule);
          } else {
            console.log(`重複データをスキップ - 予定: ${dateKey} - ${schedule[6]}`);
          }
        }
      } catch (e) {
        console.error('データフィルタリング中にエラー:', e);
      }
    });

    console.log('予定フィルタリング統計:', {
      スキップ件数: skippedCount,
      無効な日付: invalidDateCount,
      重複除去前の一致件数: matchedBeforeDedup,
      最終対象件数: targetSchedules.length
    });

    console.log(`予定勤務集計対象データ (${userName}):`, targetSchedules.map(s => ({
      date: s[0],
      hours: s[6]
    })));
    
    // フィルタリングされたデータの合計時間を計算
    let processedHours = [];
    targetSchedules.forEach(schedule => {
      try {
        // G列の勤務時間データを数値に変換
        const workHours = parseJapaneseTimeString(schedule[6]);
        totalMinutes += Math.round(workHours * 60);  // 時間を分に変換して加算
        
        // 処理した時間をログに記録
        processedHours.push({
          date: schedule[0],
          original: schedule[6],
          parsed: workHours,
          minutes: Math.round(workHours * 60)
        });
      } catch (e) {
        console.error('予定勤務時間計算エラー:', e);
      }
    });
    
    // 処理した時間の詳細をログ出力
    console.log('処理した予定勤務時間:', processedHours);
    
    // 分を時間に変換して返す
    const totalHours = totalMinutes / 60;
    console.log(`予定勤務時間合計 (${userName}):`, totalHours.toFixed(1), '時間 (', totalMinutes, '分)');
    return totalHours;
  }, [parseJapaneseTimeString]);

  // 月間進捗率を計算する関数
  const calculateProgressPercentage = useCallback((actual, planned, standardHours) => {
    if (planned <= 0) return 0;
    
    const percent = (actual / planned) * 100;
    return Math.min(100, Math.max(0, Math.round(percent))); // 0〜100の範囲に制限
  }, []);

  // サマリーカード用の期間表示（21日〜20日）
  const getPayrollPeriod = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // 前月21日
    const startDate = new Date(year, month - 1, 21);
    
    // 当月20日
    const endDate = new Date(year, month, 20);
    
    // 年をまたぐ場合の処理
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth() + 1; // JavaScriptの月は0始まり
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth() + 1;
    
    // 年月日の形式で返す
    return `${startYear}年${startMonth}月21日〜${endYear}年${endMonth}月20日`;
  };

  // 勤務種別ごとのデータを集計（円グラフ用）
  const calculateWorkTypeData = useCallback(() => {
    if (!userData || !userSchedules || !Array.isArray(userSchedules)) return [];
    
    const typeCount = {};
    const selectedMonth = currentDate.getMonth();
    const selectedYear = currentDate.getFullYear();
    
    // 期間設定（カウント集計用も前月21日から当月20日までに統一）
    let startMonth = selectedMonth - 1;
    let startYear = selectedYear;
    if (startMonth < 0) {
      startMonth = 11;
      startYear = selectedYear - 1;
    }
    
    const startDate = new Date(startYear, startMonth, 21, 0, 0, 0);
    const endDate = new Date(selectedYear, selectedMonth, 20, 23, 59, 59);
    
    userSchedules.forEach(schedule => {
      if (!Array.isArray(schedule)) return;
      
      try {
        // 日付パース
        let scheduleDate;
        if (typeof schedule[0] === 'string') {
          if (schedule[0].match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = schedule[0].split('-').map(Number);
            scheduleDate = new Date(year, month - 1, day, 12, 0, 0);
          } else {
            scheduleDate = new Date(schedule[0]);
          }
        } else {
          scheduleDate = new Date(schedule[0]);
        }
        
        if (isNaN(scheduleDate.getTime())) return;
        
        // 期間内のデータのみ対象
        const isInDateRange = scheduleDate >= startDate && scheduleDate <= endDate;
        const isMatchingUser = schedule[1] === userData.data[0]; 
        
        if (isInDateRange && isMatchingUser) {
          const workType = schedule[4] || '未設定';
          typeCount[workType] = (typeCount[workType] || 0) + 1;
        }
      } catch (e) {
        console.error('勤務種別集計エラー:', e);
      }
    });
    
    // デフォルトの色マップを定義
    const colors = {
      '出勤': '#3b82f6',
      '在宅': '#10b981',
      '休暇': '#8b5cf6',
      '公休': '#6b7280',
      '有給休暇': '#f59e0b',
      '半休': '#ec4899',
      '移動': '#ef4444',
      '未設定': '#9ca3af',
      'default': '#9ca3af'  // デフォルト色
    };
    
    // データの整形
    return Object.entries(typeCount)
      .filter(([type, count]) => type && count) // 無効データをフィルタリング
      .map(([type, count]) => ({
        name: type || '未設定',
        value: count || 0,
        fill: colors[type] || colors['default']
      }));
  }, [currentDate, userData, userSchedules]);

  // 計算を行うためのuseEffect - コンポーネントがマウントされた時と、
  // 依存配列の値が変わった時だけ実行され、結果をステートに保存する
  useEffect(() => {
    if (userData && userSchedules?.length > 0) {
      // データが揃った時だけ計算を実行
      console.log('SummaryCard: 計算開始 - ユーザー:', userData?.data[0], '月:', currentDate.getFullYear() + '年' + (currentDate.getMonth() + 1) + '月');
      
      const actualHours = calculateActualWorkingHoursForClock(userSchedules, currentDate, userData.data[0]);
      const plannedHours = calculatePlannedWorkingHours(userSchedules, currentDate, userData.data[0]);
      const progress = calculateProgressPercentage(actualHours, plannedHours, standardHours);
      const typeData = calculateWorkTypeData();
      
      // 計算結果をステートに保存
      setActualHoursValue(actualHours);
      setPlannedHoursValue(plannedHours);
      setProgressPercentage(progress);
      setWorkTypeData(typeData);
      
      console.log('SummaryCard: 計算結果', {
        実勤務時間: actualHours.toFixed(1),
        予定勤務時間: plannedHours.toFixed(1),
        標準時間: standardHours.toFixed(1),
        進捗率: `${progress}%`,
        月: currentDate.getFullYear() + '年' + (currentDate.getMonth() + 1) + '月'
      });
    }
  }, [
    userData, 
    userSchedules, 
    currentDate, 
    standardHours, 
    calculateActualWorkingHoursForClock, 
    calculatePlannedWorkingHours, 
    calculateProgressPercentage,
    calculateWorkTypeData
  ]);
  
  const IOS_OPTIMIZE_CLASS = "transform translate3d(0,0,0) backface-visibility-hidden";
  const IOS_TEXT_CLASS = "translate3d(0,0,0)";

  return (
    <div className={`bg-white rounded-lg shadow-md mb-4 overflow-hidden ${IOS_OPTIMIZE_CLASS}`}>
      {/* コンパクト化したヘッダー部分 */}
      <div 
        className="bg-blue-600 text-white p-2.5 cursor-pointer flex justify-between items-center"
        onClick={toggleSummary}
      >
        <div className="flex flex-col w-full">
          <div className="flex flex-col sm:flex-row sm:items-center">
            <h2 className={`text-base font-semibold ${IOS_TEXT_CLASS}`}>
              {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月度の勤務概要
            </h2>
            <span className={`text-xs bg-blue-500 text-blue-50 px-2 py-0.5 rounded mt-1 sm:mt-0 sm:ml-2 inline-block ${IOS_TEXT_CLASS}`}>
              {getPayrollPeriod(currentDate)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-4 w-4 transition-transform duration-300 ${isSummaryExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      {/* 開閉するコンテンツ部分 */}
      <div 
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isSummaryExpanded 
            ? 'max-h-[1000px] opacity-100' 
            : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-5">
          {/* グリッドレイアウトをスマホ対応に修正 */}
          <div className="grid grid-cols-1 gap-6">
            {/* 勤務時間の棒グラフ */}
            <div className="bg-gray-50 rounded-lg p-4 shadow-sm">
              <h3 className="text-md font-medium text-gray-700 mb-2">勤務時間分析</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={[
                    {
                      name: '計画',
                      時間: parseFloat(plannedHoursValue.toFixed(1)),
                      color: '#3b82f6'
                    },
                    {
                      name: '実績',
                      時間: parseFloat(actualHoursValue.toFixed(1)),
                      color: '#10b981'
                    },
                    {
                      name: '標準',
                      時間: parseFloat(standardHours?.toFixed(1) || 0),
                      color: '#6b7280'
                    }
                  ]}
                  margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis unit="h" tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value) => [`${value}時間`, '勤務時間']}
                    labelStyle={{ fontWeight: 'bold' }}
                    contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}
                  />
                  <Bar dataKey="時間" radius={[4, 4, 0, 0]}>
                    {[0, 1, 2].map((index) => (
                      <Cell key={`cell-${index}`} fill={[0, 1, 2][index] === 0 ? '#3b82f6' : [0, 1, 2][index] === 1 ? '#10b981' : '#6b7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              
              <div className="mt-3 grid grid-cols-3 gap-1 text-center text-xs">
                <div className="bg-blue-50 p-2 rounded-md">
                  <div className="font-semibold text-blue-600">計画</div>
                  <div className="text-lg mt-1">{plannedHoursValue.toFixed(1)}h</div>
                </div>
                <div className="bg-green-50 p-2 rounded-md">
                  <div className="font-semibold text-green-600">実績</div>
                  <div className="text-lg mt-1">{actualHoursValue.toFixed(1)}h</div>
                </div>
                <div className="bg-gray-50 p-2 rounded-md">
                  <div className="font-semibold text-gray-600">標準</div>
                  <div className="text-lg mt-1">{standardHours?.toFixed(1) || 0}h</div>
                </div>
              </div>
            </div>
            
            {/* 勤務種別の円グラフ */}
            <div className="bg-gray-50 rounded-lg p-4 shadow-sm">
              <h3 className="text-md font-medium text-gray-700 mb-2">勤務種別内訳</h3>
              <div className="h-[180px]">
                {workTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={workTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                        label={false}
                        labelLine={false}
                      >
                        {workTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value}日`, '日数']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[180px] text-gray-400">
                    データがありません
                  </div>
                )}
              </div>
              
              {/* 凡例部分 */}
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2 text-xs">
                {workTypeData.map((entry, index) => (
                  <div key={index} className="flex items-center bg-white px-2 py-1 rounded-md shadow-sm">
                    <div className="w-3 h-3 rounded-full mr-1.5 flex-shrink-0" style={{ backgroundColor: entry.fill }}></div>
                    <span className="truncate font-medium">{entry.name}</span>
                    <span className="ml-auto text-gray-600">{entry.value}日</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* 進捗状況表示 */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4 shadow-sm">
            <h3 className="text-md font-medium text-gray-700 mb-3">月間進捗状況</h3>
            <div className="relative pt-1">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-xs font-semibold inline-block text-blue-600">
                    勤務時間進捗
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-blue-600">
                    {progressPercentage}%
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 text-xs flex rounded bg-blue-200">
                <div 
                  style={{ width: `${progressPercentage}%` }} 
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                今月の予定勤務時間に対する実績: {actualHoursValue.toFixed(1)}h / {plannedHoursValue.toFixed(1)}h
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 閉じた状態でのサマリー表示（コンパクト版） */}
      <div 
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isSummaryExpanded 
            ? 'max-h-0 opacity-0' 
            : 'max-h-16 opacity-100 p-2'
        }`}
      >
        <div className="flex justify-between items-center text-sm">
          <div className="flex flex-wrap gap-3">
            <div className="bg-blue-50 px-2 py-1 rounded">
              <span className="text-xs text-gray-500">計画:</span>
              <span className="font-medium ml-1 text-blue-700">
                {plannedHoursValue.toFixed(1)}h
              </span>
            </div>
            <div className="bg-green-50 px-2 py-1 rounded">
              <span className="text-xs text-gray-500">実績:</span>
              <span className="font-medium ml-1 text-green-700">
                {actualHoursValue.toFixed(1)}h
              </span>
            </div>
            <div className="bg-gray-50 px-2 py-1 rounded">
              <span className="text-xs text-gray-500">標準:</span>
              <span className="font-medium ml-1 text-gray-700">
                {standardHours.toFixed(1)}h
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryCard; 