'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export async function uploadDishImage(formData: FormData) {
  const dishId = String(formData.get('dish_id') ?? '');
  const dishName = String(formData.get('dish_name') ?? 'dish');
  const file = formData.get('image');

  if (!dishId || !(file instanceof File) || file.size === 0) return;

  const admin = createAdminClient();
  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'webp';
  const storagePath = `${slugify(dishName)}/${Date.now()}.${extension}`;

  const { error: uploadError } = await admin.storage
    .from('dish-images')
    .upload(storagePath, file, { upsert: true, contentType: file.type || 'image/webp' });

  if (uploadError) return;

  const { data } = admin.storage.from('dish-images').getPublicUrl(storagePath);
  const { data: oldValue } = await admin.from('dishes').select('*').eq('id', dishId).single();

  await admin
    .from('dishes')
    .update({
      image_url: data.publicUrl,
      image_storage_path: storagePath,
      image_alt_text: dishName,
      updated_at: new Date().toISOString()
    })
    .eq('id', dishId);

  await admin.from('admin_audit_logs').insert({
    action_type: 'DISH_IMAGE_CHANGED',
    entity_type: 'dishes',
    entity_id: dishId,
    old_value: oldValue,
    new_value: { image_url: data.publicUrl, image_storage_path: storagePath }
  });

  revalidatePath('/admin/dishes');
  revalidatePath('/menu');
}
