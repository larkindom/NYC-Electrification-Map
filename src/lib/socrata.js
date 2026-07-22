// Client for NYC/NYS Open Data (Socrata / SODA) datasets.
//
// NOTE ON DATASET IDs: the original spec listed five resource IDs, but only
// PLUTO's (64uk-42ks) resolves on the live API — the other four were
// placeholders that 404. The IDs below were found and field-checked against
// the live API (see project notes). Two PRD datasets were folded into
// others because the real data doesn't shape up the way the spec assumed:
//   - PLUTO has no `ntaname` field, so neighborhoods are resolved via a
//     separate NTA boundary dataset and a client-side point-in-polygon test.
//   - PLUTO already carries a per-parcel FEMA preliminary floodplain flag
//     (`pfirm15_flag`), which replaces the standalone "Flood Hazard"
//     geometry dataset entirely — one authoritative field beats a spatial
//     join against a fifth dataset.
//   - The DOB boiler dataset has no `bbl` or `fuel_type` field (only a BIN
//     and boiler_make); fuel type is instead derived from LL84's per-fuel
//     energy-use columns, which is the more reliable signal anyway. The
//     boiler dataset is still joined (via BIN, sourced from LL84) purely for
//     the supplementary `boiler_make` hardware label shown in the sidebar.
//
// This is a browser app, so all requests are plain client-side fetch calls
// against Socrata's JSON endpoints (CORS-enabled) rather than the `sodapy`
// Python client named in the spec.

import { pointInGeometry, geometryBounds, mergeBounds } from './geo'

const NYC_DOMAIN = 'https://data.cityofnewyork.us'
const NYS_DOMAIN = 'https://data.ny.gov'

const RESOURCES = {
  pluto: { domain: NYC_DOMAIN, id: '64uk-42ks' }, // Primary Land Use Tax Lot Output
  nta: { domain: NYC_DOMAIN, id: '9nt8-h7nd' }, // 2020 Neighborhood Tabulation Areas boundaries
  ll84: { domain: NYC_DOMAIN, id: '5zyy-y8am' }, // LL84 energy/water benchmarking (2022-present)
  boilers: { domain: NYC_DOMAIN, id: '52dp-yji6' }, // DOB NOW: Safety Boiler
  dac: { domain: NYS_DOMAIN, id: 't6wd-tdrv' }, // Interim Disadvantaged Communities (DAC) 2020 — rows ARE the qualifying tracts
}

const BOROUGH_CODE_BY_NAME = {
  Manhattan: 'MN',
  Bronx: 'BX',
  Brooklyn: 'BK',
  Queens: 'QN',
  'Staten Island': 'SI',
}

// NY State Climate Justice Working Group county FIPS codes for NYC boroughs,
// used to build a census-tract GEOID (state+county+tract) for the DAC join.
const COUNTY_FIPS_BY_BOROUGH_CODE = {
  MN: '061',
  BX: '005',
  BK: '047',
  QN: '081',
  SI: '085',
}

function appToken(domain) {
  return domain === NYS_DOMAIN
    ? import.meta.env.VITE_NYS_OPEN_DATA_APP_TOKEN
    : import.meta.env.VITE_NYC_OPEN_DATA_APP_TOKEN
}

async function soql(resource, params) {
  const url = new URL(`${resource.domain}/resource/${resource.id}.json`)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, value)
  })

  const headers = {}
  const token = appToken(resource.domain)
  if (token) headers['X-App-Token'] = token

  const res = await fetch(url.toString(), { headers })
  if (!res.ok) {
    throw new Error(`Socrata request failed (${res.status}): ${resource.id}`)
  }
  return res.json()
}

function soqlInList(values) {
  return values.map((v) => `'${String(v).replace(/'/g, "''")}'`).join(',')
}

// Datasets disagree on BBL shape: PLUTO stores it as a padded float string
// ("1015590019.00000000"), LL84 as a clean 10-digit string. Both normalize
// to the same 10-digit key here.
export function normalizeBBL(bbl) {
  if (bbl === null || bbl === undefined) return null
  const intPart = String(bbl).trim().split('.')[0].replace(/\D/g, '')
  if (!intPart) return null
  return intPart.padStart(10, '0')
}

// Best-effort census-tract GEOID for the DAC join. NYC PLUTO's `ct2010`
// stores the whole tract number without the Census Bureau's implied *100
// suffix (tract "136" -> FIPS suffix "013600"), and DAC tract boundaries are
// a newer (2020-cycle) vintage than PLUTO's 2010 tracts, so this is an
// approximate match — good enough for a readiness signal, not for anything
// compliance-grade.
function tractGeoid(boroughCode, ct2010) {
  if (!ct2010) return null
  const countyFips = COUNTY_FIPS_BY_BOROUGH_CODE[boroughCode]
  if (!countyFips) return null
  const tractDigits = String(ct2010).replace(/\D/g, '')
  if (!tractDigits) return null
  const tractSuffix = `${tractDigits}00`.padStart(6, '0').slice(0, 6)
  return `36${countyFips}${tractSuffix}`
}

// Lazy-load the neighborhood picker: just names + borough, no geometry yet.
let ntaListCache = null
export async function fetchNeighborhoods() {
  if (ntaListCache) return ntaListCache
  const rows = await soql(RESOURCES.nta, {
    $select: 'ntaname,boroname',
    $where: 'ntaname IS NOT NULL',
    $order: 'ntaname',
    $limit: 500,
  })
  ntaListCache = rows
  return ntaListCache
}

