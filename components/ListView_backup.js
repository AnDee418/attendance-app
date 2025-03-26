import React, { useRef, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  UserCircleIcon,
  ShieldCheckIcon,
  BriefcaseIcon,
  DocumentTextIcon,
  UserIcon,
  ClockIcon,
  CalendarIcon,
  ArrowPathIcon,
  ArrowPathRoundedSquareIcon,
  FunnelIcon,
  XMarkIcon,
  CheckIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

// スクロールバーを非表示にするためのスタイル
const scrollbarHideStyles = `
  /* スクロールバー非表示用のカスタムスタイル */
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;  /* IE、Edgeの場合 */
    scrollbar-width: none;  /* Firefoxの場合 */
  }
  
  /* カスタムスクロールバーのスタイル */
  .custom-scrollbar {
    height: 8px;
    background-color: #f1f5f9;
    border-radius: 4px;
    overflow: hidden;
    position: relative;
    z-index: 40;
    border: 1px solid #e2e8f0;
  }
  
  .custom-scrollbar-thumb {
    height: 100%;
    background-color: #94a3b8;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s, transform 0.1s;
  }
  
  .custom-scrollbar-thumb:hover {
    background-color: #64748b;
  }
  
  .custom-scrollbar-thumb:active {
    transform: scaleY(1.2);
    background-color: #475569;
  }
  
  /* 固定ヘッダーとスクロールバーの背景スタイル */
  .sticky-header-container {
    background-color: white;
    transition: box-shadow 0.2s;
    position: sticky;
    top: 0;
    z-index: 30;
  }
  
  .sticky-header-container.scrolled {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }
  
  /* 超小さいテキストサイズのカスタムクラス */
  .text-2xs {
    font-size: 0.65rem;
    line-height: 1rem;
  }
`;

// アカウント種別の定義
const accountTypes = {
  '管理者': {
    icon: <ShieldCheckIcon className="h-3 w-3" />,
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    order: 0 // 管理者は最優先
  },
  '営業': {
    icon: <BriefcaseIcon className="h-3 w-3" />,
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    order: 1 // 営業は2番目
  },
  '業務': {
    icon: <DocumentTextIcon className="h-3 w-3" />,
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
    order: 2 // 業務は3番目
  },
  'アルバイト': {
    icon: <UserIcon className="h-3 w-3" />,
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    order: 3 // アルバイトは4番目
  }
};

// 勤務種別の定義（MonthlyListSection.jsと統一した色味）
const WORK_TYPES = {
  '出勤': { 
    bgColor: 'bg-blue-100', 
    textColor: 'text-blue-700', 
    borderColor: 'border-blue-200',
    actualBadgeColor: 'bg-blue-500',
    plannedBadgeColor: 'bg-blue-200',
    badgeTextColor: 'text-white'
  },
  '在宅': { 
    bgColor: 'bg-green-100', 
    textColor: 'text-green-700', 
    borderColor: 'border-green-200',
    actualBadgeColor: 'bg-green-500',
    plannedBadgeColor: 'bg-green-200',
    badgeTextColor: 'text-white'
  },
  '休暇': { 
    bgColor: 'bg-purple-100', 
    textColor: 'text-purple-700', 
    borderColor: 'border-purple-200',
    actualBadgeColor: 'bg-purple-500',
    plannedBadgeColor: 'bg-purple-200',
    badgeTextColor: 'text-white'
  },
  '半休': { 
    bgColor: 'bg-amber-100', 
    textColor: 'text-amber-700', 
    borderColor: 'border-amber-200',
    actualBadgeColor: 'bg-amber-500',
    plannedBadgeColor: 'bg-amber-200',
    badgeTextColor: 'text-gray-800'
  },
  '遅刻': { 
    bgColor: 'bg-orange-100', 
    textColor: 'text-orange-700', 
    borderColor: 'border-orange-200',
    actualBadgeColor: 'bg-orange-500',
    plannedBadgeColor: 'bg-orange-200',
    badgeTextColor: 'text-white'
  },
  '公休': {
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    actualBadgeColor: 'bg-purple-500',
    plannedBadgeColor: 'bg-purple-200',
    badgeTextColor: 'text-white'
  },
  '有給休暇': {
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    actualBadgeColor: 'bg-purple-500',
    plannedBadgeColor: 'bg-purple-200',
    badgeTextColor: 'text-white'
  }
};

// 都道府県の北から南への順序を定義
const prefectureOrder = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
];

