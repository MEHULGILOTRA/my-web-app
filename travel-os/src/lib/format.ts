/** Indian numbering: ₹2,60,000 rather than ₹260,000. */
export function inr(amount: number | string | null | undefined): string {
  const value = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

/** Compact form for dense tables: ₹2.6L, ₹1.2Cr. */
export function inrCompact(amount: number | string | null | undefined): string {
  const value = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  if (!Number.isFinite(value) || value === 0) return "—";
  if (Math.abs(value) >= 1e7) return `₹${(value / 1e7).toFixed(2)}Cr`;
  if (Math.abs(value) >= 1e5) return `₹${(value / 1e5).toFixed(2)}L`;
  return inr(value);
}

export function shortDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** "in 3 days" / "2 days ago" — for follow-up urgency. */
export function relativeDays(value: string | null | undefined): {
  label: string;
  overdue: boolean;
} {
  if (!value) return { label: "—", overdue: false };

  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return { label: "—", overdue: false };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (days === 0) return { label: "Today", overdue: true };
  if (days === 1) return { label: "Tomorrow", overdue: false };
  if (days === -1) return { label: "Yesterday", overdue: true };
  if (days < 0) return { label: `${Math.abs(days)} days ago`, overdue: true };
  return { label: `in ${days} days`, overdue: false };
}
