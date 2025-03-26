// pages/api/attendance.js
import sheets from '../../lib/googleSheets';
import { authOptions } from './auth/[...nextauth]';

export default async function handler(req, res) {
  // GET メソッドの場合、シートから勤務記録を取得して返す
  if (req.method === 'GET') {
    try {
      console.log('attendance.js: API呼び出し開始 - パラメータ', req.query);
      
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: '勤務記録!A:G',
      });
      // result.data.values に勤務記録の各行が入っています
      const rows = result.data.values || [];
      
      // シートの全データログ出力（開発環境のみ）
      console.log(`attendance.js: シート全データ行数: ${rows.length}件`);
      if (rows.length > 0) {
        console.log('attendance.js: 最初の行:', rows[0]);
        
        // 業務ユーザーの出勤簿データをカウント
        const businessUserRows = rows.filter(row => 
          row.length >= 6 && row[5] === '出勤簿'
        );
        console.log(`attendance.js: シート内の全出勤簿データ数: ${businessUserRows.length}件`);
        
        // サンプル出力（最初の3件）
        if (businessUserRows.length > 0) {
          console.log('attendance.js: 出勤簿データサンプル:', businessUserRows.slice(0, 3));
        }
      }
      
      // 特定の業務ユーザーのデータを明示的に取得
      const businessUserName = req.query.businessUser || '後藤 和敏'; // クエリパラメータで指定可能
      const specificUserRows = rows.filter(row => 
        row.length >= 2 && row[1] === businessUserName
      );
      
      console.log(`attendance.js: ${businessUserName}のデータ: ${specificUserRows.length}件`);
      if (specificUserRows.length > 0) {
        console.log('attendance.js: ユーザーデータサンプル:', specificUserRows.slice(0, 3));
      }
      
      // フィルタリングパラメータがある場合はデータを絞り込む
      if (req.query.month && req.query.year) {
        const targetMonth = parseInt(req.query.month, 10);
        const targetYear = parseInt(req.query.year, 10);
        
        // 最大件数制限を設定
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 1000; // デフォルト上限を増加
        
        console.log(`attendance.js: フィルタリング条件 - ${targetYear}年${targetMonth}月, 上限${limit}件`);
        
        // データをフィルタリング - カレンダー月（1日〜末日）を取得
        const filteredRows = [];
        
        for (const row of rows) {
          if (filteredRows.length >= limit) break;
          
          if (!row[0]) continue;
          
          try {
            // 日付パース - より柔軟に
            let rowDate;
            if (typeof row[0] === 'string') {
              // YYYY-MM-DD形式を想定
              const dateParts = row[0].split('-');
              if (dateParts.length === 3) {
                const year = parseInt(dateParts[0], 10);
                const month = parseInt(dateParts[1], 10) - 1; // JavaScriptの月は0始まり
                const day = parseInt(dateParts[2], 10);
                rowDate = new Date(year, month, day);
              } else {
                rowDate = new Date(row[0]);
              }
            } else {
              rowDate = new Date(row[0]);
            }
            
            if (isNaN(rowDate.getTime())) {
              console.log(`attendance.js: 無効な日付: ${row[0]}`);
              continue;
            }
            
            // 対象月の1日から末日までを取得（カレンダー月）
            const rowMonth = rowDate.getMonth() + 1; // JavaScriptの月は0始まりなので+1
            const rowYear = rowDate.getFullYear();
            
            // カレンダー月（1日〜末日）
            const isCurrentMonthData = (rowMonth === targetMonth && rowYear === targetYear);
            
            if (isCurrentMonthData) {
              filteredRows.push(row);
            }
          } catch (e) {
            console.error(`attendance.js: 行の処理でエラー: ${e.message}`, row);
          }
        }
        
        // 「業務」ユーザーの具体的なデータ確認
        const filteredBusinessUserRows = filteredRows.filter(row => 
          row.length >= 6 && row[5] === '出勤簿'
        );
        
        console.log(`attendance.js: フィルタリング後の出勤簿データ: ${filteredBusinessUserRows.length}件`);
        
        // 「業務」アカウントタイプのデータも確実に含まれるか確認
        const businessTypeCount = filteredRows.filter(row => {
          return row.length >= 6 && row[5] === '出勤簿';
        }).length;
        
        console.log(`attendance.js: フィルタリング後の出勤簿データ数: ${businessTypeCount}件`);
        console.log(`attendance.js: 全データ数: ${filteredRows.length}件`);
        
        // データサンプルを出力（最初の5件）
        if (filteredRows.length > 0) {
          console.log("attendance.js: データサンプル:", filteredRows.slice(0, 5));
        }
        
        return res.status(200).json({ data: filteredRows });
      }
      
      return res.status(200).json({ data: rows });
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  // POST メソッドの場合、勤務記録をシートに書き込む
  else if (req.method === 'POST') {
    try {
      const { date, employeeName, startTime, endTime, workType, recordType, totalWorkTime } = req.body;
      
      console.log("API受信データ:", req.body);
      
      // 勤務種別が「勤務種別」の場合は「出勤」に修正
      const correctedWorkType = workType === '勤務種別' ? '出勤' : workType;

      // 既存データの確認
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: '勤務記録!A:G',
      });
      
      const rows = result.data.values || [];
      const existingRowIndex = rows.findIndex(row => 
        row[0] === date && 
        row[1] === employeeName && 
        row[5] === recordType
      );
      
      if (existingRowIndex !== -1) {
        // 既存データを削除
        const rowsToKeep = rows.filter((row, index) => 
          !(row[0] === date && 
            row[1] === employeeName && 
            row[5] === recordType)
        );
        
        // シートをクリアして新しいデータを書き込み
        await sheets.spreadsheets.values.clear({
          spreadsheetId: process.env.GOOGLE_SHEET_ID,
          range: '勤務記録!A:G',
        });
        
        // フィルタリングした行を書き戻し
        if (rowsToKeep.length > 0) {
          await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: '勤務記録!A:G',
            valueInputOption: 'RAW',
            requestBody: {
              values: rowsToKeep,
            },
          });
        }
      }

      // スプレッドシートに書き込むデータを準備
      const values = [
        [date, employeeName, startTime, endTime, correctedWorkType, recordType, totalWorkTime]
      ];
      
      console.log("シートに書き込むデータ:", values);

      // スプレッドシートに書き込み
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: '勤務記録!A:G', 
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values,
        },
      });

      return res.status(200).json({ message: '勤務記録を更新しました。' });
    } catch (error) {
      console.error('Error posting attendance:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  // PUT メソッドの場合、既存の勤務記録を更新
  else if (req.method === 'PUT') {
    try {
      const { id, ...attendance } = req.body;
      
      // Google Sheetsに更新をかける
      // ...
      
      res.status(200).json({ success: true, message: '勤務記録が更新されました' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  // DELETE メソッドを追加
  else if (req.method === 'DELETE') {
    try {
      const { date, employeeName, recordType } = req.query;
      
      // 該当する行を検索して削除
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: '勤務記録!A:G',
      });
      
      const rows = result.data.values || [];
      const rowsToKeep = rows.filter(row => 
        !(row[0] === date && 
          row[1] === employeeName && 
          row[5] === recordType)
      );
      
      // シートをクリアして新しいデータを書き込み
      await sheets.spreadsheets.values.clear({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: '勤務記録!A:G',
      });
      
      if (rowsToKeep.length > 0) {
        await sheets.spreadsheets.values.append({
          spreadsheetId: process.env.GOOGLE_SHEET_ID,
          range: '勤務記録!A:G',
          valueInputOption: 'RAW',
          requestBody: {
            values: rowsToKeep,
          },
        });
      }
      
      return res.status(200).json({ message: 'Successfully deleted' });
    } catch (error) {
      console.error('Error deleting attendance:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  // GET も POST も DELETE もそれ以外の場合、405 エラーを返す
  else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
