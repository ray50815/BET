'use client';

import { useMemo, useState } from 'react';
import { MarketType } from '@prisma/client';
import { KpiCard } from '@/components/KpiCard';
import { ReportResult } from '@/lib/reporting';
import { ReportTable } from '@/components/ReportTable';

interface ReportsClientProps {
  initialData: ReportResult;
  leagues: string[];
}

type MarketTypeValue = keyof typeof MarketType;
type Mode = 'highWin' | 'positiveEv';

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

export function ReportsClient({ initialData, leagues }: ReportsClientProps) {
  const [mode, setMode] = useState<Mode>(initialData.mode);
  const [data, setData] = useState<ReportResult>(initialData);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>([]);
  const [marketTypes, setMarketTypes] = useState<MarketTypeValue[]>([]);
  const [minSamples, setMinSamples] = useState(30);
  const [minProbability, setMinProbability] = useState(0.6);
  const [minEv, setMinEv] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summaryCards = useMemo(() => {
    const summary = data.summary;
    return [
      {
        title: '命中率',
        value: formatPercent(summary.hitRate),
        subtext: `Wilson 95%：${formatPercent(summary.hitRateInterval.low)} ~ ${formatPercent(summary.hitRateInterval.high)}`
      },
      {
        title: 'ROI',
        value: formatPercent(summary.roi),
        subtext: `總投注：${summary.totalStake.toFixed(2)}u`
      },
      {
        title: '累積 Units',
        value: formatUnits(summary.units),
        subtext: `樣本數：${summary.sampleSize}`
      },
      {
        title: '最大回撤',
        value: `-${summary.maxDrawdown.toFixed(2)}u`,
        subtext: data.summary.enoughSamples ? '以完整樣本計算' : '樣本數不足'
      }
    ];
  }, [data.summary]);

  const handleModeChange = (nextMode: Mode) => {
    setMode(nextMode);
  };

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('mode', mode);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (selectedLeagues.length) params.set('leagues', selectedLeagues.join(','));
      if (marketTypes.length) params.set('marketTypes', marketTypes.join(','));
      if (minSamples) params.set('minSamples', String(minSamples));
      if (mode === 'highWin') {
        params.set('minProbability', String(minProbability));
      }
      if (mode === 'positiveEv') {
        params.set('minEv', String(minEv));
      }
      const response = await fetch(`/api/reports?${params.toString()}`);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const json = (await response.json()) as ReportResult;
      setData(json);
    } catch (err) {
      console.error(err);
      setError((err as Error).message ?? '取得資料失敗');
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="space-y-6">
      <section className="card space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">高勝率 / 正期望值報告</h1>
          <p className="text-sm text-slate-500">依模型輸出與歷史結果即時篩選高品質投注樣本。</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleModeChange('highWin')}
            className={
              mode === 'highWin'
                ? 'rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white'
                : 'rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100'
            }
          >
            高勝率（p ≥ 0.60）
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('positiveEv')}
            className={
              mode === 'positiveEv'
                ? 'rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white'
                : 'rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100'
            }
          >
            正期望值（EV &gt; 0）
          </button>
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
            最低樣本數
            <input
              type="number"
              min={0}
              value={minSamples}
              onChange={(event) => setMinSamples(Number(event.target.value))}
              className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </label>
          {mode === 'highWin' ? (
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
          ) : (
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
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            聯盟（可多選）
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
            盤口（可多選）
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
            onClick={handleFetch}
            disabled={loading}
            className="rounded-xl bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {loading ? '載入中…' : '套用篩選條件'}
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} />
        ))}
      </section>

      {!data.summary.enoughSamples ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          樣本數不足（最低需求 {minSamples}），建議放寬日期區間或降低條件。
        </div>
      ) : null}

      <ReportTable rows={data.rows} mode={mode} />
    </div>
  );
}
