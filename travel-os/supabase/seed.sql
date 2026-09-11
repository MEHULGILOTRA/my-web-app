-- Development seed. Idempotent — safe to re-run.
--
-- This is a test fixture, not decoration. In particular the services below
-- carry real supplier costs and margins, so `npm run test:privacy` has
-- something a broken portal view would actually leak. A privacy test against an
-- empty database proves nothing.
--
-- Staff users are NOT seeded: staff_users.id references auth.users, and the
-- admin account is created through Supabase Auth signup in Phase 1. Every
-- created_by / owner_staff_id below is therefore left null.

-- ---------------------------------------------------------------------------
-- Tags
-- ---------------------------------------------------------------------------
insert into public.tags (id, name, slug, category) values
  ('11111111-0000-4000-8000-000000000001', 'Luxury',    'luxury',    'preference'),
  ('11111111-0000-4000-8000-000000000002', 'Budget',    'budget',    'preference'),
  ('11111111-0000-4000-8000-000000000003', 'Beach',     'beach',     'preference'),
  ('11111111-0000-4000-8000-000000000004', 'Mountains', 'mountains', 'preference'),
  ('11111111-0000-4000-8000-000000000005', 'Vegetarian','vegetarian','preference'),
  ('11111111-0000-4000-8000-000000000006', 'Honeymoon', 'honeymoon', 'segment'),
  ('11111111-0000-4000-8000-000000000007', 'Family',    'family',    'segment'),
  ('11111111-0000-4000-8000-000000000008', 'Corporate', 'corporate', 'segment')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Suppliers, with varied credit terms so the payables board has something to sort
-- ---------------------------------------------------------------------------
insert into public.suppliers (id, name, supplier_type, contact_name, phone_raw, email, credit_days, payment_terms) values
  ('22222222-0000-4000-8000-000000000001', 'Phuket Sunrise DMC',      'dmc',          'Anan P.',      '+66812345678',  'ops@phuketsunrise.example',   30, 'Net 30 from voucher date'),
  ('22222222-0000-4000-8000-000000000002', 'Skyline Air Consolidator','consolidator', 'Meera Nair',   '9820011223',    'fares@skylinecons.example',    7, 'Net 7'),
  ('22222222-0000-4000-8000-000000000003', 'Emirates Stay Group',     'hotel',        'Fatima A.',    '+971501234567', 'reservations@esg.example',    45, 'Net 45'),
  ('22222222-0000-4000-8000-000000000004', 'VisaExpress India',       'visa',         'Sunil Rao',    '01141002200',   'apply@visaexpress.example',    0, 'Advance payment'),
  ('22222222-0000-4000-8000-000000000005', 'CityCabs Bengaluru',      'transport',    'Prakash M.',   '9845567890',    'bookings@citycabs.example',   15, 'Net 15')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Households and customers.
--
-- Two of these are a deliberate near-duplicate ("Rajesh Kumar" /
-- "Rajesh Kumar Sharma") so the trigram search and the import dedup review have
-- a realistic case to catch.
-- ---------------------------------------------------------------------------
insert into public.households (id, name, notes) values
  ('33333333-0000-4000-8000-000000000001', 'Kumar Family',   'Repeat customers since 2023. Prefer 4-star and above.'),
  ('33333333-0000-4000-8000-000000000002', 'Iyer Family',    'Vegetarian throughout. Travelling with a child.'),
  ('33333333-0000-4000-8000-000000000003', 'Mehta Corporate','Books offsites for a 40-person team.')
on conflict (id) do nothing;

