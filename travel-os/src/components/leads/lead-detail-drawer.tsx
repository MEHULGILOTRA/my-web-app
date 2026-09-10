"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { setLeadStage } from "@/app/(admin)/leads/actions";
import {
  Field,
  FulfilmentChecklist,
  MarginBlock,
  NextActionBlock,
  QuoteHistory,
  Section,
  type QuoteRow,
} from "@/components/leads/lead-drawer-parts";
import { PriorityDot, StagePill } from "@/components/admin/stage-pill";
import { DeleteLeadButton } from "@/components/leads/delete-lead-button";
import { outstandingCount } from "@/lib/leads/fulfilment";
import type { LeadRecord } from "@/lib/leads/lead-record";
import { shortDate } from "@/lib/format";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/nav";
import { cn } from "@/lib/utils";

export type TimelineRow = {
  id: string;
  title: string;
  body: string | null;
  occurred_at: string;
  actor_type: string;
};

type Tab = "overview" | "quotation" | "operations" | "timeline";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "quotation", label: "Quotation" },
  { key: "operations", label: "Operations" },
  { key: "timeline", label: "Timeline" },
];

/**
 * Right-hand inspector for a lead.
 *
 * Opened from `?lead=<id>` rather than local state, so the drawer is
 * shareable, the browser back button closes it, and a refresh restores it —
 * the three things a purely client-side drawer gives up. The list underneath
 * stays mounted, which is the point: inspect, close, inspect the next one.
 */
