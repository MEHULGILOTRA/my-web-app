import "server-only";

import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseEnv } from "@/lib/env";
import { portalQueryOne } from "@/lib/db/portal";

/**
 * Who is signed into the customer portal.
 *
 * Deliberately NOT built on `@/lib/auth/session`: that resolves a staff member
 * through the admin client. A customer is a different kind of principal, and
 * conflating the two is how a portal page ends up holding a client that can
 * read margins.
 *
 * The Supabase client here is created with the **anon** key and is used for one
 * thing only — verifying the session cookie. Every piece of customer data is
 * then read through `portalQuery`, which connects as `portal_reader`.
 */

export type PortalCustomer = {
  id: string;
  portal_user_id: string;
  full_name: string;
  email: string | null;
  phone_e164: string | null;
  dob: string | null;
  anniversary: string | null;
};

/**
 * Reads the session cookie only. Cannot write cookies — a Server Component may
 * not — so token refresh is left to proxy.ts, which already does it.
 */
async function readAuthUser() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } =
    getSupabaseEnv();

  const cookieStore = await cookies();

  const supabase = createServerClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          /* Server Components cannot set cookies; proxy.ts refreshes. */
        },
      },
    },
  );

  // getUser() revalidates against Supabase. getSession() only decodes a cookie
  // the client could have forged, so it is never used for an access decision.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getPortalCustomer(): Promise<PortalCustomer | null> {
  const user = await readAuthUser();
  if (!user) return null;

  /**
   * A staff member signing in does not become a customer. The link is
   * `customers.portal_user_id`, set by the auth trigger only when
   * app_metadata.user_type is 'customer', so a staff session simply matches no
   * row here.
   */
  return portalQueryOne<PortalCustomer>(
    `select id, portal_user_id, full_name, email, phone_e164, dob, anniversary
       from public.portal_customer_v
      where portal_user_id = $1`,
    [user.id],
  );
}

/**
 * Guard for portal pages and server actions.
 *
 * proxy.ts does not gate `/my` — customer routes carry their own rules — so
 * this is the actual boundary, not a convenience.
 */
export async function requireCustomer(): Promise<PortalCustomer> {
  const customer = await getPortalCustomer();
  if (!customer) redirect("/my/login");
  return customer;
}
