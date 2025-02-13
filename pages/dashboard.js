// pages/dashboard.js
import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [scheduleRecords, setScheduleRecords] = useState([]);

  // 編集中の勤怠情報のインデックスと編集用データ
  const [editAttendanceIndex, setEditAttendanceIndex] = useState(null);
  const [editAttendanceData, setEditAttendanceData] = useState({
    date: '',
    employeeName: '',
    startTime: '',
    endTime: '',
  });

  // 編集中の予定情報のインデックスと編集用データ
  const [editScheduleIndex, setEditScheduleIndex] = useState(null);
  const [editScheduleData, setEditScheduleData] = useState({
    date: '',
    employeeName: '',
    scheduleTitle: '',
    scheduleStart: '',
    scheduleEnd: '',
    detail: '',
  });

  const [message, setMessage] = useState('');

  // 未認証の場合は自動的にログインページへリダイレクト
  useEffect(() => {
    if (status === 'unauthenticated') {
      signIn();
    }
  }, [status]);

  // ログイン済みの場合、各データを取得
  useEffect(() => {
    if (session) {
      fetchAttendance();
      fetchSchedule();
    }
  }, [session]);

  // 勤怠情報を取得し、ログインユーザーのみフィルタ
  const fetchAttendance = async () => {
    const res = await fetch('/api/attendance');
    const data = await res.json();
    if (data.data) {
      // 例: 勤怠記録の社員名は2列目（インデックス1）
      const filtered = data.data.filter(record => record[1] === session.user.name);
      setAttendanceRecords(filtered);
    }
  };

  // 予定情報を取得し、ログインユーザーのみフィルタ
  const fetchSchedule = async () => {
    const res = await fetch('/api/schedule');
    const data = await res.json();
    if (data.data) {
      // 例: 予定の社員名は2列目（インデックス1）
      const filtered = data.data.filter(record => record[1] === session.user.name);
      setScheduleRecords(filtered);
    }
  };

  // ── 勤怠情報 編集処理 ──

  const handleEditAttendanceClick = (index) => {
    setEditAttendanceIndex(index);
    const record = attendanceRecords[index];
    setEditAttendanceData({
      date: record[0],
      employeeName: record[1],
      startTime: record[2],
      endTime: record[3],
    });
  };

  const handleAttendanceInputChange = (e) => {
    setEditAttendanceData({ ...editAttendanceData, [e.target.name]: e.target.value });
  };

  const handleAttendanceUpdate = async (e) => {
    e.preventDefault();
    // シート上の行番号は (index + 1) ※ここではヘッダーがない前提
    const rowIndex = editAttendanceIndex + 1;
    const res = await fetch('/api/attendance/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rowIndex,
        ...editAttendanceData,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(data.message);
      setEditAttendanceIndex(null);
      fetchAttendance();
    } else {
      setMessage(data.error || '勤怠情報の更新に失敗しました。');
    }
  };

  // ── 予定情報 編集処理 ──

  const handleEditScheduleClick = (index) => {
    setEditScheduleIndex(index);
    const record = scheduleRecords[index];
    setEditScheduleData({
      date: record[0],
      employeeName: record[1],
      scheduleTitle: record[2],
      scheduleStart: record[3],
      scheduleEnd: record[4],
      detail: record[5],
    });
  };

  const handleScheduleInputChange = (e) => {
    setEditScheduleData({ ...editScheduleData, [e.target.name]: e.target.value });
  };

  const handleScheduleUpdate = async (e) => {
    e.preventDefault();
    const rowIndex = editScheduleIndex + 1;
    const res = await fetch('/api/schedule/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rowIndex,
        ...editScheduleData,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(data.message);
      setEditScheduleIndex(null);
      fetchSchedule();
    } else {
      setMessage(data.error || '予定情報の更新に失敗しました。');
    }
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }
  if (!session) return null;

  return (
    <div>
      <h1>ユーザーダッシュボード</h1>
      {message && <p>{message}</p>}

      {/* ── 勤怠情報セクション ── */}
      <h2>勤怠情報</h2>
      {attendanceRecords.length === 0 ? (
        <p>登録された勤怠情報はありません。</p>
      ) : (
        <table border="1" cellPadding="5">
          <thead>
            <tr>
              <th>行番号</th>
              <th>日付</th>
              <th>社員名</th>
              <th>出社時間</th>
              <th>退社時間</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {attendanceRecords.map((record, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{record[0]}</td>
                <td>{record[1]}</td>
                <td>{record[2]}</td>
                <td>{record[3]}</td>
                <td>
                  <button onClick={() => handleEditAttendanceClick(index)}>編集</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editAttendanceIndex !== null && (
        <div style={{ marginTop: '20px' }}>
          <h3>勤怠情報編集（行番号: {editAttendanceIndex + 1}）</h3>
          <form onSubmit={handleAttendanceUpdate}>
            <div>
              <label>日付: </label>
              <input
                type="date"
                name="date"
                value={editAttendanceData.date}
                onChange={handleAttendanceInputChange}
                required
              />
            </div>
            <div>
              <label>社員名: </label>
              <input
                type="text"
                name="employeeName"
                value={editAttendanceData.employeeName}
                onChange={handleAttendanceInputChange}
                required
                readOnly // ユーザー自身の名前は変更不可
              />
            </div>
            <div>
              <label>出社時間: </label>
              <input
                type="time"
                name="startTime"
                value={editAttendanceData.startTime}
                onChange={handleAttendanceInputChange}
                required
              />
            </div>
            <div>
              <label>退社時間: </label>
              <input
                type="time"
                name="endTime"
                value={editAttendanceData.endTime}
                onChange={handleAttendanceInputChange}
                required
              />
            </div>
            <button type="submit">更新</button>
          </form>
        </div>
      )}

      {/* ── 予定情報セクション ── */}
      <h2>予定情報</h2>
      {scheduleRecords.length === 0 ? (
        <p>登録された予定情報はありません。</p>
      ) : (
        <table border="1" cellPadding="5">
          <thead>
            <tr>
              <th>行番号</th>
              <th>日付</th>
              <th>社員名</th>
              <th>予定タイトル</th>
              <th>予定開始</th>
              <th>予定終了</th>
              <th>詳細</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {scheduleRecords.map((record, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{record[0]}</td>
                <td>{record[1]}</td>
                <td>{record[2]}</td>
                <td>{record[3]}</td>
                <td>{record[4]}</td>
                <td>{record[5]}</td>
                <td>
                  <button onClick={() => handleEditScheduleClick(index)}>編集</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editScheduleIndex !== null && (
        <div style={{ marginTop: '20px' }}>
          <h3>予定情報編集（行番号: {editScheduleIndex + 1}）</h3>
          <form onSubmit={handleScheduleUpdate}>
            <div>
              <label>日付: </label>
              <input
                type="date"
                name="date"
                value={editScheduleData.date}
                onChange={handleScheduleInputChange}
                required
              />
            </div>
            <div>
              <label>社員名: </label>
              <input
                type="text"
                name="employeeName"
                value={editScheduleData.employeeName}
                onChange={handleScheduleInputChange}
                required
                readOnly
              />
            </div>
            <div>
              <label>予定タイトル: </label>
              <input
                type="text"
                name="scheduleTitle"
                value={editScheduleData.scheduleTitle}
                onChange={handleScheduleInputChange}
                required
              />
            </div>
            <div>
              <label>予定開始: </label>
              <input
                type="time"
                name="scheduleStart"
                value={editScheduleData.scheduleStart}
                onChange={handleScheduleInputChange}
                required
              />
            </div>
            <div>
              <label>予定終了: </label>
              <input
                type="time"
                name="scheduleEnd"
                value={editScheduleData.scheduleEnd}
                onChange={handleScheduleInputChange}
                required
              />
            </div>
            <div>
              <label>詳細: </label>
              <input
                type="text"
                name="detail"
                value={editScheduleData.detail}
                onChange={handleScheduleInputChange}
                required
              />
            </div>
            <button type="submit">更新</button>
          </form>
        </div>
      )}
    </div>
  );
}
