/**
 * Per-kind detail fields for a quotation line.
 *
 * A hotel line needs check-in, nights and a meal plan; a flight needs timings
 * and whether it returns. Rather than 20 nullable columns that are empty for
 * most rows, these live in the `meta jsonb` column that `quotation_items` and
 * `services` both already carry.
 *
 * One declaration drives three things — the form inputs, the validation in the
 * server action, and the sentence printed on the customer's quotation. Keeping
 * them in separate places is how a field gets captured and then silently never
 * shown.
 *
 * Everything here is OPTIONAL by decision: an enquiry often arrives with half
 * the details missing, and a required field would mean inventing one.
 */

export type FieldType = "text" | "date" | "time" | "number" | "select";

export type MetaField = {
  name: string;
  label: string;
  type: FieldType;
  /** Only for `select`. */
  options?: readonly (readonly [string, string])[];
  /** Grid width in the 12-column line-item form. */
  span?: number;
  placeholder?: string;
  /**
   * Render this field only when another field in the same line holds this
   * value. Used for the return leg, which is meaningless on a one-way flight —
   * and worse than meaningless, because a value typed there would otherwise sit
   * in the data waiting to be printed by mistake.
   */
  showWhen?: { field: string; equals: string };
};

/** Mirrors option_sets.meal_plan. Duplicated deliberately — see note below. */
const MEAL_PLANS = [
  ["ep", "Room only"],
  ["cp", "Breakfast only"],
  ["map", "Breakfast and dinner"],
  ["ap", "All meals included"],
  ["ai", "All inclusive"],
] as const;

/**
 * Labels here are the CUSTOMER-facing wording, not the trade abbreviations in
 * option_sets ("CP (Breakfast)"). A traveller reading a quotation should see
 * "Breakfast only", not an acronym they have to look up. The values match
 * option_sets so the data stays consistent.
 */

/** The return leg exists only on a return trip. */
const RETURN_ONLY = { field: "trip_type", equals: "return" } as const;

const CABINS = [
  ["economy", "Economy"],
  ["premium_economy", "Premium Economy"],
  ["business", "Business"],
  ["first", "First"],
] as const;

const STOPS = [
  ["0", "Non stop"],
  ["1", "1 stop"],
  ["2", "2 stops"],
] as const;

const VEHICLES = [
  ["sedan", "Sedan"],
  ["suv", "SUV"],
  ["tempo_traveller", "Tempo Traveller"],
  ["mini_bus", "Mini Bus"],
  ["coach", "Coach"],
  ["other", "Other…"],
] as const;

/** The free-text vehicle box appears only when the dropdown cannot say it. */
const VEHICLE_OTHER = { field: "vehicle", equals: "other" } as const;

