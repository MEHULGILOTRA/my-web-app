import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Sorting is done through the URL rather than client state: it survives a
 * refresh, can be linked to a colleague, and keeps the table a Server Component
 * so the sort happens in Postgres instead of on 200 rows in the browser.
 */
export function SortHeader({
  label,
  column,
  currentSort,
  currentDir,
  basePath,
  params,
  align = "left",
}: {
  label: string;
  column: string;
  currentSort: string;
  currentDir: "asc" | "desc";
  basePath: string;
  params: Record<string, string | undefined>;
  align?: "left" | "right";
}) {
  const active = currentSort === column;
  // Clicking the active column flips direction; a new column starts descending,
  // which is what people want for dates and money.
  const nextDir = active && currentDir === "desc" ? "asc" : "desc";

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  search.set("sort", column);
  search.set("dir", nextDir);

  const Icon = !active ? ChevronsUpDown : currentDir === "desc" ? ArrowDown : ArrowUp;

  return (
    <th className={align === "right" ? "text-right" : ""}>
      <Link
        href={`${basePath}?${search.toString()}`}
        scroll={false}
        className={`hover:text-foreground inline-flex items-center gap-1 transition-colors ${
          align === "right" ? "flex-row-reverse" : ""
        } ${active ? "text-foreground font-semibold" : ""}`}
      >
        {label}
        <Icon
          className={`size-3 ${active ? "opacity-100" : "opacity-0 group-hover/head:opacity-40"}`}
        />
      </Link>
    </th>
  );
}

/**
 * The one real anchor in a clickable row. Gives keyboard users a single focus
 * stop and preserves middle-click and open-in-new-tab.
 */
export function RowLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none ${className}`}
    >
      {children}
    </Link>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-[13px] font-medium">{title}</p>
      {hint ? (
        <p className="text-muted-foreground mt-1 max-w-sm text-[12px] leading-relaxed">
          {hint}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/** Skeleton rows, so a slow query looks like loading rather than an empty table. */
export function TableSkeleton({
  rows = 8,
  columns = 6,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="divide-y">
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex items-center gap-4 px-3 py-2.5">
          {Array.from({ length: columns }, (_, column) => (
            <div
              key={column}
              className="bg-muted h-3 animate-pulse rounded"
              style={{
                width: `${[18, 22, 26, 14, 10, 10][column % 6]}%`,
                animationDelay: `${row * 40}ms`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
