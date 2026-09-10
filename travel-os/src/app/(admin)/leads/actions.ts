"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaff } from "@/lib/auth/session";
import { createStaffClient } from "@/lib/db/admin";

const quickAddSchema = z.object({
  full_name: z.string().trim().min(1, "Enter a name."),
  phone: z.string().trim().min(1, "Enter a contact number."),
  destination: z.string().trim().optional(),
  travel_month: z.string().trim().optional(),
  pax_adults: z.coerce.number().int().min(0).max(99).default(1),
  pax_children: z.coerce.number().int().min(0).max(99).default(0),
  source: z.string().trim().default("whatsapp"),
  is_international: z.coerce.boolean().default(false),
  priority: z.enum(["hot", "warm", "cold"]).default("warm"),
});

export type QuickAddState = {
  error?: string;
  created?: { leadId: string; reference: string; customerCreated: boolean };
};

/**
 * Create a lead in one round trip.
 *
 * requireStaff() is called even though proxy.ts already redirects signed-out
 * visitors — the Next docs are explicit that Server Functions can lose proxy
 * coverage when routes move, so authorisation is checked here too.
 */
export async function quickAddLead(
  _prev: QuickAddState,
  formData: FormData,
): Promise<QuickAddState> {
  await requireStaff();

  const parsed = quickAddSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone") ?? undefined,
    destination: formData.get("destination") ?? undefined,
    travel_month: formData.get("travel_month") ?? undefined,
    pax_adults: formData.get("pax_adults") ?? 1,
    pax_children: formData.get("pax_children") ?? 0,
    source: formData.get("source") ?? "whatsapp",
    is_international: formData.get("is_international") === "on",
    priority: formData.get("priority") ?? "warm",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createStaffClient();
  const { data, error } = await supabase
    .rpc("quick_add_lead", {
      p_full_name: parsed.data.full_name,
      p_phone: parsed.data.phone || null,
      p_destination: parsed.data.destination || null,
      p_travel_month: parsed.data.travel_month || null,
      p_travel_start: null,
      p_pax_adults: parsed.data.pax_adults,
      p_pax_children: parsed.data.pax_children,
      p_source: parsed.data.source,
      p_is_international: parsed.data.is_international,
      p_priority: parsed.data.priority,
    })
    .single();

  if (error) {
    return { error: error.message };
  }

  const row = data as {
    lead_id: string;
    lead_reference: string;
    customer_created: boolean;
  };

  revalidatePath("/leads");
  revalidatePath("/");

  return {
    created: {
      leadId: row.lead_id,
      reference: row.lead_reference,
      customerCreated: row.customer_created,
    },
  };
}

