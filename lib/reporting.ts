import { subDays } from 'date-fns';
import {
  MARKET_SELECTION_VALUES,
  MARKET_TYPE,
  MARKET_TYPE_VALUES,
  RESULT_OUTCOME_VALUES,
  ResultOutcome,
  MarketSelection,
  MarketType
} from './enums';
import { DatabaseNotConfiguredError, getPrismaClient, isDatabaseConfigured } from './prisma';
import {
  calculateEv,
  calculateImpliedProbability,
  calculateKellyFraction,
  calculatePerformanceMetrics,
  calculateProfit,
  fillMissingDates,
  getKellyStakeTiers,
  removeVig,
  toDateKey
} from './analytics';

export type ReportMode = 'highWin' | 'positiveEv';

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  leagues?: string[];
  marketTypes?: MarketType[];
  minSamples?: number;
  minProbability?: number;
  minEv?: number;
}

export interface ReportRow {
  id: number;
  date: string;
  league: string;
  matchup: string;
  marketType: MarketType;
  selection: MarketSelection;
  oddsDecimal: number;
  bookmaker: string;
  pModel: number;
  modelTag: string;
  pImplied: number | null;
  ev: number;
  kellyFraction: number;
  kellyTiers: Record<string, number>;
  result: 'WIN' | 'LOSE' | 'PUSH' | 'PENDING';
  unitsDelta: number;
}

export interface ReportSummary {
  hitRate: number;
  hitRateInterval: { low: number; high: number };
  roi: number;
  units: number;
  maxDrawdown: number;
  sampleSize: number;
  totalStake: number;
  equityCurve: { date: string; delta: number; equity: number }[];
  enoughSamples: boolean;
  totalPicks: number;
}

export interface ReportResult {
  rows: ReportRow[];
  summary: ReportSummary;
  filters: ReportFilters;
  mode: ReportMode;
}

const DEFAULT_RANGE_DAYS = 30;
const BANKROLL_UNITS = 1;

function ensureDatabase() {
  if (!isDatabaseConfigured()) {
    throw new DatabaseNotConfiguredError();
  }
  return getPrismaClient();
}

function parseDateInput(date: string, hour = 0) {
  return new Date(`${date}T${hour.toString().padStart(2, '0')}:00:00+08:00`);
}

function resolveDateRange(filters: ReportFilters) {
  const end = filters.endDate ? parseDateInput(filters.endDate, 23) : new Date();
  const start = filters.startDate
    ? parseDateInput(filters.startDate, 0)
    : subDays(end, DEFAULT_RANGE_DAYS);
  return { start, end };
}

function formatMatchup(home: string, away: string) {
  return `${away} @ ${home}`;
}

function normalizeMarketType(value: string): MarketType {
  if (MARKET_TYPE_VALUES.includes(value as MarketType)) {
    return value as MarketType;
  }
  throw new Error(`資料庫中的 market.type 無法辨識: ${value}`);
}

function normalizeMarketSelection(value: string): MarketSelection {
  if (MARKET_SELECTION_VALUES.includes(value as MarketSelection)) {
    return value as MarketSelection;
  }
  throw new Error(`資料庫中的 market.selection 無法辨識: ${value}`);
}

function normalizeOutcome(value: string | null | undefined): ReportRow['result'] {
  if (!value) return 'PENDING';
  if (RESULT_OUTCOME_VALUES.includes(value as ResultOutcome)) {
    return value as ResultOutcome;
  }
  return 'PENDING';
}

export async function getLeagues(): Promise<string[]> {
  const prisma = ensureDatabase();
  const leagues = await prisma.game.findMany({
    select: { league: true },
    distinct: ['league'],
    orderBy: { league: 'asc' }
  });
  return leagues.map((item) => item.league);
}

