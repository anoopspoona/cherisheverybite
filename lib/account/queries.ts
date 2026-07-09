import { createClient } from '@/lib/supabase/server';

export async function getLatestAddress() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;

  const { data: address } = await supabase
    .from('addresses')
    .select('id,full_address,is_serviceable,distance_from_kitchen_km,delivery_fee,matched_delivery_zone_id,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return address;
}
