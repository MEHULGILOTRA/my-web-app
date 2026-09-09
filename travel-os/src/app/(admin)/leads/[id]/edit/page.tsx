import Link from "next/link";
import { notFound } from "next/navigation";

import { LeadForm } from "@/components/admin/lead-form";
import type {
  CustomerFormData,
  LeadFormData,
} from "@/lib/lead-form-data";
import { requireStaff } from "@/lib/auth/session";
import { createStaffClient } from "@/lib/db/admin";
import { getGroupedOptions } from "@/lib/options";

export default async function EditLeadPage(
  props: PageProps<"/leads/[id]/edit">,
) {
  await requireStaff();
  const { id } = await props.params;
  const supabase = await createStaffClient();

  const [{ data: lead }, options, { data: staff }] = await Promise.all([
    supabase
      .from("leads")
      .select(
        `id, reference, lead_date, destination, is_international, origin_city,
         travel_start, duration_nights, travel_month, pax_adults, pax_children,
         children_ages, travel_theme, hotel_category, meal_plan,
         dietary_preference, room_configuration, preferred_airline,
         flights_status, visa_status, transfers_status, insurance_status,
         forex_status, activities_status, budget_min, budget_max, source,
         priority, next_followup_date, owner_staff_id, special_occasion,
         special_notes,
         customers:primary_customer_id(
           full_name, phone_e164, phone_raw, email, city, customer_type
         )`,
      )
      .eq("id", id)
      .maybeSingle(),
    getGroupedOptions(),
    supabase
      .from("staff_users")
      .select("id, full_name")
      .eq("is_active", true)
      .order("full_name"),
  ]);

  if (!lead) notFound();

  const customer = lead.customers as unknown as CustomerFormData | null;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b px-5 py-3">
        <Link
          href={`/leads/${id}`}
          className="text-muted-foreground hover:text-foreground text-[12px]"
        >
          ← Back
        </Link>
        <h1 className="text-sm font-semibold">Edit lead</h1>
        <span className="text-muted-foreground font-mono text-[11px]">
          {lead.reference}
        </span>
      </header>

      <LeadForm
        mode="edit"
        lead={lead as unknown as LeadFormData}
        customer={
          customer ?? {
            full_name: "",
            phone_e164: null,
            phone_raw: null,
            email: null,
            city: null,
            customer_type: "new",
          }
        }
        options={options}
        staff={staff ?? []}
      />
    </div>
  );
}