insert into public.customers (id, household_id, full_name, phone_raw, email, dob, anniversary, lifecycle_stage, nationality) values
  ('44444444-0000-4000-8000-000000000001', '33333333-0000-4000-8000-000000000001', 'Rajesh Kumar',        '9876543210',    'rajesh.kumar@example.com',  '1982-04-17', '2010-11-26', 'active',   'Indian'),
  ('44444444-0000-4000-8000-000000000002', '33333333-0000-4000-8000-000000000001', 'Priya Kumar',         '9876543211',    'priya.kumar@example.com',   '1985-09-02', '2010-11-26', 'active',   'Indian'),
  ('44444444-0000-4000-8000-000000000003', '33333333-0000-4000-8000-000000000001', 'Aarav Kumar',         null,            null,                        '2014-06-30', null,         'active',   'Indian'),
  ('44444444-0000-4000-8000-000000000004', '33333333-0000-4000-8000-000000000002', 'Lakshmi Iyer',        '+91 98200 44556','lakshmi.iyer@example.com', '1979-01-11', '2005-02-14', 'active',   'Indian'),
  ('44444444-0000-4000-8000-000000000005', '33333333-0000-4000-8000-000000000003', 'Nikhil Mehta',        '08041002200',   'nikhil@mehtacorp.example',  '1976-12-05', null,         'prospect', 'Indian'),
  -- Near-duplicate of customer 1: similar name, different number. Import dedup
  -- must surface this pair for review rather than merging it silently.
  ('44444444-0000-4000-8000-000000000006', null,                                   'Rajesh Kumar Sharma', '9876500011',    null,                        null,         null,         'prospect', 'Indian')
on conflict (id) do nothing;

update public.households set primary_customer_id = '44444444-0000-4000-8000-000000000001'
  where id = '33333333-0000-4000-8000-000000000001' and primary_customer_id is null;
update public.households set primary_customer_id = '44444444-0000-4000-8000-000000000004'
  where id = '33333333-0000-4000-8000-000000000002' and primary_customer_id is null;
update public.households set primary_customer_id = '44444444-0000-4000-8000-000000000005'
  where id = '33333333-0000-4000-8000-000000000003' and primary_customer_id is null;

insert into public.customer_relationships (customer_id, related_customer_id, relation) values
  ('44444444-0000-4000-8000-000000000001', '44444444-0000-4000-8000-000000000002', 'spouse'),
  ('44444444-0000-4000-8000-000000000001', '44444444-0000-4000-8000-000000000003', 'child')
on conflict do nothing;

insert into public.customer_tags (customer_id, tag_id, source) values
  ('44444444-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', 'manual'),
  ('44444444-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000007', 'manual'),
  ('44444444-0000-4000-8000-000000000004', '11111111-0000-4000-8000-000000000005', 'manual'),
  ('44444444-0000-4000-8000-000000000004', '11111111-0000-4000-8000-000000000003', 'manual'),
  ('44444444-0000-4000-8000-000000000005', '11111111-0000-4000-8000-000000000008', 'manual')
on conflict do nothing;

-- Imported history: flat and read-only, exactly as the Excel importer produces.
insert into public.legacy_trips (id, customer_id, destination, travel_start, travel_end, headline_value, notes) values
  ('55555555-0000-4000-8000-000000000001', '44444444-0000-4000-8000-000000000001', 'Dubai',     '2024-12-20', '2024-12-26', 245000.00, 'Imported from 2024 bookings sheet.'),
  ('55555555-0000-4000-8000-000000000002', '44444444-0000-4000-8000-000000000004', 'Singapore', '2023-05-08', '2023-05-14', 198000.00, 'Imported from 2023 bookings sheet.')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Leads
-- ---------------------------------------------------------------------------
insert into public.leads (id, reference, household_id, primary_customer_id, title, destination, is_international,
                          travel_start, travel_end, pax_adults, pax_children, budget_min, budget_max, source, status)
values
  ('66666666-0000-4000-8000-000000000001', 'LEAD-2026-0001', '33333333-0000-4000-8000-000000000001',
   '44444444-0000-4000-8000-000000000001', 'Thailand family holiday', 'Phuket, Thailand', true,
   '2026-11-14', '2026-11-20', 2, 1, 250000.00, 300000.00, 'whatsapp', 'negotiating'),
  ('66666666-0000-4000-8000-000000000002', 'LEAD-2026-0002', '33333333-0000-4000-8000-000000000002',
   '44444444-0000-4000-8000-000000000004', 'Kerala backwaters', 'Alleppey, Kerala', false,
   '2026-12-05', '2026-12-10', 2, 0, 90000.00, 120000.00, 'referral', 'new')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Quotation V1 (sent) superseded by V2 (draft) — exercises the immutability
