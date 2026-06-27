-- Cherish Every Bite platform schema foundation
create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'staff', 'admin', 'owner')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null check (role in ('admin', 'owner')),
  is_active boolean not null default true,
  invited_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function is_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from profiles p
    join admin_users a on lower(p.email) = lower(a.email)
    where p.id = user_id and a.is_active = true and a.role in ('admin', 'owner')
  );
$$;

create or replace function is_owner(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from profiles p
    join admin_users a on lower(p.email) = lower(a.email)
    where p.id = user_id and a.is_active = true and a.role = 'owner'
  );
$$;

create table if not exists admin_settings (
  id uuid primary key default gen_random_uuid(),
  kitchen_name text not null default 'Cherish Kitchen',
  kitchen_latitude double precision not null default 8.5241,
  kitchen_longitude double precision not null default 76.9366,
  delivery_radius_km numeric(6,2) not null default 8.00,
  menu_cycle_anchor_date date not null default current_date,
  default_cutoff_time time not null default '16:00',
  is_accepting_orders boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists dish_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists dishes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category_id uuid references dish_categories(id) on delete set null,
  meal_type text,
  image_url text,
  image_storage_path text,
  image_alt_text text,
  price numeric(10,2),
  status text not null default 'draft' check (status in ('draft', 'live', 'hidden', 'seasonal', 'unavailable')),
  calories numeric(8,2),
  protein_g numeric(8,2),
  carbohydrates_g numeric(8,2),
  fats_g numeric(8,2),
  fiber_g numeric(8,2),
  description text,
  allergens text[],
  tags text[],
  is_subscription_eligible boolean not null default true,
  is_preorder_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  plan_key text not null,
  name text not null,
  duration_days int not null default 24,
  meals_per_day_label text,
  status text not null default 'draft' check (status in ('draft', 'live', 'hidden', 'unavailable')),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(plan_key, name)
);

