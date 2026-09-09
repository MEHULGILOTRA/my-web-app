import type { FulfilmentState, LeadRecord } from "@/lib/leads/lead-record";

/**
 * Fulfilment is tracked separately from the sales pipeline, on purpose: a Won
 * booking with a missing visa is an operations problem, not a sales one.
 *
 * The stored values are the agency's own working vocabulary ("Private Cab
 * Required", "Needed - Agency to Assist"). Those read well in a form but are
 * useless for a glanceable checklist, so each maps to one of five states.
 *
 * Note the distinction the mapping preserves: "Private Cab Required" is a
 * stated requirement, not a completed booking — it is pending, not confirmed.
 */

const SETTLED = new Set([
  "booked",
  "approved",
  "delivered",
  "confirmed",
  "client_has_visa",
  "client_has_own",
  "client_booking",
  "client_arranging",
  "self_drive",
]);

const FAILED = new Set(["rejected", "cancelled"]);

const NOT_REQUIRED = new Set(["not_required", "not_applicable"]);

/** Values that mean work has actively started, rather than merely being noted. */
const IN_PROGRESS = new Set(["in_process", "quoted", "requested"]);

export function fulfilmentState(value: string | null): FulfilmentState {
  if (!value) return "unknown";
  if (NOT_REQUIRED.has(value)) return "not_required";
  if (FAILED.has(value)) return "issue";
  if (SETTLED.has(value)) return "confirmed";
  if (IN_PROGRESS.has(value)) return "in_progress";
  return "pending";
}

export const FULFILMENT_STYLE: Record<
  FulfilmentState,
  { label: string; color: string; dot: string }
> = {
  confirmed: {
    label: "Confirmed",
    color: "var(--color-state-paid)",
    dot: "var(--color-state-paid)",
  },
  in_progress: {
    label: "In progress",
    color: "var(--color-state-due)",
    dot: "var(--color-state-due)",
  },
  pending: {
    label: "Pending",
    color: "var(--color-state-due)",
    dot: "var(--color-state-due)",
  },
  issue: {
    label: "Issue",
    color: "var(--color-state-overdue)",
    dot: "var(--color-state-overdue)",
  },
  not_required: {
    label: "Not required",
    color: "var(--color-muted-foreground)",
    dot: "var(--color-muted-foreground)",
  },
  unknown: {
    label: "Not set",
    color: "var(--color-muted-foreground)",
    dot: "var(--color-muted-foreground)",
  },
};

export type FulfilmentLine = {
  key: string;
  label: string;
  raw: string | null;
  state: FulfilmentState;
};

export function fulfilmentLines(lead: LeadRecord): FulfilmentLine[] {
  return [
    { key: "flights_status", label: "Flights", raw: lead.flights_status },
    { key: "hotel", label: "Hotel", raw: lead.hotel_category ? "pending" : null },
    { key: "visa_status", label: "Visa", raw: lead.visa_status },
    { key: "transfers_status", label: "Transfers", raw: lead.transfers_status },
    { key: "activities_status", label: "Activities", raw: lead.activities_status },
    { key: "insurance_status", label: "Insurance", raw: lead.insurance_status },
    { key: "forex_status", label: "Forex", raw: lead.forex_status },
  ].map((line) => ({ ...line, state: fulfilmentState(line.raw) }));
}

/** How many things still need doing — the number worth surfacing on a card. */
export function outstandingCount(lead: LeadRecord): number {
  return fulfilmentLines(lead).filter(
    (line) => line.state === "pending" || line.state === "in_progress" || line.state === "issue",
  ).length;
}

/**
 * Margin health.
 *
 * Deliberately not "green because positive": a 4% margin on a two lakh booking
 * is a problem worth seeing, and colouring it green because it is above zero
 * would hide exactly the leads a manager needs to find.
 */
export function marginHealth(percent: number | null | undefined): {
  color: string;
  label: string;
} {
  if (percent === null || percent === undefined) {
    return { color: "var(--color-muted-foreground)", label: "No quote" };
  }
  if (percent < 0) return { color: "var(--color-state-overdue)", label: "Loss" };
  if (percent < 8) return { color: "var(--color-state-overdue)", label: "Thin" };
  if (percent < 12) return { color: "var(--color-state-due)", label: "Low" };
  return { color: "var(--color-state-paid)", label: "Healthy" };
}
