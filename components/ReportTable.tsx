'use client';

import { useMemo, useState } from 'react';
import { ReportRow } from '@/lib/reporting';
import clsx from 'clsx';
import { MarketSelection, MarketType, formatMarketTypeLabel } from '@/lib/enums';

interface ReportTableProps {
  rows: ReportRow[];
  mode: 'highWin' | 'positiveEv';
}

const columnHeaders = [
  { key: 'date', label: '日期' },
  { key: 'league', label: '聯盟' },
  { key: 'matchup', label: '對賽' },
  { key: 'marketType', label: '盤口' },
  { key: 'selection', label: '投注方向' },
  { key: 'oddsDecimal', label: '賠率' },
  { key: 'pModel', label: '模型勝率' },
  { key: 'pImplied', label: '隱含機率' },
  { key: 'ev', label: 'EV' },
  { key: 'kellyFraction', label: 'Kelly f*' },
  { key: 'result', label: '結果' }
] as const;

type SortKey = (typeof columnHeaders)[number]['key'];

type Direction = 'asc' | 'desc';

const formatMarketType = (type: MarketType) => formatMarketTypeLabel(type);

function formatSelection(selection: MarketSelection) {
  switch (selection) {
    case 'HOME':
      return '主隊';
    case 'AWAY':
      return '客隊';
    case 'OVER':
      return '大分';
    case 'UNDER':
      return '小分';
    default:
      return selection;
  }
}

function toPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function ReportTable({ rows, mode }: ReportTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [direction, setDirection] = useState<Direction>('desc');
  const [query, setQuery] = useState('');

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const base = normalizedQuery
      ? rows.filter((row) =>
          [row.matchup, row.league, row.modelTag].some((field) =>
            field.toLowerCase().includes(normalizedQuery)
          )
        )
      : rows;

    const sorted = [...base].sort((a, b) => {
      const valueA = a[sortKey];
      const valueB = b[sortKey];
      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return direction === 'asc' ? valueA - valueB : valueB - valueA;
      }
      return direction === 'asc'
        ? String(valueA).localeCompare(String(valueB))
        : String(valueB).localeCompare(String(valueA));
    });

    return sorted;
  }, [query, rows, sortKey, direction]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setDirection('desc');
    }
  };

  const handleExport = () => {
    const headers = [
      'date',
      'league',
      'matchup',
      'marketType',
      'selection',
      'oddsDecimal',
      'pModel',
      'pImplied',
      'ev',
      'kelly_25',
      'kelly_50',
      'kelly_100',
      'result'
    ];
    const lines = filteredRows.map((row) => {
      const tiers = ['25%', '50%', '100%'].map((key) => row.kellyTiers[key] ?? 0);
      return [
        row.date,
        row.league,
        row.matchup,
        row.marketType,
        row.selection,
        row.oddsDecimal,
        row.pModel,
        row.pImplied,
        row.ev,
        ...tiers,
        row.result
      ].join(',');
    });
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `report-${mode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="card">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">投注清單</h3>
          <p className="text-xs text-slate-500">共 {filteredRows.length} 筆資料</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜尋聯盟 / 對賽 / 模型標籤"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleExport}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            匯出 CSV
          </button>
        </div>
      </div>

      <div className="mt-6">
        <div className="table-responsive hidden md:block">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                {columnHeaders.map((column) => (
                  <th
                    key={column.key}
                    className="cursor-pointer whitespace-nowrap px-3 py-2 text-left"
                    onClick={() => handleSort(column.key)}
                  >
                    <span className="flex items-center gap-1">
                      {column.label}
                      {sortKey === column.key ? (direction === 'asc' ? '▲' : '▼') : null}
                    </span>
                  </th>
                ))}
                <th className="px-3 py-2 text-left">建議投注</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-700">{row.date}</td>
                  <td className="px-3 py-2">{row.league}</td>
                  <td className="px-3 py-2">{row.matchup}</td>
                  <td className="px-3 py-2">{formatMarketType(row.marketType)}</td>
                  <td className="px-3 py-2">{formatSelection(row.selection)}</td>
                  <td className="px-3 py-2">{row.oddsDecimal.toFixed(2)}</td>
                  <td className="px-3 py-2">{toPercent(row.pModel)}</td>
                  <td className="px-3 py-2">{toPercent(row.pImplied ?? 0)}</td>
                  <td className="px-3 py-2">{row.ev.toFixed(3)}</td>
                  <td className="px-3 py-2">{row.kellyFraction.toFixed(3)}</td>
                  <td
                    className={clsx('px-3 py-2 font-semibold', {
                      'text-emerald-600': row.result === 'WIN',
                      'text-rose-600': row.result === 'LOSE',
                      'text-slate-500': row.result !== 'WIN' && row.result !== 'LOSE'
                    })}
                  >
                    {row.result}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    <div>0.25f*: {row.kellyTiers['25%'] ?? 0}u</div>
                    <div>0.5f*: {row.kellyTiers['50%'] ?? 0}u</div>
                    <div>1.0f*: {row.kellyTiers['100%'] ?? 0}u</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden mt-4 space-y-3">
          {filteredRows.map((row) => (
            <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">{row.date}</p>
                <span
                  className={clsx('text-xs font-semibold', {
                    'text-emerald-600': row.result === 'WIN',
                    'text-rose-600': row.result === 'LOSE',
                    'text-slate-500': row.result !== 'WIN' && row.result !== 'LOSE'
                  })}
                >
                  {row.result}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{row.league} ｜ {formatMarketType(row.marketType)}</p>
              <p className="mt-2 text-sm font-medium text-slate-800">{row.matchup}</p>
              <p className="text-xs text-slate-500">{formatSelection(row.selection)}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div>賠率：{row.oddsDecimal.toFixed(2)}</div>
                <div>模型勝率：{toPercent(row.pModel)}</div>
                <div>隱含機率：{toPercent(row.pImplied ?? 0)}</div>
                <div>EV：{row.ev.toFixed(3)}</div>
                <div>Kelly f*：{row.kellyFraction.toFixed(3)}</div>
                <div>建議投注：{row.kellyTiers['50%'] ?? 0}u</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
