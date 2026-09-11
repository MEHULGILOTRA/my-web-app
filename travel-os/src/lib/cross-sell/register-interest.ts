import "server-only";

import { createStaffClient } from "@/lib/db/admin";

/**
 * The one place the customer portal is allowed to write.
 *
 * `portal_reader` is read-only by design — the pool even sets every session to
 * READ ONLY — so a cross-sell tap cannot create its own lead. This module is
 * the deliberate exception, built on the same principle as
 * `lib/documents/signed-url.ts`: a single narrow function, holding the admin
 * client, that verifies entitlement itself and returns nothing but a boolean.
 *
 * It lives outside `lib/portal/` on purpose. The ESLint boundary forbids that
 * directory from importing the admin client, and this file must never become a
 * general-purpose escape hatch from it — no query results, no cost fields, no
 * lead ids flow back to the caller.
 */

/**
 * Records that a traveller wants something, and turns it into a CRM lead.
 *
 * Returns true when the suggestion was moved to `interested`, false when it was
 * not theirs, was already acted on, or does not exist. The caller cannot tell
 * those apart, and should not: distinguishing them would let someone probe for
 * valid suggestion ids.
 */
export async function registerCrossSellInterest(
  suggestionId: string,
  customerId: string,
): Promise<boolean> {
  const supabase = await createStaffClient();

  const { data: suggestion } = await supabase
    .from("cross_sell_suggestions")
    .select("id, trip_id, customer_id, suggested_kind, headline, status")
    .eq("id", suggestionId)
    .maybeSingle();

  if (!suggestion) return false;

  /**
   * The suggestion id arrives from a form the customer controls, and this
   * client bypasses RLS — so ownership is proved here. Without it, tapping a
   * guessed id would create leads against other people's trips.
   */
  if (suggestion.customer_id !== customerId) return false;

  // Idempotent: a double tap, or a retried submission, must not create a second
  // lead for the same suggestion.
  if (suggestion.status !== "suggested" && suggestion.status !== "shown") {
    return false;
  }

  const { data: trip } = await supabase
    .from("trips")
    .select("id, reference, destination, is_international, household_id")
    .eq("id", suggestion.trip_id)
    .maybeSingle();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .insert({
      primary_customer_id: customerId,
      household_id: trip?.household_id ?? null,
      title: suggestion.headline,
      destination: trip?.destination ?? null,
      is_international: trip?.is_international ?? false,
      // `source` is what makes this measurable — the whole point of the portal
      // as a revenue loop is being able to count what it produced.
      source: "cross_sell",
      status: "new",
      notes: `Requested from the portal on trip ${trip?.reference ?? suggestion.trip_id}: ${suggestion.headline}`,
    })
    .select("id")
    .single();

  if (leadError || !lead) return false;

  await supabase
    .from("cross_sell_suggestions")
    .update({
      status: "interested",
      interested_at: new Date().toISOString(),
      converted_lead_id: lead.id,
    })
    .eq("id", suggestion.id);

  await supabase.from("timeline_events").insert({
    event_type: "cross_sell_interest",
    customer_id: customerId,
    trip_id: suggestion.trip_id,
    lead_id: lead.id,
    actor_type: "customer",
    title: `Interested in ${suggestion.suggested_kind}`,
    body: suggestion.headline,
  });

  return true;
}
