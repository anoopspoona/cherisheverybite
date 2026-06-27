import { AdminShell } from '@/components/admin/admin-shell';

export default function AdminBackupsPage() {
  return (
    <AdminShell>
      <p className="editorial-label text-accentRed">Restore</p>
      <h1 className="mt-3 font-serif text-5xl">Menu Backups</h1>
      <p className="mt-4 max-w-3xl leading-7 text-charcoal">Backups protect the active menu before large dataset changes.</p>
    </AdminShell>
  );
}
