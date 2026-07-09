import { createAdminClient } from '@/lib/supabase/admin';

export async function getKitchenManifest(date: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from('production_manifests')
    .select('item_name,meal_slot,subscription_quantity,preorder_quantity,addon_quantity,total_quantity,status')
    .eq('production_date', date)
    .order('item_name', { ascending: true });

  return data ?? [];
}
