import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

// カテゴリー別にチュートリアルステップを整理
const tutorialCategories = {
  welcome: [
    {
      title: 'ようこそ！勤怠アプリへ',
      description: 'このアプリでは勤怠管理や予定の確認が簡単に行えます。',
      image: '/images/tutorial/tutorial_1.png',
    }
  ],
  mySchedule: [
    {
      title: '自分の予定ページ' ,
      description: 'このページでは自分の予定を追加、勤務実績の報告ができます。',
      image: '/images/tutorial/tutorial_2.png',
    },
    {
      title: '1-1 自分の予定ページ',
      description: '日付の右上の「追加」ボタンを押しましょう',
      image: '/images/tutorial/tutorial_3.png',
    },
    {
      title: '1-2 自分の予定ページ',
      description: 'するとこのようなモーダルが出ます。',
      image: '/images/tutorial/tutorial_4.png',
    },
    {
      title: '2-1 行動予定の追加',
      description: '「行動予定の追加（青い方）」は自分の行動予定を追加するためのものです。行動予定を追加しておくと他社員があなたの行動予定を確認できます。',
      image: '/images/tutorial/tutorial_5.png',
    },
    {
      title: '2-2 行動予定の追加',
      description: '予定している勤務種別と勤務時間を入力しましょう。',
      image: '/images/tutorial/tutorial_7.png',
    },
    {
      title: '2-3 行動予定の追加',
      description: '予定している休憩時間を入力しましょう。緑のボタンを押すといくつでも追加できます。ここを入力しない場合休憩がない物として計算されます。ご注意ください。',
      image: '/images/tutorial/tutorial_8.png',
    },
    {
      title: '2-4 行動予定の追加',
      description: '予定している業務を入力しましょう。。緑のボタンを押すといくつでも追加できます。ここに業務を入力することで他社員に自分の業務を知らせることができます。',
      image: '/images/tutorial/tutorial_9.png',
    },
    {
      title: '2-5 行動予定の追加',
      description: '必要項目の入力が終わったら下の保存ボタンを押しましょう。これで行動予定の登録は完了です。',
      image: '/images/tutorial/tutorial_10.png',
    },
    {
      title: '3-1 勤務実績の登録',
      description: '「勤務実績の登録（緑の方）」は勤務実績を報告するためのものです。経理・総務に向け"今日これだけ働きました"という報告をすることができます。これをしないと勤務した実績になりませんので注意してください。毎日必ず勤務後に入力しましょう。',
      image: '/images/tutorial/tutorial_6.png',
    },
    {
      title: '3-2 勤務実績の登録',
      description: '実際に勤務した勤務種別と勤務時間を入力しましょう。',
      image: '/images/tutorial/tutorial_11.png',
    },
    {
      title: '3-3 勤務実績の登録',
      description: '実際に勤務した休憩時間を入力しましょう。緑のボタンを押すといくつでも追加できます。ここを入力しない場合休憩がない物として計算されます。ご注意ください。',
      image: '/images/tutorial/tutorial_12.png',
    },
    {
      title: '3-4 行動予定の追加',
      description: '必要項目の入力が終わったら下の保存ボタンを押しましょう。これで勤務実績の報告は完了です。',
      image: '/images/tutorial/tutorial_10.png',
    },
  ],
  schedules: [
    {
      title: 'みんなの予定ページ',
      description: 'ここから各員の予定を確認する事が出来ます。',
      image: '/images/tutorial/tutorial_13.png',
    },
    {
      title: '1-1 ユーザーカード',
      description: '最初のページにはこのようなユーザーカードが表示されます。',
      image: '/images/tutorial/tutorial_14.png',
    },
    {
      title: '1-2 ユーザーカード',
      description: 'これはその月の行動予定で登録された総勤務時間が表示されます。規定労働時間との比較が表示されますので参考にしてください。（業務・アルバイトアカウントの人には報告した勤務実績の集計が表示されます）',
      image: '/images/tutorial/tutorial_15.png',
    },
    {
      title: '1-3 ユーザーカード',
      description: 'ここにはその月の報告した勤務実績の集計が表示されます。',
      image: '/images/tutorial/tutorial_16.png',
    },
  ],
  detailPage: [
    {
      title: '2-1 詳細ページ',
      description: 'ユーザーカードをタップすると詳細ページに移動します。ここで選択した社員の予定を見ることができます。',
      image: '/images/tutorial/tutorial_17.png',
    },
    {
      title: '2-2 詳細ページ',
      description: 'ここには行動予定・勤務実績のサマリーが表示されます。タップで開閉出来ます。',
      image: '/images/tutorial/tutorial_18.png',
    },
    {
      title: '2-3 詳細ページ',
      description: '画面下の社員アイコンをタップすると表示する社員を切り替えられます。',
      image: '/images/tutorial/tutorial_19.png',
    },
    {
      title: '2-4 詳細ページ',
      description: 'カレンダーの表示は青が「予定」、緑が「勤務実績」です。',
      image: '/images/tutorial/tutorial_20.png',
    },
  ],
  settings: [
    {
      title: '設定ページ',
      description: 'ここではアカウントの確認と編集・チュートリアルの再確認が出来ます。操作方法がわからなくなったらチュートリアルを振り返って下さい。',
      image: '/images/tutorial/tutorial_21.png',
    },
  ],
  complete: [
    {
      title: '準備完了！',
      description: 'さあ、アプリを使ってみましょう！',
      image: '/images/tutorial/complete.png',
    },
  ]
};

