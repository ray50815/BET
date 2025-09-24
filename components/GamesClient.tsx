'use client';

import { useState } from 'react';
import type { MarketType } from '@/lib/enums';

interface GameMarket {
  id: number;
  type: MarketType;
  selection: string;
  line: number | null;
  odds: number | null;
  bookmaker: string | null;
  pModel: number | null;
  modelTag: string | null;
  result: string | null;
}

interface GameItem {
  id: number;
  date: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  finalized: boolean;
  markets: GameMarket[];
}

interface GamesClientProps {
  initialGames: GameItem[];
  leagues: string[];
}

export function GamesClient({ initialGames, leagues }: GamesClientProps) {
  const [games, setGames] = useState<GameItem[]>(initialGames);
  const [league, setLeague] = useState('');
  const [marketType, setMarketType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (league) params.set('league', league);
      if (marketType) params.set('marketType', marketType);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const response = await fetch(`/api/games?${params.toString()}`);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const json = (await response.json()) as { games: GameItem[] };
      setGames(json.games);
    } catch (err) {
      setError((err as Error).message ?? '查詢失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="card space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">賽程 / 歷史結果</h1>
          <p className="text-sm text-slate-500">快速檢視近期賽事與模型評估結果。</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            聯盟
            <select
              value={league}
              onChange={(event) => setLeague(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="">全部</option>
              {leagues.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-600">
            盤口
            <select
              value={marketType}
              onChange={(event) => setMarketType(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="">全部</option>
              <option value="ML">獨贏</option>
              <option value="SPREAD">讓分</option>
              <option value="TOTAL">大小分</option>
            </select>
          </label>
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
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {error ? <p className="text-sm text-rose-600">{error}</p> : <span />}
          <button
            type="button"
            onClick={fetchGames}
            disabled={loading}
            className="rounded-xl bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {loading ? '載入中…' : '套用篩選'}
          </button>
        </div>
      </section>

      <section className="space-y-4">
        {games.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            無符合條件的賽事。
          </div>
        ) : null}
        {games.map((game) => (
          <div key={game.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase text-slate-500">{game.league}</p>
                <p className="text-lg font-semibold text-slate-800">
                  {game.awayTeam} @ {game.homeTeam}
                </p>
                <p className="text-xs text-slate-500">日期：{game.date}</p>
              </div>
              <span className="text-xs font-medium text-slate-500">
                {game.finalized ? '已結算' : '未結算'}
              </span>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {game.markets.map((market) => (
                <div key={market.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="text-xs uppercase text-slate-500">{market.type} ｜ {market.selection}</p>
                  {market.line !== null ? <p className="text-xs text-slate-500">盤口：{market.line}</p> : null}
                  <p>賠率：{market.odds ?? '-'} {market.bookmaker ? `@ ${market.bookmaker}` : ''}</p>
                  <p>模型勝率：{market.pModel !== null ? `${(market.pModel * 100).toFixed(1)}%` : '-'}</p>
                  <p>模型版本：{market.modelTag ?? '-'}</p>
                  <p className="font-semibold">
                    結果：{market.result ?? '未定'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
