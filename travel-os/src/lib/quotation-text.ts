import { inr } from "@/lib/format";
import { describeMeta, type LineMeta } from "@/lib/quotations/line-item-kinds";

/**
 * Renders a quotation as WhatsApp-ready plain text.
 *
 * WhatsApp markup is *bold* and _italic_ — no headings, no tables, no links
 * that survive a paste. So the structure has to come from blank lines and
 * numbering, and every line has to read well on a phone at ~35 characters.
 *
 * TCS is shown after the total and never folded into it, matching the agency's
 * wording: the quote excludes TCS, the customer pays total + TCS.
 */

export type QuotationLine = {
  sort_order: number;
  kind: string;
  title: string;
  description: string | null;
  qty: number;
  unit: string | null;
  customer_price: number;
  line_total: number;
  is_optional: boolean;
  is_included: boolean;
  /** Per-kind detail — check-in dates, meal plan, flight timings. */
  meta?: LineMeta | null;
};

export type QuotationDay = {
  day_number: number;
  date: string | null;
  title: string | null;
  description: string | null;
};

export type QuotationForText = {
  title: string | null;
  destination: string | null;
  travel_start: string | null;
  travel_end: string | null;
  travel_month: string | null;
  duration_nights: number | null;
  pax_adults: number;
  pax_children: number;
  currency: string;
  subtotal: number;
  discount: number;
  total: number;
  is_international: boolean;
  tcs_rate_percent: number | null;
  tcs_amount: number;
  total_payable: number;
  tcs_note: string | null;
  terms: string | null;
  valid_until: string | null;
  version: number;
};

const KIND_LABELS: Record<string, string> = {
  flight: "Flights",
  hotel: "Stay",
  visa: "Visa",
  forex: "Forex",
  transfer: "Transfers",
  activity: "Activities",
  insurance: "Insurance",
  other: "Other",
};

function longDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function travelWindow(quote: QuotationForText): string | null {
  const start = longDate(quote.travel_start);
  const end = longDate(quote.travel_end);

  // A same-day trip reads as one date, not a range of one. "12 Sept – 12 Sept"
  // looks like a bug to the person receiving it.
  if (start && end) return start === end ? start : `${start} – ${end}`;
  if (start) return start;
  return quote.travel_month;
}

/**
 * Nights, preferring the explicit field but falling back to the dates.
 *
 * An agent who fills in travel dates and leaves `duration_nights` blank should
 * still get "2 nights" on the quotation — leaving it off because one field was
 * skipped is the kind of gap that makes people distrust the generated text and
 * go back to typing it by hand.
 */
