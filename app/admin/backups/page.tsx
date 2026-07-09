import { AdminShell } from '@/components/admin/admin-shell';
import { createAdminClient } from '@/lib/supabase/admin';
import { restoreSnapshot } from './actions';

export default async function AdminBackupsPage() {
  const admin = createAdminClient();
  const { data: snapshots } = await admin
    .from('menu_snapshots')
    .select('id,name,snapshot_type,reason,created_at')
    .order('created_at', { ascending: false });

  return (
    <AdminShell>
      <p className="editorial-label text-accentRed">Restore</p>
      <h1 className="mt-3 font-serif text-5xl">Menu Backups</h1>
      <p className="mt-4 max-w-3xl leading-7 text-charcoal">Backups protect the active menu before large dataset changes. Restoring a snapshot replaces the matching dataset tables and revalidates the public menu.</p>

      <div className="mt-10 overflow-hidden border border-line bg-ivory">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-cream text-muted">
            <tr>
              <th className="border-b border-r border-line p-4">Backup</th>
              <th className="border-b border-r border-line p-4">Type</th>
              <th className="border-b border-r border-line p-4">Reason</th>
              <th className="border-b border-r border-line p-4">Created</th>
              <th className="border-b border-line p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {(snapshots ?? []).map((snapshot) => (
              <tr key={snapshot.id} className="border-b border-line align-top">
                <td className="border-r border-line p-4 font-serif text-2xl">{snapshot.name}</td>
                <td className="border-r border-line p-4 font-mono text-xs uppercase tracking-[0.2em]">{snapshot.snapshot_type}</td>
                <td className="border-r border-line p-4 text-charcoal">{snapshot.reason}</td>
                <td className="border-r border-line p-4 text-muted">{new Date(snapshot.created_at).toLocaleString('en-IN')}</td>
                <td className="p-4">
                  <form action={restoreSnapshot}>
                    <input type="hidden" name="snapshot_id" value={snapshot.id} />
                    <button type="submit" className="border border-forest bg-forest px-4 py-3 font-mono text-[0.65rem] uppercase tracking-[0.22em] text-ivory">
                      Restore
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(snapshots ?? []).length === 0 ? <p className="p-8 text-charcoal">No backups yet. A replace import will create the first backup automatically.</p> : null}
      </div>
    </AdminShell>
  );
}
