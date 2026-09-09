-- Layer 3 — customer relationships, tags, the lead pipeline, imported history.

create table public.customer_tags (
  customer_id uuid not null references public.customers(id) on delete cascade,
  tag_id      uuid not null references public.tags(id) on delete cascade,
  source      text not null default 'manual' check (source in ('manual', 'derived', 'imported')),
  created_at  timestamptz not null default now(),
  primary key (customer_id, tag_id)
);

create index customer_tags_tag on public.customer_tags (tag_id);

select public.apply_staff_rls('customer_tags');

-- Explicit relationships on top of household grouping. Lets the trip builder
-- suggest travellers and compute child ages for pricing.
create table public.customer_relationships (
  id                  uuid primary key default gen_random_uuid(),
  customer_id         uuid not null references public.customers(id) on delete cascade,
  related_customer_id uuid not null references public.customers(id) on delete cascade,
  relation            text not null
                      check (relation in ('spouse', 'child', 'parent', 'sibling',
                                          'colleague', 'friend', 'other')),
  created_at          timestamptz not null default now(),

  constraint customer_relationships_not_self check (customer_id <> related_customer_id),
  unique (customer_id, related_customer_id, relation)
);

select public.apply_staff_rls('customer_relationships');

-- ---------------------------------------------------------------------------
-- Leads.
--
-- is_international drives the TCS disclosure on quotations, so it is a first
-- class column rather than something inferred from a destination string.
--
-- Retention: a lead marked lost is purged 90 days later by a scheduled job.
-- lost_at is maintained by trigger so the job cannot be fooled by a status
-- change that forgot to stamp the time.
-- ---------------------------------------------------------------------------
create table public.leads (
  id                  uuid primary key default gen_random_uuid(),
  reference           text unique,

  household_id        uuid references public.households(id) on delete set null,
  primary_customer_id uuid references public.customers(id) on delete set null,

  title               text,
  destination         text,
  is_international    boolean not null default false,

  travel_start        date,
  travel_end          date,
  travel_month        text,   -- "Nov 2026" when exact dates are not known yet

  pax_adults          integer not null default 1 check (pax_adults >= 0),
  pax_children        integer not null default 0 check (pax_children >= 0),

  budget_min          numeric(14,2) check (budget_min >= 0),
  budget_max          numeric(14,2) check (budget_max >= 0),
  currency            char(3) not null default 'INR',

  source              text not null default 'whatsapp'
                      check (source in ('whatsapp', 'instagram', 'referral', 'walk_in',
                                        'website', 'repeat', 'cross_sell', 'other')),

  status              text not null default 'new'
                      check (status in ('new', 'contacted', 'requirements_logged', 'quoted',
                                        'negotiating', 'won', 'lost', 'dormant')),

  lost_reason         text,
  lost_at             timestamptz,

  requirements        jsonb not null default '{}'::jsonb,
  notes               text,

  owner_staff_id      uuid references public.staff_users(id) on delete set null,
  converted_trip_id   uuid,  -- FK added in layer 5

  created_by          uuid references public.staff_users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint leads_budget_order check (budget_max is null or budget_min is null or budget_max >= budget_min)
);

create index leads_status on public.leads (status);
create index leads_owner on public.leads (owner_staff_id);
create index leads_customer on public.leads (primary_customer_id);
create index leads_lost_at on public.leads (lost_at) where lost_at is not null;

create or replace function public.leads_stamp_lost_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'lost' and (old.status is distinct from 'lost') then
    new.lost_at := now();
  elsif new.status <> 'lost' then
    new.lost_at := null;
  end if;
  return new;
end;
$$;

create trigger leads_stamp_lost_at
  before insert or update of status on public.leads
  for each row execute function public.leads_stamp_lost_at();

create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

select public.apply_staff_rls('leads');

-- ---------------------------------------------------------------------------
-- Imported trip history.
--
-- Deliberately flat and read-only. Reverse-engineering line items, suppliers
-- and costs out of spreadsheets is enormous effort for data nobody will ever
-- edit. This answers the only question that matters — when and where did they
-- last travel — which is exactly what the dormant-customer campaign needs.
-- ---------------------------------------------------------------------------
create table public.legacy_trips (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid not null references public.customers(id) on delete cascade,
  destination    text,
  travel_start   date,
  travel_end     date,
  headline_value numeric(14,2),
  currency       char(3) not null default 'INR',
  notes          text,
  source_row     jsonb,  -- the original spreadsheet row, for tracing an import back
  imported_at    timestamptz not null default now()
);

create index legacy_trips_customer on public.legacy_trips (customer_id);
create index legacy_trips_travel_start on public.legacy_trips (travel_start desc nulls last);

select public.apply_staff_rls('legacy_trips');