export const KIND_FIELDS: Record<string, readonly MetaField[]> = {
  hotel: [
    { name: "check_in", label: "Check-in", type: "date", span: 2 },
    { name: "check_out", label: "Check-out", type: "date", span: 2 },
    { name: "nights", label: "Nights", type: "number", span: 1 },
    { name: "rooms", label: "Rooms", type: "number", span: 1 },
    { name: "room_type", label: "Room type", type: "text", span: 3, placeholder: "Superior Queen" },
    { name: "meal_plan", label: "Meal plan", type: "select", options: MEAL_PLANS, span: 3 },
    { name: "pax_per_room", label: "Pax per room", type: "text", span: 2, placeholder: "2 adults" },
    { name: "cancellation", label: "Cancellation", type: "text", span: 4, placeholder: "Free cancellation till 12 Sep" },
  ],
  flight: [
    {
      name: "trip_type",
      label: "Type",
      type: "select",
      options: [
        ["one_way", "One way"],
        ["return", "Return"],
      ],
      span: 2,
    },
    { name: "cabin", label: "Cabin", type: "select", options: CABINS, span: 2 },
    { name: "from_airport", label: "From", type: "text", span: 2, placeholder: "JAI Jaipur" },
    { name: "to_airport", label: "To", type: "text", span: 2, placeholder: "BOM Mumbai" },

    { name: "airline", label: "Airline", type: "text", span: 3, placeholder: "Air India Express" },
    { name: "flight_number", label: "Flight no.", type: "text", span: 2, placeholder: "IX-1247" },
    { name: "depart_date", label: "Departs", type: "date", span: 2 },
    { name: "depart_time", label: "Dep. time", type: "time", span: 2 },
    { name: "arrive_time", label: "Arr. time", type: "time", span: 2 },
    { name: "stops", label: "Stops", type: "select", options: STOPS, span: 2 },
    { name: "baggage_cabin", label: "Cabin bag", type: "text", span: 2, placeholder: "7 kg" },
    { name: "baggage_checkin", label: "Check-in bag", type: "text", span: 2, placeholder: "15 kg" },

    { showWhen: RETURN_ONLY, name: "return_airline", label: "Return airline", type: "text", span: 3, placeholder: "Air India" },
    { showWhen: RETURN_ONLY, name: "return_flight_number", label: "Return flight no.", type: "text", span: 2, placeholder: "AI-621" },
    { showWhen: RETURN_ONLY, name: "return_date", label: "Returns", type: "date", span: 2 },
    { showWhen: RETURN_ONLY, name: "return_time", label: "Dep. time", type: "time", span: 2 },
    { showWhen: RETURN_ONLY, name: "return_arrive_time", label: "Arr. time", type: "time", span: 2 },
    { showWhen: RETURN_ONLY, name: "return_stops", label: "Stops", type: "select", options: STOPS, span: 2 },
  ],
  transfer: [
    { name: "pickup", label: "Pickup", type: "text", span: 3, placeholder: "Airport" },
    { name: "drop", label: "Drop", type: "text", span: 3, placeholder: "Hotel" },
    { name: "transfer_date", label: "Date", type: "date", span: 2 },
    { name: "pickup_time", label: "Pickup time", type: "time", span: 2 },
    { name: "vehicle", label: "Vehicle", type: "select", options: VEHICLES, span: 2 },
    {
      showWhen: VEHICLE_OTHER,
      name: "vehicle_other",
      label: "Vehicle type",
      type: "text",
      span: 3,
      placeholder: "Innova Crysta",
    },
  ],
  activity: [
    { name: "activity_date", label: "Date", type: "date", span: 3 },
  ],
  visa: [
    { name: "country", label: "Country", type: "text", span: 4, placeholder: "Thailand" },
  ],
  /**
   * Forex prices itself. The generic Qty/Price/Cost row is hidden for this kind
   * (see PRICE_DERIVED_KINDS) because a forex line's total is arithmetic, not a
   * judgement — and a typed price that disagrees with the printed rate is a
   * number the customer will notice before we do.
   */
  forex: [
    { name: "from_currency", label: "From", type: "text", span: 2, placeholder: "INR" },
    { name: "to_currency", label: "To", type: "text", span: 2, placeholder: "USD" },
    { name: "forex_amount", label: "Amount", type: "number", span: 2, placeholder: "1000" },
    { name: "forex_rate", label: "Rate", type: "number", span: 2, placeholder: "88.50" },
    { name: "forex_charges", label: "Add. charges", type: "number", span: 2, placeholder: "500" },
    { name: "forex_cost", label: "Cost", type: "number", span: 2, placeholder: "Internal" },
  ],
  insurance: [],
  other: [],
};

export type LineMeta = Record<string, string | number | undefined>;

/**
 * Kinds whose customer price is computed from their own fields rather than
 * typed. The line-item form hides Qty/Price/Cost for these.
 */
export const PRICE_DERIVED_KINDS = new Set(["forex"]);

/**
 * Meta fields that are INTERNAL and must never be printed on a customer
 * document. `describeMeta` skips them; the fallback formatter respects this set
 * too, so a future kind cannot leak one by accident.
 */
export const INTERNAL_META_FIELDS = new Set(["forex_cost"]);

/**
 * The fields that should be visible for a kind given what has been entered so
 * far. Both the add form and the edit dialog call this, so they cannot drift.
 */
export function visibleFields(
  kind: string,
  meta: Record<string, string>,
): readonly MetaField[] {
  return (KIND_FIELDS[kind] ?? []).filter(
    (field) =>
      !field.showWhen || meta[field.showWhen.field] === field.showWhen.equals,
  );
}

/** Field names that carry a currency code, for display. */
const CURRENCY_FIELDS = new Set(["from_currency", "to_currency"]);

