'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

const deleteOrder = ['plan_variants', 'plans', 'plan_day_menus', 'dishes', 'dish_categories', 'delivery_zones'];
const insertOrder = ['plans', 'plan_variants', 'plan_day_menus', 'dish_categories', 'dishes', 'delivery_zones'];

export async function restoreSnapshot(formData: FormData) {
  const snapshotId = String(formData.get('snapshot_id') ?? '');
  if (!snapshotId) return;

  const admin = createAdminClient();
  const { data: items, error } = await admin
    .from('menu_snapshot_items')
    .select('entity_type,entity_data')
    .eq('snapshot_id', snapshotId);

  if (error || !items) return;

  const tables = Array.from(new Set(items.map((item) => item.entity_type)));
  for (const table of deleteOrder.filter((tableName) => tables.includes(tableName))) {
    await admin.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }

  for (const table of insertOrder.filter((tableName) => tables.includes(tableName))) {
    const rows = items.filter((item) => item.entity_type === table).map((item) => item.entity_data);
    if (rows.length > 0) {
      await admin.from(table).insert(rows);
    }
  }

  await admin.from('admin_audit_logs').insert({
    action_type: 'MENU_RESTORED',
    entity_type: 'menu_snapshots',
    entity_id: snapshotId,
    new_value: { restored_tables: tables }
  });

  revalidatePath('/menu');
  revalidatePath('/admin/menu');
  revalidatePath('/admin/backups');
}
