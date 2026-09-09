# Lessons

Patterns worth not rediscovering. Each of these came from something that
actually broke or was actually corrected — not from theory.

---

## Verify against reality, not against the plan

Three defects in this build were invisible until something was actually run:

- **Tailwind v4 tree-shakes `@theme` variables it cannot see used.** The lead
  stage colours are only ever referenced through a runtime string
  (`var(--color-stage-${status})`), so every badge rendered transparent. Fixed
  with `@theme static`. Nothing in the code looked wrong.
- **The auth trigger never fired.** Supabase's `admin.createUser` inserts the
  `auth.users` row and applies `app_metadata` in two separate steps, so an
  `AFTER INSERT` trigger sees no marker and correctly does nothing. Proved by
  inserting directly with metadata present, inside a rolled-back transaction.
- **The first lead created through the UI failed** on a unique-index collision,
  because the reference sequence started at 1001 and imported data already had
  `LD-1001`.

**Rule:** for anything user-visible, drive it in the browser. For anything in
the database, assert it with a query. "The code says it should" is not evidence.

---

## Do not trust another system's internal write ordering

`create-staff.mjs` originally relied on a database trigger that fired when
Supabase inserted the auth user. It did not fire, for reasons entirely internal
to GoTrue.

**Rule:** when a third party's internal sequencing decides whether something
important happens, do it explicitly instead and keep the trigger only as a
safety net. Applies to anything answering "who is staff", "who paid", "what did
we quote".

---

## Deliberately hidden errors also hide from you

The login action reports success even when sending fails, so the form cannot be
used to discover which addresses have accounts. Correct — but it meant a real
delivery failure was invisible to everyone, including us, and the user reported
"I am not getting any email" with nothing to go on.

**Rule:** when a response is deliberately vague for security, log the real error
server-side in the same branch. Vague to the browser, specific to the operator.

---

## Guard invariants with a script, not a comment

Rules that quietly rot: "signed URLs are only minted in one place", "the service
role key stays in two files", "portal_reader has no base-table grants". Each is
one hurried change away from being false, and nobody notices.

`npm run check` enforces all three. `scripts/check-chokepoints.mjs` greps the
source; `scripts/verify-schema.mjs` asserts the grants against a real Postgres.

**Rule:** if an architectural rule matters, it needs a test. Writing it in a
comment protects nothing.

---

## Write the assertion so it can fail

The privacy assertions were nearly written against an empty database, where they
pass trivially. The seed deliberately contains real supplier costs and margins,
so a broken portal view would actually leak something.

**Rule:** before trusting a passing test, check it would fail if the thing it
guards were broken.

---

## Migrations are append-only once applied

Never edit a migration that has been pushed. Write a new one. Two migrations in
this build exist purely to correct earlier ones (`auth_sync_on_update`,
`reference_collision_fix`) and that is the right shape.

Corollary: `db:verify` runs everything from scratch against PGlite, so a
migration that only works against an already-migrated database gets caught.

---

## A "use client" export is not callable from the server

`emptyLead()` was defined in the form component file. A Server Component
importing and calling it got a *client reference*, not a function, and the page
500'd at runtime with no build-time warning:

> Attempted to call emptyLead() from the server but emptyLead is on the client.

Shapes and default factories now live in `src/lib/lead-form-data.ts`, a plain
module both sides import.

**Rule:** anything a Server Component needs to *call* must not live in a
`"use client"` file. Types are fine (erased at compile time); functions and
constants are not.

---

## Stale Turbopack dev state can look exactly like a code bug

A newly added client component rendered its server HTML (classes applied,
`cursor: pointer` correct) but never hydrated — no React fiber on the element,
click handler dead. The code was fine. The dev server had been through a dozen
Fast Refresh rebuilds, some taking 60 seconds, and its HMR state was corrupt.

`rm -rf .next/dev` plus a server restart fixed it instantly.

**Rule:** when a component renders but does not hydrate, and neighbouring client
components *do* hydrate, suspect the dev server before the code. The tell is a
mixed result: `aside` had `__reactFiber$…`, the `<tr>` had none. Check for it
with `Object.getOwnPropertyNames(el).filter(k => k.startsWith("__react"))`.

---

## Environment specifics

- **No Docker on this machine.** Supabase's local stack cannot run. Schema is
  verified with PGlite (Postgres in WASM) plus shims for `auth` and `storage`.
  `supabase gen types --db-url` also needs Docker; `--project-id` does not.
- **PGlite leaves a libuv handle open on Windows** and the process aborts during
  teardown with a non-zero code even on a fully green run. `verify-schema.mjs`
  ends with an explicit `process.exit(0)` — without it CI fails on success.
- **Browser pane cannot composite frames.** Screenshots time out and coordinate
  clicks do not dispatch. Verify with `read_page`, `get_page_text` and
  `javascript_tool`; use `form_input` plus `requestSubmit()` to drive forms.
- **Setting a React input value from JS needs the native setter** plus a
  dispatched `input` event, or React never sees the change.
- **Large TSX via a bash heredoc is unreliable.** Use the Write tool for
  components; bash is fine for SQL, appends and targeted edits.

---

## Next.js 16 differences that bit

- `middleware.ts` is now `proxy.ts`, function named `proxy`, Node runtime only.
- `cookies()`, `headers()`, `params`, `searchParams` are all async.
- `useSearchParams()` needs a Suspense boundary — usually better to read the
  param in a Server Component and pass it down.
- `next typegen` must run before `tsc --noEmit`, or generated route types
  (`PageProps`, `LayoutProps`) are missing.
- Turbopack infers the workspace root from the nearest lockfile; with this app
  nested inside the marketing site's repo it picked the wrong one until
  `turbopack.root` was pinned.
- Calling `setState` synchronously inside an effect is now a lint error, not a
  warning.
