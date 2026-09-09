import { TableSkeleton } from "@/components/admin/table-parts";

/**
 * Shown while the server component fetches. Without it a navigation looks
 * frozen until the query returns, which reads as the app being slow.
 */
export default function Loading() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-5 py-3">
        <div className="bg-muted h-4 w-20 animate-pulse rounded" />
        <div className="bg-muted h-4 w-8 animate-pulse rounded-full" />
        <div className="bg-muted ml-auto h-7 w-56 animate-pulse rounded-md" />
      </div>
      <div className="flex gap-1 border-b px-5 py-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="bg-muted h-6 w-20 animate-pulse rounded-md" />
        ))}
      </div>
      <TableSkeleton rows={10} columns={6} />
    </div>
  );
}
