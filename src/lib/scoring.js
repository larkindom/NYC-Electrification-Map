// Weighted "Electrification Readiness Score" (1-100), per spec section 3.
//
// The spec's GHG check is "> city median" but doesn't name a citywide
// reference; that would require pulling and caching LL84 emissions for every
// benchmarked building in NYC. As a working proxy, the median is computed
// over whichever parcel set is currently loaded (i.e. the selected
// neighborhoods) and passed in, so the score is neighborhood-relative rather
// than city-relative. Good enough for comparing parcels on the map; flagged
// here so it isn't mistaken for the true citywide figure.

export function median(values) {
  const nums = values.filter((v) => typeof v === 'number' && !Number.isNaN(v)).sort((a, b) => a - b)
  if (!nums.length) return null
  const mid = Math.floor(nums.length / 2)
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2
}

// Standard NYC rowhouse lot is ~1,900-2,000 sqft (the classic 20x100' lot;
// NYC's own zoning minimum for attached residences is 1,700 sqft) — the
// original 5,000 sqft threshold was far too high and excluded most of the
// city's actual rowhouse/townhouse stock from ever getting feasibility
// credit, regardless of how good a retrofit candidate they were otherwise.
const MIN_LOT_AREA_SQFT = 2000

export function calculateReadiness(parcel, ghgMedian) {
  const breakdown = []
  let earned = 0
  let applicableMax = 0

  // Readiness: building age. Universally known from PLUTO (barring the rare
  // parcel with no recorded year), so always counts toward the applicable
  // max.
  if (typeof parcel.yearbuilt === 'number') {
    applicableMax += 20
    if (parcel.yearbuilt < 1960) {
      earned += 20
      breakdown.push({ label: 'Built before 1960 (older mechanical systems)', points: 20 })
    }
  }

  // Readiness: fuel type. Only known for buildings large enough to require
  // LL84 benchmarking filing — most of NYC's housing stock (small
  // multifamily, rowhouses) isn't covered and will never have this field.
  // Excluding it from the applicable max when unknown means a small
  // building isn't penalized for data that structurally can't exist for it;
  // including it in the max regardless (the old behavior) silently capped
  // every non-benchmarked building's ceiling below what a benchmarked
  // building could reach, rewarding data availability rather than actual
  // readiness.
  if (parcel.fuel_type) {
    applicableMax += 20
    if (parcel.fuel_type === 'Oil') {
      earned += 20
      breakdown.push({ label: 'Oil heat (end-of-life fuel source)', points: 20 })
    }
  } else {
    breakdown.push({ label: 'Fuel type unknown (not LL84-benchmarked)', points: null })
  }

  // Impact: GHG emissions vs. the loaded set's median. Same LL84 coverage
  // gap as fuel type — excluded from the applicable max when unknown.
  if (typeof parcel.total_ghg_emissions === 'number' && typeof ghgMedian === 'number') {
    applicableMax += 15
    if (parcel.total_ghg_emissions > ghgMedian) {
      earned += 15
      breakdown.push({ label: 'GHG emissions above neighborhood median', points: 15 })
    }
  } else {
    breakdown.push({ label: 'GHG emissions unknown (not LL84-benchmarked)', points: null })
  }

  // Impact: disadvantaged community. Always computed (though the tract
  // match itself is approximate — see socrata.js), so always applicable.
  applicableMax += 15
  if (parcel.disadvantaged_community) {
    earned += 15
    breakdown.push({ label: 'Disadvantaged community (higher rebate eligibility)', points: 15 })
  }

  // Feasibility: lot area. Universally known from PLUTO, so always
  // applicable. Threshold lowered to reflect an actual NYC rowhouse lot and
  // what a ductless heat pump condenser needs, not a suburban-scale lot.
  if (typeof parcel.lotarea === 'number') {
    applicableMax += 30
    if (parcel.lotarea > MIN_LOT_AREA_SQFT) {
      earned += 30
      breakdown.push({
        label: `Lot area > ${MIN_LOT_AREA_SQFT.toLocaleString()} sqft (space for heat pump units)`,
        points: 30,
      })
    }
  }

  // Score is the percentage of *applicable* criteria actually earned, not a
  // raw sum against a fixed 100 — the fix for the fairness problem above.
  // Without this, two buildings with identical readiness on every criterion
  // we can actually observe would score very differently just because one
  // happens to be LL84-benchmarked and the other doesn't.
  const base = applicableMax > 0 ? (earned / applicableMax) * 100 : 1

  // Feasibility: flood zone is a risk flag, not a positive attribute, so
  // it's a flat deduction applied after normalization rather than folded
  // into the applicable-criteria ratio. Flood status is always known (PLUTO
  // universal), so it never needs the availability treatment above.
  let score = base
  if (parcel.flood_zone === '100-year') {
    score -= 15
    breakdown.push({ label: '100-year flood zone (siting risk)', points: -15 })
  }

  const clamped = Math.max(1, Math.min(100, Math.round(score)))
  return { score: clamped, breakdown }
}

// Three-band read of the score: a red/orange/green traffic light on whether
// this parcel is a retrofit match at all, not just a raw number.
export const SCORE_TIERS = [
  { id: 'red', max: 30, color: '#ff4d4d', label: 'Out' },
  { id: 'orange', max: 70, color: '#ff8c00', label: 'Potential match' },
  { id: 'green', max: 100, color: '#00cc00', label: 'Match' },
]

export function scoreTier(score) {
  return SCORE_TIERS.find((t) => score <= t.max) ?? SCORE_TIERS[SCORE_TIERS.length - 1]
}

export function scoreToColor(score) {
  return scoreTier(score).color
}

export function scoreToMatchLabel(score) {
  return scoreTier(score).label
}

// Mapbox/MapLibre expression: interpolate parcel fill color by readiness score.
export const READINESS_FILL_EXPRESSION = [
  'interpolate',
  ['linear'],
  ['get', 'readiness_score'],
  0, '#ff4d4d',
  30, '#ff4d4d',
  31, '#ff8c00',
  70, '#ff8c00',
  71, '#00cc00',
  100, '#00cc00',
]
