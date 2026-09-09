/**
 * Shapes and defaults for the lead form.
 *
 * Deliberately NOT in the "use client" component file. Server Components need
 * to call `emptyLead()` to seed the create page, and an export from a client
 * module reaches the server as a client reference rather than a callable
 * function — the call fails at runtime, not at build time.
 */

export type LeadFormData = {
  id?: string;
  reference?: string | null;
  lead_date: string | null;
  destination: string | null;
  is_international: boolean;
  origin_city: string | null;
  travel_start: string | null;
  duration_nights: number | null;
  travel_month: string | null;
  pax_adults: number;
  pax_children: number;
  children_ages: number[] | null;
  travel_theme: string | null;
  hotel_category: string | null;
  meal_plan: string | null;
  dietary_preference: string | null;
  room_configuration: string | null;
  preferred_airline: string | null;
  flights_status: string | null;
  visa_status: string | null;
  transfers_status: string | null;
  insurance_status: string | null;
  forex_status: string | null;
  activities_status: string | null;
  budget_min: number | null;
  budget_max: number | null;
  source: string;
  priority: string;
  next_followup_date: string | null;
  owner_staff_id: string | null;
  special_occasion: string | null;
  special_notes: string | null;
};

export type CustomerFormData = {
  full_name: string;
  phone_e164: string | null;
  phone_raw: string | null;
  email: string | null;
  city: string | null;
  customer_type: string;
};

/** Starting point for a brand new lead. */
export function emptyLead(): LeadFormData {
  return {
    lead_date: new Date().toISOString().slice(0, 10),
    destination: null,
    is_international: false,
    origin_city: null,
    travel_start: null,
    duration_nights: null,
    travel_month: null,
    pax_adults: 2,
    pax_children: 0,
    children_ages: null,
    travel_theme: null,
    hotel_category: null,
    meal_plan: null,
    dietary_preference: null,
    room_configuration: null,
    preferred_airline: null,
    flights_status: null,
    visa_status: null,
    transfers_status: null,
    insurance_status: null,
    forex_status: null,
    activities_status: null,
    budget_min: null,
    budget_max: null,
    source: "whatsapp",
    priority: "warm",
    next_followup_date: null,
    owner_staff_id: null,
    special_occasion: null,
    special_notes: null,
  };
}

export function emptyCustomer(): CustomerFormData {
  return {
    full_name: "",
    phone_e164: null,
    phone_raw: null,
    email: null,
    city: null,
    customer_type: "new",
  };
}
