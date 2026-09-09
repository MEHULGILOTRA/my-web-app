/**
 * Prints a working sign-in link for an existing account, without sending email.
 *
 *   node scripts/magic-link.mjs <email> [redirect-origin]
 *
 * Useful because Supabase's built-in SMTP allows only a handful of messages per
 * hour, which makes testing the login flow painful, and because the default
 * sender frequently lands in spam. For production, configure a custom SMTP
 * provider in the Supabase dashboard.
 *
 * Only generates links for accounts that already exist — it cannot create one.
 */

import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const root = path.resolve(import.meta.dirname, "..");
dotenv.config({ path: path.join(root, ".env.local"), quiet: true });

const [email, origin = "http://localhost:3002"] = process.argv.slice(2);

if (!email) {
  console.error("Usage: node scripts/magic-link.mjs <email> [redirect-origin]");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const { data, error } = await supabase.auth.admin.generateLink({
  type: "magiclink",
  email,
  options: { redirectTo: `${origin}/auth/callback?next=/` },
});

if (error) {
  console.error(`Could not generate a link: ${error.message}`);
  process.exit(1);
}

const direct = `${origin}/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink&next=/`;

console.log(`\nSign-in link for ${email} (as the email would send it):\n`);
console.log(data.properties.action_link);
console.log(`\nOr go straight to the app, skipping Supabase's redirect:\n`);
console.log(direct);
console.log("\nEither is single use and expires in one hour.\n");
