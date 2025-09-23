import fs from 'node:fs';
import path from 'node:path';
import { parseCsv } from '@/lib/csv';
import { importDataset } from '@/lib/upload';

async function main() {
  const dataDir = path.resolve(process.cwd(), 'data');
  const gamesCsv = fs.readFileSync(path.join(dataDir, 'games.csv'), 'utf-8');
  const oddsCsv = fs.readFileSync(path.join(dataDir, 'odds.csv'), 'utf-8');
  const modelCsv = fs.readFileSync(path.join(dataDir, 'model.csv'), 'utf-8');

  const games = parseCsv(gamesCsv).rows as any;
  const odds = parseCsv(oddsCsv).rows as any;
  const models = parseCsv(modelCsv).rows as any;

  const summary = await importDataset({ games, odds, models });
  console.log('匯入完成', summary);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
