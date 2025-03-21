import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = useState(false);
  const [portalContainer, setPortalContainer] = useState(null);
  const [isPartTimer, setIsPartTimer] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleAttendanceChange = (e) => {
    setAttendance({ ...attendance, [e.target.name]: e.target.value });
  };

  const handleBreakChange = (index, e) => {
    const newBreakRecords = [...breakRecords];
    newBreakRecords[index][e.target.name] = e.target.value;
    setBreakRecords(newBreakRecords);
  };

  const addBreakRecord = (breakData) => {
    // breakDataパラメータが提供された場合はそれを使用、そうでなければデフォルト値
    const newBreak = breakData || { breakStart: '', breakEnd: '', recordType: '出勤簿' };
    setBreakRecords([...breakRecords, newBreak]);
  };

  const removeBreakRecord = (index) => {
    if (breakRecords.length > 1) {
      setBreakRecords(breakRecords.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsSaving(true);

    try {
      // デバッグ用にログを追加
      console.log("送信する勤務データ:", attendance);
      
      // 勤務種別に応じた処理
      let submissionData = { ...attendance };
      
      // 公休の場合は時間をすべて空に
      if (attendance.workType === '公休') {
        submissionData = {
          ...submissionData,
          startTime: '',
          endTime: '',
          totalWorkTime: ''
        };
      }
      
      // 有給休暇の場合
      if (attendance.workType === '有給休暇') {
        // ユーザーアカウントタイプに応じて実労働時間を設定
        const workTime = userAccountType === '業務' ? '7時間30分' : '7時間';
        
        submissionData = {
          ...submissionData,
          startTime: '',
          endTime: '',
          totalWorkTime: workTime
        };
      }
      
      // 送信前の最終データをログ出力
      console.log("最終送信データ:", submissionData);
      
      // 明示的に必要なデータのみを抽出して送信
      const cleanedData = {
        date: submissionData.date,
        employeeName: submissionData.employeeName,
        startTime: submissionData.startTime,
        endTime: submissionData.endTime,
        workType: submissionData.workType || '出勤',
        recordType: '出勤簿',
        totalWorkTime: submissionData.totalWorkTime
      };
      
      console.log("クリーンアップしたデータ:", cleanedData);
      
      // 親コンポーネントの送信関数を呼び出し（既存の機能を維持）
      await onSubmit(cleanedData, breakRecords);
      
      // フォームをリセット
      setAttendance(prev => ({
        ...prev,
        startTime: '',
        endTime: '',
        workType: '出勤',
      }));
      setBreakRecords([{ breakStart: '', breakEnd: '', recordType: '出勤簿' }]);
      onClose();
    } catch (error) {
      console.error("送信エラー:", error);
      setMessage(error.message || 'エラーが発生しました');
      setIsSaving(false);
    }
  };

  // コンポーネントのマウント時にユーザーのアカウントタイプを取得
  useEffect(() => {
    const accountType = window.localStorage.getItem('userAccountType') || '';
    setUserAccountType(accountType);
    // アルバイトかどうかをチェック
    setIsPartTimer(accountType === 'アルバイト');
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
    console.log("勤務種別変更:", newWorkType);
    
    // 休暇系の場合は時間をリセット
    if (['公休', '有給休暇', '休暇'].includes(newWorkType)) {
      setAttendance(prev => ({
        ...prev,
        workType: newWorkType,
        startTime: '',
        endTime: ''
      }));
    } else {
      // 通常の勤務種別の場合は普通に更新
      setAttendance(prev => ({
        ...prev,
        workType: newWorkType
      }));
    }
  };

  // 既存データの取得処理を修正
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
          const existingAttendance = attendanceData.data.find(row => 
            row[0] === initialAttendance.date && 
            row[1] === initialAttendance.employeeName && 
            row[5] === '出勤簿'
          );
          
          if (existingAttendance) {
            console.log("既存の勤務データ:", existingAttendance);
            setAttendance(prev => ({
              ...prev,
              startTime: existingAttendance[2] || '',
              endTime: existingAttendance[3] || '',
              workType: existingAttendance[4] || '出勤',
              totalWorkTime: existingAttendance[6] || '',
              recordType: '出勤簿'
            }));
          }
        }
        
        // 既存の休憩データがあれば、それで初期化
        if (breakData.data && breakData.data.length > 0) {
          const existingBreaks = breakData.data.filter(row => 
            row[0] === initialAttendance.date && 
            row[1] === initialAttendance.employeeName && 
            row[4] === '出勤簿'
          );
          
          console.log("既存の休憩データ:", existingBreaks);
          
          // 休憩データがあるかどうかで処理を分岐
          if (existingBreaks.length > 0) {
            // 有効な休憩データを抽出（開始・終了時間が両方入っているもの）
            const validBreaks = existingBreaks
              .filter(row => row[2] && row[3])
              .map(row => ({
                breakStart: row[2] || '',
                breakEnd: row[3] || '',
                recordType: '出勤簿'
              }));
              
            // 既存データを設定
            if (validBreaks.length > 0) {
              // 最後に編集用の空のレコードを追加（新規入力用）
              validBreaks.push({ breakStart: '', breakEnd: '', recordType: '出勤簿' });
              setBreakRecords(validBreaks);
            } else {
              // 有効な休憩がない場合は空のレコードだけを設定
              setBreakRecords([{ breakStart: '', breakEnd: '', recordType: '出勤簿' }]);
            }
          } else {
            // 休憩データがない場合は空のレコードを1つ設定
            setBreakRecords([{ breakStart: '', breakEnd: '', recordType: '出勤簿' }]);
          }
        } else {
          // 休憩データがない場合は空のレコードを1つ設定
          setBreakRecords([{ breakStart: '', breakEnd: '', recordType: '出勤簿' }]);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching existing data:', error);
        setMessage('データの取得中にエラーが発生しました');
        setIsLoading(false);
      }
    };
    
    if (initialAttendance.date && initialAttendance.employeeName) {
      fetchExistingData();
    } else {
      setIsLoading(false);
      // 初期データが不足している場合もデフォルトの休憩レコードを設定
      setBreakRecords([{ breakStart: '', breakEnd: '', recordType: '出勤簿' }]);
    }
  }, [initialAttendance.date, initialAttendance.employeeName]);

  // 初期値の設定を確認
  useEffect(() => {
    // 初期値を設定（ただし既存データがある場合は上書きしない）
    if (!attendance.startTime && !attendance.endTime) {
      setAttendance(initialAttendance);
    }
    
    // デバッグ用にログを追加
    console.log("初期値:", initialAttendance);
    console.log("現在のフォーム値:", attendance);
  }, [initialAttendance]);

  // クライアントサイドマウント検出のためのuseEffect
  useEffect(() => {
    setMounted(true);
    
    // bodyのスクロールを無効化
    document.body.style.overflow = 'hidden';
    
    // ポータルコンテナ作成
    let container = document.getElementById('modal-portal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'modal-portal-container';
      document.body.appendChild(container);
    }
    setPortalContainer(container);
    
    // クリーンアップ関数
    return () => {
      document.body.style.overflow = '';
      setMounted(false);
      // ポータルコンテナの削除はしない（他のモーダルが使うかもしれないため）
    };
  }, []);

  // モーダルコンテンツのスクロール制御
  useEffect(() => {
    const modalContent = document.querySelector('.modal-content');
    if (modalContent) {
      modalContent.scrollTop = 0;
    }
  }, []);

  // サーバーサイドレンダリング対応とポータルコンテナなしの場合
  if (typeof window === 'undefined' || !mounted || !portalContainer) {
    return null;
  }

  // モーダルコンテンツ
  const modalContent = (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.5rem',
        zIndex: 9999999,
      }}
    >
      <div 
        style={{
          backgroundColor: '#fff',
          borderRadius: '0.75rem',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          width: '100%',
          maxWidth: '48rem',
          display: 'flex',
          flexDirection: 'column',
          margin: '0',
          maxHeight: '95vh',
          position: 'relative',
        }}
      >
        <div 
          style={{
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            position: 'sticky', 
            top: 0, 
            backgroundColor: '#fff', 
            padding: '1rem', 
            borderBottom: '1px solid #e5e7eb',
            zIndex: 1,
            borderTopLeftRadius: '0.75rem',
            borderTopRightRadius: '0.75rem',
          }}
        >
          <h2 style={{ 
            fontSize: '1.25rem', 
            fontWeight: 600, 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap' 
          }}>
            {attendance.date} の勤務記録 {isLoading ? '(読み込み中...)' : ''}
          </h2>
          <button 
            onClick={onClose} 
            style={{ 
              color: '#4b5563', 
              fontSize: '1.5rem', 
              marginLeft: '0.5rem', 
              flexShrink: 0,
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              touchAction: 'manipulation',
            }}
          >
            &times;
          </button>
        </div>
        
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <p style={{ color: '#6b7280' }}>データを読み込んでいます...</p>
          </div>
        ) : (
          <div 
            className="modal-content"
            style={{ 
              overflowY: 'auto', 
              padding: '1rem', 
              flexGrow: 1,
              WebkitOverflowScrolling: 'touch', // iOSのスクロールを滑らかに
            }}
          >
            <form onSubmit={handleSubmit} style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
              <AttendanceForm 
                attendance={attendance}
                breakRecords={breakRecords}
                onAttendanceChange={handleAttendanceChange}
                onBreakChange={handleBreakChange}
                onAddBreak={addBreakRecord}
                onRemoveBreak={removeBreakRecord}
                onWorkTypeChange={handleWorkTypeChange}
                isPartTimer={isPartTimer}
              />
            </form>
          </div>
        )}
        <div 
          style={{ 
            position: 'sticky', 
            bottom: 0, 
            backgroundColor: '#fff', 
            padding: '1rem', 
            borderTop: '1px solid #e5e7eb', 
            display: 'flex', 
            gap: '0.75rem',
            zIndex: 1,
            borderBottomLeftRadius: '0.75rem',
            borderBottomRightRadius: '0.75rem',
          }}
        >
          <button 
            type="submit" 
            onClick={handleSubmit}
            disabled={isSaving}
            style={{ 
              flex: 1, 
              backgroundColor: isSaving ? '#3b82f6' : '#2563eb', 
              color: '#fff', 
              padding: '0.875rem', 
              borderRadius: '0.5rem', 
              fontWeight: 500, 
              transition: 'all 0.2s',
              fontSize: '1rem',
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
              minHeight: '56px',
              position: 'relative',
              overflow: 'hidden',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.8 : 1,
            }}
          >
            {isSaving ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <div style={{ 
                  width: '1.25rem', 
                  height: '1.25rem', 
                  borderRadius: '50%', 
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderTopColor: '#ffffff',
                  animation: 'spin 1s linear infinite',
                  display: 'inline-block'
                }}></div>
                <span>保存中...</span>
              </div>
            ) : (
              '保存'
            )}
          </button>
          <button 
            type="button"
            onClick={onClose}
            disabled={isSaving}
            style={{ 
              flex: 1, 
              backgroundColor: '#f3f4f6', 
              color: '#374151', 
              padding: '0.875rem', 
              borderRadius: '0.5rem', 
              fontWeight: 500, 
              transition: 'all 0.2s',
              fontSize: '1rem',
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
              minHeight: '56px',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.5 : 1,
            }}
          >
            キャンセル
          </button>
        </div>
        {message && <p style={{ padding: '1rem', textAlign: 'center', color: '#dc2626', backgroundColor: '#fef2f2' }}>{message}</p>}
      </div>
    </div>
  );

  // Reactのcreatecreateを使用してDOMツリーの最上位にモーダルをレンダリング
  return createPortal(modalContent, portalContainer);
}

// CSSアニメーション用のスタイルを追加
const styleElement = typeof document !== 'undefined' ? document.createElement('style') : null;
if (styleElement) {
  styleElement.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleElement);
} 