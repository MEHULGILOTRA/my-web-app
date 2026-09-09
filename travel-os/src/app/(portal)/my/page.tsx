/**
 * Placeholder. Phase 4 builds this into the two-tab customer portal:
 * Upcoming Trips (booked elements, balance with Razorpay Pay Now, itinerary or
 * the "contact agency" fallback, cross-sell cards) and Past Trips (read-only
 * archive with document downloads).
 *
 * Documents stay behind login throughout — they carry passport and PAN details.
 */
export default function MyTripsPage() {
  return (
    <main className="mx-auto w-full max-w-md px-6 py-16 text-center">
      <div className="bg-brand-gradient mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl text-xl font-semibold text-white">
        S
      </div>
      <h1 className="text-brand-ink text-xl font-semibold">My SkyMiles Trip</h1>
      <p className="text-brand-ink/70 mt-3 text-sm leading-relaxed">
        Your trips, documents and itinerary will appear here. This portal opens
        in Phase 4.
      </p>
    </main>
  );
}
