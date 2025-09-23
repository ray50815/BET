import { addDays } from 'date-fns';

type Outcome = 'WIN' | 'LOSE' | 'PUSH';

type PickLike = {
  stakeUnits: number;
  oddsDecimal: number;
  outcome: Outcome;
  date: Date;
};

export function calculateImpliedProbability(oddsDecimal: number): number {
  if (oddsDecimal <= 1) {
    throw new Error('賠率必須大於 1');
  }
  return 1 / oddsDecimal;
}

export function removeVig(odds: number[]): number[] {
  if (odds.length === 0) return [];
  const raw = odds.map((odd) => calculateImpliedProbability(odd));
  const total = raw.reduce((acc, cur) => acc + cur, 0);
  if (total === 0) {
    return raw.map(() => 0);
  }
  return raw.map((val) => val / total);
}

export function calculateEv(pModel: number, oddsDecimal: number): number {
  const edge = oddsDecimal - 1;
  return pModel * edge - (1 - pModel);
}

export function calculateKellyFraction(pModel: number, oddsDecimal: number): number {
  const b = oddsDecimal - 1;
  if (b <= 0) return 0;
  const numerator = b * pModel - (1 - pModel);
  const fraction = numerator / b;
  return fraction > 0 ? fraction : 0;
}

export function getKellyStakeTiers(
  bankrollUnits: number,
  kellyFraction: number,
  factors: number[] = [0.25, 0.5, 1]
): Record<string, number> {
  const rounded = (value: number) => Math.round(value * 100) / 100;
  const entries = factors.map((factor) => {
    const key = `${Math.round(factor * 100)}%`;
    const units = bankrollUnits * kellyFraction * factor;
    return [key, rounded(units)];
  });
  return Object.fromEntries(entries);
}

export function calculateWilsonInterval(
  successes: number,
  total: number,
  confidence = 0.95
): { low: number; high: number } {
  if (total === 0) {
    return { low: 0, high: 0 };
  }
  const z = confidence === 0.95 ? 1.96 : Math.sqrt(2) * erfInv(confidence);
  const pHat = successes / total;
  const denominator = 1 + (z * z) / total;
  const centre = pHat + (z * z) / (2 * total);
  const margin =
    (z * Math.sqrt((pHat * (1 - pHat)) / total + (z * z) / (4 * total * total))) /
    denominator;
  return {
    low: Math.max(0, (centre - margin) / denominator),
    high: Math.min(1, (centre + margin) / denominator)
  };
}

function erfInv(x: number): number {
  const a = 0.147; // approximation constant
  const ln = Math.log(1 - x * x);
  const first = (2 / (Math.PI * a)) + ln / 2;
  const second = ln / a;
  return Math.sign(x) * Math.sqrt(Math.sqrt(first * first - second) - first);
}

export function calculateProfit(outcome: Outcome, oddsDecimal: number, stakeUnits: number): number {
  switch (outcome) {
    case 'WIN':
      return (oddsDecimal - 1) * stakeUnits;
    case 'LOSE':
      return -stakeUnits;
    default:
      return 0;
  }
}

export function toDateKey(date: Date, timeZone = 'Asia/Taipei'): string {
  const locale = date.toLocaleString('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const [month, day, year] = locale.split('/');
  return `${year}-${month}-${day}`;
}

export function calculatePerformanceMetrics(picks: PickLike[]) {
  if (picks.length === 0) {
    return {
      hitRate: 0,
      hitRateInterval: { low: 0, high: 0 },
      roi: 0,
      units: 0,
      maxDrawdown: 0,
      sampleSize: 0,
      totalStake: 0,
      equityCurve: [] as { date: string; delta: number; equity: number }[]
    };
  }

  const sorted = [...picks].sort((a, b) => a.date.getTime() - b.date.getTime());
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  let wins = 0;
  let losses = 0;
  let totalStake = 0;
  const dailyMap = new Map<string, { delta: number; equity: number }>();

  for (const pick of sorted) {
    const profit = calculateProfit(pick.outcome, pick.oddsDecimal, pick.stakeUnits);
    if (pick.outcome !== 'PUSH') {
      totalStake += pick.stakeUnits;
    }
    if (pick.outcome === 'WIN') wins += 1;
    if (pick.outcome === 'LOSE') losses += 1;
    equity += profit;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);

    const key = toDateKey(pick.date);
    const existing = dailyMap.get(key) ?? { delta: 0, equity: 0 };
    existing.delta += profit;
    existing.equity = equity;
    dailyMap.set(key, existing);
  }

  const sampleSize = wins + losses;
  const hitRate = sampleSize ? wins / sampleSize : 0;
  const hitRateInterval = calculateWilsonInterval(wins, sampleSize);
  const units = equity;
  const roi = totalStake > 0 ? units / totalStake : 0;

  const equityCurve = Array.from(dailyMap.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([date, value]) => ({ date, delta: value.delta, equity: value.equity }));

  return {
    hitRate,
    hitRateInterval,
    roi,
    units,
    maxDrawdown,
    sampleSize,
    totalStake,
    equityCurve
  };
}

export function fillMissingDates(
  curve: { date: string; delta: number; equity: number }[],
  timeZone = 'Asia/Taipei'
) {
  if (curve.length === 0) return curve;
  const filled: { date: string; delta: number; equity: number }[] = [];
  let prevDate = new Date(`${curve[0].date}T00:00:00`);
  let equity = curve[0].equity - curve[0].delta;

  for (const point of curve) {
    const currentDate = new Date(`${point.date}T00:00:00`);
    while (prevDate < currentDate) {
      const key = toDateKey(prevDate, timeZone);
      filled.push({ date: key, delta: 0, equity });
      prevDate = addDays(prevDate, 1);
    }
    filled.push(point);
    equity = point.equity;
    prevDate = addDays(currentDate, 1);
  }

  return filled;
}

export type { PickLike };
