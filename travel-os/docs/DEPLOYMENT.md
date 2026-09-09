# Deploying SkyMiles Travel OS

Two products, one Next.js deployment, two hostnames:

| Hostname | Serves | Route group |
|---|---|---|
| `admin.skymilestravels.com` | Internal CRM | `src/app/(admin)` |
| `my.skymilestravels.com` | Customer portal | `src/app/(portal)`, `/my/*` |
| `skymilestravels.com` | Marketing site — **a different project** | `web/` |

One deployment rather than two means one build, one set of environment
variables, and no shared component duplicated across projects. `src/proxy.ts`
reads the `Host` header and decides which realm a request belongs to.

The portal hostname is rewritten onto the `/my` prefix, so a customer sees
`my.skymilestravels.com/trips`, never `/my/trips`. The admin hostname refuses
to serve `/my/*` at all — otherwise every page would exist at two addresses,
which splits sessions and confuses search engines.

Locally there are no subdomains, so `localhost:3002` falls back to path-based
routing exactly as during development: `/` is the CRM, `/my` is the portal.
`my.localhost:3002` and `admin.localhost:3002` also work in Chrome and Firefox
with no hosts-file entry.

---

## Before you push: the secrets check

```bash
cd travel-os && npm run check:secrets
```

It scans exactly what git would include — staged files if any, otherwise
tracked plus untracked-not-ignored — so an ignored `.env.local` is never a
false positive and a mistakenly `git add -f`'d one is never missed. It looks
for real credential shapes: Supabase JWTs, `sb_secret_` keys, Postgres URLs
carrying a password, AWS keys, private-key blocks, Razorpay live keys, Resend
keys, and any `.env` file that is not ignored.

It is wired into `npm run check`, so the full gate is:

```bash
cd travel-os && npm run check
```

That runs secrets → lint → typecheck → chokepoints → schema and privacy
assertions. All five must pass before pushing.

### Already in git history — not fixable by a new commit

Two files committed long before this app existed contain live EmailJS
credentials:

- `src/emailServiceClient.js`
- `START_HERE.md`

They are in history permanently. Rewriting history on a shared branch is worse
than the leak. What actually matters:

1. **Turn on domain allowlisting in the EmailJS dashboard today.** The template
   takes `to_email` as a client-supplied parameter, which makes it an open
   relay — anyone reading the bundle can send mail from your account to any
   address. Allowlisting `skymilestravels.com` shuts that off immediately.
2. Change the template so the recipient is fixed server-side.
3. Delete `src/emailServiceClient.js` when the marketing site is replaced.

The public key itself is designed to be public; the relay is the real problem.

---

## Pushing

The CRM has never been committed. It is 149 files.

```bash
cd D:/Github/my-web-app

# 1. Confirm what will be included, and that no .env is among it
git status --porcelain -uall travel-os | head -20
git check-ignore travel-os/.env.local && echo "env ignored — good"

# 2. The gate
cd travel-os && npm run check && cd ..

# 3. Stage deliberately — never `git add -A` in this repo, because it would
#    also sweep in the marketing rebuild in web/
git add .vercelignore travel-os

# 4. Verify the staged set one more time
git diff --cached --name-only | wc -l
git diff --cached --name-only | grep -i "\.env" || echo "no env files staged"

git commit -m "Add Travel OS: internal CRM and customer portal"
git push -u origin redesign/premium-site
```

`.vercelignore` is staged alongside deliberately. It carries the entry
excluding `travel-os` from the marketing site's build, and that entry is
currently **uncommitted**. Committing the CRM without it means the marketing
deployment starts uploading the whole CRM.

---

## Vercel setup

The CRM is a **separate Vercel project** from the marketing site, pointed at
the same repository.

| Setting | Value |
|---|---|
| Root Directory | `travel-os` |
| Framework | Next.js (auto-detected) |
| Production Branch | `develop` |

Setting Root Directory to `travel-os` means the repo-root `vercel.json` is
never read. That matters: it uses the legacy `builds` + `routes` schema, which
would otherwise override framework detection entirely.

### Domains

Add both to this project:

- `admin.skymilestravels.com`
- `my.skymilestravels.com`

Vercel will show the exact DNS records. Both are `CNAME` records at whoever
hosts the `skymilestravels.com` zone:

```
admin   CNAME   cname.vercel-dns.com
my      CNAME   cname.vercel-dns.com
```

Leave the apex (`skymilestravels.com`) alone — it belongs to the marketing
project.

### Environment variables

Set these in **Project Settings → Environment Variables**, for Production,
Preview and Development. Never in a file.

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Safe in the browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Safe in the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | **Bypasses all row-level security.** Server only |
| `PORTAL_DATABASE_URL` | `portal_reader` connection. No `sslmode` in the URL — see below |
| `PORTAL_DB_CA_CERT` | Supabase CA, PEM on one line. See below |
| `QUOTE_LINK_SECRET` | Signing secret for public quotation links |
| `RESEND_API_KEY` | Phase 6 |
| `RAZORPAY_KEY_ID` / `_SECRET` / `_WEBHOOK_SECRET` | Phase 5 |

`.env.example` lists all of them with empty values and is safe to commit.

**Do not put `sslmode` in `PORTAL_DATABASE_URL`.** Recent `pg` versions read
`sslmode=require` as full chain verification, which fails against Supabase's
per-project self-signed CA. TLS is configured in `src/lib/db/portal.ts`
instead.

**Set `PORTAL_DB_CA_CERT` before production traffic.** Without it the portal
connection is encrypted but the certificate chain is unverified. Download the
CA from Supabase → Settings → Database → SSL Configuration.

---

## After the first deploy

```bash
# Apply migrations to the production database
cd travel-os
npx supabase db push --db-url "$SUPABASE_DB_URL"

# Give portal_reader a login password, once, out of band.
# A migration must never contain a password, so this is manual by design.
#   alter role portal_reader with login password '<generate a strong one>';
# Then set PORTAL_DATABASE_URL in Vercel with that password.

# Verify against the real database — including the live negative tests that
# prove portal_reader cannot read supplier costs or margins
node scripts/verify-remote.mjs
```

Then create the first staff account:

```bash
node scripts/create-staff.mjs "you@skymilestravels.com" "<strong password>" "Your Name" admin
```

Staff cannot be created by ordinary signup, by design: the auth trigger only
writes a `staff_users` row when `app_metadata.user_type` is `staff`, and that
is only settable with the service-role key. Otherwise anyone registering for
the customer portal would become a staff member with access to margins.

---

## Rotate before going live

These were shared in a chat transcript during development and should be
regenerated in the Supabase dashboard:

- `SUPABASE_SERVICE_ROLE_KEY`
- The database password
- The `portal_reader` password
- The temporary admin account password

---

## Verifying a deployment

```bash
curl -sI https://admin.skymilestravels.com/ | head -1   # 307 -> /login when signed out
curl -sI https://my.skymilestravels.com/    | head -1   # 200
```

Then in a browser:

- `admin.skymilestravels.com` redirects to `/login`, and signs in with a
  password.
- `admin.skymilestravels.com/my` redirects to `/` — the portal is not
  reachable from the CRM hostname.
- `my.skymilestravels.com` serves the portal, and the address bar never shows
  `/my`.
- DevTools on any customer-facing response shows **no** supplier name, cost or
  margin field.
