import type { ReactNode } from "react";

/** Unauthenticated screens. No sidebar, no data access. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="bg-brand-cream flex min-h-full flex-col">{children}</div>;
}
