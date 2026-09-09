-- Align the pipeline and dropdowns with the agency's actual working sheet, and
-- open document storage.
--
-- The sample export named a stage the schema did not have — "Revision
-- Requested", which sits between a quote going out and active negotiation. It
-- is a real step: the customer has come back asking for changes but is not yet
-- haggling on price. Adding it is exactly why statuses are text + CHECK rather
-- than a Postgres enum, where a value can never be inserted mid-order.

alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads add constraint leads_status_check check (
  status in (
    'new',
    'contacted',
    'requirements_logged',
    'quoted',
    'revision_requested',
    'negotiating',
    'won',
    'lost',
    'dormant'
  )
);

-- ---------------------------------------------------------------------------
-- Dropdown wording, taken verbatim from the sheet so the team reads the labels
-- they already use rather than ones I invented.
-- ---------------------------------------------------------------------------
insert into public.option_sets (set_key, value, label, sort_order, is_system) values
  ('pipeline_stage', 'new',                 'New Inquiry',             1, true),
  ('pipeline_stage', 'contacted',           'Contacted',               2, true),
  ('pipeline_stage', 'requirements_logged', 'Requirement Gathered',    3, true),
  ('pipeline_stage', 'quoted',              'Quote Sent',              4, true),
  ('pipeline_stage', 'revision_requested',  'Revision Requested',      5, true),
  ('pipeline_stage', 'negotiating',         'Negotiation',             6, true),
  ('pipeline_stage', 'won',                 'Won / Booking Confirmed', 7, true),
  ('pipeline_stage', 'lost',                'Lost',                    8, true),
  ('pipeline_stage', 'dormant',             'Dormant',                 9, true),

  ('travel_theme', 'family',            'Family Leisure',    2, false),
  ('travel_theme', 'corporate',         'Corporate Offsite', 9, false),
  ('travel_theme', 'friends_group',     'Friends Group',    10, false),

  ('meal_plan', 'map', 'MAP (Breakfast + Dinner)', 3, false),
  ('meal_plan', 'ap',  'AP (All Meals)',           4, false),

  ('flights_status', 'client_booking', 'Self-Booked by Client', 3, false),

  ('visa_status', 'agency_assist', 'Needed - Agency to Assist', 2, false),

  ('transfers_status', 'shared', 'Shared SIC', 3, false),

  ('lost_reason', 'budget_too_high', 'Price Too High', 1, false)
on conflict (set_key, value) do update
  set label      = excluded.label,
      sort_order = excluded.sort_order,
      is_active  = true;

-- ---------------------------------------------------------------------------
-- Document storage.
--
-- Private bucket. Files are never served by URL — every download is a
-- short-lived signed URL minted in one place and written to
-- document_access_log first, because these carry passports and PAN cards.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('trip-documents', 'trip-documents', false, 26214400)  -- 25 MB
on conflict (id) do update set public = false;

-- Staff may manage everything in the bucket. Customers never touch storage
-- directly; the portal receives signed URLs from the server.
drop policy if exists "staff read documents" on storage.objects;
create policy "staff read documents" on storage.objects
  for select to authenticated
  using (bucket_id = 'trip-documents' and public.is_staff());

drop policy if exists "staff upload documents" on storage.objects;
create policy "staff upload documents" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'trip-documents' and public.is_staff());

drop policy if exists "staff update documents" on storage.objects;
create policy "staff update documents" on storage.objects
  for update to authenticated
  using (bucket_id = 'trip-documents' and public.is_staff());

drop policy if exists "staff delete documents" on storage.objects;
create policy "staff delete documents" on storage.objects
  for delete to authenticated
  using (bucket_id = 'trip-documents' and public.is_staff());

-- ---------------------------------------------------------------------------
-- Leads can own documents already (documents.owner_type includes 'lead'), but
-- an index makes the lookup on a lead page cheap.
-- ---------------------------------------------------------------------------
create index if not exists documents_lead_owner
  on public.documents (owner_id) where owner_type = 'lead';
