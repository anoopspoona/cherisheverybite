import Link from 'next/link';

const adminLinks = [
  ['Overview', '/admin'],
  ['Import Center', '/admin/import'],
  ['Menu Editor', '/admin/menu'],
  ['Dishes', '/admin/dishes'],
  ['Categories', '/admin/categories'],
  ['Delivery Zones', '/admin/delivery-zones'],
  ['Production', '/admin/production'],
  ['Backups', '/admin/backups'],
  ['Admin Users', '/admin/admin-users']
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-cream text-forest">
      <div className="grid min-h-screen lg:grid-cols-[18rem_1fr]">
        <aside className="border-r border-line bg-ivory p-6">
          <Link href="/" className="font-serif text-4xl italic">Cherish</Link>
          <p className="mt-3 font-mono text-[0.65rem] uppercase tracking-[0.26em] text-muted">Admin Control Center</p>
          <nav className="mt-10 grid gap-2">
            {adminLinks.map(([label, href]) => (
              <Link key={href} href={href} className="border border-transparent px-4 py-3 text-sm text-charcoal transition hover:border-line hover:bg-cream">
                {label}
              </Link>
            ))}
          </nav>
        </aside>
        <section className="p-6 md:p-10 lg:p-12">{children}</section>
      </div>
    </main>
  );
}
