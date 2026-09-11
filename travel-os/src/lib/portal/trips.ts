import "server-only";

import { portalQuery, portalQueryOne } from "@/lib/db/portal";

/**
 * Every read the customer portal makes.
 *
 * All of it goes through `portalQuery`, which connects as `portal_reader` — a
 * role with no grants on any base table, only on the `portal_*` views. Those
 * views physically lack supplier, cost and margin columns, so there is no query
 * writable here that could leak them, however wrong it is.
 *
 * Scoping is by **trip membership**, never by household. A co-traveller invited
 * to one trip must not see the booker's other travel, and household grouping
 * would hand them exactly that.
 */

export type PortalTrip = {
  id: string;
  reference: string | null;
  title: string | null;
  destination: string | null;
  is_international: boolean;
  start_date: string | null;
  end_date: string | null;
  status: string;
  currency: string;
  total_customer_price: string | null;
  itinerary_published: boolean;
  emergency_contacts: unknown;
};

export type PortalService = {
  id: string;
  trip_id: string;
  sort_order: number;
  kind: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  confirmation_number: string | null;
  status: string;
  qty: number;
  unit: string | null;
  customer_price: string | null;
  line_total: string | null;
};

export type PortalItineraryDay = {
  id: string;
  trip_id: string;
  day_number: number;
  date: string | null;
  title: string | null;
  summary: string | null;
};

export type PortalItineraryItem = {
  id: string;
  itinerary_day_id: string;
  service_id: string | null;
  sort_order: number;
  time_label: string | null;
  title: string;
  description: string | null;
};

export type PortalBalance = {
  trip_id: string;
  currency: string;
  total: string;
  paid: string;
  balance: string;
};

export type PortalDocument = {
  id: string;
  filename: string;
  mime_type: string | null;
  size_bytes: string | null;
  doc_type: string;
  created_at: string;
};

export type PortalCrossSell = {
  id: string;
  trip_id: string;
  rule_key: string;
  suggested_kind: string;
  headline: string;
  status: string;
};

/**
 * A trip belongs to a customer when they are listed as a traveller on it.
 * Every query below joins through this, so entitlement is never implied by the
 * caller having an id.
 */
const MEMBERSHIP = `
  exists (
    select 1 from public.portal_trip_traveller_v tt
     where tt.trip_id = t.id and tt.customer_id = $1
  )
`;

const TRIP_COLUMNS = `
  t.id, t.reference, t.title, t.destination, t.is_international,
  t.start_date, t.end_date, t.status, t.currency,
  t.total_customer_price, t.itinerary_published, t.emergency_contacts
`;

/**
 * Upcoming and past, split in SQL rather than in JS.
 *
 * The boundary is the end date, falling back to the start date for a trip with
 * no end recorded. A trip that is still running counts as upcoming — a traveller
 * mid-journey needs their vouchers on the Upcoming tab, not filed under history.
 */
export async function listTrips(customerId: string): Promise<{
  upcoming: PortalTrip[];
  past: PortalTrip[];
}> {
  const rows = await portalQuery<PortalTrip & { is_past: boolean }>(
    `select ${TRIP_COLUMNS},
            coalesce(t.end_date, t.start_date) < current_date as is_past
       from public.portal_trip_v t
      where ${MEMBERSHIP}
      order by coalesce(t.start_date, t.end_date) desc nulls last`,
    [customerId],
  );

  return {
    upcoming: rows.filter((r) => !r.is_past),
    past: rows.filter((r) => r.is_past),
  };
}

export async function getTrip(
  customerId: string,
  tripId: string,
): Promise<PortalTrip | null> {
  return portalQueryOne<PortalTrip>(
    `select ${TRIP_COLUMNS}
       from public.portal_trip_v t
      where t.id = $2 and ${MEMBERSHIP}`,
    [customerId, tripId],
  );
}

/**
 * Each of the following re-checks membership rather than trusting that
 * `getTrip` was called first. A page that forgets the guard then returns
 * nothing, instead of returning someone else's itinerary.
 */

export async function getServices(customerId: string, tripId: string) {
  return portalQuery<PortalService>(
    `select s.* from public.portal_service_v s
       join public.portal_trip_v t on t.id = s.trip_id
      where s.trip_id = $2 and ${MEMBERSHIP}
      order by s.sort_order, s.start_date nulls last`,
    [customerId, tripId],
  );
}

export async function getItinerary(customerId: string, tripId: string) {
  const days = await portalQuery<PortalItineraryDay>(
    `select d.* from public.portal_itinerary_day_v d
       join public.portal_trip_v t on t.id = d.trip_id
      where d.trip_id = $2 and ${MEMBERSHIP}
      order by d.day_number`,
    [customerId, tripId],
  );

  if (days.length === 0) return [];

  const items = await portalQuery<PortalItineraryItem>(
    `select i.* from public.portal_itinerary_item_v i
      where i.itinerary_day_id = any($1::uuid[])
      order by i.sort_order`,
    [days.map((d) => d.id)],
  );

  return days.map((day) => ({
    ...day,
    items: items.filter((item) => item.itinerary_day_id === day.id),
  }));
}

export async function getBalance(customerId: string, tripId: string) {
  return portalQueryOne<PortalBalance>(
    `select b.* from public.portal_trip_balance_v b
       join public.portal_trip_v t on t.id = b.trip_id
      where b.trip_id = $2 and ${MEMBERSHIP}`,
    [customerId, tripId],
  );
}

/**
 * Documents visible on a trip.
 *
 * `portal_document_v` already filters to `customer_visible`, and the polymorphic
 * owner is matched to this trip. `storage_path` is selected by the view but
 * deliberately not returned here — the portal never needs it, and the only way
 * to a file is `getSignedDocumentUrl`, which logs the access and re-checks
 * entitlement itself.
 */
export async function getDocuments(customerId: string, tripId: string) {
  return portalQuery<PortalDocument>(
    `select d.id, d.filename, d.mime_type, d.size_bytes, d.doc_type, d.created_at
       from public.portal_document_v d
       join public.portal_trip_v t on t.id = d.owner_id
      where d.owner_type = 'trip' and d.owner_id = $2 and ${MEMBERSHIP}
      order by d.created_at desc`,
    [customerId, tripId],
  );
}

/** Suggestions that have not been acted on or dismissed. */
export async function getCrossSell(customerId: string, tripId: string) {
  return portalQuery<PortalCrossSell>(
    `select c.id, c.trip_id, c.rule_key, c.suggested_kind, c.headline, c.status
       from public.portal_cross_sell_v c
       join public.portal_trip_v t on t.id = c.trip_id
      where c.trip_id = $2
        and c.customer_id = $1
        and c.status in ('suggested', 'shown')
        and ${MEMBERSHIP}`,
    [customerId, tripId],
  );
}
