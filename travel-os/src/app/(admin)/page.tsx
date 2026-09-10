import Link from "next/link";

import { requireStaff } from "@/lib/auth/session";
import { createStaffClient } from "@/lib/db/admin";
import { inrCompact, relativeDays } from "@/lib/format";
import { STAGE_LABELS, STAGE_ORDER, stageColor } from "@/lib/nav";

type LeadRow = {
  id: string;
  reference: string | null;
  title: string | null;
  destination: string | null;
  status: string;
  priority: string;
  next_followup_date: string | null;
  budget_max: number | null;
  customers: { full_name: string } | null;
};

export default async function DashboardPage() {
  const staff = await requireStaff();
  const supabase = await createStaffClient();

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: stageCounts }, { data: dueLeads }, { data: recentLeads }] =
    await Promise.all([
      supabase.from("leads").select("status").is("deleted_at", null),
      supabase
        .from("leads")
        .select(
          "id, reference, title, destination, status, priority, next_followup_date, budget_max, customers:primary_customer_id(full_name)",
        )
        .lte("next_followup_date", today)
        .not("status", "in", "(won,lost,dormant)")
        .is("deleted_at", null)
        .order("next_followup_date", { ascending: true })
        .limit(10),
      supabase
        .from("leads")
        .select(
          "id, reference, title, destination, status, priority, next_followup_date, budget_max, customers:primary_customer_id(full_name)",
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  const counts = new Map<string, number>();
  for (const row of stageCounts ?? []) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }

  const open = (stageCounts ?? []).filter(
    (r) => !["won", "lost", "dormant"].includes(r.status),
  ).length;

  return (
    <div className="p-4 md:p-5">
      <header className="mb-5">
        <h1 className="text-base font-semibold">
          {greeting()}, {staff.full_name.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground mt-0.5 text-[13px]">
          {open} open {open === 1 ? "lead" : "leads"} ·{" "}
          {(dueLeads ?? []).length} needing follow-up
        </p>
      </header>

      <section className="mb-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {STAGE_ORDER.map((stage) => (
            <Link
              key={stage}
              href={`/leads?stage=${stage}`}
              className="hover:border-primary/40 rounded-lg border px-3 py-2.5 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: stageColor(stage) }}
                />
                <span className="text-muted-foreground truncate text-[11px]">
                  {STAGE_LABELS[stage]}
                </span>
              </div>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {counts.get(stage) ?? 0}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <LeadPanel
          title="Needs follow-up"
          emptyText="Nothing due. Good place to be."
          leads={(dueLeads ?? []) as unknown as LeadRow[]}
          showFollowup
        />
        <LeadPanel
          title="Recently added"
          emptyText="No leads yet. Press N to add one."
          leads={(recentLeads ?? []) as unknown as LeadRow[]}
        />
      </div>
    </div>
  );
}

function LeadPanel({
  title,
  leads,
  emptyText,
  showFollowup = false,
}: {
  title: string;
  leads: LeadRow[];
  emptyText: string;
  showFollowup?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-lg border">
      <h2 className="bg-muted/60 border-b px-3 py-2 text-[12px] font-semibold">
        {title}
      </h2>

      {leads.length === 0 ? (
        <p className="text-muted-foreground px-3 py-6 text-center text-[13px]">
          {emptyText}
        </p>
      ) : (
        <ul className="divide-y">
          {leads.map((lead) => {
            const followup = relativeDays(lead.next_followup_date);
            return (
              <li key={lead.id}>
                <Link
                  href={`/leads/${lead.id}`}
                  className="hover:bg-muted/50 flex items-center gap-3 px-3 py-2 text-[13px]"
                >
                  <span
                    aria-hidden
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: stageColor(lead.status) }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {lead.customers?.full_name ?? "Unknown"}
                    </p>
                    <p className="text-muted-foreground truncate text-[11px]">
                      {lead.destination ?? lead.title ?? "—"}
                      {lead.reference ? ` · ${lead.reference}` : ""}
                    </p>
                  </div>
                  <span className="text-muted-foreground shrink-0 tabular-nums">
                    {inrCompact(lead.budget_max)}
                  </span>
                  {showFollowup ? (
                    <span
                      className={`shrink-0 text-[11px] ${
                        followup.overdue
                          ? "text-[var(--color-state-overdue)] font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      {followup.label}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
