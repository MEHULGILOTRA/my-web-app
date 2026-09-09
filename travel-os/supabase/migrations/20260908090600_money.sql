-- Layer 6 — payables and payments.
--
-- No invoices table. The business does not issue customer invoices from this
-- system, and Tally remains the legal book of record. Revisit only if corporate
-- volume arrives.
--
-- A payable is a scheduled obligation (has a due date, drives the alert).
-- A payment is a fact that happened. Keeping them separate is what makes
-- "5 supplier payments due this week" answerable.

create table public.payables (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid references public.trips(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  service_id  uuid references public.services(id) on delete set null,

  description text,
  amount      numeric(14,2) not null check (amount >= 0),
  currency    char(3) not null default 'INR',
  due_date    date not null,

  status      text not null default 'due'
              check (status in ('due', 'partially_paid', 'paid', 'cancelled')),

  notes       text,
  created_by  uuid references public.staff_users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Overdue is derived from due_date rather than stored, so it can never go stale.
create index payables_due on public.payables (due_date) where status in ('due', 'partially_paid');
create index payables_supplier on public.payables (supplier_id);
create index payables_trip on public.payables (trip_id);

create trigger payables_set_updated_at
  before update on public.payables
  for each row execute function public.set_updated_at();

select public.apply_staff_rls('payables');

-- ---------------------------------------------------------------------------
-- Payments, both directions.
--
-- Razorpay columns are here from the start because the business is already live
-- on Razorpay; Phase 5 wires the payment links and webhook.
-- ---------------------------------------------------------------------------
create table public.payments (
  id                       uuid primary key default gen_random_uuid(),
  direction                text not null check (direction in ('inbound', 'outbound')),

  trip_id                  uuid references public.trips(id) on delete set null,
  customer_id              uuid references public.customers(id) on delete set null,
  supplier_id              uuid references public.suppliers(id) on delete set null,
  payable_id               uuid references public.payables(id) on delete set null,

  amount                   numeric(14,2) not null check (amount > 0),
  currency                 char(3) not null default 'INR',

  method                   text not null default 'bank_transfer'
                           check (method in ('upi', 'bank_transfer', 'card', 'cash',
                                             'cheque', 'razorpay', 'other')),
  status                   text not null default 'cleared'
                           check (status in ('pending', 'cleared', 'failed', 'refunded')),

  reference_no             text,
  razorpay_payment_link_id text,
  razorpay_payment_id      text,
  razorpay_order_id        text,

  paid_on                  date,
  notes                    text,
  recorded_by              uuid references public.staff_users(id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  -- Money in comes from a customer; money out goes to a supplier. Without this
  -- an outbound payment can silently be recorded against nobody.
  constraint payments_counterparty check (
    (direction = 'inbound'  and customer_id is not null) or
    (direction = 'outbound' and supplier_id is not null)
  )
);

create index payments_trip on public.payments (trip_id);
create index payments_customer on public.payments (customer_id);
create index payments_supplier on public.payments (supplier_id);
create index payments_paid_on on public.payments (paid_on desc nulls last);
create unique index payments_razorpay_payment_id_key
  on public.payments (razorpay_payment_id) where razorpay_payment_id is not null;

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

select public.apply_staff_rls('payments');
