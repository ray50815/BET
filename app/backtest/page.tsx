import { unstable_noStore as noStore } from 'next/cache';
import { BacktestClient } from '@/components/BacktestClient';
import { DatabaseSetupNotice } from '@/components/DatabaseSetupNotice';
import { getLeagues } from '@/lib/reporting';
import { DatabaseNotConfiguredError } from '@/lib/prisma';

export default async function BacktestPage() {
  noStore();
  try {
    const leagues = await getLeagues();
    return <BacktestClient leagues={leagues} />;
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return <DatabaseSetupNotice title="回測功能暫時不可用" />;
    }
    throw error;
  }
}
