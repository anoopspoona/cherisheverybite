import { AdminShell } from '@/components/admin/admin-shell';
import { ServiceCalendar } from '@/components/calendar/service-calendar';
import { MenuEditor } from '@/components/admin/menu-editor';
import { firstPlanName, getPlanDayMenus, menuRowsForPlan } from '@/lib/menu/queries';

export default async function AdminMenuPage({ searchParams }: { searchParams?: Promise<{ plan?: string }> }) {
  const params = await searchParams;
  const allRows = await getPlanDayMenus();
  const selectedPlan = params?.plan ?? firstPlanName(allRows);
  const rows = menuRowsForPlan(allRows, selectedPlan);

  return (
    <AdminShell>
      <p className="editorial-label text-accentRed">Menu Architect</p>
      <h1 className="mt-3 font-serif text-5xl">24-Day Menu Editor</h1>
      <p className="mt-4 max-w-3xl leading-7 text-charcoal">Edit individual menu fields from the website. Every save writes permanently to Supabase and records an audit log.</p>
      <div className="mt-8 -mx-6 md:-mx-10 lg:-mx-12">
        <ServiceCalendar anchorDate={new Date('2026-07-01')} menuRows={rows} planName={selectedPlan} />
      </div>
      <MenuEditor rows={rows} />
    </AdminShell>
  );
}
