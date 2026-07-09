import { isAllowedServiceDay, normalizePlanName, type DatasetType } from './csv-contracts';

export type CsvRow = Record<string, string | number | null | undefined>;

export type NormalizedRow = {
  raw: CsvRow;
  normalized: Record<string, unknown> | null;
  status: 'valid' | 'warning' | 'error';
  message: string;
};

const dayMap: Record<string, 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat'> = {
  Mon: 'Mon',
  Monday: 'Mon',
  Tue: 'Tue',
  Tuesday: 'Tue',
  Wed: 'Wed',
  Wednesday: 'Wed',
  Thu: 'Thu',
  Thursday: 'Thu',
  Fri: 'Fri',
  Friday: 'Fri',
  Sat: 'Sat',
  Saturday: 'Sat'
};

const dayOrder: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
};

function text(value: unknown) {
  return String(value ?? '').trim();
}

function nullableText(value: unknown) {
  const cleaned = text(value);
  return cleaned.length > 0 ? cleaned : null;
}

function numberOrNull(value: unknown) {
  const cleaned = text(value);
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function statusOrDefault(value: unknown) {
  const status = text(value).toLowerCase();
  return ['draft', 'live', 'hidden', 'seasonal', 'unavailable', 'inactive'].includes(status) ? status : 'draft';
}

function parseWeek(value: unknown) {
  const match = text(value).match(/(\d+)/);
  return match ? Number(match[1]) : NaN;
}

export function normalizeRows(datasetType: DatasetType, rows: CsvRow[]): NormalizedRow[] {
  return rows.map((row) => normalizeRow(datasetType, row));
}

export function normalizeRow(datasetType: DatasetType, row: CsvRow): NormalizedRow {
  switch (datasetType) {
    case 'plans':
      return normalizePlanRow(row);
    case 'menu_cycle':
      return normalizeMenuCycleRow(row);
    case 'catalog':
      return normalizeCatalogRow(row);
    case 'delivery_zones':
      return normalizeDeliveryZoneRow(row);
    default:
      return { raw: row, normalized: null, status: 'error', message: 'Unsupported dataset type.' };
  }
}

function normalizePlanRow(row: CsvRow): NormalizedRow {
  const planKey = text(row.Plan_Key);
  const planName = normalizePlanName(text(row.Plan_Name));
  const variantKey = text(row.Variant_Key).toLowerCase();
  const variantName = text(row.Variant_Name);
  const durationDays = numberOrNull(row.Duration_Days);

  if (!planKey || !planName || !variantKey || !variantName || !durationDays) {
    return { raw: row, normalized: null, status: 'error', message: 'Plan key, plan name, variant and duration are required.' };
  }

  return {
    raw: row,
    status: 'valid',
    message: 'Ready',
    normalized: {
      plan_key: planKey,
      name: planName,
      duration_days: durationDays,
      meals_per_day_label: nullableText(row.Meals_Per_Day),
      status: statusOrDefault(row.Status),
      description: nullableText(row.Description),
      variant_key: variantKey,
      variant_name: variantName,
      monthly_price: numberOrNull(row['Price for monthly subscription']),
      weekly_price: numberOrNull(row['Price for weekly subscription'])
    }
  };
}

function normalizeMenuCycleRow(row: CsvRow): NormalizedRow {
  const planDisplayName = normalizePlanName(text(row.Plan));
  const cycleWeek = parseWeek(row['Data.Column1']);
  const serviceDayRaw = text(row['Data.Column2']);
  const serviceDay = dayMap[serviceDayRaw];

  if (!planDisplayName || !Number.isInteger(cycleWeek) || cycleWeek < 1 || cycleWeek > 4) {
    return { raw: row, normalized: null, status: 'error', message: 'Plan and cycle week 1-4 are required.' };
  }

  if (!isAllowedServiceDay(serviceDayRaw) || !serviceDay) {
    return { raw: row, normalized: null, status: 'error', message: 'Sunday is kitchen closed and cannot contain menu items.' };
  }

  const cycleServiceDay = (cycleWeek - 1) * 6 + dayOrder[serviceDay];
  const calories = numberOrNull(row.Calories);

  if (calories === null) {
    return { raw: row, normalized: null, status: 'error', message: 'Calories must be numeric.' };
  }

  return {
    raw: row,
    status: 'valid',
    message: 'Ready',
    normalized: {
      plan_display_name: planDisplayName,
      cycle_week: cycleWeek,
      service_day: serviceDay,
      cycle_service_day: cycleServiceDay,
      component_1: nullableText(row['Data.Column3']),
      component_2: nullableText(row['Data.Column4']),
      component_3: nullableText(row['Data.Column5']),
      component_4: nullableText(row['Data.Column6']),
      component_5: nullableText(row['Data.Column7']),
      calories,
      protein_g: numberOrNull(row.Protein),
      carbohydrates_g: numberOrNull(row.Carbohydrates),
      fats_g: numberOrNull(row.Fats),
      fiber_g: numberOrNull(row.Fiber),
      status: 'live'
    }
  };
}

function normalizeCatalogRow(row: CsvRow): NormalizedRow {
  const name = text(row.name);
  if (!name) {
    return { raw: row, normalized: null, status: 'error', message: 'Dish name is required.' };
  }

  const categoryName = nullableText(row.category) ?? 'Uncategorized';
  const status = statusOrDefault(row.status);
  const price = numberOrNull(row.price);
  const warnings: string[] = [];

  if (!nullableText(row.image_url)) warnings.push('Missing image');
  if (!nullableText(row.category)) warnings.push('Missing category; assigned Uncategorized');
  if (price === null && status === 'live') {
    return { raw: row, normalized: null, status: 'error', message: 'Live dish requires numeric price.' };
  }
  if (price === null) warnings.push('Missing price');

  return {
    raw: row,
    status: warnings.length > 0 ? 'warning' : 'valid',
    message: warnings.length > 0 ? warnings.join('; ') : 'Ready',
    normalized: {
      name,
      category_name: categoryName,
      category_slug: slugify(categoryName),
      meal_type: nullableText(row.meal_type),
      image_url: nullableText(row.image_url),
      image_alt_text: name,
      price,
      status,
      calories: numberOrNull(row.Calories),
      protein_g: numberOrNull(row.Protein),
      carbohydrates_g: numberOrNull(row.Carbohydrates),
      fats_g: numberOrNull(row.Fats),
      fiber_g: numberOrNull(row.Fiber)
    }
  };
}

function normalizeDeliveryZoneRow(row: CsvRow): NormalizedRow {
  const zoneCode = text(row.zone_id);
  const name = text(row.zone_name);
  const polygonText = text(row.polygon_geojson);

  if (!zoneCode || !name || !polygonText) {
    return { raw: row, normalized: null, status: 'error', message: 'Zone id, name and polygon_geojson are required.' };
  }

  try {
    const polygon = JSON.parse(polygonText);
    if (polygon.type !== 'Polygon' || !Array.isArray(polygon.coordinates)) {
      return { raw: row, normalized: null, status: 'error', message: 'polygon_geojson must be a GeoJSON Polygon.' };
    }

    return {
      raw: row,
      status: 'valid',
      message: 'Ready',
      normalized: {
        external_zone_code: zoneCode,
        name,
        status: statusOrDefault(row.status),
        zone_type: 'polygon',
        priority: numberOrNull(row.priority) ?? 100,
        minimum_order_value: numberOrNull(row.min_order) ?? 0,
        delivery_fee: numberOrNull(row.delivery_fee) ?? 0,
        eta_min_minutes: numberOrNull(row.eta_min),
        eta_max_minutes: numberOrNull(row.eta_max),
        polygon_geojson: polygon,
        notes: nullableText(row.notes)
      }
    };
  } catch {
    return { raw: row, normalized: null, status: 'error', message: 'polygon_geojson is not valid JSON.' };
  }
}
