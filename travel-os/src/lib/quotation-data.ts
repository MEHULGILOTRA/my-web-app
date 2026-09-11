import "server-only";

import type { createStaffClient } from "@/lib/db/admin";
import type {
  QuotationDay,
  QuotationForText,
  QuotationLine,
} from "@/lib/quotation-text";

type SupabaseClient = Awaited<ReturnType<typeof createStaffClient>>;

export type QuotationPayload = {
  quote: QuotationForText & {
    id: string;
    reference: string | null;
    status: string;
    lead_id: string;
    share_token: string | null;
    sent_at: string | null;
    customer_name: string | null;
  };
  lines: (QuotationLine & { id: string; est_supplier_cost: number })[];
  days: QuotationDay[];
};

/**
 * Loads a quotation with the trip context needed to render it.
 *
 * Trip details (dates, pax, nights) live on the lead, not the quotation, so
 * they are joined rather than duplicated — a change to the lead's dates should
 * not silently leave a draft quote describing the old ones.
 */
export async function loadQuotationForText(
  supabase: SupabaseClient,
  quotationId: string,
): Promise<QuotationPayload | null> {
  const { data: quote } = await supabase
    .from("quotations")
    .select(
      `id, reference, version, title, status, currency, subtotal, discount, total,
       is_international, tcs_rate_percent, tcs_amount, total_payable, tcs_note,
       terms, valid_until, share_token, sent_at, lead_id,
       leads:lead_id(
         destination, travel_start, travel_end, travel_month, duration_nights,
         pax_adults, pax_children,
         customers:primary_customer_id(full_name)
       )`,
    )
    .eq("id", quotationId)
    .maybeSingle();

  if (!quote) return null;

  const lead = quote.leads as unknown as {
    destination: string | null;
    travel_start: string | null;
    travel_end: string | null;
    travel_month: string | null;
    duration_nights: number | null;
    pax_adults: number;
    pax_children: number;
    customers: { full_name: string } | null;
  } | null;

  const { data: items } = await supabase
    .from("quotation_items")
    .select(
      "id, sort_order, kind, title, description, qty, unit, customer_price, line_total, est_supplier_cost, is_optional, is_included, meta",
    )
    .eq("quotation_id", quotationId)
    .order("sort_order");

  /**
   * The day-by-day plan. Optional — many quotations are a price for a set of
   * components rather than a narrated itinerary — but when it exists it is the
   * part that answers most of the customer's questions before they ask.
   */
  const { data: days } = await supabase
    .from("quotation_day_plan")
    .select("day_number, date, title, description")
    .eq("quotation_id", quotationId)
    .order("day_number");

  return {
    quote: {
      id: quote.id,
      reference: quote.reference,
      status: quote.status,
      lead_id: quote.lead_id,
      share_token: quote.share_token,
      version: quote.version,
      title: quote.title,
      destination: lead?.destination ?? null,
      travel_start: lead?.travel_start ?? null,
      travel_end: lead?.travel_end ?? null,
      travel_month: lead?.travel_month ?? null,
      duration_nights: lead?.duration_nights ?? null,
      pax_adults: lead?.pax_adults ?? 1,
      pax_children: lead?.pax_children ?? 0,
      currency: quote.currency,
      subtotal: Number(quote.subtotal),
      discount: Number(quote.discount),
      total: Number(quote.total),
      is_international: quote.is_international,
      tcs_rate_percent: quote.tcs_rate_percent
        ? Number(quote.tcs_rate_percent)
        : null,
      tcs_amount: Number(quote.tcs_amount ?? 0),
      total_payable: Number(quote.total_payable ?? quote.total),
      tcs_note: quote.tcs_note,
      terms: quote.terms,
      valid_until: quote.valid_until,
      sent_at: quote.sent_at,
      customer_name: lead?.customers?.full_name ?? null,
    },
    lines: (items ?? []).map((item) => ({
      id: item.id,
      sort_order: item.sort_order,
      kind: item.kind,
      title: item.title,
      description: item.description,
      qty: Number(item.qty),
      unit: item.unit,
      customer_price: Number(item.customer_price),
      line_total: Number(item.line_total),
      est_supplier_cost: Number(item.est_supplier_cost),
      is_optional: item.is_optional,
      is_included: item.is_included,
      // Without this the per-kind detail is selected from the database and then
      // silently dropped before it reaches the renderer.
      meta: (item.meta ?? {}) as Record<string, string>,
    })),
    days: (days ?? []).map((day) => ({
      day_number: day.day_number,
      date: day.date,
      title: day.title,
      description: day.description,
    })),
  };
}
