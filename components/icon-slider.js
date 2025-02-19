import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';

export default function IconSlider({ 
  currentUserId, 
  onUserSelect, 
  selectedUsers = [], 
  isDesktop 
}) {
  const { data: session } = useSession();
  const [users, setUsers] = useState([]);

  // アカウント種別の表示順序を定義
  const accountTypeOrder = ['営業', '業務', 'アルバイト'];

  // 所属の表示順序を定義
  const affiliationOrder = ['北海道', '仙台', '東京', '埼玉', '名古屋', '大阪', '福岡'];

  // ユーザーをアカウント種別でグループ化して並び替える
  const groupedUsers = useMemo(() => {
    const grouped = users.reduce((acc, user) => {
      const accountType = user.data[5];
      const affiliation = user.data[4] || 'その他';
      if (!acc[accountType]) {
        acc[accountType] = {};
      }
      if (!acc[accountType][affiliation]) {
        acc[accountType][affiliation] = [];
      }
      acc[accountType][affiliation].push(user);
      return acc;
    }, {});

    // 各所属グループ内でユーザー名でソート
    Object.keys(grouped).forEach(type => {
      Object.keys(grouped[type]).forEach(affiliation => {
        grouped[type][affiliation].sort((a, b) => 
          a.username.localeCompare(b.username)
        );
      });
    });

    return grouped;
  }, [users]);

  // ユーザーのフィルタリング関数
  const filterUsers = (allUsers) => {
    if (!session?.user) return [];

    // 管理者権限を持っている場合は全ユーザーを表示
    if (session.user.isAdmin) {
      return allUsers;
    }

    const currentUserType = session.user.accountType;
    const currentUserId = session.user.userId;

    switch (currentUserType) {
      case '営業':
      case '業務':
        // 営業と業務のユーザーのみ表示
        return allUsers.filter(user => {
          const accountType = user.data[5];
          return accountType === '営業' || accountType === '業務';
        });
      case 'アルバイト':
        // 自分のみ表示
        return allUsers.filter(user => user.id === currentUserId);
      default:
        return [];
    }
  };

  useEffect(() => {
    // ユーザーデータをフェッチする
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        const dataJson = await response.json();
        // スプレッドシートのデータを適切な形式にマッピング
        const formattedUsers = dataJson.data.map(item => ({
          id: item.data[1],        // userId
          username: item.data[0],   // name
          image_url: item.data[6],  // iconUrl
          data: item.data,          // 元のデータも保持（フィルタリングに必要）
        }));
        // フィルタリングを適用
        const filteredUsers = filterUsers(formattedUsers);
        setUsers(filteredUsers);
      } catch (error) {
        console.error('ユーザーの取得に失敗しました:', error);
      }
    };

    fetchUsers();
  }, [session]); // session を依存配列に追加

  // デバッグ用のログ出力
  useEffect(() => {
    console.log('Current session in IconSlider:', session);
    console.log('Filtered users in IconSlider:', users);
  }, [session, users]);

  return (
    <div className="fixed bottom-16 -mx-4 left-0 right-0 z-20 pb-2">
      {/* スクロールインジケーター */}
      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
        <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1">
          <span className="text-xs text-white/80">←</span>
          <span className="text-xs text-white/80">スワイプ</span>
          <span className="text-xs text-white/80">→</span>
        </div>
      </div>
      {/* 装飾的な背景要素 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 青い背景の曲線を更新して、画面の両端に端を合わせ、中央に頂点が来るように調整 */}
        <div className="absolute inset-0 w-full">
          <svg className="w-full h-20" viewBox="0 0 1440 60" preserveAspectRatio="none">
            {/* 曲線の頂点（x=720,y=0）が中央に来るように調整 */}
            <path
              d="M0,20 C480,0 960,0 1440,20 V60 H0 Z"
              className="fill-blue-500"
              opacity="0.9"
            />
          </svg>
        </div>
      </div>

      <div className="relative z-10">
        <div className="relative -mt-6">
          <div className="relative">
            {/* スクロールの存在を示す左右のグラデーション */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-blue-500 to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-blue-500 to-transparent z-10 pointer-events-none"></div>
            
            {/* スクロール可能なコンテナ */}
            <div className="overflow-x-auto scrollbar-hide mask-edges">
              <div className="flex gap-6 py-2 items-center min-w-min mx-auto pl-8 pr-12"
                   style={{ width: 'max-content' }}>
                {accountTypeOrder.map(accountType => (
                  groupedUsers[accountType] && Object.keys(groupedUsers[accountType]).length > 0 && (
                    <div key={accountType} className="flex flex-col">
                      <div className="flex gap-6">
                        {affiliationOrder.map(affiliation => (
                          groupedUsers[accountType][affiliation]?.length > 0 && (
                            <div key={affiliation} className="flex flex-col">
                              <div className="flex gap-6">
                                {groupedUsers[accountType][affiliation].map((user) => (
                                  <div
                                    key={user.id}
                                    onClick={() => isDesktop && onUserSelect(user)}
                                    className={`flex-shrink-0 transition-all duration-300 ${
                                      isDesktop ? 'cursor-pointer' : ''
                                    }`}
                                  >
                                    <Link
                                      href={`/member-schedule?user=${encodeURIComponent(user.username)}`}
                                      className={`flex-shrink-0 transition-all duration-300`}
                                      onClick={(e) => isDesktop && e.preventDefault()}
                                    >
                                      <div className="flex flex-col items-center relative">
                                        <div className={`relative w-14 h-14 rounded-full bg-white
                                          ${user.id === currentUserId 
                                            ? 'ring-[3px] ring-green-500'
                                            : selectedUsers.some(u => u.data[1] === user.id)
                                              ? 'ring-[3px] ring-blue-500'
                                              : 'ring-2 ring-white/80'
                                          }`}
                                        >
                                          {user.image_url ? (
                                            <Image
                                              src={user.image_url}
                                              alt={user.username || 'ユーザー'}
                                              fill
                                              className="rounded-full object-cover"
                                            />
                                          ) : (
                                            <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-100 to-white flex items-center justify-center">
                                              <span className="text-xl font-medium text-blue-600">
                                                {(user.username || 'U').charAt(0)}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                        
                                        {/* ユーザー名の表示を更新 */}
                                        <span className={`mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full w-16 truncate text-center
                                          ${user.id === currentUserId 
                                            ? 'bg-green-500 text-white font-bold'
                                            : selectedUsers.some(u => u.data[1] === user.id)
                                              ? 'bg-blue-500 text-white font-bold'
                                              : 'text-white'
                                          }`}
                                          title={user.username || 'ユーザー'}
                                        >
                                          {user.username || 'ユーザー'}
                                        </span>
                                      </div>
                                    </Link>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
