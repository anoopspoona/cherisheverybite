-- Initial Cherish seed values. Run after schema.sql.

insert into admin_users (email, role, is_active)
values
  ('anoop.anoops@gmail.com', 'owner', true),
  ('sindhug84@gmail.com', 'owner', true)
on conflict (email) do update
set role = excluded.role,
    is_active = excluded.is_active,
    updated_at = now();

insert into admin_settings (
  kitchen_name,
  kitchen_latitude,
  kitchen_longitude,
  delivery_radius_km,
  menu_cycle_anchor_date,
  default_cutoff_time,
  is_accepting_orders
)
select
  'Cherish Kitchen',
  8.5241,
  76.9366,
  8.00,
  current_date,
  '16:00',
  true
where not exists (select 1 from admin_settings);

insert into dish_categories (name, slug, description, display_order)
values
  ('Salads', 'salads', 'Fresh composed salad meals and bowls.', 10),
  ('Kanji', 'kanji', 'Kerala-inspired gut-friendly kanji and broths.', 20),
  ('Chapati Meals', 'chapati-meals', 'Balanced chapati-based meal plates.', 30),
  ('Protein Add-ons', 'protein-add-ons', 'Paneer, chicken, eggs and other protein components.', 40),
  ('Healthy Desserts', 'healthy-desserts', 'Low-sugar dessert options.', 50),
  ('Drinks', 'drinks', 'Smoothies, gut boosters and wellness drinks.', 60),
  ('Uncategorized', 'uncategorized', 'Temporary category for CSV rows that need review.', 999)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    display_order = excluded.display_order,
    updated_at = now();
