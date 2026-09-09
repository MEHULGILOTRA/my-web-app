"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createLead,
  updateLead,
  type LeadFormState,
} from "@/app/(admin)/leads/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OptionRow } from "@/lib/options";
import type {
  CustomerFormData,
  LeadFormData,
} from "@/lib/lead-form-data";

/**
 * The single definition of the lead field set, used for both creating and
 * editing. Two copies would drift the first time a field is added to one.
 *
 * Only name and contact number are required. Everything else is optional, so a
 * lead can be captured in seconds and enriched later — which is also why the
 * quick-add dialog exists alongside this.
 *
 * Shapes and defaults live in @/lib/lead-form-data because Server Components
 * need to call them, and exports from a "use client" module are not callable
 * on the server.
 */

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

const control = cn(
  "border-input bg-background h-8 w-full rounded-md border px-2 text-[13px]",
  "focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px] focus-visible:outline-none",
);

export function LeadForm({
  mode,
  lead,
  customer,
  options,
  staff,
}: {
  mode: "create" | "edit";
  lead: LeadFormData;
  customer: CustomerFormData;
  options: Record<string, OptionRow[]>;
  staff: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const isCreate = mode === "create";

  // `mode` never changes for a mounted form, so picking the action here is safe
  // and keeps the hook call unconditional.
  const [state, formAction, pending] = useActionState<LeadFormState, FormData>(
    isCreate ? createLead : updateLead,
    {},
  );

  // The database refuses a children_ages array whose length disagrees with
  // pax_children, so the number of age inputs tracks the count as it is typed.
  const [childCount, setChildCount] = useState(lead.pax_children);

  useEffect(() => {
    if (!state.ok) return;
    const target = state.leadId ?? lead.id;
    toast.success(isCreate ? "Lead created" : "Lead saved");
    if (target) router.push(`/leads/${target}`);
    router.refresh();
  }, [state.ok, state.leadId, lead.id, isCreate, router]);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state.error]);

  return (
    <form action={formAction} className="flex h-full flex-col">
      {lead.id ? <input type="hidden" name="lead_id" value={lead.id} /> : null}

      <div className="min-h-0 flex-1 overflow-auto p-4 md:p-5">
        <div className="mx-auto max-w-3xl space-y-6 pb-4">
          <Section
            title="Customer"
            hint="Name and contact number are the only required fields. Everything below is optional."
          >
            <Grid>
              <Field label="Name" required span={2}>
                <input
                  name="full_name"
                  required
                  autoFocus={isCreate}
                  defaultValue={customer.full_name}
                  placeholder="Amit Singhania"
                  className={control}
                />
              </Field>
              <Field
                label="Contact number"
                required
                span={2}
                hint={
                  isCreate
                    ? "Any format. An existing customer with this number is matched automatically."
                    : undefined
                }
              >
                <input
                  name="phone"
                  required
                  inputMode="tel"
                  defaultValue={customer.phone_raw ?? customer.phone_e164 ?? ""}
                  placeholder="98765 43210"
                  className={control}
                />
              </Field>
              <Field label="Email" span={2}>
                <input
                  name="email"
                  type="email"
                  defaultValue={customer.email ?? ""}
                  className={control}
                />
              </Field>
              <Field label="City">
                <input
                  name="city"
                  defaultValue={customer.city ?? ""}
                  placeholder="Jaipur"
                  className={control}
                />
              </Field>
              <Field label="Customer type">
                <OptionSelect
                  name="customer_type"
                  rows={options.customer_type ?? []}
                  value={customer.customer_type}
                  allowEmpty={false}
                />
              </Field>
            </Grid>
          </Section>

          <Section title="Trip">
            <Grid>
              <Field label="Lead date">
                <input
                  name="lead_date"
                  type="date"
                  defaultValue={lead.lead_date ?? ""}
                  className={control}
                />
              </Field>
              <Field label="Trip type">
                <select
                  name="is_international"
                  defaultValue={String(lead.is_international)}
                  className={control}
                >
                  <option value="false">Domestic</option>
                  <option value="true">International</option>
                </select>
              </Field>
              <Field label="Destination" span={2}>
                <input
                  name="destination"
                  defaultValue={lead.destination ?? ""}
                  placeholder="Bali (Ubud + Kuta)"
                  className={control}
                />
              </Field>

              <Field label="Origin city">
                <input
                  name="origin_city"
                  defaultValue={lead.origin_city ?? ""}
                  placeholder="Jaipur"
                  className={control}
                />
              </Field>
              <Field label="Travel start">
                <input
                  name="travel_start"
                  type="date"
                  defaultValue={lead.travel_start ?? ""}
                  className={control}
                />
              </Field>
              <Field label="Duration (nights)">
                <input
                  name="duration_nights"
                  type="number"
                  min={0}
                  max={365}
                  defaultValue={lead.duration_nights ?? ""}
                  className={control}
                />
              </Field>
              <Field
                label="Travel month"
                hint="When exact dates are not known yet"
              >
                <input
                  name="travel_month"
                  defaultValue={lead.travel_month ?? ""}
                  placeholder="Nov 2026"
                  className={control}
                />
              </Field>

              <Field label="Adults">
                <input
                  name="pax_adults"
                  type="number"
                  min={0}
                  max={99}
                  defaultValue={lead.pax_adults}
                  className={control}
                />
              </Field>
              <Field label="Children">
                <input
                  name="pax_children"
                  type="number"
                  min={0}
                  max={99}
                  defaultValue={lead.pax_children}
                  onChange={(event) =>
                    setChildCount(Math.max(0, Number(event.target.value) || 0))
                  }
                  className={control}
                />
              </Field>

              {childCount > 0 ? (
                <Field
                  label="Age of each child"
                  span={2}
                  hint="Drives child pricing and extra-bed rules"
                >
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: childCount }, (_, index) => (
                      <div key={index} className="flex items-center gap-1.5">
                        <span className="text-muted-foreground text-[11px]">
                          #{index + 1}
                        </span>
                        <input
                          name={`child_age_${index}`}
                          type="number"
                          min={0}
                          max={17}
                          required
                          defaultValue={lead.children_ages?.[index] ?? ""}
                          aria-label={`Age of child ${index + 1}`}
                          className={cn(control, "w-16")}
                        />
                      </div>
                    ))}
                  </div>
                </Field>
              ) : null}
            </Grid>
          </Section>

          <Section title="Preferences">
            <Grid>
              <Field label="Travel theme">
                <OptionSelect
                  name="travel_theme"
                  rows={options.travel_theme ?? []}
                  value={lead.travel_theme}
                />
              </Field>
              <Field label="Hotel category">
                <OptionSelect
                  name="hotel_category"
                  rows={options.hotel_category ?? []}
                  value={lead.hotel_category}
                />
              </Field>
              <Field label="Meal preference">
                <OptionSelect
                  name="meal_plan"
                  rows={options.meal_plan ?? []}
                  value={lead.meal_plan}
                />
              </Field>
              <Field label="Dietary">
                <OptionSelect
                  name="dietary_preference"
                  rows={options.dietary_preference ?? []}
                  value={lead.dietary_preference}
                />
              </Field>
              <Field label="Room configuration">
                <OptionSelect
                  name="room_configuration"
                  rows={options.room_configuration ?? []}
                  value={lead.room_configuration}
                />
              </Field>
              <Field label="Preferred airline">
                <input
                  name="preferred_airline"
                  defaultValue={lead.preferred_airline ?? ""}
                  className={control}
                />
              </Field>
            </Grid>
          </Section>

          <Section
            title="Components"
            hint="What still needs quoting. Gaps here drive the cross-sell prompts later."
          >
            <Grid>
              <Field label="Flights">
                <OptionSelect
                  name="flights_status"
                  rows={options.flights_status ?? []}
                  value={lead.flights_status}
                />
              </Field>
              <Field label="Visa">
                <OptionSelect
                  name="visa_status"
                  rows={options.visa_status ?? []}
                  value={lead.visa_status}
                />
              </Field>
              <Field label="Transfers">
                <OptionSelect
                  name="transfers_status"
                  rows={options.transfers_status ?? []}
                  value={lead.transfers_status}
                />
              </Field>
              <Field label="Insurance">
                <OptionSelect
                  name="insurance_status"
                  rows={options.insurance_status ?? []}
                  value={lead.insurance_status}
                />
              </Field>
              <Field label="Forex">
                <OptionSelect
                  name="forex_status"
                  rows={options.forex_status ?? []}
                  value={lead.forex_status}
                />
              </Field>
              <Field label="Activities">
                <OptionSelect
                  name="activities_status"
                  rows={options.activities_status ?? []}
                  value={lead.activities_status}
                />
              </Field>
            </Grid>
          </Section>

          <Section title="Pipeline">
            <Grid>
              <Field label="Client budget (INR)">
                <input
                  name="budget_max"
                  type="number"
                  min={0}
                  step={1000}
                  defaultValue={lead.budget_max ?? ""}
                  className={control}
                />
              </Field>
              <Field label="Minimum budget (INR)">
                <input
                  name="budget_min"
                  type="number"
                  min={0}
                  step={1000}
                  defaultValue={lead.budget_min ?? ""}
                  className={control}
                />
              </Field>
              <Field label="Source">
                <select
                  name="source"
                  defaultValue={lead.source}
                  className={control}
                >
                  {SOURCES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Priority">
                <select
                  name="priority"
                  defaultValue={lead.priority}
                  className={control}
                >
                  <option value="hot">Hot</option>
                  <option value="warm">Warm</option>
                  <option value="cold">Cold</option>
                </select>
              </Field>
              <Field
                label="Next follow-up"
                hint={isCreate ? "Defaults to 3 days out if left blank" : undefined}
              >
                <input
                  name="next_followup_date"
                  type="date"
                  defaultValue={lead.next_followup_date ?? ""}
                  className={control}
                />
              </Field>
              <Field label="Assigned agent">
                <select
                  name="owner_staff_id"
                  defaultValue={lead.owner_staff_id ?? ""}
                  className={control}
                >
                  <option value="">Unassigned</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name}
                    </option>
                  ))}
                </select>
              </Field>
            </Grid>
          </Section>

          <Section title="Notes">
            <Grid>
              <Field label="Special occasion" span={2}>
                <input
                  name="special_occasion"
                  defaultValue={lead.special_occasion ?? ""}
                  placeholder="Honeymoon, 50th birthday"
                  className={control}
                />
              </Field>
              <Field label="Special notes" span={4}>
                <textarea
                  name="special_notes"
                  rows={3}
                  defaultValue={lead.special_notes ?? ""}
                  placeholder="Private pool villa; candle light dinner included."
                  className={cn(control, "h-auto py-1.5")}
                />
              </Field>
            </Grid>
          </Section>
        </div>
      </div>

      <footer className="bg-background flex flex-wrap items-center gap-3 border-t px-4 py-3 md:px-5">
        {state.error ? (
          <p role="alert" className="text-destructive text-[12px]">
            {state.error}
          </p>
        ) : null}
        <div className="ml-auto flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-[12px]"
            onClick={() => router.push(lead.id ? `/leads/${lead.id}` : "/leads")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            className="h-8 text-[12px]"
            disabled={pending}
          >
            {pending
              ? isCreate
                ? "Creating..."
                : "Saving..."
              : isCreate
                ? "Create lead"
                : "Save changes"}
          </Button>
        </div>
      </footer>
    </form>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-[13px] font-semibold">{title}</h2>
      {hint ? (
        <p className="text-muted-foreground mt-0.5 mb-2 text-[11px]">{hint}</p>
      ) : (
        <div className="mb-2" />
      )}
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  span = 1,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  span?: 1 | 2 | 4;
  children: React.ReactNode;
}) {
  // Spans collapse with the grid: full width on a phone, then two, then four.
  const spanClass =
    span === 4
      ? "sm:col-span-2 lg:col-span-4"
      : span === 2
        ? "sm:col-span-2"
        : "";

  return (
    <div className={cn(spanClass, "space-y-1")}>
      <label className="text-muted-foreground block text-[11px]">
        {label}
        {required ? <span className="text-destructive ml-0.5">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-muted-foreground text-[10px]">{hint}</p> : null}
    </div>
  );
}

/** Dropdown backed by option_sets, so the business can edit the list itself. */
function OptionSelect({
  name,
  rows,
  value,
  allowEmpty = true,
}: {
  name: string;
  rows: OptionRow[];
  value: string | null | undefined;
  allowEmpty?: boolean;
}) {
  return (
    <select name={name} defaultValue={value ?? ""} className={control}>
      {allowEmpty ? <option value="">—</option> : null}
      {rows.map((row) => (
        <option key={row.value} value={row.value}>
          {row.label}
        </option>
      ))}
    </select>
  );
}
