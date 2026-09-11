"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteQuotationItem,
  updateQuotationItem,
  type ItemState,
} from "@/app/(admin)/quotations/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  forexTotal,
  PRICE_DERIVED_KINDS,
  visibleFields,
  type LineMeta,
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

/**
 * Tailwind scans source statically, so `col-span-${n}` generates no CSS — the
 * same trap as runtime-interpolated theme variables. The classes have to appear
 * literally somewhere it can see them.
 */
const SPAN: Record<number, string> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
};

const field = cn(
  "border-input bg-background h-8 w-full rounded-md border px-2 text-[12px]",
  "focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px] focus-visible:outline-none",
);

export type EditableLine = {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  qty: number;
  customer_price: number;
  est_supplier_cost: number;
  is_optional: boolean;
  meta: LineMeta | null;
};

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
      placeholder={spec.placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={field}
    />
  );
}

/** Edit and remove, shown on draft quotations only. */
export function QuotationLineActions({
  line,
  quotationId,
}: {
  line: EditableLine;
  quotationId: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [removing, setRemoving] = useState(false);

  const [kind, setKind] = useState(line.kind);
  const [meta, setMeta] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(line.meta ?? {}).map(([key, value]) => [
        key,
        String(value ?? ""),
      ]),
    ),
  );

  const [state, formAction, pending] = useActionState<ItemState, FormData>(
    updateQuotationItem,
    {},
  );

  // Derived, not stored: a saved edit closes the dialog by definition, and
  // React 19 rejects setState inside an effect anyway.
  const open = editing && !state.ok;

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state.error]);

  const specs = visibleFields(kind, meta);
  // Forex prices itself from amount x rate, so the generic boxes would only
  // be a second, disagreeing source of truth.
  const derivesPrice = PRICE_DERIVED_KINDS.has(kind);
  const converted = kind === "forex" ? forexTotal(meta) : null;

  return (
    <>
      <div className="flex justify-end gap-0.5">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="hover:bg-accent rounded p-1"
          aria-label={`Edit ${line.title}`}
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="text-destructive hover:bg-destructive/10 rounded p-1"
          aria-label={`Remove ${line.title}`}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      <Dialog open={open} onOpenChange={setEditing}>
        <DialogContent className="sm:max-w-2xl">
          <form action={formAction}>
            <input type="hidden" name="item_id" value={line.id} />
            <input type="hidden" name="quotation_id" value={quotationId} />

            <DialogHeader>
              <DialogTitle>Edit line item</DialogTitle>
            </DialogHeader>

            <div className="mt-4 grid grid-cols-12 gap-2">
              <label className="col-span-3">
                <span className="text-muted-foreground block text-[10px]">
                  Type
                </span>
                <select
                  name="kind"
                  value={kind}
                  onChange={(event) => {
                    setKind(event.target.value);
                    // Detail belongs to the kind that declared it.
                    setMeta({});
                  }}
                  className={cn(field, "mt-0.5")}
                >
                  {KINDS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="col-span-5">
                <span className="text-muted-foreground block text-[10px]">
                  Line item
                </span>
                <input
                  name="title"
                  required
                  defaultValue={line.title}
                  className={cn(field, "mt-0.5")}
                />
              </label>

              <label className="col-span-4">
                <span className="text-muted-foreground block text-[10px]">
                  Detail
                </span>
                <input
                  name="description"
                  defaultValue={line.description ?? ""}
                  className={cn(field, "mt-0.5")}
                />
              </label>

              {!derivesPrice ? (
                <>
                  <label className="col-span-2">
                    <span className="text-muted-foreground block text-[10px]">
                      Qty
                    </span>
                    <input
                      name="qty"
                      type="number"
                      min="0.01"
                      step="0.01"
                      defaultValue={line.qty}
                      className={cn(field, "mt-0.5 text-right")}
                    />
                  </label>

                  <label className="col-span-2">
                    <span className="text-muted-foreground block text-[10px]">
                      Price
                    </span>
                    <input
                      name="customer_price"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={line.customer_price}
                      className={cn(field, "mt-0.5 text-right")}
                    />
                  </label>

                  <label
                    className="col-span-2"
                    title="Internal only — never shown to the customer"
                  >
                    <span className="text-muted-foreground block text-[10px]">
                      Cost
                    </span>
                    <input
                      name="est_supplier_cost"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={line.est_supplier_cost}
                      className={cn(field, "mt-0.5 text-right")}
                    />
                  </label>
                </>
              ) : null}

              {specs.map((spec) => (
                <label
                  key={spec.name}
                  className={SPAN[spec.span ?? 3] ?? "col-span-3"}
                >
                  <span className="text-muted-foreground block text-[10px]">
                    {spec.label}
                  </span>
                  <div className="mt-0.5">
                    <MetaInput
                      spec={spec}
                      value={meta[spec.name] ?? ""}
                      onChange={(value) =>
                        setMeta((current) => ({
                          ...current,
                          [spec.name]: value,
                        }))
                      }
                    />
                  </div>
                </label>
              ))}

              {converted !== null ? (
                <p className="text-muted-foreground col-span-12 text-[11px]">
                  ={" "}
                  <span className="text-foreground font-medium tabular-nums">
                    {converted.toLocaleString("en-IN", {
                      style: "currency",
                      currency: "INR",
                    })}
                  </span>{" "}
                  at that rate
                </p>
              ) : null}

              <label className="text-muted-foreground col-span-12 flex items-center gap-1.5 text-[11px]">
                <input
                  type="checkbox"
                  name="is_optional"
                  defaultChecked={line.is_optional}
                  className="accent-primary size-3"
                />
                Optional add-on — listed separately, not counted in the total
              </label>
            </div>

            <DialogFooter className="mt-5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditing(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove this line?</DialogTitle>
            <DialogDescription>
              {line.title}. The quotation total recalculates immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmingDelete(false)}
              disabled={removing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={removing}
              onClick={() => {
                setRemoving(true);
                deleteQuotationItem(line.id, quotationId)
                  .then(() => {
                    toast.success("Line removed");
                    setConfirmingDelete(false);
                    router.refresh();
                  })
                  .catch((error: unknown) =>
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Could not remove.",
                    ),
                  )
                  .finally(() => setRemoving(false));
              }}
            >
              {removing ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
