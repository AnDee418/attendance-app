import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { ChevronLeftIcon, ChevronRightIcon, FunnelIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { useReactToPrint } from 'react-to-print';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function WorkHoursPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [workHours, setWorkHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]); // ユーザー一覧
  const [selectedUser, setSelectedUser] = useState('');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return {
      year: today.getFullYear(),
      month: today.getMonth() + 1
    };
  });
  const [searchQuery, setSearchQuery] = useState('');

  // 新しい状態を追加
  const [monthlyData, setMonthlyData] = useState({
    dates: [],
    workRecords: {},
    breakRecords: {}
  });

  // ローディング状態の管理を改善
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // 規定労働時間を取得する関数を追加
  const [standardWorkHours, setStandardWorkHours] = useState(null);
  
  // PDF出力用のref
  const printRef = useRef();
  const printSectionRef = useRef();

  // 認証チェック
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }
    if (!session.user?.isAdmin) {
      router.push('/');
      return;
    }
    
    setIsInitialLoading(false);
  }, [session, status, router]);

  // ユーザー一覧の取得
  useEffect(() => {
    if (session?.user?.isAdmin) {
      fetchUsers();
    }
  }, [session]);

  // 勤務時間データの取得
  useEffect(() => {
    if (session?.user?.isAdmin && selectedUser) {
      fetchWorkHours();
    }
  }, [currentMonth, selectedUser, session]);

  // 規定労働時間を取得
  useEffect(() => {
    const fetchStandardWorkHours = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setStandardWorkHours(data.standardWorkHours);
        }
      } catch (error) {
        console.error('規定労働時間の取得に失敗しました:', error);
        setStandardWorkHours(8); // エラー時はデフォルト値として8時間を設定
      }
    };

    fetchStandardWorkHours();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const { data } = await res.json();
        // スプレッドシートのデータを整形
        const formattedUsers = data.map(user => ({
          id: user.data[1], // userIdを使用
          name: user.data[0],
        }));
        setUsers(formattedUsers);
      }
    } catch (error) {
      console.error('ユーザー一覧の取得に失敗しました', error);
    }
  };

  // 日付配列を生成する関数を修正
  const generateDatesArray = (year, month) => {
    const startDate = new Date(year, month - 2, 21); // 前月の21日
    const endDate = new Date(year, month - 1, 20);  // 当月の20日
    const dates = [];
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      dates.push(new Date(date));
    }
    
    return dates;
  };

  // データ取得関数を修正
  const fetchWorkHours = async () => {
    if (!selectedUser) return;

    try {
      setIsDataLoading(true);
      
      // 日付配列の生成
      const dates = generateDatesArray(currentMonth.year, currentMonth.month);
      console.log('Generated dates:', dates);

      // 勤務記録の取得
      const workRes = await fetch('/api/attendance');
      const breakRes = await fetch('/api/break');
      
      if (workRes.ok && breakRes.ok) {
        const workData = await workRes.json();
        const breakData = await breakRes.json();

        // 選択されたユーザーの名前を取得
        const selectedUserName = users.find(user => user.id === selectedUser)?.name;
        console.log('Selected user:', selectedUser, 'User name:', selectedUserName);

        // 勤務記録の整形
        const workRecords = {};
        workData.data.forEach(record => {
          // ヘッダー行をスキップ
          if (record[0] === '日付') return;
          
          if (record[1] === selectedUserName && record[5] === '出勤簿') {
            const dateStr = record[0];
            workRecords[dateStr] = {
              workType: record[4],
              startTime: record[2],
              endTime: record[3],
              totalWork: record[6]
            };
          }
        });

        // 休憩記録の整形
        const breakRecords = {};
        breakData.data.forEach(record => {
          // ヘッダー行をスキップ
          if (record[0] === '日付') return;
          
          if (record[1] === selectedUserName && record[4] === '出勤簿') {
            const dateStr = record[0];
            if (!breakRecords[dateStr]) {
              breakRecords[dateStr] = [];
            }
            breakRecords[dateStr].push({
              startTime: record[2],
              endTime: record[3]
            });
          }
        });

        console.log('Processed work records:', workRecords);
        console.log('Processed break records:', breakRecords);

        setMonthlyData({
          dates,
          workRecords,
          breakRecords
        });
      }
    } catch (error) {
      console.error('データの取得に失敗しました', error);
    } finally {
      setIsDataLoading(false);
    }
  };

  // 休憩時間を計算する関数
  const calculateTotalBreakTime = (breaks) => {
    if (!breaks || breaks.length === 0) return 0;
    
    return breaks.reduce((total, breakTime) => {
      const start = new Date(`2000-01-01 ${breakTime.startTime}`);
      const end = new Date(`2000-01-01 ${breakTime.endTime}`);
      return total + (end - start) / (1000 * 60); // 分単位で計算
    }, 0);
  };

  // 日付をフォーマットする関数
  const formatDate = (date) => {
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    return `${date.getMonth() + 1}/${date.getDate()}(${dayOfWeek})`;
  };

  // テーブルの日付文字列生成を修正
  const formatDateStr = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 1) {
        return { year: prev.year - 1, month: 12 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 12) {
        return { year: prev.year + 1, month: 1 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // サマリー計算用の関数を修正
  const calculateMonthlySummary = () => {
    if (!monthlyData.workRecords || Object.keys(monthlyData.workRecords).length === 0) {
      return {
        totalDays: 0,
        workDays: 0,
        totalWorkHours: 0,
        totalBreakHours: 0,
        overtimeHours: 0,
        workTypes: {}
      };
    }

    // デバッグログを追加
    console.log('Standard work hours:', standardWorkHours);

    const summary = {
      totalDays: monthlyData.dates.length,
      workDays: 0,
      totalWorkHours: 0,
      totalBreakHours: 0,
      overtimeHours: 0,
      workTypes: {}
    };

    monthlyData.dates.forEach(date => {
      const dateStr = formatDateStr(date);
      const workRecord = monthlyData.workRecords[dateStr];
      const breakRecord = monthlyData.breakRecords[dateStr] || [];

      // 勤務種別の集計
      if (workRecord && workRecord.workType) {
        summary.workTypes[workRecord.workType] = (summary.workTypes[workRecord.workType] || 0) + 1;
      }

      if (workRecord && workRecord.workType === '出勤') {
        summary.workDays += 1;
        
        // 実労働時間の計算
        if (workRecord.totalWork) {
          const [hours, minutes] = workRecord.totalWork.split('時間');
          const totalHours = parseInt(hours) + (minutes ? parseInt(minutes.replace('分', '')) / 60 : 0);
          summary.totalWorkHours += totalHours;
        }
      }

      // 休憩時間の計算
      const breakMinutes = calculateTotalBreakTime(breakRecord);
      summary.totalBreakHours += breakMinutes / 60;
    });

    // デバッグログを追加
    console.log('Summary before overtime calc:', {
      workDays: summary.workDays,
      totalWorkHours: summary.totalWorkHours,
      standardWorkHours: standardWorkHours
    });

    // 規定労働時間が未設定の場合のフォールバック
    const effectiveStandardHours = standardWorkHours || 8;
    
    // 月の規定労働時間を計算
    const monthlyStandardHours = effectiveStandardHours * summary.workDays;
    
    // 残業時間を計算（総労働時間 - 月の規定労働時間）
    summary.overtimeHours = Math.max(0, summary.totalWorkHours - monthlyStandardHours);

    // デバッグログを追加
    console.log('Final overtime calculation:', {
      monthlyStandardHours,
      totalWorkHours: summary.totalWorkHours,
      overtimeHours: summary.overtimeHours
    });

    return summary;
  };

  // PDF出力用のハンドラ - html2canvasを使用する方法に変更
  const handlePrintPDF = async () => {
    const userName = users.find(user => user.id === selectedUser)?.name || '';
    const fileName = `勤務記録_${userName}_${currentMonth.year}年${currentMonth.month}月.pdf`;
    
    if (!printSectionRef.current) {
      alert('PDF出力対象のコンテンツが見つかりません。');
      return;
    }
    
    try {
      // ローディング表示
      const loadingDiv = document.createElement('div');
      loadingDiv.style.position = 'fixed';
      loadingDiv.style.top = '0';
      loadingDiv.style.left = '0';
      loadingDiv.style.width = '100%';
      loadingDiv.style.height = '100%';
      loadingDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
      loadingDiv.style.display = 'flex';
      loadingDiv.style.justifyContent = 'center';
      loadingDiv.style.alignItems = 'center';
      loadingDiv.style.zIndex = '9999';
      loadingDiv.innerHTML = '<div style="padding: 20px; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);"><p style="margin: 0; font-size: 16px;">PDFを生成中...</p></div>';
      document.body.appendChild(loadingDiv);
      
      // 印刷用のスタイルを適用
      printSectionRef.current.classList.add('pdf-print-mode');
      
      // HTML要素をキャンバスに変換
      const canvas = await html2canvas(printSectionRef.current, {
        scale: 1.2, // 解像度を少し上げる
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      // 印刷用スタイルを元に戻す
      printSectionRef.current.classList.remove('pdf-print-mode');
      
      // キャンバスをPDFに変換
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // 画像をPDFに配置
      const imgWidth = 287; // A4横サイズ (210mm x 297mm)
      const imgHeight = canvas.height * imgWidth / canvas.width;
      pdf.addImage(imgData, 'PNG', 5, 5, imgWidth, imgHeight);
      
      // PDFを保存
      pdf.save(fileName);
      
      // ローディング表示を削除
      document.body.removeChild(loadingDiv);
    } catch (error) {
      console.error('PDF生成エラー:', error);
      alert('PDFの生成中にエラーが発生しました。');
    }
  };

  // Excel出力用のハンドラ - セル結合とスタイルを追加
  const handleExportExcel = () => {
    const userName = users.find(user => user.id === selectedUser)?.name || '';
    const summary = calculateMonthlySummary();
    const wb = XLSX.utils.book_new();
    
    // ワークシートの作成
    const ws = XLSX.utils.aoa_to_sheet([['']]);
    
    // セルの値を設定する関数
    const setCellValue = (cell, value) => {
      ws[cell] = { v: value, t: typeof value === 'number' ? 'n' : 's' };
    };
    
    // セル範囲をマージする関数
    const mergeCells = (ranges) => {
      if (!ws['!merges']) ws['!merges'] = [];
      ranges.forEach(range => {
        ws['!merges'].push(range);
      });
    };
    
    // タイトルと基本情報
    setCellValue('A1', '勤務記録');
    setCellValue('A3', `氏名: ${userName}`);
    setCellValue('A4', `期間: ${currentMonth.year}年${currentMonth.month}月 (${currentMonth.month - 1}/21～${currentMonth.month}/20)`);
    
    // セル結合
    mergeCells([
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // A1:F1
      { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }, // A3:F3
      { s: { r: 3, c: 0 }, e: { r: 3, c: 5 } }, // A4:F4
    ]);
    
    // サマリー情報
    setCellValue('A6', '勤務サマリー');
    mergeCells([{ s: { r: 5, c: 0 }, e: { r: 5, c: 5 } }]); // A6:F6
    
    // 基本情報テーブル
    setCellValue('A8', '基本情報');
    setCellValue('A9', '項目');
    setCellValue('B9', '値');
    setCellValue('A10', '対象期間');
    setCellValue('B10', `${summary.totalDays}日`);
    setCellValue('A11', '総労働時間');
    setCellValue('B11', `${summary.totalWorkHours.toFixed(1)}時間`);
    setCellValue('A12', '総休憩時間');
    setCellValue('B12', `${summary.totalBreakHours.toFixed(1)}時間`);
    setCellValue('A13', '残業時間');
    setCellValue('B13', `${summary.overtimeHours.toFixed(1)}時間`);
    
    // 勤務種別の内訳テーブル
    setCellValue('D8', '勤務種別の内訳');
    setCellValue('D9', '種別');
    setCellValue('E9', '日数');
    
    let rowIndex = 10;
    Object.entries(summary.workTypes).forEach(([type, count], index) => {
      setCellValue(`D${rowIndex}`, type);
      setCellValue(`E${rowIndex}`, `${count}日`);
      rowIndex++;
    });
    
    // 詳細データテーブル
    rowIndex = Math.max(15, rowIndex + 2);
    
    setCellValue(`A${rowIndex}`, '勤務詳細');
    mergeCells([{ s: { r: rowIndex - 1, c: 0 }, e: { r: rowIndex - 1, c: 5 } }]);
    
    rowIndex++;
    setCellValue(`A${rowIndex}`, '日付');
    setCellValue(`B${rowIndex}`, '勤務種別');
    setCellValue(`C${rowIndex}`, '出勤時間');
    setCellValue(`D${rowIndex}`, '退勤時間');
    setCellValue(`E${rowIndex}`, '休憩時間');
    setCellValue(`F${rowIndex}`, '実労働時間');
    
    rowIndex++;
    monthlyData.dates.forEach((date) => {
      const dateStr = formatDateStr(date);
      const formattedDate = formatDate(date);
      const workRecord = monthlyData.workRecords[dateStr] || {};
      const breakRecord = monthlyData.breakRecords[dateStr] || [];
      const totalBreakMinutes = calculateTotalBreakTime(breakRecord);
      
      setCellValue(`A${rowIndex}`, formattedDate);
      setCellValue(`B${rowIndex}`, workRecord.workType || '-');
      setCellValue(`C${rowIndex}`, workRecord.startTime || '-');
      setCellValue(`D${rowIndex}`, workRecord.endTime || '-');
      setCellValue(`E${rowIndex}`, totalBreakMinutes > 0 ? 
        `${Math.floor(totalBreakMinutes / 60)}:${String(totalBreakMinutes % 60).padStart(2, '0')}` : '-');
      setCellValue(`F${rowIndex}`, workRecord.totalWork || '-');
      
      rowIndex++;
    });
    
    // 列幅の設定
    ws['!cols'] = [
      { wch: 20 }, // A列
      { wch: 15 }, // B列
      { wch: 15 }, // C列
      { wch: 15 }, // D列
      { wch: 15 }, // E列
      { wch: 15 }  // F列
    ];
    
    // シート向き - 横向き
    ws['!orient'] = 'landscape';
    
    // ワークブックにシートを追加
    XLSX.utils.book_append_sheet(wb, ws, "勤務記録");
    
    // Excelファイルとして出力
    XLSX.writeFile(wb, `勤務記録_${userName}_${currentMonth.year}年${currentMonth.month}月.xlsx`);
  };

  if (isInitialLoading) {
    return <div className="p-4 text-center">認証確認中...</div>;
  }

  if (!session || !session.user?.isAdmin) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Head要素にスタイルを追加 */}
      <style jsx global>{`
        .pdf-print-mode {
          background-color: white;
          padding: 20mm;
          width: 297mm; /* A4横サイズ */
          min-height: 210mm;
        }
        .pdf-print-mode table {
          border-collapse: collapse;
          width: 100%;
        }
        .pdf-print-mode th,
        .pdf-print-mode td {
          border: 1px solid #ddd;
          padding: 8px;
        }
        .pdf-print-mode th {
          background-color: #f2f2f2;
        }
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* フィルターセクション */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 no-print">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-indigo-100 p-2 rounded-xl">
            <FunnelIcon className="h-5 w-5 text-indigo-600" />
          </div>
          <h2 className="text-lg font-medium text-gray-800">表示設定</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* ユーザー選択 */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">
              表示するメンバー
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="メンバーを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-t-xl bg-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>

            <div className="border-2 border-gray-200 rounded-xl max-h-48 overflow-y-auto bg-white">
              <div className="divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user.id)}
                    className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                      selectedUser === user.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-3 ${
                        selectedUser === user.id ? 'bg-indigo-500' : 'bg-gray-300'
                      }`} />
                      <span className="text-sm font-medium">
                        {user.name}
                      </span>
                    </div>
                  </button>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="px-4 py-3 text-sm text-gray-500 text-center">
                    該当するメンバーが見つかりません
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 年月選択 */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              表示する期間
            </label>
            <div className="grid grid-cols-2 gap-4">
              <select
                value={currentMonth.year}
                onChange={(e) => setCurrentMonth(prev => ({
                  ...prev,
                  year: parseInt(e.target.value)
                }))}
                className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors bg-white"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return (
                    <option key={year} value={year}>
                      {year}年
                    </option>
                  );
                })}
              </select>
              <select
                value={currentMonth.month}
                onChange={(e) => setCurrentMonth(prev => ({
                  ...prev,
                  month: parseInt(e.target.value)
                }))}
                className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors bg-white"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}月
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 出力ボタンセクション */}
      {selectedUser && !isDataLoading && (
        <div className="flex justify-end gap-4 mb-6 no-print">
          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            <DocumentArrowDownIcon className="h-5 w-5" />
            PDFで出力
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <DocumentArrowDownIcon className="h-5 w-5" />
            Excelで出力
          </button>
        </div>
      )}

      {/* 印刷・エクスポート対象のコンテンツ */}
      <div ref={printRef}>
        {/* PDF出力用のセクション */}
        <div ref={printSectionRef}>
          {selectedUser && !isDataLoading && (
            <>
              {/* ヘッダー情報 - PDF用 */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-center mb-4">勤務記録</h1>
                <div className="flex justify-between">
                  <p className="font-medium">
                    氏名: {users.find(user => user.id === selectedUser)?.name}
                  </p>
                  <p className="font-medium">
                    期間: {currentMonth.year}年{currentMonth.month}月 ({currentMonth.month - 1}/21～{currentMonth.month}/20)
                  </p>
                </div>
              </div>

              {/* 月間サマリーセクション */}
              <div className="bg-white rounded-xl shadow p-6 mb-8">
                <h2 className="text-xl font-bold mb-4">勤務サマリー</h2>
                
                <div className="grid grid-cols-2 gap-6">
                  {/* 基本情報 */}
                  <div>
                    <h3 className="text-lg font-medium mb-3">基本情報</h3>
                    <table className="min-w-full border">
                      <thead>
                        <tr>
                          <th className="border px-4 py-2 bg-gray-50">項目</th>
                          <th className="border px-4 py-2 bg-gray-50">値</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const summary = calculateMonthlySummary();
                          return [
                            { label: '対象期間', value: `${summary.totalDays}日` },
                            { label: '総労働時間', value: `${summary.totalWorkHours.toFixed(1)}時間` },
                            { label: '総休憩時間', value: `${summary.totalBreakHours.toFixed(1)}時間` },
                            { label: '残業時間', value: `${summary.overtimeHours.toFixed(1)}時間` }
                          ].map((item, index) => (
                            <tr key={index}>
                              <td className="border px-4 py-2">{item.label}</td>
                              <td className="border px-4 py-2 font-medium">{item.value}</td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* 勤務種別の集計 */}
                  <div>
                    <h3 className="text-lg font-medium mb-3">勤務種別の内訳</h3>
                    <table className="min-w-full border">
                      <thead>
                        <tr>
                          <th className="border px-4 py-2 bg-gray-50">種別</th>
                          <th className="border px-4 py-2 bg-gray-50">日数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const summary = calculateMonthlySummary();
                          return Object.entries(summary.workTypes).map(([type, count], index) => (
                            <tr key={index}>
                              <td className="border px-4 py-2">{type}</td>
                              <td className="border px-4 py-2 font-medium">{count}日</td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* 勤務時間リスト */}
              <div className="bg-white rounded-xl shadow">
                <div className="p-6">
                  <h2 className="text-xl font-bold mb-4">勤務詳細</h2>
                  <table className="min-w-full border">
                    <thead>
                      <tr>
                        <th className="border px-4 py-2 bg-gray-50">日付</th>
                        <th className="border px-4 py-2 bg-gray-50">勤務種別</th>
                        <th className="border px-4 py-2 bg-gray-50">出勤時間</th>
                        <th className="border px-4 py-2 bg-gray-50">退勤時間</th>
                        <th className="border px-4 py-2 bg-gray-50">休憩時間</th>
                        <th className="border px-4 py-2 bg-gray-50">実労働時間</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.dates.map((date) => {
                        const dateStr = formatDateStr(date);
                        const workRecord = monthlyData.workRecords[dateStr] || {};
                        const breakRecord = monthlyData.breakRecords[dateStr] || [];
                        const totalBreakMinutes = calculateTotalBreakTime(breakRecord);

                        return (
                          <tr key={dateStr} className={
                            date.getDay() === 0 ? 'text-red-600' : 
                            date.getDay() === 6 ? 'text-blue-600' : ''
                          }>
                            <td className="border px-4 py-2">{formatDate(date)}</td>
                            <td className="border px-4 py-2">{workRecord.workType || '-'}</td>
                            <td className="border px-4 py-2">{workRecord.startTime || '-'}</td>
                            <td className="border px-4 py-2">{workRecord.endTime || '-'}</td>
                            <td className="border px-4 py-2">
                              {totalBreakMinutes > 0 ? 
                                `${Math.floor(totalBreakMinutes / 60)}:${String(totalBreakMinutes % 60).padStart(2, '0')}` : 
                                '-'}
                            </td>
                            <td className="border px-4 py-2">{workRecord.totalWork || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* フッター - PDF用 */}
              <div className="mt-6 text-sm text-gray-500 text-right">
                出力日: {new Date().toLocaleDateString('ja-JP')}
              </div>
            </>
          )}
        </div>

        {/* 実際に画面に表示されるコンテンツ - 元のデザイン */}
        {selectedUser && !isDataLoading && !printSectionRef.current?.classList.contains('pdf-print-mode') && (
          <>
            {/* 月間サマリーセクション */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-xl">
                    <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-medium text-gray-800">
                    {users.find(user => user.id === selectedUser)?.name} - {currentMonth.year}年{currentMonth.month}月の勤務サマリー
                  </h2>
                </div>
                <div className="text-sm text-gray-500">
                  {currentMonth.month}月度 ({currentMonth.month - 1}/21～{currentMonth.month}/20)
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 基本情報 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">基本情報</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {(() => {
                      const summary = calculateMonthlySummary();
                      return [
                        {
                          label: '対象期間',
                          value: `${summary.totalDays}日`,
                          color: 'bg-purple-50 text-purple-700 border border-purple-200'
                        },
                        {
                          label: '総労働時間',
                          value: `${summary.totalWorkHours.toFixed(1)}時間`,
                          color: 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        },
                        {
                          label: '総休憩時間',
                          value: `${summary.totalBreakHours.toFixed(1)}時間`,
                          color: 'bg-sky-50 text-sky-700 border border-sky-200'
                        },
                        {
                          label: '残業時間',
                          value: `${summary.overtimeHours.toFixed(1)}時間`,
                          color: 'bg-rose-50 text-rose-700 border border-rose-200'
                        }
                      ].map((item, index) => (
                        <div key={index} className={`${item.color} rounded-xl p-4 shadow-sm`}>
                          <div className="text-sm font-medium mb-1 opacity-90">{item.label}</div>
                          <div className="text-lg font-bold">{item.value}</div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* 勤務種別の集計 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">勤務種別の内訳</h3>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="grid grid-cols-2 gap-4">
                      {(() => {
                        const summary = calculateMonthlySummary();
                        return Object.entries(summary.workTypes).map(([type, count], index) => (
                          <div key={type} className="flex items-center justify-between bg-white rounded-lg p-3 shadow-sm">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                type === '出勤' ? 'bg-emerald-500' :
                                type === '公休' ? 'bg-sky-500' :
                                type === '有給' ? 'bg-amber-500' :
                                type === '欠勤' ? 'bg-rose-500' :
                                'bg-gray-500'
                              }`} />
                              <span className="text-sm font-medium text-gray-700">{type}</span>
                            </div>
                            <span className="text-sm font-bold text-gray-900">{count}日</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 勤務時間リスト */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {!selectedUser ? (
                <div className="p-8 text-center text-gray-500">
                  表示するメンバーを選択してください
                </div>
              ) : isDataLoading ? (
                <div className="p-8 text-center text-gray-500">
                  データを読み込み中...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          日付
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          勤務種別
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          出勤時間
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          退勤時間
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          休憩時間
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          実労働時間
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {monthlyData.dates.map((date) => {
                        const dateStr = formatDateStr(date);
                        console.log('Checking date:', dateStr, 'Records:', monthlyData.workRecords[dateStr]);
                        
                        const workRecord = monthlyData.workRecords[dateStr] || {};
                        const breakRecord = monthlyData.breakRecords[dateStr] || [];
                        const totalBreakMinutes = calculateTotalBreakTime(breakRecord);

                        return (
                          <tr key={dateStr} className={date.getDay() === 0 ? 'text-red-500' : date.getDay() === 6 ? 'text-blue-500' : ''}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              {formatDate(date)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              {workRecord.workType || '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              {workRecord.startTime || '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              {workRecord.endTime || '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              {totalBreakMinutes > 0 ? `${Math.floor(totalBreakMinutes / 60)}:${String(totalBreakMinutes % 60).padStart(2, '0')}` : '-'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              {workRecord.totalWork || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
} 