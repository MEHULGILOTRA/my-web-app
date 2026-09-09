/** Matches the dashboard layout so the page does not jump when data lands. */
export default function Loading() {
  return (
    <div className="p-5">
      <div className="mb-5">
        <div className="bg-muted h-5 w-56 animate-pulse rounded" />
        <div className="bg-muted mt-2 h-3 w-40 animate-pulse rounded" />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="rounded-lg border px-3 py-2.5">
            <div className="bg-muted h-2.5 w-16 animate-pulse rounded" />
            <div className="bg-muted mt-2 h-6 w-8 animate-pulse rounded" />
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, panel) => (
          <div key={panel} className="overflow-hidden rounded-lg border">
            <div className="bg-muted/60 border-b px-3 py-2">
              <div className="bg-muted h-3 w-28 animate-pulse rounded" />
            </div>
            <div className="divide-y">
              {Array.from({ length: 5 }, (_, row) => (
                <div key={row} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="bg-muted size-1.5 animate-pulse rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <div className="bg-muted h-3 w-32 animate-pulse rounded" />
                    <div className="bg-muted h-2 w-44 animate-pulse rounded" />
                  </div>
                  <div className="bg-muted h-3 w-12 animate-pulse rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
