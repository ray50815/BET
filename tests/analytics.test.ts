import { describe, expect, it } from 'vitest';
import {
  calculateEv,
  calculateImpliedProbability,
  calculateKellyFraction,
  calculatePerformanceMetrics,
  calculateWilsonInterval,
  fillMissingDates,
  getKellyStakeTiers,
  removeVig
} from '@/lib/analytics';

const makeDate = (date: string) => new Date(`${date}T12:00:00+08:00`);

describe('analytics helpers', () => {
  it('calculates implied probability', () => {
    const implied = calculateImpliedProbability(1.8);
    expect(implied).toBeCloseTo(0.5555, 3);
  });

  it('removes vig from odds', () => {
    const normalized = removeVig([1.8, 2.0]);
    const sum = normalized.reduce((acc, val) => acc + val, 0);
    expect(sum).toBeCloseTo(1, 5);
    expect(normalized[0]).toBeGreaterThan(0.5);
  });

  it('calculates expectation value', () => {
    const ev = calculateEv(0.6, 1.9);
    expect(ev).toBeCloseTo(0.14, 2);
  });

  it('calculates Kelly fraction', () => {
    const fraction = calculateKellyFraction(0.62, 1.8);
    expect(fraction).toBeGreaterThan(0);
    expect(fraction).toBeLessThan(1);
  });

  it('generates Kelly tiers', () => {
    const tiers = getKellyStakeTiers(1, 0.2);
    expect(tiers['25%']).toBeCloseTo(0.05, 2);
    expect(tiers['50%']).toBeCloseTo(0.1, 2);
    expect(tiers['100%']).toBeCloseTo(0.2, 2);
  });

  it('computes Wilson interval', () => {
    const interval = calculateWilsonInterval(60, 100);
    expect(interval.low).toBeLessThan(interval.high);
    expect(interval.low).toBeGreaterThan(0.5);
  });

  it('calculates performance metrics with drawdown', () => {
    const picks = [
      { stakeUnits: 1, oddsDecimal: 1.9, outcome: 'WIN' as const, date: makeDate('2024-04-01') },
      { stakeUnits: 1, oddsDecimal: 1.9, outcome: 'LOSE' as const, date: makeDate('2024-04-02') },
      { stakeUnits: 1, oddsDecimal: 2.1, outcome: 'WIN' as const, date: makeDate('2024-04-03') }
    ];
    const metrics = calculatePerformanceMetrics(picks);
    expect(metrics.hitRate).toBeCloseTo(2 / 3, 3);
    expect(metrics.units).toBeGreaterThan(0);
    expect(metrics.maxDrawdown).toBeGreaterThanOrEqual(1);
    expect(metrics.equityCurve).toHaveLength(3);
  });

  it('fills missing dates with carry over equity', () => {
    const curve = [
      { date: '2024-04-01', delta: 1, equity: 1 },
      { date: '2024-04-03', delta: -0.5, equity: 0.5 }
    ];
    const filled = fillMissingDates(curve);
    expect(filled).toHaveLength(3);
    expect(filled[1].date).toBe('2024-04-02');
    expect(filled[1].equity).toBeCloseTo(1, 2);
  });
});
