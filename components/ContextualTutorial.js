import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Tutorial from './Tutorial';

// 各ルートに対応するチュートリアルカテゴリーのマッピング
const routeTutorialMap = {
  '/': 'welcome',             // ホームページはみんなの予定ページのチュートリアル（ユーザーカードを含む）
  '/my-schedule': 'mySchedule', // 自分の予定ページ用チュートリアル
  '/schedules': 'schedules',    // みんなの予定ページ用チュートリアル
  '/dashboard': 'settings',     // 設定ページ用チュートリアル
  // 必要に応じて他のページへのマッピングを追加
};

const ContextualTutorial = () => {
  const router = useRouter();
  const [visited, setVisited] = useState({});
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialCategory, setTutorialCategory] = useState(null);

  useEffect(() => {
    // ページ読み込み時にコンポーネントが初期化されるようにする
    const handleInitialize = () => {
      try {
        // ローカルストレージから訪問履歴を取得
        const visitedRoutes = JSON.parse(localStorage.getItem('visitedRoutes') || '{}');
        setVisited(visitedRoutes);

        // 現在のルートに対応するチュートリアルカテゴリーを取得
        const category = routeTutorialMap[router.pathname];
        
        // このルートが初めて訪問された場合、対応するチュートリアルを表示
        if (category && !visitedRoutes[router.pathname]) {
          // ルートを訪問済みとしてマーク
          const updatedVisited = { ...visitedRoutes, [router.pathname]: true };
          localStorage.setItem('visitedRoutes', JSON.stringify(updatedVisited));
          setVisited(updatedVisited);
          
          // チュートリアルを表示
          setTutorialCategory(category);
          setShowTutorial(true);
        }
      } catch (error) {
        console.error('コンテキストチュートリアルの初期化エラー:', error);
      }
    };

    handleInitialize();
  }, [router.pathname]);

  // チュートリアル完了時の処理
  const handleTutorialComplete = () => {
    setShowTutorial(false);
  };

  // チュートリアルをリセットする関数（外部から呼び出し可能）
  const resetContextualTutorial = () => {
    localStorage.removeItem('visitedRoutes');
  };

  // 外部からアクセスできるようにメソッドを公開
  ContextualTutorial.resetContextualTutorial = resetContextualTutorial;

  if (!showTutorial) return null;

  return (
    <Tutorial 
      category={tutorialCategory}
      forceShow={true}
      onComplete={handleTutorialComplete}
      storageKey={`tutorial_${tutorialCategory}`}
    />
  );
};

export default ContextualTutorial; 