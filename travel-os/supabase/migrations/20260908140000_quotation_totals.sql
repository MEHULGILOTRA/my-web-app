-- Quotation totals, versioning and sending.
--
-- Totals are recomputed from the line items by trigger, so a draft can never
-- disagree with its own lines. A SENT quotation is deliberately excluded: it is
-- frozen, and its stored totals must keep matching the snapshot the customer
-- was shown.

create or replace function public.quotations_recalc(p_quotation_id uuid)
returns void
language plpgsql
as $$
begin
  update public.quotations q
     set subtotal = coalesce(items.total, 0),
         total    = greatest(coalesce(items.total, 0) - q.discount, 0)
    from (
      select coalesce(sum(line_total), 0) as total
        from public.quotation_items
       where quotation_id = p_quotation_id
         and is_included
         and not is_optional
    ) as items
   where q.id = p_quotation_id
     and q.status = 'draft';
end;
$$;

create or replace function public.quotation_items_recalc()
returns trigger
language plpgsql
as $$
begin
  perform public.quotations_recalc(coalesce(new.quotation_id, old.quotation_id));
  return coalesce(new, old);
end;
$$;

create trigger quotation_items_recalc
  after insert or update or delete on public.quotation_items
  for each row execute function public.quotation_items_recalc();

-- Discount changes must re-derive the total too.
create or replace function public.quotations_discount_recalc()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'draft' and new.discount is distinct from old.discount then
    new.total := greatest(new.subtotal - new.discount, 0);
  end if;
  return new;
end;
$$;

create trigger quotations_discount_recalc
  before update of discount on public.quotations
  for each row execute function public.quotations_discount_recalc();

-- ---------------------------------------------------------------------------
-- Versioning: V1 is never edited once sent. V2 is a copy, and V1 is superseded.
-- ---------------------------------------------------------------------------
create or replace function public.duplicate_quotation(p_quotation_id uuid)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_new_id      uuid;
  v_lead_id     uuid;
  v_next_ver    integer;
  v_staff       uuid := auth.uid();
begin
  select lead_id into v_lead_id from public.quotations where id = p_quotation_id;
  if v_lead_id is null then
    raise exception 'Quotation not found' using errcode = 'P0002';
  end if;

  select coalesce(max(version), 0) + 1 into v_next_ver
    from public.quotations where lead_id = v_lead_id;

  insert into public.quotations (
    lead_id, parent_quotation_id, version, reference, title, status, currency,
    subtotal, discount, total, is_international, tcs_rate_percent, tcs_note,
    terms, valid_until, client_budget, created_by
  )
  select
    q.lead_id, q.id, v_next_ver,
    regexp_replace(coalesce(q.reference, 'SKY-Q'), '-V[0-9]+$', '') || '-V' || v_next_ver,
    q.title, 'draft', q.currency,
    q.subtotal, q.discount, q.total, q.is_international, q.tcs_rate_percent,
    q.tcs_note, q.terms, q.valid_until, q.client_budget, v_staff
  from public.quotations q
  where q.id = p_quotation_id
  returning id into v_new_id;

  insert into public.quotation_items (
    quotation_id, sort_order, kind, title, description, start_date, end_date,
    qty, unit, customer_price, price_excludes_gst, est_supplier_cost,
    is_optional, is_included, meta
  )
  select
    v_new_id, sort_order, kind, title, description, start_date, end_date,
    qty, unit, customer_price, price_excludes_gst, est_supplier_cost,
    is_optional, is_included, meta
  from public.quotation_items
  where quotation_id = p_quotation_id;

  insert into public.quotation_day_plan (quotation_id, day_number, date, title, description)
  select v_new_id, day_number, date, title, description
  from public.quotation_day_plan where quotation_id = p_quotation_id;

  -- The old version is superseded, but only if it had actually been sent —
  -- duplicating a draft is just a starting point, not a revision.
  update public.quotations
     set status = 'superseded'
   where id = p_quotation_id
     and status in ('sent', 'viewed');

  return v_new_id;
end;
$$;

revoke all on function public.duplicate_quotation(uuid) from public;
grant execute on function public.duplicate_quotation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Sending freezes the quotation.
--
-- The snapshot is built by the application (it is the customer-facing payload,
-- and must contain no cost data) and passed in here, so that freezing the
-- status and storing the snapshot happen in one transaction. The CHECK on
-- quotations already refuses a non-draft row without a snapshot.
-- ---------------------------------------------------------------------------
create or replace function public.send_quotation(
  p_quotation_id uuid,
  p_snapshot     jsonb,
  p_share_token  text
)
returns void
language plpgsql
security invoker
as $$
declare
  v_staff uuid := auth.uid();
  v_lead  uuid;
  v_cust  uuid;
  v_ver   integer;
  v_total numeric(14,2);
begin
  update public.quotations
     set status      = 'sent',
         snapshot    = p_snapshot,
         share_token = coalesce(share_token, p_share_token),
         sent_at     = coalesce(sent_at, now())
   where id = p_quotation_id
     and status = 'draft'
  returning lead_id, version, total into v_lead, v_ver, v_total;

  if v_lead is null then
    raise exception 'Only a draft quotation can be sent' using errcode = '23514';
  end if;

  select primary_customer_id into v_cust from public.leads where id = v_lead;

  insert into public.timeline_events (
    event_type, customer_id, lead_id, quotation_id, actor_type, actor_staff_id,
    title, body
  )
  values (
    'quote_sent', v_cust, v_lead, p_quotation_id, 'staff', v_staff,
    'Quote V' || v_ver || ' sent',
    'Total ' || to_char(v_total, 'FM99,99,99,999')
  );

  -- Move the lead along, unless it is already further down the pipeline.
  update public.leads
     set status = 'quoted'
   where id = v_lead
     and status in ('new', 'contacted', 'requirements_logged');
end;
$$;

revoke all on function public.send_quotation(uuid, jsonb, text) from public;
grant execute on function public.send_quotation(uuid, jsonb, text) to authenticated;
