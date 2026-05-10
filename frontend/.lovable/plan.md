# Why it keeps looking like a mobile app

Almost every action on the driver dashboard currently opens a **phone-shaped iframe panel** (`MobilePreviewSheet`) that loads the `/app/*` route tree — that route tree IS the mobile-app shell (bottom tab bar, narrow column, profile cards stacked vertically).

Today, on `/driver`:
- Header has a literal "📱 Mobile preview" button.
- "Browse carriers", "Map", "Edit profile", and every carrier card's "View role" → all call `openPreview("/app/...")` → renders the mobile shell inside a 390px-wide phone bezel.
- The landing page (`/`) also has a "Mobile preview" trigger.

So even when you're "on the website," half the clicks pop the mobile app in a side drawer. That's why it feels like an app.

# Plan: delete the mobile shell, go full website

## 1. Delete (mobile-only — gone entirely)

Routes:
- `src/routes/app.tsx`
- `src/routes/app.index.tsx`
- `src/routes/app.companies.index.tsx`
- `src/routes/app.companies.$id.tsx`
- `src/routes/app.map.tsx`
- `src/routes/app.profile.tsx`
- `src/routes/app.nocti.tsx`

Components:
- `src/components/nocti/MobilePreviewSheet.tsx`
- `src/components/nocti/BottomNav.tsx`

Remove every `openMobilePreview` / `openPreview` handler, every `<Smartphone />` "Mobile preview" button, and the `/app/*` references in `index.tsx`, `driver.index.tsx`, `driver.auth.tsx`, `verify.tsx`, `WebShell.tsx`, `CompanyCard.tsx`, `TalkToNoctiSheet.tsx`.

## 2. Build proper web routes for the driver side

These replace what the mobile shell was doing, but as full-page website screens with the same 1240px shell and sticky header used elsewhere:

| New web route | Replaces | Purpose |
|---|---|---|
| `src/routes/driver.carriers.index.tsx` | `app.companies.index` | Full-page carrier search with multi-column results (logo column + details + match + actions). |
| `src/routes/driver.carriers.$id.tsx` | `app.companies.$id` | Full-page carrier detail: hero, key stats grid, lanes/equipment/benefits, FMCSA panel, "Apply / Save" actions. |
| `src/routes/driver.map.tsx` | `app.map` | Map page with left filter rail, big map canvas. |
| `src/routes/driver.profile.tsx` | `app.profile` | Two-column profile editor (left: identity/photo, right: lanes, pay, equipment, endorsements, documents). |

All four use the same dashboard layout pattern as `/driver` and `/company/drivers`: sticky top nav with section links, optional left filter/profile rail, main column with cards.

## 3. Wire driver dashboard nav to the new web routes

In `src/routes/driver.index.tsx`:
- Header nav: `Dashboard`, `Carriers`, `Map`, `Profile` → all `<Link to="/driver/...">` (full page navigations, no iframe).
- Carrier cards' "View role" → `<Link to="/driver/carriers/$id">`.
- "Edit profile" button → `<Link to="/driver/profile">`.
- Remove the "Mobile preview" header button entirely.
- Keep "Talk to Nocti" — it stays as a side drawer (`TalkToNoctiSheet`) because that's a normal website chat pattern, not a mobile-app pattern.

## 4. Clean up landing + shared components

- `src/routes/index.tsx`: remove the `openMobilePreview("/app")` button and any phone-frame hero preview that points at `/app/*`. Keep the existing web hero card.
- `src/components/nocti/WebShell.tsx`: drop the `openMobilePreview` context value and the Mobile preview button in its header. Keep Talk to Nocti.
- `src/components/nocti/CompanyCard.tsx` / `TalkToNoctiSheet.tsx`: remove any `/app/*` links so nothing dead-ends after the routes are deleted.

## 5. Verify

- Search the repo for `/app` and `MobilePreview` after edits — must return zero hits in `src/`.
- Click through `/`, `/driver`, `/driver/carriers`, `/driver/carriers/$id`, `/driver/map`, `/driver/profile`, `/company`, `/company/drivers` — every nav action should be a full-page route change, no phone-shaped drawers anywhere.
- Routes that were the mobile shell should now 404 (handled by existing `notFoundComponent` on root).

## Result

A normal website: sticky top nav, page-level navigation, dashboard-style multi-column layouts on every screen. No iframe, no phone bezel, no bottom tab bar, no "Mobile preview" anywhere.
