import sheets from '../../lib/googleSheets';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = '休日申請';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { date, employeeName, type } = req.body;
      // 受信データをデバッグ用にログ出力
      console.log("Received vacation request:", req.body);

      // 必須フィールドの検証
      if (!date || !employeeName || !type) {
        return res.status(400).json({ error: '必要な項目が不足しています。' });
      }

      // 既存の申請を確認
      const existingResult = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A:H`,
      });

      const existingRows = existingResult.data.values || [];
      const existingRequest = existingRows.find(row => 
        row[0] === date && 
        row[1] === employeeName
      );

      // 既存の申請がある場合は削除
      if (existingRequest) {
        const rowsToKeep = existingRows.filter(row => 
          !(row[0] === date && row[1] === employeeName)
        );

        await sheets.spreadsheets.values.clear({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${SHEET_NAME}'!A:H`,
        });

        if (rowsToKeep.length > 0) {
          await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${SHEET_NAME}'!A:H`,
            valueInputOption: 'RAW',
            requestBody: {
              values: rowsToKeep,
            },
          });
        }
      }

      // 新しい申請を登録
      const currentDate = new Date().toISOString().split('T')[0];
      const values = [[
        date,           // 日付
        employeeName,   // ユーザー名
        type,          // 種別（公休/有休）
        currentDate,   // 申請日
        '申請中',      // 許可（申請中/許可/却下）
        '',            // 許可したユーザー（空欄）
        '',            // 許可日（空欄）
        'false'        // isChecked（未確認）
      ]];

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A:H`,
        valueInputOption: 'RAW',
        requestBody: {
          values,
        },
      });

      res.status(200).json({ message: '休暇申請を登録しました。' });
    } catch (error) {
      console.error('Error in vacation request:', error);
      res.status(500).json({ error: '休暇申請の登録に失敗しました。' });
    }
  } else if (req.method === 'GET') {
    try {
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A:H`,
      });

      const rows = result.data.values || [];
      const mappedRows = rows.map(row => ({
        date: row[0],
        employeeName: row[1],
        type: row[2],
        requestDate: row[3],
        status: row[4],
        approvedBy: row[5],
        approvedDate: row[6],
        isChecked: row[7] === 'true'
      }));

      // 申請中の件数をカウント
      const pendingCount = rows.filter(row => row[4] === '申請中').length;

      res.status(200).json({ 
        data: mappedRows,
        pendingCount
      });
    } catch (error) {
      console.error('Error fetching vacation requests:', error);
      res.status(500).json({ error: '休暇申請の取得に失敗しました。' });
    }
  } else if (req.method === 'PUT') {
    // action === 'check' の条件を最初にチェック
    if (req.body.action === 'check') {
      try {
        const { date, employeeName } = req.body;
        
        // 既存のデータを取得
        const result = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${SHEET_NAME}'!A:H`,
        });
        
        const rows = result.data.values || [];
        const updatedRows = rows.map(row => {
          if (row[0] === date && row[1] === employeeName) {
            // 既存の値を保持しながら、isCheckedを追加
            return [
              row[0],  // date
              row[1],  // employeeName
              row[2],  // type
              row[3],  // requestDate
              row[4],  // status
              row[5],  // approvedBy
              row[6],  // approvedDate
              'true'   // isChecked
            ];
          }
          // 他の行は既存の値をそのまま保持
          return row.length === 8 ? row : [...row, 'false'];
        });

        // スプレッドシートの内容を更新（クリアせずに直接更新）
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${SHEET_NAME}'!A:H`,
          valueInputOption: 'RAW',
          requestBody: {
            values: updatedRows
          }
        });

        res.status(200).json({ message: '申請を確認済みにしました。' });
      } catch (error) {
        console.error('Error marking request as checked:', error);
        res.status(500).json({ error: '申請の確認処理に失敗しました。' });
      }
    } else {
      // 通常の更新処理（承認/却下）
      try {
        const { date, employeeName, status, approvedBy, approvedDate } = req.body;
        
        // 必須フィールドの検証
        if (!date || !employeeName || !status || !approvedBy || !approvedDate) {
          return res.status(400).json({ error: '必要な項目が不足しています。' });
        }

        // 休暇申請の更新処理
        const result = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${SHEET_NAME}'!A:H`,
        });
        const rows = result.data.values || [];

        let rowUpdated = false;
        let updatedRequest = null;
        const updatedRows = rows.map(row => {
          if (row[0] === date && row[1] === employeeName && row[4] === '申請中') {
            rowUpdated = true;
            updatedRequest = {
              date,
              employeeName,
              type: row[2],
              status
            };
            return [
              date,
              employeeName,
              row[2],
              row[3],
              status,
              approvedBy,
              approvedDate,
              'false'  // 承認時は未確認状態に
            ];
          }
          // 他の行は既存の値をそのまま保持
          return row.length === 8 ? row : [...row, 'false'];
        });

        if (!rowUpdated) {
          return res.status(404).json({ error: '更新対象の申請が見つかりませんでした。' });
        }

        // 休暇申請を更新（クリアせずに直接更新）
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${SHEET_NAME}'!A:H`,
          valueInputOption: 'RAW',
          requestBody: { 
            values: updatedRows 
          }
        });

        // 承認された場合のみ、勤務記録に追加
        if (status === '許可') {
          // 勤務記録シートに休暇を登録
          await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: '勤務記録!A:G',
            valueInputOption: 'RAW',
            requestBody: {
              values: [[
                date,           // 日付
                employeeName,   // 社員名
                '',            // 開始時間（空欄）
                '',            // 終了時間（空欄）
                updatedRequest.type === '有休' ? '有給休暇' : '公休',  // 勤務区分
                '出勤簿',      // 記録タイプ
                updatedRequest.type === '有休' ? '8時間0分' : ''  // 有休の場合のみ8時間、公休は空欄
              ]]
            },
          });

          // 承認処理が成功したことをログ出力
          console.log('勤務記録に追加:', {
            date,
            employeeName,
            type: updatedRequest.type,
            workingHours: updatedRequest.type === '有休' ? '8時間0分' : ''
          });
        }

        res.status(200).json({ message: '休暇申請の更新に成功しました。' });
      } catch (error) {
        console.error('Error updating vacation request:', error);
        res.status(500).json({ error: '休暇申請の更新に失敗しました。' });
      }
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
