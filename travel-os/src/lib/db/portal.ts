import "server-only";

import { Pool, type QueryResultRow } from "pg";

import { getPortalDbEnv } from "@/lib/env";

/**
 * The only path to customer-facing data.
 *
 * This connects as the `portal_reader` Postgres role, which is created in the
 * Phase 0 migrations with **no grants on any base table** — only SELECT on the
 * `portal_*` views. Those views do not contain supplier, cost or margin columns
 * at all, so there is no query a customer-facing page can write that reaches
 * them. That is the actual enforcement; the route-group split and the ESLint
 * rule are there to stop someone quietly routing around it.
 *
 * Deliberately not supabase-js: PostgREST would authenticate as the shared
 * `authenticated` role, which staff sessions also use, so grants could not
 * distinguish the two. A dedicated login role can.
 *
 * `npm run test:privacy` asserts the grant situation against the live database.
 */

let pool: Pool | undefined;

/**
 * TLS for the Supabase connection.
 *
 * Supabase signs its Postgres endpoint with a per-project self-signed CA, so
 * chain verification fails against the system trust store. Download the
 * project's CA certificate (Dashboard → Settings → Database → SSL) and put its
 * PEM contents in PORTAL_DB_CA_CERT to verify properly.
 *
 * Without it the connection is still encrypted, but the chain is unverified —
 * which leaves it theoretically open to an active man-in-the-middle. Supplying
 * the certificate is the hardening step before this carries live customer data.
 */
function buildSsl() {
  const ca = process.env.PORTAL_DB_CA_CERT?.trim();
  return ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false };
}

function getPool(): Pool {
  if (!pool) {
    const { PORTAL_DATABASE_URL } = getPortalDbEnv();
    const isLocal =
      PORTAL_DATABASE_URL.includes("localhost") ||
      PORTAL_DATABASE_URL.includes("127.0.0.1");

    pool = new Pool({
      connectionString: PORTAL_DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: isLocal ? false : buildSsl(),
    });

    // Belt and braces on top of the grants: even a mistaken INSERT or UPDATE
    // issued through this pool is refused by the server.
    pool.on("connect", (client) => {
      void client.query("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY");
    });
  }

  return pool;
}

/**
 * Run a read-only query as `portal_reader`.
 *
 * Always pass values as parameters (`$1`, `$2`, …) rather than interpolating
 * them into the SQL string.
 */
export async function portalQuery<T extends QueryResultRow>(
  sql: string,
  params: readonly unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query<T>(sql, params as unknown[]);
  return result.rows;
}

/** Single-row convenience wrapper. Returns null rather than throwing. */
export async function portalQueryOne<T extends QueryResultRow>(
  sql: string,
  params: readonly unknown[] = [],
): Promise<T | null> {
  const rows = await portalQuery<T>(sql, params);
  return rows[0] ?? null;
}
