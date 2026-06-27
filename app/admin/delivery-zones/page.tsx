import { AdminShell } from '@/components/admin/admin-shell';

export default function AdminDeliveryZonesPage() {
  return (
    <AdminShell>
      <p className="editorial-label text-accentRed">Google Maps</p>
      <h1 className="mt-3 font-serif text-5xl">Delivery Zones</h1>
      <p className="mt-4 max-w-3xl leading-7 text-charcoal">Import polygon zones, edit service areas, fees, ETA and priority for checkout validation.</p>
    </AdminShell>
  );
}
