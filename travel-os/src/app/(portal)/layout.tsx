import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * "My SkyMiles Trip" — the customer-facing shell.
 *
 * Phone-first and spacious, the opposite discipline to the admin side.
 *
 * Nothing under this route group may import `@/lib/db/admin`; ESLint fails the
 * build if it does. Customer data comes from `@/lib/db/portal`, which connects
 * as a role with no access to supplier costs or margins.
 */

/**
 * Overrides the root layout's title. A customer arriving at
 * my.skymilestravels.com should never see the internal tool's name in their
 * browser tab or in a shared link preview.
 *
 * noindex because trip pages are private to the traveller.
 */
export const metadata: Metadata = {
  title: "My SkyMiles Trip",
  description:
    "Your itinerary, documents and trip details from SkyMiles Travels.",
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-brand-cream flex min-h-full flex-col">{children}</div>
  );
}
