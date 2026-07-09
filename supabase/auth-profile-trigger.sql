-- Sync Supabase Auth users into public.profiles.
-- Run after schema.sql.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_role text := 'customer';
begin
  select coalesce(a.role, 'customer') into resolved_role
  from public.admin_users a
  where lower(a.email) = lower(new.email)
    and a.is_active = true
  limit 1;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    case when resolved_role in ('admin', 'owner') then resolved_role else 'customer' end
  )
  on conflict (id) do update
  set email = excluded.email,
      role = excluded.role,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update on auth.users
for each row execute procedure public.handle_new_user();
