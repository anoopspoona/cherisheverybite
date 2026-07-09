import { AdminShell } from '@/components/admin/admin-shell';
import { createAdminClient } from '@/lib/supabase/admin';
import { addAdminUser, setAdminActive } from './actions';

export default async function AdminUsersPage() {
  const admin = createAdminClient();
  const { data: users } = await admin.from('admin_users').select('id,email,role,is_active,created_at').order('created_at', { ascending: false });

  return (
    <AdminShell>
      <p className="editorial-label text-accentRed">Access</p>
      <h1 className="mt-3 font-serif text-5xl">Admin Users</h1>
      <p className="mt-4 max-w-3xl leading-7 text-charcoal">Owner users can add, deactivate and reactivate admin access without changing code.</p>

      <form action={addAdminUser} className="mt-10 grid gap-4 border border-line bg-ivory p-6 md:grid-cols-[1fr_12rem_auto]">
        <input name="email" type="email" required placeholder="admin@example.com" className="border border-line bg-cream px-4 py-3 text-charcoal outline-none focus:border-forest" />
        <select name="role" defaultValue="admin" className="border border-line bg-cream px-4 py-3 text-charcoal outline-none focus:border-forest">
          <option value="admin">Admin</option>
          <option value="owner">Owner</option>
        </select>
        <button type="submit" className="border border-forest bg-forest px-6 py-3 font-mono text-xs uppercase tracking-[0.22em] text-ivory">Add Admin</button>
      </form>

      <div className="mt-8 overflow-hidden border border-line bg-ivory">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="bg-cream text-muted">
            <tr>
              <th className="border-b border-r border-line p-4">Email</th>
              <th className="border-b border-r border-line p-4">Role</th>
              <th className="border-b border-r border-line p-4">Status</th>
              <th className="border-b border-line p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((user) => (
              <tr key={user.id} className="border-b border-line">
                <td className="border-r border-line p-4">{user.email}</td>
                <td className="border-r border-line p-4 font-mono text-xs uppercase tracking-[0.22em]">{user.role}</td>
                <td className="border-r border-line p-4">{user.is_active ? 'Active' : 'Inactive'}</td>
                <td className="p-4">
                  <form action={setAdminActive}>
                    <input type="hidden" name="id" value={user.id} />
                    <input type="hidden" name="is_active" value={user.is_active ? 'false' : 'true'} />
                    <button type="submit" className="border border-line px-4 py-3 font-mono text-[0.65rem] uppercase tracking-[0.22em]">
                      {user.is_active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
