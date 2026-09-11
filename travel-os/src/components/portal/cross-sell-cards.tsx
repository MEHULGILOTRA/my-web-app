"use client";

import { useActionState } from "react";

import { expressInterest, type InterestState } from "@/app/(portal)/my/actions";
import type { PortalCrossSell } from "@/lib/portal/trips";

/**
 * Cross-sell suggestions.
 *
 * Styled as helpful prompts rather than adverts — the gap they close is real
 * ("you have a hotel but no airport transfer"), and dressing that as a banner
 * ad is what makes a portal feel like a funnel.
 *
 * Tapping creates a lead in the CRM tagged `cross_sell`. That tag is the whole
 * point: it is what makes the portal's revenue contribution countable.
 */
export function CrossSellCards({
  suggestions,
}: {
  suggestions: PortalCrossSell[];
}) {
  return (
    <section className="mt-8">
      <h2 className="text-brand-ink/50 text-[11px] tracking-wide uppercase">
        You may also need
      </h2>

      <ul className="mt-3 space-y-3">
        {suggestions.map((suggestion) => (
          <SuggestionCard key={suggestion.id} suggestion={suggestion} />
        ))}
      </ul>
    </section>
  );
}

function SuggestionCard({ suggestion }: { suggestion: PortalCrossSell }) {
  const [state, formAction, pending] = useActionState<InterestState, FormData>(
    expressInterest,
    {},
  );

  return (
    <li className="border-brand-ink/10 rounded-2xl border bg-white p-5">
      <p className="text-brand-ink text-sm font-medium">{suggestion.headline}</p>

      {state.ok ? (
        /*
          Confirmed in place rather than with a toast. A traveller who taps this
          and sees nothing change taps again, and we get two leads for one want.
        */
        <p className="text-brand-ink/60 mt-3 text-sm">
          Thanks — we&rsquo;ll be in touch about this shortly.
        </p>
      ) : (
        <form action={formAction} className="mt-3">
          <input type="hidden" name="suggestion_id" value={suggestion.id} />
          <button
            type="submit"
            disabled={pending}
            className="bg-brand-ink text-brand-cream rounded-full px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {pending ? "Sending…" : "I'm interested"}
          </button>
          {state.error ? (
            <p className="mt-2 text-sm text-red-600">{state.error}</p>
          ) : null}
        </form>
      )}
    </li>
  );
}
