/**
 * Post-migration setup and verification against the real Supabase database.
 *
 *   npm run db:setup-remote
 *
 * Idempotent — safe to re-run. It:
 *   1. gives portal_reader a login password, taken from PORTAL_DATABASE_URL so
 *      the two can never disagree (a migration must not contain a password);
 *   2. applies the seed;
 *   3. runs the same privacy assertions as the offline verifier;
 *   4. connects AS portal_reader and tries to read supplier costs — the live
 *      negative test. If that read ever succeeds, the build is broken.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import dotenv from "dotenv";
import pg from "pg";

import {
  createReporter,
  printPortalSurface,
  runFinancialAssertions,
  runPrivacyAssertions,
} from "./privacy-assertions.mjs";

const root = path.resolve(import.meta.dirname, "..");
dotenv.config({ path: path.join(root, ".env.local"), quiet: true });

const { SUPABASE_DB_URL, PORTAL_DATABASE_URL } = process.env;

if (!SUPABASE_DB_URL || !PORTAL_DATABASE_URL) {
  console.error("SUPABASE_DB_URL and PORTAL_DATABASE_URL must be set in .env.local");
  process.exit(1);
}

const portalUrl = new URL(PORTAL_DATABASE_URL);
const portalUser = decodeURIComponent(portalUrl.username);
const portalPassword = decodeURIComponent(portalUrl.password);

const report = createReporter();

// Mirrors src/lib/db/portal.ts: verify the chain when the project's CA cert is
// supplied, otherwise encrypt without chain verification. Supabase signs with a
// per-project self-signed CA, so the system trust store cannot validate it.
const ca = process.env.PORTAL_DB_CA_CERT?.trim();
const ssl = ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false };

const admin = new pg.Client({ connectionString: SUPABASE_DB_URL, ssl });
await admin.connect();

// ---------------------------------------------------------------------------
// 1. Role login
// ---------------------------------------------------------------------------
console.log("\nRole setup");
await admin.query(
  `alter role ${pg.escapeIdentifier(portalUser)} with login password ${pg.escapeLiteral(portalPassword)}`,
);
report.pass(`${portalUser} can log in, password matches PORTAL_DATABASE_URL`);

// ---------------------------------------------------------------------------
// 2. Seed
// ---------------------------------------------------------------------------
console.log("\nSeed");
try {
  await admin.query(await readFile(path.join(root, "supabase", "seed.sql"), "utf8"));
  report.pass("seed.sql applied");
} catch (error) {
  report.fail("seed.sql", error.message);
}

// ---------------------------------------------------------------------------
// 3. Static assertions — identical to the offline run
// ---------------------------------------------------------------------------
console.log("\nPrivacy assertions");
await runPrivacyAssertions(admin, report);

console.log("\nFinancial assertions (sample lead LD-1001)");
await runFinancialAssertions(admin, report);

// ---------------------------------------------------------------------------
// 4. Live negative test. This is the one the offline verifier cannot do:
//    actually authenticate as portal_reader and attempt the leak.
// ---------------------------------------------------------------------------
console.log("\nLive access test (connected as portal_reader)");
const portal = new pg.Client({ connectionString: PORTAL_DATABASE_URL, ssl });

try {
  await portal.connect();
  report.pass("portal_reader connects");

  // Positive: the views it is supposed to read.
  const trips = await portal.query("select id, title from public.portal_trip_v limit 5");
  report.pass(`reads portal_trip_v (${trips.rows.length} row(s))`);

  const services = await portal.query("select title, customer_price from public.portal_service_v limit 5");
  report.pass(`reads portal_service_v (${services.rows.length} row(s))`);

  // Negative: every one of these must be refused.
  const mustFail = [
    ["services.supplier_cost", "select supplier_cost from public.services limit 1"],
    ["services.margin", "select margin from public.services limit 1"],
    ["suppliers", "select name from public.suppliers limit 1"],
    ["payables", "select amount from public.payables limit 1"],
    ["quotation_items.est_supplier_cost", "select est_supplier_cost from public.quotation_items limit 1"],
    ["customers", "select full_name from public.customers limit 1"],
  ];

  for (const [label, sql] of mustFail) {
    try {
      const res = await portal.query(sql);
      report.fail(
        `LEAK: portal_reader read ${label}`,
        `returned ${res.rows.length} row(s) — ${JSON.stringify(res.rows[0] ?? null)}`,
      );
    } catch (error) {
      if (/permission denied/i.test(error.message)) {
        report.pass(`${label} refused (permission denied)`);
      } else {
        report.fail(`${label} failed for the wrong reason`, error.message);
      }
    }
  }

  // Writes must be refused too — the pool sets read-only, but the grants are
  // what actually stop it.
  try {
    await portal.query("insert into public.leads (title) values ('probe')");
    report.fail("LEAK: portal_reader can write to leads");
  } catch {
    report.pass("writes refused");
  }
} catch (error) {
  report.fail("portal_reader connection", error.message);
} finally {
  await portal.end().catch(() => {});
}

await printPortalSurface(admin);

const counts = await admin.query(`
  select
    (select count(*) from public.customers)  as customers,
    (select count(*) from public.leads)      as leads,
    (select count(*) from public.quotations) as quotations,
    (select count(*) from public.trips)      as trips,
    (select count(*) from public.services)   as services
`);
console.log(
  `\nIn database: ${Object.entries(counts.rows[0]).map(([k, v]) => `${v} ${k}`).join(", ")}`,
);

await admin.end();

if (report.failures > 0) {
  console.log(`\n\x1b[31m${report.failures} assertion(s) failed.\x1b[0m\n`);
  process.exit(1);
}

console.log("\n\x1b[32mRemote database verified.\x1b[0m\n");
