import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT =
  'You are an expert NYC Energy Auditor. Using the provided BBL data, generate a concise electrification strategy. Address fuel type, age-related challenges, and flood-risk siting.'

// Client-side call, per the spec's "React sidebar that uses an LLM" +
// GitHub Pages hosting. There's no server in that setup to hold the key, so
// this ships with `dangerouslyAllowBrowser: true` and the key lives in a
// VITE_-prefixed env var, which Vite inlines into the public JS bundle. That
// is fine for local/personal use but means anyone who opens devtools on the
// deployed site can read the key. Before a public/production deploy, move
// this call behind a small proxy (Cloudflare Worker, Vercel function, etc.)
// that holds the key server-side instead.
function client() {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) return null
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
}

export async function auditParcel(parcel) {
  const anthropic = client()
  if (!anthropic) {
    throw new Error('Missing VITE_ANTHROPIC_API_KEY — set it in .env.local to enable the AI audit.')
  }

  const parcelSummary = {
    bbl: parcel.bbl,
    address: parcel.address,
    yearbuilt: parcel.yearbuilt,
    lotarea: parcel.lotarea,
    fuel_type: parcel.fuel_type,
    boiler_make: parcel.boiler_make,
    total_ghg_emissions: parcel.total_ghg_emissions,
    disadvantaged_community: parcel.disadvantaged_community,
    flood_zone: parcel.flood_zone,
    readiness_score: parcel.readiness_score,
  }

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 600,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Parcel data (BBL ${parcel.bbl}):\n${JSON.stringify(parcelSummary, null, 2)}`,
      },
    ],
  })

  return message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
}
