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
export default async function NewLeadPage(props: PageProps<"/leads/new">) {
  const staff = await requireStaff();
  const supabase = await createStaffClient();

  /**
   * Quick-add hands over whatever was already typed as query parameters, so
   * switching to the full form never costs the agent their work. Values are
   * treated as untrusted: each is validated the same way the form's own inputs
   * are, and anything unrecognised is simply ignored.
   */
  const params = await props.searchParams;
  const text = (key: string) => {
    const value = params[key];
    const single = Array.isArray(value) ? value[0] : value;
    return typeof single === "string" && single.trim() ? single.trim() : null;
  };
  const count = (key: string, fallback: number) => {
    const parsed = Number(text(key));
    return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : fallback;
  };

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

  lead.destination = text("destination");
  lead.travel_month = text("travel_month");
  lead.pax_adults = count("pax_adults", lead.pax_adults);
  lead.pax_children = count("pax_children", lead.pax_children);
  lead.is_international = text("is_international") === "on";
  if (text("source")) lead.source = text("source")!;
  if (text("priority")) lead.priority = text("priority")!;

  const customer = emptyCustomer();
  customer.full_name = text("full_name") ?? customer.full_name;
  customer.phone_raw = text("phone");

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
        customer={customer}
        options={options}
        staff={team ?? []}
      />
    </div>
  );
}
