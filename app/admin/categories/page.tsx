import { AdminShell } from '@/components/admin/admin-shell';

export default function AdminCategoriesPage() {
  return (
    <AdminShell>
      <p className="editorial-label text-accentRed">Categories</p>
      <h1 className="mt-3 font-serif text-5xl">Dish Categories</h1>
      <p className="mt-4 max-w-3xl leading-7 text-charcoal">Add, reorder and manage category groups used by the menu and kitchen dashboard.</p>
    </AdminShell>
  );
}
