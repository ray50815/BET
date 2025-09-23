import {
  MARKET_SELECTION,
  MARKET_TYPE,
  MarketSelection,
  MarketType,
  ResultOutcome,
  parseMarketSelectionInput,
  parseMarketTypeInput,
  parseResultOutcomeInput
} from './enums';
import { prisma } from './prisma';

export interface GameRow {
  date: string;
  league: string;
  home: string;
  away: string;
  finalized: boolean;
  result_side?: string;
  closing_total?: string;
}

export interface OddsRow {
  date: string;
  league: string;
  home: string;
  away: string;
  market: string;
  selection: string;
  odds_decimal: string;
  bookmaker: string;
}

export interface ModelRow {
  date: string;
  league: string;
  home: string;
  away: string;
  market: string;
  selection: string;
  p_model: string;
  model_tag: string;
}

function parseDate(value: string) {
  return new Date(`${value}T12:00:00+08:00`);
}

function parseResultSide(value?: string) {
  const result: Partial<Record<MarketSelection, ResultOutcome>> = {};
  if (!value) return result;
  const tokens = value.split(/[;|]/).map((item) => item.trim()).filter(Boolean);
  for (const token of tokens) {
    const [rawSelection, rawOutcome] = token.split(':').map((item) => item.trim());
    if (!rawSelection || !rawOutcome) continue;
    const selection = parseMarketSelectionInput(rawSelection);
    result[selection] = parseResultOutcomeInput(rawOutcome);
  }
  return result;
}

const teamCache = new Map<string, number>();
const gameCache = new Map<string, number>();
const marketCache = new Map<string, number>();

async function getTeamId(league: string, name: string) {
  const key = `${league}|${name}`;
  if (teamCache.has(key)) return teamCache.get(key)!;
  const existing = await prisma.team.findFirst({
    where: { league, name }
  });
  if (existing) {
    teamCache.set(key, existing.id);
    return existing.id;
  }
  const created = await prisma.team.create({
    data: { league, name }
  });
  teamCache.set(key, created.id);
  return created.id;
}

function gameKey(league: string, date: string, home: string, away: string) {
  return `${league}|${date}|${home}|${away}`;
}

async function getGameId(row: GameRow) {
  const key = gameKey(row.league, row.date, row.home, row.away);
  if (gameCache.has(key)) return gameCache.get(key)!;
  const date = parseDate(row.date);
  const homeTeamId = await getTeamId(row.league, row.home);
  const awayTeamId = await getTeamId(row.league, row.away);
  const existing = await prisma.game.findFirst({
    where: {
      league: row.league,
      date,
      homeTeamId,
      awayTeamId
    }
  });
  if (existing) {
    gameCache.set(key, existing.id);
    return existing.id;
  }
  const created = await prisma.game.create({
    data: {
      league: row.league,
      date,
      finalized: row.finalized,
      homeTeamId,
      awayTeamId
    }
  });
  gameCache.set(key, created.id);
  return created.id;
}

async function ensureMarket(
  gameId: number,
  type: MarketType,
  selection: MarketSelection,
  line?: number | null
) {
  const key = `${gameId}|${type}|${selection}`;
  if (marketCache.has(key)) return marketCache.get(key)!;
  const existing = await prisma.market.findFirst({
    where: {
      gameId,
      type,
      selection
    }
  });
  if (existing) {
    marketCache.set(key, existing.id);
    if (line !== undefined && line !== null) {
      await prisma.market.update({
        where: { id: existing.id },
        data: { line }
      });
    }
    return existing.id;
  }
  const created = await prisma.market.create({
    data: {
      gameId,
      type,
      selection,
      line
    }
  });
  marketCache.set(key, created.id);
  return created.id;
}

export async function importDataset({
  games,
  odds,
  models
}: {
  games: GameRow[];
  odds: OddsRow[];
  models: ModelRow[];
}) {
  teamCache.clear();
  gameCache.clear();
  marketCache.clear();
  let gamesInserted = 0;
  let oddsInserted = 0;
  let modelsInserted = 0;
  const closingTotals = new Map<string, number>();

  for (const row of games) {
    const gameId = await getGameId(row);
    gamesInserted += 1;
    await prisma.game.update({
      where: { id: gameId },
      data: { finalized: row.finalized }
    });
    const closingTotal = row.closing_total ? Number(row.closing_total) : undefined;
    if (closingTotal) {
      closingTotals.set(`${gameId}|TOTAL`, closingTotal);
    }
    const resultInfo = parseResultSide(row.result_side);
    for (const [selection, outcome] of Object.entries(resultInfo)) {
      const marketType =
        selection === MARKET_SELECTION.OVER || selection === MARKET_SELECTION.UNDER
          ? MARKET_TYPE.TOTAL
          : MARKET_TYPE.ML;
      const marketId = await ensureMarket(
        gameId,
        marketType,
        selection as MarketSelection,
        marketType === MARKET_TYPE.TOTAL ? closingTotal ?? null : undefined
      );
      await prisma.result.upsert({
        where: { marketId },
        create: {
          marketId,
          outcome: outcome!,
          settledAt: new Date()
        },
        update: {
          outcome: outcome!,
          settledAt: new Date()
        }
      });
    }
  }

  for (const row of odds) {
    const base: GameRow = {
      date: row.date,
      league: row.league,
      home: row.home,
      away: row.away,
      finalized: false
    };
    const gameId = await getGameId(base);
    const type = parseMarketTypeInput(row.market);
    const selection = parseMarketSelectionInput(row.selection);
    const lineKey = `${gameId}|${type}`;
    const line = closingTotals.get(lineKey) ?? null;
    const marketId = await ensureMarket(gameId, type, selection, line);
    await prisma.odds.create({
      data: {
        marketId,
        bookmaker: row.bookmaker,
        oddsDecimal: Number(row.odds_decimal),
        createdAt: parseDate(row.date)
      }
    });
    oddsInserted += 1;
  }

  for (const row of models) {
    const base: GameRow = {
      date: row.date,
      league: row.league,
      home: row.home,
      away: row.away,
      finalized: false
    };
    const gameId = await getGameId(base);
    const type = parseMarketTypeInput(row.market);
    const selection = parseMarketSelectionInput(row.selection);
    const lineKey = `${gameId}|${type}`;
    const line = closingTotals.get(lineKey) ?? null;
    const marketId = await ensureMarket(gameId, type, selection, line);
    await prisma.modelProb.create({
      data: {
        marketId,
        pModel: Number(row.p_model),
        modelTag: row.model_tag,
        createdAt: parseDate(row.date)
      }
    });
    modelsInserted += 1;
  }

  await prisma.uploadLog.create({
    data: {
      filename: `manual-upload-${new Date().toISOString()}`,
      meta: {
        gamesInserted,
        oddsInserted,
        modelsInserted
      }
    }
  });

  return {
    gamesInserted,
    oddsInserted,
    modelsInserted
  };
}