export function LeadDetailDrawer({
  lead,
  quotes,
  timeline,
  labels,
  canSeeMargin,
}: {
  lead: LeadRecord;
  quotes: QuoteRow[];
  timeline: TimelineRow[];
  labels: Record<string, string>;
  canSeeMargin: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [pending, startTransition] = useTransition();

  function close() {
    // back() keeps history sane when the drawer was opened by a click; if the
    // drawer was deep-linked into, there is nothing to go back to, so fall
    // through to the bare list.
    if (window.history.length > 1) router.back();
    else router.push("/leads");
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function labelFor(setKey: string, value: string | null): string | null {
    if (!value) return null;
    return labels[`${setKey}:${value}`] ?? value;
  }

  const outstanding = outstandingCount(lead);
  const phoneDigits = lead.phone_number?.replace(/[^0-9]/g, "") ?? "";

  return (
    <>
      {/* Scrim: dismisses on click, and dims the list so focus is unambiguous. */}
      <button
        type="button"
        aria-label="Close lead"
        onClick={close}
        className="animate-in fade-in fixed inset-0 z-40 bg-black/20 duration-150"
      />

      <aside
        role="dialog"
        aria-label={`Lead ${lead.lead_id ?? ""}`}
        className={cn(
          "bg-background animate-in slide-in-from-right fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l shadow-lg duration-200",
          "sm:max-w-[480px]",
        )}
      >
        {/* ------------------------------------------------ header */}
        <header className="shrink-0 border-b px-4 py-3">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-sm font-semibold">
                  {lead.client_name}
                </h2>
                <PriorityDot priority={lead.lead_priority} />
              </div>
              <p className="text-muted-foreground mt-0.5 font-mono text-[11px]">
                {lead.lead_id}
                {lead.destination ? (
                  <span className="font-sans"> · {lead.destination}</span>
                ) : null}
              </p>
            </div>

            <Link
              href={`/leads/${lead.id}`}
              title="Open full page"
              className="hover:bg-accent text-muted-foreground rounded-md p-1.5"
            >
              <ExternalLink className="size-3.5" />
            </Link>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="hover:bg-accent text-muted-foreground rounded-md p-1.5"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Stage lives in the header because it is the single most-changed
              field, and burying it in a tab would cost a click every time. */}
          <div className="mt-2.5 flex items-center gap-2">
            <select
              value={lead.pipeline_stage}
              disabled={pending}
              onChange={(event) => {
                const next = event.target.value;
                startTransition(async () => {
                  try {
                    await setLeadStage(lead.id, next);
                    toast.success(`Moved to ${STAGE_LABELS[next] ?? next}`);
                    router.refresh();
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : "Could not update",
                    );
                  }
                });
              }}
              className="border-input bg-background h-7 rounded-md border px-2 text-[12px]"
            >
              {STAGE_ORDER.map((stage) => (
                <option key={stage} value={stage}>
                  {STAGE_LABELS[stage]}
                </option>
              ))}
              <option value="dormant">{STAGE_LABELS.dormant}</option>
            </select>
            <StagePill stage={lead.pipeline_stage} short />
          </div>
        </header>

        {/* ------------------------------------------ quick actions */}
        <div className="flex shrink-0 gap-1 border-b px-3 py-2">
          <QuickAction
            icon={MessageCircle}
            label="WhatsApp"
            href={phoneDigits ? `https://wa.me/${phoneDigits}` : undefined}
          />
          <QuickAction
            icon={Phone}
            label="Call"
            href={lead.phone_number ? `tel:${lead.phone_number}` : undefined}
          />
          <QuickAction
            icon={Mail}
            label="Email"
            href={lead.email ? `mailto:${lead.email}` : undefined}
          />
          <QuickAction
            icon={Plus}
            label="Quote"
            href={`/leads/${lead.id}`}
          />
          <QuickAction icon={Pencil} label="Edit" href={`/leads/${lead.id}/edit`} />
          {/* Pushed right so a destructive action is never adjacent to Edit,
              which sits where the pointer already is. */}
          <div className="ml-auto">
            <DeleteLeadButton
              leadId={lead.id}
              reference={lead.lead_id}
              clientName={lead.client_name}
              size="sm"
            />
          </div>
        </div>

        {/* --------------------------------------------------- tabs */}
        <nav
          role="tablist"
          className="flex shrink-0 gap-4 border-b px-4"
          aria-label="Lead sections"
        >
          {TABS.map((item) => {
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.key)}
                className={cn(
                  "-mb-px border-b-2 py-2 text-[12px] transition-colors",
                  active
                    ? "border-primary text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground border-transparent",
                )}
              >
                {item.label}
                {item.key === "operations" && outstanding > 0 ? (
                  <span className="bg-muted ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums">
                    {outstanding}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* ------------------------------------------------ content */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {tab === "overview" ? (
            <>
              <div className="px-4 pt-3">
                <NextActionBlock lead={lead} />
              </div>

              <Section title="Contact">
                <dl>
                  <Field label="Name" value={lead.client_name} />
                  <Field
                    label="Phone"
                    value={lead.phone_number}
                    href={lead.phone_number ? `tel:${lead.phone_number}` : undefined}
                  />
                  <Field
                    label="Email"
                    value={lead.email}
                    href={lead.email ? `mailto:${lead.email}` : undefined}
                  />
                  <Field label="City" value={lead.city_origin} />
                  <Field
                    label="Type"
                    value={labelFor("customer_type", lead.customer_type)}
                  />
                </dl>
                {lead.customer_id ? (
                  <Link
                    href={`/customers/${lead.customer_id}`}
                    className="text-primary mt-1.5 inline-block text-[12px] underline underline-offset-2"
                  >
                    Open customer record
                  </Link>
                ) : null}
              </Section>

              <div className="border-t" />

              <Section title="Trip">
                <dl>
                  <Field label="Destination" value={lead.destination} />
                  <Field label="Type" value={lead.trip_type} />
                  <Field
                    label="Travel"
                    value={
                      lead.travel_start_date
                        ? `${shortDate(lead.travel_start_date)}${
                            lead.duration_nights
                              ? ` · ${lead.duration_nights} nights`
                              : ""
                          }`
                        : lead.travel_month
                    }
                  />
                  <Field
                    label="Pax"
                    value={`${lead.pax_adults} adult${lead.pax_adults === 1 ? "" : "s"}${
                      lead.pax_children
                        ? `, ${lead.pax_children} child${lead.pax_children === 1 ? "" : "ren"}`
                        : ""
                    }${
                      lead.children_age?.length
                        ? ` (${lead.children_age.join(", ")} yrs)`
                        : ""
                    }`}
                  />
                  <Field
                    label="Theme"
                    value={labelFor("travel_theme", lead.travel_theme)}
                  />
                  <Field
                    label="Hotel"
                    value={labelFor("hotel_category", lead.hotel_category)}
                  />
                  <Field
                    label="Meals"
                    value={labelFor("meal_plan", lead.meal_preference)}
                  />
                  <Field
                    label="Rooms"
                    value={labelFor("room_configuration", lead.room_configuration)}
                  />
                </dl>
              </Section>

              {lead.special_notes ? (
                <>
                  <div className="border-t" />
                  <Section title="Notes">
                    <p className="text-[12px] leading-relaxed">
                      {lead.special_notes}
                    </p>
                  </Section>
                </>
              ) : null}
            </>
          ) : null}

          {tab === "quotation" ? (
            <>
              <Section title="Commercials">
                {canSeeMargin ? (
                  <MarginBlock lead={lead} />
                ) : (
                  <p className="text-muted-foreground text-[12px]">
                    Quote {lead.gross_quote_inr ? "available" : "not created yet"}.
                    Margin is visible to admins only.
                  </p>
                )}
              </Section>

              <div className="border-t" />

              <Section
                title={`Versions (${quotes.length})`}
                action={
                  <Link
                    href={`/leads/${lead.id}`}
                    className="text-primary text-[11px] underline underline-offset-2"
                  >
                    Manage
                  </Link>
                }
              >
                <QuoteHistory quotes={quotes} />
              </Section>
            </>
          ) : null}

          {tab === "operations" ? (
            <>
              <Section title="Fulfilment">
                <FulfilmentChecklist lead={lead} labelFor={labelFor} />
                <p className="text-muted-foreground mt-2 text-[11px] leading-relaxed">
                  Tracked separately from the sales stage — a confirmed booking
                  with an outstanding visa is an operations problem, not a sales
                  one.
                </p>
              </Section>

              <div className="border-t" />

              <Section title="Assignment">
                <dl>
                  <Field label="Agent" value={lead.assigned_agent ?? "Unassigned"} />
                  <Field label="Logged" value={shortDate(lead.lead_date)} />
                  <Field
                    label="Follow-up"
                    value={shortDate(lead.next_followup_date)}
                  />
                  {lead.lost_reason ? (
                    <Field
                      label="Lost reason"
                      value={labelFor("lost_reason", lead.lost_reason)}
                    />
                  ) : null}
                </dl>
              </Section>
            </>
          ) : null}

          {tab === "timeline" ? (
            <Section title="Activity">
              {timeline.length === 0 ? (
                <p className="text-muted-foreground text-[12px]">
                  Nothing recorded yet.
                </p>
              ) : (
                <ol className="space-y-0">
                  {timeline.map((event, index) => (
                    <li key={event.id} className="flex gap-3 pb-3">
                      <div className="flex flex-col items-center">
                        <span className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full" />
                        {index < timeline.length - 1 ? (
                          <span className="bg-border mt-1 w-px flex-1" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-medium">{event.title}</p>
                        {event.body ? (
                          <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">
                            {event.body}
                          </p>
                        ) : null}
                        <p className="text-muted-foreground mt-0.5 text-[10px]">
                          {shortDate(event.occurred_at)} · {event.actor_type}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Section>
          ) : null}
        </div>
      </aside>
    </>
  );
}

function QuickAction({
  icon: Icon,
  label,
  href,
}: {
  icon: typeof Phone;
  label: string;
  href?: string;
}) {
  const className = cn(
    "flex flex-1 flex-col items-center gap-1 rounded-md py-1.5 text-[10px] transition-colors",
    href
      ? "hover:bg-accent text-foreground"
      : "text-muted-foreground/40 pointer-events-none",
  );

  const content = (
    <>
      <Icon className="size-3.5" />
      {label}
    </>
  );

  if (!href) {
    return (
      <span className={className} aria-disabled title={`No ${label.toLowerCase()} on file`}>
        {content}
      </span>
    );
  }

  const external = href.startsWith("http") || href.startsWith("tel:") || href.startsWith("mailto:");

  return external ? (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel="noopener noreferrer"
      className={className}
    >
      {content}
    </a>
  ) : (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}
