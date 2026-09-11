"use client";

import { useActionState, useState } from "react";

import {
  sendPortalMagicLink,
  signInWithPassword,
  type PortalLoginState,
} from "./actions";

/**
 * Password by default, magic link as the escape hatch.
 *
 * Password first because it is instant and works when email is slow; the link
 * exists for the traveller standing at a check-in desk who cannot remember one.
 */
export function PortalLoginForm() {
  const [mode, setMode] = useState<"password" | "link">("password");

  const [passwordState, passwordAction, passwordPending] = useActionState<
    PortalLoginState,
    FormData
  >(signInWithPassword, {});

  const [linkState, linkAction, linkPending] = useActionState<
    PortalLoginState,
    FormData
  >(sendPortalMagicLink, {});

  const state = mode === "password" ? passwordState : linkState;

  if (linkState.sent) {
    return (
      <div className="mt-8">
        <p className="text-brand-ink text-sm font-medium">Check your email</p>
        <p className="text-brand-ink/60 mt-2 text-sm leading-relaxed">
          If {linkState.sent} is registered with us, a sign-in link is on its
          way. It expires in an hour.
        </p>
      </div>
    );
  }

  return (
    <form
      action={mode === "password" ? passwordAction : linkAction}
      className="mt-8 space-y-4"
    >
      <div>
        <label
          htmlFor="email"
          className="text-brand-ink/60 text-xs font-medium tracking-wide uppercase"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="border-brand-ink/20 focus-visible:border-brand-ink mt-2 h-11 w-full rounded-xl border bg-white px-3 text-base outline-none"
        />
      </div>

      {mode === "password" ? (
        <div>
          <label
            htmlFor="password"
            className="text-brand-ink/60 text-xs font-medium tracking-wide uppercase"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="border-brand-ink/20 focus-visible:border-brand-ink mt-2 h-11 w-full rounded-xl border bg-white px-3 text-base outline-none"
          />
        </div>
      ) : null}

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={passwordPending || linkPending}
        className="bg-brand-ink text-brand-cream h-11 w-full rounded-xl text-sm font-medium disabled:opacity-60"
      >
        {mode === "password"
          ? passwordPending
            ? "Signing in…"
            : "Sign in"
          : linkPending
            ? "Sending…"
            : "Email me a sign-in link"}
      </button>

      <button
        type="button"
        onClick={() => setMode(mode === "password" ? "link" : "password")}
        className="text-brand-ink/60 w-full text-center text-sm underline underline-offset-4"
      >
        {mode === "password"
          ? "Sign in with an email link instead"
          : "Use my password instead"}
      </button>
    </form>
  );
}
