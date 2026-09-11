"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireStaff } from "@/lib/auth/session";
import { createStaffClient } from "@/lib/db/admin";
import { loadQuotationForText } from "@/lib/quotation-data";
import {
  forexCost,
  forexTotal,
  KIND_FIELDS,
  PRICE_DERIVED_KINDS,
  visibleFields,
} from "@/lib/quotations/line-item-kinds";

/** Creates the first quotation for a lead, inheriting its trip details. */
export async function createQuotationForLead(leadId: string) {
  await requireStaff();
  const supabase = await createStaffClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("id, reference, destination, is_international, budget_max")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead) throw new Error("Lead not found");

  const { data: existing } = await supabase
    .from("quotations")
    .select("id, version")
    .eq("lead_id", leadId)
    .order("version", { ascending: false })
    .limit(1);

  // A lead that already has quotations gets a new version rather than a
  // parallel V1 — the versioning rule is the whole point.
  if (existing && existing.length > 0) {
    const { data: newId, error } = await supabase.rpc("duplicate_quotation", {
      p_quotation_id: existing[0].id,
    });
    if (error) throw new Error(error.message);
    revalidatePath(`/leads/${leadId}`);
    redirect(`/quotations/${newId}`);
  }

  const settings = await loadSettings(supabase);

  const { data: created, error } = await supabase
    .from("quotations")
    .insert({
      lead_id: leadId,
      version: 1,
      reference: `SKY-Q-${lead.reference ?? "LEAD"}-V1`,
      title: lead.destination,
      status: "draft",
      is_international: lead.is_international,
      tcs_rate_percent: lead.is_international ? settings.tcsRate : null,
      tcs_note: lead.is_international ? settings.tcsNote : null,
      terms: settings.terms,
      client_budget: lead.budget_max,
      valid_until: new Date(Date.now() + settings.validityDays * 86_400_000)
        .toISOString()
        .slice(0, 10),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/leads/${leadId}`);
  redirect(`/quotations/${created.id}`);
}

type SupabaseClient = Awaited<ReturnType<typeof createStaffClient>>;

async function loadSettings(supabase: SupabaseClient) {
  const { data } = await supabase.from("settings").select("key, value");
  const map = new Map((data ?? []).map((row) => [row.key, row.value]));
  return {
    tcsRate: Number(map.get("tcs_rate_percent") ?? 2),
    tcsNote: String(map.get("tcs_note") ?? ""),
    terms: String(map.get("quote_terms") ?? ""),
    validityDays: Number(map.get("quote_validity_days") ?? 7),
  };
}

const itemSchema = z.object({
  quotation_id: z.string().uuid(),
  kind: z.enum([
    "flight",
    "hotel",
    "visa",
    "forex",
    "transfer",
    "activity",
    "insurance",
    "other",
  ]),
  title: z.string().trim().min(1, "Give the line a title."),
  description: z.string().trim().optional(),
  qty: z.coerce.number().positive().max(999),
  unit: z.string().trim().optional(),
  customer_price: z.coerce.number().min(0),
  est_supplier_cost: z.coerce.number().min(0),
  is_optional: z.coerce.boolean().default(false),
});

export type ItemState = { error?: string; ok?: boolean };

/**
 * Detail fields for the line's kind, out of the `meta_*` form inputs.
 *
 * Driven by KIND_FIELDS rather than by whatever the form happened to submit:
 * only declared fields for the declared kind are stored, so a stale input left
 * over from switching type cannot end up printed on a customer's quotation.
 * Empty values are dropped rather than stored as "".
 */
function collectMeta(kind: string, formData: FormData): Record<string, string> {
  const collected: Record<string, string> = {};

  for (const spec of KIND_FIELDS[kind] ?? []) {
    const raw = formData.get(`meta_${spec.name}`);
    const value = typeof raw === "string" ? raw.trim() : "";
    if (value) collected[spec.name] = value;
  }

  /**
   * Second pass drops conditional fields whose condition is not met — a return
   * leg on a one-way flight, for instance. The form already hides them, but a
   * Server Action is a public endpoint: the browser is not the only thing that
   * can post here, and data that reaches the row gets printed on a quotation.
   */
  const meta: Record<string, string> = {};
  for (const spec of visibleFields(kind, collected)) {
    if (collected[spec.name]) meta[spec.name] = collected[spec.name];
  }

  return meta;
}

/**
 * Applies a derived price where the kind computes its own total.
 *
 * Forex is priced by arithmetic — amount x rate plus charges — so the generic
 * Qty/Price/Cost inputs are hidden for it in the form. Doing the sum here, on
 * the server, rather than posting a number from the browser means the figure
 * printed on the quotation is the same one stored against the line.
 */
function applyDerivedPrice(
  kind: string,
  meta: Record<string, string>,
  parsed: { qty: number; customer_price: number; est_supplier_cost: number },
) {
  if (!PRICE_DERIVED_KINDS.has(kind)) return parsed;

  return {
    ...parsed,
    qty: 1,
    customer_price: forexTotal(meta) ?? 0,
    est_supplier_cost: forexCost(meta),
  };
}

export async function addQuotationItem(
  _prev: ItemState,
  formData: FormData,
): Promise<ItemState> {
  await requireStaff();

  const parsed = itemSchema.safeParse({
    quotation_id: formData.get("quotation_id"),
    kind: formData.get("kind"),
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    qty: formData.get("qty") ?? 1,
    unit: formData.get("unit") ?? undefined,
    customer_price: formData.get("customer_price") ?? 0,
    est_supplier_cost: formData.get("est_supplier_cost") ?? 0,
    is_optional: formData.get("is_optional") === "on",
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createStaffClient();

  const { count } = await supabase
    .from("quotation_items")
    .select("id", { count: "exact", head: true })
    .eq("quotation_id", parsed.data.quotation_id);

  const meta = collectMeta(parsed.data.kind, formData);

  const { error } = await supabase.from("quotation_items").insert({
    ...parsed.data,
    ...applyDerivedPrice(parsed.data.kind, meta, parsed.data),
    description: parsed.data.description || null,
    unit: parsed.data.unit || null,
    meta,
    sort_order: (count ?? 0) + 1,
  });

  if (error) return { error: error.message };

  revalidatePath(`/quotations/${parsed.data.quotation_id}`);
  return { ok: true };
}

/**
 * Edits an existing line.
 *
 * Draft-only, matching every other write here: once a quotation is sent it is
 * superseded by a new version rather than edited, so an old share link always
 * shows what was actually offered.
 */
export async function updateQuotationItem(
  _prev: ItemState,
  formData: FormData,
): Promise<ItemState> {
  await requireStaff();

  const itemId = String(formData.get("item_id") ?? "");
  if (!itemId) return { error: "Missing line item." };

  const parsed = itemSchema.safeParse({
    quotation_id: formData.get("quotation_id"),
    kind: formData.get("kind"),
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    qty: formData.get("qty") ?? 1,
    unit: formData.get("unit") ?? undefined,
    customer_price: formData.get("customer_price") ?? 0,
    est_supplier_cost: formData.get("est_supplier_cost") ?? 0,
    is_optional: formData.get("is_optional") === "on",
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createStaffClient();

  const { quotation_id, ...fields } = parsed.data;

  const meta = collectMeta(fields.kind, formData);

  const { error } = await supabase
    .from("quotation_items")
    .update({
      ...fields,
      ...applyDerivedPrice(fields.kind, meta, fields),
      description: fields.description || null,
      unit: fields.unit || null,
      meta,
    })
    .eq("id", itemId)
    .eq("quotation_id", quotation_id);

  if (error) return { error: error.message };

  revalidatePath(`/quotations/${quotation_id}`);
  return { ok: true };
}

export async function deleteQuotationItem(itemId: string, quotationId: string) {
  await requireStaff();
  const supabase = await createStaffClient();
  const { error } = await supabase
    .from("quotation_items")
    .delete()
    .eq("id", itemId);
  if (error) throw new Error(error.message);
  revalidatePath(`/quotations/${quotationId}`);
}

export async function updateQuotation(
  quotationId: string,
  patch: { discount?: number; valid_until?: string | null; title?: string },
) {
  await requireStaff();
  const supabase = await createStaffClient();
  const { error } = await supabase
    .from("quotations")
    .update(patch)
    .eq("id", quotationId)
    .eq("status", "draft");
  if (error) throw new Error(error.message);
  revalidatePath(`/quotations/${quotationId}`);
}

/**
 * Freeze and send.
 *
 * The snapshot is built here, from the customer-facing projection only — it
 * must never carry est_supplier_cost or any derived margin, because it is
 * served through portal_quotation_v.
 */
export async function sendQuotation(quotationId: string) {
  const staff = await requireStaff();
  const supabase = await createStaffClient();

  const payload = await loadQuotationForText(supabase, quotationId);
  if (!payload) throw new Error("Quotation not found");

  const snapshot = {
    version: payload.quote.version,
    title: payload.quote.title,
    destination: payload.quote.destination,
    travel_start: payload.quote.travel_start,
    travel_end: payload.quote.travel_end,
    travel_month: payload.quote.travel_month,
    duration_nights: payload.quote.duration_nights,
    pax_adults: payload.quote.pax_adults,
    pax_children: payload.quote.pax_children,
    currency: payload.quote.currency,
    subtotal: payload.quote.subtotal,
    discount: payload.quote.discount,
    total: payload.quote.total,
    is_international: payload.quote.is_international,
    tcs_rate_percent: payload.quote.tcs_rate_percent,
    tcs_amount: payload.quote.tcs_amount,
    total_payable: payload.quote.total_payable,
    tcs_note: payload.quote.tcs_note,
    terms: payload.quote.terms,
    valid_until: payload.quote.valid_until,
    prepared_by: staff.full_name,
    // Costs are deliberately absent. Do not add them here.
    lines: payload.lines.map((line) => ({
      // sort_order is carried because renderQuotationText sorts on it. Without
      // it a snapshot re-rendered later compares undefined values and the
      // included items come back in arbitrary order.
      sort_order: line.sort_order,
      kind: line.kind,
      title: line.title,
      description: line.description,
      // The per-kind detail — meal plan, check-in dates, flight timings. A
      // frozen quote has to keep printing exactly what the customer was shown,
      // and that detail is part of what they were shown.
      meta: line.meta ?? {},
      qty: line.qty,
      unit: line.unit,
      customer_price: line.customer_price,
      line_total: line.line_total,
      is_optional: line.is_optional,
      is_included: line.is_included,
    })),
    // Frozen with the rest: a sent quotation must keep showing the itinerary
    // the customer was actually given, even if the draft is later re-planned.
    days: payload.days,
  };

  const { error } = await supabase.rpc("send_quotation", {
    p_quotation_id: quotationId,
    p_snapshot: snapshot,
    p_share_token: randomBytes(16).toString("hex"),
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/quotations/${quotationId}`);
  revalidatePath("/leads");
}

export async function reviseQuotation(quotationId: string) {
  await requireStaff();
  const supabase = await createStaffClient();
  const { data: newId, error } = await supabase.rpc("duplicate_quotation", {
    p_quotation_id: quotationId,
  });
  if (error) throw new Error(error.message);
  redirect(`/quotations/${newId}`);
}

/** Records that the agent copied the message and sent it by hand. */
export async function logWhatsAppCopy(quotationId: string) {
  const staff = await requireStaff();
  const supabase = await createStaffClient();

  const { data: quote } = await supabase
    .from("quotations")
    .select("id, reference, lead_id, leads:lead_id(primary_customer_id)")
    .eq("id", quotationId)
    .maybeSingle();

  const lead = quote?.leads as unknown as {
    primary_customer_id: string | null;
  } | null;

  await supabase.from("message_log").insert({
    channel: "manual_whatsapp",
    direction: "outbound",
    customer_id: lead?.primary_customer_id ?? null,
    lead_id: quote?.lead_id ?? null,
    quotation_id: quotationId,
    template_key: "quotation",
    subject: quote?.reference ?? null,
    status: "logged",
    sent_by: staff.id,
  });
}
