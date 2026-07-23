import { useEffect, useRef, useState } from 'react'
import { searchAddressCandidates } from '../lib/socrata'

const DEBOUNCE_MS = 350
const MIN_QUERY_LENGTH = 3

export default function AddressSearch({ onSelect, loading }) {
  const [query, setQuery] = useState('')
  const [candidates, setCandidates] = useState([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState(null)
  const [open, setOpen] = useState(false)
  const requestId = useRef(0)

  useEffect(() => {
    const q = query.trim()
    if (q.length < MIN_QUERY_LENGTH) {
      setCandidates([])
      setSearching(false)
      setError(null)
      return
    }

    const id = ++requestId.current
    setSearching(true)
    setError(null)

    const timer = setTimeout(() => {
      searchAddressCandidates(q)
        .then((results) => {
          if (id !== requestId.current) return
          setCandidates(results)
          setOpen(true)
        })
        .catch((err) => {
          if (id !== requestId.current) return
          setError(err.message)
          setCandidates([])
        })
        .finally(() => {
          if (id !== requestId.current) return
          setSearching(false)
        })
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = (candidate) => {
    setQuery(candidate.address)
    setOpen(false)
    onSelect(candidate)
  }

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Search an address..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => candidates.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-400"
      />

      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded border border-neutral-700 bg-neutral-900 shadow-xl">
          {searching || loading ? (
            <div className="px-3 py-2 text-sm text-neutral-500">
              {loading ? 'Loading parcel...' : 'Searching...'}
            </div>
          ) : error ? (
            <div className="px-3 py-2 text-sm text-red-400">{error}</div>
          ) : candidates.length === 0 ? (
            <div className="px-3 py-2 text-sm text-neutral-500">No addresses match "{query}".</div>
          ) : (
            <ul className="max-h-64 overflow-y-auto">
              {candidates.map((c) => (
                <li key={c.bbl}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(c)}
                    className="flex w-full flex-col items-start px-3 py-1.5 text-left text-sm hover:bg-neutral-800"
                  >
                    <span className="text-neutral-100">{c.address}</span>
                    <span className="text-xs text-neutral-500">
                      {c.borough}
                      {c.zipcode ? `, ${c.zipcode}` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