async function fetchNeighborhoodGeometries(neighborhoods) {
  const rows = await soql(RESOURCES.nta, {
    $select: 'ntaname,boroname,the_geom',
    $where: `ntaname IN (${soqlInList(neighborhoods)})`,
    $limit: 50,
  })
  return rows
}

// Full pipeline: resolve selected neighborhoods to geometry, pull a
// borough+bbox-bounded slice of PLUTO, keep only parcels that truly fall
// inside the neighborhood polygon(s), then left-join LL84 / boiler / DAC
// data onto that parcel list by BBL so every parcel still renders even when
// the enrichment datasets have no match.
export async function fetchParcelsForNeighborhoods(neighborhoods) {
  if (!neighborhoods?.length) return []

  const ntaFeatures = await fetchNeighborhoodGeometries(neighborhoods)
  if (!ntaFeatures.length) return []

  const boroughCodes = [
    ...new Set(ntaFeatures.map((f) => BOROUGH_CODE_BY_NAME[f.boroname]).filter(Boolean)),
  ]
  const bounds = mergeBounds(ntaFeatures.map((f) => geometryBounds(f.the_geom)))

  const plutoRows = await soql(RESOURCES.pluto, {
    $select: 'bbl,borough,ct2010,yearbuilt,lotarea,address,latitude,longitude,pfirm15_flag',
    $where: [
      `borough IN (${soqlInList(boroughCodes)})`,
      `latitude between ${bounds.minLat} and ${bounds.maxLat}`,
      `longitude between ${bounds.minLng} and ${bounds.maxLng}`,
      'latitude IS NOT NULL',
    ].join(' AND '),
    $limit: 20000,
  })

  const parcelsInNeighborhood = plutoRows.filter((p) =>
    ntaFeatures.some((f) => pointInGeometry(Number(p.longitude), Number(p.latitude), f.the_geom)),
  )
  if (!parcelsInNeighborhood.length) return []

  const bbls = parcelsInNeighborhood.map((p) => normalizeBBL(p.bbl)).filter(Boolean)

  const ll84Rows = bbls.length
    ? await soql(RESOURCES.ll84, {
        $select:
          'nyc_borough_block_and_lot,nyc_building_identification,total_location_based_ghg,fuel_oil_1_use_kbtu,fuel_oil_2_use_kbtu,fuel_oil_4_use_kbtu,fuel_oil_5_6_use_kbtu,natural_gas_use_kbtu',
        $where: `nyc_borough_block_and_lot IN (${soqlInList(bbls)})`,
        $limit: 10000,
      }).catch(() => [])
    : []

  const ll84ByBBL = new Map()
  for (const row of ll84Rows) {
    const key = normalizeBBL(row.nyc_borough_block_and_lot)
    if (key) ll84ByBBL.set(key, row)
  }

  const bins = ll84Rows.map((r) => r.nyc_building_identification).filter(Boolean)
  const boilerRows = bins.length
    ? await soql(RESOURCES.boilers, {
        $select: 'bin_number,boiler_make',
        $where: `bin_number IN (${soqlInList(bins)})`,
        $limit: 10000,
      }).catch(() => [])
    : []
  const boilerByBIN = new Map()
  for (const row of boilerRows) {
    if (row.bin_number) boilerByBIN.set(String(row.bin_number), row)
  }

  const geoids = parcelsInNeighborhood
    .map((p) => tractGeoid(p.borough, p.ct2010))
    .filter(Boolean)
  const dacTracts = geoids.length
    ? await soql(RESOURCES.dac, {
        $select: 'geoid',
        $where: `geoid IN (${soqlInList(geoids)})`,
        $limit: 10000,
      }).catch(() => [])
    : []
  const dacTractSet = new Set(dacTracts.map((r) => r.geoid))

  return parcelsInNeighborhood.map((pluto) => {
    const bbl = normalizeBBL(pluto.bbl)
    const ll84 = ll84ByBBL.get(bbl)
    const boiler = ll84?.nyc_building_identification
      ? boilerByBIN.get(String(ll84.nyc_building_identification))
      : undefined

    const fuelOilUse = ['fuel_oil_1_use_kbtu', 'fuel_oil_2_use_kbtu', 'fuel_oil_4_use_kbtu', 'fuel_oil_5_6_use_kbtu']
      .map((k) => Number(ll84?.[k]))
      .filter((n) => !Number.isNaN(n))
      .reduce((a, b) => a + b, 0)
    const gasUse = Number(ll84?.natural_gas_use_kbtu)
    let fuelType = null
    if (ll84) {
      if (fuelOilUse > 0) fuelType = 'Oil'
      else if (!Number.isNaN(gasUse) && gasUse > 0) fuelType = 'Gas'
    }

    return {
      bbl,
      address: pluto.address,
      // PLUTO uses 0 (not null) for "year unknown" — treat it the same as missing.
      yearbuilt: Number(pluto.yearbuilt) > 0 ? Number(pluto.yearbuilt) : null,
      lotarea: pluto.lotarea ? Number(pluto.lotarea) : null,
      latitude: Number(pluto.latitude),
      longitude: Number(pluto.longitude),
      flood_zone: pluto.pfirm15_flag ? '100-year' : null,
      total_ghg_emissions: ll84?.total_location_based_ghg ? Number(ll84.total_location_based_ghg) : null,
      fuel_type: fuelType,
      boiler_make: boiler?.boiler_make ?? null,
      disadvantaged_community: dacTractSet.has(tractGeoid(pluto.borough, pluto.ct2010)),
    }
  })
}
