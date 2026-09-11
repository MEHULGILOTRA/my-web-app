import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCustomer } from "@/lib/auth/portal-session";
import {
  getBalance,
  getCrossSell,
  getDocuments,
  getItinerary,
  getServices,
  getTrip,
} from "@/lib/portal/trips";
import { CrossSellCards } from "@/components/portal/cross-sell-cards";
import { DocumentList } from "@/components/portal/document-list";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const KIND_LABEL: Record<string, string> = {
  flight: "Flight",
  hotel: "Hotel",
  visa: "Visa",
  forex: "Forex",
  transfer: "Transfer",
  activity: "Activity",
  insurance: "Insurance",
  other: "Other",
};

export default async function TripPage(props: PageProps<"/my/trips/[id]">) {
  const customer = await requireCustomer();
  const { id } = await props.params;

  /**
   * `getTrip` is scoped by trip membership, so a trip belonging to someone else
   * returns null and this 404s — the same response as a trip that does not
   * exist, which is what stops the URL being used to probe for valid ids.
   */
  const trip = await getTrip(customer.id, id);
  if (!trip) notFound();

  const [services, itinerary, balance, documents, crossSell] = await Promise.all([
    getServices(customer.id, id),
    getItinerary(customer.id, id),
    getBalance(customer.id, id),
    getDocuments(customer.id, id),
    getCrossSell(customer.id, id),
  ]);

  const due = balance ? Number(balance.balance) : 0;

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pt-8 pb-20">
      <Link href="/my" className="text-brand-ink/60 text-sm">
        ← All trips
      </Link>

      <h1 className="text-brand-ink mt-4 text-2xl font-semibold">
        {trip.title ?? trip.destination ?? "Your trip"}
      </h1>
      {trip.reference ? (
        <p className="text-brand-ink/40 mt-1 font-mono text-xs">
          {trip.reference}
        </p>
      ) : null}

      {due > 0 ? (
        <section className="border-brand-ink/10 mt-6 rounded-2xl border bg-white p-5">
          <p className="text-brand-ink/60 text-sm">Balance due</p>
          <p className="text-brand-ink mt-1 text-2xl font-semibold tabular-nums">
            {inr.format(due)}
          </p>
          {/* Razorpay checkout arrives in Phase 5. Saying so is better than a
              dead button — a traveller who taps nothing twice assumes it broke. */}
          <p className="text-brand-ink/60 mt-3 text-sm">
            Online payment is coming shortly. For now, please contact us to
            settle the balance.
          </p>
        </section>
      ) : null}

      {crossSell.length > 0 ? (
        <CrossSellCards suggestions={crossSell} />
      ) : null}

      <section className="mt-10">
        <h2 className="text-brand-ink text-lg font-semibold">What&rsquo;s booked</h2>

        {services.length === 0 ? (
          <p className="text-brand-ink/60 mt-3 text-sm">
            Nothing confirmed yet. We&rsquo;ll add each booking here as it is
            issued.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {services.map((service) => (
              <li
                key={service.id}
                className="border-brand-ink/10 rounded-2xl border bg-white p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-brand-ink/50 text-[11px] tracking-wide uppercase">
                      {KIND_LABEL[service.kind] ?? service.kind}
                    </p>
                    <p className="text-brand-ink mt-1 font-medium">
                      {service.title}
                    </p>
                    {service.location ? (
                      <p className="text-brand-ink/60 mt-1 text-sm">
                        {service.location}
                      </p>
                    ) : null}
                  </div>

                  {service.confirmation_number ? (
                    <span className="text-brand-ink/50 shrink-0 font-mono text-[11px]">
                      {service.confirmation_number}
                    </span>
                  ) : null}
                </div>

                {service.description ? (
                  <p className="text-brand-ink/70 mt-3 text-sm leading-relaxed">
                    {service.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-brand-ink text-lg font-semibold">Itinerary</h2>

        {/*
          A trip with no published itinerary says so plainly. The alternative —
          an empty section — reads as a bug, and prompts a phone call we would
          rather the page answered.
        */}
        {!trip.itinerary_published || itinerary.length === 0 ? (
          <p className="text-brand-ink/60 mt-3 text-sm leading-relaxed">
            Your day-by-day plan is still being put together. Contact the agency
            and we&rsquo;ll finalise it with you.
          </p>
        ) : (
          <ol className="mt-4 space-y-4">
            {itinerary.map((day) => (
              <li
                key={day.id}
                className="border-brand-ink/10 rounded-2xl border bg-white p-5"
              >
                <p className="text-brand-ink/50 text-[11px] tracking-wide uppercase">
                  Day {day.day_number}
                </p>
                {day.title ? (
                  <p className="text-brand-ink mt-1 font-medium">{day.title}</p>
                ) : null}
                {day.summary ? (
                  <p className="text-brand-ink/70 mt-2 text-sm leading-relaxed">
                    {day.summary}
                  </p>
                ) : null}

                {day.items.length > 0 ? (
                  <ul className="border-brand-ink/10 mt-4 space-y-2 border-t pt-4">
                    {day.items.map((item) => (
                      <li key={item.id} className="flex gap-3 text-sm">
                        {item.time_label ? (
                          <span className="text-brand-ink/50 w-16 shrink-0 tabular-nums">
                            {item.time_label}
                          </span>
                        ) : null}
                        <span className="text-brand-ink/80">{item.title}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      <DocumentList documents={documents} />

      {Array.isArray(trip.emergency_contacts) &&
      trip.emergency_contacts.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-brand-ink text-lg font-semibold">
            Emergency contacts
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {(trip.emergency_contacts as { label: string; phone: string }[]).map(
              (contact) => (
                <li key={`${contact.label}-${contact.phone}`}>
                  <span className="text-brand-ink/60">{contact.label}: </span>
                  <a href={`tel:${contact.phone}`} className="text-brand-ink">
                    {contact.phone}
                  </a>
                </li>
              ),
            )}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
