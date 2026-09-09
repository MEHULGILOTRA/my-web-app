/**
 * The privacy assertions, shared by the offline (PGlite) and remote (Supabase)
 * verifiers so the two can never drift apart.
 *
 * `client` needs a `.query(sql, params) -> { rows }` method. Both PGlite and
 * node-postgres satisfy that.
 */

/** Column names that must never appear in a customer-facing view. */
const FORBIDDEN_COLUMN_RE = "(cost|supplier|margin|internal|commission|net_rate|buying)";

const CORE_COLUMNS = [
  "kind",
  "title",
  "description",
  "start_date",
  "end_date",
  "qty",
  "unit",
  "customer_price",
  "price_excludes_gst",
];

export function createReporter() {
  let failures = 0;
  return {
    pass(msg) {
      console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
    },
    fail(msg, detail) {
      failures += 1;
      console.log(`  \x1b[31m✗\x1b[0m ${msg}`);
      if (detail) console.log(`      ${detail}`);
    },
    get failures() {
      return failures;
    },
  };
}

export async function runPrivacyAssertions(client, report) {
  // -------------------------------------------------------------------------
  // 1. The assertion with teeth. A view is only a boundary if the role has no
  //    path around it to the base table.
  // -------------------------------------------------------------------------
  const baseGrants = await client.query(`
    select table_name, privilege_type
    from information_schema.role_table_grants
    where grantee = 'portal_reader'
      and table_schema = 'public'
      and table_name not like 'portal\\_%'
    order by table_name
  `);

  if (baseGrants.rows.length === 0) {
    report.pass("portal_reader holds zero grants on any base table");
  } else {
    report.fail(
      `portal_reader can reach ${baseGrants.rows.length} base table(s)`,
      baseGrants.rows.map((r) => `${r.table_name}:${r.privilege_type}`).join(", "),
    );
  }

  // -------------------------------------------------------------------------
  // 2. Name-based backstop. Weaker than the grant check — it only catches names
  //    we thought of — so it supplements rather than replaces it.
  // -------------------------------------------------------------------------
  const leaked = await client.query(`
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name like 'portal\\_%'
      and column_name ~ '${FORBIDDEN_COLUMN_RE}'
    order by table_name, column_name
  `);

  if (leaked.rows.length === 0) {
    report.pass("no portal_* view exposes a cost, supplier or margin column");
  } else {
    report.fail(
      "portal views expose forbidden columns",
      leaked.rows.map((r) => `${r.table_name}.${r.column_name}`).join(", "),
    );
  }

  // -------------------------------------------------------------------------
  // 3. security_invoker would make portal_reader need base-table grants, and
  //    the whole model collapses.
  // -------------------------------------------------------------------------
  const invoker = await client.query(`
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'v'
      and c.relname like 'portal\\_%'
      and array_to_string(c.reloptions, ',') like '%security_invoker=true%'
  `);

  if (invoker.rows.length === 0) {
    report.pass("no portal view is marked security_invoker");
  } else {
    report.fail("portal views set security_invoker=true",
      invoker.rows.map((r) => r.relname).join(", "));
  }

  // -------------------------------------------------------------------------
  // 4. quotation_items and services must keep the shared core column set, or
  //    Won -> Trip stops being a copy and becomes manual re-entry.
  // -------------------------------------------------------------------------
  const core = await client.query(
    `select table_name, column_name
     from information_schema.columns
     where table_schema = 'public'
       and table_name in ('quotation_items', 'services')
       and column_name = any($1)`,
    [CORE_COLUMNS],
  );

  const byTable = { quotation_items: new Set(), services: new Set() };
  for (const row of core.rows) byTable[row.table_name].add(row.column_name);

  const missing = [];
  for (const table of ["quotation_items", "services"]) {
    for (const col of CORE_COLUMNS) {
      if (!byTable[table].has(col)) missing.push(`${table}.${col}`);
    }
  }

  if (missing.length === 0) {
    report.pass("quotation_items and services share the core column set");
  } else {
    report.fail("shared core column set has drifted", missing.join(", "));
  }

  // -------------------------------------------------------------------------
  // 5. RLS everywhere. "We'll turn it on later" never happens.
  // -------------------------------------------------------------------------
  const noRls = await client.query(`
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
      and c.relname <> 'schema_migrations'
    order by c.relname
  `);

  if (noRls.rows.length === 0) {
    report.pass("row level security is enabled on every table");
  } else {
    report.fail(`${noRls.rows.length} table(s) without RLS`,
      noRls.rows.map((r) => r.relname).join(", "));
  }
}

