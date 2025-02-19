import { getSession } from 'next-auth/react';
import prisma from '../../../lib/prisma';

export default async function handler(req, res) {
  const session = await getSession({ req });

  if (!session || !session.user?.isAdmin) {
    return res.status(401).json({ error: '認証が必要です' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { year, month } = req.query;

    // 対象月の期間を計算（21日から20日まで）
    const startDate = new Date(year, month - 1, 21);
    const endDate = new Date(year, Number(month), 20);

    // ユーザーごとの勤務時間を集計
    const workHours = await prisma.user.findMany({
      where: {
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        clockbooks: {
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
        vacationRequests: {
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
            status: 'APPROVED',
          },
        },
      },
    });

    // レスポンスデータの整形
    const formattedData = workHours.map(user => {
      const totalWorkMinutes = user.clockbooks.reduce((acc, clock) => {
        if (clock.endTime && clock.startTime) {
          const workMinutes = (new Date(clock.endTime) - new Date(clock.startTime)) / (1000 * 60);
          return acc + workMinutes;
        }
        return acc;
      }, 0);

      return {
        userId: user.id,
        userName: user.name,
        standardHours: 160, // 所定労働時間（設定から取得するように変更可能）
        actualHours: Math.round(totalWorkMinutes / 60 * 10) / 10,
        overtimeHours: Math.max(0, Math.round((totalWorkMinutes / 60 - 160) * 10) / 10),
        vacationDays: user.vacationRequests.length,
      };
    });

    res.status(200).json(formattedData);
  } catch (error) {
    console.error('勤務時間データの取得中にエラーが発生しました:', error);
    res.status(500).json({ error: '内部サーバーエラー' });
  }
} 