import { ChevronRight } from "lucide-react";

import { ClickableRow } from "@/components/admin/data-table";
import { RestoreLeadButton } from "@/components/leads/delete-lead-button";
import { PriorityDot, StagePill } from "@/components/admin/stage-pill";
import { EmptyState, RowLink, SortHeader } from "@/components/admin/table-parts";
import {
  LeadDetailDrawer,
  type TimelineRow,
} from "@/components/leads/lead-detail-drawer";
import type { QuoteRow } from "@/components/leads/lead-drawer-parts";
import { LeadsToolbar } from "@/components/leads/leads-toolbar";
import { PipelineBoard } from "@/components/leads/pipeline-board";
import { canSeeMargin, requireStaff } from "@/lib/auth/session";
import { createStaffClient } from "@/lib/db/admin";
import { marginHealth } from "@/lib/leads/fulfilment";
import { fetchLeadDetail, fetchLeads } from "@/lib/leads/lead-record";
import type { LeadRecord } from "@/lib/leads/lead-record";
import { inrCompact, relativeDays, shortDate } from "@/lib/format";
import { getOptionLabels } from "@/lib/options";

function str(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

export default async function LeadsPage(props: PageProps<"/leads">) {
  const staff = await requireStaff();
  const showMargin = canSeeMargin(staff);
  const params = await props.searchParams;

  const view = str(params.view) ?? "all";
  const stage = str(params.stage);
  const search = str(params.q);
  const sort = str(params.sort) ?? "lead_date";
  const dir = params.dir === "asc" ? "asc" : "desc";
  const layout = params.layout === "board" ? "board" : "table";
  const openLeadId = str(params.lead);

  const supabase = await createStaffClient();

  // The board needs the whole set to group by stage; the table paginates.
  const { leads, total, error } = await fetchLeads(supabase, staff.id, {
    view,
    stage,
    search,
    sort,
    dir,
    limit: layout === "board" ? 400 : 200,
  });

  const linkParams = { view, stage, q: search, layout: layout === "board" ? "board" : undefined };

  // Drawer data is fetched alongside the list, so opening a record costs one
  // server round trip and the list underneath never unmounts.
  let drawerLead: LeadRecord | null = null;
  let drawerQuotes: QuoteRow[] = [];
  let drawerTimeline: TimelineRow[] = [];
  let labels: Record<string, string> = {};

  if (openLeadId) {
    const [record, labelMap] = await Promise.all([
      fetchLeadDetail(supabase, openLeadId, { withMargin: showMargin }),
      getOptionLabels(),
    ]);
    drawerLead = record;
    labels = Object.fromEntries(labelMap);

    if (record) {
      const [{ data: quotes }, { data: events }] = await Promise.all([
        supabase
          .from("quotations")
          .select("id, version, status, total, total_payable, sent_at")
          .eq("lead_id", openLeadId)
          .order("version", { ascending: false }),
        supabase
          .from("timeline_events")
          .select("id, title, body, occurred_at, actor_type")
          .eq("lead_id", openLeadId)
          .order("occurred_at", { ascending: false })
          .limit(40),
      ]);
      drawerQuotes = (quotes ?? []) as QuoteRow[];
      drawerTimeline = (events ?? []) as TimelineRow[];
    }
  }

  return (
    <div className="flex h-full flex-col">
      <LeadsToolbar params={linkParams} total={total} layout={layout} />

      {error ? (
        <p className="text-destructive px-5 py-6 text-[13px]">{error}</p>
      ) : leads.length === 0 ? (
        <EmptyState
          title={search ? `Nothing matching “${search}”` : "Nothing in this view"}
          hint={
            search
              ? "Search covers destination and reference."
              : "Press N for a quick enquiry, or New lead for the full form."
          }
        />
      ) : layout === "board" ? (
        <PipelineBoard leads={leads} canSeeMargin={showMargin} />
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[940px] text-left text-[13px]">
            <thead className="bg-muted/70 text-muted-foreground sticky top-0 z-10 backdrop-blur">
              <tr className="group/head [&>th]:px-3 [&>th]:py-2 [&>th]:font-medium">
                <th className="w-8" aria-label="Priority" />
                <th>Client</th>
                <SortHeader
                  label="Destination"
                  column="destination"
                  currentSort={sort}
                  currentDir={dir}
                  basePath="/leads"
                  params={linkParams}
                />
                <SortHeader
                  label="Travel"
                  column="travel_start"
                  currentSort={sort}
                  currentDir={dir}
                  basePath="/leads"
                  params={linkParams}
                />
                <th className="text-right">Pax</th>
                <SortHeader
                  label="Quote"
                  column="budget_max"
                  currentSort={sort}
                  currentDir={dir}
                  basePath="/leads"
                  params={linkParams}
                  align="right"
                />
                {showMargin ? <th className="text-right">Margin</th> : null}
                <th>Stage</th>
                <th>Agent</th>
                <SortHeader
                  label="Follow-up"
                  column="next_followup_date"
                  currentSort={sort}
                  currentDir={dir}
                  basePath="/leads"
                  params={linkParams}
                />
                <th className="w-6" />
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  showMargin={showMargin}
                  params={linkParams}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {drawerLead ? (
        <LeadDetailDrawer
          lead={drawerLead}
          quotes={drawerQuotes}
          timeline={drawerTimeline}
          labels={labels}
          canSeeMargin={showMargin}
        />
      ) : null}
    </div>
  );
}

function LeadRow({
  lead,
  showMargin,
  params,
}: {
  lead: LeadRecord;
  showMargin: boolean;
  params: Record<string, string | undefined>;
}) {
  const followup = relativeDays(lead.next_followup_date);
  const health = marginHealth(lead.margin_percent);

  // Opening the drawer is a URL change, so the row stays a normal link: the
  // back button closes it and the address bar can be shared.
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  search.set("lead", lead.id);
  const href = `/leads?${search.toString()}`;

  return (
    <ClickableRow href={href} className="[&>td]:px-3 [&>td]:py-2">
      <td className="w-8">
        <PriorityDot priority={lead.lead_priority} />
      </td>
      <td className="max-w-[170px]">
        <RowLink href={href}>
          <span className="block truncate font-medium">{lead.client_name}</span>
        </RowLink>
        <span className="text-muted-foreground block truncate font-mono text-[10px]">
          {lead.lead_id}
        </span>
      </td>
      <td className="max-w-[200px]">
        <span className="block truncate">
          {lead.destination ?? "—"}
        </span>
        {lead.trip_type === "International" ? (
          <span className="text-muted-foreground text-[10px] tracking-wide">
            INTERNATIONAL
          </span>
        ) : null}
      </td>
      <td className="text-muted-foreground whitespace-nowrap">
        {lead.travel_start_date
          ? shortDate(lead.travel_start_date)
          : (lead.travel_month ?? "—")}
        {lead.duration_nights ? (
          <span className="text-muted-foreground/70"> · {lead.duration_nights}N</span>
        ) : null}
      </td>
      <td className="text-right tabular-nums">
        {lead.pax_adults}
        {lead.pax_children > 0 ? (
          <span className="text-muted-foreground">+{lead.pax_children}</span>
        ) : null}
      </td>
      <td className="text-right font-medium tabular-nums">
        {inrCompact(lead.total_payable_inr ?? lead.client_budget_inr)}
      </td>
      {showMargin ? (
        <td
          className="text-right tabular-nums"
          style={{ color: lead.gross_margin_inr ? health.color : undefined }}
        >
          {lead.gross_margin_inr ? inrCompact(lead.gross_margin_inr) : "—"}
        </td>
      ) : null}
      <td>
        <StagePill stage={lead.pipeline_stage} short />
      </td>
      <td className="text-muted-foreground max-w-[110px] truncate">
        {lead.assigned_agent ?? "—"}
      </td>
      <td
        className={`whitespace-nowrap ${
          followup.overdue
            ? "font-medium text-[var(--color-state-overdue)]"
            : "text-muted-foreground"
        }`}
      >
        {followup.label}
      </td>
      <td className="w-6 pr-2">
        {/* In the Deleted view the row's affordance is Restore, not "open". */}
        {lead.deleted_at ? (
          <RestoreLeadButton leadId={lead.id} reference={lead.lead_id} />
        ) : (
          <ChevronRight className="text-muted-foreground size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </td>
    </ClickableRow>
  );
}