// 都道府県の順序を取得する関数
const getPrefectureOrder = (location) => {
  // ユーザーの所属地から都道府県名を抽出（例: "東京都新宿区"から"東京都"を取得）
  const prefecture = prefectureOrder.find(pref => location?.includes(pref));
  return prefecture ? prefectureOrder.indexOf(prefecture) : 999; // 該当しない場合は最後
};

const ListView = ({
  currentDate,
  users,
  schedules: initialSchedules, // schedules.jsから渡されるデータを初期データとして扱う
  workDetails: initialWorkDetails,
  breakData: initialBreakData,
  parseJapaneseTimeString,
  timeToHoursAndMinutes,
  standardHours,
  headerTopOffset = 0,
  session // セッション情報を受け取る
}) => {
  const tableBodyRef = useRef(null);
  const topScrollbarRef = useRef(null);
  const bottomScrollbarRef = useRef(null);
  const topScrollThumbRef = useRef(null);
  const bottomScrollThumbRef = useRef(null);
  const headerContainerRef = useRef(null);
  const isScrollingThumb = useRef(false);
  const isScrollingTable = useRef(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);
  const [isPc, setIsPc] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // 独自データ管理
  const [schedules, setSchedules] = useState(initialSchedules || []);
  const [workDetails, setWorkDetails] = useState(initialWorkDetails || []);
  const [breakData, setBreakData] = useState(initialBreakData || []);
  const [isLoading, setIsLoading] = useState(false);

  // フィルター関連のステート
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedAccountTypes, setSelectedAccountTypes] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  
  // 利用可能なアカウント種別と部署の一覧を取得
  const availableAccountTypes = [...new Set(users.map(user => user.data[5] || 'その他'))];
  const availableDepartments = [...new Set(users.map(user => user.data[4] || '未設定'))].sort((a, b) => 
    a.localeCompare(b, 'ja')
  );

  // 独自にデータを取得する関数
  const fetchListViewData = async () => {
    if (!currentDate) return;
    
    setIsLoading(true);
    try {
      console.log(`ListView.js: データ取得開始 - ${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`);
      
      // 当月（1日〜末日）のデータが必要
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1; // 1-12の範囲
      
      // 翌月の情報を計算（月末の処理用）
      let nextMonth = month + 1;
      let nextYear = year;
      
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear = year + 1;
      }
      
      // 現在の月と翌月のデータを両方取得
      const [currentMonthResponse, nextMonthResponse] = await Promise.all([
        fetch(`/api/attendance?month=${month}&year=${year}&limit=2000`),
        fetch(`/api/attendance?month=${nextMonth}&year=${nextYear}&limit=2000`)
      ]);
      
      if (currentMonthResponse.ok && nextMonthResponse.ok) {
        const currentMonthData = await currentMonthResponse.json();
        const nextMonthData = await nextMonthResponse.json();
        
        // 両方のデータを結合
        const allData = [...(currentMonthData.data || []), ...(nextMonthData.data || [])];
        
        // 選択した月のカレンダー月（1日～末日）に関連するデータをフィルタリング
        const filteredData = allData.filter(item => {
          // データの日付を取得
          if (!item || !item[0]) return false;
          
          try {
            const itemDate = new Date(item[0]);
            const itemYear = itemDate.getFullYear();
            const itemMonth = itemDate.getMonth() + 1; // 1-12の範囲
            
            // 選択月のデータのみ残す
            return itemYear === year && itemMonth === month;
          } catch (e) {
            console.error('ListView.js: 日付のパースエラー:', e, item);
            return false;
          }
        });
        
        // フィルタリングされたデータを設定
        setSchedules(filteredData);
        
        console.log(`ListView.js: 取得データ - カレンダー月のデータ=${filteredData.length}件（全期間データ=${allData.length}件）`);
        
        // 日付の分布を確認
        const dates = new Set();
        filteredData.forEach(item => {
          if (item && item[0]) dates.add(item[0]);
        });
        console.log(`ListView.js: 日付の数=${dates.size}件`);
        
        // 「業務」アカウントタイプのユーザーデータを確認
        const businessUsers = users.filter(user => user.data[5] === '業務');
        for (const user of businessUsers) {
          const userRecords = filteredData.filter(item => item && item[1] === user.data[0]);
          console.log(`ListView.js: ${user.data[0]}（業務）のデータ=${userRecords.length}件`);
        }
      } else {
        console.error('ListView.js: データ取得エラー:', 
          currentMonthResponse.ok ? '' : `当月データ: ${currentMonthResponse.status}`,
          nextMonthResponse.ok ? '' : `翌月データ: ${nextMonthResponse.status}`
        );
      }
      
      // 業務詳細データを取得
      const workDetailRes = await fetch('/api/workdetail');
      if (workDetailRes.ok) {
        const data = await workDetailRes.json();
        if (data.data) {
          // カレンダー月（1日～末日）のデータだけをフィルタリング
          const filteredDetails = data.data.filter(item => {
            if (!item || !item.date) return false;
            
            try {
              const itemDate = new Date(item.date);
              const itemYear = itemDate.getFullYear();
              const itemMonth = itemDate.getMonth() + 1; // 1-12の範囲
              
              return itemYear === year && itemMonth === month;
            } catch (e) {
              console.error('ListView.js: 詳細データの日付パースエラー:', e, item);
              return false;
            }
          });
          
          setWorkDetails(filteredDetails);
          console.log(`ListView.js: 業務詳細データ=${filteredDetails.length}件`);
        }
      }
      
      // 休憩データを取得
      const breakRes = await fetch('/api/break');
      if (breakRes.ok) {
        const data = await breakRes.json();
        if (data.data) {
          // データ形式変換
          const formattedBreakData = data.data.map(row => ({
            date: row[0],
            employeeName: row[1],
            breakStart: row[2],
            breakEnd: row[3],
            recordType: row[4],
          }));
          
          // カレンダー月（1日～末日）のデータだけをフィルタリング
          const filteredBreaks = formattedBreakData.filter(item => {
            if (!item || !item.date) return false;
            
            try {
              const itemDate = new Date(item.date);
              const itemYear = itemDate.getFullYear();
              const itemMonth = itemDate.getMonth() + 1; // 1-12の範囲
              
              return itemYear === year && itemMonth === month;
            } catch (e) {
              console.error('ListView.js: 休憩データの日付パースエラー:', e, item);
              return false;
            }
          });
          
          setBreakData(filteredBreaks);
          console.log(`ListView.js: 休憩データ=${filteredBreaks.length}件`);
        }
      }
    } catch (error) {
      console.error('ListView.js: データ取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 月が変更されたらデータを再取得
  useEffect(() => {
    fetchListViewData();
  }, [currentDate]);

  // 初期データが変更されたら更新
  useEffect(() => {
    if (initialSchedules && initialSchedules.length > 0) {
      setSchedules(initialSchedules);
    }
    if (initialWorkDetails && initialWorkDetails.length > 0) {
      setWorkDetails(initialWorkDetails);
    }
    if (initialBreakData && initialBreakData.length > 0) {
      setBreakData(initialBreakData);
    }
  }, [initialSchedules, initialWorkDetails, initialBreakData]);
  
  // 権限に基づいてユーザーをフィルタリングする関数
  const filterUsersByPermission = (userList) => {
    // セッションが無い場合は空配列を返す
    if (!session?.user) return [];

    // 管理者権限を持っている場合は全ユーザーを表示
    if (session.user.isAdmin) {
      return userList;
    }

    const currentUserType = session.user.accountType;

    // 営業ユーザーの場合はアルバイトを除外
    if (currentUserType === '営業') {
      return userList.filter(user => user.data[5] !== 'アルバイト');
    }
    
    // 業務ユーザーの場合は、全員の実績情報を表示する
    if (currentUserType === '業務') {
      console.log('業務ユーザーが全員の実績を閲覧します');
      return userList;
    }

    // その他のケースではそのままのリストを返す
    return userList;
  };
  
  // ユーザーをソートして設定
  useEffect(() => {
    // 権限に基づいたフィルタリングを適用
    const permissionFilteredUsers = filterUsersByPermission(users);
    
    // ユーザーをソート
    const sortUsers = (userList) => {
      return [...userList].sort((a, b) => {
        // アカウント種別による優先順位
        const typeA = a.data[5] || 'その他';
        const typeB = b.data[5] || 'その他';
        const orderA = accountTypes[typeA]?.order ?? 999;
        const orderB = accountTypes[typeB]?.order ?? 999;
        
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        
        // 所属地による順序（北から南）
        const locationA = a.data[4] || '';
        const locationB = b.data[4] || '';
        const prefOrderA = getPrefectureOrder(locationA);
        const prefOrderB = getPrefectureOrder(locationB);
        
        if (prefOrderA !== prefOrderB) {
          return prefOrderA - prefOrderB;
        }
        
        // 最後に名前でソート
        return a.data[0].localeCompare(b.data[0], 'ja');
      });
    };
    
    // 初期ユーザーリストをフィルタリングしてからソートしてセット
    setFilteredUsers(sortUsers(permissionFilteredUsers));
  }, [users, session]);
  
  // フィルター適用の関数
  const applyFilter = () => {
    // まず権限に基づいたフィルタリングを適用
    let filtered = filterUsersByPermission(users);
    
    // アカウント種別でフィルター
    if (selectedAccountTypes.length > 0) {
      filtered = filtered.filter(user => 
        selectedAccountTypes.includes(user.data[5] || 'その他')
      );
    }
    
    // 部署でフィルター
    if (selectedDepartments.length > 0) {
      filtered = filtered.filter(user => 
        selectedDepartments.includes(user.data[4] || '未設定')
      );
    }
    
    // ソートしてから設定
    filtered = filtered.sort((a, b) => {
      // アカウント種別による優先順位
      const typeA = a.data[5] || 'その他';
      const typeB = b.data[5] || 'その他';
      const orderA = accountTypes[typeA]?.order ?? 999;
      const orderB = accountTypes[typeB]?.order ?? 999;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // 所属地による順序（北から南）
      const locationA = a.data[4] || '';
      const locationB = b.data[4] || '';
      const prefOrderA = getPrefectureOrder(locationA);
      const prefOrderB = getPrefectureOrder(locationB);
      
      if (prefOrderA !== prefOrderB) {
        return prefOrderA - prefOrderB;
      }
      
      // 最後に名前でソート
      return a.data[0].localeCompare(b.data[0], 'ja');
    });
    
    setFilteredUsers(filtered);
  };
  
  // フィルターリセット
  const resetFilter = () => {
    setSelectedAccountTypes([]);
    setSelectedDepartments([]);
    // 権限に基づいたフィルタリングを適用してからリセット
    setFilteredUsers(filterUsersByPermission(users));
    setIsFilterOpen(false); // リセット後にパネルを閉じる
  };
  
  // ユーザーリストが変更されたときにフィルターを適用
  useEffect(() => {
    applyFilter();
  }, [users, selectedAccountTypes, selectedDepartments]);
  
  // フィルターのトグル関数
  const toggleAccountType = (type) => {
    setSelectedAccountTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type) 
        : [...prev, type]
    );
  };
  
  const toggleDepartment = (dept) => {
    setSelectedDepartments(prev => 
      prev.includes(dept) 
        ? prev.filter(d => d !== dept) 
        : [...prev, dept]
    );
  };
  
  // 月の全日付を生成
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
  };

  // 日付ごとのユーザー情報を取得
  const getDailyUserInfo = (date, user) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const userSchedules = schedules.filter(s => 
      s[0] === dateStr && s[1] === user.data[0]
    );
    
    // 業務詳細データの構造を確認
    let userWorkDetails = [];
    try {
      userWorkDetails = workDetails.filter(w => {
        // データが存在しないか無効な場合はスキップ
        if (!w) return false;
        
        // APIレスポンスのプロパティ名に合わせて確認（workdetail.jsより）
        const hasValidProps = w.date === dateStr && 
                             w.employeeName === user.data[0];
        
        return hasValidProps;
      });
    } catch (error) {
      console.error("業務詳細データの処理中にエラーが発生しました:", error);
      userWorkDetails = [];
    }
    
    const userBreakData = breakData.filter(b => 
      b.date === dateStr && b.employeeName === user.data[0]
    );

    return {
      schedules: userSchedules,
      workDetails: userWorkDetails,
      breakData: userBreakData
    };
  };

  const days = getDaysInMonth(currentDate);
  
  // テーブルの列幅を同期させるためのスタイルを設定（幅を広げる）
  const columnWidths = {
    dateColumn: 'min-w-[50px] w-[50px]',
    userColumn: isPc ? 'min-w-[180px] w-[180px]' : 'min-w-[140px] w-[140px]' // PCの場合はさらに幅を広げる
  };

  // PCかどうかを判定する処理を追加
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkIsPc = () => {
        setIsPc(window.innerWidth >= 1024); // 1024px以上をPCとみなす
      };
      
      checkIsPc(); // 初期チェック
      window.addEventListener('resize', checkIsPc);
      
      return () => {
        window.removeEventListener('resize', checkIsPc);
      };
    }
  }, []);
  
  // ページスクロールを検出してヘッダーの影を制御
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleScroll = () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        setIsScrolled(scrollTop > 10);
      };
      
      window.addEventListener('scroll', handleScroll);
      handleScroll(); // 初期状態をチェック
      
      return () => {
        window.removeEventListener('scroll', handleScroll);
      };
    }
  }, []);

  // スクロール同期処理
  useEffect(() => {
    // スクロールバー非表示用のスタイルをheadに挿入
    if (typeof document !== 'undefined') {
      // すでに存在するか確認
      const existingStyle = document.getElementById('scrollbar-hide-style');
      if (!existingStyle) {
        const styleElement = document.createElement('style');
        styleElement.id = 'scrollbar-hide-style';
        styleElement.innerHTML = scrollbarHideStyles;
        document.head.appendChild(styleElement);
      }
    }
    
    // スクロール処理用の要素取得
    const headerTable = document.querySelector(".sticky.z-30 .overflow-x-auto");
    const bodyTable = document.getElementById("table-body");
    
    if (!headerTable || !bodyTable) return;
    
    // テーブルの同期スクロール関数 - より直接的な方法で実装
    const syncScroll = () => {
      headerTable.scrollLeft = bodyTable.scrollLeft;
    };

    // ヘッダーの同期スクロール関数
    const syncHeaderScroll = () => {
      bodyTable.scrollLeft = headerTable.scrollLeft;
    };
    
    // スクロールイベントリスナーの設定
    bodyTable.addEventListener("scroll", syncScroll);
    headerTable.addEventListener("scroll", syncHeaderScroll);
    
    // モバイル向けタッチスクロール処理の強化
    let isTouching = false;
    let startTouchX = 0;
    let lastTouchX = 0;
    
    const touchStart = (e) => {
      if (e.touches.length !== 1) return;
      isTouching = true;
      startTouchX = e.touches[0].clientX;
      lastTouchX = startTouchX;
    };
    
    const touchMove = (e) => {
      if (!isTouching || e.touches.length !== 1) return;
      
      const touchX = e.touches[0].clientX;
      const diffX = lastTouchX - touchX;
      
      if (Math.abs(diffX) > 5) { // 小さな動きは無視
        bodyTable.scrollLeft += diffX;
        headerTable.scrollLeft = bodyTable.scrollLeft; // 強制的に同期
        lastTouchX = touchX;
      }
    };
    
    const touchEnd = () => {
      isTouching = false;
    };
    
    // タッチイベントの追加
    bodyTable.addEventListener("touchstart", touchStart, { passive: true });
    bodyTable.addEventListener("touchmove", touchMove, { passive: true });
    bodyTable.addEventListener("touchend", touchEnd, { passive: true });
    
    // ヘッダーにもタッチイベントを追加
    headerTable.addEventListener("touchstart", touchStart, { passive: true });
    headerTable.addEventListener("touchmove", touchMove, { passive: true });
    headerTable.addEventListener("touchend", touchEnd, { passive: true });
    
    // クリーンアップ関数
    return () => {
      bodyTable.removeEventListener("scroll", syncScroll);
      headerTable.removeEventListener("scroll", syncHeaderScroll);
      
      bodyTable.removeEventListener("touchstart", touchStart);
      bodyTable.removeEventListener("touchmove", touchMove);
      bodyTable.removeEventListener("touchend", touchEnd);
      
      headerTable.removeEventListener("touchstart", touchStart);
      headerTable.removeEventListener("touchmove", touchMove);
      headerTable.removeEventListener("touchend", touchEnd);
    };
  }, [isPc]);
  
  // フィルター適用中かどうか
  const isFilterActive = selectedAccountTypes.length > 0 || selectedDepartments.length > 0;

  return (
    <div className="mb-16">
      {/* フィルターボタンとパネル */}
      <div className="mb-4 flex justify-end items-center">
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg border ${
            isFilterActive ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-600'
          } shadow-sm hover:shadow transition-shadow duration-200`}
        >
          <FunnelIcon className="h-4 w-4" />
          <span className="text-sm font-medium">
            {isFilterActive ? `フィルター(${selectedAccountTypes.length + selectedDepartments.length})` : 'フィルター'}
          </span>
          {isFilterActive && (
            <span 
              onClick={(e) => {e.stopPropagation(); resetFilter()}}
              className="ml-1 p-0.5 bg-gray-100 rounded-full hover:bg-gray-200"
            >
              <XMarkIcon className="h-3 w-3 text-gray-500" />
            </span>
          )}
        </button>
      </div>
      
      {/* フィルターパネル */}
      {isFilterOpen && (
        <div className="mb-4 bg-white rounded-lg shadow-md border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-gray-700">表示フィルター</h3>
            <button
              onClick={resetFilter}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
            >
              <ArrowPathIcon className="h-3 w-3 mr-1" />
              リセット
            </button>
          </div>
          
          {/* アカウント種別フィルター */}
          <div className="mb-3">
            <h4 className="text-xs font-medium text-gray-500 mb-2">アカウント種別</h4>
            <div className="flex flex-wrap gap-2">
              {availableAccountTypes.map(type => (
                <button
                  key={type}
                  onClick={() => toggleAccountType(type)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                    selectedAccountTypes.includes(type)
                      ? `${accountTypes[type]?.bgColor || 'bg-gray-100'} ${accountTypes[type]?.textColor || 'text-gray-700'} border-gray-300`
                      : 'bg-gray-50 text-gray-500 border-gray-200'
                  }`}
                >
                  {accountTypes[type]?.icon}
                  <span className="ml-1">{type}</span>
                  {selectedAccountTypes.includes(type) && (
                    <CheckIcon className="inline-block h-3 w-3 ml-1" />
                  )}
                </button>
              ))}
            </div>
          </div>
          
          {/* 部署フィルター */}
          <div>
            <h4 className="text-xs font-medium text-gray-500 mb-2">所属</h4>
            <div className="flex flex-wrap gap-2">
              {availableDepartments.map(dept => (
                <button
                  key={dept}
                  onClick={() => toggleDepartment(dept)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                    selectedDepartments.includes(dept)
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-gray-50 text-gray-500 border-gray-200'
                  }`}
                >
                  {dept}
                  {selectedDepartments.includes(dept) && (
                    <CheckIcon className="inline-block h-3 w-3 ml-1" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* 固定ヘッダーとスクロールバーのコンテナ */}
      <div 
        ref={headerContainerRef}
        className="sticky z-30 bg-white transition-shadow duration-200"
        style={{ 
          top: `${headerTopOffset}px`,
          boxShadow: isScrolled ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none' 
        }}
      >
        {/* PCデバイス用の上部カスタムスクロールバー */}
        {isPc && (
          <div className="px-3 pt-3 pb-2">
            <div 
              className="custom-scrollbar mx-auto"
              style={{ maxWidth: 'calc(100% - 70px)', marginLeft: '60px' }}
              ref={topScrollbarRef}
            >
              <div 
                className="custom-scrollbar-thumb" 
                ref={topScrollThumbRef}
              ></div>
            </div>
          </div>
        )}
      
        {/* テーブルヘッダー部分 */}
        <div className="border-b-2 border-blue-300">
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr className="bg-blue-50">
                  {/* 日付列ヘッダー */}
                  <th className={`sticky left-0 z-40 bg-blue-100 px-2 py-3 text-xs font-semibold text-blue-800 border-b-2 border-r-2 border-blue-200 shadow-sm ${columnWidths.dateColumn}`}>
                    <div className="flex flex-col items-center justify-center">
                      <CalendarIcon className="w-5 h-5 mb-1" />
                      <span className="text-xs">日付</span>
                    </div>
                  </th>
                  
                  {/* ユーザー列ヘッダー */}
                  {filteredUsers.map((user, index) => (
                    <th 
                      key={user.data[1]} 
                      className={`px-2 py-2 text-center bg-blue-50 border-b-2 border-gray-300 ${columnWidths.userColumn} ${
                        index < filteredUsers.length - 1 ? 'border-r-2 border-r-gray-200' : ''
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        {/* ユーザーアイコン */}
                        <div className="mb-1">
                          {user.data[6] ? (
                            <img
                              src={user.data[6]}
                              alt={user.data[0]}
                              className="w-10 h-10 rounded-full object-cover border-2 border-white mx-auto shadow-sm"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                              <UserCircleIcon className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        {/* ユーザー名 */}
                        <span className="text-sm font-medium text-gray-700 truncate max-w-[95px]">
                          {user.data[0]}
                        </span>
                        
                        {/* ユーザーの詳細情報 */}
                        <div className="flex flex-col items-center mt-1">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs ${
                            accountTypes[user.data[5]]?.bgColor || 'bg-gray-100'
                          } ${accountTypes[user.data[5]]?.textColor || 'text-gray-700'}`}>
                            {accountTypes[user.data[5]]?.icon}
                            <span className="ml-1 text-xs">{user.data[5] || 'その他'}</span>
                          </span>
                          <span className="text-xs text-gray-500 mt-0.5">{user.data[4] || '未設定'}</span>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
          </div>
        </div>
      </div>
      
      {/* テーブル本体 - 横スクロールのみ、縦スクロールはページスクロールで処理 */}
      <div 
        className="overflow-x-auto scrollbar-hide border border-gray-200 rounded-b-lg shadow-sm bg-white"
        ref={tableBodyRef}
        id="table-body"
      >
        <table className="w-full table-fixed border-collapse">
          <tbody>
            {days.map((day) => (
              <tr key={day.toISOString()} className={day.getDay() === 0 || day.getDay() === 6 ? 'bg-gray-50' : 'bg-white hover:bg-gray-50/70'}>
                {/* 日付セル */}
                <td className={`sticky left-0 z-5 bg-blue-100 px-2 py-3 text-center border-b border-r-2 border-blue-200 shadow-sm ${columnWidths.dateColumn}`}>
                  <div className="flex flex-col items-center">
                    <span className="font-bold text-gray-900 text-lg">
                      {format(day, 'd', { locale: ja })}
                    </span>
                    <span className={`text-xs font-medium ${
                      day.getDay() === 0 ? 'text-red-500' : 
                      day.getDay() === 6 ? 'text-blue-500' : 'text-gray-500'
                    }`}>
                      {format(day, 'E', { locale: ja })}
                    </span>
                  </div>
                </td>
                
                {/* ユーザーセル */}
                {filteredUsers.map((user, index) => {
                  const dailyInfo = getDailyUserInfo(day, user);
                  const plannedSchedule = dailyInfo.schedules.find(s => s[5] === '予定');
                  const actualSchedule = dailyInfo.schedules.find(s => s[5] === '出勤簿');
                  const workDetailsForDay = dailyInfo.workDetails;

                  // 表示する勤務種別を優先度に基づいて決定（実績 > 予定）
                  const scheduleToShow = actualSchedule || plannedSchedule;
                  
                  // 公休または有給かどうかを確認
                  const isLeaveType = scheduleToShow && (
                    scheduleToShow[4] === '公休' || 
                    scheduleToShow[4] === '有給休暇' || 
                    scheduleToShow[4] === '休暇' || 
                    scheduleToShow[4] === '有休'
                  );
                  
                  // 業務詳細を時間でソート（安全なソート処理）
                  let sortedWorkDetails = [];
                  try {
                    // 有効なオブジェクトかつ必要なプロパティを持つ項目のみフィルタリング
                    const validWorkDetails = workDetailsForDay.filter(
                      item => item && typeof item === 'object' && typeof item.workStart === 'string'
                    );
                    
                    // ソート処理
                    sortedWorkDetails = [...validWorkDetails].sort((a, b) => {
                      // 時間文字列を比較してソート（例: "09:00" < "10:00"）
                      return (a.workStart || '').localeCompare(b.workStart || '');
                    });
                  } catch (error) {
                    console.error("業務詳細のソート中にエラーが発生しました:", error);
                    sortedWorkDetails = [];
                  }
                  
                  // セルの内容がある場合は背景色を少し変える
                  const hasCellContent = scheduleToShow || workDetailsForDay.length > 0;
                  
                  // 曜日に応じた背景色を設定（土日は薄いグレー）
                  const isDayOff = day.getDay() === 0 || day.getDay() === 6;
                  
                  return (
                    <td 
                      key={user.data[1]} 
                      className={`px-2 py-2.5 ${columnWidths.userColumn} ${
                        isLeaveType ? 'bg-purple-100 border border-purple-300' : 
                        isDayOff ? 'bg-gray-50/80' : 
                        (hasCellContent ? 'bg-white' : 'bg-gray-50/30')
                      } border-b border-gray-200 ${
                        index < filteredUsers.length - 1 ? 'border-r border-r-gray-200' : ''
                      }`}
                    >
                      <div className="space-y-2 min-h-[24px]">
                        {/* 勤務種別 */}
                        {scheduleToShow && (
                          <div className={`inline-flex rounded-full px-2.5 py-1 ${
                            WORK_TYPES[scheduleToShow[4]]?.bgColor || 'bg-gray-100'
                          } border ${WORK_TYPES[scheduleToShow[4]]?.borderColor || 'border-gray-200'}`}>
                            <span className={`text-xs font-medium ${
                              WORK_TYPES[scheduleToShow[4]]?.textColor || 'text-gray-600'
                            }`}>
                              {scheduleToShow[4]}
                            </span>
                          </div>
                        )}
                        
                        {/* 業務詳細 - タイトルと時間のみ表示 */}
                        {sortedWorkDetails.length > 0 && (
                          <div className="flex flex-col gap-1.5">
                            {sortedWorkDetails
                              .filter(detail => detail && typeof detail === 'object')
                              .map((detail, idx) => {
                              // データの存在確認
                              const title = detail.workTitle || '';
                              const startTime = detail.workStart || '';
                              const endTime = detail.workEnd || '';
                              
                              // 時間フォーマットを安全に処理
                              const formatTime = (timeStr) => {
                                if (!timeStr || typeof timeStr !== 'string') return '';
                                return timeStr.length >= 5 ? timeStr.substring(0, 5) : timeStr;
                              };
                              
                              // 特定のキーワードに基づいて色を変更
                              const isUrgent = title.includes('緊急') || title.includes('重要');
                              const isMeeting = title.includes('会議') || title.includes('ミーティング');
                              
                              let bgColor = 'bg-blue-50';
                              let borderColor = 'border-blue-100';
                              let textColor = 'text-blue-700';
                              
                              if (isUrgent) {
                                bgColor = 'bg-red-50';
                                borderColor = 'border-red-100';
                                textColor = 'text-red-700';
                              } else if (isMeeting) {
                                bgColor = 'bg-purple-50';
                                borderColor = 'border-purple-100';
                                textColor = 'text-purple-700';
                              }
                              
                              return (
                                <div 
                                  key={idx} 
                                  className={`text-2xs p-1.5 ${bgColor} border ${borderColor} rounded-lg`}
                                >
                                  <div className={`font-medium ${textColor} leading-tight ${isPc ? 'text-[0.75rem]' : 'text-[0.65rem]'}`}>
                                    {title}
                                  </div>
                                  
                                  {/* 時間表示 */}
                                  <div className="flex items-center justify-end mt-1">
                                    <span className={`text-gray-500 ${isPc ? 'text-xs' : ''}`}>
                                      {formatTime(startTime)}-{formatTime(endTime)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* PCデバイス用の下部カスタムスクロールバー */}
      {isPc && (
        <div 
          className="custom-scrollbar mt-2 mx-auto"
          style={{ maxWidth: 'calc(100% - 70px)', marginLeft: '60px' }}
          ref={bottomScrollbarRef}
        >
          <div 
            className="custom-scrollbar-thumb"
            ref={bottomScrollThumbRef}
          ></div>
        </div>
      )}
    </div>
  );
};

export default ListView;
