import { AdminShell } from '@/components/admin/admin-shell';
import { ImportCenter } from '@/components/admin/import-center';

export default function AdminImportPage() {
  return (
    <AdminShell>
      <ImportCenter />
    </AdminShell>
  );
}
