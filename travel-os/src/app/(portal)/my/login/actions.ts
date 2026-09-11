"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";

import { getSupabaseEnv } from "@/lib/env";

/**
 * Customer authentication.
 *
 * Separate from the staff login on purpose. Sharing that module would mean one
 * change to it silently altering who can reach the other product — and these
 * two principals must never converge.
 *
 * No admin client anywhere in this file: signing in only needs the anon key.
 */

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password.").optional(),
});

export type PortalLoginState = { error?: string; sent?: string };

async function createAuthClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } =
    getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );
}

export async function signInWithPassword(
  _prev: PortalLoginState,
  formData: FormData,
): Promise<PortalLoginState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success || !parsed.data.password) {
    return { error: parsed.success ? "Enter your password." : parsed.error.issues[0].message };
  }

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Logged with its real cause, so a misconfigured environment is
    // distinguishable from a wrong password by the operator — the vague message
    // below is for the visitor, not for us.
    console.error("[portal-auth] sign-in failed:", {
      status: error.status,
      code: error.code,
      message: error.message,
    });
    return { error: "Incorrect email or password." };
  }

  redirect("/my");
}

/**
 * Magic link.
 *
 * `shouldCreateUser: false` is the security model: with it true, anyone who
 * typed any address into this form would have an account created for them.
 * Customer records are created by staff in the CRM; the auth trigger attaches a
 * signup to an existing customer by email and never invents one.
 */
export async function sendPortalMagicLink(
  _prev: PortalLoginState,
  formData: FormData,
): Promise<PortalLoginState> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3002";
  const protocol = host.startsWith("localhost") ? "http" : "https";

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${protocol}://${host}/auth/callback?next=/my`,
    },
  });

  if (error) {
    console.error("[portal-auth] magic link failed:", {
      status: error.status,
      code: error.code,
      message: error.message,
    });

    if (/rate limit|too many/i.test(error.message) || error.status === 429) {
      return {
        error: "Too many emails just now. Wait a minute, or sign in with your password.",
      };
    }
  }

  // Reported as sent either way, including when no such customer exists. The
  // form must not become a way to discover which addresses we hold.
  return { sent: parsed.data.email };
}
