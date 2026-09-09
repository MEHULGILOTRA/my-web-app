-- Layer 0 — extensions, shared helpers, conventions.
--
-- Conventions used throughout this schema:
--   * UUID primary keys everywhere. Phone numbers are attributes, never keys.
--   * Money is numeric(14,2). Never float — a float turns a margin into
--     52999.99999999 and nobody notices until reconciliation.
--   * Statuses are text + CHECK, not native enums. An enum value can never be
--     removed or reordered; lead_status will change several times across this
--     build and a CHECK is drop-and-recreate in a migration.
--   * Prices are GST-inclusive unless a row sets price_excludes_gst.
--   * Currency is INR throughout. The column exists so a second currency is an
--     additive change rather than a schema rewrite.

-- gen_random_uuid() has been core since Postgres 13, so pgcrypto is not needed.
-- pg_trgm backs fuzzy customer search and import dedup; adding it later would
-- mean rebuilding the indexes that depend on it.
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Phone normalisation to E.164.
--
-- Deliberately IMMUTABLE so it can back an index, but note it is applied by a
-- BEFORE trigger rather than a GENERATED column: a stored generated column
-- pins the function definition, and Postgres then refuses to let you improve
-- the function. Normalisation rules always need improving.
-- ---------------------------------------------------------------------------
create or replace function public.normalize_phone_e164(raw text, default_cc text default '91')
returns text
language plpgsql
immutable
as $$
declare
  cleaned text;
  had_plus boolean;
begin
  if raw is null or btrim(raw) = '' then
    return null;
  end if;

  had_plus := left(btrim(raw), 1) = '+';
  cleaned := regexp_replace(raw, '[^0-9]', '', 'g');

  if cleaned = '' then
    return null;
  end if;

  -- Already international, either "+91..." or "0091...".
  if had_plus then
    return '+' || cleaned;
  end if;

  if left(cleaned, 2) = '00' then
    return '+' || substring(cleaned from 3);
  end if;

  -- Domestic trunk prefix: 098765 43210
  if left(cleaned, 1) = '0' then
    cleaned := substring(cleaned from 2);
  end if;

  -- Bare 10-digit Indian mobile — the common case in the Excel sheets.
  if length(cleaned) = 10 then
    return '+' || default_cc || cleaned;
  end if;

  -- Carries a country code already, e.g. 919876543210.
  return '+' || cleaned;
end;
$$;

comment on function public.normalize_phone_e164(text, text) is
  'Best-effort E.164 normalisation, defaulting to +91. Used for dedup on import and for customer lookup.';

-- ---------------------------------------------------------------------------
-- Row Level Security helper.
--
-- Every table gets RLS enabled in the same migration that creates it — never
-- "we will turn it on later". Staff policies are intentionally permissive
-- (one admin today); the point is that the machinery exists, so restricting an
-- agent role later is additive rather than a re-architecture.
--
-- public.is_staff() is defined in layer 1, once staff_users exists.
-- ---------------------------------------------------------------------------
create or replace function public.apply_staff_rls(tbl text)
returns void
language plpgsql
as $$
begin
  execute format('alter table public.%I enable row level security', tbl);
  execute format('drop policy if exists staff_all on public.%I', tbl);
  execute format(
    'create policy staff_all on public.%I for all to authenticated using (public.is_staff()) with check (public.is_staff())',
    tbl
  );
end;
$$;
