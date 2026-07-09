import { AdminShell } from '@/components/admin/admin-shell';

const cards = [
  ['Menu Import', 'Validate plans, 24-day menu cycle, catalog and delivery-zone CSV files.'],
  ['Menu Calendar', 'Five-week display grid with 24 active Monday–Saturday service days.'],
  ['Kitchen Source', 'Production manifests, order counts and delivery zones will use Supabase as source of truth.'],
  ['Admin Security', 'Owner access seeded for anoop.anoops@gmail.com and sindhug84@gmail.com.']
];

export default function AdminPage() {
  return (
    <AdminShell>
      <p className="editorial-label text-accentRed">Operations</p>
      <h1 className="mt-3 font-serif text-6xl">Admin Control Center</h1>
      <p className="mt-5 max-w-3xl leading-7 text-charcoal">
        This dashboard is the operational backbone for Cherish menu uploads, permanent edits, delivery zones and kitchen production.
      </p>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {cards.map(([title, body]) => (
          <article key={title} className="border border-line bg-ivory p-7">
            <h2 className="font-serif text-3xl">{title}</h2>
            <p className="mt-4 leading-7 text-charcoal">{body}</p>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