-- path. V1 carries a frozen snapshot; note it contains no cost data.
-- ---------------------------------------------------------------------------
insert into public.quotations (id, lead_id, version, reference, title, status, subtotal, discount, total,
                               is_international, tcs_rate_percent, tcs_note, valid_until, share_token, snapshot, sent_at)
values
  ('77777777-0000-4000-8000-000000000001', '66666666-0000-4000-8000-000000000001', 1,
   'SKY-Q-2026-0001-V1', 'Phuket — 6 nights, family of 3', 'sent',
   280000.00, 0.00, 280000.00, true, 2.00,
   'The quote is excluding 2% TCS charged on all foreign trip bookings. The TCS will be adjusted with the Income Tax Payable for current Financial Year.',
   '2026-09-15', 'q1demotoken0000000000000001',
   '{"title":"Phuket — 6 nights, family of 3","total":280000.00,"currency":"INR","items":[{"kind":"flight","title":"Mumbai to Phuket return","customer_price":96000.00},{"kind":"hotel","title":"Beachfront resort, 6 nights","customer_price":148000.00},{"kind":"transfer","title":"Airport transfers","customer_price":12000.00},{"kind":"activity","title":"Phi Phi island day tour","customer_price":24000.00}]}'::jsonb,
   '2026-09-01 10:30:00+05:30'),
  ('77777777-0000-4000-8000-000000000002', '66666666-0000-4000-8000-000000000001', 2,
   'SKY-Q-2026-0001-V2', 'Phuket — 6 nights, family of 3 (revised hotel)', 'draft',
   262000.00, 0.00, 262000.00, true, 2.00,
   'The quote is excluding 2% TCS charged on all foreign trip bookings. The TCS will be adjusted with the Income Tax Payable for current Financial Year.',
   '2026-09-20', null, null, null)
on conflict (id) do nothing;

update public.quotations
   set parent_quotation_id = '77777777-0000-4000-8000-000000000001'
 where id = '77777777-0000-4000-8000-000000000002' and parent_quotation_id is null;

insert into public.quotation_items (id, quotation_id, sort_order, kind, title, description, start_date, end_date,
                                    qty, unit, customer_price, est_supplier_cost) values
  ('88888888-0000-4000-8000-000000000001', '77777777-0000-4000-8000-000000000001', 1, 'flight',   'Mumbai to Phuket return',      'Economy, 1 checked bag',    '2026-11-14', '2026-11-20', 1, 'package', 96000.00,  87500.00),
  ('88888888-0000-4000-8000-000000000002', '77777777-0000-4000-8000-000000000001', 2, 'hotel',    'Beachfront resort, 6 nights',  'Deluxe sea view, breakfast','2026-11-14', '2026-11-20', 1, 'package', 148000.00, 131000.00),
  ('88888888-0000-4000-8000-000000000003', '77777777-0000-4000-8000-000000000001', 3, 'transfer', 'Airport transfers',            'Private van, both ways',    '2026-11-14', '2026-11-20', 1, 'package', 12000.00,  8400.00),
  ('88888888-0000-4000-8000-000000000004', '77777777-0000-4000-8000-000000000001', 4, 'activity', 'Phi Phi island day tour',      'Speedboat, lunch included', '2026-11-17', '2026-11-17', 3, 'person',  8000.00,   6100.00)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- A won trip, with real supplier costs. These are the rows the privacy test
-- checks are unreachable through portal_reader.
-- ---------------------------------------------------------------------------
insert into public.trips (id, reference, lead_id, household_id, title, destination, is_international,
                          start_date, end_date, status, total_customer_price, itinerary_published, emergency_contacts)
