'use server';

import { revalidatePath } from 'next/cache';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { csvContracts, validateHeaders, type DatasetType } from '@/lib/imports/csv-contracts';
import { normalizeRows, type CsvRow, type NormalizedRow } from '@/lib/imports/normalizers';

type ImportMode = 'append' | 'update' | 'replace';

type PublishInput = {
  datasetType: DatasetType;
  importMode: ImportMode;
  fileName: string;
  headers: string[];
  rows: CsvRow[];
};

type PublishResult = {
  ok: boolean;
  message: string;
  importJobId?: string;
  summary?: {
    totalRows: number;
    validRows: number;
    warningRows: number;
    errorRows: number;
  };
};

export async function publishCsvImport(input: PublishInput): Promise<PublishResult> {
  const contract = csvContracts.find((item) => item.type === input.datasetType);
  if (!contract) return { ok: false, message: 'Unknown dataset type.' };

  const headerCheck = validateHeaders(input.headers, contract);
  if (!headerCheck.isValid) {
    return { ok: false, message: `Missing headers: ${headerCheck.missing.join(', ')}` };
  }

  const supabase = await createServerSupabase();
  const { data: authResult } = await supabase.auth.getUser();
  const user = authResult.user;
  if (!user?.email) return { ok: false, message: 'Please sign in before publishing imports.' };

  const admin = createAdminClient();
  const { data: adminUser } = await admin
    .from('admin_users')
    .select('role,is_active')
    .ilike('email', user.email)
    .eq('is_active', true)
    .maybeSingle();

  if (!adminUser) return { ok: false, message: 'You do not have admin permission to publish imports.' };

  const normalizedRows = normalizeRows(input.datasetType, input.rows);
  const errorRows = normalizedRows.filter((row) => row.status === 'error').length;
  const warningRows = normalizedRows.filter((row) => row.status === 'warning').length;
  const validRows = normalizedRows.length - errorRows;

  const { data: job, error: jobError } = await admin
    .from('csv_import_jobs')
    .insert({
      uploaded_by: user.id,
      dataset_type: input.datasetType,
      file_name: input.fileName,
      import_mode: input.importMode,
      status: errorRows > 0 ? 'failed' : 'validated',
      total_rows: normalizedRows.length,
      valid_rows: normalizedRows.filter((row) => row.status === 'valid').length,
      warning_rows: warningRows,
      error_rows: errorRows
    })
    .select('id')
    .single();

  if (jobError || !job) return { ok: false, message: jobError?.message ?? 'Could not create import job.' };

  const importRows = normalizedRows.map((row, index) => ({
    import_job_id: job.id,
    row_number: index + 1,
    raw_data: row.raw,
    normalized_data: row.normalized,
    validation_status: row.status,
    validation_message: row.message
  }));

  if (importRows.length > 0) {
    const { error: rowsError } = await admin.from('csv_import_rows').insert(importRows);
    if (rowsError) return { ok: false, message: rowsError.message, importJobId: job.id };
  }

  if (errorRows > 0) {
    return {
      ok: false,
      message: 'Import blocked. Fix error rows and upload again.',
      importJobId: job.id,
      summary: { totalRows: normalizedRows.length, validRows, warningRows, errorRows }
    };
  }

  if (input.importMode === 'replace') {
    await createDatasetSnapshot(admin, input.datasetType, user.id, `Before replacing ${input.datasetType}`);
  }

  const publishResult = await publishNormalizedRows(admin, input.datasetType, input.importMode, normalizedRows);
  if (!publishResult.ok) {
    await admin.from('csv_import_jobs').update({ status: 'failed' }).eq('id', job.id);
    return { ok: false, message: publishResult.message, importJobId: job.id };
  }

  await admin.from('csv_import_jobs').update({ status: 'published', published_at: new Date().toISOString() }).eq('id', job.id);
  await admin.from('admin_audit_logs').insert({
    admin_user_id: user.id,
    action_type: 'CSV_UPLOADED',
    entity_type: input.datasetType,
    entity_id: job.id,
    new_value: {
      fileName: input.fileName,
      importMode: input.importMode,
      totalRows: normalizedRows.length,
      warningRows
    }
  });

  revalidatePath('/menu');
  revalidatePath('/admin/import');
  revalidatePath('/admin/menu');

  return {
    ok: true,
    message: 'CSV published successfully.',
    importJobId: job.id,
    summary: { totalRows: normalizedRows.length, validRows, warningRows, errorRows }
  };
}

async function createDatasetSnapshot(admin: ReturnType<typeof createAdminClient>, datasetType: DatasetType, userId: string, reason: string) {
  const { data: snapshot } = await admin
    .from('menu_snapshots')
    .insert({ name: `Backup - ${datasetType} - ${new Date().toISOString()}`, snapshot_type: 'backup', created_by: userId, reason })
    .select('id')
    .single();

  if (!snapshot) return;

  const tableNames = tablesForDataset(datasetType);
  for (const table of tableNames) {
    const { data } = await admin.from(table).select('*');
    if (data && data.length > 0) {
      await admin.from('menu_snapshot_items').insert(
        data.map((row) => ({ snapshot_id: snapshot.id, entity_type: table, entity_data: row }))
      );
    }
  }
}

