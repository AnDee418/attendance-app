import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const TileCalender = () => {
  const router = useRouter();
  const { user } = router.query; // 日付選択ページで渡されたユーザー名
  const today = new Date();
  // 現在の月・年を利用（必要に応じて外部から受け取るように変更も可能）
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed
  
  // 今月の日数を計算
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // 月初日の曜日（0:Sun～6:Sat）
  const firstDayWeekday = new Date(year, month, 1).getDay();

  // カレンダー用のセル配列を作成（空セル＋日付セル）
  const calendarCells = [];
  // 月初日の曜日分の空セルを追加
  for (let i = 0; i < firstDayWeekday; i++) {
    calendarCells.push(null);
  }
  // 各日付をセルに追加
  for (let day = 1; day <= daysInMonth; day++) {
    calendarCells.push(day);
  }

  // 日付を YYYY-MM-DD の形式にフォーマットする関数
  const formatDate = (year, month, day) => {
    const m = month + 1; // monthは0-indexedのため調整
    return `${year}-${m.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mt-4">
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 gap-2 mb-2 text-center text-sm font-semibold">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, index) => (
          <div key={index}>{d}</div>
        ))}
      </div>
      {/* カレンダーグリッド */}
      <div className="grid grid-cols-7 gap-2">
        {calendarCells.map((cell, index) => {
          if (cell === null) {
            return <div key={index} className="p-2" />;
          }
          const dateStr = formatDate(year, month, cell);
          return (
            <Link
              key={index}
              href={`/date-details?user=${encodeURIComponent(user || '')}&date=${dateStr}`}
            >
              <div className="p-2 border rounded text-center cursor-pointer hover:bg-blue-50">
                {cell}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default TileCalender; 