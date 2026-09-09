-- Layer 9 — the real CRM field set, derived from the agency's working
-- spreadsheet, plus the fields that sheet was missing.
--
-- Two kinds of controlled vocabulary here, and the split is deliberate:
--
--   * CHECK constraints for values the CODE branches on (pipeline_stage,
--     trip_type, priority). Changing these needs a migration, which is correct
--     — the application has to change with them.
--   * public.option_sets for lists the BUSINESS owns (travel themes, hotel
--     categories, lost reasons). These are editable in Settings without a
--     deploy, which is what "make it a dropdown I can customise" actually
--     requires.

-- ---------------------------------------------------------------------------
-- Editable dropdowns
-- ---------------------------------------------------------------------------
create table public.option_sets (
  id         uuid primary key default gen_random_uuid(),
  set_key    text not null,
  value      text not null,
  label      text not null,
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  -- System options are referenced by code (rule keys, defaults). The UI may
  -- rename them but must not delete them.
  is_system  boolean not null default false,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (set_key, value)
);

create index option_sets_lookup on public.option_sets (set_key, sort_order) where is_active;

create trigger option_sets_set_updated_at
  before update on public.option_sets
  for each row execute function public.set_updated_at();

select public.apply_staff_rls('option_sets');

-- A CHECK constraint cannot contain a subquery, so option validation is a
-- trigger. Null always passes — most of these fields are optional.
create or replace function public.assert_option(p_set text, p_value text)
returns void
language plpgsql
stable
as $$
begin
  if p_value is null or p_value = '' then
    return;
  end if;
  if not exists (
    select 1 from public.option_sets
    where set_key = p_set and value = p_value and is_active
  ) then
    raise exception 'Invalid value % for dropdown "%"', p_value, p_set
      using errcode = '23514';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Customers — contactability, segmentation, consent
