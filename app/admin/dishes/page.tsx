import { AdminShell } from '@/components/admin/admin-shell';

export default function AdminDishesPage() {
  return (
    <AdminShell>
      <p className="editorial-label text-accentRed">Dish Inventory</p>
      <h1 className="mt-3 font-serif text-5xl">Dishes & Images</h1>
      <p className="mt-4 max-w-3xl leading-7 text-charcoal">Manage catalog rows, categories, image paths, prices and status after CSV import.</p>
    </AdminShell>
  );
}
