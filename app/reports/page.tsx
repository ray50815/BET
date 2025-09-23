import { ReportsClient } from '@/components/ReportsClient';
import { getLeagues, getReportData } from '@/lib/reporting';

export default async function ReportsPage() {
  const [initialData, leagues] = await Promise.all([
    getReportData('positiveEv', { minSamples: 30 }),
    getLeagues()
  ]);

  return <ReportsClient initialData={initialData} leagues={leagues} />;
}
