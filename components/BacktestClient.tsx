'use client';

import { useState } from 'react';
import { MARKET_TYPE, MarketType } from '@/lib/enums';
import { KpiCard } from '@/components/KpiCard';
import { PerformanceChart } from '@/components/PerformanceChart';

interface BacktestResult {
  picks: {
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
  }[];
  summary: {
    hitRate: number;
    hitRateInterval: { low: number; high: number };
    roi: number;
    units: number;
    maxDrawdown: number;
    sampleSize: number;
    totalStake: number;
    equityCurve: { date: string; delta: number; equity: number }[];
  };
  daily: { date: string; units: number; cumulative: number }[];
}

interface BacktestClientProps {
  leagues: string[];
}

type MarketTypeValue = keyof typeof MARKET_TYPE;

const MARKET_OPTIONS: { label: string; value: MarketTypeValue }[] = [
  { label: '獨贏 (ML)', value: 'ML' },
  { label: '讓分 (SPREAD)', value: 'SPREAD' },
  { label: '大小分 (TOTAL)', value: 'TOTAL' }
];

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatUnits(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}u`;
}

export function BacktestClient({ leagues }: BacktestClientProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minProbability, setMinProbability] = useState(0.6);
  const [minEv, setMinEv] = useState(0);
  const [stakeUnits, setStakeUnits] = useState(1);
  const [maxConcurrent, setMaxConcurrent] = useState(3);
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>([]);
  const [marketTypes, setMarketTypes] = useState<MarketTypeValue[]>(['ML']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const handleLeagueChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(event.target.selectedOptions).map((option) => option.value);
    setSelectedLeagues(values);
  };

  const handleMarketChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(event.target.selectedOptions).map(
      (option) => option.value as MarketTypeValue
    );
    setMarketTypes(values);
  };

  const runBacktest = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        leagues: selectedLeagues.length ? selectedLeagues : undefined,
        marketTypes: marketTypes.length ? marketTypes : undefined,
        minProbability,
        minEv,
        stakeUnits,
        maxConcurrent
      };
      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const json = (await response.json()) as BacktestResult;
      setResult(json);
    } catch (err) {
      setError((err as Error).message ?? '回測失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="card space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">策略回測</h1>
          <p className="text-sm text-slate-500">選擇篩選條件後，系統會依日期排序逐日模擬下注。</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            起始日期
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            結束日期
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            最低模型勝率
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={minProbability}
              onChange={(event) => setMinProbability(Number(event.target.value))}
              className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            最低期望值 (EV)
            <input
              type="number"
              step={0.01}
              value={minEv}
              onChange={(event) => setMinEv(Number(event.target.value))}
              className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            每注單位 (u)
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={stakeUnits}
              onChange={(event) => setStakeUnits(Number(event.target.value))}
              className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            每日最大下注數
            <input
              type="number"
              min={1}
              value={maxConcurrent}
              onChange={(event) => setMaxConcurrent(Number(event.target.value))}
              className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            聯盟（多選）
            <select
              multiple
              value={selectedLeagues}
              onChange={handleLeagueChange}
              className="h-32 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {leagues.map((league) => (
                <option key={league} value={league}>
                  {league}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            盤口（多選）
            <select
              multiple
              value={marketTypes}
              onChange={handleMarketChange}
              className="h-32 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {MARKET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {error ? <p className="text-sm text-rose-600">{error}</p> : <span />}
          <button
            type="button"
            onClick={runBacktest}
            disabled={loading}
            className="rounded-xl bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {loading ? '計算中…' : '開始回測'}
          </button>
        </div>
      </section>

      {result ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="命中率"
              value={formatPercent(result.summary.hitRate)}
              subtext={`Wilson 95%：${formatPercent(result.summary.hitRateInterval.low)} ~ ${formatPercent(result.summary.hitRateInterval.high)}`}
            />
            <KpiCard
              title="ROI"
              value={formatPercent(result.summary.roi)}
              subtext={`總投注：${result.summary.totalStake.toFixed(2)}u`}
            />
            <KpiCard
              title="累積 Units"
              value={formatUnits(result.summary.units)}
              subtext={`樣本數：${result.summary.sampleSize}`}
            />
            <KpiCard title="最大回撤" value={`-${result.summary.maxDrawdown.toFixed(2)}u`} subtext="以單位數計算" />
          </section>

          <PerformanceChart
            data={result.summary.equityCurve.map((item) => ({
              ...item,
              equity: Number(item.equity.toFixed(2)),
              delta: Number(item.delta.toFixed(2))
            }))}
          />

          <section className="card space-y-3">
            <h2 className="text-lg font-semibold text-slate-800">每日損益</h2>
            <div className="table-responsive">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left">日期</th>
                    <th className="px-3 py-2 text-left">當日損益 (u)</th>
                    <th className="px-3 py-2 text-left">累積 (u)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.daily.map((day) => (
                    <tr key={day.date}>
                      <td className="px-3 py-2">{day.date}</td>
                      <td className="px-3 py-2">{day.units.toFixed(2)}</td>
                      <td className="px-3 py-2">{day.cumulative.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card space-y-3">
            <h2 className="text-lg font-semibold text-slate-800">模擬下注紀錄</h2>
            <div className="table-responsive">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left">日期</th>
                    <th className="px-3 py-2 text-left">聯盟</th>
                    <th className="px-3 py-2 text-left">對賽</th>
                    <th className="px-3 py-2 text-left">盤口</th>
                    <th className="px-3 py-2 text-left">選項</th>
                    <th className="px-3 py-2 text-left">賠率</th>
                    <th className="px-3 py-2 text-left">模型勝率</th>
                    <th className="px-3 py-2 text-left">EV</th>
                    <th className="px-3 py-2 text-left">結果</th>
                    <th className="px-3 py-2 text-left">單日損益</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.picks.map((pick) => (
                    <tr key={`${pick.id}-${pick.date}`}>
                      <td className="px-3 py-2">{pick.date}</td>
                      <td className="px-3 py-2">{pick.league}</td>
                      <td className="px-3 py-2">{pick.matchup}</td>
                      <td className="px-3 py-2">{pick.marketType}</td>
                      <td className="px-3 py-2">{pick.selection}</td>
                      <td className="px-3 py-2">{pick.oddsDecimal.toFixed(2)}</td>
                      <td className="px-3 py-2">{formatPercent(pick.pModel)}</td>
                      <td className="px-3 py-2">{pick.ev.toFixed(3)}</td>
                      <td className="px-3 py-2">{pick.result}</td>
                      <td className="px-3 py-2">{pick.profit.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
