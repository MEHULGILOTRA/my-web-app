/**
 * Diagnoses magic-link email delivery.
 *
 *   node scripts/test-email.mjs <email>
 *
 * The login form deliberately reports success even when sending fails, so that
 * it cannot be used to discover which addresses have accounts. That is right
 * for the form and useless for debugging — this reports the raw error.
 */

import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const root = path.resolve(import.meta.dirname, "..");
dotenv.config({ path: path.join(root, ".env.local"), quiet: true });

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/test-email.mjs <email>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log(`\nProject: ${url}`);
console.log(`Testing delivery to: ${email}\n`);

// 1. Does the account exist at all? A magic link is never sent to an unknown
//    address, because shouldCreateUser is false.
const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
const user = list?.users?.find(
  (u) => u.email?.toLowerCase() === email.toLowerCase(),
);

if (!user) {
  console.log("✗ No account with that email exists.");
  console.log("  Magic links are only sent to existing accounts, by design.");
  console.log("  Create one with: node scripts/create-staff.mjs …\n");
  process.exit(1);
}

console.log(`✓ Account exists (${user.id})`);
console.log(`  confirmed: ${user.email_confirmed_at ? "yes" : "no"}`);
console.log(`  user_type: ${user.app_metadata?.user_type ?? "(none)"}`);

// 2. Try an actual send, as the browser would.
const client = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { error } = await client.auth.signInWithOtp({
  email,
  options: {
    shouldCreateUser: false,
    emailRedirectTo: "http://localhost:3002/auth/callback?next=/",
  },
});

if (!error) {
  console.log("\n✓ Supabase accepted the send request.");
  console.log("  If nothing arrives, the message was accepted then dropped —");
  console.log("  check spam, then configure custom SMTP (see below).\n");
} else {
  console.log(`\n✗ Send failed: ${error.message}`);
  console.log(`  status: ${error.status ?? "?"}  code: ${error.code ?? "?"}`);

  if (/rate|limit|429/i.test(`${error.message}${error.status}`)) {
    console.log(
      "\n  Supabase's built-in SMTP is rate limited to a handful of emails\n" +
        "  per hour across the whole project. This is the usual cause.",
    );
  }
  console.log("");
}

console.log(
  "Built-in Supabase email is for development only: a few messages an hour,\n" +
    "frequently spam-filtered, and on newer projects restricted to the addresses\n" +
    "of your own organisation members.\n\n" +
    "Fix: Dashboard → Project Settings → Authentication → SMTP Settings,\n" +
    "and point it at a real provider (Resend, Brevo, SES).\n\n" +
    "Meanwhile, generate a link directly:\n" +
    "  node scripts/magic-link.mjs " +
    email +
    "\n",
);
