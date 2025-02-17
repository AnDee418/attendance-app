// 初期の設定値をメモリ上の変数として保持します（実際の運用では DB 等を利用してください）
let settingsData = {
  workHours: {
    '4': 160, // 4月 (3/21～4/20)
    '5': 160, // 5月 (4/21～5/20)
    '6': 160, // 6月 (5/21～6/20)
    '7': 160, // 7月 (6/21～7/20)
    '8': 160, // 8月 (7/21～8/20)
    '9': 160, // 9月 (8/21～9/20)
    '10': 160, // 10月 (9/21～10/20)
    '11': 160, // 11月 (10/21～11/20)
    '12': 160, // 12月 (11/21～12/20)
    '1': 160, // 1月 (12/21～1/20)
    '2': 160, // 2月 (1/21～2/20)
    '3': 160  // 3月 (2/21～3/20)
  },
  paidLeave: {
    baseCount: 10
  }
};

export default function handler(req, res) {
  if (req.method === 'GET') {
    // GET リクエストの場合、保存されている設定値を返す
    return res.status(200).json(settingsData);
  } else if (req.method === 'POST') {
    // POST リクエストの場合、リクエストボディから category と data を受け取り更新する
    const { category, data } = req.body;
    if (!category || data === undefined) {
      return res.status(400).json({ error: 'category と data は必須です' });
    }
    settingsData[category] = data;
    return res.status(200).json({ message: '設定が保存されました' });
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} は許可されていません` });
  }
} 