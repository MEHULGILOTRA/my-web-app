# CRM Field Reference

Every field in the CRM, its type, and how it validates. Derived from the
agency's working spreadsheet (`LD-1001` sample row) plus the fields that sheet
was missing.

**Legend** — 🔒 required · 📅 date picker · ▾ dropdown · ✎ free text · ∑ derived
(never typed) · 🔐 internal only, never reaches a customer

---

## 1. Your spreadsheet, mapped

| Spreadsheet column | Now lives at | Notes |
|---|---|---|
| `lead_id` | `leads.reference` | Auto-generated `LD-1001`, `LD-1002`… from a sequence |
| `lead_date` | `leads.lead_date` 📅 | Defaults to today |
| `client_name` | `customers.full_name` 🔒 | Fuzzy-searchable |
| `phone_number` | `customers.phone_raw` → `phone_e164` | Auto-normalised; unique per live customer |
| `email` | `customers.email` | Becomes required for portal login in Phase 4 |
| `city_origin` | `customers.city` + `leads.origin_city` | Split: where they live vs where this trip departs |
| `customer_type` | `customers.customer_type` ▾ | New / Repeat / Referral / Corporate / VIP |
| `destination` | `leads.destination` ✎ | Free text — "Bali (Ubud + Kuta)" |
| `trip_type` | `leads.is_international` | Boolean. **Drives the TCS note** |
| `travel_start_date` | `leads.travel_start` 📅 | |
| `duration_nights` | `leads.duration_nights` | Auto-syncs with `travel_end` both ways |
| `pax_adults` | `leads.pax_adults` | Default 1 |
| `pax_children` | `leads.pax_children` | Default 0 |
| `children_age` | `leads.children_ages` | Integer array; **count must match `pax_children`** |
| `travel_theme` | `leads.travel_theme` ▾ | Editable list |
| `hotel_category` | `leads.hotel_category` ▾ | Editable list |
| `meal_preference` | `leads.meal_plan` ▾ | EP/CP/MAP/AP/AI |
| `flights_status` | `leads.flights_status` ▾ | |
| `visa_status` | `leads.visa_status` ▾ | |
| `transfers_status` | `leads.transfers_status` ▾ | |
| `client_budget_inr` | `leads.budget_min` / `budget_max`, `quotations.client_budget` | Sheet had one number; a range is more useful |
| `net_supplier_cost_inr` | ∑ 🔐 `quotation_financials_v.est_supplier_cost` | Summed from line items, not typed |
| `gross_quote_inr` | `quotations.total` | |
| `gross_margin_inr` | ∑ 🔐 `quotation_financials_v.gross_margin` | Derived — cannot disagree with the lines |
| `tcs_rate_percent` | `quotations.tcs_rate_percent` | Defaults from Settings |
| `tcs_amount_inr` | ∑ `quotations.tcs_amount` | Derived |
| `total_payable_inr` | ∑ `quotations.total_payable` | Derived: `total + tcs_amount` |
| `assigned_agent` | `leads.owner_staff_id` ▾ | A real user, not a text name |
| `pipeline_stage` | `leads.status` ▾ | |
| `quote_version` | `quotations.version` | Real versioning: V1 frozen, V2 supersedes |
| `lead_priority` | `leads.priority` ▾ | Hot / Warm / Cold |
| `next_followup_date` | `leads.next_followup_date` 📅 | Indexed — drives the dashboard |
| `lost_reason` | `leads.lost_reason` ▾ | Editable list |
| `special_notes` | `leads.special_notes` ✎ | |

### The four money columns are now derived

In the spreadsheet, `gross_margin_inr` and `total_payable_inr` are typed by
hand, so they can silently disagree with the numbers above them. Here they are
computed by the database:

```
gross_margin  = quote total − Σ(supplier cost × qty)
tcs_amount    = round(total × tcs_rate / 100)   [international only]
total_payable = total + tcs_amount
```

Your sample row is pinned as a regression test in `npm run db:verify`:
₹2,60,000 quote − ₹2,25,000 cost = ₹35,000 margin (13.46%), TCS ₹5,200,
payable ₹2,65,200.

---

## 2. Fields added beyond the spreadsheet

### Customers

| Field | Type | Why |
|---|---|---|
| `whatsapp_raw` / `whatsapp_e164` | phone | Often differs from the calling number |
| `alternate_phone_raw` / `_e164` | phone | Second contact for the household |
| `city`, `state`, `country` | ✎ | `country` defaults to India |
| `company_name`, `gstin` | ✎ | Corporate clients. GSTIN format-validated |
| `preferred_language` | ✎ | |
| `referred_by_customer_id` | link | Who referred them — closes the referral loop |
| `marketing_consent` + `_at` | ✔ 📅 | **DPDP.** Campaigns must prove consent; timestamp is set automatically |
| `passport_number`, `passport_expiry` 📅, `passport_given_name`, `passport_surname`, `passport_issue_place` | 🔐 | International ticketing. See §5 |
| `dob`, `anniversary` | 📅 | Birthday/anniversary campaigns. Indexed by month+day |

### Leads

