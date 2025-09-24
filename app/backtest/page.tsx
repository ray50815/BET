import { BacktestClient } from '@/components/BacktestClient';
import { DatabaseSetupNotice } from '@/components/DatabaseSetupNotice';
import { getLeagues } from '@/lib/reporting';
import { DatabaseNotConfiguredError } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function BacktestPage() {
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
