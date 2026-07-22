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

export function calculateReadiness(parcel, ghgMedian) {
  let score = 0
  const breakdown = []

  // Readiness (40%)
  if (parcel.fuel_type === 'Oil') {
    score += 20
    breakdown.push({ label: 'Oil heat (end-of-life fuel source)', points: 20 })
  }
  if (typeof parcel.yearbuilt === 'number' && parcel.yearbuilt < 1960) {
    score += 20
    breakdown.push({ label: 'Built before 1960 (older mechanical systems)', points: 20 })
  }

  // Impact (30%)
  if (
    typeof parcel.total_ghg_emissions === 'number' &&
    typeof ghgMedian === 'number' &&
    parcel.total_ghg_emissions > ghgMedian
  ) {
    score += 15
    breakdown.push({ label: 'GHG emissions above neighborhood median', points: 15 })
  }
  if (parcel.disadvantaged_community) {
    score += 15
    breakdown.push({ label: 'Disadvantaged community (higher rebate eligibility)', points: 15 })
  }

  // Feasibility (30%). Lot size carries the full 30% on its own — flood zone
  // is a risk flag, not a positive feasibility attribute, so it's a
  // deduction on top rather than splitting the 30% into two additive halves.
  // That makes the best possible parcel (oil heat + pre-1960 + high GHG +
  // DAC + large lot + no flood risk) land at exactly 100, and a flood-zone
  // parcel with nothing else going for it bottoms out at -15 (clamped to 1).
  if (typeof parcel.lotarea === 'number' && parcel.lotarea > 5000) {
    score += 30
    breakdown.push({ label: 'Lot area > 5,000 sqft (space for heat pump units)', points: 30 })
  }
  if (parcel.flood_zone === '100-year') {
    score -= 15
    breakdown.push({ label: '100-year flood zone (siting risk)', points: -15 })
  }

  const clamped = Math.max(1, Math.min(100, score))
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
