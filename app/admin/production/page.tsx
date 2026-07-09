import { AdminShell } from '@/components/admin/admin-shell';
import { getKitchenManifest } from '@/lib/kitchen/manifest';

function tomorrowIso() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

export default async function AdminProductionPage() {
  const date = tomorrowIso();
  const rows = await getKitchenManifest(date);

  return (
    <AdminShell>
      <p className="editorial-label text-accentRed">Kitchen Ticket</p>
      <h1 className="mt-3 font-serif text-5xl">Production Manifest</h1>
      <p className="mt-4 max-w-3xl leading-7 text-charcoal">Tomorrow&apos;s portions, pre-orders, add-ons and zone-wise splits are compiled here from Supabase records.</p>

      <div className="mt-8 border border-line bg-ivory p-6">
        <p className="editorial-label text-muted">Manifest Date</p>
        <h2 className="mt-2 font-serif text-4xl">{date}</h2>
      </div>

      <div className="mt-8 overflow-hidden border border-line bg-ivory">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <thead className="bg-cream text-muted">
            <tr>
              <th className="border-b border-r border-line p-4">Item</th>
              <th className="border-b border-r border-line p-4">Meal</th>
              <th className="border-b border-r border-line p-4">Subscription</th>
              <th className="border-b border-r border-line p-4">Preorder</th>
              <th className="border-b border-r border-line p-4">Add-on</th>
              <th className="border-b border-r border-line p-4">Total</th>
              <th className="border-b border-line p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any) => (
              <tr key={`${row.item_name}-${row.meal_slot}`} className="border-b border-line">
                <td className="border-r border-line p-4 font-serif text-2xl">{row.item_name}</td>
                <td className="border-r border-line p-4">{row.meal_slot ?? '—'}</td>
                <td className="border-r border-line p-4">{row.subscription_quantity}</td>
                <td className="border-r border-line p-4">{row.preorder_quantity}</td>
                <td className="border-r border-line p-4">{row.addon_quantity}</td>
                <td className="border-r border-line p-4 font-semibold">{row.total_quantity}</td>
                <td className="p-4">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="p-8 text-charcoal">No manifest rows yet. Subscription and preorder ledger generation will populate this table.</p> : null}
      </div>
    </AdminShell>
  );
}
