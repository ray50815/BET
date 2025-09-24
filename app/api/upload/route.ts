import { unstable_noStore as noStore } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parseCsv } from '@/lib/csv';
import { GameRow, importDataset, ModelRow, OddsRow } from '@/lib/upload';
import { DatabaseNotConfiguredError } from '@/lib/prisma';

const gameSchema = z.object({
  date: z.string().min(1),
  league: z.string().min(1),
  home: z.string().min(1),
  away: z.string().min(1),
  finalized: z.string().optional().default('false'),
  result_side: z.string().optional(),
  closing_total: z.string().optional()
});

const oddsSchema = z.object({
  date: z.string().min(1),
  league: z.string().min(1),
  home: z.string().min(1),
  away: z.string().min(1),
  market: z.string().min(1),
  selection: z.string().min(1),
  odds_decimal: z.string().min(1),
  bookmaker: z.string().min(1)
});

const modelSchema = z.object({
  date: z.string().min(1),
  league: z.string().min(1),
  home: z.string().min(1),
  away: z.string().min(1),
  market: z.string().min(1),
  selection: z.string().min(1),
  p_model: z.string().min(1),
  model_tag: z.string().min(1)
});

function toBoolean(value: string) {
  const normalized = value.toLowerCase();
  return ['1', 'true', 'yes', 'y'].includes(normalized);
}

export async function POST(request: NextRequest) {
  noStore();
  try {
    const formData = await request.formData();
    const gamesFile = formData.get('games');
    const oddsFile = formData.get('odds');
    const modelFile = formData.get('model');

    if (!(gamesFile instanceof File) || !(oddsFile instanceof File) || !(modelFile instanceof File)) {
      return NextResponse.json({ message: '缺少必要的 CSV 檔案（games/odds/model）' }, { status: 400 });
    }

    const gamesCsv = parseCsv(await gamesFile.text());
    const oddsCsv = parseCsv(await oddsFile.text());
    const modelCsv = parseCsv(await modelFile.text());

    const games: GameRow[] = gamesCsv.rows.map((row) => {
      const parsed = gameSchema.parse(row);
      return {
        date: parsed.date,
        league: parsed.league,
        home: parsed.home,
        away: parsed.away,
        finalized: toBoolean(parsed.finalized),
        result_side: parsed.result_side,
        closing_total: parsed.closing_total
      };
    });

    const odds: OddsRow[] = oddsCsv.rows.map((row) => {
      const parsed = oddsSchema.parse(row);
      if (Number.isNaN(Number(parsed.odds_decimal))) {
        throw new Error(`賠率欄位格式錯誤: ${parsed.odds_decimal}`);
      }
      return parsed;
    });

    const models: ModelRow[] = modelCsv.rows.map((row) => {
      const parsed = modelSchema.parse(row);
      if (Number.isNaN(Number(parsed.p_model))) {
        throw new Error(`模型勝率格式錯誤: ${parsed.p_model}`);
      }
      return parsed;
    });

    const summary = await importDataset({ games, odds, models });

    return NextResponse.json({
      message: '資料匯入成功',
      summary
    });
  } catch (error) {
    console.error('資料匯入錯誤', error);
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json(
        { message: '資料庫尚未設定，請先設定 DATABASE_URL 環境變數' },
        { status: 503 }
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: (error as Error).message ?? '資料匯入失敗' }, { status: 500 });
  }
}
