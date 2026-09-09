-- Layer 7 — documents, audit, timeline, messaging, retention, cross-sell, reviews.

-- ---------------------------------------------------------------------------
-- Documents. Polymorphic owner, private buckets only.
--
-- customer_visible defaults to FALSE. A document becomes visible to the
-- customer by an explicit decision, never by accident.
--
-- Documents are always served behind login — they carry passport and PAN
-- details, so a shareable link is not acceptable. Every signed URL is minted in
-- exactly one place and logged before it is returned.
-- ---------------------------------------------------------------------------
create table public.documents (
  id               uuid primary key default gen_random_uuid(),
  bucket           text not null default 'trip-documents',
  storage_path     text not null unique,
  filename         text not null,
  mime_type        text,
  size_bytes       bigint check (size_bytes >= 0),

  doc_type         text not null default 'other'
                   check (doc_type in ('ticket', 'hotel_voucher', 'visa', 'insurance',
                                       'passport', 'pan', 'itinerary', 'quote',
                                       'receipt', 'other')),

  owner_type       text not null
                   check (owner_type in ('trip', 'service', 'customer', 'quotation',
                                         'payment', 'lead')),
  owner_id         uuid not null,

  customer_visible boolean not null default false,

  -- Identity documents attract a stricter retention policy in Phase 6.
  is_sensitive     boolean not null
                   generated always as (doc_type in ('passport', 'pan')) stored,

  uploaded_by      uuid references public.staff_users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index documents_owner on public.documents (owner_type, owner_id);
create index documents_visible on public.documents (owner_type, owner_id) where customer_visible;

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

select public.apply_staff_rls('documents');

-- Written before a signed URL is returned, never after. Required to evidence
-- who accessed identity documents.
create table public.document_access_log (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  actor_type  text not null check (actor_type in ('staff', 'customer', 'system')),
  actor_id    uuid,
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index document_access_log_document on public.document_access_log (document_id, created_at desc);

select public.apply_staff_rls('document_access_log');

-- ---------------------------------------------------------------------------
-- Timeline: the human-readable customer story.
--
-- Deliberately separate from audit_log. "Customer requested a cheaper hotel" is
-- not a database change and no trigger can generate it; "supplier_cost changed
-- from 53000 to 54200" is not something anyone wants in the story view.
-- ---------------------------------------------------------------------------
create table public.timeline_events (
  id             uuid primary key default gen_random_uuid(),
  event_type     text not null,   -- 'lead_created', 'quote_sent', 'note', ...

  customer_id    uuid references public.customers(id) on delete cascade,
  household_id   uuid references public.households(id) on delete cascade,
  lead_id        uuid references public.leads(id) on delete cascade,
  trip_id        uuid references public.trips(id) on delete cascade,
  quotation_id   uuid references public.quotations(id) on delete cascade,

  actor_type     text not null default 'staff'
                 check (actor_type in ('staff', 'customer', 'system')),
  actor_staff_id uuid references public.staff_users(id) on delete set null,

  title          text not null,
  body           text,
  meta           jsonb not null default '{}'::jsonb,

  occurred_at    timestamptz not null default now(),
  created_at     timestamptz not null default now(),

  -- An event with no subject is unreachable in every UI that reads this table.
  constraint timeline_events_has_subject check (
    customer_id is not null or household_id is not null or lead_id is not null
    or trip_id is not null or quotation_id is not null
  )
);

create index timeline_events_customer on public.timeline_events (customer_id, occurred_at desc);
create index timeline_events_lead on public.timeline_events (lead_id, occurred_at desc);
create index timeline_events_trip on public.timeline_events (trip_id, occurred_at desc);

select public.apply_staff_rls('timeline_events');

-- ---------------------------------------------------------------------------
-- Audit log: trigger-generated, financial tables only. Nobody reads it until
-- they need it.
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id          bigserial primary key,
  table_name  text not null,
  record_id   uuid,
  action      text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_values  jsonb,
  new_values  jsonb,
  changed_by  uuid,
  changed_at  timestamptz not null default now()
);

create index audit_log_record on public.audit_log (table_name, record_id, changed_at desc);

select public.apply_staff_rls('audit_log');

create or replace function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rec_id uuid;
begin
  begin
    rec_id := coalesce((to_jsonb(new) ->> 'id')::uuid, (to_jsonb(old) ->> 'id')::uuid);
  exception when others then
    rec_id := null;
  end;

  insert into public.audit_log (table_name, record_id, action, old_values, new_values, changed_by)
  values (
    tg_table_name,
    rec_id,
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end,
    auth.uid()
  );

  return coalesce(new, old);
end;
$$;

create trigger payments_audit
  after insert or update or delete on public.payments
  for each row execute function public.audit_row();

create trigger payables_audit
  after insert or update or delete on public.payables
  for each row execute function public.audit_row();

create trigger services_audit
  after insert or update or delete on public.services
  for each row execute function public.audit_row();

create trigger quotations_audit
  after insert or update or delete on public.quotations
  for each row execute function public.audit_row();

-- ---------------------------------------------------------------------------
-- Message log.
--
-- No WhatsApp API is wired up and none is planned for now. The 'manual_whatsapp'
-- channel records that a staff member copied a message and pasted it themselves,
-- which is what makes "did we follow this quote up?" answerable.
-- ---------------------------------------------------------------------------
create table public.message_log (
  id                  uuid primary key default gen_random_uuid(),
  channel             text not null
                      check (channel in ('manual_whatsapp', 'email', 'sms', 'whatsapp_api')),
  direction           text not null default 'outbound'
                      check (direction in ('inbound', 'outbound')),

  to_address          text,
  customer_id         uuid references public.customers(id) on delete set null,
  lead_id             uuid references public.leads(id) on delete set null,
  trip_id             uuid references public.trips(id) on delete set null,
  quotation_id        uuid references public.quotations(id) on delete set null,

  template_key        text,
  subject             text,
  body                text,
  provider_message_id text,
  status              text not null default 'logged'
                      check (status in ('logged', 'queued', 'sent', 'delivered', 'read', 'failed')),
  error               text,

  sent_by             uuid references public.staff_users(id) on delete set null,
  sent_at             timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

create index message_log_customer on public.message_log (customer_id, sent_at desc);
create index message_log_quotation on public.message_log (quotation_id, sent_at desc);

select public.apply_staff_rls('message_log');

-- ---------------------------------------------------------------------------
-- Deletion requests.
--
-- The business rule: customer data is deleted only when the customer asks for
-- it. On request the admin downloads a complete export first; the purge is only
-- allowed once that export exists. Financial rows are anonymised rather than
-- destroyed, since they are likely needed for tax.
-- ---------------------------------------------------------------------------
create table public.deletion_requests (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references public.customers(id) on delete cascade,

  requested_at timestamptz not null default now(),
  requested_via text not null default 'portal'
               check (requested_via in ('portal', 'email', 'phone', 'staff')),

  status       text not null default 'requested'
               check (status in ('requested', 'exported', 'purged', 'cancelled')),

  exported_at  timestamptz,
  exported_by  uuid references public.staff_users(id) on delete set null,
  export_path  text,

  purged_at    timestamptz,
  purged_by    uuid references public.staff_users(id) on delete set null,

  notes        text,

  -- Cannot mark data purged without having produced the export first.
  constraint deletion_requests_export_before_purge
    check (status <> 'purged' or exported_at is not null)
);

create index deletion_requests_status on public.deletion_requests (status, requested_at);

select public.apply_staff_rls('deletion_requests');

-- ---------------------------------------------------------------------------
-- Cross-sell.
--
-- Gap detection against what is already booked on a trip: hotel but no flight,
-- international but no visa, no forex, no airport transfer, no activities.
-- "I'm interested" creates a lead, which is the loop that turns the portal into
-- revenue rather than a document viewer.
-- ---------------------------------------------------------------------------
create table public.cross_sell_suggestions (
  id                uuid primary key default gen_random_uuid(),
  trip_id           uuid not null references public.trips(id) on delete cascade,
  customer_id       uuid references public.customers(id) on delete set null,

  rule_key          text not null,
  suggested_kind    text not null
                    check (suggested_kind in ('flight', 'hotel', 'visa', 'forex', 'transfer',
                                              'activity', 'insurance', 'other')),
  headline          text not null,

  status            text not null default 'suggested'
                    check (status in ('suggested', 'shown', 'interested', 'dismissed', 'converted')),
  interested_at     timestamptz,
  converted_lead_id uuid references public.leads(id) on delete set null,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  unique (trip_id, rule_key)
);

create trigger cross_sell_suggestions_set_updated_at
  before update on public.cross_sell_suggestions
  for each row execute function public.set_updated_at();

select public.apply_staff_rls('cross_sell_suggestions');

-- ---------------------------------------------------------------------------
-- Post-trip reviews.
--
-- Captured in the portal, stored strictly in the CRM. NOT displayed publicly
-- and NOT routed to Google — the Business Profile is not active, and rating-
-- based routing to it would be review gating in any case. A low score raises an
-- internal alert so service recovery can happen before the customer writes.
-- ---------------------------------------------------------------------------
create table public.reviews (
  id               uuid primary key default gen_random_uuid(),
  trip_id          uuid not null references public.trips(id) on delete cascade,
  customer_id      uuid not null references public.customers(id) on delete cascade,

  rating           smallint not null check (rating between 1 and 5),
  feedback         text,

  admin_alerted_at timestamptz,
  admin_notes      text,
  resolved_at      timestamptz,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  unique (trip_id, customer_id)
);

create index reviews_low_ratings on public.reviews (created_at desc) where rating <= 3;

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

select public.apply_staff_rls('reviews');
