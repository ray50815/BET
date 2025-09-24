import { subDays } from 'date-fns';
import { GamesClient } from '@/components/GamesClient';
import { DatabaseSetupNotice } from '@/components/DatabaseSetupNotice';
import { toDateKey } from '@/lib/analytics';
import { getLeagues } from '@/lib/reporting';
import { DatabaseNotConfiguredError, getPrismaClient } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function GamesPage() {
  try {
    const prisma = getPrismaClient();
    const end = new Date();
    const start = subDays(end, 14);
    const [games, leagues] = await Promise.all([
      prisma.game.findMany({
        where: {
          date: {
            gte: start,
            lte: end
          }
        },
        include: {
          homeTeam: true,
          awayTeam: true,
          markets: {
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
        orderBy: { date: 'desc' },
        take: 40
      }),
      getLeagues()
    ]);

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

    return <GamesClient initialGames={payload} leagues={leagues} />;
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return <DatabaseSetupNotice title="近期賽程尚未載入" />;
    }
    throw error;
  }
}
