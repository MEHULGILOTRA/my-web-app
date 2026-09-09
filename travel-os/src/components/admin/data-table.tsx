"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

/**
 * A table row that behaves like a link.
 *
 * Wrapping a <tr> in an <a> is invalid HTML, and putting a link in every cell
 * gives keyboard users nine tab stops per row. So the row handles pointer and
 * keyboard activation itself, and exactly one cell carries a real anchor (see
 * RowLink) for focus, middle-click and open-in-new-tab.
 */
export function ClickableRow({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const router = useRouter();

  return (
    <tr
      onClick={(event) => {
        // Let genuine interactions inside the row win.
        const target = event.target as HTMLElement;
        if (target.closest("a, button, input, select, textarea, label")) return;
        // Ctrl/Cmd-click opens a new tab, as it would on a link.
        if (event.metaKey || event.ctrlKey) {
          window.open(href, "_blank", "noopener,noreferrer");
          return;
        }
        router.push(href);
      }}
      className={`hover:bg-accent/60 group cursor-pointer border-t transition-colors ${className}`}
    >
      {children}
    </tr>
  );
}