| Field | Type | Why |
|---|---|---|
| `insurance_status` ▾ | | Your sheet tracked flights/visa/transfers but not insurance — a routine upsell |
| `forex_status` ▾ | | Same. Forex was in your cross-sell list |
| `activities_status` ▾ | | Same |
| `room_configuration` ▾ | | 1 Double + 1 Twin, etc. Needed before any hotel can be quoted |
| `dietary_preference` ▾ | | Separate from meal plan — Jain/vegan is a person, CP/MAP is a rate |
| `preferred_airline` ✎ | | |
| `last_contacted_at` | 📅 | With `next_followup_date`, answers "who have we gone quiet on?" |
| `expected_close_date` 📅, `probability_percent` | | Weighted pipeline forecasting |
| `special_occasion` ✎ + `special_occasion_date` 📅 | | Honeymoon and anniversary trips have a date that matters |
| `lost_to_competitor` ✎ | | Which agency won it |

---

## 3. Dropdowns

Two kinds, and the difference matters.

**Editable in Settings** — stored in `option_sets`, changed without a deploy.
Add a "Golf" travel theme yourself whenever you like.

**Fixed in code** — `pipeline_stage`, `priority`, service statuses. The
application branches on these, so changing one needs a code change too. Their
*display labels* are still editable.

| Dropdown | Values |
|---|---|
| `customer_type` | New · Repeat · Referral · Corporate · VIP |
| `travel_theme` | Honeymoon · Family Holiday · Leisure · Adventure · Beach · Pilgrimage · Wildlife/Safari · Wellness/Spa · Corporate/MICE · Group Tour · Solo · Cruise |
| `hotel_category` | Budget · 3-Star · 4-Star · 5-Star · 5-Star Luxury · Boutique · Resort · Private Villa · Homestay · Houseboat |
| `meal_plan` | EP (Room Only) · CP (Breakfast) · MAP (Half Board) · AP (Full Board) · AI (All Inclusive) |
| `dietary_preference` | No Restriction · Vegetarian · Jain · Vegan · Halal · Gluten Free |
| `room_configuration` | 1 Double · 1 Twin · 2 Double · 1 Double + 1 Twin · Family Room · Suite · Connecting Rooms |
| `flights_status` | Not Required · Needed – Agency to Quote · Client Booking Own · Quoted · Booked · Cancelled |
| `visa_status` | Visa on Arrival / Not Applicable · e-Visa Required · Sticker Visa Required · Client Has Valid Visa · In Process · Approved · Rejected |
| `transfers_status` | Not Required · Private Cab Required · Shared Transfer · Self Drive · Client Arranging · Booked |
| `insurance_status` | Not Required · Recommended · Quoted · Booked · Client Has Own |
| `forex_status` | Not Required · Requested · Quoted · Delivered |
| `activities_status` | Not Required · To Be Planned · Quoted · Booked |
| `lost_reason` | Budget Too High · Booked Elsewhere · Dates Changed · Trip Cancelled · No Response · Just Exploring · Visa Rejected · Duplicate Enquiry · Other |
| `pipeline_stage` 🔒 | New Enquiry · Contacted · Requirements Logged · Quote Sent · Negotiating/Revising · Won / Booking Confirmed · Lost · Dormant |
| `priority` 🔒 | Hot · Warm · Cold |

Invalid values are rejected by the database, not just by the form — so a bad
import cannot quietly write "5 Star Delux" into `hotel_category`.

---

## 4. Validation rules

| Rule | Enforced how |
|---|---|
| One live customer per phone number | Unique index on `phone_e164`, excluding merged records |
| Phone accepted in any format | Trigger normalises to E.164 before storing |
| `children_ages` count must equal `pax_children` | Trigger. Prevents quoting a child rate for a phantom child |
| `travel_end` and `duration_nights` always agree | Trigger fills whichever is missing |
| `budget_max ≥ budget_min` | CHECK |
| `probability_percent` between 0 and 100 | CHECK |
| `duration_nights` between 0 and 365 | CHECK |
| GSTIN must match the statutory format | CHECK regex |
| A customer cannot refer themselves | CHECK |
| A sent quotation must carry its frozen snapshot | CHECK |
| Money is exact to the paisa | `numeric(14,2)` — never floating point |
| Inbound payment needs a customer; outbound needs a supplier | CHECK |
| A purge cannot happen before the export | CHECK on `deletion_requests` |
| `lost_at` stamped automatically when a lead is lost | Trigger — drives the 90-day purge |

---

## 5. Passport data — collect late

Five structured fields now exist because a scanned passport is useless for
issuing a ticket; someone has to read it and retype it, which is where name
errors come from. `passport_given_name` and `passport_surname` are separate from
`full_name` on purpose — the name on a ticket must match the passport exactly,
and it frequently differs from the name a customer gives you.

**Collect these only once an international trip is confirmed. Never at
enquiry.** Every identity document held is a liability under the DPDP Act. The
existing deletion flow purges them with the customer, and `documents` already
flags passport and PAN scans as sensitive and keeps them behind login.

---

## 6. Fields deliberately not added

**Per-line-item currency and FX rate.** You confirmed INR only. The `currency`
column exists and defaults to INR so a second currency is an additive change,
but no FX machinery is built.

**Invoice fields.** No customer invoices are issued from this system; Tally
remains the book of record.

**A `travel_agent` text column.** `owner_staff_id` points at a real user
instead, so "Pranjul" cannot become "pranjul", "PG" and "Pranjul G" across
three rows.

**A `total_payable` column you can type.** It is derived. If it were editable it
would eventually disagree with the quote.
