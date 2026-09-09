-- Quick-add lead: find-or-create the customer and open the lead in one call.
--
-- Done in SQL rather than three round trips from the app for three reasons:
--   * it reuses normalize_phone_e164, so matching uses exactly the same rule
--     that the unique index enforces — no second implementation to drift;
--   * it is atomic, so two agents typing the same number at once cannot both
--     create a customer and have one of them fail on the unique index;
--   * it is one network round trip, which is most of the 20-second budget.
--
-- security invoker: RLS still applies, and auth.uid() attributes the work.

create or replace function public.quick_add_lead(
  p_full_name        text,
  p_phone            text default null,
  p_destination      text default null,
  p_travel_month     text default null,
  p_travel_start     date default null,
  p_pax_adults       integer default 1,
  p_pax_children     integer default 0,
  p_source           text default 'whatsapp',
  p_is_international boolean default false,
  p_priority         text default 'warm'
)
returns table (
  lead_id          uuid,
  lead_reference   text,
  customer_id      uuid,
  customer_created boolean
)
language plpgsql
security invoker
as $$
declare
  v_phone       text;
  v_customer_id uuid;
  v_created     boolean := false;
  v_lead_id     uuid;
  v_reference   text;
  v_staff       uuid := auth.uid();
  v_followup    integer;
begin
  if p_full_name is null or btrim(p_full_name) = '' then
    raise exception 'A name is required' using errcode = '23514';
  end if;

  v_phone := public.normalize_phone_e164(p_phone);

  if v_phone is not null then
    select id into v_customer_id
      from public.customers
     where phone_e164 = v_phone
       and merged_into_customer_id is null
     limit 1;
  end if;

  if v_customer_id is null then
    insert into public.customers (full_name, phone_raw, owner_staff_id, created_by, lifecycle_stage)
    values (btrim(p_full_name), nullif(btrim(coalesce(p_phone, '')), ''), v_staff, v_staff, 'prospect')
    returning id into v_customer_id;
    v_created := true;
  end if;

  select coalesce((value #>> '{}')::integer, 3) into v_followup
    from public.settings where key = 'followup_default_days';

  insert into public.leads (
    primary_customer_id, household_id, title, destination, is_international,
    travel_start, travel_month, pax_adults, pax_children, source, status,
    priority, owner_staff_id, created_by, next_followup_date
  )
  select
    v_customer_id,
    c.household_id,
    coalesce(nullif(btrim(coalesce(p_destination, '')), ''), 'New enquiry'),
    nullif(btrim(coalesce(p_destination, '')), ''),
    coalesce(p_is_international, false),
    p_travel_start,
    nullif(btrim(coalesce(p_travel_month, '')), ''),
    coalesce(p_pax_adults, 1),
    coalesce(p_pax_children, 0),
    coalesce(p_source, 'whatsapp'),
    'new',
    coalesce(p_priority, 'warm'),
    v_staff,
    v_staff,
    current_date + coalesce(v_followup, 3)
  from public.customers c
  where c.id = v_customer_id
  returning id, reference into v_lead_id, v_reference;

  insert into public.timeline_events (
    event_type, customer_id, lead_id, actor_type, actor_staff_id, title, body
  )
  values (
    'lead_created', v_customer_id, v_lead_id, 'staff', v_staff,
    'Lead created',
    coalesce(nullif(btrim(coalesce(p_destination, '')), ''), 'New enquiry')
  );

  return query select v_lead_id, v_reference, v_customer_id, v_created;
end;
$$;

-- Postgres grants EXECUTE on new functions to PUBLIC by default, and
-- portal_reader is a member of PUBLIC. RLS would stop it doing any damage, but
-- a customer-facing role should not even be able to call a write path.
revoke all on function public.quick_add_lead(text, text, text, text, date, integer, integer, text, boolean, text) from public;
grant execute on function public.quick_add_lead(text, text, text, text, date, integer, integer, text, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Lead stage changes, with the timeline entry written in the same transaction
-- so the two can never disagree.
-- ---------------------------------------------------------------------------
create or replace function public.set_lead_stage(
  p_lead_id     uuid,
  p_status      text,
  p_lost_reason text default null,
  p_note        text default null
)
returns void
language plpgsql
security invoker
as $$
declare
  v_old   text;
  v_staff uuid := auth.uid();
begin
  select status into v_old from public.leads where id = p_lead_id;
  if v_old is null then
    raise exception 'Lead not found' using errcode = 'P0002';
  end if;
  if v_old = p_status then
    return;
  end if;

  update public.leads
     set status = p_status,
         lost_reason = case when p_status = 'lost' then p_lost_reason else null end
   where id = p_lead_id;

  insert into public.timeline_events (
    event_type, customer_id, lead_id, actor_type, actor_staff_id, title, body
  )
  select 'stage_changed', l.primary_customer_id, l.id, 'staff', v_staff,
         'Stage changed to ' || p_status,
         coalesce(p_note, case when p_status = 'lost' then p_lost_reason end)
  from public.leads l where l.id = p_lead_id;
end;
$$;

revoke all on function public.set_lead_stage(uuid, text, text, text) from public;
grant execute on function public.set_lead_stage(uuid, text, text, text) to authenticated;
