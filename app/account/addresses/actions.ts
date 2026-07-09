'use server';

import { revalidatePath } from 'next/cache';
import { createClient as serverClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateDistanceKm } from '@/lib/maps/distance';
import { isPointInPolygon } from '@/lib/maps/zones';

type Input = {
  fullAddress: string;
  latitude: number;
  longitude: number;
  googlePlaceId?: string;
};

export async function validateAndSaveAddress(input: Input) {
  const supabase = await serverClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user?.email) return { ok: false, message: 'Please sign in before saving an address.' };

  const admin = createAdminClient();
  await admin.from('profiles').upsert({ id: user.id, email: user.email.toLowerCase(), role: 'customer' }, { onConflict: 'id' });

  const { data: settings } = await admin.from('admin_settings').select('*').limit(1).maybeSingle();
  const kitchen = { lat: settings?.kitchen_latitude ?? 8.5241, lng: settings?.kitchen_longitude ?? 76.9366 };
  const point = { lat: input.latitude, lng: input.longitude };
  const distance = calculateDistanceKm(kitchen, point);

  const { data: zones } = await admin
    .from('delivery_zones')
    .select('id,name,zone_type,priority,delivery_fee,minimum_order_value,center_latitude,center_longitude,radius_km,polygon_geojson')
    .eq('status', 'live')
    .order('priority', { ascending: true });

  const matched = matchZone(point, zones ?? []);
  const withinRadius = distance <= Number(settings?.delivery_radius_km ?? 8);
  const isServiceable = Boolean(matched) || withinRadius;

  const { data: address, error } = await admin
    .from('addresses')
    .insert({
      user_id: user.id,
      label: 'Primary',
      full_address: input.fullAddress,
      latitude: input.latitude,
      longitude: input.longitude,
      google_place_id: input.googlePlaceId,
      distance_from_kitchen_km: distance,
      matched_delivery_zone_id: matched?.id ?? null,
      delivery_fee: matched?.delivery_fee ?? 0,
      is_serviceable: isServiceable
    })
    .select('id,is_serviceable,distance_from_kitchen_km,delivery_fee,matched_delivery_zone_id')
    .single();

  if (error) return { ok: false, message: error.message };
  revalidatePath('/account');
  revalidatePath('/checkout');
  return { ok: true, message: isServiceable ? 'Cherish delivers to this address.' : 'This address is outside the current delivery area.', address };
}

function matchZone(point: { lat: number; lng: number }, zones: any[]) {
  const matches = zones.filter((zone) => {
    if (zone.zone_type === 'polygon') {
      const path = zone.polygon_geojson?.coordinates?.[0]?.map(([lng, lat]: [number, number]) => ({ lat, lng })) ?? [];
      return path.length > 0 && isPointInPolygon(point, path);
    }
    if (zone.zone_type === 'radius' && zone.center_latitude && zone.center_longitude && zone.radius_km) {
      return calculateDistanceKm(point, { lat: zone.center_latitude, lng: zone.center_longitude }) <= Number(zone.radius_km);
    }
    return false;
  });
  return matches.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100) || Number(a.delivery_fee ?? 0) - Number(b.delivery_fee ?? 0))[0] ?? null;
}
