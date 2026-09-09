# SkyMiles Travel OS — Design Review

**Reviewed:** 2026-09-08
**Source:** Project vision & rollout brief (Stages 0–5)

> ### Partly superseded — read this first
>
> This was the opening architecture review. The reasoning still holds and is
> worth reading, but several decisions were changed after discussion with the
> business. Where the two disagree, the list below wins.
>
> | Topic | This document says | Actual decision |
> |---|---|---|
> | Framework | Next.js 15 | **Next.js 16 + React 19** |
> | Currency | Multi-currency, FX per line item | **INR only.** No FX logic at all |
> | Location | Its own repo | **`my-web-app/travel-os/`**, nested in the live marketing site's repo |
> | Privacy views | Stage 3 | **Phase 2**, before the first public URL exists |
> | Customer login | Phone OTP (needs DLT / Meta) | **Email + password, plus magic link.** No DLT, no Meta |
> | WhatsApp API | Stage 4 integration | **Not being built.** Clipboard copy only |
> | Invoicing | GST invoices in Stage 2 | **None.** Tally stays the book of record |
> | Documents | Link-accessible in the portal | **Always behind login** — they carry passport and PAN details |
> | Reviews | Rating-based Google routing | **Internal only**, stored in the CRM, never displayed publicly |
> | Staff roles | admin/manager/agent/accounts with margin masking | **Admin only.** Role column exists; no masking built |
>
> Current plan of record: the phase-wise build plan agreed with the business.
> Current conventions: [CLAUDE.md](../CLAUDE.md).

---

## 1. Verdict

The architecture is sound. The three decisions that usually kill projects like this — UUID keys instead of phone numbers, household-level grouping, and internal-value-before-customer-adoption sequencing — you already got right. Most travel-agency systems fail on exactly those three.

What follows is not a rewrite. It's the set of gaps and decisions that need to be closed **before** the first `CREATE TABLE` runs, because each one is expensive to retrofit.

---

## 2. What to keep exactly as specified

| Decision | Why it's right |
|---|---|
| UUID primary keys, phone as attribute | Phone numbers change, get reassigned, and are shared between spouses. Also lets you merge duplicates without cascading key rewrites. |
| `Households` above `Customers` | This is what makes "husband books, wife travels, wife books next year" work. Most CRMs bolt this on later and fail. |
| Separate internal (Travel OS) and external (My SkyMiles Trip) systems | Correct security boundary and correct product boundary. |
| Quote versioning (V1 → V2) | Matches how negotiation actually happens. |
| `Customer_Price` vs `Supplier_Cost` on every service | Margin per line item, not per trip, is the right granularity. |
| Internal-first rollout | The team gets value in Stage 1. Customer adoption risk is deferred. |
| Rule-based upselling before AI | Correct. IF/THEN covers 90% of the value at 5% of the complexity. |

---

## 3. Gaps — entities the brief is missing

The nine core entities listed cover the happy path but leave holes that will surface in week two of Stage 1.

### 3.1 Critical (blocks the scenarios you described)

**`Staff_Users`** — There is no entity for *your team*. Every lead needs an owner, every quote a creator, every payment a recorder, every timeline event an actor. Without this, "who sent Quote V2?" is unanswerable and there is no accountability layer. Also required for permissions (an agent should not see company-wide margin).

**`Trip_Travellers`** (junction) — This is the missing table that actually solves your husband/wife/child example. A `Trip` needs a many-to-many link to `Customers` carrying a **role**: `booker`, `payer`, `lead_pax`, `traveller`. The husband can be `booker` + `payer` + not travelling. The wife and child are `traveller`. Without this junction, you'll end up storing pax as a text field and lose the whole relationship graph you built `Households` for.

**`Documents`** — The brief mentions vouchers, PDFs, passports, and "categorised documents" in the portal, but no entity. This needs to be polymorphic (attachable to a trip, service, customer, or payment) and — critically — carry a `customer_visible` boolean. **This flag is where your privacy rule is actually enforced.**

