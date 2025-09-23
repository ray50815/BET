import { KpiCard } from '@/components/KpiCard';
import { PerformanceChart } from '@/components/PerformanceChart';
import { ReportTable } from '@/components/ReportTable';
import { getDashboardOverview } from '@/lib/reporting';

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatUnits(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}u`;
}

export default async function HomePage() {
  const dashboard = await getDashboardOverview();
  const summary = dashboard.summary;
  const roiPercent = formatPercent(summary.roi);

  const kpis = [
    {
      title: '近 20 天命中率',
      value: formatPercent(dashboard.last20.hitRate),
      subtext: `樣本數：${dashboard.last20.sampleSize}`
    },
    {
      title: '近 60 天命中率',
      value: formatPercent(dashboard.last60.hitRate),
      subtext: `樣本數：${dashboard.last60.sampleSize}`
    },
    {
      title: '總 ROI',
      value: roiPercent,
      subtext: `總投注：${summary.totalStake.toFixed(2)}u`
    },
    {
      title: '總盈虧 (Units)',
      value: formatUnits(summary.units),
      subtext: `樣本數：${summary.sampleSize}`
    },
    {
      title: '最大回撤',
      value: `-${summary.maxDrawdown.toFixed(2)}u`,
      subtext: '依單位數計算'
    },
    {
      title: 'Wilson 95% 信賴區間',
      value: `${formatPercent(summary.hitRateInterval.low)} ~ ${formatPercent(summary.hitRateInterval.high)}`,
      subtext: '命中率不確定性'
    }
  ];

  const chartData = summary.equityCurve.map((point) => ({
    ...point,
    equity: Number(point.equity.toFixed(2)),
    delta: Number(point.delta.toFixed(2))
  }));

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold text-slate-900">體育賽事 AI 分析儀表板</h1>
        <p className="mt-1 text-sm text-slate-500">
          以模型勝率與期望值選出高品質投注，提供命中率、ROI、資金曲線與 Kelly 下注建議。
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3 lg:grid-cols-3">{kpis.map((kpi) => <KpiCard key={kpi.title} {...kpi} />)}</section>

      <PerformanceChart data={chartData} />

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">最新正期望值投注</h2>
          <p className="text-xs text-slate-500">預設顯示最近 15 筆符合條件的投注樣本。</p>
        </div>
        <ReportTable rows={dashboard.rows.slice(0, 15)} mode="positiveEv" />
      </section>
    </div>
  );
}
