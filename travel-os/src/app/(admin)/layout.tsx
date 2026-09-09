import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { Toaster } from "@/components/ui/sonner";
import { signOut } from "@/app/(auth)/login/actions";
import { requireStaff } from "@/lib/auth/session";

/**
 * Internal Travel OS shell.
 *
 * Desktop-first and deliberately dense — the governing principle for admin
 * screens is maximum rows visible without scrolling.
 *
 * requireStaff() runs here as well as in proxy.ts. The proxy handles the
 * redirect; this is the guarantee.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const staff = await requireStaff();

  return (
    <>
      <AdminShell
        staffName={staff.full_name}
        staffEmail={staff.email}
        signOut={signOut}
      >
        {children}
      </AdminShell>
      <Toaster position="bottom-right" />
    </>
  );
}
