# EpoxyGarageFloors.ai

A nationwide lead-generation marketplace: homeowners answer a few quick questions,
get an instant price range, and get matched with one certified epoxy garage floor
installer from the network. Installers join free; 1-3 "Premium" installers per
market (by market size) pay for top placement and priority leads.

Built as a static site + Netlify Functions, backed by Supabase (Postgres + auth),
Resend (email), and Stripe (Premium subscriptions).

## Project layout

```
public/                   the deployed site (Netlify `publish` directory)
  index.html               homepage + instant quote lead form
  thank-you/                post-submit confirmation page
  contractors/              "join the network" free signup + tier comparison
  dashboard/                contractor login (magic link) + leads + upgrade
  epoxy-garage-floor-cost/  generated SEO cost-guide pages, one per state + a hub index
  css/style.css             shared theme (black/white + amber accent)
  js/                        quote form logic, pricing calc, dashboard, etc.
  images/                    logo + project gallery photos
  sitemap.xml, robots.txt   generated alongside the cost-guide pages
netlify/functions/         serverless backend
  submit-lead.js            validates lead, computes price, matches a contractor, emails both sides
  contractor-signup.js      free-tier contractor application
  create-checkout-session.js  Stripe Checkout for Premium upgrade (enforces per-state cap)
  stripe-webhook.js         marks a contractor Premium once payment completes
  public-config.js          hands the browser the Supabase URL + anon key
  _lib/                     shared helpers (pricing, matching, email, validation)
scripts/generate-location-pages.js   builds the /epoxy-garage-floor-cost/ pages (see below)
supabase/schema.sql         run this once in the Supabase SQL editor
netlify.toml                build + redirect config
```

## Nationwide SEO landing pages

`public/epoxy-garage-floor-cost/` holds one static page per state (plus a hub
index at `/epoxy-garage-floor-cost/`) so homeowners searching for
"epoxy garage floor cost in [state]" land directly on a relevant page instead
of only the homepage. Each page shows directional pricing by garage size and
finish (reusing `netlify/functions/_lib/pricing.js`, scaled by a rough
regional multiplier from `netlify/functions/_lib/markets.js`), an FAQ block
with `FAQPage` schema, and a CTA into the homepage quote form with the state
pre-selected (`/?state=XX#quote` — handled in `public/js/quote.js`).

These are generated, committed static files — there's no build step in
Netlify. Re-run the generator and commit the output whenever pricing, copy,
or the state list changes:

```
npm run generate:locations
```

This also regenerates `public/sitemap.xml` and `public/robots.txt`.

## How matching works

- Every lead records a `state`. `netlify/functions/_lib/matching.js` looks for an
  **approved Premium** contractor in that state first (round-robin by
  `last_matched_at`), then falls back to an **approved free** contractor, then
  leaves the lead unmatched if the state has no coverage yet.
- Premium slots are capped per state in `netlify/functions/_lib/markets.js` —
  3 in large states, 2 in medium states, 1 elsewhere. This is a starting
  heuristic; swap it for metro-level markets once there's enough contractor
  density to justify it.
- With no Supabase keys configured, everything runs in **demo mode**: leads
  "match" to a placeholder contractor and emails are logged to the function
  console instead of sent, so you can click through the whole site before any
  services are wired up.

## Setup

### 1. Supabase

1. Create a project at supabase.com.
2. Open the SQL editor and run `supabase/schema.sql`.
3. In **Authentication > Providers**, make sure Email is enabled. In
   **Authentication > URL Configuration**, add your Netlify site URL (and
   `http://localhost:8888` for local dev) to Redirect URLs — the contractor
   dashboard uses magic-link login.
4. Grab `Project URL`, `anon` key, and `service_role` key from
   **Project Settings > API**.

### 2. Resend (email)

1. Create an account at resend.com and verify a sending domain (or use their
   test domain while developing).
2. Create an API key.

### 3. Stripe (Premium subscriptions)

1. Create a Product called "Premium Installer" with a recurring monthly Price.
   Copy the Price ID.
2. Get your secret key from **Developers > API keys**.
3. After your first deploy, create a webhook endpoint in **Developers >
   Webhooks** pointing at `https://<your-site>/api/stripe-webhook`, subscribed
   to `checkout.session.completed` and `customer.subscription.deleted`. Copy
   the signing secret.

### 4. Netlify

1. Push this repo, then create a new Netlify site from it (or connect via the
   Netlify CLI: `netlify init`).
2. In **Site settings > Environment variables**, add every variable from
   `.env.example` with your real values.
3. Deploy. Netlify reads `netlify.toml` automatically — the site is served
   from `public/` and functions from `netlify/functions/`.

### Local development

```
npm install
npx netlify dev
```

This runs the site + functions together at `http://localhost:8888` using
whatever env vars are in your shell or a local `.env` file (gitignored).

## Content

Project photos live in `public/images/gallery/`. The homepage gallery is
driven by `public/js/gallery-data.js` — add an entry there for each new photo
and it shows up on the homepage with no other changes needed.
