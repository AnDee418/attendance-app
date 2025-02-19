import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

export default function VacationManagementPage() {
  const { data: session, status } = useSession();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [userData, setUserData] = useState(null);

  // 休暇申請データの取得
  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/vacation-requests');
      if (!response.ok) throw new Error('休暇申請の取得に失敗しました');
      const data = await response.json();
      // データが配列であることを確認
      setRequests(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setMessage('休暇申請の取得に失敗しました');
      setRequests([]); // エラー時は空配列をセット
    }
  };

  // ユーザーデータの取得
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/users');
        if (!response.ok) throw new Error('ユーザーデータの取得に失敗しました');
        const data = await response.json();
        if (data.data) {
          const foundUser = data.data.find(u => u.data[0] === session?.user?.name);
          setUserData(foundUser);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      fetchUserData();
    }
  }, [session]);

  // 休暇申請データの定期的な更新
  useEffect(() => {
    if (session) {
      fetchRequests();
      const intervalId = setInterval(fetchRequests, 30000); // 30秒ごとに更新
      return () => clearInterval(intervalId);
    }
  }, [session]);

  // 申請の承認/却下処理
  const handleRequestUpdate = async (date, employeeName, action) => {
    try {
      const response = await fetch('/api/vacation-requests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date,
          employeeName,
          status: action === 'approve' ? '許可' : '却下',
          approvedBy: session.user.name,
          approvedDate: new Date().toISOString().split('T')[0],
        }),
      });

      if (!response.ok) throw new Error('申請の更新に失敗しました');
      
      setMessage(action === 'approve' ? '申請を承認しました' : '申請を却下しました');
      setTimeout(() => setMessage(''), 3000);
      fetchRequests();
    } catch (error) {
      console.error('Error updating request:', error);
      setMessage('申請の更新に失敗しました');
    }
  };

  // ローディング中の表示
  if (isLoading || status === 'loading' || !session) {
    return <LoadingSpinner />;
  }

  // 管理者以外のアクセスを制限
  if (!session?.user?.isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              アクセス権限がありません
            </h1>
            <p className="text-gray-600">
              このページは管理者のみがアクセスできます。
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // 申請を状態によって分類（データの存在確認を追加）
  const pendingRequests = requests.filter(req => req && req.status === '申請中');
  const processedRequests = requests.filter(req => req && req.status !== '申請中');

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-10">
        {/* ヘッダーセクション */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">休暇申請管理</h1>
              <p className="mt-1 text-sm text-gray-600">
                従業員からの休暇申請を管理・承認することができます
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 sm:flex-none bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-200">
                <div className="text-xs text-gray-500 mb-1">総申請数</div>
                <div className="text-xl sm:text-2xl font-bold text-gray-900">{requests.length}</div>
              </div>
              <div className="flex-1 sm:flex-none bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-200">
                <div className="text-xs text-gray-500 mb-1">未処理</div>
                <div className="text-xl sm:text-2xl font-bold text-red-600">{pendingRequests.length}</div>
              </div>
            </div>
          </div>

          {message && (
            <div className="animate-fade-in-down bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">{message}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 申請中のセクション */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">申請中の休暇</h2>
                <p className="text-sm text-gray-500">承認待ちの休暇申請一覧</p>
              </div>
            </div>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">申請中の休暇はありません</h3>
              <p className="mt-2 text-sm text-gray-500">現在、承認待ちの休暇申請はありません。</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="divide-y divide-gray-200">
                {pendingRequests.map((request, index) => (
                  <div key={index} className="p-4 sm:px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {request.employeeName ? request.employeeName[0] : ''}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{request.employeeName}</div>
                          <div className="text-sm text-gray-500">申請日: {request.requestDate}</div>
                          <div className="text-sm text-gray-500">休暇予定日: {request.date}</div>
                          <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${request.type === '有休' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                            {request.type}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 sm:flex-col md:flex-row">
                        <button
                          onClick={() => handleRequestUpdate(request.date, request.employeeName, 'approve')}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                        >
                          承認
                        </button>
                        <button
                          onClick={() => handleRequestUpdate(request.date, request.employeeName, 'reject')}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                        >
                          却下
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 処理済みのセクション */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">処理済みの申請</h2>
                <p className="text-sm text-gray-500">承認・却下済みの休暇申請履歴</p>
              </div>
            </div>
          </div>

          {processedRequests.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">処理済みの申請はありません</h3>
              <p className="mt-2 text-sm text-gray-500">まだ処理済みの休暇申請がありません。</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="divide-y divide-gray-200">
                {processedRequests.map((request, index) => (
                  <div key={index} className="p-4 sm:px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {request.employeeName ? request.employeeName[0] : ''}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{request.employeeName}</div>
                          <div className="text-sm text-gray-500">申請日: {request.requestDate}</div>
                          <div className="text-sm text-gray-500">休暇予定日: {request.date}</div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                              ${request.type === '有休' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                              {request.type}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                              ${request.status === '許可' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {request.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="sm:ml-auto text-sm text-gray-500">
                        <div>承認者: {request.approvedBy}</div>
                        <div>承認日: {request.approvedDate}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
} 