values
  ('99999999-0000-4000-8000-000000000001', 'SKY-2026-0001', null, '33333333-0000-4000-8000-000000000002',
   'Kerala backwaters — Iyer family', 'Alleppey, Kerala', false,
   '2026-10-02', '2026-10-07', 'confirmed', 118000.00, true,
   '[{"label":"SkyMiles 24x7 desk","phone":"+919820000000"},{"label":"Local operator","phone":"+919447000000"}]'::jsonb)
on conflict (id) do nothing;

insert into public.trip_travellers (trip_id, customer_id, is_booker, is_payer, is_lead_pax, is_travelling) values
  ('99999999-0000-4000-8000-000000000001', '44444444-0000-4000-8000-000000000004', true, true, true, true)
on conflict (trip_id, customer_id) do nothing;

insert into public.services (id, trip_id, supplier_id, sort_order, kind, title, description, start_date, end_date,
                             qty, unit, customer_price, supplier_cost, status, confirmation_number, customer_visible) values
  ('aaaaaaaa-0000-4000-8000-000000000001', '99999999-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000002', 1, 'flight',   'Mumbai to Kochi return',   'IndiGo, economy',            '2026-10-02', '2026-10-07', 2, 'person', 14500.00, 12900.00, 'confirmed', 'PNR-4KJ9QA', true),
  ('aaaaaaaa-0000-4000-8000-000000000002', '99999999-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000003', 2, 'hotel',    'Houseboat, 2 nights',      'Premium houseboat, all meals','2026-10-03', '2026-10-05', 1, 'package', 46000.00, 38500.00, 'confirmed', 'HB-2026-881', true),
  ('aaaaaaaa-0000-4000-8000-000000000003', '99999999-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000005', 3, 'transfer', 'Kochi airport transfers',  'Sedan, both ways',           '2026-10-02', '2026-10-07', 1, 'package', 7000.00,  5200.00,  'confirmed', 'CC-77120',    true),
  ('aaaaaaaa-0000-4000-8000-000000000004', '99999999-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000001', 4, 'activity', 'Kumarakom bird sanctuary', 'Guided morning walk',        '2026-10-06', '2026-10-06', 2, 'person', 3000.00,  2100.00,  'pending',   null,          true)
on conflict (id) do nothing;

insert into public.itinerary_days (id, trip_id, day_number, date, title, summary) values
  ('bbbbbbbb-0000-4000-8000-000000000001', '99999999-0000-4000-8000-000000000001', 1, '2026-10-02', 'Arrive Kochi',      'Airport pickup and transfer to your hotel. Evening free.'),
  ('bbbbbbbb-0000-4000-8000-000000000002', '99999999-0000-4000-8000-000000000001', 2, '2026-10-03', 'Board the houseboat','Drive to Alleppey and board your houseboat for a night on the backwaters.')
on conflict (id) do nothing;

insert into public.itinerary_items (itinerary_day_id, service_id, sort_order, time_label, title, description) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000003', 1, '14:30', 'Airport pickup', 'Driver meets you at arrivals with a name board.'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000002', 1, '12:00', 'Houseboat check-in', 'Lunch served on board shortly after boarding.')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Money
-- ---------------------------------------------------------------------------
insert into public.payables (id, trip_id, supplier_id, description, amount, due_date, status) values
  ('cccccccc-0000-4000-8000-000000000001', '99999999-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000003', 'Houseboat balance', 38500.00, '2026-09-20', 'due'),
  ('cccccccc-0000-4000-8000-000000000002', '99999999-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000002', 'Air ticket payment', 25800.00, '2026-09-12', 'due')
on conflict (id) do nothing;

insert into public.payments (id, direction, trip_id, customer_id, amount, method, status, reference_no, paid_on) values
  ('dddddddd-0000-4000-8000-000000000001', 'inbound', '99999999-0000-4000-8000-000000000001',
   '44444444-0000-4000-8000-000000000004', 50000.00, 'upi', 'cleared', 'UPI-2026-09-01-8841', '2026-09-01')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Cross-sell: this trip has flights, a hotel and transfers but no travel
