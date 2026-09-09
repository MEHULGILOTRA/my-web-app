/**
 * Creates a staff account.
 *
 *   node scripts/create-staff.mjs <email> <password> "<Full Name>" [role]
 *
 * Staff cannot be created by ordinary signup, by design: the auth trigger only
 * writes a staff_users row when app_metadata.user_type is 'staff', and
 * app_metadata is writable only with the service role key. Otherwise anyone who
 * registered for the customer portal would become a staff member with access to
 * supplier costs and margins.
 *
 * role defaults to 'admin'.
 */

import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const root = path.resolve(import.meta.dirname, "..");
dotenv.config({ path: path.join(root, ".env.local"), quiet: true });

const [email, password, fullName, role = "admin"] = process.argv.slice(2);

if (!email || !password || !fullName) {
  console.error(
    'Usage: node scripts/create-staff.mjs <email> <password> "<Full Name>" [role]',
  );
  process.exit(1);
}

if (!["admin", "manager", "agent", "accounts"].includes(role)) {
  console.error(`Invalid role "${role}". Use admin, manager, agent or accounts.`);
  process.exit(1);
}

if (password.length < 12) {
  console.error("Use a password of at least 12 characters.");
  process.exit(1);
}

/** The admin API has no getUserByEmail, so page through until we find them. */
async function findUserByEmail(client, targetEmail) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) return null;
    const match = data.users.find(
      (u) => u.email?.toLowerCase() === targetEmail.toLowerCase(),
    );
    if (match) return match;
    if (data.users.length < 200) return null;
  }
  return null;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const appMetadata = { user_type: "staff", role };
const userMetadata = { full_name: fullName };

let userId;

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  app_metadata: appMetadata,
  user_metadata: userMetadata,
});

if (error) {
  // Idempotent: re-running for an existing account resets its password and
  // repairs the staff record rather than failing.
  const existing = await findUserByEmail(supabase, email);
  if (!existing) {
    console.error(`Could not create the account: ${error.message}`);
    process.exit(1);
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(
    existing.id,
    { password, app_metadata: appMetadata, user_metadata: userMetadata },
  );
  if (updateError) {
    console.error(`Could not update the existing account: ${updateError.message}`);
    process.exit(1);
  }
  console.log(`Account already existed — password and metadata updated.`);
  userId = existing.id;
} else {
  userId = data.user.id;
}

// Write the staff row explicitly rather than trusting the trigger.
//
// GoTrue inserts the auth.users row and applies app_metadata as two separate
// steps, so the AFTER INSERT trigger sees no 'user_type' marker and correctly
// does nothing. There is an AFTER UPDATE trigger to catch that, but depending
// on a third party's internal write ordering for something as important as
// "who is staff" is not a dependency worth having.
const { error: upsertError } = await supabase.from("staff_users").upsert(
  { id: userId, full_name: fullName, email, role, is_active: true },
  { onConflict: "id" },
);

if (upsertError) {
  console.error(`Could not write the staff record: ${upsertError.message}`);
  process.exit(1);
}

const { data: staff, error: staffError } = await supabase
  .from("staff_users")
  .select("id, full_name, email, role, is_active")
  .eq("id", userId)
  .maybeSingle();

if (staffError || !staff) {
  console.error("Staff record could not be read back after writing it.");
  process.exit(1);
}

console.log(`\nCreated ${staff.full_name} <${staff.email}> as ${staff.role}.`);
console.log("Sign in at http://localhost:3002/login\n");
