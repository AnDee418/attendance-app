import { useRouter } from 'next/router';

export default function Error() {
  const router = useRouter();
  const { error } = router.query;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            エラーが発生しました
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {error || 'ログイン中にエラーが発生しました。'}
          </p>
          <div className="mt-4 text-center">
            <button
              onClick={() => router.push('/auth/signin')}
              className="text-blue-600 hover:text-blue-500"
            >
              ログインページに戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 