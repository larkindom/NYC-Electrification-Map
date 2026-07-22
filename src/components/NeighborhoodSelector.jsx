import { useMemo, useState } from 'react'

const BOROUGH_ORDER = ['Manhattan', 'Brooklyn', 'Bronx', 'Queens', 'Staten Island']

function groupByBorough(neighborhoods) {
  const byBorough = new Map()
  for (const n of neighborhoods) {
    const key = n.boroname ?? 'Other'
    if (!byBorough.has(key)) byBorough.set(key, [])
    byBorough.get(key).push(n)
  }

  const orderedKeys = [
    ...BOROUGH_ORDER.filter((b) => byBorough.has(b)),
    ...[...byBorough.keys()].filter((b) => !BOROUGH_ORDER.includes(b)).sort(),
  ]

  return orderedKeys.map((borough) => ({ borough, items: byBorough.get(borough) }))
}

export default function NeighborhoodSelector({ neighborhoods, loading, selected, onApply }) {
  const [draft, setDraft] = useState(selected)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return neighborhoods
    return neighborhoods.filter((n) => n.ntaname.toLowerCase().includes(q))
  }, [neighborhoods, query])

  const groups = useMemo(() => groupByBorough(filtered), [filtered])

  const toggle = (name) => {
    setDraft((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]))
  }

  return (
    <div className="flex h-full flex-col gap-3 p-4 text-neutral-100">
      <div>
        <h1 className="text-lg font-semibold">NYC Electrification Readiness Map</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Select neighborhoods to score parcels for heat pump retrofit readiness.
        </p>
      </div>

      <input
        type="text"
        placeholder="Search neighborhoods..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-400"
      />

      <div className="flex-1 overflow-y-auto rounded border border-neutral-800">
        {loading ? (
          <div className="p-4 text-sm text-neutral-500">Loading neighborhoods...</div>
        ) : groups.length === 0 ? (
          <div className="p-4 text-sm text-neutral-500">No neighborhoods match "{query}".</div>
        ) : (
          groups.map(({ borough, items }) => (
            <div key={borough}>
              <div className="sticky top-0 bg-neutral-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {borough}
              </div>
              <ul>
                {items.map((n) => (
                  <li key={n.ntaname}>
                    <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-neutral-800">
                      <input
                        type="checkbox"
                        checked={draft.includes(n.ntaname)}
                        onChange={() => toggle(n.ntaname)}
                        className="accent-neutral-300"
                      />
                      <span>{n.ntaname}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onApply(draft)}
          disabled={!draft.length}
          className="flex-1 rounded bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-900 disabled:opacity-40"
        >
          Load parcels ({draft.length})
        </button>
        {draft.length > 0 && (
          <button
            onClick={() => setDraft([])}
            className="rounded border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
