import { ChevronRight, Search } from "lucide-react";

import { ClickableRow } from "@/components/admin/data-table";
import { EmptyState, RowLink } from "@/components/admin/table-parts";

import { requireStaff } from "@/lib/auth/session";
import { createStaffClient } from "@/lib/db/admin";
import { shortDate } from "@/lib/format";
import { getOptionLabels, optionLabel } from "@/lib/options";

type Row = {
  id: string;
  full_name: string;
  phone_e164: string | null;
  email: string | null;
  city: string | null;
  customer_type: string;
  lifecycle_stage: string;
  created_at: string;
};

export default async function CustomersPage(props: PageProps<"/customers">) {
  await requireStaff();
  const params = await props.searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";

  const supabase = await createStaffClient();
  const labels = await getOptionLabels();

  let request = supabase
    .from("customers")
    .select(
      "id, full_name, phone_e164, email, city, customer_type, lifecycle_stage, created_at",
    )
    .is("merged_into_customer_id", null)
    .order("created_at", { ascending: false })
    .limit(200);

  if (query) {
    // Name uses the trigram index; phone and email are exact-ish fallbacks so a
    // pasted number finds the person even when the name is spelt differently.
    request = request.or(
      `full_name.ilike.%${query}%,phone_e164.ilike.%${query}%,email.ilike.%${query}%`,
    );
  }

  const { data, error } = await request;
  const customers = (data ?? []) as Row[];

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-3 md:px-5">
        <h1 className="text-sm font-semibold">Customers</h1>
        <span className="text-muted-foreground bg-muted rounded-full px-2 py-0.5 text-[11px] tabular-nums">
          {customers.length}
          {customers.length === 200 ? "+" : ""}
        </span>

        <form className="relative ml-auto" action="/customers">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Name, phone or email…"
            className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/40 h-7 w-60 rounded-md border pr-2.5 pl-7 text-[12px] focus-visible:ring-[3px] focus-visible:outline-none"
          />
        </form>
      </header>

      {error ? (
        <p className="text-destructive px-5 py-6 text-[13px]">{error.message}</p>
      ) : customers.length === 0 ? (
        <EmptyState
          title={query ? `Nothing matching “${query}”` : "No customers yet"}
          hint={
            query
              ? "Search matches name, phone number and email."
              : "Customers are created automatically when you add a lead."
          }
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead className="bg-muted/70 text-muted-foreground sticky top-0 z-10 backdrop-blur">
              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:font-medium">
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>City</th>
                <th>Type</th>
                <th>Added</th>
                <th className="w-6" />
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <ClickableRow
                  key={customer.id}
                  href={`/customers/${customer.id}`}
                  className="[&>td]:px-3 [&>td]:py-2"
                >
                  <td className="font-medium">
                    <RowLink href={`/customers/${customer.id}`}>
                      {customer.full_name}
                    </RowLink>
                  </td>
                  <td className="text-muted-foreground font-mono text-[12px] whitespace-nowrap">
                    {customer.phone_e164 ?? "—"}
                  </td>
                  <td className="text-muted-foreground max-w-[220px] truncate">
                    {customer.email ?? "—"}
                  </td>
                  <td className="text-muted-foreground">
                    {customer.city ?? "—"}
                  </td>
                  <td className="text-muted-foreground">
                    {optionLabel(labels, "customer_type", customer.customer_type)}
                  </td>
                  <td className="text-muted-foreground whitespace-nowrap">
                    {shortDate(customer.created_at)}
                  </td>
                  <td className="w-6 pr-2">
                    <ChevronRight className="text-muted-foreground size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                  </td>
                </ClickableRow>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
