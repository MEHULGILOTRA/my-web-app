import Link from "next/link";

import { LeadForm } from "@/components/admin/lead-form";
import { emptyCustomer, emptyLead } from "@/lib/lead-form-data";
import { requireStaff } from "@/lib/auth/session";
import { createStaffClient } from "@/lib/db/admin";
import { getGroupedOptions } from "@/lib/options";

/**
 * Full lead creation, with every field the edit form has — all optional except
 * name and contact number.
 *
 * The quick-add dialog still exists for the common case where an enquiry
 * arrives mid-conversation and speed matters more than completeness. Both write
 * through the same code path.
 */
export default async function NewLeadPage() {
  const staff = await requireStaff();
  const supabase = await createStaffClient();

  const [options, { data: team }] = await Promise.all([
    getGroupedOptions(),
    supabase
      .from("staff_users")
      .select("id, full_name")
      .eq("is_active", true)
      .order("full_name"),
  ]);

  const lead = emptyLead();
  // Whoever is creating it owns it until reassigned.
  lead.owner_staff_id = staff.id;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b px-5 py-3">
        <Link
          href="/leads"
          className="text-muted-foreground hover:text-foreground text-[12px]"
        >
          ← Leads
        </Link>
        <h1 className="text-sm font-semibold">New lead</h1>
        <span className="text-muted-foreground text-[12px]">
          Reference is assigned automatically
        </span>
      </header>

      <LeadForm
        mode="create"
        lead={lead}
        customer={emptyCustomer()}
        options={options}
        staff={team ?? []}
      />
    </div>
  );
}
