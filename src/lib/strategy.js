// Deterministic, template-based electrification strategy — no LLM call.
// Buckets the readiness score into ten 10-point tiers with a canned
// headline + guidance, then appends parcel-specific notes (fuel type,
// building age, flood siting) built from data already on the parcel object.

const TIERS = [
  {
    max: 10,
    headline: 'Not a near-term candidate',
    guidance:
      'Little in this parcel\'s profile points to an urgent retrofit case right now. Revisit if fuel type, benchmarking data, or flood designations change.',
  },
  {
    max: 20,
    headline: 'Low priority',
    guidance:
      'A handful of readiness signals are present, but not enough to justify prioritizing this parcel over others in the neighborhood.',
  },
  {
    max: 30,
    headline: 'Below average readiness',
    guidance:
      'This parcel has some retrofit-relevant characteristics but faces one or more real barriers to near-term electrification.',
  },
  {
    max: 40,
    headline: 'Emerging candidate',
    guidance:
      'A mix of readiness and feasibility factors puts this parcel on the radar, though it likely needs a closer site visit before committing resources.',
  },
  {
    max: 50,
    headline: 'Moderate candidate',
    guidance:
      'This parcel clears several readiness thresholds. Worth including in an outreach batch alongside stronger-scoring neighbors.',
  },
  {
    max: 60,
    headline: 'Above-average candidate',
    guidance:
      'Multiple readiness and impact factors line up here. A reasonable target for an early retrofit outreach wave.',
  },
  {
    max: 70,
    headline: 'Strong candidate',
    guidance:
      'This parcel combines aging or end-of-life heating infrastructure with real feasibility for a heat pump conversion.',
  },
  {
    max: 80,
    headline: 'High priority',
    guidance:
      'Readiness, impact, and feasibility factors are largely aligned. A strong candidate for prioritized outreach and incentive matching.',
  },
  {
    max: 90,
    headline: 'Top-tier candidate',
    guidance:
      'This parcel checks nearly every box for retrofit readiness. Recommend fast-tracking for site assessment.',
  },
  {
    max: 100,
    headline: 'Prime candidate',
    guidance:
      'This parcel is about as strong a retrofit case as the data can show: aging fossil-fuel heat, real emissions impact, and good physical feasibility.',
  },
]

function tierFor(score) {
  return TIERS.find((t) => score <= t.max) ?? TIERS[TIERS.length - 1]
}

function fuelNote(parcel) {
  if (parcel.fuel_type === 'Oil') {
    return 'It currently runs on oil heat — an end-of-life fuel source that makes this a natural point to convert at the next equipment replacement cycle.'
  }
  if (parcel.fuel_type === 'Gas') {
    return 'It currently runs on natural gas. A heat pump conversion here would displace combustion equipment rather than replace already-failing hardware.'
  }
  return 'No confirmed fuel type on file (likely a building below the LL84 benchmarking size threshold) — a site visit would be needed to confirm current heating equipment.'
}

function ageNote(parcel) {
  if (typeof parcel.yearbuilt !== 'number') {
    return 'Year built is not on record for this parcel.'
  }
  if (parcel.yearbuilt < 1960) {
    return `Built in ${parcel.yearbuilt}, old enough that mechanical systems have likely already been replaced at least once, and any original ductwork or piping may need review before a heat pump retrofit.`
  }
  return `Built in ${parcel.yearbuilt}, recent enough that existing mechanical systems are less likely to be a retrofit blocker on their own.`
}

function floodNote(parcel) {
  if (parcel.flood_zone === '100-year') {
    return 'It falls within the preliminary 100-year floodplain, so any outdoor heat pump siting should account for elevation and flood-proofing rather than defaulting to ground-level placement.'
  }
  return 'It is not flagged in the preliminary 100-year floodplain, so flood siting is not expected to be a major constraint on equipment placement.'
}

export function getElectrificationStrategy(parcel) {
  const tier = tierFor(parcel.readiness_score)
  const lines = [
    `${tier.headline} (score ${parcel.readiness_score}/100). ${tier.guidance}`,
    fuelNote(parcel),
    ageNote(parcel),
    floodNote(parcel),
  ]
  if (parcel.disadvantaged_community) {
    lines.push('This parcel is in a designated disadvantaged community, which typically expands eligibility for state and utility electrification rebates.')
  }
  return lines.join('\n\n')
}
