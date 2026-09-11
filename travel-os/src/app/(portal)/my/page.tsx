import Link from "next/link";

import { requireCustomer } from "@/lib/auth/portal-session";
import { listTrips, type PortalTrip } from "@/lib/portal/trips";
import { PortalHeader } from "@/components/portal/portal-header";

export const metadata = { title: "My trips" };

const dateRange = (trip: PortalTrip) => {
  const fmt = (value: string | null) =>
    value
      ? new Date(value).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;

  const start = fmt(trip.start_date);
  const end = fmt(trip.end_date);

  if (start && end) return `${start} — ${end}`;
  return start ?? end ?? "Dates to be confirmed";
};

/**
 * The portal home: two sections, Upcoming and Past.
 *
 * Phone-first and spacious — the opposite discipline to the admin tables. A
 * traveller opens this at an airport, on one hand, in a hurry.
 */
export default async function MyTripsPage() {
  const customer = await requireCustomer();
  const { upcoming, past } = await listTrips(customer.id);

  return (
    <>
      <PortalHeader name={customer.full_name} />

      <main className="mx-auto w-full max-w-2xl px-5 pb-20">
        <section aria-labelledby="upcoming">
          <h2 id="upcoming" className="text-brand-ink text-lg font-semibold">
            Upcoming trips
          </h2>

          {upcoming.length === 0 ? (
            <p className="text-brand-ink/60 mt-3 text-sm leading-relaxed">
              Nothing booked at the moment. When we confirm your next trip it
              will appear here with your itinerary and documents.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {upcoming.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </ul>
          )}
        </section>

        {past.length > 0 ? (
          <section aria-labelledby="past" className="mt-12">
            <h2 id="past" className="text-brand-ink text-lg font-semibold">
              Past trips
            </h2>
            <ul className="mt-4 space-y-3">
              {past.map((trip) => (
                <TripCard key={trip.id} trip={trip} past />
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </>
  );
}

function TripCard({ trip, past = false }: { trip: PortalTrip; past?: boolean }) {
  return (
    <li>
      <Link
        href={`/my/trips/${trip.id}`}
        className="border-brand-ink/10 hover:border-brand-ink/25 block rounded-2xl border bg-white p-5 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-brand-ink text-base font-semibold">
              {trip.title ?? trip.destination ?? "Your trip"}
            </p>
            <p className="text-brand-ink/60 mt-1 text-sm">{dateRange(trip)}</p>
          </div>

          {/* Reference is what a traveller quotes to us on the phone, so it is
              on the card rather than buried in the detail page. */}
          {trip.reference ? (
            <span className="text-brand-ink/40 shrink-0 font-mono text-[11px]">
              {trip.reference}
            </span>
          ) : null}
        </div>

        {!past && trip.destination ? (
          <p className="text-brand-ink/70 mt-3 text-sm">{trip.destination}</p>
        ) : null}
      </Link>
    </li>
  );
}
