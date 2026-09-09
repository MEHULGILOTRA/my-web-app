-- Layer 8 — the customer-facing read boundary.
--
-- THIS IS THE FILE THAT ENFORCES THE PRIVACY RULE. Read before changing.
--
-- Supplier identity, our costs and our margins must never reach a customer.
-- Stating that as a policy is not enforcement — "just don't select those
-- columns" fails the first time somebody adds a convenience endpoint.
--
-- How it actually works:
--
--   1. Every view below physically omits supplier_id, supplier_cost,
--      est_supplier_cost and margin. A column that is not in the view cannot be
--      selected through it.
--   2. portal_reader is a dedicated Postgres role with ZERO privileges on any
--      base table. It can only reach these views.
--   3. Postgres views execute with the privileges of the view OWNER. That is
--      why portal_reader needs no base-table grants — and why these views must
--      NOT be created with security_invoker = true. Do not add that option.
--   4. `npm run test:privacy` asserts (2) against the live database, because a
--      view is only a boundary if the role cannot go around it.
--
-- Row scoping — which customer sees which trip — is applied by the queries in
-- src/lib/db/portal.ts using the authenticated session, and is layered on top
-- of this, not a substitute for it.

-- ---------------------------------------------------------------------------
-- Customer identity: maps a Supabase auth user to a customer record.
-- ---------------------------------------------------------------------------
create view public.portal_customer_v as
select
  c.id,
  c.portal_user_id,
  c.full_name,
  c.email,
  c.phone_e164,
  c.dob,
  c.anniversary
from public.customers c
where c.merged_into_customer_id is null;

-- ---------------------------------------------------------------------------
-- Trip membership. This is the authorisation source: a customer sees a trip
-- because they have a row here — never because they share a household.
-- ---------------------------------------------------------------------------
create view public.portal_trip_traveller_v as
select
  tt.id,
  tt.trip_id,
  tt.customer_id,
  tt.is_travelling,
  tt.is_booker,
  tt.is_payer
from public.trip_travellers tt;

create view public.portal_trip_v as
select
  t.id,
  t.reference,
  t.title,
  t.destination,
  t.is_international,
  t.start_date,
  t.end_date,
  t.status,
  t.currency,
  t.total_customer_price,
  t.itinerary_published,
  t.emergency_contacts
from public.trips t
where t.portal_enabled;

-- Excludes supplier_id, supplier_cost and margin. Also hides services the team
-- has not chosen to show.
create view public.portal_service_v as
select
  s.id,
  s.trip_id,
  s.sort_order,
  s.kind,
  s.title,
  s.description,
  s.start_date,
  s.end_date,
  s.start_time,
  s.end_time,
  s.location,
  s.confirmation_number,
  s.status,
  s.qty,
  s.unit,
  s.customer_price,
  s.line_total
from public.services s
where s.customer_visible;

create view public.portal_itinerary_day_v as
select d.id, d.trip_id, d.day_number, d.date, d.title, d.summary
from public.itinerary_days d
join public.trips t on t.id = d.trip_id
where t.itinerary_published;

create view public.portal_itinerary_item_v as
select i.id, i.itinerary_day_id, i.service_id, i.sort_order, i.time_label, i.title, i.description
from public.itinerary_items i
join public.itinerary_days d on d.id = i.itinerary_day_id
join public.trips t on t.id = d.trip_id
where t.itinerary_published;

-- Metadata only. The file itself is reached through a short-lived signed URL
-- minted server-side and written to document_access_log first.
create view public.portal_document_v as
select
  d.id,
  d.bucket,
  d.storage_path,
  d.filename,
  d.mime_type,
  d.size_bytes,
  d.doc_type,
  d.owner_type,
  d.owner_id,
  d.created_at
from public.documents d
where d.customer_visible;

-- Balance due. Aggregates only — no per-payment supplier detail escapes.
create view public.portal_trip_balance_v as
select
  t.id as trip_id,
  t.currency,
  t.total_customer_price as total,
  coalesce(sum(p.amount) filter (
    where p.direction = 'inbound' and p.status = 'cleared'
  ), 0)::numeric(14,2) as paid,
  (t.total_customer_price - coalesce(sum(p.amount) filter (
    where p.direction = 'inbound' and p.status = 'cleared'
  ), 0))::numeric(14,2) as balance
from public.trips t
left join public.payments p on p.trip_id = t.id
group by t.id, t.currency, t.total_customer_price;

create view public.portal_cross_sell_v as
select cs.id, cs.trip_id, cs.customer_id, cs.rule_key, cs.suggested_kind, cs.headline, cs.status
from public.cross_sell_suggestions cs
where cs.status in ('suggested', 'shown');

-- ---------------------------------------------------------------------------
-- Quotations. Phase 2 serves /q/[token] from these.
--
-- A sent quotation renders from `snapshot`, frozen at send time. Note that the
-- application is responsible for building that snapshot without cost data —
-- the view can only guarantee the columns, not the contents of a jsonb blob.
-- ---------------------------------------------------------------------------
create view public.portal_quotation_v as
select
  q.id,
  q.reference,
  q.version,
  q.title,
  q.status,
  q.currency,
  q.subtotal,
  q.discount,
  q.total,
  q.is_international,
  q.tcs_rate_percent,
  q.tcs_note,
  q.terms,
  q.valid_until,
  q.share_token,
  q.snapshot,
  q.sent_at
from public.quotations q
where q.status in ('sent', 'viewed', 'accepted', 'declined', 'expired');

-- Excludes est_supplier_cost.
create view public.portal_quotation_item_v as
select
  qi.id,
  qi.quotation_id,
  qi.sort_order,
  qi.kind,
  qi.title,
  qi.description,
  qi.start_date,
  qi.end_date,
  qi.qty,
  qi.unit,
  qi.customer_price,
  qi.price_excludes_gst,
  qi.is_optional,
  qi.is_included,
  qi.line_total
from public.quotation_items qi;

create view public.portal_quotation_day_plan_v as
select dp.id, dp.quotation_id, dp.day_number, dp.date, dp.title, dp.description
from public.quotation_day_plan dp;

-- ---------------------------------------------------------------------------
-- The portal_reader role.
--
-- Created NOLOGIN here because a migration must not contain a password. Grant
-- it a password once, out of band, then put that connection string in
-- PORTAL_DATABASE_URL:
--
--   alter role portal_reader with login password '<generated>';
--
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'portal_reader') then
    create role portal_reader nologin noinherit;
  end if;
end
$$;

-- Start from nothing, every time this migration is applied.
revoke all on all tables in schema public from portal_reader;
revoke all on all sequences in schema public from portal_reader;
revoke all on all functions in schema public from portal_reader;
revoke all on schema public from portal_reader;

-- Future tables must not become readable by accident.
alter default privileges in schema public revoke all on tables from portal_reader;

grant usage on schema public to portal_reader;

grant select on
  public.portal_customer_v,
  public.portal_trip_traveller_v,
  public.portal_trip_v,
  public.portal_service_v,
  public.portal_itinerary_day_v,
  public.portal_itinerary_item_v,
  public.portal_document_v,
  public.portal_trip_balance_v,
  public.portal_cross_sell_v,
  public.portal_quotation_v,
  public.portal_quotation_item_v,
  public.portal_quotation_day_plan_v
to portal_reader;