/**
 * Money arithmetic, pinned against the agency's own sample row (LD-1001).
 *
 * quote 260,000 - cost 225,000 = margin 35,000
 * TCS 2% of 260,000 = 5,200 -> total payable 265,200
 *
 * TCS is excluded from `total` and added on top, which is the part most likely
 * to be got wrong by a later change.
 */
export async function runFinancialAssertions(client, report) {
  const { rows } = await client.query(`
    select q.total, q.tcs_amount, q.total_payable,
           f.est_supplier_cost, f.gross_margin, f.margin_percent
    from public.quotations q
    join public.quotation_financials_v f on f.quotation_id = q.id
    where q.reference = 'SKY-Q-LD-1001-V2'
  `);

  if (rows.length === 0) {
    report.fail("sample quotation SKY-Q-LD-1001-V2 not found");
    return;
  }

  const r = rows[0];
  const expected = {
    total: 260000,
    tcs_amount: 5200,
    total_payable: 265200,
    est_supplier_cost: 225000,
    gross_margin: 35000,
  };

  for (const [field, want] of Object.entries(expected)) {
    const got = Number(r[field]);
    if (got === want) {
      report.pass(`${field} = ${want.toLocaleString("en-IN")}`);
    } else {
      report.fail(`${field} is ${got}, expected ${want}`);
    }
  }

  const marginPct = Number(r.margin_percent);
  if (Math.abs(marginPct - 13.46) < 0.01) {
    report.pass(`margin_percent = ${marginPct}%`);
  } else {
    report.fail(`margin_percent is ${marginPct}, expected 13.46`);
  }

  // Domestic trips must carry no TCS at all. The rule is one stray edit away
  // from being wrong, and nobody would notice until a customer was overcharged.
  const domestic = await client.query(`
    select q.total, q.tcs_amount, q.total_payable, q.tcs_rate_percent, q.tcs_note
    from public.quotations q
    where q.reference = 'SKY-Q-LEAD-2026-0002-V1'
  `);

  if (domestic.rows.length === 0) {
    report.fail("domestic sample quotation not found");
    return;
  }

  const d = domestic.rows[0];
  if (Number(d.tcs_amount) === 0) {
    report.pass("domestic quotation charges no TCS");
  } else {
    report.fail(`domestic quotation has TCS of ${d.tcs_amount}, expected 0`);
  }

  if (Number(d.total_payable) === Number(d.total)) {
    report.pass("domestic payable equals total (nothing added on top)");
  } else {
    report.fail(
      `domestic payable ${d.total_payable} does not equal total ${d.total}`,
    );
  }

  if (d.tcs_rate_percent === null && d.tcs_note === null) {
    report.pass("domestic quotation carries no TCS rate or disclosure note");
  } else {
    report.fail("domestic quotation still carries a TCS rate or note");
  }
}

/** Printed so a human reviews the diff when a portal view changes. */
export async function printPortalSurface(client) {
  const snapshot = await client.query(`
    select table_name, string_agg(column_name, ', ' order by ordinal_position) as cols
    from information_schema.columns
    where table_schema = 'public' and table_name like 'portal\\_%'
    group by table_name
    order by table_name
  `);

  console.log("\nPortal view surface (review this diff when it changes)");
  for (const row of snapshot.rows) {
    console.log(`  ${row.table_name}`);
    console.log(`    ${row.cols}`);
  }
}