-- insurance, which is exactly the gap the Phase 4 rules look for.
-- ---------------------------------------------------------------------------
insert into public.cross_sell_suggestions (id, trip_id, customer_id, rule_key, suggested_kind, headline, status) values
  ('eeeeeeee-0000-4000-8000-000000000001', '99999999-0000-4000-8000-000000000001',
   '44444444-0000-4000-8000-000000000004', 'missing_insurance', 'insurance',
   'Travelling in monsoon season? Add trip insurance from SkyMiles.', 'suggested')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- A DOMESTIC quotation. Exists so the assertions can prove that a domestic trip
-- carries no TCS -- a rule that is easy to break and impossible to notice.
-- ---------------------------------------------------------------------------
insert into public.quotations (
  id, lead_id, version, reference, title, status, subtotal, discount, total,
  is_international, tcs_rate_percent, tcs_note, valid_until
) values (
  '77777777-0000-4000-8000-000000000004', '66666666-0000-4000-8000-000000000002', 1,
  'SKY-Q-LEAD-2026-0002-V1', 'Kerala backwaters -- 5 nights', 'draft',
  118000.00, 0.00, 118000.00, false, null, null, '2026-09-20'
) on conflict (id) do nothing;

insert into public.quotation_items (id, quotation_id, sort_order, kind, title, qty, unit, customer_price, est_supplier_cost) values
  ('88888888-0000-4000-8000-000000000021', '77777777-0000-4000-8000-000000000004', 1, 'hotel',    'Houseboat and resort, 5 nights', 1, 'package', 78000.00, 63000.00),
  ('88888888-0000-4000-8000-000000000022', '77777777-0000-4000-8000-000000000004', 2, 'transfer', 'Private cab throughout',         1, 'package', 40000.00, 31000.00)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Timeline: the human-readable story, including a manual note of the kind no
-- trigger could ever generate.
-- ---------------------------------------------------------------------------
-- ---------------------------------------------------------------------------
-- The agency's own sample row (LD-1001), carried over from the working
-- spreadsheet. Exercises every field added in the CRM-fields migration and
-- pins the money arithmetic:
--   quote 260,000 - cost 225,000 = margin 35,000
--   TCS 2% of 260,000 = 5,200  ->  total payable 265,200
-- ---------------------------------------------------------------------------
insert into public.customers (id, full_name, phone_raw, email, city, state, customer_type, lifecycle_stage, marketing_consent) values
  ('44444444-0000-4000-8000-000000000007', 'Amit Singhania', '+919829012345', 'amit.singhania@gmail.com', 'Jaipur', 'Rajasthan', 'repeat', 'active', true)
on conflict (id) do nothing;

insert into public.leads (
  id, reference, lead_date, primary_customer_id, title, destination, is_international,
  origin_city, travel_start, duration_nights, pax_adults, pax_children,
  travel_theme, hotel_category, meal_plan, room_configuration,
  flights_status, visa_status, transfers_status, insurance_status,
  budget_min, budget_max, source, status, priority, next_followup_date, special_occasion, special_notes
) values (
  '66666666-0000-4000-8000-000000000003', 'LD-1001', '2026-09-01',
  '44444444-0000-4000-8000-000000000007',
  'Bali honeymoon — 6 nights', 'Bali (Ubud + Kuta)', true,
  'Jaipur', '2026-10-14', 6, 2, 0,
  'honeymoon', '5_star_luxury', 'cp', 'double_sharing',
  'to_quote', 'not_applicable', 'private_cab', 'recommended',
  260000.00, 280000.00, 'repeat', 'won', 'hot', '2026-09-10',
  'Honeymoon', 'Private pool villa in Ubud; candle light dinner included.'
) on conflict (id) do nothing;

