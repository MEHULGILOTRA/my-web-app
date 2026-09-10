import Link from "next/link";
import { Pencil } from "lucide-react";
import { notFound } from "next/navigation";

import { createQuotationForLead } from "@/app/(admin)/quotations/actions";
import { DocumentPanel, type DocumentRow } from "@/components/admin/document-panel";
import { LeadStageSelect } from "@/components/admin/lead-stage-select";
import { DeleteLeadButton } from "@/components/leads/delete-lead-button";
import { PriorityDot } from "@/components/admin/stage-pill";
import { requireStaff } from "@/lib/auth/session";
import { createStaffClient } from "@/lib/db/admin";
import { inr, relativeDays, shortDate } from "@/lib/format";
import { getOptionLabels, optionLabel, SOURCE_LABELS } from "@/lib/options";

export default async function LeadDetailPage(props: PageProps<"/leads/[id]">) {
  await requireStaff();
  const { id } = await props.params;
  const supabase = await createStaffClient();

  const { data: lead } = await supabase
    .from("leads")
    .select(
      `*, customers:primary_customer_id(id, full_name, phone_e164, email, city, customer_type)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!lead) notFound();

  const labels = await getOptionLabels();
  const [{ data: events }, { data: quotes }, { data: documents }] =
    await Promise.all([
    supabase
      .from("timeline_events")
      .select("id, event_type, title, body, occurred_at, actor_type")
      .eq("lead_id", id)
      .order("occurred_at", { ascending: false })
      .limit(50),
    supabase
      .from("quotations")
      .select("id, reference, version, status, total, total_payable, sent_at")
      .eq("lead_id", id)
      .order("version", { ascending: false }),
    supabase
      .from("documents")
      .select("id, filename, doc_type, size_bytes, customer_visible, created_at")
      .eq("owner_type", "lead")
      .eq("owner_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const customer = lead.customers as unknown as {
    id: string;
    full_name: string;
    phone_e164: string | null;
    email: string | null;
    city: string | null;
    customer_type: string;
  } | null;

  const followup = relativeDays(lead.next_followup_date);

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-3 md:px-5">
        <Link
          href="/leads"
          className="text-muted-foreground hover:text-foreground text-[12px]"
        >
          ← Leads
        </Link>
        <h1 className="text-sm font-semibold">
          {customer?.full_name ?? "Unknown customer"}
        </h1>
        <span className="text-muted-foreground font-mono text-[11px]">
          {lead.reference}
        </span>
        <PriorityDot priority={lead.priority} />
        <div className="ml-auto flex items-center gap-2">
          <Link
            href={`/leads/${lead.id}/edit`}
            className="hover:bg-accent inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12px]"
          >
            <Pencil className="size-3.5" />
            Edit
          </Link>
          <LeadStageSelect leadId={lead.id} status={lead.status} />
          <DeleteLeadButton
            leadId={lead.id}
            reference={lead.reference}
            clientName={customer?.full_name ?? "Unknown customer"}
            redirectTo="/leads"
            size="sm"
          />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-0 overflow-auto lg:grid-cols-[280px_minmax(0,1fr)_300px]">
        {/* Properties */}
        <aside className="space-y-4 border-b p-4 lg:border-r lg:border-b-0">
          <Section title="Customer">
            <Field label="Name" value={customer?.full_name} />
            <Field label="Phone" value={customer?.phone_e164} />
            <Field label="Email" value={customer?.email} />
            <Field label="City" value={customer?.city} />
            <Field
              label="Type"
              value={optionLabel(
                labels,
                "customer_type",
                customer?.customer_type,
              )}
            />
            {customer ? (
              <Link
                href={`/customers/${customer.id}`}
                className="text-primary mt-1 inline-block text-[12px] underline underline-offset-2"
              >
                Open customer
              </Link>
            ) : null}
          </Section>

          <Section title="Trip">
            <Field label="Destination" value={lead.destination} />
            <Field
              label="Type"
              value={lead.is_international ? "International" : "Domestic"}
            />
            <Field label="From" value={lead.origin_city} />
            <Field
              label="Travel"
              value={
                lead.travel_start
                  ? `${shortDate(lead.travel_start)}${lead.duration_nights ? ` · ${lead.duration_nights} nights` : ""}`
                  : lead.travel_month
              }
            />
            <Field
              label="Pax"
              value={`${lead.pax_adults} adult${lead.pax_adults === 1 ? "" : "s"}${
                lead.pax_children ? `, ${lead.pax_children} child` : ""
              }`}
            />
            <Field
              label="Budget"
              value={
                lead.budget_max
                  ? `${lead.budget_min ? `${inr(lead.budget_min)} – ` : ""}${inr(lead.budget_max)}`
                  : null
              }
            />
            <Field
              label="Theme"
              value={optionLabel(labels, "travel_theme", lead.travel_theme)}
            />
            <Field
              label="Hotel"
              value={optionLabel(labels, "hotel_category", lead.hotel_category)}
            />
            <Field
              label="Meals"
              value={optionLabel(labels, "meal_plan", lead.meal_plan)}
            />
            <Field
              label="Rooms"
              value={optionLabel(
                labels,
                "room_configuration",
                lead.room_configuration,
              )}
            />
          </Section>

          <Section title="Components">
            <Field
              label="Flights"
              value={optionLabel(labels, "flights_status", lead.flights_status)}
            />
            <Field
              label="Visa"
              value={optionLabel(labels, "visa_status", lead.visa_status)}
            />
            <Field
              label="Transfers"
              value={optionLabel(
                labels,
                "transfers_status",
                lead.transfers_status,
              )}
            />
            <Field
              label="Insurance"
              value={optionLabel(
                labels,
                "insurance_status",
                lead.insurance_status,
              )}
            />
            <Field
              label="Forex"
              value={optionLabel(labels, "forex_status", lead.forex_status)}
            />
            <Field
              label="Activities"
              value={optionLabel(
                labels,
                "activities_status",
                lead.activities_status,
              )}
            />
          </Section>

          <Section title="Pipeline">
            <Field
              label="Source"
              value={SOURCE_LABELS[lead.source] ?? lead.source}
            />
            <Field label="Logged" value={shortDate(lead.lead_date)} />
            <Field
              label="Follow-up"
              value={
                lead.next_followup_date
                  ? `${shortDate(lead.next_followup_date)} (${followup.label})`
                  : null
              }
            />
            {lead.lost_reason ? (
              <Field
                label="Lost reason"
                value={optionLabel(labels, "lost_reason", lead.lost_reason)}
              />
            ) : null}
          </Section>

          {lead.special_notes ? (
            <Section title="Notes">
              <p className="text-[12px] leading-relaxed">{lead.special_notes}</p>
            </Section>
          ) : null}
        </aside>

        {/* Timeline */}
        <section className="p-4">
          <h2 className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-wide uppercase">
            Timeline
          </h2>

          {(events ?? []).length === 0 ? (
            <p className="text-muted-foreground text-[13px]">
              Nothing recorded yet.
            </p>
          ) : (
            <ol className="space-y-0">
              {(events ?? []).map((event, index) => (
                <li key={event.id} className="relative flex gap-3 pb-4">
                  <div className="flex flex-col items-center">
                    <span className="bg-primary mt-1.5 size-2 shrink-0 rounded-full" />
                    {index < (events ?? []).length - 1 ? (
                      <span className="bg-border w-px flex-1" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium">{event.title}</p>
                    {event.body ? (
                      <p className="text-muted-foreground mt-0.5 text-[12px] leading-relaxed">
                        {event.body}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground mt-0.5 text-[11px]">
                      {shortDate(event.occurred_at)} · {event.actor_type}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Quotations */}
        <aside className="border-t p-4 lg:border-t-0 lg:border-l">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
              Quotations
            </h2>
            {/* A form, not a link: creating a quotation is a write, and a GET
                route would be triggered by browser prefetch. */}
            <form action={createQuotationForLead.bind(null, lead.id)}>
              <button
                type="submit"
                className="text-primary text-[12px] underline underline-offset-2"
              >
                {(quotes ?? []).length > 0 ? "New version" : "New"}
              </button>
            </form>
          </div>

          {(quotes ?? []).length === 0 ? (
            <p className="text-muted-foreground text-[13px]">
              No quotations yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {(quotes ?? []).map((quote) => (
                <li key={quote.id}>
                  <Link
                    href={`/quotations/${quote.id}`}
                    className="hover:border-primary/40 block rounded-lg border px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-medium">
                        V{quote.version}
                      </span>
                      <span className="text-muted-foreground text-[11px] capitalize">
                        {quote.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[13px] font-semibold tabular-nums">
                      {inr(quote.total_payable ?? quote.total)}
                    </p>
                    <p className="text-muted-foreground font-mono text-[10px]">
                      {quote.reference}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6">
            <DocumentPanel
              ownerType="lead"
              ownerId={lead.id}
              documents={(documents ?? []) as DocumentRow[]}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-muted-foreground mb-1.5 text-[11px] font-semibold tracking-wide uppercase">
        {title}
      </h2>
      <dl className="space-y-1">{children}</dl>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-[12px]">
      <dt className="text-muted-foreground w-20 shrink-0">{label}</dt>
      <dd className="min-w-0 flex-1 break-words">{value}</dd>
    </div>
  );
}
