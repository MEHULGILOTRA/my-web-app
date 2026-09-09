"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { setLeadStage } from "@/app/(admin)/leads/actions";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/nav";

const LOST_REASONS = [
  ["budget_too_high", "Budget Too High"],
  ["booked_elsewhere", "Booked Elsewhere"],
  ["dates_changed", "Dates Changed"],
  ["trip_cancelled", "Trip Cancelled"],
  ["no_response", "No Response"],
  ["just_exploring", "Just Exploring"],
  ["visa_rejected", "Visa Rejected"],
  ["other", "Other"],
] as const;

export function LeadStageSelect({
  leadId,
  status,
}: {
  leadId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [askingReason, setAskingReason] = useState(false);

  function apply(next: string, reason?: string) {
    startTransition(async () => {
      try {
        await setLeadStage(leadId, next, reason);
        toast.success(`Moved to ${STAGE_LABELS[next] ?? next}`);
        setAskingReason(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={status}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value;
          // A lost lead is purged after 90 days, so capturing why is the last
          // chance to learn anything from it.
          if (next === "lost") {
            setAskingReason(true);
            return;
          }
          apply(next);
        }}
        className="border-input bg-background h-7 rounded-md border px-2 text-[12px]"
      >
        {STAGE_ORDER.map((stage) => (
          <option key={stage} value={stage}>
            {STAGE_LABELS[stage]}
          </option>
        ))}
        <option value="dormant">{STAGE_LABELS.dormant}</option>
      </select>

      {askingReason ? (
        <>
          <select
            defaultValue=""
            disabled={pending}
            onChange={(event) => {
              if (event.target.value) apply("lost", event.target.value);
            }}
            className="border-input bg-background h-7 rounded-md border px-2 text-[12px]"
          >
            <option value="" disabled>
              Why lost?
            </option>
            {LOST_REASONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setAskingReason(false)}
            className="text-muted-foreground hover:text-foreground text-[12px]"
          >
            Cancel
          </button>
        </>
      ) : null}
    </div>
  );
}
