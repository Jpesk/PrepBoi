-- =============================================================================
-- PrepPro — Base Database Schema
-- Multi-location franchise · RBAC · RLS · Realtime · Storage
-- =============================================================================

create extension if not exists "uuid-ossp";

-- ── Enums ─────────────────────────────────────────────────────────────────────
create type user_role          as enum ('super_user', 'shift_leader', 'employee');
create type checklist_category as enum ('opening', 'closing', 'safety', 'general');
create type notif_type         as enum ('task_submitted', 'training_assigned', 'system');
create type submission_status  as enum ('draft', 'submitted');


-- =============================================================================
-- ORGANIZATIONS
-- =============================================================================
create table organizations (
  id         uuid        primary key default uuid_generate_v4(),
  name       text        not null,
  slug       text        not null unique,
  logo_url   text,
  plan       text        not null default 'starter' check (plan in ('starter','growth','enterprise')),
  is_active  boolean     not null default true,
  created_at timestamptz not null default now()
);


-- =============================================================================
-- LOCATIONS
-- =============================================================================
create table locations (
  id         uuid        primary key default uuid_generate_v4(),
  org_id     uuid        not null references organizations(id) on delete cascade,
  name       text        not null,
  address    text,
  timezone   text        not null default 'America/Phoenix',
  is_active  boolean     not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create index idx_locations_org on locations(org_id);


-- =============================================================================
-- PROFILES
-- =============================================================================
create table profiles (
  id              uuid      primary key references auth.users(id) on delete cascade,
  org_id          uuid      not null references organizations(id) on delete cascade,
  location_id     uuid      references locations(id) on delete set null,
  full_name       text      not null,
  role            user_role not null default 'employee',
  avatar_initials text generated always as (
    upper(
      left(split_part(trim(full_name),' ',1),1) ||
      coalesce(left(split_part(trim(full_name),' ',2),1),'')
    )
  ) stored,
  theme           text      not null default 'dark' check (theme in ('dark','light')),
  is_active       boolean   not null default true,
  is_kiosk        boolean   not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_profiles_org      on profiles(org_id);
create index idx_profiles_location on profiles(location_id);
create index idx_profiles_role     on profiles(role);

-- Auto-create profile on Supabase Auth signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, org_id, location_id, full_name, role, is_kiosk)
  values (
    new.id,
    (new.raw_user_meta_data->>'org_id')::uuid,
    nullif(new.raw_user_meta_data->>'location_id','')::uuid,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'employee'),
    coalesce((new.raw_user_meta_data->>'is_kiosk')::boolean, false)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


-- =============================================================================
-- CHECKLISTS
-- =============================================================================
create table checklists (
  id             uuid               primary key default uuid_generate_v4(),
  org_id         uuid               not null references organizations(id) on delete cascade,
  location_id    uuid               references locations(id) on delete cascade,
  created_by     uuid               not null references profiles(id),
  title          text               not null,
  emoji          text               not null default '📋',
  shift          text               not null default 'ALL',
  category       checklist_category not null default 'general',
  due_time       text               not null default '23:59',
  est_minutes    int                not null default 15,
  schema         jsonb              not null default '{"sections":[]}',
  assigned_roles user_role[]        not null default '{employee,shift_leader}',
  is_active      boolean            not null default true,
  created_at     timestamptz        not null default now(),
  updated_at     timestamptz        not null default now()
);

create index idx_checklists_org      on checklists(org_id);
create index idx_checklists_location on checklists(location_id);


-- =============================================================================
-- CHECKLIST_SUBMISSIONS
-- =============================================================================
create table checklist_submissions (
  id              uuid              primary key default uuid_generate_v4(),
  checklist_id    uuid              not null references checklists(id) on delete cascade,
  org_id          uuid              not null references organizations(id) on delete cascade,
  location_id     uuid              references locations(id) on delete set null,
  submitted_by    uuid              not null references profiles(id),
  draft_data      jsonb             not null default '{}',
  signature_data  text,
  status          submission_status not null default 'draft',
  progress        int               not null default 0 check (progress between 0 and 100),
  started_at      timestamptz       not null default now(),
  submitted_at    timestamptz,
  submission_date date              not null default current_date,
  unique (checklist_id, submitted_by, submission_date)
);

create index idx_subs_org      on checklist_submissions(org_id);
create index idx_subs_location on checklist_submissions(location_id);
create index idx_subs_user     on checklist_submissions(submitted_by);
create index idx_subs_date     on checklist_submissions(submission_date desc);
create index idx_subs_status   on checklist_submissions(status);


-- =============================================================================
-- SOPS
-- =============================================================================
create table sops (
  id             uuid        primary key default uuid_generate_v4(),
  org_id         uuid        not null references organizations(id) on delete cascade,
  location_id    uuid        references locations(id) on delete cascade,
  created_by     uuid        not null references profiles(id),
  title          text        not null,
  emoji          text        not null default '📄',
  category       text        not null default 'general',
  read_minutes   int         not null default 5,
  sections       jsonb       not null default '[]',
  quiz_questions jsonb,
  is_active      boolean     not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_sops_org      on sops(org_id);
create index idx_sops_location on sops(location_id);


-- =============================================================================
-- TRAINING_ASSIGNMENTS
-- =============================================================================
create table training_assignments (
  id           uuid        primary key default uuid_generate_v4(),
  sop_id       uuid        not null references sops(id) on delete cascade,
  org_id       uuid        not null references organizations(id) on delete cascade,
  assigned_to  uuid        not null references profiles(id) on delete cascade,
  assigned_by  uuid        not null references profiles(id),
  due_date     date,
  completed_at timestamptz,
  quiz_score   int         check (quiz_score between 0 and 100),
  created_at   timestamptz not null default now(),
  unique (sop_id, assigned_to)
);

create index idx_ta_user on training_assignments(assigned_to);
create index idx_ta_org  on training_assignments(org_id);


-- =============================================================================
-- RECIPES
-- =============================================================================
create table recipes (
  id               uuid        primary key default uuid_generate_v4(),
  org_id           uuid        not null references organizations(id) on delete cascade,
  location_id      uuid        references locations(id) on delete cascade,
  created_by       uuid        not null references profiles(id),
  title            text        not null,
  category         text        not null default 'general',
  yield_amount     numeric     not null default 1,
  yield_unit       text        not null default 'portions',
  prep_time        text,
  bake_time        text,
  temperature      text,
  ingredients      jsonb       not null default '[]',
  steps            jsonb       not null default '[]',
  notes            text,
  pdf_storage_path text,
  is_active        boolean     not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_recipes_org      on recipes(org_id);
create index idx_recipes_location on recipes(location_id);


-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================
create table notifications (
  id           uuid       primary key default uuid_generate_v4(),
  org_id       uuid       not null references organizations(id) on delete cascade,
  recipient_id uuid       not null references profiles(id) on delete cascade,
  type         notif_type not null,
  title        text       not null,
  body         text       not null,
  entity_type  text,
  entity_id    uuid,
  is_read      boolean    not null default false,
  email_sent   boolean    not null default false,
  created_at   timestamptz not null default now()
);

create index idx_notifs_recipient on notifications(recipient_id, is_read, created_at desc);
create index idx_notifs_org       on notifications(org_id);


-- =============================================================================
-- NOTIFICATION TRIGGERS
-- =============================================================================
create or replace function fn_notify_on_submission()
returns trigger language plpgsql security definer as $$
declare
  v_name    text;
  v_title   text;
  v_org     uuid;
  v_loc     uuid;
  v_rec     record;
begin
  if new.status = 'submitted' and (old.status is null or old.status <> 'submitted') then
    select full_name into v_name  from profiles   where id = new.submitted_by;
    select title, org_id, location_id into v_title, v_org, v_loc  from checklists where id = new.checklist_id;

    for v_rec in select id from profiles where org_id = v_org and role = 'super_user' and is_active = true loop
      insert into notifications (org_id, recipient_id, type, title, body, entity_type, entity_id)
      values (v_org, v_rec.id, 'task_submitted', v_title || ' submitted',
              v_name  || ' completed ' || v_title || ' on ' || to_char(new.submission_date,'Mon DD'),
              'checklist_submission', new.id);
    end loop;

    for v_rec in select id from profiles where org_id = v_org and role = 'shift_leader' and is_active = true and (location_id = v_loc or v_loc is null) loop
      insert into notifications (org_id, recipient_id, type, title, body, entity_type, entity_id)
      values (v_org, v_rec.id, 'task_submitted', v_title || ' submitted', v_name  || ' completed ' || v_title,
              'checklist_submission', new.id);
    end loop;
  end if;
  return new;
end;
$$;

create trigger trg_notify_submission
  after insert or update of status on checklist_submissions
  for each row execute procedure fn_notify_on_submission();

create or replace function fn_notify_on_assignment()
returns trigger language plpgsql security definer as $$
declare
  v_sop     text;
  v_by      text;
begin
  select title      into v_sop from sops     where id = new.sop_id;
  select full_name  into v_by  from profiles where id = new.assigned_by;

  insert into notifications (org_id, recipient_id, type, title, body, entity_type, entity_id)
  values (new.org_id, new.assigned_to, 'training_assigned', 'New training assigned',
          v_by || ' assigned you: ' || v_sop || coalesce(' — due ' || to_char(new.due_date,'Mon DD'),''),
          'training_assignment', new.id);
  return new;
end;
$$;

create trigger trg_notify_assignment
  after insert on training_assignments
  for each row execute procedure fn_notify_on_assignment();


-- =============================================================================
-- UPDATED_AT HELPERS
-- =============================================================================
create or replace function fn_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_profiles_upd   before update on profiles   for each row execute procedure fn_updated_at();
create trigger trg_checklists_upd before update on checklists for each row execute procedure fn_updated_at();
create trigger trg_sops_upd       before update on sops       for each row execute procedure fn_updated_at();
create trigger trg_recipes_upd    before update on recipes    for each row execute procedure fn_updated_at();


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table organizations         enable row level security;
alter table locations             enable row level security;
alter table profiles              enable row level security;
alter table checklists            enable row level security;
alter table checklist_submissions enable row level security;
alter table sops                  enable row level security;
alter table training_assignments  enable row level security;
alter table recipes               enable row level security;
alter table notifications         enable row level security;

create or replace function my_org_id() returns uuid language sql security definer stable as $$
  select org_id from profiles where id = auth.uid()
$$;

create or replace function my_location_id() returns uuid language sql security definer stable as $$
  select location_id from profiles where id = auth.uid()
$$;

create or replace function my_role() returns user_role language sql security definer stable as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function is_super() returns boolean language sql security definer stable as $$
  select my_role() = 'super_user'
$$;

create or replace function is_leader_or_above() returns boolean language sql security definer stable as $$
  select my_role() in ('super_user','shift_leader')
$$;

create policy "org_read"   on organizations for select using (id = my_org_id());
create policy "org_manage" on organizations for all    using (id = my_org_id() and is_super());

create policy "loc_read"   on locations for select using (org_id = my_org_id());
create policy "loc_manage" on locations for all    using (org_id = my_org_id() and is_super());

create policy "prof_read"       on profiles for select using (org_id = my_org_id());
create policy "prof_update_own" on profiles for update using (id = auth.uid())
  with check (case when not is_super() then role = my_role() else true end);
create policy "prof_manage_super" on profiles for all using (org_id = my_org_id() and is_super());

create policy "cl_read" on checklists for select
  using (org_id = my_org_id() and is_active = true and my_role() = any(assigned_roles));
create policy "cl_manage" on checklists for all using (org_id = my_org_id() and is_super());

create policy "sub_read" on checklist_submissions for select
  using (org_id = my_org_id() and (submitted_by = auth.uid() or is_leader_or_above()));
create policy "sub_insert" on checklist_submissions for insert with check (org_id = my_org_id() and submitted_by = auth.uid());
create policy "sub_update_draft" on checklist_submissions for update using (submitted_by = auth.uid() and status = 'draft');

create policy "sop_read"   on sops for select using (org_id = my_org_id() and is_active = true);
create policy "sop_manage" on sops for all    using (org_id = my_org_id() and is_super());

create policy "ta_read" on training_assignments for select
  using (org_id = my_org_id() and (assigned_to = auth.uid() or is_leader_or_above()));
create policy "ta_manage" on training_assignments for all using (org_id = my_org_id() and is_leader_or_above());
create policy "ta_complete_own" on training_assignments for update using (assigned_to = auth.uid());

create policy "rec_read"   on recipes for select using (org_id = my_org_id() and is_active = true);
create policy "rec_manage" on recipes for all    using (org_id = my_org_id() and is_super());

create policy "notif_read"   on notifications for select using (recipient_id = auth.uid());
create policy "notif_update" on notifications for update using (recipient_id = auth.uid());


-- =============================================================================
-- STORAGE BUCKETS
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-pdfs','recipe-pdfs', false, 10485760, '{application/pdf}')
on conflict (id) do nothing;

create policy "pdf_upload" on storage.objects for insert with check (bucket_id = 'recipe-pdfs' and is_super() and (storage.foldername(name))[1] = my_org_id()::text);
create policy "pdf_read" on storage.objects for select using (bucket_id = 'recipe-pdfs' and auth.uid() is not null and (storage.foldername(name))[1] = my_org_id()::text);
create policy "pdf_delete" on storage.objects for delete using (bucket_id = 'recipe-pdfs' and is_super() and (storage.foldername(name))[1] = my_org_id()::text);


-- =============================================================================
-- REALTIME
-- =============================================================================
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table checklist_submissions;


-- =============================================================================
-- CONVENIENCE VIEW
-- =============================================================================
create or replace view v_submission_dashboard with (security_invoker = true) as
  select
    cs.id,
    cs.submission_date,
    cs.status,
    cs.progress,
    cs.submitted_at,
    cs.started_at,
    p.full_name        as employee_name,
    p.avatar_initials,
    p.role             as employee_role,
    l.name             as location_name,
    cl.title           as checklist_title,
    cl.emoji           as checklist_emoji,
    cl.category        as checklist_category,
    cl.due_time
  from checklist_submissions cs
  join profiles   p  on p.id  = cs.submitted_by
  join checklists cl on cl.id = cs.checklist_id
  left join locations l on l.id = cs.location_id
  where cs.org_id = my_org_id();

grant select on v_submission_dashboard to authenticated;
