/**
 * Gives an existing customer a portal login.
 *
 *   node scripts/create-portal-user.mjs <email> <password>
 *   node scripts/create-portal-user.mjs <email> <password> --link "Lakshmi Iyer"
 *
 * The customer record must already exist — staff create customers in the CRM,
 * and an unrecognised signup must never become a ghost record with no trips
 * attached. By default the customer is found by matching email; `--link` finds
 * them by name instead and rewrites their email, which is what you want when
 * the CRM holds a placeholder address (seed data uses @example.com, which
 * cannot receive a magic link).
 *
 * app_metadata.user_type is 'customer', never 'staff'. That marker is the only
 * thing separating a traveller from someone who can see supplier costs and
 * margins, and it is settable only with the service role key.
 */

import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const root = path.resolve(import.meta.dirname, "..");
dotenv.config({ path: path.join(root, ".env.local"), quiet: true });

const args = process.argv.slice(2);
const linkIndex = args.indexOf("--link");
const linkName = linkIndex >= 0 ? args[linkIndex + 1] : null;
// Guarded on linkIndex >= 0: with no --link the index is -1, and `linkIndex + 1`
// would then be 0 — silently discarding the email argument.
const positional =
  linkIndex >= 0
    ? args.filter((_, index) => index !== linkIndex && index !== linkIndex + 1)
    : args;

const [email, password] = positional;

/** Returns a message when the arguments are unusable, otherwise null. */
function argumentProblem() {
  if (!email || !password) {
    return 'Usage: node scripts/create-portal-user.mjs <email> <password> [--link "Customer Name"]';
  }
  if (password.length < 12) {
    return "Use a password of at least 12 characters.";
  }
  return null;
}

/**
 * Failures set an exit code and return rather than calling process.exit().
 * process.exit() with the Supabase client's sockets still open aborts the
 * process with a libuv assertion on Windows, which turns a clean "no such
 * customer" message into an exit code of 127.
 */
function fail() {
  process.exitCode = 1;
}

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  /** The admin API has no getUserByEmail, so page through. */
  async function findAuthUser(target) {
    for (let page = 1; page <= 20; page += 1) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error || !data?.users?.length) return null;
      const match = data.users.find(
        (u) => u.email?.toLowerCase() === target.toLowerCase(),
      );
      if (match) return match;
      if (data.users.length < 200) return null;
    }
    return null;
  }

  // --- 1. Find the customer -------------------------------------------------

  let customer;

  if (linkName) {
    const { data, error } = await supabase
      .from("customers")
      .select("id, full_name, email, portal_user_id")
      .ilike("full_name", linkName)
      .is("merged_into_customer_id", null)
      .limit(2);

    if (error) {
      console.error("Lookup failed:", error.message);
      return fail();
    }
    if (!data?.length) {
      console.error(`No customer named "${linkName}".`);
      return fail();
    }
    if (data.length > 1) {
      console.error(`More than one customer named "${linkName}". Be more specific.`);
      return fail();
    }
    customer = data[0];
  } else {
    const { data } = await supabase
      .from("customers")
      .select("id, full_name, email, portal_user_id")
      .ilike("email", email)
      .is("merged_into_customer_id", null)
      .maybeSingle();

    if (!data) {
      console.error(
        `No customer with email ${email}.\n` +
          `Create them in the CRM first, or pass --link "Their Name" to attach ` +
          `this email to an existing record.`,
      );
      return fail();
    }
    customer = data;
  }

  // --- 2. Create or update the auth account ---------------------------------

  let authUser = await findAuthUser(email);

  if (authUser) {
    const { error } = await supabase.auth.admin.updateUserById(authUser.id, {
      password,
      email_confirm: true,
      app_metadata: { user_type: "customer" },
    });
    if (error) {
      console.error("Could not update the account:", error.message);
      return fail();
    }
    console.log(`Updated existing account ${email}`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      // Confirmed outright: a traveller given credentials by their agent should
      // not have to find a verification email before they can sign in.
      email_confirm: true,
      app_metadata: { user_type: "customer" },
      user_metadata: { full_name: customer.full_name },
    });
    if (error) {
      console.error("Could not create the account:", error.message);
      return fail();
    }
    authUser = data.user;
    console.log(`Created account ${email}`);
  }

  // --- 3. Link it, explicitly ------------------------------------------------

  /**
   * The auth trigger links on INSERT, but Supabase's admin.createUser inserts the
   * row first and applies app_metadata separately — so the trigger can fire
   * before `user_type` exists and do nothing at all. That bit us on staff
   * creation; the fix there and here is the same: write the link ourselves rather
   * than trusting the trigger observed the marker.
   */
  const { error: linkError } = await supabase
    .from("customers")
    .update({ portal_user_id: authUser.id, email })
    .eq("id", customer.id);

  if (linkError) {
    console.error("Account exists but linking failed:", linkError.message);
    return fail();
  }

  // --- 4. Prove it ----------------------------------------------------------

  const { data: check } = await supabase
    .from("customers")
    .select("full_name, email, portal_user_id")
    .eq("id", customer.id)
    .single();

  const { data: trips } = await supabase
    .from("trip_travellers")
    .select("trip_id")
    .eq("customer_id", customer.id);

  console.log(`\nLinked to ${check.full_name} (${check.email})`);
  console.log(`Portal user id: ${check.portal_user_id}`);
  console.log(`Trips visible to them: ${trips?.length ?? 0}`);

  if (!trips?.length) {
    console.log(
      "\nNote: they are not a traveller on any trip yet, so the portal will be " +
        "empty. Add them to a trip's travellers in the CRM.",
    );
  }

}

const problem = argumentProblem();

if (problem) {
  // Printed plainly. Throwing would add a stack trace that says nothing useful
  // about a mistyped command.
  console.error(problem);
  process.exitCode = 1;
} else {
  await main();
}