function nightCount(quote: QuotationForText): number | null {
  if (quote.duration_nights && quote.duration_nights > 0) {
    return quote.duration_nights;
  }

  if (!quote.travel_start || !quote.travel_end) return null;

  const start = new Date(quote.travel_start);
  const end = new Date(quote.travel_end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return nights > 0 ? nights : null;
}

function paxLine(quote: QuotationForText): string {
  const parts = [
    `${quote.pax_adults} adult${quote.pax_adults === 1 ? "" : "s"}`,
  ];
  if (quote.pax_children > 0) {
    parts.push(
      `${quote.pax_children} child${quote.pax_children === 1 ? "" : "ren"}`,
    );
  }
  return parts.join(", ");
}

export function renderQuotationText(
  quote: QuotationForText,
  lines: QuotationLine[],
  agentName: string,
  brandName = "SkyMiles Travels",
  days: QuotationDay[] = [],
): string {
  const out: string[] = [];

  // ---- Header -------------------------------------------------------------
  out.push(`*${brandName}*`);

  const heading = quote.destination ?? quote.title;
  const nights = nightCount(quote);
  if (heading) {
    // "2 nights / 3 days" is how an Indian traveller reads an itinerary length
    // — and it is the first thing they check against their leave dates.
    const suffix = nights
      ? ` — ${nights} ${nights === 1 ? "night" : "nights"} / ${nights + 1} days`
      : "";
    out.push(`_${heading}${suffix}_`);
  }

  out.push("");

  const window = travelWindow(quote);
  // Duration lives in the heading only. Repeating it here read as clutter on a
  // message that is meant to be scanned in a WhatsApp thread.
  if (window) out.push(`📅  ${window}`);
  out.push(`👥  ${paxLine(quote)}`);

  // ---- Included -----------------------------------------------------------
  const included = lines
    .filter((line) => line.is_included && !line.is_optional)
    .sort((a, b) => a.sort_order - b.sort_order);

  if (included.length > 0) {
    out.push("");
    out.push("*WHAT'S INCLUDED*");

    included.forEach((line, index) => {
      out.push("");
      out.push(`${index + 1}. *${line.title}*`);

      /**
       * Detail before the note. On a hotel line this is what turns
       * "Skon Boutique" into "17 Sept – 19 Sept / 2 nights · 1 room /
       * Breakfast only" — the difference between a price list and a quotation.
       */
      for (const detail of describeMeta(line.kind, line.meta ?? {})) {
        out.push(`    ${detail}`);
      }

      if (line.description) out.push(`    ${line.description}`);

      // Show the per-unit maths only when quantity is more than one, otherwise
      // "1 × ₹1,60,000 = ₹1,60,000" is just noise.
      if (line.qty > 1) {
        const unit = line.unit ? ` ${line.unit}` : "";
        out.push(
          `    ${line.qty}${unit} × ${inr(line.customer_price)} = ${inr(line.line_total)}`,
        );
      } else {
        out.push(`    ${inr(line.line_total)}`);
      }
    });
  }

  // ---- Optional -----------------------------------------------------------
  const optional = lines
    .filter((line) => line.is_optional)
    .sort((a, b) => a.sort_order - b.sort_order);
  if (optional.length > 0) {
    out.push("");
    out.push("*OPTIONAL ADD-ONS*");
    for (const line of optional) {
      out.push("");
      out.push(`•  *${line.title}* — ${inr(line.line_total)}`);

      // Add-ons carry their detail too. A bare "Mount Batur trek — ₹11,500"
      // invites the exact question the quotation is supposed to pre-empt:
      // which day, and what does it include.
      for (const detail of describeMeta(line.kind, line.meta ?? {})) {
        out.push(`    ${detail}`);
      }
      if (line.description) out.push(`    ${line.description}`);
    }
  }

  // ---- Not included -------------------------------------------------------
  const excluded = lines.filter((line) => !line.is_included && !line.is_optional);
  if (excluded.length > 0) {
    out.push("");
    out.push("*NOT INCLUDED*");
    for (const line of excluded) {
      out.push(`•  ${KIND_LABELS[line.kind] ?? line.title}`);
    }
  }

  // ---- Money --------------------------------------------------------------
  // ---- Day by day --------------------------------------------------------
  //
  // Placed after the components and before the price: the customer reads what
  // they get, then how the trip actually unfolds, then what it costs.
  if (days.length > 0) {
    out.push("");
    out.push("*DAY BY DAY*");

    for (const day of days) {
      out.push("");
      const heading = [
        `Day ${day.day_number}`,
        longDate(day.date),
        day.title,
      ].filter(Boolean);
      out.push(`*${heading.join(" · ")}*`);
      if (day.description) out.push(day.description);
    }
  }

  out.push("");
  out.push("──────────────");

  if (quote.discount > 0) {
    out.push(`Subtotal: ${inr(quote.subtotal)}`);
    out.push(`Discount: −${inr(quote.discount)}`);
  }

  out.push(`*Total: ${inr(quote.total)}*`);
  out.push("_Inclusive of GST_");

  if (quote.is_international && quote.tcs_amount > 0) {
    out.push("");
    out.push(`TCS @ ${quote.tcs_rate_percent}%: ${inr(quote.tcs_amount)}`);
    out.push(`*Amount payable: ${inr(quote.total_payable)}*`);
    if (quote.tcs_note) {
      out.push("");
      out.push(`_${quote.tcs_note}_`);
    }
  }

  // ---- Footer -------------------------------------------------------------
  // No expiry line: the agency does not want quotations to read as time-limited.
  // valid_until is still stored, for internal follow-up prompts only.
  if (quote.terms) {
    out.push("");
    out.push(`_${quote.terms}_`);
  }

  out.push("");
  out.push(`— ${agentName}`);
  out.push(brandName);

  return out.join("\n");
}
