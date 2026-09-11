"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import {
  addQuotationItem,
  type ItemState,
} from "@/app/(admin)/quotations/actions";
import { Button } from "@/components/ui/button";
import {
  forexTotal,
  PRICE_DERIVED_KINDS,
  visibleFields,
  type MetaField,
} from "@/lib/quotations/line-item-kinds";
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
  "border-input bg-background h-8 w-full rounded-md border px-2 text-[12px]",
  "focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px] focus-visible:outline-none",
);

const SPAN: Record<number, string> = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  3: "md:col-span-3",
  4: "md:col-span-4",
};

/** Labelled input. An unlabelled box is the reason nobody knew what "qty" was. */
function Labelled({
  label,
  span = 2,
  title,
  children,
}: {
  label: string;
  span?: number;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn("col-span-1", SPAN[span] ?? "md:col-span-2")}
      title={title}
    >
      <span className="text-muted-foreground block text-[10px] leading-none">
        {label}
      </span>
      <div className="mt-0.5">{children}</div>
    </label>
  );
}

function MetaInput({
  spec,
  value,
  onChange,
}: {
  spec: MetaField;
  value: string;
  onChange: (value: string) => void;
}) {
  const name = `meta_${spec.name}`;

  if (spec.type === "select") {
    return (
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={field}
      >
        <option value="">—</option>
        {spec.options?.map(([optionValue, label]) => (
          <option key={optionValue} value={optionValue}>
            {label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      name={name}
      type={spec.type === "number" ? "number" : spec.type}
      step={spec.type === "number" ? "any" : undefined}
      min={spec.type === "number" ? "0" : undefined}
      placeholder={spec.placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={field}
    />
  );
}

export function QuotationItemForm({ quotationId }: { quotationId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [kind, setKind] = useState<string>("hotel");
  const [meta, setMeta] = useState<Record<string, string>>({});

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

  const specs = visibleFields(kind, meta);
  // Forex prices itself from amount x rate, so the generic boxes would only
  // be a second, disagreeing source of truth.
  const derivesPrice = PRICE_DERIVED_KINDS.has(kind);

  /**
   * The forex converter. Recomputed on render rather than stored, so the agent
   * cannot end up looking at a total that belongs to an older rate.
   */
  const converted = kind === "forex" ? forexTotal(meta) : null;

  function updateMeta(name: string, value: string) {
    setMeta((current) => ({ ...current, [name]: value }));
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="bg-muted/40 grid grid-cols-2 gap-2 rounded-lg border p-2.5 md:grid-cols-12"
    >
      <input type="hidden" name="quotation_id" value={quotationId} />

      <Labelled label="Type" span={2}>
        <select
          name="kind"
          value={kind}
          onChange={(event) => {
            setKind(event.target.value);
            // Detail fields belong to the kind that declared them. Carrying a
            // hotel's meal plan onto a flight would quietly print nonsense on
            // the customer's quotation.
            setMeta({});
          }}
          className={field}
        >
          {KINDS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Labelled>

      <Labelled label="Line item" span={3}>
        <input
          name="title"
          required
          placeholder="Skon Boutique"
          className={field}
        />
      </Labelled>

      <Labelled label="Detail" span={3}>
        <input
          name="description"
          placeholder="Optional note"
          className={field}
        />
      </Labelled>

      {!derivesPrice ? (
        <>
          <Labelled label="Qty" span={1}>
            <input
              name="qty"
              type="number"
              min="0.01"
              step="0.01"
              defaultValue={1}
              className={cn(field, "text-right")}
            />
          </Labelled>

          <Labelled label="Price" span={1}>
            <input
              name="customer_price"
              type="number"
              min="0"
              step="0.01"
              className={cn(field, "text-right")}
            />
          </Labelled>

          <Labelled
            label="Cost"
            span={1}
            title="Supplier cost — internal only, never shown to the customer"
          >
            <input
              name="est_supplier_cost"
              type="number"
              min="0"
              step="0.01"
              className={cn(field, "text-right")}
            />
          </Labelled>
        </>
      ) : null}

      <Button
        type="submit"
        size="sm"
        disabled={pending}
        className="col-span-2 h-8 self-end text-[12px] md:col-span-1 md:px-0"
      >
        <Plus className="size-3.5" />
      </Button>

      {/* Kind-specific detail. Every field optional — an enquiry rarely arrives
          complete, and a required field would only invite invented data. */}
      {specs.length > 0 ? (
        <div className="col-span-2 grid grid-cols-2 gap-2 border-t pt-2 md:col-span-12 md:grid-cols-12">
          {specs.map((spec) => (
            <Labelled key={spec.name} label={spec.label} span={spec.span ?? 2}>
              <MetaInput
                spec={spec}
                value={meta[spec.name] ?? ""}
                onChange={(value) => updateMeta(spec.name, value)}
              />
            </Labelled>
          ))}

          {converted !== null ? (
            <div className="text-muted-foreground col-span-2 self-end pb-1.5 text-[11px] md:col-span-4">
              ={" "}
              <span className="text-foreground font-medium tabular-nums">
                {converted.toLocaleString("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 2,
                })}
              </span>{" "}
              at that rate
            </div>
          ) : null}
        </div>
      ) : null}

      <label className="text-muted-foreground col-span-2 flex items-center gap-1.5 text-[11px] md:col-span-12">
        <input
          type="checkbox"
          name="is_optional"
          className="accent-primary size-3"
        />
        Optional add-on — listed separately, not counted in the total
      </label>
    </form>
  );
}
