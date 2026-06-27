import { BrandHeader } from '@/components/site/brand-header';
import { ServiceCalendar } from '@/components/calendar/service-calendar';

export default function MenuPage() {
  return (
    <main className="min-h-screen bg-cream text-forest">
      <BrandHeader active="Weekly Menu" />
      <ServiceCalendar anchorDate={new Date('2026-07-01')} />
    </main>
  );
}
