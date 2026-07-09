import { AdminShell } from '@/components/admin/admin-shell';
import { DeliveryZoneMap } from '@/components/admin/delivery-zone-map';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateDeliveryZone } from './actions';

export default async function AdminDeliveryZonesPage() {
  const admin = createAdminClient();
  const { data: zones } = await admin
    .from('delivery_zones')
    .select('id,name,status,priority,minimum_order_value,delivery_fee,eta_min_minutes,eta_max_minutes,polygon_geojson,notes')
    .order('priority', { ascending: true });

  return (
    <AdminShell>
      <p className="editorial-label text-accentRed">Google Maps</p>
      <h1 className="mt-3 font-serif text-5xl">Delivery Zones</h1>
      <p className="mt-4 max-w-3xl leading-7 text-charcoal">Imported polygon zones are shown on Google Maps. Fees, ETA and priority can be edited permanently from this page.</p>

      <div className="mt-8">
        <DeliveryZoneMap zones={(zones ?? []).map((zone) => ({ id: zone.id, name: zone.name, polygon_geojson: zone.polygon_geojson }))} />
      </div>

      <div className="mt-10 grid gap-5">
        {(zones ?? []).map((zone) => (
          <form key={zone.id} action={updateDeliveryZone} className="border border-line bg-ivory p-5">
            <input type="hidden" name="id" value={zone.id} />
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
              <input name="name" defaultValue={zone.name} className="min-w-72 flex-1 bg-transparent font-serif text-3xl outline-none" />
              <select name="status" defaultValue={zone.status} className="border border-line bg-cream px-4 py-3 text-sm">
                <option value="live">Live</option>
                <option value="draft">Draft</option>
                <option value="inactive">Inactive</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
            <div className="grid gap-4 md:grid-cols-5">
              <label className="grid gap-2 text-sm text-muted"><span>Priority</span><input name="priority" defaultValue={zone.priority ?? ''} className="border border-line bg-cream px-3 py-3 text-charcoal" /></label>
              <label className="grid gap-2 text-sm text-muted"><span>Min Order</span><input name="minimum_order_value" defaultValue={zone.minimum_order_value ?? ''} className="border border-line bg-cream px-3 py-3 text-charcoal" /></label>
              <label className="grid gap-2 text-sm text-muted"><span>Fee</span><input name="delivery_fee" defaultValue={zone.delivery_fee ?? ''} className="border border-line bg-cream px-3 py-3 text-charcoal" /></label>
              <label className="grid gap-2 text-sm text-muted"><span>ETA Min</span><input name="eta_min_minutes" defaultValue={zone.eta_min_minutes ?? ''} className="border border-line bg-cream px-3 py-3 text-charcoal" /></label>
              <label className="grid gap-2 text-sm text-muted"><span>ETA Max</span><input name="eta_max_minutes" defaultValue={zone.eta_max_minutes ?? ''} className="border border-line bg-cream px-3 py-3 text-charcoal" /></label>
            </div>
            <label className="mt-4 grid gap-2 text-sm text-muted"><span>Notes</span><input name="notes" defaultValue={zone.notes ?? ''} className="border border-line bg-cream px-3 py-3 text-charcoal" /></label>
            <button type="submit" className="mt-5 border border-forest bg-forest px-6 py-3 font-mono text-xs uppercase tracking-[0.24em] text-ivory">Save Zone</button>
          </form>
        ))}
      </div>
      {(zones ?? []).length === 0 ? <p className="mt-8 border border-line bg-ivory p-8 text-charcoal">No zones yet. Publish delivery_zones.csv from the import center first.</p> : null}
    </AdminShell>
  );
}
