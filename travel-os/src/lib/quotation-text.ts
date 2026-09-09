import { inr } from "@/lib/format";

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

  if (start && end) return `${start} – ${end}`;
  if (start) return start;
  return quote.travel_month;
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
): string {
  const out: string[] = [];

  // ---- Header -------------------------------------------------------------
  out.push(`*${brandName}*`);

  const heading = quote.destination ?? quote.title;
  if (heading) {
    const nights = quote.duration_nights
      ? ` — ${quote.duration_nights} ${quote.duration_nights === 1 ? "night" : "nights"}`
      : "";
    out.push(`_${heading}${nights}_`);
  }

  out.push("");

  const window = travelWindow(quote);
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
  const optional = lines.filter((line) => line.is_optional);
  if (optional.length > 0) {
    out.push("");
    out.push("*OPTIONAL ADD-ONS*");
    for (const line of optional) {
      out.push(`•  ${line.title} — ${inr(line.line_total)}`);
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
