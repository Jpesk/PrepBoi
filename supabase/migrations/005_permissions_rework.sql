-- ── 1. ALter Profiles and Checklists Roles ──────────────────────────
-- Drop constraint or defaults if exist
alter table profiles alter column role drop default;
alter table profiles alter column role type text;
alter table profiles alter column role set default 'employee';

alter table checklists alter column assigned_roles drop default;
alter table checklists alter column assigned_roles type text[] using assigned_roles::text[];
alter table checklists alter column assigned_roles set default '{employee,shift_leader}';

-- Clean up legacy enum type
drop type if exists user_role;

-- ── 2. Add Organization Toggles & Branding ──────────────────────────
alter table organizations add column if not exists modules jsonb not null default '{"daily_summary": true, "training": true, "recipes": true, "communications": true}'::jsonb;
alter table organizations add column if not exists branding jsonb not null default '{"brand": "#f26430", "bg0": "#0c0b0e"}'::jsonb;

-- ── 3. Profile-Locations Join Table ───────────────────────────
create table if not exists profile_locations (
  profile_id uuid not null references profiles(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  primary key (profile_id, location_id)
);

create index if not exists idx_profile_locations_profile on profile_locations(profile_id);
create index if not exists idx_profile_locations_location on profile_locations(location_id);

-- ── 4. Update Signup Trigger Function ───────────────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, org_id, location_id, full_name, role, is_kiosk)
  values (
    new.id,
    (new.raw_user_meta_data->>'org_id')::uuid,
    nullif(new.raw_user_meta_data->>'location_id','')::uuid,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'role', 'employee'),
    coalesce((new.raw_user_meta_data->>'is_kiosk')::boolean, false)
  );
  return new;
end;
$$;