create table if not exists plan_variants (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans(id) on delete cascade,
  variant_key text not null,
  variant_name text not null,
  monthly_price numeric(10,2),
  weekly_price numeric(10,2),
  status text not null default 'live' check (status in ('draft', 'live', 'hidden', 'unavailable')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(plan_id, variant_key)
);

create table if not exists plan_aliases (
  id uuid primary key default gen_random_uuid(),
  source_name text not null unique,
  plan_id uuid references plans(id) on delete cascade,
  variant_id uuid references plan_variants(id) on delete cascade,
  meal_slot text,
  created_at timestamptz not null default now()
);

create table if not exists plan_day_menus (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references plans(id) on delete cascade,
  variant_id uuid references plan_variants(id) on delete cascade,
  plan_display_name text not null,
  cycle_week int not null check (cycle_week between 1 and 4),
  service_day text not null check (service_day in ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat')),
  cycle_service_day int not null check (cycle_service_day between 1 and 24),
  meal_slot text,
  component_1 text,
  component_2 text,
  component_3 text,
  component_4 text,
  component_5 text,
  calories numeric(8,2),
  protein_g numeric(8,2),
  carbohydrates_g numeric(8,2),
  fats_g numeric(8,2),
  fiber_g numeric(8,2),
  status text not null default 'live' check (status in ('draft', 'live', 'hidden', 'unavailable')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(plan_display_name, cycle_week, service_day)
);

create table if not exists delivery_zones (
  id uuid primary key default gen_random_uuid(),
  external_zone_code text unique,
  name text not null,
  status text not null default 'live' check (status in ('draft', 'live', 'hidden', 'inactive')),
  zone_type text not null default 'polygon' check (zone_type in ('radius', 'polygon')),
  priority int not null default 100,
  center_latitude double precision,
  center_longitude double precision,
  radius_km numeric(6,2),
  polygon_geojson jsonb,
  delivery_fee numeric(10,2) not null default 0,
  minimum_order_value numeric(10,2) not null default 0,
  eta_min_minutes int,
  eta_max_minutes int,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  label text,
  full_address text not null,
  latitude double precision not null,
  longitude double precision not null,
  google_place_id text,
  distance_from_kitchen_km numeric(8,2),
  matched_delivery_zone_id uuid references delivery_zones(id) on delete set null,
  delivery_fee numeric(10,2),
  is_serviceable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists csv_import_jobs (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid references profiles(id) on delete set null,
  dataset_type text not null check (dataset_type in ('plans', 'menu_cycle', 'catalog', 'delivery_zones')),
  file_name text not null,
  import_mode text not null check (import_mode in ('append', 'update', 'replace')),
  status text not null default 'uploaded' check (status in ('uploaded', 'validated', 'failed', 'published')),
  total_rows int not null default 0,
  valid_rows int not null default 0,
  warning_rows int not null default 0,
  error_rows int not null default 0,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists csv_import_rows (
  id uuid primary key default gen_random_uuid(),
  import_job_id uuid not null references csv_import_jobs(id) on delete cascade,
  row_number int not null,
  raw_data jsonb not null,
  normalized_data jsonb,
  validation_status text not null check (validation_status in ('valid', 'warning', 'error')),
  validation_message text,
  created_at timestamptz not null default now()
);

create table if not exists menu_snapshots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  snapshot_type text not null check (snapshot_type in ('default', 'backup', 'manual')),
  created_by uuid references profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists menu_snapshot_items (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references menu_snapshots(id) on delete cascade,
  entity_type text not null,
  entity_data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references profiles(id) on delete set null,
  action_type text not null,
  entity_type text not null,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table admin_users enable row level security;
alter table admin_settings enable row level security;
alter table dish_categories enable row level security;
alter table dishes enable row level security;
alter table plans enable row level security;
alter table plan_variants enable row level security;
alter table plan_aliases enable row level security;
alter table plan_day_menus enable row level security;
alter table delivery_zones enable row level security;
alter table addresses enable row level security;
alter table csv_import_jobs enable row level security;
alter table csv_import_rows enable row level security;
alter table menu_snapshots enable row level security;
alter table menu_snapshot_items enable row level security;
alter table admin_audit_logs enable row level security;

create policy "Public can read live categories" on dish_categories for select using (is_active = true);
create policy "Public can read live dishes" on dishes for select using (status = 'live');
create policy "Public can read live plans" on plans for select using (status = 'live');
create policy "Public can read live plan variants" on plan_variants for select using (status = 'live');
create policy "Public can read live plan menus" on plan_day_menus for select using (status = 'live');
create policy "Public can read live delivery zones" on delivery_zones for select using (status = 'live');

create policy "Users can manage own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users can manage own addresses" on addresses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Admins manage admin settings" on admin_settings for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "Admins manage categories" on dish_categories for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "Admins manage dishes" on dishes for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "Admins manage plans" on plans for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "Admins manage plan variants" on plan_variants for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "Admins manage plan aliases" on plan_aliases for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "Admins manage plan menus" on plan_day_menus for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "Admins manage delivery zones" on delivery_zones for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "Admins manage imports" on csv_import_jobs for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "Admins manage import rows" on csv_import_rows for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "Admins manage snapshots" on menu_snapshots for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "Admins manage snapshot items" on menu_snapshot_items for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "Admins read audit logs" on admin_audit_logs for select using (is_admin(auth.uid()));
create policy "Admins create audit logs" on admin_audit_logs for insert with check (is_admin(auth.uid()));
create policy "Owners manage admin users" on admin_users for all using (is_owner(auth.uid())) with check (is_owner(auth.uid()));

create index if not exists idx_plan_day_menus_cycle on plan_day_menus(cycle_week, service_day, cycle_service_day);
create index if not exists idx_dishes_status on dishes(status);
create index if not exists idx_delivery_zones_status_priority on delivery_zones(status, priority);
create index if not exists idx_addresses_user on addresses(user_id);
