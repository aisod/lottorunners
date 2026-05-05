
## Goal

Re-skin the existing customer prototype to match the 8 uploaded Stitch screens. Same flow, same logic — new look, layout and a few small UX additions (saved places, urgency, schedule now/later, persistent bottom tab bar).

## Design system update (`src/styles.css`)

Adopt the Stitch palette (already consistent across all 8 DESIGN.md files):

- `--background` → `#f9f9ff` (cool off-white)
- `--card` → `#ffffff`
- `--secondary` / surface-container → `#e9edff` / `#f1f3ff`
- `--primary` (brand blue, used for headings, buttons, icons) → `#005d98`
- `--accent` → `#0076c0`
- `--border` → `#c0c7d3`
- `--destructive` → `#ba1a1a` (used for SOS)
- Headings: switch from `Archivo Black` to a clean modern sans (Stitch screens use Inter / SF-style) — keep Archivo as fallback. Brand wordmark stays bold uppercase blue `LOTTO RUNNERS`.
- Card radius bumped to `1rem`+; soft tinted shadows.

## Layout shell

New persistent **bottom tab bar** (`src/components/bottom-tab-bar.tsx`) with Home / Activity / Wallet / Profile. Always visible except during active trip tracking.

New routes (file-based, TanStack):
- `src/routes/activity.tsx` — reuses existing trip history UI as a full page
- `src/routes/wallet.tsx` — simple wallet stub (balance + top-up button + recent transactions placeholder)
- `src/routes/profile.tsx` — name, phone, saved places, sign out
- `src/routes/auth.verify.tsx` — OTP verify screen (screen 2). Phone-entry step and verify step. Local-only (no backend); on success sets a flag in `useApp` and routes to `/`.

Header (`app-header.tsx`) restyled: white bar, hamburger left, centered blue `LOTTO RUNNERS` wordmark, bell + avatar (logo) right.

## Home (`src/routes/index.tsx` + `service-selector.tsx`)

Match screen s0:
- Map fills top.
- Bottom sheet with 4 service tiles in a row (Errand / Taxi / Delivery / Truck) — tinted square cards, selected one filled solid blue.
- Red circular **SOS** floating button overlapping the rightmost tile.
- Saved-place row: "Home — 123 Independence Ave, Windhoek" tappable → prefills pickup.
- Persistent bottom tab bar.

## Errand sub-flow

**`errand-category-picker.tsx`** restyled to match s4: full page with search bar, "What do you need?" heading, vertical list of 5 large cards (icon-circle + title + description). Add Pharmacy Runs and Bill Payments to `errand-categories.ts` (adjusts the existing 5).

**New `errand-details.tsx`** (replaces the errand-specific block currently inside `location-picker.tsx`) matching s5:
- Hero image strip (lotto runners logo art)
- Store Preference input (optional)
- Shopping List textarea
- Urgency: Normal / Urgent toggle
- Budget Estimate N$ input
- "Review Request" primary button → continues to fare estimate

For non-shopping categories, the same template adapts labels (e.g., Queue Sitting shows "Where" + "Estimated wait time" pills 30/60/90/120 instead of budget).

## Taxi / Delivery / Truck flow

`location-picker.tsx` restyled and **`ride-options.tsx`** new (screen s1):
- Compact pickup/destination card at top
- "Choose a ride" + N options pill
- Vertical cards: icon-tile, name, subtitle, ETA "X min away", price right-aligned, optional struck-through original price, blue selected state with "SELECTED" pill
- Wallet row card
- "Lotto Verified Security" + estimated total footer
- Solid blue full-width "Confirm Selection" CTA

Rides catalog (in `services.ts`): Standard (N$45), XL (N$85), Women Only (N$50), Corporate (N$120). Same pattern for Delivery (Standard / Express / Bulk) and Truck (1-ton / 4-ton).

## Fare estimate (`fare-estimate.tsx`)

Match s7:
- Hero image card at top
- "Schedule for" Now / Later toggle (Later = future enhancement, disabled with "Coming soon")
- Fare Breakdown card: Base / Distance (with km) / Platform fee / Total in blue
- Wallet card with Change link
- Solid blue "Confirm & Request Runner"

## Searching (`searching.tsx`)

Match s6:
- Concentric blue rings around centered crosshair circle
- "Finding your Runner…" pill
- Bottom sheet "Nearby Runners" with horizontal scroll of small runner cards (avatar / name / 4.9★ / N min)
- "Cancel Request" outlined button

## Auth (OTP) — screen s2

New `src/routes/auth.verify.tsx`: centered logo, big "Verify your account" title, masked phone, 6 separate digit input boxes, blue "Verify →" button, resend countdown, "Need help?" footer. No real SMS — accept any 6 digits in the prototype and gate the home page behind it (skippable via a "Continue as guest" link to keep the demo frictionless).

## Files

**New**
- `src/components/bottom-tab-bar.tsx`
- `src/components/errand-details.tsx`
- `src/components/ride-options.tsx`
- `src/components/sos-button.tsx`
- `src/routes/activity.tsx`
- `src/routes/wallet.tsx`
- `src/routes/profile.tsx`
- `src/routes/auth.verify.tsx`

**Edited**
- `src/styles.css` (new palette)
- `src/components/app-header.tsx`
- `src/components/service-selector.tsx`
- `src/components/errand-category-picker.tsx`
- `src/components/location-picker.tsx` (errand block extracted)
- `src/components/fare-estimate.tsx`
- `src/components/searching.tsx`
- `src/lib/errand-categories.ts` (add pharmacy, bill payments)
- `src/lib/services.ts` (add ride/delivery/truck variants + prices)
- `src/lib/store.ts` (savedPlaces, urgency, scheduleMode, authVerified)
- `src/routes/index.tsx` (mount bottom tab bar, SOS, saved places)

## Out of scope (unless you say otherwise)

- Real auth / SMS provider
- Real wallet top-up / payments
- Maps inside ride-selection screen (Stitch screen shows a faded map; we'll keep the bottom sheet over the live Leaflet map)
- "Schedule for Later" date picker (button stub only)