// デフォルトのチュートリアルステップ（全カテゴリーを結合）
const defaultTutorialSteps = [
  ...tutorialCategories.welcome,
  ...tutorialCategories.mySchedule,
  ...tutorialCategories.schedules,
  ...tutorialCategories.detailPage,
  ...tutorialCategories.settings,
  ...tutorialCategories.complete,
];

const Tutorial = ({
  // カスタムチュートリアルステップ（オプション）
  steps = defaultTutorialSteps,
  // ローカルストレージキー (複数のチュートリアルを区別するために使用可能)
  storageKey = 'hasSeenTutorial',
  // 強制的に表示するかどうか
  forceShow = false,
  // 特定のカテゴリだけを表示（オプション）
  category = null,
  // チュートリアル完了時のコールバック
  onComplete = () => {},
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeSteps, setActiveSteps] = useState(steps);
  const [showCategorySelection, setShowCategorySelection] = useState(false);
  const router = useRouter();

  // カテゴリが指定されている場合、そのカテゴリのステップを使用
  useEffect(() => {
    if (category && tutorialCategories[category]) {
      setActiveSteps(tutorialCategories[category]);
    } else if (!selectedCategory) {
      // カテゴリが選択されていない場合はメニューを表示するか、デフォルトステップを使用
      if (forceShow && !category) {
        setShowCategorySelection(true);
      } else {
        setActiveSteps(steps);
      }
    }
  }, [category, selectedCategory, steps, forceShow]);

  useEffect(() => {
    // 強制表示モードの場合はローカルストレージをチェックしない
    if (forceShow) {
      setIsVisible(true);
      return;
    }

    // ローカルストレージからチュートリアル表示履歴を確認
    const tutorialSeen = localStorage.getItem(storageKey);
    
    if (!tutorialSeen) {
      // 初回訪問時のみ表示
      setIsVisible(true);
      setHasSeenTutorial(false);
    } else {
      setHasSeenTutorial(true);
    }
  }, [forceShow, storageKey]);

  const handleNext = () => {
    if (currentStep < activeSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTutorial();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeTutorial = () => {
    // チュートリアル完了をローカルストレージに保存
    if (!category && !selectedCategory) {
      localStorage.setItem(storageKey, 'true');
    }
    setIsVisible(false);
    setCurrentStep(0);
    setSelectedCategory(null);
    setShowCategorySelection(false);
    onComplete();
  };

  const skipTutorial = () => {
    if (!category && !selectedCategory) {
      localStorage.setItem(storageKey, 'true');
    }
    setIsVisible(false);
    setCurrentStep(0);
    setSelectedCategory(null);
    setShowCategorySelection(false);
    onComplete();
  };

  // チュートリアルをリセットするためのメソッド (外部から呼び出し可能)
  const resetTutorial = (specificCategory = null) => {
    if (!specificCategory) {
      // 全てのチュートリアルをリセット
      localStorage.removeItem(storageKey);
      setShowCategorySelection(true);
    } else if (tutorialCategories[specificCategory]) {
      // 特定のカテゴリーのチュートリアルを表示
      setActiveSteps(tutorialCategories[specificCategory]);
      setSelectedCategory(specificCategory);
    }
    setCurrentStep(0);
    setIsVisible(true);
    setHasSeenTutorial(false);
  };

  // カテゴリ選択ハンドラ
  const handleCategorySelect = (category) => {
    if (tutorialCategories[category]) {
      setActiveSteps(tutorialCategories[category]);
      setSelectedCategory(category);
      setCurrentStep(0);
      setShowCategorySelection(false);
    } else if (category === 'all') {
      setActiveSteps(defaultTutorialSteps);
      setSelectedCategory('all');
      setCurrentStep(0);
      setShowCategorySelection(false);
    }
  };

  // 外部からアクセスできるようにメソッドを公開
  Tutorial.resetTutorial = resetTutorial;

  if (!isVisible) return null;

  // カテゴリ選択メニューを表示
  if (showCategorySelection) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden"
          >
            <div className="p-5">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                チュートリアルを選択
              </h2>
              <p className="text-gray-600 mb-6">
                確認したい機能のチュートリアルを選択してください
              </p>

              <div className="space-y-3 mb-6">
                <button
                  onClick={() => handleCategorySelect('all')}
                  className="flex items-center justify-between w-full p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                >
                  <span className="font-medium">すべて見る</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                <button
                  onClick={() => handleCategorySelect('mySchedule')}
                  className="flex items-center justify-between w-full p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                >
                  <span className="font-medium">自分の予定ページの使い方</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                <button
                  onClick={() => handleCategorySelect('schedules')}
                  className="flex items-center justify-between w-full p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                >
                  <span className="font-medium">みんなの予定ページの使い方</span>
                  <span className="text-xs text-gray-500">(ユーザーカード含む)</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                <button
                  onClick={() => handleCategorySelect('detailPage')}
                  className="flex items-center justify-between w-full p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                >
                  <span className="font-medium">詳細ページの使い方</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                <button
                  onClick={() => handleCategorySelect('settings')}
                  className="flex items-center justify-between w-full p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                >
                  <span className="font-medium">設定ページの使い方</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={skipTutorial}
                  className="px-4 py-2 text-gray-500 hover:bg-gray-50 rounded-md transition-colors"
                >
                  閉じる
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden"
        >
          <div className="p-5">
            {/* プログレスインジケーター */}
            <div className="flex items-center mb-4 gap-1">
              <div className="flex-grow flex gap-1">
                {activeSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1 flex-grow rounded-full ${
                      index <= currentStep ? 'bg-blue-500' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              <div className="text-xs text-gray-500 ml-2">
                {currentStep + 1}/{activeSteps.length}
              </div>
            </div>

            {/* 画像エリア */}
            <div className="h-48 bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
              {/* チュートリアル画像が用意できたら表示（画像がない場合でも動作するよう条件分岐） */}
              {activeSteps[currentStep].image ? (
                <div className="relative h-full w-full">
                  <Image
                    src={activeSteps[currentStep].image}
                    alt={activeSteps[currentStep].title}
                    layout="fill"
                    objectFit="contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            {/* テキストエリア */}
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              {activeSteps[currentStep].title}
            </h2>
            <p className="text-gray-600 mb-6">
              {activeSteps[currentStep].description}
            </p>

            {/* ボタンエリア */}
            <div className="flex justify-between">
              {currentStep > 0 ? (
                <button
                  onClick={handlePrevious}
                  className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                >
                  戻る
                </button>
              ) : (
                <button
                  onClick={skipTutorial}
                  className="px-4 py-2 text-gray-500 hover:bg-gray-50 rounded-md transition-colors"
                >
                  スキップ
                </button>
              )}

              {/* カテゴリ選択に戻るボタン */}
              {selectedCategory && (
                <button
                  onClick={() => setShowCategorySelection(true)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                >
                  カテゴリ選択
                </button>
              )}

              <button
                onClick={handleNext}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {currentStep < activeSteps.length - 1 ? '次へ' : '完了'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Tutorial; 