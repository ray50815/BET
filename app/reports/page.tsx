import { unstable_noStore as noStore } from 'next/cache';
import { ReportsClient } from '@/components/ReportsClient';
import { DatabaseSetupNotice } from '@/components/DatabaseSetupNotice';
import { getLeagues, getReportData } from '@/lib/reporting';
import { DatabaseNotConfiguredError } from '@/lib/prisma';

export default async function ReportsPage() {
  noStore();
  try {
    const [initialData, leagues] = await Promise.all([
      getReportData('positiveEv', { minSamples: 30 }),
      getLeagues()
    ]);

    return <ReportsClient initialData={initialData} leagues={leagues} />;
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return <DatabaseSetupNotice title="報表資料尚未準備好" />;
    }
    throw error;
  }
}
