import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createStaffClient } from "@/lib/db/admin";

/**
 * Magic-link landing point.
 *
 * Supabase sends either `code` (PKCE) or `token_hash` + `type`, depending on
 * the project's email template, so both are handled.
 *
 * Signing in successfully is not the same as being allowed into the admin app.
 * Staff and customers are both rows in auth.users, so after establishing the
 * session this checks which one the account actually is and routes accordingly.
 * Without that check, a customer's magic link would open the CRM.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next");
  const next = nextParam?.startsWith("/") ? nextParam : "/";

  const supabase = await createStaffClient();

  let exchangeError: string | null = null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    exchangeError = error?.message ?? null;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    exchangeError = error?.message ?? null;
  } else {
    exchangeError = "missing_code";
  }

  if (exchangeError) {
    return NextResponse.redirect(`${origin}/login?error=link_expired`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=link_expired`);
  }

  const { data: staff } = await supabase
    .from("staff_users")
    .select("id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (staff?.is_active) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  // A valid account that is not active staff. If they are a customer, send them
  // to the portal; otherwise end the session rather than leaving them signed in
  // with nowhere to go.
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("portal_user_id", user.id)
    .maybeSingle();

  if (customer) {
    return NextResponse.redirect(`${origin}/my`);
  }

  await supabase.auth.signOut();
  return NextResponse.redirect(`${origin}/login?error=no_access`);
}
