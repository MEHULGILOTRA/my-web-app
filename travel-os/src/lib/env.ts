import { z } from "zod";

/**
 * Environment access.
 *
 * Validation is deliberately lazy. Reading these at module scope would make
 * `next build` fail on any machine without a full `.env.local`, including CI
 * doing a type-check-only run. Instead each accessor validates the slice it
 * needs, the first time something actually asks for it.
 */

const supabaseSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serviceRoleSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const portalDbSchema = z.object({
  PORTAL_DATABASE_URL: z.string().min(1),
});

function parseOrThrow<T extends z.ZodTypeAny>(schema: T, label: string): z.infer<T> {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(
      `Missing or invalid ${label} environment variables: ${missing}. ` +
        `Copy .env.example to .env.local and fill it in.`,
    );
  }
  return result.data;
}

/** URL + anon key. Safe to reach the browser. */
export function getSupabaseEnv() {
  return parseOrThrow(supabaseSchema, "Supabase");
}

/** Service role key. Server-only — never import this into a Client Component. */
export function getServiceRoleEnv() {
  return parseOrThrow(serviceRoleSchema, "Supabase service role");
}

/**
 * Connection string for the `portal_reader` Postgres role. Server-only.
 * This role holds no grants on any base table — see the Phase 0 migrations.
 */
export function getPortalDbEnv() {
  return parseOrThrow(portalDbSchema, "portal database");
}
