'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

interface PerformanceChartProps {
  data: { date: string; equity: number; delta: number }[];
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  return (
    <div className="card h-80">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">累積單位數走勢</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={16} />
          <YAxis tick={{ fontSize: 12 }} width={60} />
          <Tooltip
            contentStyle={{ fontSize: '12px' }}
            formatter={(value: number, name) => {
              if (name === 'equity') return [`${value.toFixed(2)}u`, '累積單位'];
              return [`${value.toFixed(2)}u`, '當日損益'];
            }}
          />
          <Line type="monotone" dataKey="equity" stroke="#2563eb" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="delta" stroke="#94a3b8" strokeWidth={1} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
