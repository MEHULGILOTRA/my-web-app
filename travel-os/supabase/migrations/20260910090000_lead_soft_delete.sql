-- Deleting a lead.
--
-- This is a soft delete, and deliberately so. quotations.lead_id cascades, so a
-- hard delete would take every quotation with it — an agent who mis-clicks on
-- LD-1042 instead of LD-1043 destroys priced work with no way back. The table
-- already assumes deletion is time-based rather than immediate (lost_at exists
-- so a scheduled job can purge lost leads after 90 days), so a deleted_at
-- column fits the model that is already here.
--
-- Deleted leads stay queryable by reference, which matters: an agent who
-- remembers "LD-1042" and finds nothing should learn it was deleted and by
-- whom, not that it never existed.

alter table public.leads
  add column if not exists deleted_at    timestamptz,
  add column if not exists deleted_by    uuid references public.staff_users(id) on delete set null,
  add column if not exists delete_reason text;

-- Partial: every list query filters `deleted_at is null`, and that is the only
-- shape this index needs to serve. Indexing the deleted rows too would be
-- larger and slower for the common case.
create index if not exists leads_live
  on public.leads (created_at desc)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- delete_lead
--
-- security invoker, matching set_lead_stage: RLS still applies, so a caller who
-- is not staff cannot delete anything even if they reach the function.
-- ---------------------------------------------------------------------------
create or replace function public.delete_lead(
  p_lead_id uuid,
  p_reason  text default null
)
returns void
language plpgsql
security invoker
as $$
declare
  v_staff     uuid := auth.uid();
  v_reference text;
  v_deleted   timestamptz;
  v_trip      uuid;
begin
  select reference, deleted_at, converted_trip_id
    into v_reference, v_deleted, v_trip
    from public.leads
   where id = p_lead_id;

  if not found then
    raise exception 'Lead not found' using errcode = 'P0002';
  end if;

  -- Idempotent: deleting twice is not an error, so a double-submitted form or a
  -- retried request cannot produce a confusing failure.
  if v_deleted is not null then
    return;
  end if;

  -- A won lead that became a trip is the trip's origin record. Removing it
  -- would leave a booking whose history starts mid-story.
  if v_trip is not null then
    raise exception
      'This lead has been converted to a trip and cannot be deleted. Cancel the trip first.'
      using errcode = 'P0001';
  end if;

  update public.leads
     set deleted_at    = now(),
         deleted_by    = v_staff,
         delete_reason = nullif(btrim(coalesce(p_reason, '')), '')
   where id = p_lead_id;

  insert into public.timeline_events (
    event_type, customer_id, lead_id, actor_type, actor_staff_id, title, body
  )
  select 'lead_deleted', l.primary_customer_id, l.id, 'staff', v_staff,
         'Lead ' || coalesce(l.reference, '') || ' deleted',
         nullif(btrim(coalesce(p_reason, '')), '')
    from public.leads l
   where l.id = p_lead_id;
end;
$$;

revoke all on function public.delete_lead(uuid, text) from public;
grant execute on function public.delete_lead(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- restore_lead — what makes the delete safe to offer at all.
-- ---------------------------------------------------------------------------
create or replace function public.restore_lead(p_lead_id uuid)
returns void
language plpgsql
security invoker
as $$
declare
  v_staff uuid := auth.uid();
begin
  update public.leads
     set deleted_at    = null,
         deleted_by    = null,
         delete_reason = null
   where id = p_lead_id
     and deleted_at is not null;

  if not found then
    return;
  end if;

  insert into public.timeline_events (
    event_type, customer_id, lead_id, actor_type, actor_staff_id, title
  )
  select 'lead_restored', l.primary_customer_id, l.id, 'staff', v_staff,
         'Lead ' || coalesce(l.reference, '') || ' restored'
    from public.leads l
   where l.id = p_lead_id;
end;
$$;

revoke all on function public.restore_lead(uuid) from public;
grant execute on function public.restore_lead(uuid) to authenticated;
