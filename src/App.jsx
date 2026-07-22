import { useState } from 'react'
import NeighborhoodSelector from './components/NeighborhoodSelector'
import ParcelMap from './components/ParcelMap'
import Sidebar from './components/Sidebar'
import { useParcelData } from './hooks/useParcelData'

export default function App() {
  const { neighborhoods, neighborhoodsLoading, selected, applySelection, parcels, loading, error } =
    useParcelData()
  const [activeParcel, setActiveParcel] = useState(null)

  return (
    <div className="flex h-screen bg-neutral-950">
      <aside className="h-full min-h-0 w-80 shrink-0 border-r border-neutral-800">
        <NeighborhoodSelector
          neighborhoods={neighborhoods}
          loading={neighborhoodsLoading}
          selected={selected}
          onApply={applySelection}
        />
      </aside>

      <main className="relative min-w-0 flex-1">
        {loading && (
          <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded bg-neutral-900/90 px-4 py-2 text-sm text-neutral-100 shadow">
            Loading parcels...
          </div>
        )}
        {error && (
          <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded bg-red-900/90 px-4 py-2 text-sm text-neutral-100 shadow">
            {error}
          </div>
        )}
        {!loading && !error && selected.length > 0 && parcels.length === 0 && (
          <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded bg-neutral-900/90 px-4 py-2 text-sm text-neutral-100 shadow">
            No parcels found for the selected neighborhood(s).
          </div>
        )}

        <ParcelMap parcels={parcels} onSelectParcel={setActiveParcel} />

        {activeParcel && (
          <div className="absolute right-0 top-0 h-full w-[360px] shadow-2xl">
            <Sidebar parcel={activeParcel} onClose={() => setActiveParcel(null)} />
          </div>
        )}
      </main>
    </div>
  )
}
