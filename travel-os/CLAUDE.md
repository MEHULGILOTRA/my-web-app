@AGENTS.md

# SkyMiles Travel OS — project conventions

This app lives inside the SkyMiles marketing site's repo but is completely
separate from it.

## Do not touch the parent directory

`D:\Github\my-web-app` is the **live** skymilestravels.com, a Create React App
site that auto-deploys from the `develop` branch on every push. Its
`package.json`, `vercel.json`, `src/` and `public/` must not be modified from
here. Travel OS deploys as its own Vercel project with Root Directory set to
`travel-os`.

Next 16 + React 19 cannot share a `package.json` with CRA + React 18, which is
why this is a nested app rather than a workspace.

## Migrations are append-only

Once a migration has been applied to a remote database, **never edit it**. Write
a new migration instead. This is the rule an AI-assisted workflow breaks most
often, and it silently desynchronises environments.

Run `npm run db:verify` after any schema change. It applies every migration and
the seed to a throwaway in-memory Postgres (PGlite — no Docker, no network) and
asserts the privacy guarantees.

## The privacy boundary is the point

Supplier identity, our costs and our margins must never reach a customer. Three
mechanisms enforce that, and all three must stay intact:

1. `portal_*` views physically omit those columns
   (`supabase/migrations/*_portal_views.sql`). Do not add `security_invoker=true`
   to them — the model depends on views running with the owner's privileges.
2. `portal_reader` is a Postgres role with **zero grants on any base table**.
   `src/lib/db/portal.ts` is the only thing that connects as it.
3. `eslint.config.mjs` makes it a build error for anything under
   `src/app/(portal)`, `src/lib/portal` or `src/components/portal` to import
   `@/lib/db/admin`.

`npm run db:verify` checks 1 and 2. `npm run lint` checks 3.

## Conventions

- Money is `numeric(14,2)`. Never float.
- Statuses are `text` + `CHECK`, never Postgres enums — enum values can never be
  removed or reordered.
- Prices are GST-inclusive unless a row sets `price_excludes_gst`.
- TCS is a **disclosure note, excluded from the quote total** — never a line
  item. Rate and wording live in the `settings` table, not in code.
- `quotation_items` and `services` share a core column set on purpose, so
  Won → Trip is a copy rather than manual re-entry. Change one, change both.
- Currency is INR throughout; the column exists so a second one is additive.
- No WhatsApp API. The "Copy message" button writes to the clipboard.
- No invoicing. Tally remains the book of record.

## Commands

```
npm run dev          # localhost:3002
npm run check        # lint + typecheck + schema/privacy verification
npm run db:verify    # migrations + seed + privacy assertions, offline
```
