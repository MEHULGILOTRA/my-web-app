/**
 * Content shapes for the SkyMiles site.
 *
 * Three deliberate choices, each of which came from a real problem in the
 * legacy data:
 *
 * 1. `priceFrom` is a whole-rupee integer, never a string. The old site stored
 *    "Rs. 27,000 per adult (on twin sharing basis for booking of minimum 2
 *    travellers)" — unsortable, unfilterable, and impossible to reformat.
 *    The qualifier now lives in `pricingBasis` and `minTravellers`.
 *
 * 2. `meals` and `mealPlan` are enums matching travel-os `option_sets`, so a
 *    won enquiry becomes a quotation in the CRM without anyone retyping it.
 *
 * 3. `alt` on MediaRef is required and `credit` exists, because one image in
 *    the archive carries Freepik copyright in its EXIF. Per-asset licence
 *    provenance is not optional once that is true of any single file.
 */

export type Region = "india" | "asia" | "middle-east" | "europe" | "oceania";

export type Meal = "breakfast" | "lunch" | "dinner";

/** Matches travel-os option_sets.meal_plan. */
export type MealPlan = "ep" | "cp" | "map" | "ap" | "ai";

export type PricingBasis =
  | "per_adult_twin_share"
  | "per_adult_single"
  | "per_group";

export interface MediaRef {
  src: string;
  /** Required. An image without alt text is a bug, not a style choice. */
  alt: string;
  width: number;
  height: number;
  /**
   * Portrait originals cannot be centre-cropped into a landscape frame
   * without losing the subject. Five of the archive's best photographs are
   * portrait, so focal point is a first-class field rather than an override.
   */
  focal?: { x: number; y: number };
  credit?: { holder: string; licence: string };
}

export interface JourneyDay {
  day: number;
  title: string;
  body: string;
  meals: Meal[];
  /** "140-150 km | 4-5 hrs" — kept as prose; it is never computed on. */
  transfer: string | null;
}

export interface Journey {
  slug: string;
  /** Key in the legacy data file. Kept so a migration can be re-run. */
  legacyKey: string;
  title: string;
  region: Region;
  isInternational: boolean;
  nights: number;
  /** Whole rupees. */
  priceFrom: number;
  pricingBasis: PricingBasis;
  minTravellers: number;
  accommodationSummary: string | null;
  summary: string;
  /**
   * Key into the media manifest, or null when no usable photograph exists.
   * Null is meaningful: the Australia journey has none, and the UI renders a
   * typographic card rather than substituting an unrelated image.
   */
  image: string | null;
  highlights: string[];
  days: JourneyDay[];
  stays: string[];
  inclusions: string[];
  exclusions: string[];
  terms: string[];
}

export interface Destination {
  slug: string;
  name: string;
  country: string;
  region: Region;
  image: string;
}

export interface Service {
  number: string;
  title: string;
  body: string;
  image?: string;
}
