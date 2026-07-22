import { SCORE_TIERS, scoreTier } from '../lib/scoring'

export function countByTier(parcels) {
  const counts = { red: 0, orange: 0, green: 0 }
  for (const p of parcels) {
    counts[scoreTier(p.readiness_score).id]++
  }
  return counts
}

export default function ScoreLegend({ counts, activeTiers, onToggle }) {
  return (
    <div className="rounded bg-neutral-900/90 p-3 text-sm text-neutral-100 shadow">
      <ul className="space-y-1.5">
        {SCORE_TIERS.map((tier) => (
          <li key={tier.id}>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={activeTiers[tier.id]}
                onChange={() => onToggle(tier.id)}
                className="accent-neutral-300"
              />
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: tier.color }} />
              <span className="flex-1">{tier.label}</span>
              <span className="text-neutral-400">{counts[tier.id] ?? 0}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
