import React from 'react';

export default function WorkDetailModal({ workDetail, onClose }) {
  if (!workDetail) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm" 
        onClick={onClose}
      />
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
        bg-gradient-to-b from-white to-gray-50/80
        rounded-2xl shadow-xl p-6 w-11/12 max-w-md z-[101] border border-gray-200">
        
        {/* ヘッダー部分 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-inner">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">業務詳細</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 group"
            >
              <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200">
            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
              />
            </svg>
            <p className="text-sm text-gray-600">
              {new Date(workDetail.date).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
              })}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* ステータスバッジ */}
          <div className="flex items-center justify-between">
            <span className={`px-4 py-1.5 rounded-xl text-sm font-medium shadow-sm
              ${workDetail.recordType === '出勤簿'
                ? 'bg-gradient-to-r from-emerald-50 to-emerald-100/80 text-emerald-700 ring-1 ring-emerald-200'
                : 'bg-gradient-to-r from-blue-50 to-blue-100/80 text-blue-700 ring-1 ring-blue-200'
              }`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  workDetail.recordType === '出勤簿'
                    ? 'bg-emerald-500'
                    : 'bg-blue-500'
                }`}></div>
                {workDetail.recordType === '出勤簿' ? '実績' : '予定'}
              </div>
            </span>
            <span className="px-4 py-1.5 rounded-xl text-sm font-medium shadow-sm
              bg-gradient-to-r from-purple-50 to-purple-100/80 text-purple-700 ring-1 ring-purple-200">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                {workDetail.workCategory || '業務'}
              </div>
            </span>
          </div>

          {/* コンテンツ部分 */}
          <div className="bg-white rounded-xl p-5 space-y-5 shadow-sm border border-gray-200">
            {/* タイトルセクション */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">タイトル</label>
              <div className="text-base font-medium text-gray-900 bg-gray-50 px-4 py-3 rounded-xl border border-gray-200">
                {workDetail.workTitle}
              </div>
            </div>

            {/* 時間セクション */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">開始時間</label>
                <div className="text-base font-medium text-blue-600 bg-blue-50 px-4 py-3 rounded-xl border border-blue-200 text-center">
                  {workDetail.workStart}
                </div>
              </div>
              <div className="flex items-center pt-8">
                <div className="w-8 h-px bg-gray-300"></div>
                <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                <div className="w-8 h-px bg-gray-300"></div>
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">終了時間</label>
                <div className="text-base font-medium text-blue-600 bg-blue-50 px-4 py-3 rounded-xl border border-blue-200 text-center">
                  {workDetail.workEnd}
                </div>
              </div>
            </div>

            {/* 詳細セクション */}
            {workDetail.detail && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">詳細</label>
                <div className="text-sm text-gray-700 bg-gray-50 px-4 py-3.5 rounded-xl border border-gray-200 whitespace-pre-wrap">
                  {workDetail.detail}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 