"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { setLeadStage } from "@/app/(admin)/leads/actions";
import { marginHealth, outstandingCount } from "@/lib/leads/fulfilment";
import type { LeadRecord, PipelineStage } from "@/lib/leads/lead-record";
import { inrCompact, relativeDays, shortDate } from "@/lib/format";
import { PRIORITY_COLOR, STAGE_LABELS, stageColor } from "@/lib/nav";
import { cn } from "@/lib/utils";

/**
 * Kanban view of the sales pipeline.
 *
 * Deliberately no drag-and-drop yet. It needs a dependency, is poor on touch,
 * and is hard to make keyboard-accessible — so every card carries a stage
 * control that works with a mouse, a keyboard and a phone today. The column
 * structure is ready for DnD to be layered on when it earns its place.
 *
 * Closed stages are excluded: a board is for work in flight, and a column of
 * two hundred lost leads is only ever noise. They remain in the table views.
 */
const BOARD_STAGES: PipelineStage[] = [
  "new",
  "contacted",
  "requirements_logged",
  "quoted",
  "revision_requested",
  "negotiating",
  "booking_pending",
  "won",
];

export function PipelineBoard({
  leads,
  canSeeMargin,
}: {
  leads: LeadRecord[];
  canSeeMargin: boolean;
}) {
  const grouped = new Map<PipelineStage, LeadRecord[]>();
  for (const stage of BOARD_STAGES) grouped.set(stage, []);
  for (const lead of leads) {
    grouped.get(lead.pipeline_stage)?.push(lead);
  }

  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-4">
      {BOARD_STAGES.map((stage) => (
        <PipelineColumn
          key={stage}
          stage={stage}
          leads={grouped.get(stage) ?? []}
          canSeeMargin={canSeeMargin}
        />
      ))}
    </div>
  );
}

function PipelineColumn({
  stage,
  leads,
  canSeeMargin,
}: {
  stage: PipelineStage;
  leads: LeadRecord[];
  canSeeMargin: boolean;
}) {
  // Column value uses the quote where one exists and the budget otherwise, so
  // an early-stage column is not silently worth zero.
  const value = leads.reduce(
    (sum, lead) => sum + (lead.total_payable_inr ?? lead.client_budget_inr ?? 0),
    0,
  );

  return (
    <section className="flex w-[262px] shrink-0 flex-col rounded-lg border">
      <header className="bg-muted/50 flex items-center gap-2 rounded-t-lg border-b px-2.5 py-2">
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: stageColor(stage) }}
        />
        <h3 className="truncate text-[12px] font-medium">
          {STAGE_LABELS[stage]}
        </h3>
        <span className="text-muted-foreground bg-background ml-auto shrink-0 rounded-full px-1.5 text-[10px] tabular-nums">
          {leads.length}
        </span>
      </header>

      {value > 0 ? (
        <p className="text-muted-foreground border-b px-2.5 py-1 text-[10px] tabular-nums">
          {inrCompact(value)} in this stage
        </p>
      ) : null}

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-1.5">
        {leads.length === 0 ? (
          <p className="text-muted-foreground/60 px-2 py-4 text-center text-[11px]">
            Empty
          </p>
        ) : (
          leads.map((lead) => (
            <PipelineCard key={lead.id} lead={lead} canSeeMargin={canSeeMargin} />
          ))
        )}
      </div>
    </section>
  );
}

/**
 * A card has to be readable in about two seconds: who, where, when, how much,
 * how urgent. Anything beyond that belongs in the drawer.
 */
function PipelineCard({
  lead,
  canSeeMargin,
}: {
  lead: LeadRecord;
  canSeeMargin: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const followup = relativeDays(lead.next_followup_date);
  const health = marginHealth(lead.margin_percent);
  const outstanding = outstandingCount(lead);
  const amount = lead.total_payable_inr ?? lead.client_budget_inr;

  return (
    <article
      onClick={() => router.push(`/leads?lead=${lead.id}`)}
      className="bg-background hover:border-primary/40 group cursor-pointer rounded-md border p-2 transition-colors"
    >
      <div className="flex items-center gap-1.5">
        <span
          className="text-[9px] font-semibold tracking-wider uppercase"
          style={{ color: PRIORITY_COLOR[lead.lead_priority] }}
        >
          {lead.lead_priority}
        </span>
        {lead.trip_type === "International" ? (
          <span className="text-muted-foreground text-[9px] tracking-wider">
            INTL
          </span>
        ) : null}
        <span className="text-muted-foreground ml-auto font-mono text-[9px]">
          {lead.lead_id}
        </span>
      </div>

      <p className="mt-0.5 truncate text-[13px] font-semibold">
        {lead.client_name}
      </p>
      <p className="text-muted-foreground truncate text-[11px]">
        {lead.destination ?? "Destination not set"}
      </p>

      <p className="text-muted-foreground mt-1 text-[11px]">
        {lead.travel_start_date
          ? shortDate(lead.travel_start_date)
          : (lead.travel_month ?? "Dates TBC")}
        {" · "}
        {lead.pax_adults} adult{lead.pax_adults === 1 ? "" : "s"}
        {lead.pax_children ? ` + ${lead.pax_children} child` : ""}
      </p>

      {amount ? (
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-[13px] font-semibold tabular-nums">
            {inrCompact(amount)}
          </span>
          {canSeeMargin && lead.gross_margin_inr ? (
            <span
              className="text-[11px] tabular-nums"
              style={{ color: health.color }}
            >
              {inrCompact(lead.gross_margin_inr)} margin
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-1.5 flex items-center gap-2">
        {lead.next_followup_date ? (
          <span
            className={cn(
              "text-[10px]",
              followup.overdue ? "font-medium" : "text-muted-foreground",
            )}
            style={
              followup.overdue
                ? { color: "var(--color-state-overdue)" }
                : undefined
            }
          >
            {followup.overdue ? "Overdue · " : ""}
            {followup.label}
          </span>
        ) : (
          <span className="text-muted-foreground/60 text-[10px]">
            No follow-up
          </span>
        )}

        {outstanding > 0 ? (
          <span
            className="ml-auto text-[10px] tabular-nums"
            style={{ color: "var(--color-state-due)" }}
            title={`${outstanding} fulfilment item(s) outstanding`}
          >
            {outstanding} open
          </span>
        ) : null}
      </div>

      {/* Stage change without opening anything. Stops propagation so choosing
          a stage does not also open the drawer. */}
      <select
        value={lead.pipeline_stage}
        disabled={pending}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          event.stopPropagation();
          const next = event.target.value;
          startTransition(async () => {
            try {
              await setLeadStage(lead.id, next);
              toast.success(`${lead.client_name} → ${STAGE_LABELS[next] ?? next}`);
              router.refresh();
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : "Could not move lead",
              );
            }
          });
        }}
        aria-label={`Change stage for ${lead.client_name}`}
        className="border-input bg-background mt-2 h-6 w-full rounded border px-1 text-[10px] opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
      >
        {BOARD_STAGES.map((stage) => (
          <option key={stage} value={stage}>
            {STAGE_LABELS[stage]}
          </option>
        ))}
        <option value="lost">{STAGE_LABELS.lost}</option>
      </select>
    </article>
  );
}
