import "server-only";

import type { createStaffClient } from "@/lib/db/admin";

type SupabaseClient = Awaited<ReturnType<typeof createStaffClient>>;

/**
 * The lead as the UI thinks about it.
 *
 * Field names deliberately match the agency's own vocabulary (the column names
 * in their working spreadsheet) rather than the database column names, so that
 * screens, conversations and the source export all use one set of words. The
 * mapping lives in this file alone — nothing else needs to know that
 * `trip_type` is stored as a boolean called `is_international`.
 *
 * Cost and margin are OPTIONAL on this type on purpose: they are only
 * populated for staff allowed to see them, so a component that renders them
 * has to handle their absence rather than assuming.
 */
export type PipelineStage =
  | "new"
  | "contacted"
  | "requirements_logged"
  | "quoted"
  | "revision_requested"
  | "negotiating"
  | "booking_pending"
  | "won"
  | "lost"
  | "dormant";

export type LeadPriority = "hot" | "warm" | "cold";

export type FulfilmentState =
  | "not_required"
  | "pending"
  | "in_progress"
  | "confirmed"
  | "issue"
  | "unknown";

export type LeadRecord = {
  // Identifiers & contact
  id: string;
  lead_id: string | null;
  lead_date: string | null;
  client_name: string;
  phone_number: string | null;
  email: string | null;
  city_origin: string | null;
  customer_type: string | null;
  customer_id: string | null;

  // Trip specification
  destination: string | null;
  trip_type: "Domestic" | "International";
  travel_start_date: string | null;
  duration_nights: number | null;
  travel_month: string | null;
  pax_adults: number;
  pax_children: number;
  children_age: number[] | null;
  travel_theme: string | null;
  hotel_category: string | null;
  meal_preference: string | null;
  room_configuration: string | null;

  // Fulfilment — tracked separately from the sales pipeline on purpose
  flights_status: string | null;
  visa_status: string | null;
  transfers_status: string | null;
  insurance_status: string | null;
  forex_status: string | null;
  activities_status: string | null;

  // Commercials
  client_budget_inr: number | null;
  gross_quote_inr: number | null;
  tcs_rate_percent: number | null;
  tcs_amount_inr: number | null;
  total_payable_inr: number | null;
  /** Admin-only. Undefined when the viewer may not see margin. */
  net_supplier_cost_inr?: number | null;
  gross_margin_inr?: number | null;
  margin_percent?: number | null;

  // Pipeline & operations
  assigned_agent: string | null;
  assigned_agent_id: string | null;
  pipeline_stage: PipelineStage;
  quote_version: number | null;
  quote_count: number;
  lead_priority: LeadPriority;
  next_followup_date: string | null;
  next_action: string | null;
  next_action_type: string | null;
  next_action_at: string | null;
  lost_reason: string | null;
  special_notes: string | null;

  /** Set only on soft-deleted leads, which appear in the "Deleted" view alone. */
  deleted_at: string | null;
  delete_reason: string | null;
};

/** Columns fetched for list and drawer. Kept in one place so they cannot drift. */
const LEAD_SELECT = `
  id, reference, lead_date, destination, is_international, origin_city,
  travel_start, travel_month, duration_nights, pax_adults, pax_children,
  children_ages, travel_theme, hotel_category, meal_plan, room_configuration,
  flights_status, visa_status, transfers_status, insurance_status,
  forex_status, activities_status,
  budget_max, status, priority, next_followup_date,
  next_action, next_action_type, next_action_at,
  lost_reason, special_notes, owner_staff_id,
  deleted_at, delete_reason,
  customers:primary_customer_id(id, full_name, phone_e164, email, city, customer_type),
  staff_users:owner_staff_id(full_name)
`;

type RawLead = Record<string, unknown> & {
  customers: { id: string; full_name: string; phone_e164: string | null; email: string | null; city: string | null; customer_type: string } | null;
  staff_users: { full_name: string } | null;
};

