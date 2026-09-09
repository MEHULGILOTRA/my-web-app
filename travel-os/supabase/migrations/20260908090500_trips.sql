-- Layer 5 — trips, who is on them, what is booked, and the itinerary.

create table public.trips (
  id                    uuid primary key default gen_random_uuid(),
  reference             text not null unique,   -- SKY-2026-0142

  lead_id               uuid references public.leads(id) on delete set null,
  source_quotation_id   uuid references public.quotations(id) on delete set null,
  household_id          uuid references public.households(id) on delete set null,

  title                 text not null,
  destination           text,
  is_international      boolean not null default false,
  start_date            date,
  end_date              date,

  status                text not null default 'confirmed'
                        check (status in ('confirmed', 'in_progress', 'completed', 'cancelled')),

  currency              char(3) not null default 'INR',
  total_customer_price  numeric(14,2) not null default 0,

  -- When false the portal shows "Contact the agency to finalize your itinerary"
  -- instead of an empty day list.
  itinerary_published   boolean not null default false,
  portal_enabled        boolean not null default true,
  emergency_contacts    jsonb not null default '[]'::jsonb,

  notes                 text,
  owner_staff_id        uuid references public.staff_users(id) on delete set null,
  created_by            uuid references public.staff_users(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint trips_date_order check (end_date is null or start_date is null or end_date >= start_date)
);

create index trips_status on public.trips (status);
create index trips_start_date on public.trips (start_date);
create index trips_household on public.trips (household_id);

create trigger trips_set_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

select public.apply_staff_rls('trips');

-- Deferred from layer 3.
alter table public.leads
  add constraint leads_converted_trip_fkey
  foreign key (converted_trip_id) references public.trips(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Trip membership.
--
-- This is the table that makes "husband books and pays, wife and child travel"
-- representable. Roles are booleans rather than a single enum because one
-- person is routinely several of them at once.
--
-- It is also the portal's authorisation boundary: a customer sees a trip
-- because they have a row here, NOT because they share a household. Household
-- scoping would show a parent their adult child's honeymoon.
-- ---------------------------------------------------------------------------
create table public.trip_travellers (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references public.trips(id) on delete cascade,
  customer_id   uuid not null references public.customers(id) on delete cascade,

  is_booker     boolean not null default false,
  is_payer      boolean not null default false,
  is_lead_pax   boolean not null default false,
  is_travelling boolean not null default true,

  added_via     text not null default 'staff' check (added_via in ('staff', 'invitation')),
  notes         text,
  created_at    timestamptz not null default now(),

  unique (trip_id, customer_id)
);

create index trip_travellers_customer on public.trip_travellers (customer_id);

select public.apply_staff_rls('trip_travellers');

-- ---------------------------------------------------------------------------
-- Per-trip invitations.
--
-- Mr X books for eleven people; we only hold his details. He invites the rest
-- by email, they accept, and each gets access to that ONE trip — never his
-- other travel. Grows the customer database as a side effect.
-- ---------------------------------------------------------------------------
create table public.trip_invitations (
  id                     uuid primary key default gen_random_uuid(),
  trip_id                uuid not null references public.trips(id) on delete cascade,
  invited_email          text not null,
  invited_name           text,
  invited_by_customer_id uuid references public.customers(id) on delete set null,
  invited_by_staff_id    uuid references public.staff_users(id) on delete set null,

  token                  text not null unique,
  status                 text not null default 'pending'
                         check (status in ('pending', 'accepted', 'declined', 'revoked', 'expired')),
  expires_at             timestamptz not null,
  accepted_at            timestamptz,
  accepted_customer_id   uuid references public.customers(id) on delete set null,
  created_at             timestamptz not null default now(),

  unique (trip_id, invited_email)
);

create index trip_invitations_trip on public.trip_invitations (trip_id);

select public.apply_staff_rls('trip_invitations');

-- ---------------------------------------------------------------------------
-- Services — what is actually booked.
--
-- Columns between `kind` and `price_excludes_gst` are the SHARED CORE SET,
-- mirroring public.quotation_items exactly so Won -> Trip is a copy.
--
-- supplier_id, supplier_cost and margin never appear in any portal view.
-- ---------------------------------------------------------------------------
create table public.services (
  id                       uuid primary key default gen_random_uuid(),
  trip_id                  uuid not null references public.trips(id) on delete cascade,
  source_quotation_item_id uuid references public.quotation_items(id) on delete set null,
  supplier_id              uuid references public.suppliers(id) on delete set null,
  sort_order               integer not null default 0,

  kind                     text not null
                           check (kind in ('flight', 'hotel', 'visa', 'forex', 'transfer',
                                           'activity', 'insurance', 'other')),
  title                    text not null,
  description              text,
  start_date               date,
  end_date                 date,
  qty                      numeric(10,2) not null default 1 check (qty > 0),
  unit                     text,
  customer_price           numeric(14,2) not null default 0 check (customer_price >= 0),
  price_excludes_gst       boolean not null default false,

  supplier_cost            numeric(14,2) not null default 0 check (supplier_cost >= 0),

  start_time               time,
  end_time                 time,
  location                 text,
  confirmation_number      text,
  status                   text not null default 'pending'
                           check (status in ('pending', 'requested', 'confirmed', 'cancelled')),
  customer_visible         boolean not null default true,
  meta                     jsonb not null default '{}'::jsonb,

  line_total               numeric(14,2)
                           generated always as (round(qty * customer_price, 2)) stored,
  margin                   numeric(14,2)
                           generated always as (round(qty * customer_price, 2) - supplier_cost) stored,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index services_trip on public.services (trip_id, sort_order);
create index services_supplier on public.services (supplier_id);
create index services_kind on public.services (trip_id, kind);

create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

select public.apply_staff_rls('services');

-- ---------------------------------------------------------------------------
-- Itinerary — a narrative, not just services sorted by date. Day 3 has a title
-- and prose of its own, and may or may not point at a booked service.
-- ---------------------------------------------------------------------------
create table public.itinerary_days (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips(id) on delete cascade,
  day_number integer not null check (day_number >= 1),
  date       date,
  title      text,
  summary    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (trip_id, day_number)
);

create trigger itinerary_days_set_updated_at
  before update on public.itinerary_days
  for each row execute function public.set_updated_at();

select public.apply_staff_rls('itinerary_days');

create table public.itinerary_items (
  id               uuid primary key default gen_random_uuid(),
  itinerary_day_id uuid not null references public.itinerary_days(id) on delete cascade,
  service_id       uuid references public.services(id) on delete set null,
  sort_order       integer not null default 0,
  time_label       text,
  title            text not null,
  description      text,
  created_at       timestamptz not null default now()
);

create index itinerary_items_day on public.itinerary_items (itinerary_day_id, sort_order);

select public.apply_staff_rls('itinerary_items');
