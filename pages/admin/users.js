import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import {
  UserCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  ShieldCheckIcon,
  UserIcon,
  BriefcaseIcon,
  DocumentTextIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// ヘルパー関数を修正
const getImageUrl = (url) => {
  if (!url) return '';
  // 既にフルパスの場合はそのまま返す
  if (url.startsWith('http')) return url;
  // 相対パスの場合はそのまま返す
  return url;
};

// アカウント種別に応じたアイコンとスタイルを返す関数を追加
const getAccountTypeInfo = (accountType) => {
  switch (accountType) {
    case '管理者':
      return {
        icon: <ShieldCheckIcon className="h-3.5 w-3.5" />,
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-700'
      };
    case '営業':
      return {
        icon: <BriefcaseIcon className="h-3.5 w-3.5" />,
        bgColor: 'bg-green-100',
        textColor: 'text-green-700'
      };
    case '業務':
      return {
        icon: <DocumentTextIcon className="h-3.5 w-3.5" />,
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-700'
      };
    case 'アルバイト':
      return {
        icon: <UserIcon className="h-3.5 w-3.5" />,
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-700'
      };
    default:
      return {
        icon: <UserIcon className="h-3.5 w-3.5" />,
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-700'
      };
  }
};

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [upImg, setUpImg] = useState();
  const [imgRef, setImgRef] = useState(null);
  const [crop, setCrop] = useState({
    unit: '%',
    width: 90,
    height: 90,
    x: 5,
    y: 5,
    aspect: 1
  });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 管理者以外のアクセスを制限
  useEffect(() => {
    if (status === 'authenticated' && !session?.user?.isAdmin) {
      router.push('/');
    }
  }, [session, status, router]);

  // ユーザー一覧を取得
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.data) {
        console.log('Fetched users:', data.data);
        // データが配列であることを確認
        if (Array.isArray(data.data)) {
          setUsers(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleEditUser = async (updatedUser) => {
    try {
      console.log('Selected user:', selectedUser); // 選択されているユーザー情報
      console.log('Updating user with:', updatedUser); // 更新データ

      // 必須フィールドの確認
      if (!updatedUser.name || !updatedUser.email || !updatedUser.affiliation || !updatedUser.accountType) {
        alert('すべての必須項目を入力してください。');
        return;
      }

      const res = await fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rowIndex: updatedUser.rowIndex,
          name: updatedUser.name,
          userId: updatedUser.userId,
          password: updatedUser.password,
          email: updatedUser.email,
          affiliation: updatedUser.affiliation,
          accountType: updatedUser.accountType,
          iconUrl: updatedUser.iconUrl,
          isAdmin: updatedUser.isAdmin
        })
      });

      const data = await res.json();
      console.log('API Response:', data);

      if (res.ok) {
        await fetchUsers();
        setIsModalOpen(false);
      } else {
        alert(data.error || 'ユーザー情報の更新に失敗しました。');
      }
    } catch (error) {
      console.error('ユーザー更新エラー:', error);
      alert('ユーザー情報の更新に失敗しました。');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (confirm('このユーザーを削除してもよろしいですか？')) {
      try {
        const res = await fetch('/api/users/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
        if (res.ok) {
          await fetchUsers();
        }
      } catch (error) {
        console.error('ユーザー削除エラー:', error);
      }
    }
  };

  // 画像をキャンバスに描画してBlobを生成
  const generateCroppedImage = async () => {
    if (!completedCrop || !imgRef) return null;

    const canvas = document.createElement('canvas');
    const scaleX = imgRef.naturalWidth / imgRef.width;
    const scaleY = imgRef.naturalHeight / imgRef.height;

    // キャンバスサイズを固定値に設定（例：400x400ピクセル）
    canvas.width = 400;
    canvas.height = 400;
    
    const ctx = canvas.getContext('2d');

    // 円形クリッピングを適用
    ctx.beginPath();
    ctx.arc(200, 200, 200, 0, Math.PI * 2);
    ctx.clip();

    // 画像を描画
    ctx.drawImage(
      imgRef,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      400,
      400
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        'image/jpeg',
        0.95
      );
    });
  };

  // 画像選択時の処理を修正
  const onSelectFile = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setUpImg(reader.result);
        setShowCropper(true);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // affiliationsの定義を追加
  const affiliations = [
    { value: '北海道', label: '北海道' },
    { value: '仙台', label: '仙台' },
    { value: '東京', label: '東京' },
    { value: '埼玉', label: '埼玉' },
    { value: '名古屋', label: '名古屋' },
    { value: '大阪', label: '大阪' },
    { value: '福岡', label: '福岡' }
  ];

  if (status === 'loading') return <div>Loading...</div>;
  if (!session || !session.user?.isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* シンプルなヘッダー */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← 戻る
          </button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users && users.map((user) => (
            <div
              key={user.rowIndex}
              onClick={() => {
                setSelectedUser(user);
                setIsModalOpen(true);
              }}
              className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
            >
              <div className="p-4">
                <div className="flex items-center space-x-3">
                  {/* アイコン */}
                  {user.data && user.data[6] && user.data[6].trim() ? (
                    <img
                      src={user.data[6]}
                      alt={user.data[0]}
                      className="w-12 h-12 rounded-full object-cover"
                      onError={(e) => {
                        e.target.src = '';
                        e.target.onerror = null;
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <UserCircleIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  
                  {/* ユーザー情報 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-medium text-gray-900 truncate">
                        {user.data[0]}
                      </h2>
                      {(() => {
                        const { icon, bgColor, textColor } = getAccountTypeInfo(user.data[5]);
                        return (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
                            {icon}
                            <span className="ml-1">{user.data[5]}</span>
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-sm text-gray-500 truncate mt-0.5">
                      {user.data[4]} {/* 所属 */}
                    </p>
                  </div>
                </div>
              </div>

              {/* アクションボタン */}
              <div className="px-4 py-2 bg-gray-50 flex justify-end space-x-2 border-t">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedUser(user);
                    setIsModalOpen(true);
                  }}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteUser(user.data[1]);
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 編集モーダル */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 my-20 max-h-[calc(100vh-160px)] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">ユーザー編集</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              
              const updateData = {
                rowIndex: selectedUser.rowIndex,
                name: formData.get('name'),
                userId: formData.get('userId'),
                password: formData.get('password'),
                email: formData.get('email'),
                affiliation: formData.get('affiliation'),
                accountType: formData.get('accountType'),
                iconUrl: selectedUser.data[6],
                isAdmin: formData.get('isAdmin') ? true : false
              };

              console.log('Form data:', updateData);
              await handleEditUser(updateData);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ユーザーアイコン</label>
                  <div className="space-y-4">
                    {/* 現在のアイコン表示 */}
                    {!showCropper && (
                      <div className="flex items-center gap-4">
                        {selectedUser.data[6] && selectedUser.data[6].trim() ? (
                          <img
                            src={selectedUser.data[6]}
                            alt="現在のアイコン"
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <UserCircleIcon className="h-12 w-12 text-gray-400" />
                        )}
                        <input
                          type="file"
                          onChange={onSelectFile}
                          accept="image/*"
                          className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                      </div>
                    )}

                    {/* トリミングモーダル */}
                    {showCropper && (
                      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col" style={{ top: '64px', bottom: '64px' }}>
                        {/* ヘッダー部分 */}
                        <div className="bg-white p-4">
                          <div className="max-w-6xl mx-auto flex justify-between items-center">
                            <h3 className="text-lg font-medium text-gray-900">
                              プロフィール画像のトリミング
                            </h3>
                            <button
                              type="button"
                              onClick={() => {
                                setShowCropper(false);
                                setUpImg(null);
                              }}
                              className="text-gray-400 hover:text-gray-500"
                            >
                              <span className="sr-only">閉じる</span>
                              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* トリミングエリア */}
                        <div className="flex-1 flex items-center justify-center p-4 bg-gray-900 overflow-hidden">
                          <div className="relative max-w-2xl w-full h-full flex items-center justify-center">
                            {upImg && (
                              <ReactCrop
                                crop={crop}
                                onChange={(_, percentCrop) => setCrop(percentCrop)}
                                onComplete={(c) => setCompletedCrop(c)}
                                aspect={1}
                                circularCrop
                              >
                                <img
                                  src={upImg}
                                  onLoad={(e) => {
                                    setImgRef(e.target);
                                  }}
                                  style={{ 
                                    maxHeight: 'calc(100vh - 280px)',
                                    width: 'auto',
                                    maxWidth: '100%',
                                    objectFit: 'contain'
                                  }}
                                  alt="トリミング対象"
                                />
                              </ReactCrop>
                            )}
                          </div>
                        </div>

                        {/* フッター */}
                        <div className="bg-gray-800 p-4">
                          <div className="max-w-2xl mx-auto">
                            <div className="flex items-center justify-between">
                              <p className="text-white text-sm">
                                画像を円形に切り取ってください
                              </p>
                              <div className="flex gap-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowCropper(false);
                                    setUpImg(null);
                                  }}
                                  className="px-6 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                  キャンセル
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (completedCrop && imgRef) {
                                      const croppedImageBlob = await generateCroppedImage();
                                      if (croppedImageBlob) {
                                        const uploadData = new FormData();
                                        uploadData.append('file', croppedImageBlob, 'cropped-image.jpg');
                                        try {
                                          const uploadRes = await fetch('/api/upload', {
                                            method: 'POST',
                                            body: uploadData,
                                          });
                                          if (uploadRes.ok) {
                                            const uploadResult = await uploadRes.json();
                                            const updatedUser = { ...selectedUser };
                                            updatedUser.data[6] = uploadResult.url;
                                            setSelectedUser(updatedUser);
                                            setShowCropper(false);
                                            setUpImg(null);
                                          } else {
                                            throw new Error('アイコンのアップロードに失敗しました。');
                                          }
                                        } catch (error) {
                                          console.error('アイコンアップロードエラー:', error);
                                          alert(error.message);
                                        }
                                      }
                                    }
                                  }}
                                  className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  トリミングを確定
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ユーザーID</label>
                  <input
                    name="userId"
                    defaultValue={selectedUser.data[1]}
                    className="mt-1 w-full p-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">パスワード</label>
                  <div className="relative mt-1">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      defaultValue={selectedUser.data[2]}
                      className="w-full p-2 pr-10 border rounded-lg"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">名前</label>
                  <input
                    name="name"
                    defaultValue={selectedUser.data[0]}
                    className="mt-1 w-full p-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
                  <input
                    name="email"
                    type="email"
                    defaultValue={selectedUser.data[3]}
                    className="mt-1 w-full p-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">所属</label>
                  <select
                    name="affiliation"
                    defaultValue={selectedUser.data[4]}
                    className="mt-1 w-full p-2 border rounded-lg bg-white"
                    required
                  >
                    <option value="">選択してください</option>
                    {affiliations.map((affiliation) => (
                      <option key={affiliation.value} value={affiliation.value}>
                        {affiliation.value}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">アカウント種別</label>
                  <select
                    name="accountType"
                    defaultValue={selectedUser.data[5]}
                    className="mt-1 w-full p-2 border rounded-lg"
                    required
                  >
                    <option value="">選択してください</option>
                    <option value="営業">営業</option>
                    <option value="業務">業務</option>
                    <option value="アルバイト">アルバイト</option>
                  </select>
                </div>
                <div className="mt-4">
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      name="isAdmin"
                      defaultChecked={selectedUser.data[7] === 'true'}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">管理者権限を与える</span>
                  </label>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setShowCropper(false);
                    setUpImg(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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

AdminUsersPage.title = 'ユーザー管理';