**`Quotation_Items`** — A quote is not a single number. "Dates, Hotels, Flights, Total Price" is a line-item structure. Needed for: building V2 by duplicating and editing one line, showing inclusions/exclusions, and carrying estimated cost so you know your margin *before* you send.

### 3.2 Important (needed by Stage 2–4, cheap to add now)

- **`Payables`** — Your "5 supplier payments due this week" alert needs a table of *scheduled obligations*, distinct from `Payments` (actual money movements). A payable has a due date and a status; a payment is a fact that happened.
- **`Itinerary_Days` / `Itinerary_Items`** — "Day-by-day itinerary" is a narrative structure, not just services sorted by date. Day 3 has a title ("Phi Phi Island Tour") and prose, plus optional links to services.
- **`Tags` + `Customer_Tags`** — Your preference engine query ("all luxury-preferring customers who haven't traveled in 18 months") needs indexed relational tags, not a JSON blob. Blob queries won't scale and can't be faceted in the UI.
- **`Reviews`** — Module 4's rating capture and routing decision has nowhere to live.
- **`Message_Log`** — Every WhatsApp/SMS/email send needs a record: template used, provider message ID, delivery status. Required for debugging, for dedup (don't send the same reminder twice), and because Meta will bill you per conversation.
- **`Customer_Relationships`** — Household membership covers grouping; explicit `spouse`/`child`/`parent` links let you auto-suggest travellers and compute child ages for pricing.
- **`Suppliers`** already listed — but add `payment_terms` and `credit_days`, which is what actually drives the payable due dates.
- **`OTP_Challenges` / `Portal_Sessions`** — Stage 3 auth state.
- **`Audit_Log`** — separate from `Timeline_Events`. See §4.4.

---

## 4. Decisions to lock before writing DDL

These six are the ones where changing your mind later means a migration with data loss risk.

### 4.1 Money representation and multi-currency

**Not decided in the brief. Must be.**

Two rules, non-negotiable:
1. **Never `float`/`double`.** Use `numeric(14,2)` (exact decimal in Postgres). A float will silently produce ₹52,999.9999999 in a margin calculation.
2. **Every money column needs a currency companion.**

The multi-currency question is real for you specifically: if you buy Thailand or Dubai land packages from a DMC billing in USD/THB/AED while the customer pays INR, then `Supplier_Cost` and `Customer_Price` are in different currencies and your margin is **not** a subtraction — it's a subtraction after an FX conversion, and the rate must be frozen at booking time or your reported margin drifts every day.

**Recommendation:** build currency-ready from day one even if you're 100% INR today. The cost is three extra columns per money field:

```
customer_price          numeric(14,2)
customer_currency       char(3)  default 'INR'
supplier_cost           numeric(14,2)
supplier_currency       char(3)  default 'INR'
fx_rate_to_inr          numeric(12,6) default 1.0   -- frozen at booking
supplier_cost_inr       numeric(14,2)               -- computed, stored
```

Retrofitting this later means recomputing every historical margin. Adding it now costs nothing if you're INR-only.

### 4.2 How the privacy rule is *enforced* (highest-risk item in the brief)

> "Supplier details, our costs, and our margins must NEVER be exposed to the customer-facing frontend."

Stating the rule is not enforcing it. The naive implementation — "just don't `SELECT` those columns in the portal code" — fails the first time someone adds a convenience endpoint or a debug log.

Also note a trap specific to Supabase: **Row Level Security filters rows, not columns.** If the customer portal talks to Supabase directly with the anon key and RLS lets them read their own `services` row, they can read `supplier_cost` on that row. The margin leaks in the network tab.

**Recommendation — three layers, all of them:**

1. **Physical separation via views.** The portal never touches base tables. It reads `portal_service_v`, `portal_trip_v`, `portal_document_v` — views that *do not contain* the cost, supplier, or margin columns at all. A column that isn't in the view cannot be selected.
2. **Server-side only.** The portal is Next.js Server Components / Route Handlers using a restricted Postgres role. No Supabase anon key with table access ships to the customer's browser.
3. **RLS on top** scoping every row to the authenticated customer's trips.

Then add a CI check: a test that asserts no `portal_*` view contains a column matching `/cost|supplier|margin/`. That converts a policy into something the build enforces.

### 4.3 Quote immutability

The brief says "duplicate Quote V1, adjust the price, save as Quote V2." Right instinct — make it a hard rule:

**Once a quote is `sent`, it is frozen. It is never edited — only superseded.**

Model: `quotations.parent_quotation_id` + `version` + status `superseded`. And store a **JSONB snapshot** of the rendered quote at send time. Reason: if you send V1 quoting "Novotel Phuket ₹8,400/night" and later correct that hotel's rate in your catalogue, the customer's V1 link must still show ₹8,400 — that's what you offered them. Without a snapshot, historical quotes silently rewrite themselves.

### 4.4 `Timeline_Events` vs `Audit_Log` — these are two different things

Your example timeline is *semantic and human-authored*:

> Aug 17: Customer requested cheaper hotel

That's not a database change. No trigger can generate it. Meanwhile "supplier_cost changed from 53000 to 54200 by Ravi at 14:32" is a compliance record nobody wants in the customer's story view.

**Recommendation — build both, keep them separate:**

- **`timeline_events`** — application-written, business-semantic, human-readable, includes a `note` type for manual entries by staff. This is the customer story. Attachable to customer / household / lead / trip / quotation simultaneously.
- **`audit_log`** — trigger-generated, `old_values`/`new_values` JSONB, covers financial tables. Nobody reads it until they need to.

Conflating them gives you a timeline too noisy to read and an audit trail too incomplete to trust.

### 4.5 Deduplication and merge

You're migrating from Excel. Duplicates are guaranteed — the same customer will exist as "Rajesh Kumar / 98765 43210" and "R. Kumar / +919876543210".

- Store phone **normalized to E.164** (`+919876543210`) in an indexed column, keep the raw input separately.
- Partial unique index on normalized phone where not merged.
- Merging must be **`merged_into_customer_id` tombstones, never `DELETE`** — old quotes, payments, and trips still point at the losing record and must keep resolving.

### 4.6 Two auth realms

Staff log in with email/password (or Google SSO). Customers log in with phone OTP. These are different trust levels in the same Supabase project.

**Recommendation:** one Next.js repo, two route groups — `app/(admin)` and `app/(portal)` — with separate Supabase clients, separate middleware, and a `role` claim in `app_metadata`. Single repo keeps shared types and one deploy; the route-group split plus §4.2's view layer keeps the boundary hard. A fully separate app is more isolation than a team your size needs to maintain.

---

## 5. Operational realities the plan should absorb

**WhatsApp Cloud API has a lead time, not a build time.** Meta Business verification plus message-template approval typically runs 1–3 weeks and can bounce. If you start it at Stage 4, Stage 4 stalls on paperwork.
→ **Start Meta Business verification during Stage 1.** Costs you nothing to have it approved and waiting.

**Stage 1 already kills most of the manual WhatsApp typing.** The "Generate URL" on a quotation gives a link you paste into WhatsApp by hand. That's ~80% of the pain relief for ~10% of the effort of the API integration. Worth knowing so Stage 4 doesn't feel urgent.

**Adoption risk is Stage 1's real risk, not tech.** If logging a lead in the OS is slower than typing a row in Excel, the team will keep using Excel and the whole project dies quietly. Design constraint: **quick-add lead must be ≤6 fields on one screen, keyboard-navigable, under 20 seconds.** Everything else is enrichment done later.

**Excel import is not optional.** Historical customers and trips must come across in Stage 1, or the team runs two systems and trusts neither. Budget real time for a CSV importer with a preview-and-map step.

**Indian tax fields.** Tour packages carry GST (5% without ITC, or 18% — depends on how you structure) and foreign remittances can attract TCS. I'm not advising on which applies to you — that's your CA's call — but the schema must **carry** `gst_rate`, `gst_amount`, `tcs_amount`, and `hsn_sac_code` on invoices from the start. Adding tax columns to historical invoices later is painful.

**Passport data is regulated PII.** Under India's DPDP Act, passport scans need: private buckets only, short-TTL signed URLs (never public URLs), an access log, and ideally a retention policy that purges scans some months after trip completion. Cheap to build in now, awkward to add after you're holding 2,000 passports.

---

## 6. Review gating — one flag, then it's your call

Module 4 routes 4–5 star ratings to Google and withholds the Google link from 1–3 star ratings. This practice is called **review gating**, and it is against Google's review policies — selectively soliciting reviews based on predicted sentiment. Enforcement is inconsistent, but the downside is a penalized or suppressed Business Profile, which is a bad trade for a travel agency that lives on local search.

**Compliant alternative that gets you the same business outcome:** ask everyone the rating, send the Google link to **everyone**, and use the score to drive the *internal* response — a 1–3 star result fires an immediate admin alert and a service-recovery task, so you reach the unhappy customer before they write. You still catch problems early; you just don't withhold the link.

I've built this as a **config toggle** (`REVIEW_ROUTING_MODE = gated | universal`) defaulting to `universal`, so the behaviour is a settings change, not a code change. Flip it to `gated` if you want the original spec — the code path is there either way.

---

## 7. Stack — agreed, with additions

Your picks are right. Next.js + Tailwind + Supabase is the correct stack for this, and it's the one AI-assisted development is strongest at.

| Layer | Decision |
|---|---|
| Framework | **Next.js 15 (App Router)** + TypeScript |
| Styling | **Tailwind + shadcn/ui** — added. Gives you a full admin component set (tables, dialogs, forms) for free; hand-rolling these is weeks of the budget. |
| DB / Auth | **Supabase (Postgres)** — agreed |
| Schema source of truth | **SQL migration files** in-repo + `supabase gen types typescript`. Skip Prisma/Drizzle — RLS and views are the core of your security model and are cleanest written as raw SQL. |
| Storage | **Supabase Storage**, private buckets — agreed. Prefer over S3: one less vendor, and RLS applies to objects. |
| Forms / validation | **react-hook-form + Zod** — added |
| Tables | **TanStack Table** — added, for the CRM grids |
| PDF | **URL-first.** The quote is a web page; PDF via browser print in Stage 1, server-side render in Stage 1.5. Serverless Chromium is fiddly enough that it shouldn't block the first release. |
| Email | **Resend** — added. Quotes will need email alongside WhatsApp. |
| WhatsApp | **Meta Cloud API** direct — agreed, cheapest. Interakt only if template management becomes a chore. |
| Hosting | **Vercel** |

---

## 8. Open questions

None of these block Stage 0 — I've assumed a safe default for each. Correct me where I'm wrong.

| # | Question | Assumed default |
|---|---|---|
| 1 | How many staff users, and do agents need to be blocked from seeing company-wide margin? | 3–10 users; roles `admin` / `manager` / `agent` / `accounts`, with margin visible to admin + manager only |
| 2 | Do you buy from foreign suppliers in foreign currency, or from Indian consolidators in INR? | Schema is currency-ready, default INR everywhere |
| 3 | Single office, or multiple branches needing separate pipelines? | Single agency, no tenant column |
| 4 | Roughly how many customers and past trips are in Excel today? | Under 5,000 rows; importer built for that scale |
| 5 | Are Stage 2 invoices legal GST invoices, or internal records with Tally staying the book of record? | Internal records; schema carries tax fields, Tally export in Stage 5 |
| 6 | Repo location and Git remote for this project | `D:\Github\skymiles-travel-os`, no remote yet |
