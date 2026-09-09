-- Layer 2 — customers.
--
-- Retention rule (from the business, not invented here): customer data is kept
-- indefinitely and deleted only when the customer asks. Merges therefore leave
-- a tombstone rather than deleting — old quotes, trips and payments still point
-- at the losing row and must keep resolving.

create table public.customers (
  id                       uuid primary key default gen_random_uuid(),
  household_id             uuid references public.households(id) on delete set null,

  full_name                text not null,
  phone_raw                text,
  phone_e164               text,
  email                    text,
  dob                      date,
  anniversary              date,
  gender                   text check (gender in ('male', 'female', 'other', 'undisclosed')),
  nationality              text default 'Indian',
  address                  jsonb,
  notes                    text,

  lifecycle_stage          text not null default 'prospect'
                           check (lifecycle_stage in ('prospect', 'active', 'past', 'dormant')),

  -- Set when the customer first logs into the portal (email + password or
  -- magic link). Null until then; staff create customers long before that.
  portal_user_id           uuid references auth.users(id) on delete set null,

  -- Merge tombstone. Never DELETE a customer to resolve a duplicate.
  merged_into_customer_id  uuid references public.customers(id) on delete set null,

  owner_staff_id           uuid references public.staff_users(id) on delete set null,
  created_by               uuid references public.staff_users(id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  constraint customers_not_merged_into_self
    check (merged_into_customer_id is null or merged_into_customer_id <> id)
);

create or replace function public.customers_normalize_phone()
returns trigger
language plpgsql
as $$
begin
  new.phone_e164 := public.normalize_phone_e164(new.phone_raw);
  return new;
end;
$$;

create trigger customers_normalize_phone
  before insert or update of phone_raw on public.customers
  for each row execute function public.customers_normalize_phone();

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- One live customer per phone number. Merged tombstones are excluded so a
-- duplicate can be retired without tripping the constraint.
create unique index customers_phone_unique
  on public.customers (phone_e164)
  where merged_into_customer_id is null and phone_e164 is not null;

create unique index customers_portal_user_key
  on public.customers (portal_user_id)
  where portal_user_id is not null;

-- Fuzzy name search, for both the CRM search box and import dedup.
create index customers_name_trgm on public.customers using gin (full_name gin_trgm_ops);
create index customers_household on public.customers (household_id);
create index customers_email on public.customers (lower(email)) where email is not null;
create index customers_dob_md on public.customers (extract(month from dob), extract(day from dob))
  where dob is not null;

select public.apply_staff_rls('customers');

-- Deferred from layer 1, now that customers exists.
alter table public.households
  add constraint households_primary_customer_fkey
  foreign key (primary_customer_id) references public.customers(id) on delete set null;
