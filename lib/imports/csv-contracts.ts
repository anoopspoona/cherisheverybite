export type DatasetType = 'plans' | 'menu_cycle' | 'catalog' | 'delivery_zones';

export type CsvContract = {
  type: DatasetType;
  label: string;
  description: string;
  requiredHeaders: string[];
  warningHeaders?: string[];
};

export const csvContracts: CsvContract[] = [
  {
    type: 'plans',
    label: 'Plan Master',
    description: 'Subscription plan, variant, duration and pricing master.',
    requiredHeaders: [
      'Plan_Key',
      'Plan_Name',
      'Variant_Key',
      'Variant_Name',
      'Duration_Days',
      'Meals_Per_Day',
      'Price for monthly subscription',
      'Price for weekly subscription',
      'Status',
      'Description'
    ]
  },
  {
    type: 'menu_cycle',
    label: 'Plan Nutrition / Menu Cycle',
    description: '24-service-day plan menu cycle. Monday to Saturday only; Sundays are closed.',
    requiredHeaders: [
      'Plan',
      'Data.Column1',
      'Data.Column2',
      'Data.Column3',
      'Data.Column4',
      'Data.Column5',
      'Data.Column6',
      'Data.Column7',
      'Calories',
      'Protein',
      'Carbohydrates',
      'Fats',
      'Fiber'
    ]
  },
  {
    type: 'catalog',
    label: 'Dish Catalog',
    description: 'Dish inventory with categories, status, images, pricing and nutrition.',
    requiredHeaders: ['name', 'category', 'meal_type', 'image_url', 'price', 'status', 'Calories', 'Protein', 'Carbohydrates', 'Fats', 'Fiber']
  },
  {
    type: 'delivery_zones',
    label: 'Delivery Zones',
    description: 'Google Maps polygon delivery zones, fees, ETA and minimum order values.',
    requiredHeaders: ['zone_id', 'zone_name', 'status', 'priority', 'min_order', 'delivery_fee', 'eta_min', 'eta_max', 'polygon_geojson', 'notes']
  }
];

export function validateHeaders(headers: string[], contract: CsvContract) {
  const normalized = headers.map((header) => header.trim());
  const missing = contract.requiredHeaders.filter((header) => !normalized.includes(header));
  const extra = normalized.filter((header) => !contract.requiredHeaders.includes(header));

  return {
    isValid: missing.length === 0,
    missing,
    extra
  };
}

export function normalizePlanName(planName: string) {
  return planName
    .replace(/Weightloss/gi, 'Weight Loss')
    .replace(/DInner/g, 'Dinner')
    .replace(/Smoothie \+ Gut Booster Plan/gi, 'Smoothie Plan')
    .trim();
}

export function isAllowedServiceDay(day: string) {
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].includes(day.trim());
}
