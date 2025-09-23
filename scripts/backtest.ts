import { MarketType } from '@prisma/client';
import { subDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import {
  calculateEv,
  calculatePerformanceMetrics,
  calculateProfit,
  fillMissingDates,
  toDateKey
} from '@/lib/analytics';

async function main() {
  const minProbability = Number(process.env.MIN_PROB ?? '0.6');
  const minEv = Number(process.env.MIN_EV ?? '0');
  const stakeUnits = Number(process.env.STAKE ?? '1');
  const maxConcurrent = Number(process.env.MAX_CONCURRENT ?? '3');
  const end = process.env.END_DATE ? new Date(`${process.env.END_DATE}T23:59:59+08:00`) : new Date();
  const start = process.env.START_DATE
    ? new Date(`${process.env.START_DATE}T00:00:00+08:00`)
    : subDays(end, 30);
  const leagueFilter = process.env.LEAGUES
    ? process.env.LEAGUES.split(',').map((item) => item.trim()).filter(Boolean)
    : undefined;
  const marketTypes = process.env.MARKETS
    ? process.env.MARKETS.split(',')
        .map((item) => item.trim().toUpperCase())
        .filter((item): item is keyof typeof MarketType => item in MarketType)
        .map((item) => MarketType[item])
    : [MarketType.ML, MarketType.SPREAD, MarketType.TOTAL];

  const markets = await prisma.market.findMany({
    where: {
      type: { in: marketTypes },
      game: {
        league: leagueFilter ? { in: leagueFilter } : undefined,
        date: {
          gte: start,
          lte: end
        }
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
    const key = toDateKey(market.game.date);
    const list = grouped.get(key);
    if (list) {
      list.push(market);
    } else {
      grouped.set(key, [market]);
    }
  }

  const selected: {
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

  for (const [date, list] of grouped.entries()) {
    const eligible = list
      .map((market) => {
        const odds = market.odds[0];
        const model = market.modelProbs[0];
        if (!odds || !model) return null;
        const ev = calculateEv(model.pModel, odds.oddsDecimal);
        if (model.pModel < minProbability || ev < minEv) return null;
        return { market, ev, odds, model };
      })
      .filter((item): item is { market: (typeof markets)[number]; ev: number; odds: any; model: any } => !!item)
      .sort((a, b) => b.ev - a.ev)
      .slice(0, maxConcurrent);

    for (const pick of eligible) {
      const profit = calculateProfit(pick.market.result?.outcome ?? 'PUSH', pick.odds.oddsDecimal, stakeUnits);
      selected.push({
        date,
        league: pick.market.game.league,
        matchup: `${pick.market.game.awayTeam.name} @ ${pick.market.game.homeTeam.name}`,
        marketType: pick.market.type,
        selection: pick.market.selection,
        oddsDecimal: pick.odds.oddsDecimal,
        pModel: pick.model.pModel,
        ev: pick.ev,
        result: pick.market.result?.outcome ?? 'PUSH',
        profit
      });
    }
  }

  const metrics = calculatePerformanceMetrics(
    selected
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((pick) => ({
        stakeUnits,
        oddsDecimal: pick.oddsDecimal,
        outcome: pick.result as 'WIN' | 'LOSE' | 'PUSH',
        date: new Date(`${pick.date}T12:00:00+08:00`)
      }))
  );
  const equity = fillMissingDates(metrics.equityCurve);

  console.log('===== 回測結果 =====');
  console.log('樣本數', metrics.sampleSize);
  console.log('命中率', formatPercent(metrics.hitRate));
  console.log('ROI', formatPercent(metrics.roi));
  console.log('累積 Units', metrics.units.toFixed(2));
  console.log('最大回撤', metrics.maxDrawdown.toFixed(2));
  console.log('每日損益 (前 5 日)', equity.slice(0, 5));
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
