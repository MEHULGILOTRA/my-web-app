"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import {
  addQuotationItem,
  type ItemState,
} from "@/app/(admin)/quotations/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const KINDS = [
  ["hotel", "Hotel"],
  ["flight", "Flight"],
  ["transfer", "Transfer"],
  ["activity", "Activity"],
  ["visa", "Visa"],
  ["insurance", "Insurance"],
  ["forex", "Forex"],
  ["other", "Other"],
] as const;

const field = cn(
  "border-input bg-background h-8 rounded-md border px-2 text-[12px]",
  "focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px] focus-visible:outline-none",
);

export function QuotationItemForm({ quotationId }: { quotationId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ItemState, FormData>(
    addQuotationItem,
    {},
  );

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state.ok, router]);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state.error]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="bg-muted/40 grid grid-cols-2 gap-2 rounded-lg border p-2.5 md:grid-cols-12"
    >
      <input type="hidden" name="quotation_id" value={quotationId} />

      <select name="kind" defaultValue="hotel" className={cn(field, "col-span-2 md:col-span-2")}>
        {KINDS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <input
        name="title"
        required
        placeholder="Line item"
        className={cn(field, "col-span-2 md:col-span-3")}
      />
      <input
        name="description"
        placeholder="Detail (optional)"
        className={cn(field, "col-span-2 md:col-span-3")}
      />
      <input
        name="qty"
        type="number"
        min="0.01"
        step="0.01"
        defaultValue={1}
        aria-label="Quantity"
        className={cn(field, "col-span-1 text-right md:col-span-1")}
      />
      <input
        name="customer_price"
        type="number"
        min="0"
        step="0.01"
        placeholder="Price"
        aria-label="Customer price"
        className={cn(field, "col-span-1 text-right md:col-span-1")}
      />
      <input
        name="est_supplier_cost"
        type="number"
        min="0"
        step="0.01"
        placeholder="Cost"
        aria-label="Supplier cost"
        title="Internal only — never shown to the customer"
        className={cn(field, "col-span-1 text-right md:col-span-1")}
      />

      <Button
        type="submit"
        size="sm"
        disabled={pending}
        className="col-span-2 h-8 text-[12px] md:col-span-1 md:px-0"
      >
        <Plus className="size-3.5" />
      </Button>

      <label className="text-muted-foreground col-span-2 flex items-center gap-1.5 text-[11px] md:col-span-12">
        <input type="checkbox" name="is_optional" className="accent-primary size-3" />
        Optional add-on — listed separately, not counted in the total
      </label>
    </form>
  );
}
