-- Layer 4 — quotations, their line items, and the day plan.
--
-- Immutability rule: once a quotation is sent it is frozen. It is never edited,
-- only superseded by a new version via parent_quotation_id. `snapshot` holds the
-- rendered customer-facing payload at send time, so a link sent in August still
-- shows the August price even after the underlying rates are corrected.
--
-- snapshot MUST NOT contain est_supplier_cost or any derived margin. It is
-- served to customers through portal_quotation_v.

create table public.quotations (
  id                   uuid primary key default gen_random_uuid(),
  lead_id              uuid not null references public.leads(id) on delete cascade,
  parent_quotation_id  uuid references public.quotations(id) on delete set null,
  version              integer not null default 1 check (version >= 1),
  reference            text unique,

  title                text,
  status               text not null default 'draft'
                       check (status in ('draft', 'sent', 'viewed', 'accepted',
                                         'declined', 'superseded', 'expired')),

  currency             char(3) not null default 'INR',
  subtotal             numeric(14,2) not null default 0,
  discount             numeric(14,2) not null default 0 check (discount >= 0),
  total                numeric(14,2) not null default 0,

  -- TCS is a disclosure, not a line item: it is excluded from `total`.
  -- Both rate and wording are snapshotted here so a historical quote keeps the
  -- text it was actually sent with, even after the setting changes.
  is_international     boolean not null default false,
  tcs_rate_percent     numeric(5,2),
  tcs_note             text,

  terms                text,
  valid_until          date,

  share_token          text unique,
  snapshot             jsonb,

  sent_at              timestamptz,
  viewed_at            timestamptz,
  decided_at           timestamptz,

  created_by           uuid references public.staff_users(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint quotations_version_unique unique (lead_id, version),
  constraint quotations_not_own_parent
    check (parent_quotation_id is null or parent_quotation_id <> id),
  -- A sent quote must carry the frozen payload that will be served to the
  -- customer. Enforced here rather than trusted to application code.
  constraint quotations_sent_requires_snapshot
    check (status = 'draft' or snapshot is not null)
);

create index quotations_lead on public.quotations (lead_id);
create index quotations_status on public.quotations (status);

create trigger quotations_set_updated_at
  before update on public.quotations
  for each row execute function public.set_updated_at();

select public.apply_staff_rls('quotations');

-- ---------------------------------------------------------------------------
-- Quotation line items.
--
-- The columns between `kind` and `price_excludes_gst` are the SHARED CORE SET,
-- mirrored exactly by public.services. Keeping them identical is what makes
-- Won -> Trip a copy rather than manual re-entry. If you add a column to one,
-- add it to the other.
--
-- est_supplier_cost lives here so margin is visible while building the quote.
-- It is never exposed through any portal view.
-- ---------------------------------------------------------------------------
create table public.quotation_items (
  id                 uuid primary key default gen_random_uuid(),
  quotation_id       uuid not null references public.quotations(id) on delete cascade,
  sort_order         integer not null default 0,

  kind               text not null
                     check (kind in ('flight', 'hotel', 'visa', 'forex', 'transfer',
                                     'activity', 'insurance', 'other')),
  title              text not null,
  description        text,
  start_date         date,
  end_date           date,
  qty                numeric(10,2) not null default 1 check (qty > 0),
  unit               text,
  customer_price     numeric(14,2) not null default 0 check (customer_price >= 0),
  price_excludes_gst boolean not null default false,

  est_supplier_cost  numeric(14,2) not null default 0 check (est_supplier_cost >= 0),

  is_optional        boolean not null default false,
  is_included        boolean not null default true,
  meta               jsonb not null default '{}'::jsonb,

  line_total         numeric(14,2)
                     generated always as (round(qty * customer_price, 2)) stored,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index quotation_items_quotation on public.quotation_items (quotation_id, sort_order);

create trigger quotation_items_set_updated_at
  before update on public.quotation_items
  for each row execute function public.set_updated_at();

select public.apply_staff_rls('quotation_items');

-- Optional day-by-day narrative attached to a proposal.
create table public.quotation_day_plan (
  id           uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  day_number   integer not null check (day_number >= 1),
  date         date,
  title        text,
  description  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  unique (quotation_id, day_number)
);

create trigger quotation_day_plan_set_updated_at
  before update on public.quotation_day_plan
  for each row execute function public.set_updated_at();

select public.apply_staff_rls('quotation_day_plan');
