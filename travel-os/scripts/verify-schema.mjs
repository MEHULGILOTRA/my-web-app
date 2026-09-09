/**
 * Offline schema verification.
 *
 * Applies every migration and the seed to a throwaway in-memory Postgres
 * (PGlite), then runs the privacy assertions. No Docker, no Supabase project,
 * no network — so the schema can be proven before any credentials exist, and
 * CI can prove it on every commit.
 *
 *   npm run db:verify
 *
 * The remote equivalent is scripts/verify-remote.mjs. Both import the same
 * assertions so they cannot drift.
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";

import {
  createReporter,
  printPortalSurface,
  runFinancialAssertions,
  runPrivacyAssertions,
} from "./privacy-assertions.mjs";

const root = path.resolve(import.meta.dirname, "..");
const migrationsDir = path.join(root, "supabase", "migrations");
const seedFile = path.join(root, "supabase", "seed.sql");

/**
 * Supabase provides these; a bare Postgres does not. Stubbed only for this
 * harness — never part of a migration.
 */
const AUTH_SHIM = `
  do $shim$
  begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then
      create role anon nologin noinherit;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then
      create role authenticated nologin noinherit;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then
      create role service_role nologin noinherit bypassrls;
    end if;
  end
  $shim$;

  -- Supabase Storage. Shimmed so the document-bucket migration can run
  -- offline; only the columns and policy targets the migrations touch.
  create schema if not exists storage;
  create table if not exists storage.buckets (
    id              text primary key,
    name            text,
    public          boolean default false,
    file_size_limit bigint
  );
  create table if not exists storage.objects (
    id        uuid primary key default gen_random_uuid(),
    bucket_id text,
    name      text,
    owner     uuid
  );
  alter table storage.objects enable row level security;

  create schema if not exists auth;
  -- The metadata columns are not optional here: a trigger declared
  -- "after update of raw_app_meta_data" fails to create if the column is
  -- missing, even though the function body referencing it would not.
  create table if not exists auth.users (
    id                 uuid primary key default gen_random_uuid(),
    email              text,
    raw_app_meta_data  jsonb default '{}'::jsonb,
    raw_user_meta_data jsonb default '{}'::jsonb,
    created_at         timestamptz default now()
  );
  create or replace function auth.uid()
  returns uuid language sql stable as $fn$ select null::uuid $fn$;
`;

const report = createReporter();
const db = await PGlite.create({ extensions: { pg_trgm } });

console.log("\nApplying migrations");
await db.exec(AUTH_SHIM);

const migrations = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();

if (migrations.length === 0) {
  console.error("No migrations found.");
  process.exit(1);
}

for (const file of migrations) {
  const sql = await readFile(path.join(migrationsDir, file), "utf8");
  try {
    await db.exec(sql);
    report.pass(file);
  } catch (error) {
    report.fail(file, error.message);
    console.error("\nMigration failed — stopping here.\n");
    await db.close();
    process.exit(1);
  }
}

console.log("\nApplying seed");
try {
  await db.exec(await readFile(seedFile, "utf8"));
  report.pass("seed.sql");
} catch (error) {
  report.fail("seed.sql", error.message);
  await db.close();
  process.exit(1);
}

// Re-running the seed must be a no-op, or `db:reset` is not repeatable.
try {
  await db.exec(await readFile(seedFile, "utf8"));
  report.pass("seed.sql is idempotent (re-applied cleanly)");
} catch (error) {
  report.fail("seed.sql is not idempotent", error.message);
}

console.log("\nPrivacy assertions");
await runPrivacyAssertions(db, report);

console.log("\nFinancial assertions (sample lead LD-1001)");
await runFinancialAssertions(db, report);

await printPortalSurface(db);

const counts = await db.query(`
  select
    (select count(*) from public.customers)  as customers,
    (select count(*) from public.leads)      as leads,
    (select count(*) from public.quotations) as quotations,
    (select count(*) from public.trips)      as trips,
    (select count(*) from public.services)   as services
`);
console.log(
  `\nSeeded: ${Object.entries(counts.rows[0]).map(([k, v]) => `${v} ${k}`).join(", ")}`,
);

await db.close();

if (report.failures > 0) {
  console.log(`\n\x1b[31m${report.failures} assertion(s) failed.\x1b[0m\n`);
  process.exit(1);
}

console.log("\n\x1b[32mSchema verified (offline).\x1b[0m\n");

// Explicit exit: PGlite leaves a libuv handle open on Windows and the process
// aborts during teardown with a non-zero code even though everything passed.
// Without this, CI fails on a green run.
process.exit(0);
