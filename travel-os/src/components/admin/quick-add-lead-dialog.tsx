"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { quickAddLead, type QuickAddState } from "@/app/(admin)/leads/actions";
import { cn } from "@/lib/utils";

const SOURCES = [
  ["whatsapp", "WhatsApp"],
  ["instagram", "Instagram"],
  ["referral", "Referral"],
  ["walk_in", "Walk-in"],
  ["website", "Website"],
  ["repeat", "Repeat client"],
  ["cross_sell", "Cross-sell"],
  ["other", "Other"],
] as const;

/** Native select: one keystroke, no popup to arrow through. */
const selectClass = cn(
  "border-input bg-background h-9 w-full rounded-md border px-2.5 text-[13px]",
  "focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px] focus-visible:outline-none",
);

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function QuickAddLeadDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const [state, formAction, pending] = useActionState<QuickAddState, FormData>(
    quickAddLead,
    {},
  );

  useEffect(() => {
    if (!state.created) return;

    const { reference, customerCreated, leadId } = state.created;
    toast.success(`Lead ${reference} created`, {
      description: customerCreated
        ? "New customer added."
        : "Matched an existing customer by phone number.",
      action: { label: "Open", onClick: () => router.push(`/leads/${leadId}`) },
    });

    formRef.current?.reset();
    onOpenChange(false);
    router.refresh();
    // Only react to a new creation result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.created]);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state.error]);

  // Enter submits from anywhere in the form, including the selects.
  function onKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      const target = event.target as HTMLElement;
      if (target.tagName !== "TEXTAREA") {
        event.preventDefault();
        formRef.current?.requestSubmit();
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          nameRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-base">New lead</DialogTitle>
          <DialogDescription className="text-xs">
            Just enough to capture the enquiry. Everything else can be filled in
            later.
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          action={formAction}
          onKeyDown={onKeyDown}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label htmlFor="qa-name" className="text-xs">
              Name
            </Label>
            <Input
              ref={nameRef}
              id="qa-name"
              name="full_name"
              required
              autoComplete="off"
              placeholder="Amit Singhania"
              className="h-9 text-[13px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qa-phone" className="text-xs">
              Phone
            </Label>
            <Input
              id="qa-phone"
              name="phone"
              required
              inputMode="tel"
              autoComplete="off"
              placeholder="98765 43210"
              className="h-9 text-[13px]"
            />
            <p className="text-muted-foreground text-[11px]">
              Any format. An existing customer with this number is matched
              automatically.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qa-destination" className="text-xs">
              Destination
            </Label>
            <Input
              id="qa-destination"
              name="destination"
              autoComplete="off"
              placeholder="Bali (Ubud + Kuta)"
              className="h-9 text-[13px]"
            />
            <label className="text-muted-foreground flex items-center gap-2 text-[11px]">
              <input
                type="checkbox"
                name="is_international"
                className="accent-primary size-3.5"
              />
              International — adds the TCS note to quotations
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qa-month" className="text-xs">
                Travel month
              </Label>
              <Input
                id="qa-month"
                name="travel_month"
                autoComplete="off"
                placeholder="Nov 2026"
                className="h-9 text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Pax (adults / children)</Label>
              <div className="flex gap-2">
                <Input
                  name="pax_adults"
                  type="number"
                  min={0}
                  max={99}
                  defaultValue={2}
                  aria-label="Adults"
                  className="h-9 text-[13px]"
                />
                <Input
                  name="pax_children"
                  type="number"
                  min={0}
                  max={99}
                  defaultValue={0}
                  aria-label="Children"
                  className="h-9 text-[13px]"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qa-source" className="text-xs">
              Source
            </Label>
            <select
              id="qa-source"
              name="source"
              defaultValue="whatsapp"
              className={selectClass}
            >
              {SOURCES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <input type="hidden" name="priority" value="warm" />

          <DialogFooter className="items-center gap-2 pt-1 sm:justify-between">
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                router.push("/leads/new");
              }}
              className="text-muted-foreground hover:text-foreground text-[11px] underline underline-offset-2"
            >
              Need every field? Open the full form
            </button>
            <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Create lead"}
            </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
