import { AdminShell } from '@/components/admin/admin-shell';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadDishImage } from './actions';

export default async function AdminDishesPage() {
  const admin = createAdminClient();
  const { data: dishes } = await admin
    .from('dishes')
    .select('id,name,image_url,price,status,calories')
    .order('name', { ascending: true });

  return (
    <AdminShell>
      <p className="editorial-label text-accentRed">Dish Inventory</p>
      <h1 className="mt-3 font-serif text-5xl">Dishes & Images</h1>
      <p className="mt-4 max-w-3xl leading-7 text-charcoal">Upload dish images to Supabase Storage and save the public image URL on the dish record.</p>

      <div className="mt-10 grid gap-5">
        {(dishes ?? []).map((dish) => (
          <article key={dish.id} className="grid gap-5 border border-line bg-ivory p-5 lg:grid-cols-[9rem_1fr_20rem]">
            <div className="h-32 border border-line bg-cream">
              {dish.image_url ? <img src={dish.image_url} alt={dish.name} className="h-full w-full object-cover grayscale" /> : <div className="grid h-full place-items-center p-4 text-center text-xs text-muted">No image</div>}
            </div>
            <div>
              <p className="editorial-label text-muted">{dish.status}</p>
              <h2 className="mt-2 font-serif text-3xl">{dish.name}</h2>
              <p className="mt-3 text-sm text-charcoal">Price: ₹{dish.price ?? '—'} · Calories: {dish.calories ?? '—'}</p>
            </div>
            <form action={uploadDishImage} className="grid content-center gap-3">
              <input type="hidden" name="dish_id" value={dish.id} />
              <input type="hidden" name="dish_name" value={dish.name} />
              <input name="image" type="file" className="border border-line bg-cream p-3 text-sm" />
              <button type="submit" className="border border-forest bg-forest px-5 py-3 font-mono text-xs uppercase tracking-[0.22em] text-ivory">Upload Image</button>
            </form>
          </article>
        ))}
      </div>
      {(dishes ?? []).length === 0 ? <p className="mt-8 border border-line bg-ivory p-8 text-charcoal">No dishes yet. Publish catalog.csv from the import center first.</p> : null}
    </AdminShell>
  );
}