function num(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toRecord(row: RawLead): LeadRecord {
  const customer = row.customers;

  return {
    id: String(row.id),
    lead_id: (row.reference as string) ?? null,
    lead_date: (row.lead_date as string) ?? null,
    client_name: customer?.full_name ?? "Unknown",
    phone_number: customer?.phone_e164 ?? null,
    email: customer?.email ?? null,
    city_origin: (row.origin_city as string) ?? customer?.city ?? null,
    customer_type: customer?.customer_type ?? null,
    customer_id: customer?.id ?? null,

    destination: (row.destination as string) ?? null,
    trip_type: row.is_international ? "International" : "Domestic",
    travel_start_date: (row.travel_start as string) ?? null,
    duration_nights: num(row.duration_nights),
    travel_month: (row.travel_month as string) ?? null,
    pax_adults: num(row.pax_adults) ?? 0,
    pax_children: num(row.pax_children) ?? 0,
    children_age: (row.children_ages as number[]) ?? null,
    travel_theme: (row.travel_theme as string) ?? null,
    hotel_category: (row.hotel_category as string) ?? null,
    meal_preference: (row.meal_plan as string) ?? null,
    room_configuration: (row.room_configuration as string) ?? null,

    flights_status: (row.flights_status as string) ?? null,
    visa_status: (row.visa_status as string) ?? null,
    transfers_status: (row.transfers_status as string) ?? null,
    insurance_status: (row.insurance_status as string) ?? null,
    forex_status: (row.forex_status as string) ?? null,
    activities_status: (row.activities_status as string) ?? null,

    client_budget_inr: num(row.budget_max),
    gross_quote_inr: null,
    tcs_rate_percent: null,
    tcs_amount_inr: null,
    total_payable_inr: null,

    assigned_agent: row.staff_users?.full_name ?? null,
    assigned_agent_id: (row.owner_staff_id as string) ?? null,
    pipeline_stage: row.status as PipelineStage,
    quote_version: null,
    quote_count: 0,
    lead_priority: row.priority as LeadPriority,
    next_followup_date: (row.next_followup_date as string) ?? null,
    next_action: (row.next_action as string) ?? null,
    next_action_type: (row.next_action_type as string) ?? null,
    next_action_at: (row.next_action_at as string) ?? null,
    lost_reason: (row.lost_reason as string) ?? null,
    special_notes: (row.special_notes as string) ?? null,
    deleted_at: (row.deleted_at as string) ?? null,
    delete_reason: (row.delete_reason as string) ?? null,
  };
}

export type LeadQuery = {
  stage?: string;
  search?: string;
  view?: string;
  sort?: string;
  dir?: "asc" | "desc";
  limit?: number;
};

const SORTABLE: Record<string, string> = {
  lead_date: "lead_date",
  destination: "destination",
  budget_max: "budget_max",
  next_followup_date: "next_followup_date",
  travel_start: "travel_start",
  priority: "priority",
};

/**
 * Saved views are URL presets, not stored records — they are filter
 * combinations, and as links they are shareable and cost nothing to maintain.
 */
export type SavedView = {
  key: string;
  label: string;
  description: string;
};

export const SAVED_VIEWS: SavedView[] = [
  { key: "all", label: "All leads", description: "Everything except lost and dormant" },
  { key: "mine", label: "My leads", description: "Assigned to you" },
  { key: "hot", label: "Hot", description: "Priority marked hot" },
  { key: "today", label: "Follow-up today", description: "Due today" },
  { key: "overdue", label: "Overdue", description: "Follow-up date has passed" },
  { key: "high_value", label: "High value", description: "Budget over 2 lakh" },
  { key: "this_month", label: "Travelling this month", description: "Departing in the next 30 days" },
  { key: "lost", label: "Lost", description: "Closed without booking" },
  { key: "deleted", label: "Deleted", description: "Removed — restorable from here" },
];

/** Fetches leads, applying a saved view, stage filter, search and sort. */
export async function fetchLeads(
  supabase: SupabaseClient,
  staffId: string,
  query: LeadQuery = {},
): Promise<{ leads: LeadRecord[]; total: number; error: string | null }> {
  const sort = query.sort && SORTABLE[query.sort] ? query.sort : "lead_date";
  const dir = query.dir === "asc";
  const today = new Date().toISOString().slice(0, 10);

  let request = supabase
    .from("leads")
    .select(LEAD_SELECT, { count: "exact" })
    .order(SORTABLE[sort], { ascending: dir, nullsFirst: false })
    .limit(query.limit ?? 200);

  // Deleted leads are excluded from every view but their own. Applied here
  // rather than per-case so a new saved view cannot forget it and start
  // resurrecting deleted records in a list.
  request =
    query.view === "deleted"
      ? request.not("deleted_at", "is", null)
      : request.is("deleted_at", null);

  switch (query.view) {
    case "mine":
      request = request.eq("owner_staff_id", staffId);
      break;
    case "hot":
      request = request.eq("priority", "hot").not("status", "in", "(won,lost,dormant)");
      break;
    case "today":
      request = request.eq("next_followup_date", today).not("status", "in", "(won,lost,dormant)");
      break;
    case "overdue":
      request = request.lt("next_followup_date", today).not("status", "in", "(won,lost,dormant)");
      break;
    case "high_value":
      request = request.gte("budget_max", 200000);
      break;
    case "this_month": {
      const in30 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
      request = request.gte("travel_start", today).lte("travel_start", in30);
      break;
    }
    case "lost":
      request = request.eq("status", "lost");
      break;
    case "deleted":
      // Already filtered above; no status restriction — a deleted lead is shown
      // whatever stage it was in when it was removed.
      break;
    default:
      // "All leads" hides closed records; they have their own views.
      request = request.not("status", "in", "(lost,dormant)");
  }

  if (query.stage && query.stage !== "all") request = request.eq("status", query.stage);
  if (query.search) {
    request = request.or(
      `destination.ilike.%${query.search}%,reference.ilike.%${query.search}%`,
    );
  }

  const { data, error, count } = await request;
  if (error) return { leads: [], total: 0, error: error.message };

  return {
    leads: (data ?? []).map((row) => toRecord(row as unknown as RawLead)),
    total: count ?? 0,
    error: null,
  };
}

/**
 * Loads one lead with its commercials attached.
 *
 * Margin comes from quotation_financials_v and is only requested when the
 * viewer may see it, so the numbers never reach a component that should not
 * render them.
 */
export async function fetchLeadDetail(
  supabase: SupabaseClient,
  leadId: string,
  options: { withMargin: boolean },
): Promise<LeadRecord | null> {
  const { data } = await supabase
    .from("leads")
    .select(LEAD_SELECT)
    .eq("id", leadId)
    .maybeSingle();

  if (!data) return null;
  const record = toRecord(data as unknown as RawLead);

  const { data: quotes } = await supabase
    .from("quotations")
    .select("id, version, status, total, tcs_rate_percent, tcs_amount, total_payable")
    .eq("lead_id", leadId)
    .order("version", { ascending: false });

  const latest = quotes?.[0];
  record.quote_count = quotes?.length ?? 0;

  if (latest) {
    record.quote_version = latest.version;
    record.gross_quote_inr = num(latest.total);
    record.tcs_rate_percent = num(latest.tcs_rate_percent);
    record.tcs_amount_inr = num(latest.tcs_amount);
    record.total_payable_inr = num(latest.total_payable);

    if (options.withMargin) {
      const { data: financials } = await supabase
        .from("quotation_financials_v")
        .select("est_supplier_cost, gross_margin, margin_percent")
        .eq("quotation_id", latest.id)
        .maybeSingle();

      if (financials) {
        record.net_supplier_cost_inr = num(financials.est_supplier_cost);
        record.gross_margin_inr = num(financials.gross_margin);
        record.margin_percent = num(financials.margin_percent);
      }
    }
  }

  return record;
}
