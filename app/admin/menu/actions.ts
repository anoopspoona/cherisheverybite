'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function numberOrNull(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function updatePlanDayMenu(formData: FormData) {
  const id = text(formData, 'id');
  if (!id) return;

  const admin = createAdminClient();
  const { data: oldValue } = await admin.from('plan_day_menus').select('*').eq('id', id).single();

  const update = {
    component_1: text(formData, 'component_1'),
    component_2: text(formData, 'component_2'),
    component_3: text(formData, 'component_3'),
    component_4: text(formData, 'component_4'),
    component_5: text(formData, 'component_5'),
    calories: numberOrNull(formData, 'calories'),
    protein_g: numberOrNull(formData, 'protein_g'),
    carbohydrates_g: numberOrNull(formData, 'carbohydrates_g'),
    fats_g: numberOrNull(formData, 'fats_g'),
    fiber_g: numberOrNull(formData, 'fiber_g'),
    status: text(formData, 'status') ?? 'live',
    updated_at: new Date().toISOString()
  };

  await admin.from('plan_day_menus').update(update).eq('id', id);
  await admin.from('admin_audit_logs').insert({
    action_type: 'MENU_ROW_UPDATED',
    entity_type: 'plan_day_menus',
    entity_id: id,
    old_value: oldValue,
    new_value: update
  });

  revalidatePath('/menu');
  revalidatePath('/admin/menu');
}
