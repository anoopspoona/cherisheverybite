import { AdminShell } from '@/components/admin/admin-shell';

export default function AdminProductionPage() {
  return (
    <AdminShell>
      <p className="editorial-label text-accentRed">Kitchen Ticket</p>
      <h1 className="mt-3 font-serif text-5xl">Production Manifest</h1>
      <p className="mt-4 max-w-3xl leading-7 text-charcoal">Tomorrow's portions, pre-orders, add-ons and zone-wise splits will be compiled here from Supabase records.</p>
    </AdminShell>
  );
}
