// pages/account-issuance.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import {
  UserCircleIcon,
  ShieldCheckIcon,
  BriefcaseIcon,
  DocumentTextIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// アカウント種別の定義
const accountTypes = [
  {
    value: '営業',
    label: '営業',
    icon: BriefcaseIcon,
    description: '営業活動の記録と管理を行います',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200'
  },
  {
    value: '業務',
    label: '業務',
    icon: DocumentTextIcon,
    description: '一般的な業務を行います',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200'
  },
  {
    value: 'アルバイト',
    label: 'アルバイト',
    icon: UserIcon,
    description: '限定的な業務を行います',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200'
  }
];

// 所属の定義
const affiliations = [
  { value: '北海道', label: '北海道' },
  { value: '仙台', label: '仙台' },
  { value: '東京', label: '東京' },
  { value: '埼玉', label: '埼玉' },
  { value: '名古屋', label: '名古屋' },
  { value: '大阪', label: '大阪' },
  { value: '福岡', label: '福岡' }
];

export default function AccountIssuancePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    userId: '',
    password: '',
    email: '',
    affiliation: '',
    accountType: '',
    iconUrl: '',
    isAdmin: false
  });
  const [error, setError] = useState('');
  
  // トリミング関連のstate
  const [showCropper, setShowCropper] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // isAdmin フラグをチェックして accountType を決定
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          userId: formData.userId,
          password: formData.password,
          email: formData.email,
          affiliation: formData.affiliation,
          accountType: formData.isAdmin ? '管理者' : formData.accountType, // 管理者チェックがオンなら '管理者'
          iconUrl: formData.iconUrl || '', // アイコンURLを追加
          isAdmin: formData.isAdmin
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert('ユーザーアカウントを作成しました。');
        router.push('/admin');
      } else {
        setError(data.error || 'ユーザーアカウントの作成に失敗しました。');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('ユーザーアカウントの作成に失敗しました。');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">アカウント発行</h1>
        <p className="text-gray-600">新しいユーザーアカウントを作成します。</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">名前</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-1 w-full p-2 border rounded-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">ユーザーID</label>
          <input
            type="text"
            value={formData.userId}
            onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
            className="mt-1 w-full p-2 border rounded-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">パスワード</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="mt-1 w-full p-2 border rounded-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="mt-1 w-full p-2 border rounded-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">所属</label>
          <select
            value={formData.affiliation}
            onChange={(e) => setFormData({ ...formData, affiliation: e.target.value })}
            className="mt-1 w-full p-2 border rounded-lg bg-white"
            required
          >
            <option value="">選択してください</option>
            {affiliations.map((affiliation) => (
              <option key={affiliation.value} value={affiliation.value}>
                {affiliation.label}
              </option>
            ))}
          </select>
        </div>

        {/* アカウント種別選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            アカウント種別
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accountTypes.map((type) => (
              <label
                key={type.value}
                className={`
                  relative flex cursor-pointer rounded-lg border p-4 
                  ${formData.accountType === type.value ? 
                    `${type.borderColor} ${type.bgColor}` : 
                    'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <input
                  type="radio"
                  name="accountType"
                  value={type.value}
                  className="sr-only"
                  onChange={(e) => setFormData({
                    ...formData,
                    accountType: e.target.value
                  })}
                />
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center">
                    <div className={`mr-3 ${type.textColor}`}>
                      <type.icon className="h-6 w-6" />
                    </div>
                    <div className="text-sm">
                      <p className={`font-medium ${
                        formData.accountType === type.value ? type.textColor : 'text-gray-900'
                      }`}>
                        {type.label}
                      </p>
                      <p className="text-gray-500">{type.description}</p>
                    </div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 新しい「管理者権限を与える」チェックボックス */}
        <div className="mt-4">
          <label className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              checked={formData.isAdmin}
              onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">管理者権限を与える</span>
          </label>
        </div>

        {/* ユーザーアイコン選択部分 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ユーザーアイコン
          </label>
          <div className="flex items-center gap-4">
            {formData.iconUrl ? (
              <img
                src={formData.iconUrl}
                alt="ユーザーアイコン"
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <UserCircleIcon className="w-16 h-16 text-gray-400" />
            )}
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.addEventListener('load', () => {
                      setUpImg(reader.result);
                      setShowCropper(true);
                    });
                    reader.readAsDataURL(file);
                  }
                }}
                className="hidden"
                id="icon-upload"
              />
              <label
                htmlFor="icon-upload"
                className="inline-block px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                画像を選択
              </label>
            </div>
          </div>
        </div>

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
                                setFormData(prev => ({
                                  ...prev,
                                  iconUrl: uploadResult.url
                                }));
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

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            登録
          </button>
        </div>
      </form>
    </div>
  );
}
