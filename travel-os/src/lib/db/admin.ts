import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getServiceRoleEnv, getSupabaseEnv } from "@/lib/env";

/**
 * Admin-side database access.
 *
 * Everything here can read supplier identities, costs and margins. Nothing in
 * this file may be imported from `src/app/(portal)`, `src/lib/portal` or
 * `src/components/portal` — `eslint.config.mjs` enforces that as a build error.
 *
 * Customer-facing code uses `@/lib/db/portal` instead.
 */

/**
 * Request-scoped client authenticated as the signed-in staff user.
 * Row Level Security applies, so this is the default for admin screens.
 *
 * `cookies()` is async in Next 16 — synchronous access was removed, not just
 * deprecated.
 */
export async function createStaffClient() {
  const env = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot set cookies. The session refresh will be
            // written by proxy.ts on the next request instead, which is the
            // documented pattern — safe to swallow.
          }
        },
      },
    },
  );
}

/**
 * Service-role client. Bypasses Row Level Security completely.
 *
 * Only for work that has no user context: migrations, the Excel importer,
 * scheduled purge jobs. Never use it to render a page — if RLS is bypassed on a
 * request path, a bug in our own auth check becomes a full data leak.
 */
export function createServiceRoleClient() {
  const { NEXT_PUBLIC_SUPABASE_URL } = getSupabaseEnv();
  const { SUPABASE_SERVICE_ROLE_KEY } = getServiceRoleEnv();

  return createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
