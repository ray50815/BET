import { MarketType } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { toDateKey } from '@/lib/analytics';
import { parseMarketTypeInput } from '@/lib/enums';

const querySchema = z.object({
  league: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  marketType: z.enum(['ML', 'SPREAD', 'TOTAL']).optional()
});

function parseDate(value?: string, hour = 0) {
  if (!value) return undefined;
  return new Date(`${value}T${hour.toString().padStart(2, '0')}:00:00+08:00`);
}

export async function GET(request: NextRequest) {
  try {
    const query = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = querySchema.parse(query);
    const end = parseDate(parsed.endDate, 23) ?? new Date();
    const start =
      parseDate(parsed.startDate, 0) ??
      new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 利用 parseMarketTypeInput 將字串轉換成 Prisma 的 enum
    const marketFilter = parsed.marketType
      ? parseMarketTypeInput(parsed.marketType) as MarketType
      : undefined;

    const games = await prisma.game.findMany({
      where: {
        league: parsed.league ? parsed.league : undefined,
        date: {
          gte: start,
          lte: end
        }
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        markets: {
          where: {
            type: marketFilter ? marketFilter : undefined
          },
          include: {
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
        }
      },
      orderBy: { date: 'desc' }
    });

    const payload = games.map((game) => ({
      id: game.id,
      date: toDateKey(game.date),
      league: game.league,
      homeTeam: game.homeTeam.name,
      awayTeam: game.awayTeam.name,
      finalized: game.finalized,
      markets: game.markets.map((market) => ({
        id: market.id,
        type: market.type,
        selection: market.selection,
        line: market.line,
        odds: market.odds[0]?.oddsDecimal ?? null,
        bookmaker: market.odds[0]?.bookmaker ?? null,
        pModel: market.modelProbs[0]?.pModel ?? null,
        modelTag: market.modelProbs[0]?.modelTag ?? null,
        result: market.result?.outcome ?? null
      }))
    }));

    return NextResponse.json({ games: payload });
  } catch (error) {
    console.error('取得賽程 API 錯誤', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: '查詢賽程失敗' }, { status: 500 });
  }
}
