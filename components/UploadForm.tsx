'use client';

import { useState } from 'react';

interface UploadResponse {
  message: string;
  summary: {
    gamesInserted: number;
    oddsInserted: number;
    modelsInserted: number;
  };
}

export function UploadForm() {
  const [gamesFile, setGamesFile] = useState<File | null>(null);
  const [oddsFile, setOddsFile] = useState<File | null>(null);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!gamesFile || !oddsFile || !modelFile) {
      setError('請選擇三個必填檔案：games.csv、odds.csv、model.csv');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('games', gamesFile);
      formData.append('odds', oddsFile);
      formData.append('model', modelFile);
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const json = (await response.json()) as UploadResponse;
      setResult(json);
    } catch (err) {
      setError((err as Error).message ?? '上傳失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">資料上傳 / 更新</h1>
        <p className="text-sm text-slate-500">
          支援批次匯入模型輸出與歷史賽事資料，請依 README 指定格式上傳。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          games.csv
          <input
            type="file"
            accept=".csv"
            onChange={(event) => setGamesFile(event.target.files?.[0] ?? null)}
            className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
          {gamesFile ? <span className="text-xs text-slate-500">{gamesFile.name}</span> : null}
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          odds.csv
          <input
            type="file"
            accept=".csv"
            onChange={(event) => setOddsFile(event.target.files?.[0] ?? null)}
            className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
          {oddsFile ? <span className="text-xs text-slate-500">{oddsFile.name}</span> : null}
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          model.csv
          <input
            type="file"
            accept=".csv"
            onChange={(event) => setModelFile(event.target.files?.[0] ?? null)}
            className="rounded-xl border border-slate-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
          {modelFile ? <span className="text-xs text-slate-500">{modelFile.name}</span> : null}
        </label>
      </div>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600">{error}</div> : null}
      {result ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <p className="font-semibold">{result.message}</p>
          <p>Games：{result.summary.gamesInserted} 筆</p>
          <p>Odds：{result.summary.oddsInserted} 筆</p>
          <p>Model：{result.summary.modelsInserted} 筆</p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
      >
        {loading ? '上傳中…' : '送出'}
      </button>
    </form>
  );
}
