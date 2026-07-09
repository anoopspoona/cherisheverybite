'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

function field(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function numeric(formData: FormData, key: string, fallback: number | null = null) {
  const value = field(formData, key);
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function updateDeliveryZone(formData: FormData) {
  const id = field(formData, 'id');
  if (!id) return;

  const admin = createAdminClient();
  await admin
    .from('delivery_zones')
    .update({
      name: field(formData, 'name'),
      status: field(formData, 'status') ?? 'live',
      priority: numeric(formData, 'priority', 100),
      minimum_order_value: numeric(formData, 'minimum_order_value', 0),
      delivery_fee: numeric(formData, 'delivery_fee', 0),
      eta_min_minutes: numeric(formData, 'eta_min_minutes'),
      eta_max_minutes: numeric(formData, 'eta_max_minutes'),
      notes: field(formData, 'notes'),
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  await admin.from('admin_audit_logs').insert({
    action_type: 'DELIVERY_ZONE_UPDATED',
    entity_type: 'delivery_zones',
    entity_id: id
  });

  revalidatePath('/admin/delivery-zones');
}
