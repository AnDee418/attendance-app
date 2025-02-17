import { useState } from 'react';

export default function TileCalendar({ displayDate, selectedDate = new Date(), onDateSelect, onMonthChange }) {
  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
  // currentDateが未定義の場合は新しい日付を用いる
  const date = displayDate || new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const tiles = [];
  for (let i = 0; i < firstDay; i++) {
    tiles.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    tiles.push(new Date(year, month, d));
  }

  // 簡易的な祝日判定（固定祝日例）
  const isJapaneseHoliday = (date) => {
    const mmdd = ("0" + (date.getMonth() + 1)).slice(-2) + "-" + ("0" + date.getDate()).slice(-2);
    const fixedHolidays = ["01-01", "02-11", "04-29", "05-03", "05-04", "05-05", "11-03", "11-23"];
    return fixedHolidays.includes(mmdd);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* 月移動ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => onMonthChange(-1)} className="p-2 text-xl font-bold text-gray-700 hover:text-gray-900">
          &lt;
        </button>
        <div className="text-2xl font-bold text-gray-800">
          {year}年 {month + 1}月
        </div>
        <button onClick={() => onMonthChange(1)} className="p-2 text-xl font-bold text-gray-700 hover:text-gray-900">
          &gt;
        </button>
      </div>
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center font-bold text-lg text-gray-700">
            {day}
          </div>
        ))}
      </div>
      {/* 日付タイル */}
      <div className="grid grid-cols-7 gap-2">
        {tiles.map((date, index) => {
          if (!date) return <div key={index} className="h-16"></div>;
          const localDate = date.toLocaleDateString('en-CA');
          const selectedLocalDate = selectedDate.toLocaleDateString('en-CA');
          const isSelected = selectedLocalDate === localDate;
          let tileClass = "h-16 flex items-center justify-center border rounded-lg cursor-pointer transition transform duration-300 text-2xl font-semibold";
          if (isSelected) {
            tileClass += " bg-gray-800 text-white shadow-2xl scale-110";
          } else if (isJapaneseHoliday(date)) {
            tileClass += " bg-yellow-200 text-gray-800";
          } else if (date.getDay() === 0) {
            tileClass += " bg-red-200 text-gray-800";
          } else if (date.getDay() === 6) {
            tileClass += " bg-blue-200 text-gray-800";
          } else {
            tileClass += " bg-white text-gray-800 hover:bg-gray-100";
          }
          return (
            <div
              key={index}
              className={tileClass}
              onClick={() => onDateSelect(date)}
            >
              <span>{date.getDate()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
} 