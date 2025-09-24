import { PrismaClient } from '@prisma/client';
import {
  MARKET_SELECTION,
  MARKET_TYPE,
  PICK_SELECTION,
  RESULT_OUTCOME,
  MarketSelection,
  MarketType,
  PickSelection,
  ResultOutcome
} from '../lib/enums';

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.trim()) {
  console.error('缺少 DATABASE_URL，無法執行 PostgreSQL 種子資料。請先設定環境變數後再重試。');
  process.exit(1);
}

const prisma = new PrismaClient();

const leagues = [
  {
    league: 'NBA',
    teams: ['台北戰神', '高雄火焰', '新竹巨浪', '台中雷霆']
  },
  {
    league: 'MLB',
    teams: ['台北猛虎', '台中飛魚', '高雄犀牛', '花蓮鯨']
  }
];

const homeOddsList = [1.72, 1.68, 1.82, 1.95];
const awayOddsList = [2.15, 2.25, 2.05, 1.92];
const overOddsList = [1.91, 1.87, 1.93, 1.88];
const underOddsList = [1.95, 1.92, 1.9, 1.96];
const homeModelList = [0.59, 0.66, 0.62, 0.69];
const overModelList = [0.56, 0.64, 0.6, 0.67];

function calculateEv(pModel: number, oddsDecimal: number) {
  return pModel * (oddsDecimal - 1) - (1 - pModel);
}

function calculateKelly(pModel: number, oddsDecimal: number) {
  const b = oddsDecimal - 1;
  if (b <= 0) return 0;
  const fraction = (b * pModel - (1 - pModel)) / b;
  return fraction > 0 ? fraction : 0;
}

