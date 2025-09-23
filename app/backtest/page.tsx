import { BacktestClient } from '@/components/BacktestClient';
import { getLeagues } from '@/lib/reporting';

export default async function BacktestPage() {
  const leagues = await getLeagues();
  return <BacktestClient leagues={leagues} />;
}