function tablesForDataset(datasetType: DatasetType) {
  if (datasetType === 'plans') return ['plans', 'plan_variants'];
  if (datasetType === 'menu_cycle') return ['plan_day_menus'];
  if (datasetType === 'catalog') return ['dishes', 'dish_categories'];
  if (datasetType === 'delivery_zones') return ['delivery_zones'];
  return [];
}

async function publishNormalizedRows(
  admin: ReturnType<typeof createAdminClient>,
  datasetType: DatasetType,
  importMode: ImportMode,
  rows: NormalizedRow[]
) {
  const validRows = rows.filter((row) => row.normalized).map((row) => row.normalized!);

  if (datasetType === 'plans') return publishPlans(admin, importMode, validRows);
  if (datasetType === 'menu_cycle') return publishMenuCycle(admin, importMode, validRows);
  if (datasetType === 'catalog') return publishCatalog(admin, importMode, validRows);
  if (datasetType === 'delivery_zones') return publishDeliveryZones(admin, importMode, validRows);

  return { ok: false, message: 'Unsupported dataset type.' };
}

async function publishPlans(admin: ReturnType<typeof createAdminClient>, importMode: ImportMode, rows: Record<string, unknown>[]) {
  if (importMode === 'replace') {
    await admin.from('plan_variants').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await admin.from('plans').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }

  const planRows = uniqueBy(
    rows.map((row) => ({
      plan_key: row.plan_key,
      name: row.name,
      duration_days: row.duration_days,
      meals_per_day_label: row.meals_per_day_label,
      status: row.status,
      description: row.description
    })),
    (row) => `${row.plan_key}-${row.name}`
  );

  const { data: plans, error: plansError } = await admin.from('plans').upsert(planRows, { onConflict: 'plan_key,name' }).select('id,plan_key,name');
  if (plansError) return { ok: false, message: plansError.message };

  const planMap = new Map((plans ?? []).map((plan) => [`${plan.plan_key}-${plan.name}`, plan.id]));
  const variantRows = rows.map((row) => ({
    plan_id: planMap.get(`${row.plan_key}-${row.name}`),
    variant_key: row.variant_key,
    variant_name: row.variant_name,
    monthly_price: row.monthly_price,
    weekly_price: row.weekly_price,
    status: row.status
  })).filter((row) => row.plan_id);

  const { error: variantsError } = await admin.from('plan_variants').upsert(variantRows, { onConflict: 'plan_id,variant_key' });
  if (variantsError) return { ok: false, message: variantsError.message };

  return { ok: true, message: 'Plans published.' };
}

async function publishMenuCycle(admin: ReturnType<typeof createAdminClient>, importMode: ImportMode, rows: Record<string, unknown>[]) {
  if (importMode === 'replace') {
    await admin.from('plan_day_menus').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }

  const { error } = await admin.from('plan_day_menus').upsert(rows, { onConflict: 'plan_display_name,cycle_week,service_day' });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Menu cycle published.' };
}

async function publishCatalog(admin: ReturnType<typeof createAdminClient>, importMode: ImportMode, rows: Record<string, unknown>[]) {
  if (importMode === 'replace') {
    await admin.from('dishes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }

  const categories = uniqueBy(
    rows.map((row) => ({ name: row.category_name, slug: row.category_slug, is_active: true })),
    (row) => String(row.slug)
  );

  const { data: categoryRows, error: categoryError } = await admin.from('dish_categories').upsert(categories, { onConflict: 'slug' }).select('id,slug');
  if (categoryError) return { ok: false, message: categoryError.message };

  const categoryMap = new Map((categoryRows ?? []).map((category) => [category.slug, category.id]));
  const dishRows = rows.map((row) => ({
    name: row.name,
    category_id: categoryMap.get(String(row.category_slug)) ?? null,
    meal_type: row.meal_type,
    image_url: row.image_url,
    image_alt_text: row.image_alt_text,
    price: row.price,
    status: row.status,
    calories: row.calories,
    protein_g: row.protein_g,
    carbohydrates_g: row.carbohydrates_g,
    fats_g: row.fats_g,
    fiber_g: row.fiber_g
  }));

  const { error: dishError } = await admin.from('dishes').upsert(dishRows, { onConflict: 'name' });
  if (dishError) return { ok: false, message: dishError.message };
  return { ok: true, message: 'Catalog published.' };
}

async function publishDeliveryZones(admin: ReturnType<typeof createAdminClient>, importMode: ImportMode, rows: Record<string, unknown>[]) {
  if (importMode === 'replace') {
    await admin.from('delivery_zones').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }

  const { error } = await admin.from('delivery_zones').upsert(rows, { onConflict: 'external_zone_code' });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Delivery zones published.' };
}

function uniqueBy<T>(rows: T[], keyGetter: (row: T) => string) {
  const map = new Map<string, T>();
  for (const row of rows) map.set(keyGetter(row), row);
  return Array.from(map.values());
}
