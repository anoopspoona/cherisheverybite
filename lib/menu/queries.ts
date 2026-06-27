import { createClient } from '@/lib/supabase/server';

export type PlanDayMenu = {
  id: string;
  plan_display_name: string;
  cycle_week: number;
  service_day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';
  cycle_service_day: number;
  meal_slot: string | null;
  component_1: string | null;
  component_2: string | null;
  component_3: string | null;
  component_4: string | null;
  component_5: string | null;
  calories: number | null;
  protein_g: number | null;
  carbohydrates_g: number | null;
  fats_g: number | null;
  fiber_g: number | null;
  status: string;
};

export async function getPlanDayMenus(planName?: string) {
  const supabase = await createClient();
  let query = supabase
    .from('plan_day_menus')
    .select('id,plan_display_name,cycle_week,service_day,cycle_service_day,meal_slot,component_1,component_2,component_3,component_4,component_5,calories,protein_g,carbohydrates_g,fats_g,fiber_g,status')
    .order('plan_display_name', { ascending: true })
    .order('cycle_service_day', { ascending: true });

  if (planName) {
    query = query.eq('plan_display_name', planName);
  }

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as PlanDayMenu[];
}

export async function getPlanNames() {
  const rows = await getPlanDayMenus();
  return Array.from(new Set(rows.map((row) => row.plan_display_name))).sort();
}

export function firstPlanName(rows: PlanDayMenu[]) {
  return rows[0]?.plan_display_name ?? null;
}

export function menuRowsForPlan(rows: PlanDayMenu[], planName: string | null) {
  if (!planName) return [];
  return rows.filter((row) => row.plan_display_name === planName);
}
