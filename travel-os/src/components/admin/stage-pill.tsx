import { PRIORITY_COLOR, STAGE_LABELS, STAGE_SHORT, stageColor } from "@/lib/nav";

/**
 * `short` uses the abbreviated label, for dense table cells where
 * "Won / Booking Confirmed" would wrap and break the row rhythm.
 */
export function StagePill({
  stage,
  short = false,
}: {
  stage: string;
  short?: boolean;
}) {
  const label = short
    ? (STAGE_SHORT[stage] ?? stage)
    : (STAGE_LABELS[stage] ?? stage);

  return (
    <span
      title={STAGE_LABELS[stage] ?? stage}
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
      style={{
        color: stageColor(stage),
        backgroundColor: `color-mix(in srgb, ${stageColor(stage)} 12%, transparent)`,
      }}
    >
      <span
        aria-hidden
        className="size-1.5 rounded-full"
        style={{ backgroundColor: stageColor(stage) }}
      />
      {label}
    </span>
  );
}

export function PriorityDot({ priority }: { priority: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] capitalize"
      style={{ color: PRIORITY_COLOR[priority] ?? PRIORITY_COLOR.cold }}
      title={`Priority: ${priority}`}
    >
      <span
        aria-hidden
        className="size-1.5 rounded-full"
        style={{ backgroundColor: PRIORITY_COLOR[priority] ?? PRIORITY_COLOR.cold }}
      />
      {priority}
    </span>
  );
}
