-- "Next action" as a first-class concept, and the Booking Pending stage.
--
-- next_followup_date alone cannot support the prominent NEXT ACTION block the
-- CRM needs: a date with no verb tells an agent when to look, not what to do.
-- Three columns make it real without the weight of a task system; assignment
-- and completion can move to a tasks table when they are actually needed.

alter table public.leads
  add column next_action      text,
  add column next_action_type text,
  add column next_action_at   timestamptz;

-- Booking Pending sits between winning the deal and operations starting: the
-- customer has agreed but the advance has not cleared.
alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads add constraint leads_status_check check (
  status in (
    'new',
    'contacted',
    'requirements_logged',
    'quoted',
    'revision_requested',
    'negotiating',
    'booking_pending',
    'won',
    'lost',
    'dormant'
  )
);

create index leads_next_action_at on public.leads (next_action_at)
  where next_action_at is not null
    and status not in ('won', 'lost', 'dormant');

insert into public.option_sets (set_key, value, label, sort_order, is_system) values
  ('pipeline_stage', 'booking_pending', 'Booking Pending', 7, true),
  ('pipeline_stage', 'won',             'Won / Booking Confirmed', 8, true),
  ('pipeline_stage', 'lost',            'Lost',    9, true),
  ('pipeline_stage', 'dormant',         'Dormant', 10, true),

  ('next_action_type', 'call',            'Call client',        1, false),
  ('next_action_type', 'send_quote',      'Send quotation',     2, false),
  ('next_action_type', 'follow_up',       'Follow up',          3, false),
  ('next_action_type', 'collect_docs',    'Collect passport',   4, false),
  ('next_action_type', 'confirm_hotel',   'Confirm hotel',      5, false),
  ('next_action_type', 'collect_payment', 'Collect payment',    6, false),
  ('next_action_type', 'send_itinerary',  'Send itinerary',     7, false),
  ('next_action_type', 'other',           'Other',              8, false)
on conflict (set_key, value) do update
  set label = excluded.label, sort_order = excluded.sort_order, is_active = true;

-- Keep the two dates honest: setting one without the other leaves the UI
-- showing an action with no due date, or a due date with no action.
create or replace function public.leads_sync_next_action()
returns trigger
language plpgsql
as $$
begin
  if new.next_action_at is not null and new.next_followup_date is null then
    new.next_followup_date := (new.next_action_at at time zone 'Asia/Kolkata')::date;
  elsif new.next_action_at is null and new.next_followup_date is not null then
    new.next_action_at := (new.next_followup_date + time '10:00') at time zone 'Asia/Kolkata';
  end if;
  return new;
end;
$$;

create trigger leads_sync_next_action
  before insert or update of next_action_at, next_followup_date on public.leads
  for each row execute function public.leads_sync_next_action();
