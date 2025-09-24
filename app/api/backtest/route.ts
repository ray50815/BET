import { MarketType } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DatabaseNotConfiguredError, getPrismaClient } from '@/lib/prisma';
import {
  calculateEv,
  calculatePerformanceMetrics,
  calculateProfit,
  fillMissingDates,
  toDateKey
} from '@/lib/analytics';

const bodySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  leagues: z.array(z.string()).optional(),
  marketTypes: z.array(z.nativeEnum(MarketType)).optional(),
  minProbability: z.number().optional().default(0.55),
  minEv: z.number().optional().default(0),
  stakeUnits: z.number().positive().optional().default(1),
  maxConcurrent: z.number().int().positive().optional().default(3)
});

function parseDateInput(value?: string, hour = 0) {
  if (!value) return undefined;
  return new Date(`${value}T${hour.toString().padStart(2, '0')}:00:00+08:00`);
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const body = bodySchema.parse(json);
    const end = parseDateInput(body.endDate, 23) ?? new Date();
    const start =
      parseDateInput(body.startDate, 0) ??
      new Date(end.getTime() - 60 * 24 * 60 * 60 * 1000);

    const marketTypes = body.marketTypes?.length
      ? body.marketTypes
      : [MarketType.ML, MarketType.SPREAD, MarketType.TOTAL];

    const prisma = getPrismaClient();
    const markets = await prisma.market.findMany({
      where: {
        type: { in: marketTypes },
        game: {
          date: {
            gte: start,
            lte: end
          },
          league: body.leagues?.length ? { in: body.leagues } : undefined
        }
      },
      include: {
        game: {
          include: {
            homeTeam: true,
            awayTeam: true
          }
        },
        odds: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        modelProbs: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        result: true
      }
    });

    const grouped = new Map<string, typeof markets>();
    for (const market of markets) {
      const dateKey = toDateKey(market.game.date);
      const existing = grouped.get(dateKey);
      if (existing) {
        existing.push(market);
      } else {
        grouped.set(dateKey, [market]);
      }
    }

    const selectedPicks: {
      id: number;
      date: string;
      league: string;
      matchup: string;
      marketType: MarketType;
      selection: string;
      oddsDecimal: number;
      pModel: number;
      ev: number;
      result: string;
      profit: number;
    }[] = [];

    for (const [dateKey, list] of grouped.entries()) {
      const eligible = list
        .map((market) => {
          const odds = market.odds[0];
          const model = market.modelProbs[0];
          if (!odds || !model) return null;
          const ev = calculateEv(model.pModel, odds.oddsDecimal);
          if (model.pModel < body.minProbability || ev < body.minEv) return null;
          return {
            market,
            ev,
            odds,
            model
          };
        })
        .filter(
          (item): item is { market: (typeof markets)[number]; ev: number; odds: any; model: any } =>
            !!item
        )
        .sort((a, b) => b.ev - a.ev)
        .slice(0, body.maxConcurrent);

      for (const pick of eligible) {
        const result = pick.market.result?.outcome ?? 'PUSH';
        const profit = calculateProfit(
          result,
          pick.odds.oddsDecimal,
          body.stakeUnits
        );
        selectedPicks.push({
          id: pick.market.id,
          date: dateKey,
          league: pick.market.game.league,
          matchup: `${pick.market.game.awayTeam.name} @ ${pick.market.game.homeTeam.name}`,
          marketType: pick.market.type,
          selection: pick.market.selection,
          oddsDecimal: Number(pick.odds.oddsDecimal.toFixed(2)),
          pModel: Number(pick.model.pModel.toFixed(3)),
          ev: Number(pick.ev.toFixed(3)),
          result,
          profit
        });
      }
    }

    const pickMetrics = selectedPicks
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((pick) => ({
        stakeUnits: body.stakeUnits,
        oddsDecimal: pick.oddsDecimal,
        outcome: pick.result as 'WIN' | 'LOSE' | 'PUSH',
        date: new Date(`${pick.date}T12:00:00+08:00`)
      }));
    const metrics = calculatePerformanceMetrics(pickMetrics);
    const equityCurve = fillMissingDates(metrics.equityCurve);

    const dailyMap = new Map<string, number>();
    for (const pick of selectedPicks) {
      dailyMap.set(pick.date, (dailyMap.get(pick.date) ?? 0) + pick.profit);
    }
    const daily = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, units]) => ({ date, units }));

    let cumulative = 0;
    const dailyWithCumulative = daily.map((item) => {
      cumulative += item.units;
      return { ...item, cumulative };
    });

    return NextResponse.json({
      picks: selectedPicks,
      summary: { ...metrics, equityCurve },
      daily: dailyWithCumulative,
      filters: body
    });
  } catch (error) {
    console.error('回測 API 錯誤', error);
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json(
        { message: '資料庫尚未設定，請先設定 DATABASE_URL 環境變數' },
        { status: 503 }
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: '策略回測失敗' }, { status: 500 });
  }
}