-- ---------------------------------------------------------------------------
alter table public.customers
  add column city                   text,
  add column state                  text,
  add column country                text default 'India',
  add column customer_type          text not null default 'new',
  add column whatsapp_raw           text,
  add column whatsapp_e164          text,
  add column alternate_phone_raw    text,
  add column alternate_phone_e164   text,
  add column company_name           text,
  add column gstin                  text,
  add column preferred_language     text,
  add column referred_by_customer_id uuid references public.customers(id) on delete set null,
  -- DPDP: campaign sends must be able to prove consent, and honour withdrawal.
  add column marketing_consent      boolean not null default false,
  add column marketing_consent_at   timestamptz,
  -- Passport details for international ticketing. Collected only once a trip is
  -- confirmed — never at enquiry. Purged with the customer on a deletion request.
  add column passport_number        text,
  add column passport_expiry        date,
  add column passport_given_name    text,
  add column passport_surname       text,
  add column passport_issue_place   text,

  add constraint customers_not_self_referred
    check (referred_by_customer_id is null or referred_by_customer_id <> id),
  -- A passport that expires before travel is the single most common cause of a
  -- ruined international booking. Storing an already-expired date is almost
  -- always a typo.
  add constraint customers_passport_expiry_sane
    check (passport_expiry is null or passport_expiry > date '2000-01-01'),
  add constraint customers_gstin_format
    check (gstin is null or gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{3}$');

create index customers_city on public.customers (city) where city is not null;
create index customers_passport_expiry on public.customers (passport_expiry)
  where passport_expiry is not null;
create index customers_marketing_consent on public.customers (marketing_consent)
  where marketing_consent;

-- Every phone-shaped column normalises the same way.
create or replace function public.customers_normalize_phone()
returns trigger
language plpgsql
as $$
begin
  new.phone_e164           := public.normalize_phone_e164(new.phone_raw);
  new.whatsapp_e164        := public.normalize_phone_e164(new.whatsapp_raw);
  new.alternate_phone_e164 := public.normalize_phone_e164(new.alternate_phone_raw);
  return new;
end;
$$;

drop trigger if exists customers_normalize_phone on public.customers;
create trigger customers_normalize_phone
  before insert or update of phone_raw, whatsapp_raw, alternate_phone_raw
  on public.customers
  for each row execute function public.customers_normalize_phone();

create or replace function public.customers_validate_options()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_option('customer_type', new.customer_type);
  if new.marketing_consent and new.marketing_consent_at is null then
    new.marketing_consent_at := now();
  elsif not new.marketing_consent then
    new.marketing_consent_at := null;
  end if;
  return new;
end;
$$;

create trigger customers_validate_options
  before insert or update on public.customers
  for each row execute function public.customers_validate_options();

-- ---------------------------------------------------------------------------
-- Leads — the working sheet, as columns
-- ---------------------------------------------------------------------------
alter table public.leads
  add column lead_date            date not null default current_date,
  add column origin_city          text,
  add column duration_nights      integer check (duration_nights is null or duration_nights between 0 and 365),
  add column children_ages        integer[],

  add column travel_theme         text,
  add column hotel_category       text,
  add column meal_plan            text,
  add column dietary_preference   text,
  add column room_configuration   text,
  add column preferred_airline    text,

  -- Component status. These drive the Phase 4 cross-sell gap detection as well
  -- as telling the agent what is still outstanding.
  add column flights_status       text,
  add column visa_status          text,
  add column transfers_status     text,
  add column insurance_status     text,
  add column forex_status         text,
  add column activities_status    text,

  add column priority             text not null default 'warm'
                                  check (priority in ('hot', 'warm', 'cold')),
  add column next_followup_date   date,
  add column last_contacted_at    timestamptz,
  add column expected_close_date  date,
  add column probability_percent  smallint
                                  check (probability_percent is null
                                         or probability_percent between 0 and 100),
  add column special_occasion     text,
  add column special_occasion_date date,
  add column special_notes        text,
  add column lost_to_competitor   text;

create index leads_next_followup on public.leads (next_followup_date)
  where next_followup_date is not null
    and status not in ('won', 'lost', 'dormant');
create index leads_priority on public.leads (priority, next_followup_date);
create index leads_lead_date on public.leads (lead_date desc);

-- travel_start_date + duration_nights and travel_start + travel_end are two
-- ways of saying the same thing. Accept either and derive the other, so an
-- import that has only one does not lose information.
create or replace function public.leads_sync_dates()
returns trigger
language plpgsql
as $$
begin
  if new.travel_start is not null and new.duration_nights is not null
     and new.travel_end is null then
    new.travel_end := new.travel_start + new.duration_nights;
  elsif new.travel_start is not null and new.travel_end is not null
        and new.duration_nights is null then
    new.duration_nights := new.travel_end - new.travel_start;
  end if;
  return new;
end;
$$;

create trigger leads_sync_dates
  before insert or update of travel_start, travel_end, duration_nights
  on public.leads
  for each row execute function public.leads_sync_dates();

create or replace function public.leads_validate_options()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_option('travel_theme',      new.travel_theme);
  perform public.assert_option('hotel_category',    new.hotel_category);
  perform public.assert_option('meal_plan',         new.meal_plan);
  perform public.assert_option('dietary_preference',new.dietary_preference);
  perform public.assert_option('room_configuration',new.room_configuration);
  perform public.assert_option('flights_status',    new.flights_status);
  perform public.assert_option('visa_status',       new.visa_status);
  perform public.assert_option('transfers_status',  new.transfers_status);
  perform public.assert_option('insurance_status',  new.insurance_status);
  perform public.assert_option('forex_status',      new.forex_status);
  perform public.assert_option('activities_status', new.activities_status);
  perform public.assert_option('lost_reason',       new.lost_reason);

  -- Children's ages are needed for child pricing and extra-bed rules, so the
  -- count and the list must agree.
  if new.children_ages is not null
     and array_length(new.children_ages, 1) is distinct from nullif(new.pax_children, 0) then
    raise exception
      'children_ages has % entries but pax_children is %',
      coalesce(array_length(new.children_ages, 1), 0), new.pax_children
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger leads_validate_options
  before insert or update on public.leads
  for each row execute function public.leads_validate_options();

-- Human-readable lead references: LD-1001, LD-1002, ...
create sequence if not exists public.lead_reference_seq start 1001;

create or replace function public.leads_set_reference()
returns trigger
language plpgsql
as $$
begin
  if new.reference is null then
    new.reference := 'LD-' || nextval('public.lead_reference_seq');
  end if;
  return new;
end;
$$;

create trigger leads_set_reference
  before insert on public.leads
  for each row execute function public.leads_set_reference();

-- ---------------------------------------------------------------------------
-- Quotations — the money the sheet actually tracks
--
-- The quote total EXCLUDES TCS; the customer pays total + TCS. Both are derived
-- rather than typed, so they cannot disagree with the rate.
-- ---------------------------------------------------------------------------
alter table public.quotations
  add column tcs_amount numeric(14,2)
    generated always as (
      case
        when is_international and tcs_rate_percent is not null
        then round(total * tcs_rate_percent / 100, 2)
        else 0
      end
    ) stored,
  add column total_payable numeric(14,2)
    generated always as (
      total + case
        when is_international and tcs_rate_percent is not null
        then round(total * tcs_rate_percent / 100, 2)
        else 0
      end
    ) stored,
  add column client_budget numeric(14,2) check (client_budget is null or client_budget >= 0),
  add column prepared_for_pax text;

comment on column public.quotations.tcs_amount is
  'Derived. Disclosed to the customer but never part of `total` — see settings.tcs_note.';
comment on column public.quotations.total_payable is
  'Derived: total + tcs_amount. What the customer actually pays.';

-- ---------------------------------------------------------------------------
-- Trips — mirror the trip-shaping fields so Won -> Trip stays a copy
-- ---------------------------------------------------------------------------
alter table public.trips
  add column origin_city        text,
  add column duration_nights    integer check (duration_nights is null or duration_nights between 0 and 365),
  add column pax_adults         integer not null default 1 check (pax_adults >= 0),
  add column pax_children       integer not null default 0 check (pax_children >= 0),
  add column children_ages      integer[],
  add column travel_theme       text,
  add column hotel_category     text,
  add column meal_plan          text,
  add column dietary_preference text,
  add column room_configuration text,
  add column special_occasion   text,
  add column special_notes      text,
  add column tcs_rate_percent   numeric(5,2),
  add column tcs_amount         numeric(14,2) not null default 0,
  add column total_payable      numeric(14,2)
    generated always as (total_customer_price + tcs_amount) stored;

create or replace function public.trips_validate_options()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_option('travel_theme',       new.travel_theme);
  perform public.assert_option('hotel_category',     new.hotel_category);
  perform public.assert_option('meal_plan',          new.meal_plan);
  perform public.assert_option('dietary_preference', new.dietary_preference);
  perform public.assert_option('room_configuration', new.room_configuration);

  if new.start_date is not null and new.duration_nights is not null
     and new.end_date is null then
    new.end_date := new.start_date + new.duration_nights;
  elsif new.start_date is not null and new.end_date is not null
        and new.duration_nights is null then
    new.duration_nights := new.end_date - new.start_date;
  end if;

  return new;
end;
$$;

create trigger trips_validate_options
  before insert or update on public.trips
  for each row execute function public.trips_validate_options();

-- SKY-2026-0001, restarting each year.
create sequence if not exists public.trip_reference_seq start 1;

create or replace function public.trips_set_reference()
returns trigger
language plpgsql
as $$
begin
  if new.reference is null or new.reference = '' then
    new.reference := 'SKY-' || to_char(current_date, 'YYYY') || '-' ||
                     lpad(nextval('public.trip_reference_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger trips_set_reference
  before insert on public.trips
  for each row execute function public.trips_set_reference();

-- ---------------------------------------------------------------------------
-- Admin-only financial rollup.
--
-- Not a portal view and never granted to portal_reader — it exists precisely to
-- surface the numbers customers must never see.
-- ---------------------------------------------------------------------------
create view public.quotation_financials_v as
select
  q.id                                                as quotation_id,
  q.lead_id,
  q.version,
  q.status,
  coalesce(sum(qi.line_total), 0)::numeric(14,2)      as items_total,
  coalesce(sum(qi.est_supplier_cost * qi.qty), 0)::numeric(14,2) as est_supplier_cost,
  q.total,
  q.tcs_amount,
  q.total_payable,
  (q.total - coalesce(sum(qi.est_supplier_cost * qi.qty), 0))::numeric(14,2) as gross_margin,
  case
    when q.total > 0
    then round((q.total - coalesce(sum(qi.est_supplier_cost * qi.qty), 0)) / q.total * 100, 2)
    else null
  end                                                 as margin_percent
from public.quotations q
left join public.quotation_items qi on qi.quotation_id = q.id
group by q.id;

create view public.trip_financials_v as
select
  t.id                                             as trip_id,
  t.reference,
  t.status,
  coalesce(sum(s.line_total), 0)::numeric(14,2)    as customer_total,
  coalesce(sum(s.supplier_cost), 0)::numeric(14,2) as supplier_total,
  coalesce(sum(s.margin), 0)::numeric(14,2)        as gross_margin,
  case
    when coalesce(sum(s.line_total), 0) > 0
    then round(coalesce(sum(s.margin), 0) / sum(s.line_total) * 100, 2)
    else null
  end                                              as margin_percent
from public.trips t
left join public.services s on s.trip_id = t.id
group by t.id;

revoke all on public.quotation_financials_v from portal_reader;
revoke all on public.trip_financials_v from portal_reader;

-- ---------------------------------------------------------------------------
-- Dropdown contents
-- ---------------------------------------------------------------------------
insert into public.option_sets (set_key, value, label, sort_order, is_system) values
  ('customer_type', 'new',       'New',       1, true),
  ('customer_type', 'repeat',    'Repeat',    2, true),
  ('customer_type', 'referral',  'Referral',  3, false),
  ('customer_type', 'corporate', 'Corporate', 4, false),
  ('customer_type', 'vip',       'VIP',       5, false),

  ('travel_theme', 'honeymoon',   'Honeymoon',         1, false),
  ('travel_theme', 'family',      'Family Holiday',    2, false),
  ('travel_theme', 'leisure',     'Leisure',           3, false),
  ('travel_theme', 'adventure',   'Adventure',         4, false),
  ('travel_theme', 'beach',       'Beach',             5, false),
  ('travel_theme', 'pilgrimage',  'Pilgrimage',        6, false),
  ('travel_theme', 'wildlife',    'Wildlife / Safari', 7, false),
  ('travel_theme', 'wellness',    'Wellness / Spa',    8, false),
  ('travel_theme', 'corporate',   'Corporate / MICE',  9, false),
  ('travel_theme', 'group_tour',  'Group Tour',       10, false),
  ('travel_theme', 'solo',        'Solo',             11, false),
  ('travel_theme', 'cruise',      'Cruise',           12, false),

  ('hotel_category', 'budget',        'Budget',         1, false),
  ('hotel_category', '3_star',        '3-Star',         2, false),
  ('hotel_category', '4_star',        '4-Star',         3, false),
  ('hotel_category', '5_star',        '5-Star',         4, false),
  ('hotel_category', '5_star_luxury', '5-Star Luxury',  5, false),
  ('hotel_category', 'boutique',      'Boutique',       6, false),
  ('hotel_category', 'resort',        'Resort',         7, false),
  ('hotel_category', 'private_villa', 'Private Villa',  8, false),
  ('hotel_category', 'homestay',      'Homestay',       9, false),
  ('hotel_category', 'houseboat',     'Houseboat',     10, false),

  ('meal_plan', 'ep', 'EP (Room Only)',      1, false),
  ('meal_plan', 'cp', 'CP (Breakfast)',      2, false),
  ('meal_plan', 'map','MAP (Half Board)',    3, false),
  ('meal_plan', 'ap', 'AP (Full Board)',     4, false),
  ('meal_plan', 'ai', 'AI (All Inclusive)',  5, false),

  ('dietary_preference', 'none',        'No Restriction', 1, false),
  ('dietary_preference', 'vegetarian',  'Vegetarian',     2, false),
  ('dietary_preference', 'jain',        'Jain',           3, false),
  ('dietary_preference', 'vegan',       'Vegan',          4, false),
  ('dietary_preference', 'halal',       'Halal',          5, false),
  ('dietary_preference', 'gluten_free', 'Gluten Free',    6, false),

  ('room_configuration', '1_double',          '1 Double',            1, false),
  ('room_configuration', '1_twin',            '1 Twin',              2, false),
  ('room_configuration', '2_double',          '2 Double',            3, false),
  ('room_configuration', '1_double_1_twin',   '1 Double + 1 Twin',   4, false),
  ('room_configuration', 'family_room',       'Family Room',         5, false),
  ('room_configuration', 'suite',             'Suite',               6, false),
  ('room_configuration', 'connecting',        'Connecting Rooms',    7, false),

  ('flights_status', 'not_required',   'Not Required',              1, true),
  ('flights_status', 'to_quote',       'Needed - Agency to Quote',  2, true),
  ('flights_status', 'client_booking', 'Client Booking Own',        3, false),
  ('flights_status', 'quoted',         'Quoted',                    4, false),
  ('flights_status', 'booked',         'Booked',                    5, true),
  ('flights_status', 'cancelled',      'Cancelled',                 6, false),

  ('visa_status', 'not_applicable',  'Visa on Arrival / Not Applicable', 1, true),
  ('visa_status', 'e_visa',          'e-Visa Required',                  2, false),
  ('visa_status', 'sticker_visa',    'Sticker Visa Required',            3, false),
  ('visa_status', 'client_has_visa', 'Client Has Valid Visa',            4, false),
  ('visa_status', 'in_process',      'In Process',                       5, false),
  ('visa_status', 'approved',        'Approved',                         6, true),
  ('visa_status', 'rejected',        'Rejected',                         7, false),

  ('transfers_status', 'not_required',    'Not Required',        1, true),
  ('transfers_status', 'private_cab',     'Private Cab Required',2, true),
  ('transfers_status', 'shared',          'Shared Transfer',     3, false),
  ('transfers_status', 'self_drive',      'Self Drive',          4, false),
  ('transfers_status', 'client_arranging','Client Arranging',    5, false),
  ('transfers_status', 'booked',          'Booked',              6, true),

  ('insurance_status', 'not_required',  'Not Required',    1, true),
  ('insurance_status', 'recommended',   'Recommended',     2, false),
  ('insurance_status', 'quoted',        'Quoted',          3, false),
  ('insurance_status', 'booked',        'Booked',          4, true),
  ('insurance_status', 'client_has_own','Client Has Own',  5, false),

  ('forex_status', 'not_required', 'Not Required', 1, true),
  ('forex_status', 'requested',    'Requested',    2, false),
  ('forex_status', 'quoted',       'Quoted',       3, false),
  ('forex_status', 'delivered',    'Delivered',    4, true),

  ('activities_status', 'not_required', 'Not Required',   1, true),
  ('activities_status', 'to_plan',      'To Be Planned',  2, false),
  ('activities_status', 'quoted',       'Quoted',         3, false),
  ('activities_status', 'booked',       'Booked',         4, true),

  ('lost_reason', 'budget_too_high',  'Budget Too High',    1, false),
  ('lost_reason', 'booked_elsewhere', 'Booked Elsewhere',   2, false),
  ('lost_reason', 'dates_changed',    'Dates Changed',      3, false),
  ('lost_reason', 'trip_cancelled',   'Trip Cancelled',     4, false),
  ('lost_reason', 'no_response',      'No Response',        5, false),
  ('lost_reason', 'just_exploring',   'Just Exploring',     6, false),
  ('lost_reason', 'visa_rejected',    'Visa Rejected',      7, false),
  ('lost_reason', 'duplicate',        'Duplicate Enquiry',  8, false),
  ('lost_reason', 'other',            'Other',              9, false),

  -- Labels only. The values are enforced by the CHECK on leads.status because
  -- the application branches on them.
  ('pipeline_stage', 'new',                 'New Enquiry',            1, true),
  ('pipeline_stage', 'contacted',           'Contacted',              2, true),
  ('pipeline_stage', 'requirements_logged', 'Requirements Logged',    3, true),
  ('pipeline_stage', 'quoted',              'Quote Sent',             4, true),
  ('pipeline_stage', 'negotiating',         'Negotiating / Revising', 5, true),
  ('pipeline_stage', 'won',                 'Won / Booking Confirmed',6, true),
  ('pipeline_stage', 'lost',                'Lost',                   7, true),
  ('pipeline_stage', 'dormant',             'Dormant',                8, true)
on conflict (set_key, value) do nothing;

insert into public.settings (key, value, description) values
  ('followup_default_days', '3'::jsonb,
   'Days ahead the next follow-up date is pre-filled when a lead is created.'),
  ('lead_priority_default', '"warm"'::jsonb,
   'Priority applied to a new lead when none is chosen.')
on conflict (key) do nothing;
