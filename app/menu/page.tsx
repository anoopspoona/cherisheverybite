import { BrandHeader } from '@/components/site/brand-header';
import { ServiceCalendar } from '@/components/calendar/service-calendar';
import { firstPlanName, getPlanDayMenus, menuRowsForPlan } from '@/lib/menu/queries';

export default async function MenuPage({ searchParams }: { searchParams?: Promise<{ plan?: string }> }) {
  const params = await searchParams;
  const allRows = await getPlanDayMenus();
  const selectedPlan = params?.plan ?? firstPlanName(allRows);
  const menuRows = menuRowsForPlan(allRows, selectedPlan);

  return (
    <main className="min-h-screen bg-cream text-forest">
      <BrandHeader active="Weekly Menu" />
      <ServiceCalendar anchorDate={new Date('2026-07-01')} menuRows={menuRows} planName={selectedPlan} />
    </main>
  );
}
