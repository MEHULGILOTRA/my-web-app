-- Keep TCS in step when a lead's trip type is corrected.
--
-- quotations.is_international is a copy taken when the quotation is created.
-- That was safe while trip type was only set at lead creation, but the lead
-- edit form can now change it — so a quotation drafted while the lead said
-- International would keep charging 2% TCS after the trip is corrected to
-- Domestic, and vice versa.
--
-- Only DRAFTS are synced. A sent quotation is frozen by design: it must keep
-- showing the customer exactly the figures and wording they were sent.

create or replace function public.leads_sync_quotation_trip_type()
returns trigger
language plpgsql
as $$
declare
  v_rate numeric(5,2);
  v_note text;
begin
  if new.is_international is not distinct from old.is_international then
    return new;
  end if;

  select coalesce((value #>> '{}')::numeric, 2) into v_rate
    from public.settings where key = 'tcs_rate_percent';

  select (value #>> '{}') into v_note
    from public.settings where key = 'tcs_note';

  update public.quotations
     set is_international = new.is_international,
         -- Domestic trips carry no TCS at all: the rate and the disclosure
         -- note are cleared, not just zeroed, so nothing can render them.
         tcs_rate_percent = case when new.is_international then v_rate else null end,
         tcs_note         = case when new.is_international then v_note else null end
   where lead_id = new.id
     and status = 'draft';

  return new;
end;
$$;

create trigger leads_sync_quotation_trip_type
  after update of is_international on public.leads
  for each row execute function public.leads_sync_quotation_trip_type();

comment on function public.leads_sync_quotation_trip_type() is
  'Propagates a lead trip-type change to its draft quotations. Sent quotations stay frozen.';
