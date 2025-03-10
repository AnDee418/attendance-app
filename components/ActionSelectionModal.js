import React from 'react';

export default function ActionSelectionModal({ 
  onClose, 
  onSelect, 
  date, 
  type, 
  hasExistingData 
}) {
  const title = type === 'schedule' ? '予定登録' : '勤務実績登録';
  
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[110] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-semibold mb-4">{date} の{title}</h2>
        
        <p className="mb-6">
          {hasExistingData 
            ? `この日の${title}データが既に存在します。どうしますか？` 
            : `この日の${title}を行いますか？`}
        </p>
        
        <div className="flex flex-col space-y-3">
          {hasExistingData && (
            <button 
              onClick={() => onSelect('edit')}
              className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 
                transition-all duration-200 active:scale-95"
            >
              既存データを編集する
            </button>
          )}
          
          <button 
            onClick={() => onSelect('add')}
            className="w-full bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 
              transition-all duration-200 active:scale-95"
          >
            {hasExistingData ? '新規データを追加する' : '新規登録する'}
          </button>
          
          <button 
            onClick={onClose}
            className="w-full bg-gray-100 text-gray-700 p-3 rounded-lg hover:bg-gray-200 
              transition-all duration-200 active:scale-95"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
} 