'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

function field(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function addAdminUser(formData: FormData) {
  const email = field(formData, 'email')?.toLowerCase();
  const role = field(formData, 'role') ?? 'admin';
  if (!email || !['admin', 'owner'].includes(role)) return;

  const admin = createAdminClient();
  await admin.from('admin_users').upsert({ email, role, is_active: true }, { onConflict: 'email' });
  await admin.from('admin_audit_logs').insert({ action_type: 'ADMIN_USER_ADDED', entity_type: 'admin_users', new_value: { email, role } });
  revalidatePath('/admin/admin-users');
}

export async function setAdminActive(formData: FormData) {
  const id = field(formData, 'id');
  const isActive = field(formData, 'is_active') === 'true';
  if (!id) return;

  const admin = createAdminClient();
  await admin.from('admin_users').update({ is_active: isActive, updated_at: new Date().toISOString() }).eq('id', id);
  await admin.from('admin_audit_logs').insert({ action_type: isActive ? 'ADMIN_USER_REACTIVATED' : 'ADMIN_USER_DEACTIVATED', entity_type: 'admin_users', entity_id: id });
  revalidatePath('/admin/admin-users');
}
