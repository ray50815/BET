import { PrismaClient } from '@prisma/client';
import {
  MARKET_SELECTION,
  MARKET_TYPE,
  RESULT_OUTCOME,
  MarketSelection,
  MarketType,
  ResultOutcome
} from './enums';
import { DatabaseNotConfiguredError, getPrismaClient, isDatabaseConfigured } from './prisma';

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

function marketTypeFromString(value: string): MarketType {
  const normalized = value.toUpperCase();
  if (normalized === 'ML' || normalized === 'MONEYLINE') return MARKET_TYPE.ML;
  if (normalized === 'SPREAD') return MARKET_TYPE.SPREAD;
  if (normalized === 'TOTAL' || normalized === 'OU' || normalized === 'O/U') return MARKET_TYPE.TOTAL;
  throw new Error(`未知的盤口類型: ${value}`);
}

function selectionFromString(value: string): MarketSelection {
  const normalized = value.toUpperCase();
  switch (normalized) {
    case 'HOME':
    case 'H':
      return MARKET_SELECTION.HOME;
    case 'AWAY':
    case 'A':
      return MARKET_SELECTION.AWAY;
    case 'OVER':
    case 'O':
      return MARKET_SELECTION.OVER;
    case 'UNDER':
    case 'U':
      return MARKET_SELECTION.UNDER;
    default:
      throw new Error(`未知的投注選項: ${value}`);
  }
}

function outcomeFromString(value: string): ResultOutcome {
  const normalized = value.toUpperCase();
  if (normalized === 'W' || normalized === 'WIN') return RESULT_OUTCOME.WIN;
  if (normalized === 'L' || normalized === 'LOSE') return RESULT_OUTCOME.LOSE;
  if (normalized === 'P' || normalized === 'PUSH') return RESULT_OUTCOME.PUSH;
  throw new Error(`未知的賽果標記: ${value}`);
}

function parseResultSide(value?: string) {
  const result: Partial<Record<MarketSelection, ResultOutcome>> = {};
  if (!value) return result;
  const tokens = value.split(/[;|]/).map((item) => item.trim()).filter(Boolean);
  for (const token of tokens) {
    const [rawSelection, rawOutcome] = token.split(':').map((item) => item.trim());
    if (!rawSelection || !rawOutcome) continue;
    const selection = selectionFromString(rawSelection);
    result[selection] = outcomeFromString(rawOutcome);
  }
  return result;
}

const teamCache = new Map<string, number>();
const gameCache = new Map<string, number>();
const marketCache = new Map<string, number>();

function ensureDatabase(): PrismaClient {
  if (!isDatabaseConfigured()) {
    throw new DatabaseNotConfiguredError();
  }
  return getPrismaClient();
}

async function getTeamId(prisma: PrismaClient, league: string, name: string) {
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

async function getGameId(prisma: PrismaClient, row: GameRow) {
  const key = gameKey(row.league, row.date, row.home, row.away);
  if (gameCache.has(key)) return gameCache.get(key)!;
  const date = parseDate(row.date);
  const homeTeamId = await getTeamId(prisma, row.league, row.home);
  const awayTeamId = await getTeamId(prisma, row.league, row.away);
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
  prisma: PrismaClient,
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
  const prisma = ensureDatabase();
  teamCache.clear();
  gameCache.clear();
  marketCache.clear();
  let gamesInserted = 0;
  let oddsInserted = 0;
  let modelsInserted = 0;
  const closingTotals = new Map<string, number>();

  for (const row of games) {
    const gameId = await getGameId(prisma, row);
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
        (selection as MarketSelection) === MARKET_SELECTION.OVER ||
        (selection as MarketSelection) === MARKET_SELECTION.UNDER
          ? MARKET_TYPE.TOTAL
          : MARKET_TYPE.ML;
      const marketId = await ensureMarket(
        prisma,
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
    const gameId = await getGameId(prisma, base);
    const type = marketTypeFromString(row.market);
    const selection = selectionFromString(row.selection);
    const lineKey = `${gameId}|${type}`;
    const line = closingTotals.get(lineKey) ?? null;
    const marketId = await ensureMarket(prisma, gameId, type, selection, line);
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
    const gameId = await getGameId(prisma, base);
    const type = marketTypeFromString(row.market);
    const selection = selectionFromString(row.selection);
    const lineKey = `${gameId}|${type}`;
    const line = closingTotals.get(lineKey) ?? null;
    const marketId = await ensureMarket(prisma, gameId, type, selection, line);
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
