# SkyMiles Travel OS — build progress

## Phase 0 — Foundation ✅ complete (2026-09-08)

- [x] Next 16.3.4 + React 19.2.8 scaffold in `travel-os/`, Tailwind v4 CSS-first, `@/*` alias
- [x] shadcn/ui initialised **before** brand tokens written (its init rewrites `globals.css`)
- [x] Brand tokens inherited from the live site's `src/App.css`
- [x] `bg-brand-gradient` utility (Tailwind v4 won't build gradients from `@theme` vars)
- [x] Lead-stage and payment-state palettes in `@theme static`
- [x] Route groups `(admin)` / `(portal)`, both rendering
- [x] ESLint portal→admin import boundary, **proven to fail the build**
- [x] `src/lib/db/admin.ts` (staff + service-role) and `src/lib/db/portal.ts` (`portal_reader`)
- [x] Lazy env validation so builds succeed without credentials
- [x] 9 layered migrations, RLS enabled per table in the same migration
- [x] Seed fixture with real supplier costs and a deliberate near-duplicate customer
- [x] Offline schema verification via PGlite — no Docker needed
- [x] Turbopack root pinned (was inferring the marketing site as workspace root)
- [x] `travel-os` added to root `.vercelignore`
- [x] Dev server registered on port 3002
- [x] **Live marketing site still builds, root files untouched**

### Verification evidence

| Check | Result |
|---|---|
| `npm run lint` | clean; boundary probe correctly rejected |
| `npm run typecheck` | clean (needs `next typegen` first for `LayoutProps`) |
| `npm run db:verify` | 9 migrations + seed apply; seed idempotent; 5/5 privacy assertions pass |
| `npm run build` | `/` and `/my` prerendered |
| Root `npm run build` | "Compiled successfully" — live site unaffected |
| Browser | tokens resolve; gradient `135deg #2A2A72→#7B1FA2`; Geist loads; no console errors |

### Review

Three real defects were caught by verifying rather than assuming:

1. **Stage colours were invisible.** Tailwind v4 tree-shakes `@theme` variables it
   cannot see used. The stage palette is only ever referenced through a runtime
   template string (`var(--color-stage-${status})`), so every badge rendered
   transparent. Fixed with `@theme static`. This would have shipped unnoticed.
2. **Turbopack picked the wrong workspace root** — the parent `package-lock.json`
   of the live marketing site. Pinned in `next.config.ts`.
3. **`font-sans` resolved to nothing.** create-next-app emits `--font-geist-sans`
   but shadcn's `@theme inline` maps `--font-sans`. Renamed in `layout.tsx`.

Also dropped the `pgcrypto` extension: `gen_random_uuid()` has been core since
Postgres 13 and it was the only function used.

---

## Phase 0.5 — Live database connected ✅ (2026-09-08)

Supabase project `uvknsvtauanouojqlxjt`, Postgres 17.6, region as provisioned.

- [x] `.env.local` written (gitignored; `!.env.example` exception added so the
      template stays tracked)
- [x] All 9 migrations pushed to the live database via `supabase db push --db-url`
- [x] `portal_reader` granted a login password, sourced from `PORTAL_DATABASE_URL`
      so the two cannot drift
- [x] Seed applied to the remote database
- [x] Privacy assertions refactored into `scripts/privacy-assertions.mjs`, shared
      by the offline and remote verifiers so they cannot diverge
- [x] `npm run db:setup-remote` — **live negative test passes**

### Live negative test results (connected as `portal_reader`)

| Attempt | Result |
|---|---|
| `select * from portal_trip_v` | ✅ allowed (1 row) |
| `select * from portal_service_v` | ✅ allowed (4 rows) |
| `select supplier_cost from services` | ✅ **permission denied** |
| `select margin from services` | ✅ **permission denied** |
| `select from suppliers` | ✅ **permission denied** |
| `select from payables` | ✅ **permission denied** |
| `select est_supplier_cost from quotation_items` | ✅ **permission denied** |
| `select from customers` | ✅ **permission denied** |
| `insert into leads` | ✅ refused |

This is the proof the offline verifier cannot give: the role genuinely cannot
reach cost data on the real database.

### TLS note

`sslmode=require` was removed from `PORTAL_DATABASE_URL`. Recent `pg` versions
read it as full chain verification, which fails against Supabase's per-project
self-signed CA. TLS is now configured in code: set `PORTAL_DB_CA_CERT` to the
downloaded CA and the chain is verified; without it the connection is encrypted
but unverified. **Set the CA before this carries live customer data.**

---

## Phase 0.6 — Real CRM field set ✅ (2026-09-08)

Driven by the agency's working spreadsheet (`LD-1001` sample row). New migration
`20260908100000_crm_fields.sql`, pushed and verified against the live database.

- [x] `option_sets` table — business-editable dropdowns, validated by trigger
      (a CHECK constraint cannot contain a subquery)
- [x] 15 dropdowns seeded, ~90 options
- [x] Customers: WhatsApp + alternate phone, city/state/country, company + GSTIN
      (format-checked), referral link, **marketing consent for DPDP**, and the
      five structured passport fields
- [x] Leads: lead_date, origin_city, duration_nights, children_ages, travel
      theme / hotel category / meal plan / dietary / room config, six component
      statuses (added insurance, forex, activities), priority, next_followup_date,
      last_contacted_at, expected_close_date, probability, special occasion
- [x] Auto-generated references: `LD-1001…` for leads, `SKY-2026-0001` for trips
- [x] **TCS corrected** — `tcs_amount` and `total_payable` are now generated
      columns. The quote excludes TCS; the customer pays total + TCS
- [x] `quotation_financials_v` / `trip_financials_v` — admin-only margin rollups,
      explicitly revoked from `portal_reader`
- [x] Financial regression test pinned to the sample row

### Financial assertions (run in both verifiers)

₹2,60,000 quote − ₹2,25,000 cost = ₹35,000 margin (13.46%) · TCS ₹5,200 ·
payable ₹2,65,200. All six pass offline and against the live database.

### Fixed

- `npm run db:verify` exited 255 on a fully green run — PGlite leaves a libuv
  handle open on Windows and the process aborts during teardown. Explicit
  `process.exit(0)` added, or CI would fail on success.

### Blocked

- [ ] `npx supabase login` — one-time browser auth, needed for `npm run db:types`.
      The `--db-url` form of the type generator shells out to Docker, which is not
      installed; `--project-id` uses the Management API instead and needs the CLI
      authenticated. Not blocking Phase 1 work, only generated types.
- [ ] Rotate the `service_role` key and database password — they were pasted into
      a chat transcript.
- [ ] `PORTAL_DB_CA_CERT` before production traffic.

---

## Phase 1 — CRM v1: Leads → Quotation text (in progress)

- [x] Admin auth (Supabase email + password), `auth.users` → `staff_users` sync
- [x] App shell: sidebar, Cmd+K palette, toasts
- [x] Dashboard: stage counts, follow-ups due, recently added
- [x] **Quick-add lead — 6 fields, `N` hotkey, verified working**
- [x] **Magic-link login** for staff, with password kept as fallback
- [x] Lead list with stage filters + search; lead detail with timeline
- [x] Stage transitions, lost-reason capture
- [x] Customers list (name/phone/email search) + detail with imported history
- [x] Quotation builder — line items, live margin, GST-inclusive totals, TCS
- [x] **"Copy quotation" → WhatsApp-ready text**
- [x] Quote versioning V1 → V2, frozen on send
- [ ] Excel import: customers + households, past trips → `legacy_trips`
- [ ] `merge_customer()` SQL function

### Auth: magic link

`shouldCreateUser: false` is the security model — with it true, anyone typing
any address into the login form would have an account created and be signed
straight into the CRM. Staff accounts are created only by
`scripts/create-staff.mjs`.

`/auth/callback` checks *which realm* the account belongs to after establishing
the session: staff go to the CRM, a customer with a portal account goes to
`/my`, anything else is signed out. Without that check a customer's magic link
would open the CRM.

`scripts/magic-link.mjs` prints a working link without sending email — Supabase's
built-in SMTP allows only a few messages an hour. **Configure a custom SMTP
provider (Resend) before real use**, or staff will hit the rate limit.

### Quotation text format

Renders with WhatsApp's own markup (`*bold*`, `_italic_`), structured by blank
lines because WhatsApp has no headings or tables. Per-unit maths is shown only
when quantity is above one. TCS appears after the total and is never folded into
it. Verified against the real Bali quote: total ₹2,60,000, TCS ₹5,200, payable
₹2,65,200, margin ₹35,000 (13.5%).

### Verified in the browser

| Check | Result |
|---|---|
| Signed-out visit to `/` | redirects to `/login` |
| Sign in | lands on dashboard, sidebar renders |
| Dashboard data | 4 open leads, correct stage counts, ₹2.80L formatting |
| `N` hotkey | opens quick-add, focus on name field |
| New phone number | created LD-1002 + new customer |
| **Same customer, messy format** | `0982 901 2345` matched stored `+919829012345` — LD-1003 linked to the existing Amit Singhania, no duplicate |

### Three bugs found by testing, not assumption

1. **Auth trigger never fired.** Supabase's `admin.createUser` inserts the
   auth.users row and applies `app_metadata` as two separate steps, so the
   AFTER INSERT trigger saw no `user_type` marker and correctly did nothing.
   Proved by inserting into `auth.users` directly with metadata present (inside
   a rolled-back transaction) — the trigger fired. Fixed with an AFTER UPDATE
   trigger, and `create-staff.mjs` now writes the staff row explicitly rather
   than depending on a third party's internal write ordering.
2. **First lead created through the UI failed** on
   `leads_reference_key` — the sequence starts at 1001 and the imported data
   already contained `LD-1001`. The trigger now skips taken references, and the
   sequences are advanced past existing data. This would have broken the Excel
   import too.
3. **Build failed prerendering `/login`** — `useSearchParams()` needs a Suspense
   boundary. Made the page a Server Component that reads `searchParams` (a
   Promise in Next 16) and passes it down.

### Test data left behind

`LD-1002` (Meera Raghavan) and `LD-1003` (Amit Singhania — Maldives) were created
while verifying. Delete whenever; harmless.

## Phase 1.5 — Lead editing, real dropdowns, documents (2026-09-08)

Driven by a second data export from the agency. Migration
`20260908150000_lead_fields_and_docs.sql`.

- [x] **Full lead edit form** at `/leads/[id]/edit` — every field, 16 dropdowns,
      3 native date pickers, sticky save bar
- [x] **Only name and contact number are required.** Everything else optional
- [x] **Age per child**, inputs appearing dynamically as the child count is typed
      (the database refuses an array whose length disagrees with `pax_children`)
- [x] Trip type as a Domestic / International dropdown
- [x] Lead date, origin city, duration in nights, travel-month fallback
- [x] **New pipeline stage: Revision Requested** — the export named a step the
      schema lacked, sitting between quote sent and active negotiation. Adding a
      value mid-order is exactly why statuses are `text` + CHECK, not an enum.
- [x] Dropdown wording replaced with the agency's own, verbatim
- [x] **Document upload** on leads: private bucket, random storage path,
      `customer_visible` off by default, short-lived signed URLs
- [x] `npm run check:chokepoints` — CI guard that `createSignedUrl` and the
      service role key never spread beyond their one or two files

### Verified in the browser

| Check | Result |
|---|---|
| Edit form loads LD-1001 | name, phone, 3 dates, 16 dropdowns all populated |
| Required fields | exactly `full_name` and `phone` |
| Child count 0 → 2 | two required age inputs appear |
| Save | ages `[8, 11]` and hotel `4_star` persisted; detail shows "2 adults, 2 child" |
| Document upload | stored at `lead/<id>/<uuid>.txt` — not the filename, so the path leaks no customer name |
| Download | `document_access_log` row written with actor, IP and user agent |

### Fixed while building

- `setOpen` inside an effect (cascading-render lint error). The upload panel now
  stays open and resets instead — better anyway, since documents arrive in
  batches: tickets, then vouchers, then the visa.
- The chokepoint rule initially flagged `db/admin.ts` for holding the service
  role key, which is legitimate. Scoped to the two files that genuinely handle it.

---

### Still needed from the business

The customer Excel file, for the importer.

---

## Later phases

2 — shareable `/q/[token]` + privacy views + Won→Trip ·
3 — trips, services, documents ·
4 — customer portal with cross-sell and group invites ·
5 — Razorpay ·
6 — retention, reviews, email ·
7 — WhatsApp API only if ever wanted
