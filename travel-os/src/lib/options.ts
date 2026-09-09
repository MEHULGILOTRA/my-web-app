import "server-only";

import { cache } from "react";

import { createStaffClient } from "@/lib/db/admin";

export type OptionRow = { set_key: string; value: string; label: string };

/**
 * All dropdown options, keyed "set_key:value".
 *
 * Wrapped in React's cache() so a page rendering a dozen fields queries once
 * per request rather than once per field.
 */
export const getOptionLabels = cache(async (): Promise<Map<string, string>> => {
  const supabase = await createStaffClient();
  const { data } = await supabase
    .from("option_sets")
    .select("set_key, value, label")
    .eq("is_active", true);

  const map = new Map<string, string>();
  for (const row of (data ?? []) as OptionRow[]) {
    map.set(`${row.set_key}:${row.value}`, row.label);
  }
  return map;
});

/** Options for one dropdown, in display order. */
export const getOptionSet = cache(
  async (setKey: string): Promise<OptionRow[]> => {
    const supabase = await createStaffClient();
    const { data } = await supabase
      .from("option_sets")
      .select("set_key, value, label")
      .eq("set_key", setKey)
      .eq("is_active", true)
      .order("sort_order");
    return (data ?? []) as OptionRow[];
  },
);

/**
 * Human label for a stored value.
 *
 * Falls back to the raw value rather than rendering nothing — an unrecognised
 * value should still be visible, not silently disappear.
 */
export function optionLabel(
  labels: Map<string, string>,
  setKey: string,
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  return labels.get(`${setKey}:${value}`) ?? value;
}

/** Enquiry sources are CHECK-constrained in the schema, not in option_sets. */
export const SOURCE_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  referral: "Referral",
  walk_in: "Walk-in",
  website: "Website",
  repeat: "Repeat client",
  cross_sell: "Cross-sell",
  other: "Other",
};

/**
 * Every active option, grouped by set_key, for forms that render many
 * dropdowns at once. One query instead of one per field.
 */
export const getGroupedOptions = cache(
  async (): Promise<Record<string, OptionRow[]>> => {
    const supabase = await createStaffClient();
    const { data } = await supabase
      .from("option_sets")
      .select("set_key, value, label")
      .eq("is_active", true)
      .order("sort_order");

    const grouped: Record<string, OptionRow[]> = {};
    for (const row of (data ?? []) as OptionRow[]) {
      (grouped[row.set_key] ??= []).push(row);
    }
    return grouped;
  },
);
