# NYC Electrification Readiness Map

A React map of NYC parcels scored for heat pump electrification readiness,
with a tiered strategy note per parcel.

## Stack

React, Vite, Tailwind CSS, `react-map-gl` (Mapbox GL JS). No backend, no
external API key beyond Mapbox.

## Data sources

Five real NYC/NYS Open Data (Socrata) datasets, joined by BBL (Borough-Block-Lot):

| Dataset | Resource | Role |
| --- | --- | --- |
| PLUTO | `64uk-42ks` (data.cityofnewyork.us) | Primary parcel list — address, year built, lot area, lat/lon, and a per-parcel FEMA preliminary floodplain flag (`pfirm15_flag`) |
| NTA boundaries | `9nt8-h7nd` (data.cityofnewyork.us) | Neighborhood picker + polygon used to filter parcels to the selected area |
| LL84 Benchmarking | `5zyy-y8am` (data.cityofnewyork.us) | GHG emissions, and per-fuel energy use (used to infer oil vs. gas heat) |
| DOB NOW: Safety Boiler | `52dp-yji6` (data.cityofnewyork.us) | Boiler make, joined via Building ID (BIN) for the sidebar's hardware detail |
| Interim DAC 2020 | `t6wd-tdrv` (data.ny.gov) | Disadvantaged Community tracts (rebate eligibility signal) |

**This deviates from the original spec**, which listed five different resource
IDs. Only its PLUTO ID resolved against the live API — the other four
(`7x63-isqj`, `5n2b-n7p8`, `6vyu-id4s`, `7v9x-z7xv`) return `dataset.missing`.
The datasets above were found and field-checked against the live Socrata API
as real replacements. Notable adaptations:

- **No standalone flood dataset.** PLUTO already carries `pfirm15_flag`
  (preliminary 100-year floodplain) per parcel — more direct than a
  geometry join against a separate flood-hazard layer.
- **No `ntaname` field in PLUTO.** Neighborhoods are resolved via the NTA
  boundary dataset, plus a client-side point-in-polygon filter
  (`src/lib/geo.js`) — see `fetchParcelsForNeighborhoods` in `src/lib/socrata.js`.
- **Fuel type comes from LL84, not DOB Boilers.** The real boiler dataset has
  no `bbl` or `fuel_type` field (only a Building ID and boiler make). Fuel
  type is instead derived from LL84's per-fuel energy-use columns
  (oil vs. gas), which is a more reliable signal; the boiler dataset is
  still joined (via BIN) for the supplementary "boiler make" hardware label.
- **DAC tract matching is approximate.** It's a best-effort GEOID built from
  PLUTO's borough + `ct2010`, joined against a newer DAC tract vintage — good
  enough as a readiness signal, not compliance-grade.
- **Parcels render as colored points, not filled lot polygons.** Pulling
  PLUTO's tax-lot polygon geometry per parcel at neighborhood scale is a very
  large payload; a circle layer gets the same color-coded readiness view at a
  fraction of the data cost.

## Readiness Score

`calculateReadiness()` in `src/lib/scoring.js`, 1-100:

- **Readiness (40%):** +20 oil heat, +20 built before 1960
- **Impact (30%):** +15 GHG emissions above the loaded set's median, +15 disadvantaged community
- **Feasibility (30%):** -15 in a 100-year flood zone, +15 lot area > 5,000 sqft

The "city median" GHG threshold in the spec isn't attached to a named
reference value, so it's computed from whichever parcels are currently
loaded (i.e. neighborhood-relative, not citywide) — see the comment in
`scoring.js`.

## Electrification strategy (sidebar)

The spec's LLM-driven audit sidebar is replaced with a deterministic,
template-based strategy note (`src/lib/strategy.js`) — no API key, no
network call, no per-click cost. It buckets the readiness score into ten
10-point tiers (1-10 up to 91-100), each with a canned headline and
guidance, then appends parcel-specific notes built from data already on the
parcel (fuel type, building age, flood siting, disadvantaged-community
status). Same information areas the spec's system prompt asked for — fuel
type, age-related challenges, flood-risk siting — just generated locally
instead of by a model.

## Setup

```bash
npm install
cp .env.example .env.local
# fill in .env.local, then:
npm run dev
```

Required in `.env.local`:

- `VITE_MAPBOX_TOKEN` — a Mapbox public token (`pk.*`)

Optional (raise Socrata's anonymous rate limits):

- `VITE_NYC_OPEN_DATA_APP_TOKEN`
- `VITE_NYS_OPEN_DATA_APP_TOKEN`

## Deploy to GitHub Pages

```bash
npm run deploy
```

This builds and pushes `dist/` to the `gh-pages` branch (via the `gh-pages`
package). Enable Pages on that branch in the repo's Settings → Pages. The
Vite `base` path in `vite.config.js` is already set to
`/nyc-electrification-map/` to match this repo's GitHub Pages URL.
