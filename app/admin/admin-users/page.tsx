import { AdminShell } from '@/components/admin/admin-shell';

export default function AdminUsersPage() {
  return (
    <AdminShell>
      <p className="editorial-label text-accentRed">Access</p>
      <h1 className="mt-3 font-serif text-5xl">Admin Users</h1>
      <p className="mt-4 max-w-3xl leading-7 text-charcoal">Owner users can manage future admin access from this section.</p>
    </AdminShell>
  );
}
