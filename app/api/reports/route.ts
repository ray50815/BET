import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { z } from 'zod';
import { getReportData, ReportMode } from '@/lib/reporting';
import { DatabaseNotConfiguredError } from '@/lib/prisma';
import { MarketType, parseMarketTypeInput } from '@/lib/enums';

const querySchema = z.object({
  mode: z.enum(['highWin', 'positiveEv']).default('positiveEv'),
  leagues: z.string().optional(),
  marketTypes: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  minSamples: z.string().optional(),
  minProbability: z.string().optional(),
  minEv: z.string().optional()
});

function parseMarketTypes(value?: string) {
  if (!value) return undefined;
  const normalized = value
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

  const types: MarketType[] = [];
  for (const item of normalized) {
    try {
      const parsed = parseMarketTypeInput(item);
      if (!types.includes(parsed)) {
        types.push(parsed);
      }
    } catch (error) {
      console.warn('忽略未知盤口類型', item, error);
    }
  }
  return types.length ? types : undefined;
}

export async function GET(request: NextRequest) {
  noStore();
  try {
    const query = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = querySchema.parse(query);

    const leagues = parsed.leagues
      ? parsed.leagues.split(',').map((item) => item.trim()).filter(Boolean)
      : undefined;
    const marketTypes = parseMarketTypes(parsed.marketTypes);
    const minSamples = parsed.minSamples ? Number(parsed.minSamples) : undefined;
    const minProbability = parsed.minProbability ? Number(parsed.minProbability) : undefined;
    const minEv = parsed.minEv ? Number(parsed.minEv) : undefined;

    const data = await getReportData(parsed.mode as ReportMode, {
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      leagues,
      marketTypes,
      minSamples,
      minProbability,
      minEv
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('報告 API 錯誤', error);
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json(
        { message: '資料庫尚未設定，請先設定 DATABASE_URL 環境變數' },
        { status: 503 }
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: '取得報告失敗' }, { status: 500 });
  }
}
