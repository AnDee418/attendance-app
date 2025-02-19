import { XMarkIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useEffect } from 'react';

export default function NotificationModal({ isOpen, onClose, notifications, onMarkAsRead }) {
  if (!isOpen) return null;

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // モーダルを開いたときに未読の通知を全て既読にする
  useEffect(() => {
    if (isOpen) {
      const unreadNotifications = notifications.filter(notification => !notification.isChecked);
      unreadNotifications.forEach(notification => {
        onMarkAsRead(notification);
      });
    }
  }, [isOpen, notifications, onMarkAsRead]);

  // 背景クリックでモーダルを閉じる
  const handleBackgroundClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20"
      onClick={handleBackgroundClick}  // 背景クリックのハンドラを追加
    >
      <div className="bg-white w-full max-w-md rounded-lg shadow-xl mx-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">通知</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"  // パディングを増やして押しやすく
            aria-label="閉じる"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500 hover:text-gray-700" />
          </button>
        </div>

        {/* 通知リスト */}
        <div className="max-h-[60vh] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>新しい通知はありません</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={`${notification.date}-${notification.employeeName}`}
                  className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !notification.isChecked ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => onMarkAsRead(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500" />
                    <div>
                      <p className="text-gray-900">
                        {format(new Date(notification.date), 'M月d日', { locale: ja })}
                        の{notification.type}申請が
                        <span className="font-semibold text-green-600">承認</span>
                        されました
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {format(new Date(notification.approvedDate), 'M月d日 HH:mm', { locale: ja })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 