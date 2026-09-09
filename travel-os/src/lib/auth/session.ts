import "server-only";

import { redirect } from "next/navigation";

import { createStaffClient } from "@/lib/db/admin";

export type Staff = {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "manager" | "agent" | "accounts";
  is_active: boolean;
};

/**
 * The signed-in staff member, or null.
 *
 * Always resolved through `auth.getUser()`, which revalidates the token against
 * Supabase. `getSession()` merely decodes a cookie the client could have
 * tampered with, so it is never used for an access decision.
 */
export async function getStaff(): Promise<Staff | null> {
  const supabase = await createStaffClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("staff_users")
    .select("id, full_name, email, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!data || !data.is_active) return null;
  return data as Staff;
}

/**
 * Guard for pages and server actions.
 *
 * proxy.ts already redirects signed-out visitors, but the Next docs warn that a
 * matcher change or moving a Server Function to a different route can silently
 * drop proxy coverage. Every entry point calls this too.
 */
export async function requireStaff(): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect("/login");
  return staff;
}

/**
 * Margin visibility.
 *
 * Admin only, by decision — there is one admin today. The role column exists so
 * that granting agents access later is a change here rather than a schema
 * migration.
 */
export function canSeeMargin(staff: Staff): boolean {
  return staff.role === "admin";
}
