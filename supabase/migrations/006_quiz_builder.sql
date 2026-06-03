-- Database Migration: Quiz Builder & Recipe Training Assignments
-- =============================================================================

-- Add quiz_questions column to recipes
alter table recipes add column if not exists quiz_questions jsonb;

-- Modify training_assignments table to allow nullable sop_id and add recipe columns
alter table training_assignments alter column sop_id drop not null;
alter table training_assignments add column if not exists recipe_id uuid references recipes(id) on delete cascade;
alter table training_assignments add column if not exists recipe_book text;

-- Add check constraint ensuring exactly one source is provided
alter table training_assignments drop constraint if exists check_exactly_one_source;
alter table training_assignments add constraint check_exactly_one_source 
  check (
    (sop_id is not null and recipe_id is null and recipe_book is null) or
    (sop_id is null and recipe_id is not null and recipe_book is null) or
    (sop_id is null and recipe_id is null and recipe_book is not null)
  );

-- Drop legacy unique constraint
alter table training_assignments drop constraint if exists training_assignments_sop_id_assigned_to_key;

-- Add conditional unique indexes for each assignment type
create unique index if not exists idx_ta_sop_unique on training_assignments(sop_id, assigned_to) where sop_id is not null;
create unique index if not exists idx_ta_recipe_unique on training_assignments(recipe_id, assigned_to) where recipe_id is not null;
create unique index if not exists idx_ta_book_unique on training_assignments(recipe_book, assigned_to) where recipe_book is not null;
