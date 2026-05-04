
# Lotto Runners — "Uber for Errands"

A live-map app where customers request one of four services (Errand, Ride, Delivery, Truck), get matched to the nearest available runner, track them in real time, pay in-app, and rate the service. Includes a Runner app and an Admin dashboard.

## Phased delivery

This is a big build. We'll ship it in three phases so you can demo after each one.

### Phase 1 — Customer prototype on a real live map
The flagship demo experience. After this phase you can show investors a complete, polished customer flow.

- **Live map home screen** (Leaflet + OpenStreetMap): full-screen map, asks for browser geolocation, centers on the user; falls back to Windhoek. Animated "pulse" on user location. Simulated nearby runners shown as moving icons (car, motorbike, truck, person on foot) until the backend is wired in Phase 2.
- **Service selector bottom sheet** (Uber-style): four tiles with icons and short descriptions
  - Errand Runner (person on foot)
  - Ride (car)
  - Delivery (motorbike)
  - Truck (truck)
- **Pickup + destination flow**: tap to set pickup, then destination. Address search field with reverse geocoding. Saved/recent locations. For Errand Runner, an extra "Describe your errand" field (e.g. "Pick up groceries from Checkers, pay with the cash I'll send").
- **Fare estimate screen**: distance/time estimate, price breakdown, payment method selector (MTC MoMo, Card, Cash — mocked), "Confirm request" button.
- **Searching for runner** animation, then **driver-found card** with photo, name, rating, vehicle, ETA.
- **Live tracking screen**: runner icon moving toward pickup, then to destination. Status pills (En route → Arrived → On trip → Completed). Call/message buttons (mock).
- **Rate & pay screen**: 5-star rating, tip option, receipt.
- Trip history page.

### Phase 2 — Real backend, auth, and Runner app
Replace simulation with a real real-time system, add the runner side.

- **Lovable Cloud** for database, auth, storage, and realtime.
- **Auth**: email/password + Google sign-in. Two account types — Customer and Runner — chosen at signup. Runner signup collects vehicle type, license plate, photo upload.
- **Database** (key tables): `profiles`, `user_roles` (customer / runner / admin, in a separate table for security), `runners` (vehicle, status, current location), `service_requests` (type, pickup, destination, errand description, status, fare), `trip_events` (status updates), `ratings`, `payments`.
- **Live runner locations**: the Runner app pushes GPS updates; the Customer app subscribes via Supabase Realtime so the runner icon moves on the map for real.
- **Matching**: when a customer confirms, the system finds the nearest available runner of the correct vehicle type and sends them the request.
- **Runner app** (separate routes, same codebase):
  - Online/Offline toggle (publishes location only when online)
  - Incoming request card with accept/decline + 15s timer
  - Active job screen with navigation hand-off, status buttons (Arrived / Picked up / Completed)
  - Earnings summary, job history
- **Customer ↔ runner matching loop** end-to-end on real data.

### Phase 3 — Admin dashboard
Operational control for the team.

- Live ops map: every active runner and trip on one map, color-coded by status.
- Tables with filters & search: Users, Runners (with approve/suspend), Trips, Payments, Ratings.
- KPIs: active runners, requests/hour, completion rate, avg ETA, revenue.
- Runner verification queue (review uploaded documents).
- Manual dispatch override (reassign a stuck request).

## Visual & UX direction

- Uber-inspired layout (full-bleed map, bottom sheet for actions) but neutral palette until you share the Lotto Runners brand. Once you upload your logo and colors, I'll theme the whole app.
- Mobile-first, but works on desktop for the admin dashboard.
- Smooth bottom-sheet transitions, skeleton loaders, optimistic UI.

## Technical notes (for reference)

- Frontend: TanStack Start + React, Tailwind, shadcn/ui, Leaflet for maps.
- Backend: Lovable Cloud (Supabase) — Postgres + RLS, Auth, Realtime channels for live location, Storage for runner photos/docs.
- Roles stored in a dedicated `user_roles` table with a `has_role()` security-definer function (never on profiles — prevents privilege escalation).
- Payments are **mocked** in this build (MoMo / card / cash UI only). Real MTC MoMo and card processing for Namibia is a Phase 4 conversation — it requires a payment partner and merchant onboarding outside Lovable's built-in providers.
- Map provider: starting with Leaflet + OpenStreetMap (free, no key). Easy swap to Mapbox later for a more polished look once branding is set.

## What I'd like from you along the way

1. **Now**: approve this plan so I can start Phase 1.
2. **Before Phase 1 finishes**: drop your Lotto Runners logo + brand colors into the chat so I can theme it.
3. **Before Phase 2**: confirm you want Lovable Cloud enabled (I'll prompt you).
4. **Phase 4 (later)**: we'll plan real MoMo/card payment integration separately.

## Out of scope for now

- Real money movement (MoMo, card processing) — mocked UI only.
- Native iOS/Android apps — this is a responsive web app that feels native on mobile. Wrapping it as a native app via Capacitor is a future step.
- SMS/push notifications — can be added once a Twilio/messaging provider is chosen.

Approve this and I'll start building Phase 1 immediately.