insert into public.quotations (
  id, lead_id, version, reference, title, status, subtotal, discount, total,
  is_international, tcs_rate_percent, tcs_note, client_budget, valid_until,
  share_token, snapshot, sent_at, decided_at
) values (
  '77777777-0000-4000-8000-000000000003', '66666666-0000-4000-8000-000000000003', 2,
  'SKY-Q-LD-1001-V2', 'Bali — 6 nights, private pool villa', 'accepted',
  260000.00, 0.00, 260000.00, true, 2.00,
  'The quote is excluding 2% TCS charged on all foreign trip bookings. The TCS will be adjusted with the Income Tax Payable for current Financial Year.',
  280000.00, '2026-09-15', 'q2demotoken0000000000000002',
  '{"title":"Bali — 6 nights, private pool villa","total":260000.00,"tcs_amount":5200.00,"total_payable":265200.00,"currency":"INR"}'::jsonb,
  '2026-09-05 12:00:00+05:30', '2026-09-08 09:15:00+05:30'
) on conflict (id) do nothing;

insert into public.quotation_items (id, quotation_id, sort_order, kind, title, description, qty, unit, customer_price, est_supplier_cost) values
  ('88888888-0000-4000-8000-000000000011', '77777777-0000-4000-8000-000000000003', 1, 'hotel',    'Ubud pool villa + Kuta beach resort', '6 nights, breakfast included', 1, 'package', 160000.00, 138000.00),
  ('88888888-0000-4000-8000-000000000012', '77777777-0000-4000-8000-000000000003', 2, 'flight',   'Jaipur to Denpasar return',           'Via Delhi, economy',           2, 'person',   40000.00,  35000.00),
  ('88888888-0000-4000-8000-000000000013', '77777777-0000-4000-8000-000000000003', 3, 'transfer', 'Private cab throughout',              'Airport and inter-city',       1, 'package',  12000.00,   9000.00),
  ('88888888-0000-4000-8000-000000000014', '77777777-0000-4000-8000-000000000003', 4, 'activity', 'Candlelight dinner + Ubud day tour',  'Honeymoon inclusion',          1, 'package',   8000.00,   8000.00)
on conflict (id) do nothing;

-- The seed inserts explicit references (LD-1001, SKY-2026-0001). Advance the
-- sequences past them, or the first lead created through the UI collides with
-- the unique index.
select setval(
  'public.lead_reference_seq',
  greatest(
    coalesce((select max((substring(reference from '^LD-([0-9]+)$'))::bigint)
                from public.leads where reference ~ '^LD-[0-9]+$'), 1000),
    1000
  ),
  true
);

select setval(
  'public.trip_reference_seq',
  greatest(
    coalesce((select max((substring(reference from '^SKY-[0-9]{4}-([0-9]+)$'))::bigint)
                from public.trips where reference ~ '^SKY-[0-9]{4}-[0-9]+$'), 0),
    1
  ),
  true
);

insert into public.timeline_events (id, event_type, customer_id, lead_id, quotation_id, actor_type, title, body, occurred_at) values
  ('ffffffff-0000-4000-8000-000000000001', 'lead_created', '44444444-0000-4000-8000-000000000001', '66666666-0000-4000-8000-000000000001', null, 'staff',  'Lead created',              'Enquiry over WhatsApp for Thailand in November.', '2026-08-28 11:05:00+05:30'),
  ('ffffffff-0000-4000-8000-000000000002', 'quote_sent',   '44444444-0000-4000-8000-000000000001', '66666666-0000-4000-8000-000000000001', '77777777-0000-4000-8000-000000000001', 'staff', 'Quote V1 sent (₹2.8L)', 'Sent over WhatsApp.', '2026-09-01 10:30:00+05:30'),
  ('ffffffff-0000-4000-8000-000000000003', 'note',         '44444444-0000-4000-8000-000000000001', '66666666-0000-4000-8000-000000000001', null, 'staff',  'Customer requested a cheaper hotel', 'Wants to stay under ₹2.7L. Looking at a 4-star instead of the beachfront resort.', '2026-09-04 16:20:00+05:30')
on conflict (id) do nothing;
