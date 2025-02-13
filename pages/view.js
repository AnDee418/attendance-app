// pages/view.js
import { useEffect, useState } from 'react';

export default function ViewPage() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [scheduleData, setScheduleData] = useState([]);

  useEffect(() => {
    fetch('/api/attendance')
      .then(res => res.json())
      .then(data => setAttendanceData(data.data || []));
    fetch('/api/schedule')
      .then(res => res.json())
      .then(data => setScheduleData(data.data || []));
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-4">データ閲覧</h1>
      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">勤務記録</h2>
        <table className="min-w-full bg-white rounded-lg shadow-md">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border">日付</th>
              <th className="py-2 px-4 border">社員名</th>
              <th className="py-2 px-4 border">出社時間</th>
              <th className="py-2 px-4 border">退社時間</th>
              <th className="py-2 px-4 border">勤務種別</th>
              <th className="py-2 px-4 border">種別</th>
            </tr>
          </thead>
          <tbody>
            {attendanceData.map((row, idx) => (
              <tr key={idx}>
                <td className="py-2 px-4 border">{row[0]}</td>
                <td className="py-2 px-4 border">{row[1]}</td>
                <td className="py-2 px-4 border">{row[2]}</td>
                <td className="py-2 px-4 border">{row[3]}</td>
                <td className="py-2 px-4 border">{row[4]}</td>
                <td className="py-2 px-4 border">{row[5]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      
      <section>
        <h2 className="text-2xl font-semibold mb-2">予定</h2>
        <table className="min-w-full bg-white rounded-lg shadow-md">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border">日付</th>
              <th className="py-2 px-4 border">社員名</th>
              <th className="py-2 px-4 border">予定タイトル</th>
              <th className="py-2 px-4 border">開始</th>
              <th className="py-2 px-4 border">終了</th>
              <th className="py-2 px-4 border">詳細</th>
              <th className="py-2 px-4 border">種別</th>
            </tr>
          </thead>
          <tbody>
            {scheduleData.map((row, idx) => (
              <tr key={idx}>
                <td className="py-2 px-4 border">{row[0]}</td>
                <td className="py-2 px-4 border">{row[1]}</td>
                <td className="py-2 px-4 border">{row[2]}</td>
                <td className="py-2 px-4 border">{row[3]}</td>
                <td className="py-2 px-4 border">{row[4]}</td>
                <td className="py-2 px-4 border">{row[5]}</td>
                <td className="py-2 px-4 border">{row[6]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
