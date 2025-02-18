// pages/dashboard.js
import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';
import { 
  UserCircleIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  UserIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
  BriefcaseIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  EyeSlashIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

// アカウント種別の定義
const accountTypes = {
  '管理者': {
    icon: <ShieldCheckIcon className="h-3.5 w-3.5" />,
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700'
  },
  '営業': {
    icon: <BriefcaseIcon className="h-3.5 w-3.5" />,
    bgColor: 'bg-green-100',
    textColor: 'text-green-700'
  },
  '業務': {
    icon: <DocumentTextIcon className="h-3.5 w-3.5" />,
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700'
  },
  'アルバイト': {
    icon: <UserIcon className="h-3.5 w-3.5" />,
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700'
  }
};

// 追加情報用のアイコン定義
const userInfoIcons = {
  'id': <UserIcon className="h-4 w-4" />,
  'pass': <EyeSlashIcon className="h-4 w-4" />,
  'email': <EnvelopeIcon className="h-4 w-4" />,
  'affiliation': <BuildingOfficeIcon className="h-4 w-4" />
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [userData, setUserData] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (session?.user?.userId) {
        try {
          const res = await fetch('/api/users');
          const data = await res.json();
          if (data.data) {
            const userInfo = data.data.find(user => user.data[1] === session.user.userId);
            setUserData(userInfo);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    };

    fetchUserData();
  }, [session]);

  if (status === "loading") {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>;
  }

  if (!session) {
    return <div className="flex justify-center items-center min-h-screen">
      <button
        onClick={() => signIn()}
        className="bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-blue-600 transition-colors"
      >
        ログインしてください
      </button>
    </div>;
  }

  const accountType = userData?.data[5] || 'その他';
  const department = userData?.data[4] || '所属なし';

  // ユーザー情報更新関数を追加
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const updateData = {
      rowIndex: userData.rowIndex,
      name: formData.get('name'),
      userId: formData.get('userId'),
      password: formData.get('password'),
      email: formData.get('email'),
      affiliation: formData.get('affiliation'),
      accountType: userData.data[5], // アカウント種別は変更不可
      iconUrl: userData.data[6],
      isAdmin: userData.data[7]
    };

    try {
      const res = await fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        // 更新成功後にユーザーデータを再取得
        const newData = await fetch('/api/users');
        const data = await newData.json();
        if (data.data) {
          const updatedUser = data.data.find(user => user.data[1] === session.user.userId);
          setUserData(updatedUser);
        }
        setIsEditModalOpen(false);
      } else {
        throw new Error('更新に失敗しました');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('ユーザー情報の更新に失敗しました');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* ユーザー情報カード */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-4">
        {/* ヘッダー部分 - 編集ボタンを追加 */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-4">
          <div className="flex items-center justify-between">
            {/* ユーザー情報部分 */}
            <div className="flex items-center gap-4">
              {userData?.data[6] ? (
                <img
                  src={userData.data[6]}
                  alt={userData.data[0]}
                  className="w-16 h-16 rounded-full border-4 border-white shadow-lg object-cover"
                />
              ) : (
                <UserCircleIcon className="w-16 h-16 text-white/90" />
              )}
              <div>
                <h1 className="text-xl font-bold text-white mb-1.5">
                  {userData?.data[0]}
                </h1>
                <div className="flex flex-wrap gap-1.5">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full 
                    ${accountTypes[accountType]?.bgColor || 'bg-gray-100'} 
                    ${accountTypes[accountType]?.textColor || 'text-gray-700'}`}>
                    {accountTypes[accountType]?.icon}
                    <span className="text-xs font-medium">{accountType}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/90 text-gray-700">
                    <BuildingOfficeIcon className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">{department}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 編集ボタン */}
            <Link
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setIsEditModalOpen(true);
              }}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 
                transition-colors duration-200 text-white"
            >
              <PencilSquareIcon className="h-5 w-5" />
            </Link>
          </div>
        </div>

        {/* 追加情報 - よりコンパクトに */}
        <div className="p-3">
          <div className="space-y-2">
            {/* ID */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-gray-600">
                  {userInfoIcons.id}
                  <span className="text-xs font-medium">社員番号</span>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {userData?.data[1] || '未設定'}
                </p>
              </div>
            </div>

            {/* パスワード */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-gray-600">
                  {userInfoIcons.pass}
                  <span className="text-xs font-medium">パスワード</span>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {'●'.repeat(userData?.data[2]?.length || 4)}
                </p>
              </div>
            </div>

            {/* メールアドレス */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-gray-600">
                  {userInfoIcons.email}
                  <span className="text-xs font-medium">メールアドレス</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 break-all max-w-[200px] text-right">
                  {userData?.data[3] || '未設定'}
                </p>
              </div>
            </div>

            {/* 所属 */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-gray-600">
                  {userInfoIcons.affiliation}
                  <span className="text-xs font-medium">所属</span>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {userData?.data[4] || '未設定'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ログアウトボタン */}
      <button
        onClick={() => signOut({ callbackUrl: '/sign-in' })}
        className="w-full bg-white hover:bg-gray-50 text-red-600 font-medium py-4 px-4 rounded-xl shadow-lg 
          flex items-center justify-center gap-2 transition-colors duration-200"
      >
        <ArrowRightOnRectangleIcon className="h-5 w-5" />
        ログアウト
      </button>

      {/* 編集モーダルを追加 */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">ユーザー情報の編集</h2>
            </div>
            
            <form onSubmit={handleUpdateUser} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名前</label>
                <input
                  name="name"
                  defaultValue={userData?.data[0]}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">社員番号</label>
                <input
                  name="userId"
                  defaultValue={userData?.data[1]}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
                <input
                  name="password"
                  type="password"
                  defaultValue={userData?.data[2]}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                <input
                  name="email"
                  type="email"
                  defaultValue={userData?.data[3]}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">所属</label>
                <select
                  name="affiliation"
                  defaultValue={userData?.data[4]}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  required
                >
                  <option value="">選択してください</option>
                  <option value="北海道">北海道</option>
                  <option value="仙台">仙台</option>
                  <option value="東京">東京</option>
                  <option value="埼玉">埼玉</option>
                  <option value="名古屋">名古屋</option>
                  <option value="大阪">大阪</option>
                  <option value="福岡">福岡</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

DashboardPage.title = 'ダッシュボード';