export async function setLeadStage(
  leadId: string,
  status: string,
  lostReason?: string,
) {
  await requireStaff();

  const supabase = await createStaffClient();
  const { error } = await supabase.rpc("set_lead_stage", {
    p_lead_id: leadId,
    p_status: status,
    p_lost_reason: lostReason ?? null,
    p_note: null,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
}

// ---------------------------------------------------------------------------
// Delete and restore
//
// Soft delete: quotations cascade from leads, so a hard delete would destroy
// priced work on a mis-click. The database function stamps deleted_at, writes a
// timeline entry, and refuses to remove a lead that has become a trip.
// ---------------------------------------------------------------------------

export type DeleteLeadState = { error?: string; deleted?: boolean };

export async function deleteLead(
  _prev: DeleteLeadState,
  formData: FormData,
): Promise<DeleteLeadState> {
  await requireStaff();

  const leadId = String(formData.get("lead_id") ?? "");
  if (!leadId) return { error: "Missing lead." };

  const reason = String(formData.get("reason") ?? "").trim();

  const supabase = await createStaffClient();
  const { error } = await supabase.rpc("delete_lead", {
    p_lead_id: leadId,
    p_reason: reason || null,
  });

  // P0001 is the converted-to-a-trip refusal, raised with a message written to
  // be read by an agent. Everything else is unexpected and reported as-is.
  if (error) return { error: error.message };

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/");
  return { deleted: true };
}

export async function restoreLead(leadId: string) {
  await requireStaff();

  const supabase = await createStaffClient();
  const { error } = await supabase.rpc("restore_lead", { p_lead_id: leadId });
  if (error) throw new Error(error.message);

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Full lead edit
// ---------------------------------------------------------------------------

/** Empty strings from a form mean "not set", not "set to empty". */
const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .nullable();

const optionalNumber = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : Number(value)))
  .nullable()
  .refine((value) => value === null || Number.isFinite(value), "Invalid number");

const optionalDate = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .nullable();

const editSchema = z.object({
  // Customer fields, stored on customers rather than the lead.
  full_name: z.string().trim().min(1, "Name is required."),
  phone: z.string().trim().min(1, "Contact number is required."),
  email: optionalText,
  city: optionalText,
  customer_type: optionalText,

  lead_date: optionalDate,
  destination: optionalText,
  is_international: z.coerce.boolean(),
  origin_city: optionalText,
  travel_start: optionalDate,
  duration_nights: optionalNumber,
  travel_month: optionalText,
  pax_adults: z.coerce.number().int().min(0).max(99),
  pax_children: z.coerce.number().int().min(0).max(99),

  travel_theme: optionalText,
  hotel_category: optionalText,
  meal_plan: optionalText,
  dietary_preference: optionalText,
  room_configuration: optionalText,
  preferred_airline: optionalText,

  flights_status: optionalText,
  visa_status: optionalText,
  transfers_status: optionalText,
  insurance_status: optionalText,
  forex_status: optionalText,
  activities_status: optionalText,

  budget_min: optionalNumber,
  budget_max: optionalNumber,
  source: z.string().trim().default("whatsapp"),
  priority: z.enum(["hot", "warm", "cold"]),
  next_followup_date: optionalDate,
  owner_staff_id: optionalText,
  special_occasion: optionalText,
  special_notes: optionalText,
});

export type LeadFormState = {
  error?: string;
  ok?: boolean;
  /** Set by createLead so the form knows where to navigate. */
  leadId?: string;
};

export async function updateLead(
  _prev: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  await requireStaff();

  const leadId = String(formData.get("lead_id") ?? "");
  if (!leadId) return { error: "Missing lead." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = editSchema.safeParse({
    ...raw,
    is_international: formData.get("is_international") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = parsed.data;

  // The database refuses a children_ages array whose length disagrees with
  // pax_children, so build it from exactly that many inputs and send null when
  // there are no children.
  const ages: number[] = [];
  for (let index = 0; index < data.pax_children; index += 1) {
    const value = formData.get(`child_age_${index}`);
    const age = Number(value);
    ages.push(Number.isFinite(age) && age >= 0 ? Math.trunc(age) : 0);
  }

  const supabase = await createStaffClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("primary_customer_id")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) return { error: "Lead not found." };

  if (lead.primary_customer_id) {
    const { error: customerError } = await supabase
      .from("customers")
      .update({
        full_name: data.full_name,
        phone_raw: data.phone,
        email: data.email,
        city: data.city,
        ...(data.customer_type ? { customer_type: data.customer_type } : {}),
      })
      .eq("id", lead.primary_customer_id);

    if (customerError) {
      // The partial unique index on phone_e164 is the likely culprit, and the
      // raw message ("duplicate key value violates…") means nothing to an agent.
      if (customerError.code === "23505") {
        return {
          error:
            "Another customer already has that phone number. Open that record instead, or use a different number.",
        };
      }
      return { error: customerError.message };
    }
  }

  const { error } = await supabase
    .from("leads")
    .update({
      lead_date: data.lead_date,
      destination: data.destination,
      is_international: data.is_international,
      origin_city: data.origin_city,
      travel_start: data.travel_start,
      travel_end: null, // re-derived from duration by the leads_sync_dates trigger
      duration_nights: data.duration_nights,
      travel_month: data.travel_month,
      pax_adults: data.pax_adults,
      pax_children: data.pax_children,
      children_ages: data.pax_children > 0 ? ages : null,
      travel_theme: data.travel_theme,
      hotel_category: data.hotel_category,
      meal_plan: data.meal_plan,
      dietary_preference: data.dietary_preference,
      room_configuration: data.room_configuration,
      preferred_airline: data.preferred_airline,
      flights_status: data.flights_status,
      visa_status: data.visa_status,
      transfers_status: data.transfers_status,
      insurance_status: data.insurance_status,
      forex_status: data.forex_status,
      activities_status: data.activities_status,
      budget_min: data.budget_min,
      budget_max: data.budget_max,
      source: data.source,
      priority: data.priority,
      next_followup_date: data.next_followup_date,
      owner_staff_id: data.owner_staff_id,
      special_occasion: data.special_occasion,
      special_notes: data.special_notes,
    })
    .eq("id", leadId);

  if (error) return { error: error.message };

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  return { ok: true };
}

/**
 * Create a lead with the full field set.
 *
 * The customer match is delegated to the quick_add_lead RPC rather than
 * reimplemented: that function normalises the phone with the same SQL the
 * unique index uses, finds-or-creates atomically, and writes the timeline
 * entry. Doing it again here would be a second implementation free to drift.
 * Everything beyond name and phone is then applied as an update.
 */
export async function createLead(
  _prev: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  await requireStaff();

  const parsed = editSchema.safeParse({
    ...Object.fromEntries(formData.entries()),
    is_international: formData.get("is_international") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const data = parsed.data;
  const supabase = await createStaffClient();

  const { data: created, error: rpcError } = await supabase
    .rpc("quick_add_lead", {
      p_full_name: data.full_name,
      p_phone: data.phone,
      p_destination: data.destination,
      p_travel_month: data.travel_month,
      p_travel_start: data.travel_start,
      p_pax_adults: data.pax_adults,
      p_pax_children: data.pax_children,
      p_source: data.source,
      p_is_international: data.is_international,
      p_priority: data.priority,
    })
    .single();

  if (rpcError) return { error: rpcError.message };

  const row = created as { lead_id: string; customer_id: string };

  const ages: number[] = [];
  for (let index = 0; index < data.pax_children; index += 1) {
    const age = Number(formData.get(`child_age_${index}`));
    ages.push(Number.isFinite(age) && age >= 0 ? Math.trunc(age) : 0);
  }

  const { error: customerError } = await supabase
    .from("customers")
    .update({
      email: data.email,
      city: data.city,
      ...(data.customer_type ? { customer_type: data.customer_type } : {}),
    })
    .eq("id", row.customer_id);

  if (customerError) return { error: customerError.message };

  const { error } = await supabase
    .from("leads")
    .update({
      lead_date: data.lead_date,
      origin_city: data.origin_city,
      duration_nights: data.duration_nights,
      children_ages: data.pax_children > 0 ? ages : null,
      travel_theme: data.travel_theme,
      hotel_category: data.hotel_category,
      meal_plan: data.meal_plan,
      dietary_preference: data.dietary_preference,
      room_configuration: data.room_configuration,
      preferred_airline: data.preferred_airline,
      flights_status: data.flights_status,
      visa_status: data.visa_status,
      transfers_status: data.transfers_status,
      insurance_status: data.insurance_status,
      forex_status: data.forex_status,
      activities_status: data.activities_status,
      budget_min: data.budget_min,
      budget_max: data.budget_max,
      next_followup_date: data.next_followup_date,
      owner_staff_id: data.owner_staff_id,
      special_occasion: data.special_occasion,
      special_notes: data.special_notes,
    })
    .eq("id", row.lead_id);

  if (error) return { error: error.message };

  revalidatePath("/leads");
  revalidatePath("/");
  return { ok: true, leadId: row.lead_id };
}
