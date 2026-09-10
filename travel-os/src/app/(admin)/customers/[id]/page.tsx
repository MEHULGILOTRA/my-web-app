import Link from "next/link";
import { notFound } from "next/navigation";

import { StagePill } from "@/components/admin/stage-pill";
import { requireStaff } from "@/lib/auth/session";
import { createStaffClient } from "@/lib/db/admin";
import { inrCompact, shortDate } from "@/lib/format";
import { getOptionLabels, optionLabel } from "@/lib/options";

export default async function CustomerDetailPage(
  props: PageProps<"/customers/[id]">,
) {
  await requireStaff();
  const { id } = await props.params;
  const supabase = await createStaffClient();
  const labels = await getOptionLabels();

  const { data: customer } = await supabase
    .from("customers")
    .select("*, households:household_id(id, name)")
    .eq("id", id)
    .maybeSingle();

  if (!customer) notFound();

  const [{ data: leads }, { data: legacy }, { data: events }, { data: tags }] =
    await Promise.all([
      supabase
        .from("leads")
        .select("id, reference, destination, status, budget_max, lead_date")
        .eq("primary_customer_id", id)
        .is("deleted_at", null)
        .order("lead_date", { ascending: false }),
      supabase
        .from("legacy_trips")
        .select("id, destination, travel_start, travel_end, headline_value, notes")
        .eq("customer_id", id)
        .order("travel_start", { ascending: false }),
      supabase
        .from("timeline_events")
        .select("id, title, body, occurred_at, actor_type")
        .eq("customer_id", id)
        .order("occurred_at", { ascending: false })
        .limit(30),
      supabase
        .from("customer_tags")
        .select("tags:tag_id(name)")
        .eq("customer_id", id),
    ]);

  const household = customer.households as unknown as {
    id: string;
    name: string;
  } | null;

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-3 md:px-5">
        <Link
          href="/customers"
          className="text-muted-foreground hover:text-foreground text-[12px]"
        >
          ← Customers
        </Link>
        <h1 className="text-sm font-semibold">{customer.full_name}</h1>
        {household ? (
          <span className="text-muted-foreground text-[12px]">
            {household.name}
          </span>
        ) : null}
        <div className="ml-auto flex flex-wrap gap-1">
          {(tags ?? []).map((row, index) => {
            const tag = row.tags as unknown as { name: string } | null;
            return tag ? (
              <span
                key={index}
                className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-[11px]"
              >
                {tag.name}
              </span>
            ) : null;
          })}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-0 overflow-auto lg:grid-cols-[280px_minmax(0,1fr)_300px]">
        <aside className="space-y-4 border-b p-4 lg:border-r lg:border-b-0">
          <Section title="Contact">
            <Field label="Phone" value={customer.phone_e164} />
            <Field label="WhatsApp" value={customer.whatsapp_e164} />
            <Field label="Alt phone" value={customer.alternate_phone_e164} />
            <Field label="Email" value={customer.email} />
            <Field label="City" value={customer.city} />
            <Field label="State" value={customer.state} />
            <Field label="Country" value={customer.country} />
          </Section>

          <Section title="Profile">
            <Field
              label="Type"
              value={optionLabel(labels, "customer_type", customer.customer_type)}
            />
            <Field label="Stage" value={customer.lifecycle_stage} />
            <Field label="Birthday" value={shortDate(customer.dob)} />
            <Field
              label="Anniversary"
              value={shortDate(customer.anniversary)}
            />
            <Field label="Nationality" value={customer.nationality} />
            <Field
              label="Marketing"
              value={customer.marketing_consent ? "Opted in" : "Not opted in"}
            />
          </Section>

          {customer.company_name || customer.gstin ? (
            <Section title="Company">
              <Field label="Name" value={customer.company_name} />
              <Field label="GSTIN" value={customer.gstin} />
            </Section>
          ) : null}

          {customer.notes ? (
            <Section title="Notes">
              <p className="text-[12px] leading-relaxed">{customer.notes}</p>
            </Section>
          ) : null}
        </aside>

        <section className="space-y-6 p-4">
          <div>
            <h2 className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wide uppercase">
              Leads &amp; enquiries
            </h2>
            {(leads ?? []).length === 0 ? (
              <p className="text-muted-foreground text-[13px]">None yet.</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {(leads ?? []).map((lead) => (
                  <li key={lead.id}>
                    <Link
                      href={`/leads/${lead.id}`}
                      className="hover:bg-muted/50 flex items-center gap-3 px-3 py-2 text-[13px]"
                    >
                      <span className="text-muted-foreground font-mono text-[11px]">
                        {lead.reference}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {lead.destination ?? "—"}
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        {inrCompact(lead.budget_max)}
                      </span>
                      <StagePill stage={lead.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {(legacy ?? []).length > 0 ? (
            <div>
              <h2 className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wide uppercase">
                Past travel (imported)
              </h2>
              <ul className="divide-y rounded-lg border">
                {(legacy ?? []).map((trip) => (
                  <li
                    key={trip.id}
                    className="flex items-center gap-3 px-3 py-2 text-[13px]"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {trip.destination ?? "—"}
                    </span>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {shortDate(trip.travel_start)}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {inrCompact(trip.headline_value)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground mt-1.5 text-[11px]">
                Imported from spreadsheets. Read-only.
              </p>
            </div>
          ) : null}
        </section>

        <aside className="border-t p-4 lg:border-t-0 lg:border-l">
          <h2 className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-wide uppercase">
            Timeline
          </h2>
          {(events ?? []).length === 0 ? (
            <p className="text-muted-foreground text-[13px]">
              Nothing recorded yet.
            </p>
          ) : (
            <ol className="space-y-3">
              {(events ?? []).map((event) => (
                <li key={event.id} className="text-[12px]">
                  <p className="font-medium">{event.title}</p>
                  {event.body ? (
                    <p className="text-muted-foreground mt-0.5 leading-relaxed">
                      {event.body}
                    </p>
                  ) : null}
                  <p className="text-muted-foreground mt-0.5 text-[11px]">
                    {shortDate(event.occurred_at)}
                  </p>
                </li>
              ))}
            </ol>
          )}
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
  if (!value || value === "—") return null;
  return (
    <div className="flex gap-2 text-[12px]">
      <dt className="text-muted-foreground w-20 shrink-0">{label}</dt>
      <dd className="min-w-0 flex-1 break-words">{value}</dd>
    </div>
  );
}
