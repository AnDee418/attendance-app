import { useState } from 'react';
import { useRouter } from 'next/router';
import {
  UserCircleIcon,
  ShieldCheckIcon,
  BriefcaseIcon,
  DocumentTextIcon,
  UserIcon
} from '@heroicons/react/24/outline';

// アカウント種別の定義
const accountTypes = [
  {
    value: '管理者',
    label: '管理者',
    icon: ShieldCheckIcon,
    description: 'システム全体の管理権限を持ちます',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200'
  },
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

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    userId: '',
    password: '',
    email: '',
    affiliation: '',
    accountType: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (res.ok) {
        alert('ユーザーアカウントを作成しました。');
        router.push('/admin');
      } else {
        setError(data.error || 'ユーザーアカウントの作成に失敗しました。');
      }
    } catch (error) {
      setError('ユーザーアカウントの作成に失敗しました。');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">新規ユーザー登録</h1>
        <p className="text-gray-600">新しいユーザーアカウントを作成します。</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ... 他の入力フィールド ... */}

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