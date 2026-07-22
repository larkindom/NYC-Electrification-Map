import { useMemo, useState } from 'react'

export default function NeighborhoodSelector({ neighborhoods, loading, selected, onApply }) {
  const [draft, setDraft] = useState(selected)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return neighborhoods
    return neighborhoods.filter((n) => n.ntaname.toLowerCase().includes(q))
  }, [neighborhoods, query])

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
        ) : (
          <ul>
            {filtered.map((n) => (
              <li key={n.ntaname}>
                <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-neutral-800">
                  <input
                    type="checkbox"
                    checked={draft.includes(n.ntaname)}
                    onChange={() => toggle(n.ntaname)}
                    className="accent-neutral-300"
                  />
                  <span>{n.ntaname}</span>
                  <span className="ml-auto text-xs text-neutral-500">{n.boroname}</span>
                </label>
              </li>
            ))}
          </ul>
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

      <div className="flex items-center gap-3 border-t border-neutral-800 pt-3 text-xs text-neutral-400">
        <Legend color="#ff4d4d" label="0-30" />
        <Legend color="#ffff00" label="31-70" />
        <Legend color="#00cc00" label="71-100" />
      </div>
    </div>
  )
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  )
}
