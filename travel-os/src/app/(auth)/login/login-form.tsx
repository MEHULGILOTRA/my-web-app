"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { signIn, type LoginState } from "./actions";

/**
 * Staff sign-in: email and password only.
 *
 * Magic link is deliberately not offered here. It depends on email delivery,
 * and Supabase's built-in mailer is rate limited to a handful of messages an
 * hour and frequently spam-filtered — so a team member could be locked out of
 * the CRM by something entirely outside the app. The magic-link action and the
 * /auth/callback route remain for the Phase 4 customer portal, where a
 * password would be the worse choice.
 */
const CALLBACK_ERRORS: Record<string, string> = {
  link_expired: "That sign-in link has expired or was already used.",
  no_access: "That account does not have access to Travel OS.",
};

export function LoginForm({
  next,
  callbackError,
}: {
  next: string;
  callbackError?: string;
}) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    signIn,
    {},
  );

  const error =
    state.error ?? (callbackError ? CALLBACK_ERRORS[callbackError] : undefined);

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <input type="hidden" name="next" value={next} />

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          required
          placeholder="you@skymilestravels.com"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="text-destructive bg-destructive/8 rounded-md px-3 py-2 text-sm"
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
