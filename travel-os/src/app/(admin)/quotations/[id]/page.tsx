import Link from "next/link";
import { notFound } from "next/navigation";

import { QuotationItemForm } from "@/components/admin/quotation-item-form";
import { QuotationToolbar } from "@/components/admin/quotation-toolbar";
import { canSeeMargin, requireStaff } from "@/lib/auth/session";
import { createStaffClient } from "@/lib/db/admin";
import { inr, shortDate } from "@/lib/format";
import { loadQuotationForText } from "@/lib/quotation-data";
import { renderQuotationText } from "@/lib/quotation-text";

export default async function QuotationPage(props: PageProps<"/quotations/[id]">) {
  const staff = await requireStaff();
  const { id } = await props.params;
  const supabase = await createStaffClient();

  const payload = await loadQuotationForText(supabase, id);
  if (!payload) notFound();

  const { quote, lines } = payload;
  const isDraft = quote.status === "draft";
  const showMargin = canSeeMargin(staff);

  const whatsappText = renderQuotationText(quote, lines, staff.full_name);

  const cost = lines
    .filter((line) => line.is_included && !line.is_optional)
    .reduce((sum, line) => sum + line.est_supplier_cost * line.qty, 0);
  const margin = quote.total - cost;
  const marginPct = quote.total > 0 ? (margin / quote.total) * 100 : 0;

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-3 md:px-5">
        <Link
          href={`/leads/${quote.lead_id}`}
          className="text-muted-foreground hover:text-foreground text-[12px]"
        >
          ← Lead
        </Link>
        <h1 className="text-sm font-semibold">
          {quote.customer_name ?? "Quotation"}
        </h1>
        <span className="bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 text-[11px] font-medium">
          V{quote.version}
        </span>
        <span className="text-muted-foreground text-[12px] capitalize">
          {quote.status}
        </span>
        <span className="text-muted-foreground font-mono text-[11px]">
          {quote.reference}
        </span>

        <div className="ml-auto">
          <QuotationToolbar
            quotationId={quote.id}
            status={quote.status}
            whatsappText={whatsappText}
          />
        </div>
      </header>

      {!isDraft ? (
        <p className="bg-brand-sand/50 border-b px-5 py-2 text-[12px]">
          This version was sent on {shortDate(quote.sent_at)} and is frozen.
          Create a revision to change anything — the customer&apos;s link must
          keep showing what they were actually offered.
        </p>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-0 overflow-auto lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* Builder */}
        <section className="min-w-0 space-y-3 p-4">
          {lines.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-[13px]">
              No line items yet. Add the hotel, flights and transfers below.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[560px] text-left text-[13px]">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr className="[&>th]:px-3 [&>th]:py-1.5 [&>th]:font-medium">
                    <th>Type</th>
                    <th>Item</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Price</th>
                    {showMargin ? <th className="text-right">Cost</th> : null}
                    <th className="text-right">Total</th>
                    {showMargin ? <th className="text-right">Margin</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => {
                    const lineCost = line.est_supplier_cost * line.qty;
                    const lineMargin = line.line_total - lineCost;
                    return (
                      <tr
                        key={line.id}
                        className="border-t [&>td]:px-3 [&>td]:py-1.5"
                      >
                        <td className="text-muted-foreground capitalize">
                          {line.kind}
                        </td>
                        <td>
                          <p className="font-medium">
                            {line.title}
                            {line.is_optional ? (
                              <span className="text-muted-foreground ml-1.5 text-[10px]">
                                OPTIONAL
                              </span>
                            ) : null}
                          </p>
                          {line.description ? (
                            <p className="text-muted-foreground text-[11px]">
                              {line.description}
                            </p>
                          ) : null}
                        </td>
                        <td className="text-right tabular-nums">{line.qty}</td>
                        <td className="text-right tabular-nums">
                          {inr(line.customer_price)}
                        </td>
                        {showMargin ? (
                          <td className="text-muted-foreground text-right tabular-nums">
                            {inr(lineCost)}
                          </td>
                        ) : null}
                        <td className="text-right font-medium tabular-nums">
                          {inr(line.line_total)}
                        </td>
                        {showMargin ? (
                          <td
                            className="text-right tabular-nums"
                            style={{
                              color:
                                lineMargin >= 0
                                  ? "var(--color-state-paid)"
                                  : "var(--color-state-overdue)",
                            }}
                          >
                            {inr(lineMargin)}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {isDraft ? <QuotationItemForm quotationId={quote.id} /> : null}

          {/* Money */}
          <div className="ml-auto w-full max-w-xs space-y-1 pt-2 text-[13px]">
            <Row label="Subtotal" value={inr(quote.subtotal)} />
            {quote.discount > 0 ? (
              <Row label="Discount" value={`−${inr(quote.discount)}`} />
            ) : null}
            <Row label="Total" value={inr(quote.total)} strong />
            <p className="text-muted-foreground text-right text-[11px]">
              Inclusive of GST
            </p>

            {quote.is_international && quote.tcs_amount > 0 ? (
              <>
                <Row
                  label={`TCS @ ${quote.tcs_rate_percent}%`}
                  value={inr(quote.tcs_amount)}
                />
                <Row
                  label="Amount payable"
                  value={inr(quote.total_payable)}
                  strong
                />
              </>
            ) : null}

            {showMargin ? (
              <div className="mt-2 space-y-1 border-t pt-2">
                <Row label="Supplier cost" value={inr(cost)} muted />
                <Row
                  label={`Margin (${marginPct.toFixed(1)}%)`}
                  value={inr(margin)}
                  strong
                />
                <p className="text-muted-foreground text-right text-[10px]">
                  Internal only — never leaves the server
                </p>
              </div>
            ) : null}
          </div>
        </section>

        {/* WhatsApp preview */}
        <aside className="bg-muted/30 border-t p-4 lg:border-t-0 lg:border-l">
          <h2 className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wide uppercase">
            WhatsApp message
          </h2>
          <pre className="bg-background overflow-x-auto rounded-lg border p-3 font-sans text-[12px] leading-relaxed whitespace-pre-wrap">
            {whatsappText}
          </pre>
          <p className="text-muted-foreground mt-2 text-[11px]">
            {"*bold*"} and {"_italic_"} render as formatting in WhatsApp.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 ${muted ? "text-muted-foreground" : ""}`}
    >
      <span className={strong ? "font-semibold" : ""}>{label}</span>
      <span className={`tabular-nums ${strong ? "font-semibold" : ""}`}>
        {value}
      </span>
    </div>
  );
}
