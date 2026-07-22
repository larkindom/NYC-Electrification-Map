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

  // Feasibility (30%)
  if (parcel.flood_zone === '100-year') {
    score -= 15
    breakdown.push({ label: '100-year flood zone (siting risk)', points: -15 })
  }
  if (typeof parcel.lotarea === 'number' && parcel.lotarea > 5000) {
    score += 15
    breakdown.push({ label: 'Lot area > 5,000 sqft (space for heat pump units)', points: 15 })
  }

  const clamped = Math.max(1, Math.min(100, score))
  return { score: clamped, breakdown }
}

export function scoreToColor(score) {
  if (score <= 30) return '#ff4d4d'
  if (score <= 70) return '#ffff00'
  return '#00cc00'
}

// Mapbox expression: interpolate parcel fill color by readiness score.
export const READINESS_FILL_EXPRESSION = [
  'interpolate',
  ['linear'],
  ['get', 'readiness_score'],
  0, '#ff4d4d',
  30, '#ff4d4d',
  31, '#ffff00',
  70, '#ffff00',
  71, '#00cc00',
  100, '#00cc00',
]
