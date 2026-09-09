import Link from "next/link";
import { Columns3, Plus, Search, Table2 } from "lucide-react";

import { SAVED_VIEWS } from "@/lib/leads/lead-record";
import { cn } from "@/lib/utils";

type Params = Record<string, string | undefined>;

function href(base: Params, overrides: Params) {
  const merged = { ...base, ...overrides };
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    // `lead` is intentionally dropped: changing a view should close the drawer
    // rather than leave an unrelated record open beside a new filter.
    if (value && key !== "lead") search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `/leads?${qs}` : "/leads";
}

export function LeadsToolbar({
  params,
  total,
  layout,
}: {
  params: Params;
  total: number;
  layout: "table" | "board";
}) {
  const activeView = params.view ?? "all";

  return (
    <>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-3 md:px-5">
        <h1 className="text-sm font-semibold">Leads</h1>
        <span className="text-muted-foreground bg-muted rounded-full px-2 py-0.5 text-[11px] tabular-nums">
          {total}
        </span>

        <form action="/leads" className="relative ml-auto">
          {activeView !== "all" ? (
            <input type="hidden" name="view" value={activeView} />
          ) : null}
          {layout === "board" ? (
            <input type="hidden" name="layout" value="board" />
          ) : null}
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Destination or reference…"
            aria-label="Search leads"
            className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/40 h-7 w-48 rounded-md border pr-2.5 pl-7 text-[12px] focus-visible:ring-[3px] focus-visible:outline-none sm:w-56"
          />
        </form>

        {/* Table for scanning many, board for moving a few. */}
        <div className="flex items-center rounded-md border p-0.5" role="group" aria-label="View layout">
          <Link
            href={href(params, { layout: undefined })}
            aria-current={layout === "table" ? "true" : undefined}
            title="Table"
            className={cn(
              "rounded p-1 transition-colors",
              layout === "table"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            <Table2 className="size-3.5" />
          </Link>
          <Link
            href={href(params, { layout: "board" })}
            aria-current={layout === "board" ? "true" : undefined}
            title="Pipeline board"
            className={cn(
              "rounded p-1 transition-colors",
              layout === "board"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            <Columns3 className="size-3.5" />
          </Link>
        </div>

        <Link
          href="/leads/new"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition-colors"
        >
          <Plus className="size-3.5" />
          <span className="hidden sm:inline">New lead</span>
        </Link>
      </header>

      {/* Saved views are URL presets, not stored records — shareable, and free
          to maintain. User-authored views need a table; nobody has asked yet. */}
      <nav
        aria-label="Saved views"
        className="flex items-center gap-1 overflow-x-auto border-b px-4 py-2 md:px-5"
      >
        {SAVED_VIEWS.map((view) => {
          const active = activeView === view.key;
          return (
            <Link
              key={view.key}
              href={href(params, {
                view: view.key === "all" ? undefined : view.key,
                stage: undefined,
              })}
              title={view.description}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-md px-2 py-1 text-[12px] transition-colors",
                active
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {view.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