async function main() {
  await prisma.metricDaily.deleteMany();
  await prisma.result.deleteMany();
  await prisma.pick.deleteMany();
  await prisma.modelProb.deleteMany();
  await prisma.odds.deleteMany();
  await prisma.market.deleteMany();
  await prisma.game.deleteMany();
  await prisma.team.deleteMany();
  await prisma.uploadLog.deleteMany();

  const teamMap = new Map<string, number[]>();

  for (const { league, teams } of leagues) {
    const ids: number[] = [];
    for (const name of teams) {
      const team = await prisma.team.create({
        data: { name, league }
      });
      ids.push(team.id);
    }
    teamMap.set(league, ids);
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - 29);

  for (let dayOffset = 0; dayOffset < 30; dayOffset += 1) {
    const gameDate = new Date(start);
    gameDate.setUTCDate(start.getUTCDate() + dayOffset);
    gameDate.setUTCHours(12, 0, 0, 0);

    for (const [leagueIndex, { league }] of leagues.entries()) {
      const teamIds = teamMap.get(league)!;
      const homeTeamId = teamIds[(dayOffset + leagueIndex) % teamIds.length];
      const awayTeamId = teamIds[(dayOffset + leagueIndex + 1) % teamIds.length];
      const variant = (dayOffset + leagueIndex) % 4;

      const game = await prisma.game.create({
        data: {
          league,
          date: gameDate,
          finalized: true,
          homeTeamId,
          awayTeamId
        }
      });

      const homeOdds = homeOddsList[variant];
      const awayOdds = awayOddsList[variant];
      const overOdds = overOddsList[variant];
      const underOdds = underOddsList[variant];
      const homeModel = homeModelList[variant];
      const awayModel = Math.max(0.25, 1 - homeModel - 0.05);
      const overModel = overModelList[variant];
      const underModel = Math.max(0.25, 1 - overModel - 0.05);
      const totalLine = league === 'NBA' ? 216 + variant * 4 : 7.5 + variant * 0.5;

      const homeMarket = await prisma.market.create({
        data: {
          gameId: game.id,
          type: MARKET_TYPE.ML,
          selection: MARKET_SELECTION.HOME
        }
      });
      const awayMarket = await prisma.market.create({
        data: {
          gameId: game.id,
          type: MARKET_TYPE.ML,
          selection: MARKET_SELECTION.AWAY
        }
      });
      const overMarket = await prisma.market.create({
        data: {
          gameId: game.id,
          type: MARKET_TYPE.TOTAL,
          selection: MARKET_SELECTION.OVER,
          line: totalLine
        }
      });
      const underMarket = await prisma.market.create({
        data: {
          gameId: game.id,
          type: MARKET_TYPE.TOTAL,
          selection: MARKET_SELECTION.UNDER,
          line: totalLine
        }
      });

      const oddsPayload = [
        { marketId: homeMarket.id, oddsDecimal: homeOdds },
        { marketId: awayMarket.id, oddsDecimal: awayOdds },
        { marketId: overMarket.id, oddsDecimal: overOdds },
        { marketId: underMarket.id, oddsDecimal: underOdds }
      ];

      for (const payload of oddsPayload) {
        await prisma.odds.create({
          data: {
            marketId: payload.marketId,
            bookmaker: 'DemoBook',
            oddsDecimal: payload.oddsDecimal,
            createdAt: gameDate
          }
        });
      }

      const modelPayload = [
        { marketId: homeMarket.id, pModel: homeModel },
        { marketId: awayMarket.id, pModel: awayModel },
        { marketId: overMarket.id, pModel: overModel },
        { marketId: underMarket.id, pModel: underModel }
      ];

      for (const payload of modelPayload) {
        await prisma.modelProb.create({
          data: {
            marketId: payload.marketId,
            pModel: payload.pModel,
            modelTag: 'baseline_v1',
            createdAt: gameDate
          }
        });
      }

      const homeWin = (dayOffset + leagueIndex) % 3 !== 0;
      const totalOver = (dayOffset + variant) % 2 === 0;

      await prisma.result.create({
        data: {
          marketId: homeMarket.id,
          outcome: homeWin ? RESULT_OUTCOME.WIN : RESULT_OUTCOME.LOSE,
          settledAt: new Date(gameDate.getTime() + 4 * 60 * 60 * 1000)
        }
      });
      await prisma.result.create({
        data: {
          marketId: awayMarket.id,
          outcome: homeWin ? RESULT_OUTCOME.LOSE : RESULT_OUTCOME.WIN,
          settledAt: new Date(gameDate.getTime() + 4 * 60 * 60 * 1000)
        }
      });
      await prisma.result.create({
        data: {
          marketId: overMarket.id,
          outcome: totalOver ? RESULT_OUTCOME.WIN : RESULT_OUTCOME.LOSE,
          settledAt: new Date(gameDate.getTime() + 4 * 60 * 60 * 1000)
        }
      });
      await prisma.result.create({
        data: {
          marketId: underMarket.id,
          outcome: totalOver ? RESULT_OUTCOME.LOSE : RESULT_OUTCOME.WIN,
          settledAt: new Date(gameDate.getTime() + 4 * 60 * 60 * 1000)
        }
      });

      const picks = [
        {
          marketId: homeMarket.id,
          selection: PICK_SELECTION.HOME,
          odds: homeOdds,
          pModel: homeModel
        },
        {
          marketId: overMarket.id,
          selection: PICK_SELECTION.OVER,
          odds: overOdds,
          pModel: overModel
        }
      ];

      for (const pick of picks) {
        const ev = calculateEv(pick.pModel, pick.odds);
        const kelly = calculateKelly(pick.pModel, pick.odds);
        if (ev > 0 && kelly > 0.01) {
          await prisma.pick.create({
            data: {
              marketId: pick.marketId,
              selection: pick.selection,
              stakeUnits: Number((Math.max(0.25, kelly) * 1.5).toFixed(2)),
              kellyFactor: 0.5,
              createdAt: gameDate
            }
          });
        }
      }
    }
  }

  console.log('資料庫已建立 30 天示範資料');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
