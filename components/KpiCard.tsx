interface KpiCardProps {
  title: string;
  value: string;
  subtext?: string;
}

export function KpiCard({ title, value, subtext }: KpiCardProps) {
  return (
    <div className="card space-y-2">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="text-3xl font-semibold text-slate-900">{value}</p>
      {subtext ? <p className="text-xs text-slate-500">{subtext}</p> : null}
    </div>
  );
}
