/**
 * Builds a reviewable trip in the customer portal.
 *
 *   node scripts/seed-demo-trip.mjs <email>
 *
 * Idempotent: re-running replaces the demo trip's contents rather than stacking
 * duplicates, so it is safe to run repeatedly while iterating on the UI.
 *
 * It attaches the portal to an auth account that ALREADY EXISTS rather than
 * creating one. For the agency's own account that matters: flipping the staff
 * account's app_metadata to 'customer' is not needed — the portal resolves a
 * customer through `customers.portal_user_id`, so linking that column is enough
 * and the CRM login is left completely untouched.
 *
 * Delete it later with:
 *   node scripts/seed-demo-trip.mjs <email> --remove
 */

import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const root = path.resolve(import.meta.dirname, "..");
dotenv.config({ path: path.join(root, ".env.local"), quiet: true });

const args = process.argv.slice(2);
const remove = args.includes("--remove");
const email = args.find((a) => !a.startsWith("--"));

const TRIP_REFERENCE = "SKY-DEMO-001";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

/** Dates relative to today, so the trip is always "upcoming" on review day. */
function isoDate(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

const START = isoDate(24);
const DAY2 = isoDate(25);
const DAY3 = isoDate(26);
const END = isoDate(28);

async function findAuthUser(target) {
  for (let page = 1; page <= 20; page += 1) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (!data?.users?.length) return null;
    const match = data.users.find(
      (u) => u.email?.toLowerCase() === target.toLowerCase(),
    );
    if (match) return match;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function main() {
  const authUser = await findAuthUser(email);
  if (!authUser) {
    console.error(
      `No auth account for ${email}. Sign in to the CRM once, or create the ` +
        `account first with scripts/create-staff.mjs.`,
    );
    process.exitCode = 1;
    return;
  }

  // --- customer -----------------------------------------------------------

  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("portal_user_id", authUser.id)
    .maybeSingle();

  let customerId = existingCustomer?.id;

  if (!customerId) {
    const { data: byEmail } = await supabase
      .from("customers")
      .select("id")
      .ilike("email", email)
      .is("merged_into_customer_id", null)
      .maybeSingle();

    if (byEmail) {
      customerId = byEmail.id;
    } else {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          full_name: authUser.user_metadata?.full_name ?? "Demo Traveller",
          email,
          city: "Indore",
          customer_type: "vip",
        })
        .select("id")
        .single();

      if (error) {
        console.error("Could not create the customer record:", error.message);
        process.exitCode = 1;
        return;
      }
      customerId = data.id;
    }
  }

  await supabase
    .from("customers")
    .update({ portal_user_id: authUser.id, email })
    .eq("id", customerId);

  // --- clear any previous run --------------------------------------------

  const { data: old } = await supabase
    .from("trips")
    .select("id")
    .eq("reference", TRIP_REFERENCE)
    .maybeSingle();

  if (old) {
    // services, itinerary, travellers and cross-sell all cascade from trips.
    await supabase.from("trips").delete().eq("id", old.id);
  }

  if (remove) {
    console.log(`Removed ${TRIP_REFERENCE}.`);
    return;
  }

  // --- trip ---------------------------------------------------------------

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .insert({
      reference: TRIP_REFERENCE,
      title: "Bali — Ubud & Seminyak",
      destination: "Bali, Indonesia",
      is_international: true,
      start_date: START,
      end_date: END,
      status: "confirmed",
      currency: "INR",
      total_customer_price: 186000,
      itinerary_published: true,
      emergency_contacts: [
        { label: "SkyMiles 24x7", phone: "+911234567890" },
        { label: "Ubud hotel front desk", phone: "+6236198765" },
      ],
    })
    .select("id")
    .single();

  if (tripError) {
    console.error("Could not create the trip:", tripError.message);
    process.exitCode = 1;
    return;
  }

  await supabase.from("trip_travellers").insert({
    trip_id: trip.id,
    customer_id: customerId,
    is_booker: true,
    is_payer: true,
    is_lead_pax: true,
  });

  // --- services -----------------------------------------------------------
  //
  // supplier_cost is populated deliberately. The portal must render correctly
  // while real margin exists behind it — seeding zeros would make the privacy
  // boundary look correct without actually testing it.

  const services = [
    {
      sort_order: 1,
      kind: "flight",
      title: "Mumbai → Denpasar, Singapore Airlines SQ423",
      description: "Departs 01:15, arrives 14:50 via Singapore. 30kg checked baggage.",
      start_date: START,
      location: "Chhatrapati Shivaji Intl (BOM)",
      confirmation_number: "SQ7K2M",
      status: "confirmed",
      customer_price: 62000,
      supplier_cost: 54800,
    },
    {
      sort_order: 2,
      kind: "hotel",
      title: "Kayon Jungle Resort, Ubud — 3 nights",
      description: "Deluxe valley-view room, breakfast included.",
      start_date: START,
      end_date: DAY3,
      location: "Ubud, Bali",
      confirmation_number: "KJR-884120",
      status: "confirmed",
      customer_price: 58000,
      supplier_cost: 49500,
    },
    {
      sort_order: 3,
      kind: "transfer",
      title: "Airport pickup — private car",
      description: "Driver meets you at arrivals with a name board.",
      start_date: START,
      location: "Denpasar Airport",
      status: "confirmed",
      customer_price: 4500,
      supplier_cost: 3200,
    },
    {
      sort_order: 4,
      kind: "activity",
      title: "Mount Batur sunrise trek",
      description: "Pickup at 02:00. Guide, breakfast at the summit, hot springs after.",
      start_date: DAY2,
      location: "Mount Batur",
      status: "confirmed",
      customer_price: 11500,
      supplier_cost: 8000,
    },
    {
      sort_order: 5,
      kind: "hotel",
      title: "Alila Seminyak — 2 nights",
      description: "Ocean-view suite, breakfast included.",
      start_date: DAY3,
      end_date: END,
      location: "Seminyak, Bali",
      confirmation_number: "ALS-33901",
      status: "confirmed",
      customer_price: 50000,
      supplier_cost: 42000,
    },
  ];

  await supabase
    .from("services")
    .insert(services.map((s) => ({ ...s, trip_id: trip.id, qty: 1 })));

  // --- itinerary ----------------------------------------------------------

  const days = [
    {
      day_number: 1,
      date: START,
      title: "Arrival in Bali",
      summary: "Land at Denpasar, transfer to Ubud and settle in.",
      items: [
        { time_label: "14:50", title: "Arrive Denpasar" },
        { time_label: "15:30", title: "Private transfer to Ubud" },
        { time_label: "17:00", title: "Check in at Kayon Jungle Resort" },
      ],
    },
    {
      day_number: 2,
      date: DAY2,
      title: "Mount Batur at sunrise",
      summary: "An early start, and the best view on the island.",
      items: [
        { time_label: "02:00", title: "Pickup from hotel" },
        { time_label: "06:10", title: "Sunrise at the summit" },
        { time_label: "09:30", title: "Hot springs" },
      ],
    },
    {
      day_number: 3,
      date: DAY3,
      title: "Ubud to Seminyak",
      summary: "Rice terraces in the morning, coast by evening.",
      items: [
        { time_label: "09:00", title: "Tegallalang rice terraces" },
        { time_label: "14:00", title: "Transfer to Seminyak" },
        { time_label: "18:30", title: "Sunset at Petitenget beach" },
      ],
    },
  ];

  for (const day of days) {
    const { items, ...rest } = day;
    const { data: created } = await supabase
      .from("itinerary_days")
      .insert({ ...rest, trip_id: trip.id })
      .select("id")
      .single();

    if (created) {
      await supabase.from("itinerary_items").insert(
        items.map((item, index) => ({
          itinerary_day_id: created.id,
          sort_order: index + 1,
          ...item,
        })),
      );
    }
  }

  // --- a part payment, so a balance shows -------------------------------

  await supabase.from("payments").insert({
    direction: "inbound",
    trip_id: trip.id,
    customer_id: customerId,
    amount: 100000,
    currency: "INR",
    method: "bank_transfer",
    status: "cleared",
    paid_on: isoDate(-3),
    reference_no: "NEFT-DEMO-0001",
  });

  // --- a cross-sell suggestion ------------------------------------------

  await supabase.from("cross_sell_suggestions").insert({
    trip_id: trip.id,
    customer_id: customerId,
    rule_key: "no_insurance",
    suggested_kind: "insurance",
    headline: "Travelling internationally? Add travel insurance from SkyMiles.",
    status: "suggested",
  });

  console.log(`Created ${TRIP_REFERENCE} — Bali, ${START} to ${END}`);
  console.log(`Traveller: ${email}`);
  console.log(`Total ₹1,86,000 · paid ₹1,00,000 · balance ₹86,000`);
  console.log(`5 services, 3 itinerary days, 1 cross-sell suggestion`);
  console.log(`\nSign in at /my/login with that email and your CRM password.`);
}

if (!email) {
  console.error("Usage: node scripts/seed-demo-trip.mjs <email> [--remove]");
  process.exitCode = 1;
} else {
  await main();
}
