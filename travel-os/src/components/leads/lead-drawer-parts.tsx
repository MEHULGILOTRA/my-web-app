"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AlertCircle, Check, Circle, Minus } from "lucide-react";

import { FULFILMENT_STYLE, fulfilmentLines, marginHealth } from "@/lib/leads/fulfilment";
import type { FulfilmentState, LeadRecord } from "@/lib/leads/lead-record";
import { inr, shortDate } from "@/lib/format";

/* ------------------------------------------------------------------ shared */

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Field({
  label,
  value,
  href,
}: {
  label: string;
  value?: string | number | null;
  href?: string;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex gap-3 py-[3px] text-[12px]">
      <dt className="text-muted-foreground w-[86px] shrink-0">{label}</dt>
      <dd className="min-w-0 flex-1 break-words">
        {href ? (
          <a
            href={href}
            className="hover:text-primary underline-offset-2 hover:underline"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

/* -------------------------------------------------------------- fulfilment */

function StateIcon({ state }: { state: FulfilmentState }) {
  const style = FULFILMENT_STYLE[state];
  const common = { className: "size-3.5 shrink-0", style: { color: style.dot } };

  if (state === "confirmed") return <Check {...common} />;
  if (state === "issue") return <AlertCircle {...common} />;
  if (state === "not_required") return <Minus {...common} />;
  return <Circle {...common} />;
}

export function FulfilmentChecklist({
  lead,
  labelFor,
}: {
  lead: LeadRecord;
  labelFor: (setKey: string, value: string | null) => string | null;
}) {
  const lines = fulfilmentLines(lead);

  return (
    <ul className="space-y-0.5">
      {lines.map((line) => {
        const style = FULFILMENT_STYLE[line.state];
        const detail =
          line.key === "hotel"
            ? labelFor("hotel_category", lead.hotel_category)
            : labelFor(line.key, line.raw);

        return (
          <li
            key={line.key}
            className="flex items-center gap-2.5 rounded px-1 py-1 text-[12px]"
          >
            <StateIcon state={line.state} />
            <span className="w-[72px] shrink-0 font-medium">{line.label}</span>
            <span className="text-muted-foreground min-w-0 flex-1 truncate">
              {detail ?? style.label}
            </span>
            <span
              className="shrink-0 text-[10px] font-medium"
              style={{ color: style.color }}
            >
              {style.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------- money */

export function MarginBlock({ lead }: { lead: LeadRecord }) {
  const health = marginHealth(lead.margin_percent);
  const hasMargin =
    lead.gross_margin_inr !== null && lead.gross_margin_inr !== undefined;

  return (
    <div className="rounded-lg border">
      <div className="grid grid-cols-2 divide-x">
        <div className="p-3">
          <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
            Gross margin
          </p>
          <p
            className="mt-0.5 text-lg font-semibold tabular-nums"
            style={{ color: hasMargin ? health.color : undefined }}
          >
            {hasMargin ? inr(lead.gross_margin_inr) : "—"}
          </p>
        </div>
        <div className="p-3">
          <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
            Margin
          </p>
          <p
            className="mt-0.5 text-lg font-semibold tabular-nums"
            style={{ color: hasMargin ? health.color : undefined }}
          >
            {lead.margin_percent !== null && lead.margin_percent !== undefined
              ? `${lead.margin_percent.toFixed(1)}%`
              : "—"}
          </p>
          {hasMargin ? (
            <p className="text-[10px]" style={{ color: health.color }}>
              {health.label}
            </p>
          ) : null}
        </div>
      </div>

      <dl className="border-t px-3 py-2">
        <MoneyRow label="Client budget" value={lead.client_budget_inr} />
        <MoneyRow label="Supplier cost" value={lead.net_supplier_cost_inr} muted />
        <MoneyRow label="Gross quote" value={lead.gross_quote_inr} />
        {lead.trip_type === "International" && lead.tcs_amount_inr ? (
          <MoneyRow
            label={`TCS @ ${lead.tcs_rate_percent}%`}
            value={lead.tcs_amount_inr}
            muted
          />
        ) : null}
        <MoneyRow label="Total payable" value={lead.total_payable_inr} strong />
      </dl>
    </div>
  );
}

function MoneyRow({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: number | null | undefined;
  strong?: boolean;
  muted?: boolean;
}) {
  if (value === null || value === undefined) return null;
  return (
    <div
      className={`flex justify-between gap-4 py-[3px] text-[12px] ${
        muted ? "text-muted-foreground" : ""
      }`}
    >
      <dt className={strong ? "font-semibold" : ""}>{label}</dt>
      <dd className={`tabular-nums ${strong ? "font-semibold" : ""}`}>
        {inr(value)}
      </dd>
    </div>
  );
}

/* ------------------------------------------------------------- next action */

export function NextActionBlock({ lead }: { lead: LeadRecord }) {
  const due = lead.next_action_at ?? lead.next_followup_date;
  const overdue = due ? new Date(due) < new Date(new Date().toDateString()) : false;
  const label = lead.next_action ?? "No action set";

  return (
    <div
      className="rounded-lg border-l-2 px-3 py-2.5"
      style={{
        borderLeftColor: overdue
          ? "var(--color-state-overdue)"
          : "var(--color-brand-indigo)",
        backgroundColor: overdue
          ? "color-mix(in srgb, var(--color-state-overdue) 6%, transparent)"
          : "var(--color-muted)",
      }}
    >
      <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
        Next action
      </p>
      <p className="mt-0.5 text-[13px] font-medium">{label}</p>
      {due ? (
        <p
          className="mt-0.5 text-[11px]"
          style={{ color: overdue ? "var(--color-state-overdue)" : undefined }}
        >
          {overdue ? "Overdue · " : ""}
          {shortDate(due)}
          {lead.assigned_agent ? ` · ${lead.assigned_agent}` : ""}
        </p>
      ) : (
        <p className="text-muted-foreground mt-0.5 text-[11px]">
          Set one so this lead does not go quiet.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- quotations */

export type QuoteRow = {
  id: string;
  version: number;
  status: string;
  total: number;
  total_payable: number | null;
  sent_at: string | null;
};

export function QuoteHistory({ quotes }: { quotes: QuoteRow[] }) {
  if (quotes.length === 0) {
    return (
      <p className="text-muted-foreground text-[12px]">
        No quotations yet.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {quotes.map((quote, index) => {
        // Difference from the version below it — the number a consultant
        // actually wants when a customer says "you changed the price".
        const previous = quotes[index + 1];
        const delta = previous ? quote.total - previous.total : null;

        return (
          <li key={quote.id}>
            <Link
              href={`/quotations/${quote.id}`}
              className="hover:border-primary/40 flex items-center gap-3 rounded-md border px-2.5 py-2 text-[12px]"
            >
              <span className="bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 text-[10px] font-semibold">
                V{quote.version}
              </span>
              <span className="text-muted-foreground w-[68px] shrink-0 capitalize">
                {quote.status}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium tabular-nums">
                {inr(quote.total_payable ?? quote.total)}
              </span>
              {delta !== null && delta !== 0 ? (
                <span
                  className="shrink-0 text-[11px] tabular-nums"
                  style={{
                    color:
                      delta < 0
                        ? "var(--color-state-overdue)"
                        : "var(--color-state-paid)",
                  }}
                >
                  {delta > 0 ? "+" : "−"}
                  {inr(Math.abs(delta))}
                </span>
              ) : null}
              <span className="text-muted-foreground shrink-0 text-[10px]">
                {quote.sent_at ? shortDate(quote.sent_at) : "draft"}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