export async function getReportData(
  mode: ReportMode,
  filters: ReportFilters = {}
): Promise<ReportResult> {
  const prisma = ensureDatabase();
  const { start, end } = resolveDateRange(filters);
  const marketTypes = filters.marketTypes?.length
    ? filters.marketTypes
    : [MARKET_TYPE.ML, MARKET_TYPE.SPREAD, MARKET_TYPE.TOTAL];

  const markets = await prisma.market.findMany({
    where: {
      type: { in: marketTypes },
      game: {
        date: {
          gte: start,
          lte: end
        },
        league: filters.leagues?.length ? { in: filters.leagues } : undefined
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

  // 聚合同一場、同一盤口的多個 market 以估算無抽水隱含機率
  const groupedOdds = new Map<string, number[]>();
  const groupedIds: Record<string, number[]> = {};

  for (const market of markets) {
    const key = `${market.gameId}-${market.type}`;
    const oddsValue = market.odds[0]?.oddsDecimal ?? null;
    if (!groupedIds[key]) {
      groupedIds[key] = [];
    }
    groupedIds[key].push(market.id);
    if (!groupedOdds.has(key)) {
      groupedOdds.set(key, []);
    }
    if (oddsValue) {
      groupedOdds.get(key)!.push(Number(oddsValue));
    }
  }

  const impliedMap = new Map<number, number>();
  for (const [groupKey, oddsList] of groupedOdds.entries()) {
    if (oddsList.length === 0) continue;
    const normalized = removeVig(oddsList);
    const ids = groupedIds[groupKey];
    normalized.forEach((prob, index) => {
      const marketId = ids[index];
      impliedMap.set(marketId, prob);
    });
  }

  const rows: ReportRow[] = [];

  for (const market of markets) {
    const latestOdds = market.odds[0];
    const latestModel = market.modelProbs[0];
    if (!latestOdds || !latestModel) continue;

    const pModel = latestModel.pModel;
    const ev = calculateEv(pModel, Number(latestOdds.oddsDecimal));
    const passesRule =
      mode === 'highWin'
        ? pModel >= (filters.minProbability ?? 0.6)
        : ev >= (filters.minEv ?? 0);
    if (!passesRule) continue;

    const dateKey = toDateKey(market.game.date);
    const implied =
      impliedMap.get(market.id) ?? calculateImpliedProbability(Number(latestOdds.oddsDecimal));
    const kellyFraction = calculateKellyFraction(pModel, Number(latestOdds.oddsDecimal));
    const kellyTiers = getKellyStakeTiers(BANKROLL_UNITS, kellyFraction);

    const result = normalizeOutcome(market.result?.outcome);
    const unitsDelta =
      result === 'PENDING'
        ? 0
        : calculateProfit(result, Number(latestOdds.oddsDecimal), BANKROLL_UNITS);

    rows.push({
      id: market.id,
      date: dateKey,
      league: market.game.league,
      matchup: formatMatchup(market.game.homeTeam.name, market.game.awayTeam.name),
      marketType: normalizeMarketType(market.type),
      selection: normalizeMarketSelection(market.selection),
      oddsDecimal: Number(Number(latestOdds.oddsDecimal).toFixed(2)),
      bookmaker: latestOdds.bookmaker,
      pModel: Number(pModel.toFixed(3)),
      modelTag: latestModel.modelTag,
      pImplied: Number(implied.toFixed(3)),
      ev: Number(ev.toFixed(3)),
      kellyFraction: Number(kellyFraction.toFixed(3)),
      kellyTiers,
      result,
      unitsDelta
    });
  }

  rows.sort((a, b) => (a.date === b.date ? b.id - a.id : a.date > b.date ? -1 : 1));

  const picksForMetrics = rows.map((row) => ({
    stakeUnits: BANKROLL_UNITS,
    oddsDecimal: row.oddsDecimal,
    outcome: (row.result === 'PENDING' ? 'PUSH' : row.result) as 'WIN' | 'LOSE' | 'PUSH',
    date: new Date(`${row.date}T12:00:00+08:00`)
  }));

  const metrics = calculatePerformanceMetrics(picksForMetrics);
  const enoughSamples = rows.length >= (filters.minSamples ?? 0);

  const summary: ReportSummary = {
    ...metrics,
    equityCurve: fillMissingDates(metrics.equityCurve),
    enoughSamples,
    totalPicks: rows.length
  };

  return {
    rows,
    summary,
    filters,
    mode
  };
}

export async function getDashboardOverview() {
  const filters: ReportFilters = {};
  const report = await getReportData('positiveEv', filters);
  const now = new Date();
  const start20 = subDays(now, 20);
  const start60 = subDays(now, 60);

  const picks = report.rows.map((row) => ({
    stakeUnits: 1,
    oddsDecimal: row.oddsDecimal,
    outcome: (row.result === 'PENDING' ? 'PUSH' : row.result) as 'WIN' | 'LOSE' | 'PUSH',
    date: new Date(`${row.date}T12:00:00+08:00`)
  }));

  const picks20 = picks.filter((pick) => pick.date >= start20);
  const picks60 = picks.filter((pick) => pick.date >= start60);

  const metrics20 = calculatePerformanceMetrics(picks20);
  const metrics60 = calculatePerformanceMetrics(picks60);

  return {
    summary: report.summary,
    last20: metrics20,
    last60: metrics60,
    rows: report.rows
  };
}
