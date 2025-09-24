import { BacktestClient } from '@/components/BacktestClient';
import { getLeagues } from '@/lib/reporting';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function BacktestPage() {
  const leagues = await getLeagues();
  return <BacktestClient leagues={leagues} />;
}
