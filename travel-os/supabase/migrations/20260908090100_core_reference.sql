-- Layer 1 — roots with no outbound foreign keys.
-- staff_users, households, suppliers, tags, settings.

-- ---------------------------------------------------------------------------
-- Staff. One admin today; the role column exists so adding agents later is
-- additive. No margin masking is built — see docs: for a single-user team it is
-- theatre, and staff-side column permissions are a large bug surface.
-- ---------------------------------------------------------------------------
create table public.staff_users (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  email       text not null,
  role        text not null default 'admin'
              check (role in ('admin', 'manager', 'agent', 'accounts')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index staff_users_email_key on public.staff_users (lower(email));

create trigger staff_users_set_updated_at
  before update on public.staff_users
  for each row execute function public.set_updated_at();

-- Referenced by every RLS policy in the schema.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_users s
    where s.id = auth.uid() and s.is_active
  );
$$;

select public.apply_staff_rls('staff_users');

-- ---------------------------------------------------------------------------
-- Households group customers who travel and pay together. This is what makes
-- "husband books, wife and child travel, wife books a corporate trip next year"
-- work without duplicating people.
-- ---------------------------------------------------------------------------
create table public.households (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  primary_customer_id uuid,  -- FK added in layer 2; customers does not exist yet
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger households_set_updated_at
  before update on public.households
  for each row execute function public.set_updated_at();

select public.apply_staff_rls('households');

-- ---------------------------------------------------------------------------
-- Suppliers. credit_days drives payable due dates in Phase 5.
-- ---------------------------------------------------------------------------
create table public.suppliers (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  supplier_type  text not null default 'other'
                 check (supplier_type in ('dmc', 'hotel', 'airline', 'consolidator',
                                          'transport', 'visa', 'insurance', 'activity',
                                          'forex', 'other')),
  contact_name   text,
  phone_raw      text,
  phone_e164     text,
  email          text,
  address        text,
  gstin          text,
  payment_terms  text,
  credit_days    integer not null default 0 check (credit_days >= 0),
  notes          text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index suppliers_name_trgm on public.suppliers using gin (name gin_trgm_ops);

create or replace function public.suppliers_normalize_phone()
returns trigger
language plpgsql
as $$
begin
  new.phone_e164 := public.normalize_phone_e164(new.phone_raw);
  return new;
end;
$$;

create trigger suppliers_normalize_phone
  before insert or update of phone_raw on public.suppliers
  for each row execute function public.suppliers_normalize_phone();

create trigger suppliers_set_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

select public.apply_staff_rls('suppliers');

-- ---------------------------------------------------------------------------
-- Tags are relational, not a JSON preferences blob. The Phase 6 campaign query
-- ("luxury tag, no travel in 18 months") needs to be indexable and facetable.
-- ---------------------------------------------------------------------------
create table public.tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  category   text not null default 'preference'
             check (category in ('preference', 'segment', 'source', 'other')),
  color      text,
  created_at timestamptz not null default now()
);

select public.apply_staff_rls('tags');

-- ---------------------------------------------------------------------------
-- Settings. Editable in the UI, not code — the TCS rate and its wording will
-- change when the statutory rate does, and that must not need a deploy.
-- ---------------------------------------------------------------------------
create table public.settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.staff_users(id) on delete set null
);

create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

select public.apply_staff_rls('settings');

insert into public.settings (key, value, description) values
  ('brand_name',
   '"SkyMiles Travels"'::jsonb,
   'Canonical company name. The marketing site spells it four ways; the OS standardises on this.'),
  ('tcs_rate_percent',
   '2'::jsonb,
   'TCS percentage applied to foreign trips. Excluded from the quote total — shown as a disclosure note.'),
  ('tcs_note',
   '"The quote is excluding 2% TCS charged on all foreign trip bookings. The TCS will be adjusted with the Income Tax Payable for current Financial Year."'::jsonb,
   'Disclosure text appended to every foreign-trip quotation.'),
  ('tcs_show_amount',
   'false'::jsonb,
   'When true the computed TCS amount is displayed alongside the note. Still never added to the total.'),
  ('prices_include_gst',
   'true'::jsonb,
   'Quoted prices are GST-inclusive unless a line sets price_excludes_gst.'),
  ('quote_validity_days',
   '7'::jsonb,
   'Default valid_until offset when a quotation is created.'),
  ('quote_terms',
   '"Rates are subject to availability at the time of confirmation. Booking confirmed only on receipt of advance payment."'::jsonb,
   'Default terms block printed on quotations.');
