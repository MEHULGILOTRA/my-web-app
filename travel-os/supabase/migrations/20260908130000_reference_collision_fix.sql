-- Reference allocation has to survive references that already exist.
--
-- Found by creating a lead through the UI: the sequence starts at 1001 and the
-- imported data already contained LD-1001, so the very first generated
-- reference collided with the unique index and the insert failed.
--
-- A sequence alone cannot know about references that arrived some other way —
-- the Excel import will bring in hundreds of them. So the trigger now skips
-- over any value already taken, and the sequences are advanced past whatever
-- is currently in the table.

create or replace function public.leads_set_reference()
returns trigger
language plpgsql
as $$
declare
  v_reference text;
  v_attempts  integer := 0;
begin
  if new.reference is not null and new.reference <> '' then
    return new;
  end if;

  loop
    v_reference := 'LD-' || nextval('public.lead_reference_seq');
    exit when not exists (
      select 1 from public.leads where reference = v_reference
    );

    v_attempts := v_attempts + 1;
    if v_attempts > 1000 then
      raise exception 'Could not allocate a free lead reference after % attempts', v_attempts;
    end if;
  end loop;

  new.reference := v_reference;
  return new;
end;
$$;

create or replace function public.trips_set_reference()
returns trigger
language plpgsql
as $$
declare
  v_reference text;
  v_attempts  integer := 0;
  v_year      text := to_char(current_date, 'YYYY');
begin
  if new.reference is not null and new.reference <> '' then
    return new;
  end if;

  loop
    v_reference := 'SKY-' || v_year || '-' ||
                   lpad(nextval('public.trip_reference_seq')::text, 4, '0');
    exit when not exists (
      select 1 from public.trips where reference = v_reference
    );

    v_attempts := v_attempts + 1;
    if v_attempts > 1000 then
      raise exception 'Could not allocate a free trip reference after % attempts', v_attempts;
    end if;
  end loop;

  new.reference := v_reference;
  return new;
end;
$$;

-- Move the sequences past anything already present, so the loop above is a
-- safety net rather than something that runs on every insert.
select setval(
  'public.lead_reference_seq',
  greatest(
    coalesce(
      (select max((substring(reference from '^LD-([0-9]+)$'))::bigint)
         from public.leads where reference ~ '^LD-[0-9]+$'),
      1000
    ),
    1000
  ),
  true
);

select setval(
  'public.trip_reference_seq',
  greatest(
    coalesce(
      (select max((substring(reference from '^SKY-[0-9]{4}-([0-9]+)$'))::bigint)
         from public.trips where reference ~ '^SKY-[0-9]{4}-[0-9]+$'),
      0
    ),
    1
  ),
  true
);