function labelFor(field: MetaField, value: string): string {
  if (field.type !== "select" || !field.options) return value;
  return field.options.find(([v]) => v === value)?.[1] ?? value;
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Flight duration from the two clock times.
 *
 * Computed rather than asked for: the agent already types departure and
 * arrival, and a third field would only be a chance for the three to disagree.
 * A negative gap means the arrival is next-day, so a day is added rather than
 * printing nonsense like "-22 h".
 */
function legDuration(depart: string | null, arrive: string | null): string | null {
  if (!depart || !arrive) return null;

  const parse = (value: string) => {
    const [h, m] = value.split(":").map(Number);
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
  };

  const from = parse(depart);
  const to = parse(arrive);
  if (from === null || to === null) return null;

  const minutes = to >= from ? to - from : to + 1440 - from;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return hours > 0 ? `${hours} h ${rest} m` : `${rest} m`;
}

/**
 * The forex total.
 *
 * Kept as a pure function so the form's live converter and the quotation text
 * cannot disagree — the agent types a rate, sees a total, and that is exactly
 * the number the customer reads.
 */
export function forexTotal(meta: LineMeta): number | null {
  const amount = Number(meta.forex_amount);
  const rate = Number(meta.forex_rate);
  if (!Number.isFinite(amount) || !Number.isFinite(rate)) return null;
  if (amount <= 0 || rate <= 0) return null;

  // Charges are optional and default to zero rather than invalidating the sum —
  // most forex lines have none.
  const rawCharges = Number(meta.forex_charges);
  const charges = Number.isFinite(rawCharges) && rawCharges > 0 ? rawCharges : 0;

  return Math.round((amount * rate + charges) * 100) / 100;
}

/** What the currency cost us. Internal — never printed. */
export function forexCost(meta: LineMeta): number {
  const cost = Number(meta.forex_cost);
  return Number.isFinite(cost) && cost > 0 ? cost : 0;
}

/**
 * Human-readable lines describing a quotation item's detail fields, for the
 * customer-facing text. Empty fields are skipped entirely rather than printed
 * as blanks.
 */
export function describeMeta(kind: string, meta: LineMeta): string[] {
  const fields = KIND_FIELDS[kind] ?? [];
  const out: string[] = [];

  const value = (name: string) => {
    const raw = meta[name];
    return raw === undefined || raw === null || String(raw).trim() === ""
      ? null
      : String(raw).trim();
  };

  if (kind === "hotel") {
    const checkIn = value("check_in");
    const checkOut = value("check_out");
    if (checkIn && checkOut) {
      out.push(`${formatDate(checkIn)} – ${formatDate(checkOut)}`);
    } else if (checkIn) {
      out.push(`From ${formatDate(checkIn)}`);
    }

    const nights = value("nights");
    const rooms = value("rooms");
    const roomType = value("room_type");
    const stay = [
      nights ? `${nights} ${Number(nights) === 1 ? "night" : "nights"}` : null,
      rooms ? `${rooms} ${Number(rooms) === 1 ? "room" : "rooms"}` : null,
      roomType,
    ].filter(Boolean);
    if (stay.length) out.push(stay.join(" · "));

    const pax = value("pax_per_room");
    if (pax) out.push(`Pax: ${pax}`);

    // Meal plan and cancellation read as one line, the way a hotel confirmation
    // states them: "Room Only, Free cancellation till 12 Sep".
    const meal = value("meal_plan");
    const cancellation = value("cancellation");
    const terms = [
      meal ? labelFor(fields.find((f) => f.name === "meal_plan")!, meal) : null,
      cancellation,
    ].filter(Boolean);
    if (terms.length) out.push(terms.join(", "));

    return out;
  }

  if (kind === "flight") {
    const type = value("trip_type");
    const cabinValue = value("cabin");

    const route = [value("from_airport"), value("to_airport")].filter(Boolean);
    const header = [
      route.length === 2 ? route.join(" – ") : route[0] ?? null,
      cabinValue
        ? labelFor(fields.find((f) => f.name === "cabin")!, cabinValue)
        : null,
      type ? (type === "return" ? "Return" : "One way") : null,
    ].filter(Boolean);
    if (header.length) out.push(header.join("  ·  "));

    /** One leg, rendered the way an airline itinerary states it. */
    const leg = (
      label: string,
      airlineKey: string,
      numberKey: string,
      dateKey: string,
      departKey: string,
      arriveKey: string,
      stopsKey: string,
    ) => {
      const airline = value(airlineKey);
      const flightNo = value(numberKey);
      const date = value(dateKey);
      const depart = value(departKey);
      const arrive = value(arriveKey);
      const stops = value(stopsKey);

      if (!airline && !flightNo && !date && !depart) return;

      const carrier = [airline, flightNo ? `(${flightNo})` : null]
        .filter(Boolean)
        .join(" ");
      out.push(`${label}: ${carrier || "Flight"}`);

      if (date || depart) {
        out.push(
          `  Departs ${[date ? formatDate(date) : null, depart].filter(Boolean).join(" ")}`,
        );
      }
      if (arrive) {
        out.push(`  Arrives ${[date ? formatDate(date) : null, arrive].filter(Boolean).join(" ")}`);
      }

      const duration = legDuration(depart, arrive);
      const stopLabel = stops
        ? labelFor(fields.find((f) => f.name === stopsKey)!, stops)
        : null;
      const meta2 = [duration, stopLabel].filter(Boolean);
      if (meta2.length) out.push(`  ${meta2.join(" / ")}`);
    };

    leg(
      type === "return" ? "Onward" : "Flight",
      "airline",
      "flight_number",
      "depart_date",
      "depart_time",
      "arrive_time",
      "stops",
    );

    // Only for a return trip: a return leg on a one-way line is a data-entry
    // slip, and repeating it to the customer spreads the confusion.
    if (type === "return") {
      leg(
        "Return",
        "return_airline",
        "return_flight_number",
        "return_date",
        "return_time",
        "return_arrive_time",
        "return_stops",
      );
    }

    const cabinBag = value("baggage_cabin");
    const checkinBag = value("baggage_checkin");
    if (cabinBag || checkinBag) {
      out.push(
        `Baggage: ${[cabinBag, checkinBag].filter(Boolean).join(" cabin | ")}${checkinBag ? " check-in" : " cabin"}`,
      );
    }

    return out;
  }

  if (kind === "transfer") {
    const pickup = value("pickup");
    const drop = value("drop");
    if (pickup || drop) out.push([pickup, drop].filter(Boolean).join(" → "));

    const date = value("transfer_date");
    const time = value("pickup_time");
    if (date || time) {
      out.push(
        [date ? formatDate(date) : null, time ? `pickup ${time}` : null]
          .filter(Boolean)
          .join(", "),
      );
    }

    const vehicle = value("vehicle");
    if (vehicle) {
      // "Other" is a UI affordance, not something to print at a customer. When
      // it is chosen the typed vehicle is the real answer.
      const custom = value("vehicle_other");
      if (vehicle === "other") {
        if (custom) out.push(custom);
      } else {
        const field = fields.find((f) => f.name === "vehicle")!;
        out.push(labelFor(field, vehicle));
      }
    }
    return out;
  }

  if (kind === "activity") {
    const date = value("activity_date");
    if (date) out.push(formatDate(date));
    return out;
  }

  if (kind === "visa") {
    const country = value("country");
    if (country) out.push(country);
    return out;
  }

  if (kind === "forex") {
    const from = value("from_currency");
    const to = value("to_currency");
    const amount = value("forex_amount");
    const rate = value("forex_rate");

    if (amount && to) out.push(`${amount} ${to.toUpperCase()}`);
    if (rate && from && to) {
      out.push(`at ${rate} ${from.toUpperCase()} per ${to.toUpperCase()}`);
    }

    // The converted total. The agent sees this live while typing the rate; the
    // customer has to see the same number, or the converter is just a
    // calculator whose answer never leaves the screen.
    const rawCharges = Number(meta.forex_charges);
    if (Number.isFinite(rawCharges) && rawCharges > 0) {
      out.push(
        `Handling charges ${rawCharges.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}`,
      );
    }

    // forex_cost is deliberately absent here. It is our buy price.
    const total = forexTotal(meta);
    if (total !== null) {
      out.push(
        `Equivalent ${total.toLocaleString("en-IN", { style: "currency", currency: "INR" })}`,
      );
    }
    return out;
  }

  // Fallback for any kind without bespoke phrasing: label: value.
  for (const field of fields) {
    if (INTERNAL_META_FIELDS.has(field.name)) continue;
    const raw = value(field.name);
    if (!raw) continue;
    const shown = CURRENCY_FIELDS.has(field.name)
      ? raw.toUpperCase()
      : field.type === "date"
        ? formatDate(raw)
        : labelFor(field, raw);
    out.push(`${field.label}: ${shown}`);
  }

  return out;
}
