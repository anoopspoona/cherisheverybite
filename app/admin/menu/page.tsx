import { AdminShell } from '@/components/admin/admin-shell';
import { ServiceCalendar } from '@/components/calendar/service-calendar';

export default function AdminMenuPage() {
  return (
    <AdminShell>
      <p className="editorial-label text-accentRed">Menu Architect</p>
      <h1 className="mt-3 font-serif text-5xl">24-Day Menu Editor</h1>
      <p className="mt-4 max-w-3xl leading-7 text-charcoal">The same five-week grid is used for admin editing. Active Monday–Saturday cells become editable after menu CSV data is published to Supabase.</p>
      <div className="mt-8 -mx-6 md:-mx-10 lg:-mx-12">
        <ServiceCalendar anchorDate={new Date('2026-07-01')} />
      </div>
    </AdminShell>
  );
}
