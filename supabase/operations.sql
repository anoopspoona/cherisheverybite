-- Cherish operations ledger tables. Run after schema.sql.

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  plan_display_name text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled', 'completed')),
  start_date date not null,
  end_date date,
  address_id uuid references addresses(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists subscription_deliveries (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  delivery_date date not null,
  plan_day_menu_id uuid references plan_day_menus(id) on delete set null,
  meal_slot text,
  quantity int not null default 1,
  status text not null default 'scheduled' check (status in ('scheduled', 'paused', 'preparing', 'packed', 'dispatched', 'delivered', 'cancelled')),
  address_id uuid references addresses(id) on delete set null,
  delivery_zone_id uuid references delivery_zones(id) on delete set null,
  customer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  address_id uuid references addresses(id) on delete set null,
  delivery_zone_id uuid references delivery_zones(id) on delete set null,
  order_type text not null default 'preorder' check (order_type in ('instant', 'preorder')),
  delivery_date date not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'preparing', 'packed', 'dispatched', 'delivered', 'cancelled')),
  subtotal numeric(10,2) not null default 0,
  delivery_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  customer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  dish_id uuid references dishes(id) on delete set null,
  plan_day_menu_id uuid references plan_day_menus(id) on delete set null,
  item_name text not null,
  meal_slot text,
  quantity int not null default 1,
  unit_price numeric(10,2) not null default 0,
  total_price numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  order_id uuid references orders(id) on delete set null,
  subscription_id uuid references subscriptions(id) on delete set null,
  provider text not null default 'razorpay',
  provider_payment_id text,
  amount numeric(10,2) not null,
  currency text not null default 'INR',
  status text not null default 'created' check (status in ('created', 'paid', 'failed', 'refunded')),
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists production_manifests (
  id uuid primary key default gen_random_uuid(),
  production_date date not null,
  meal_slot text,
  item_name text not null,
  plan_day_menu_id uuid references plan_day_menus(id) on delete set null,
  subscription_quantity int not null default 0,
  preorder_quantity int not null default 0,
  addon_quantity int not null default 0,
  total_quantity int generated always as (subscription_quantity + preorder_quantity + addon_quantity) stored,
  zone_split jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'preparing', 'packed', 'dispatched', 'delivered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(production_date, meal_slot, item_name)
);

alter table subscriptions enable row level security;
alter table subscription_deliveries enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
alter table production_manifests enable row level security;

create policy "Users read own subscriptions" on subscriptions for select using (auth.uid() = user_id);
create policy "Users read own deliveries" on subscription_deliveries for select using (auth.uid() = user_id);
create policy "Users read own orders" on orders for select using (auth.uid() = user_id);
create policy "Users read own payments" on payments for select using (auth.uid() = user_id);

create policy "Admins manage subscriptions" on subscriptions for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "Admins manage deliveries" on subscription_deliveries for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "Admins manage orders" on orders for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "Admins manage order items" on order_items for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "Admins manage payments" on payments for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "Admins manage production" on production_manifests for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

create index if not exists idx_subscriptions_user_status on subscriptions(user_id, status);
create index if not exists idx_deliveries_date_status on subscription_deliveries(delivery_date, status);
create index if not exists idx_orders_delivery_date_status on orders(delivery_date, status);
create index if not exists idx_order_items_order on order_items(order_id);
create index if not exists idx_production_date on production_manifests(production_date);
