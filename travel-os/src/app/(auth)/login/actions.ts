"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createStaffClient } from "@/lib/db/admin";

const emailSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  next: z.string().optional(),
});

const passwordSchema = emailSchema.extend({
  password: z.string().min(1, "Enter your password."),
});

export type LoginState = { error?: string; sent?: string };

async function originUrl(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3002";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

/**
 * Email magic link.
 *
 * shouldCreateUser is false, and that is the whole security model here: with it
 * true, anyone who typed any address into this form would have an account
 * created and be signed straight into the admin app. Staff accounts are created
 * deliberately, by scripts/create-staff.mjs.
 */
export async function sendMagicLink(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = emailSchema.safeParse({
    email: formData.get("email"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const origin = await originUrl();
  const next = parsed.data.next?.startsWith("/") ? parsed.data.next : "/";
  const supabase = await createStaffClient();

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    // Logged server-side because the response below is deliberately vague: the
    // form must not become a way to discover which addresses have accounts.
    // Without this line a genuine delivery failure is invisible to everyone.
    console.error("[auth] magic link send failed:", {
      status: error.status,
      code: error.code,
      message: error.message,
    });

    // Rate limiting is worth naming, because Supabase's built-in SMTP allows
    // only a handful of emails per hour and the generic message would send
    // someone hunting for a problem that isn't theirs.
    if (/rate limit|too many/i.test(error.message) || error.status === 429) {
      return {
        error:
          "Too many sign-in emails just now. Wait a minute and try again, or use a password.",
      };
    }

    // Everything else — including "no such user" — reports as sent.
    return { sent: parsed.data.email };
  }

  return { sent: parsed.data.email };
}

/** Password sign-in, kept as a fallback for when email is slow or rate-limited. */
export async function signIn(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = passwordSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createStaffClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Logged server-side for the same reason sendMagicLink logs: the response
    // below is deliberately vague, so without this line a misconfigured
    // environment is indistinguishable from a typo'd password — by the
    // operator as well as by an attacker. `status` is the one that matters:
    // 400 is genuinely bad credentials, anything else is infrastructure.
    console.error("[auth] password sign-in failed:", {
      status: error.status,
      code: error.code,
      message: error.message,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length,
    });

    // Not distinguishing "no such account" from "wrong password" — that
    // difference tells an attacker which addresses are registered.
    return { error: "Incorrect email or password." };
  }

  const next = parsed.data.next;
  redirect(next && next.startsWith("/") ? next : "/");
}

export async function signOut() {
  const supabase = await createStaffClient();
  await supabase.auth.signOut();
  redirect("/login");
}
