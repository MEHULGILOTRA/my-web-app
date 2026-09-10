"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Undo2 } from "lucide-react";
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
import {
  deleteLead,
  restoreLead,
  type DeleteLeadState,
} from "@/app/(admin)/leads/actions";

type Props = {
  leadId: string;
  /** Shown in the confirmation so the agent can check they have the right one. */
  reference: string | null;
  clientName: string;
  /** Where to go after deleting. The drawer stays on /leads; the detail page leaves. */
  redirectTo?: string;
  /** Compact rendering for the drawer's action row. */
  size?: "sm" | "default";
};

/**
 * Deleting is soft, so the confirmation promises what actually happens —
 * "moved to Deleted", not "permanently removed". Claiming permanence for a
 * reversible action trains people to distrust every other warning in the app.
 *
 * The reason is optional. Making it mandatory would mean agents type "x" to get
 * past it, which is worse than no reason at all.
 */
export function DeleteLeadButton({
  leadId,
  reference,
  clientName,
  redirectTo,
  size = "default",
}: Props) {
  const router = useRouter();
  const [requested, setRequested] = useState(false);
  const [state, formAction, pending] = useActionState<DeleteLeadState, FormData>(
    deleteLead,
    {},
  );

  // Derived rather than set from the effect below: a successful delete closes
  // the dialog by definition, so making that a second piece of state would let
  // the two disagree — and React 19 rejects setState inside an effect anyway.
  const open = requested && !state.deleted;

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
      return;
    }

    if (!state.deleted) return;

    toast.success(`${reference ?? "Lead"} deleted`, {
      description: "It stays in the Deleted view until you purge it.",
      action: {
        label: "Undo",
        onClick: () => {
          restoreLead(leadId)
            .then(() => {
              toast.success(`${reference ?? "Lead"} restored`);
              router.refresh();
            })
            .catch((error: unknown) =>
              toast.error(
                error instanceof Error ? error.message : "Could not restore.",
              ),
            );
        },
      },
    });

    if (redirectTo) router.push(redirectTo);
    else router.refresh();
  }, [state, leadId, reference, redirectTo, router]);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size={size}
        onClick={() => setRequested(true)}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-4" />
        Delete
      </Button>

      <Dialog open={open} onOpenChange={setRequested}>
        <DialogContent className="sm:max-w-md">
          <form action={formAction}>
            <input type="hidden" name="lead_id" value={leadId} />

            <DialogHeader>
              <DialogTitle>Delete this lead?</DialogTitle>
              <DialogDescription>
                {reference ? `${reference} — ` : ""}
                {clientName}. It moves to the Deleted view, where you can restore
                it. Quotations on this lead are kept.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-2">
              <Label htmlFor="delete-reason" className="text-xs">
                Reason <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="delete-reason"
                name="reason"
                placeholder="Duplicate of LD-1042"
                autoComplete="off"
              />
            </div>

            <DialogFooter className="mt-5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setRequested(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={pending}>
                {pending ? "Deleting…" : "Delete lead"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Shown on rows in the Deleted view. */
export function RestoreLeadButton({
  leadId,
  reference,
}: {
  leadId: string;
  reference: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        setPending(true);
        restoreLead(leadId)
          .then(() => {
            toast.success(`${reference ?? "Lead"} restored`);
            router.refresh();
          })
          .catch((error: unknown) =>
            toast.error(
              error instanceof Error ? error.message : "Could not restore.",
            ),
          )
          .finally(() => setPending(false));
      }}
    >
      <Undo2 className="size-4" />
      Restore
    </Button>
  );
}
