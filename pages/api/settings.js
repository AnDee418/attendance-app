import fs from 'fs';
import path from 'path';

// 設定ファイルのパスを指定
const settingsFilePath = path.join(process.cwd(), 'data', 'settings.json');

// 設定データを読み込む関数
function getSettingsData() {
  try {
    // フォルダが存在しない場合は作成
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // ファイルが存在しない場合は初期値を作成して保存
    if (!fs.existsSync(settingsFilePath)) {
      const initialSettings = {
        workHours: {
          '4': 177, // 4月 (3/21～4/20)
          '5': 171, // 5月 (4/21～5/20)
          '6': 177, // 6月 (5/21～6/20)
          '7': 171, // 7月 (6/21～7/20)
          '8': 177, // 8月 (7/21～8/20)
          '9': 177, // 9月 (8/21～9/20)
          '10': 171, // 10月 (9/21～10/20)
          '11': 177, // 11月 (10/21～11/20)
          '12': 171, // 12月 (11/21～12/20)
          '1': 177, // 1月 (12/21～1/20)
          '2': 177, // 2月 (1/21～2/20)
          '3': 160  // 3月 (2/21～3/20)
        },
        paidLeave: {
          baseCount: 10
        }
      };
      fs.writeFileSync(settingsFilePath, JSON.stringify(initialSettings, null, 2));
      return initialSettings;
    }

    // 既存のファイルから設定を読み込む
    const fileContent = fs.readFileSync(settingsFilePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('設定ファイルの読み込みエラー:', error);
    // エラー時は初期値を返す
    return {
      workHours: {
        '4': 177, '5': 171, '6': 177, '7': 171, '8': 177, '9': 177,
        '10': 171, '11': 177, '12': 171, '1': 177, '2': 177, '3': 160
      },
      paidLeave: { baseCount: 10 }
    };
  }
}

// 設定データを保存する関数
function saveSettingsData(data) {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(settingsFilePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('設定ファイルの保存エラー:', error);
    return false;
  }
}

export default function handler(req, res) {
  if (req.method === 'GET') {
    // GET リクエストの場合、ファイルから設定値を読み込んで返す
    const settingsData = getSettingsData();
    return res.status(200).json(settingsData);
  } else if (req.method === 'POST') {
    // POST リクエストの場合、リクエストボディから category と data を受け取り更新する
    const { category, data } = req.body;
    if (!category || data === undefined) {
      return res.status(400).json({ error: 'category と data は必須です' });
    }
    
    // 現在の設定を読み込む
    const currentSettings = getSettingsData();
    
    // 指定されたカテゴリのデータを更新
    currentSettings[category] = data;
    
    // 更新した設定をファイルに保存
    if (saveSettingsData(currentSettings)) {
      return res.status(200).json({ message: '設定が保存されました' });
    } else {
      return res.status(500).json({ error: '設定の保存に失敗しました' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} は許可されていません` });
  }
} 