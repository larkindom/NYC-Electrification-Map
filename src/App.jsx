import { useMemo, useRef, useState } from 'react'
import AddressSearch from './components/AddressSearch'
import NeighborhoodSelector from './components/NeighborhoodSelector'
import ParcelMap from './components/ParcelMap'
import ScoreLegend, { countByTier } from './components/ScoreLegend'
import Sidebar from './components/Sidebar'
import SidebarErrorBoundary from './components/SidebarErrorBoundary'
import { useParcelData } from './hooks/useParcelData'
import { scoreTier } from './lib/scoring'

const ALL_TIERS_ON = { red: true, orange: true, green: true }

export default function App() {
  const {
    neighborhoods,
    neighborhoodsLoading,
    selected,
    applySelection,
    parcels,
    loading,
    error,
    loadAddressParcel,
    addressSearchLoading,
    addressSearchError,
  } = useParcelData()
  const [activeBBL, setActiveBBL] = useState(null)
  const [activeTiers, setActiveTiers] = useState(ALL_TIERS_ON)
  const mapRef = useRef(null)

  const handleAddressSelect = async (candidate) => {
    const parcel = await loadAddressParcel(candidate.bbl)
    if (!parcel) return
    mapRef.current?.flyToCoordinates(parcel.longitude, parcel.latitude)
    setActiveBBL(parcel.bbl)
  }
  // Map clicks only pass a BBL (see ParcelMap) — MapLibre's GeoJSON source
  // serializes non-primitive feature properties (arrays/objects) to JSON
  // strings internally, which previously crashed Sidebar's readiness
  // breakdown .map() with no error boundary to catch it. Looking the full
  // parcel back up from React state avoids touching GL-serialized properties
  // at all.
  const activeParcel = parcels.find((p) => p.bbl === activeBBL) ?? null

  const tierCounts = useMemo(() => countByTier(parcels), [parcels])
  const visibleParcels = useMemo(
    () => parcels.filter((p) => activeTiers[scoreTier(p.readiness_score).id]),
    [parcels, activeTiers],
  )
  const toggleTier = (tierId) => setActiveTiers((prev) => ({ ...prev, [tierId]: !prev[tierId] }))

  return (
    <div className="flex h-screen bg-neutral-950">
      <aside className="flex h-full min-h-0 w-80 shrink-0 flex-col border-r border-neutral-800">
        <div className="min-h-0 flex-1">
          <NeighborhoodSelector
            neighborhoods={neighborhoods}
            loading={neighborhoodsLoading}
            selected={selected}
            onApply={applySelection}
          />
        </div>
        <div className="shrink-0 border-t border-neutral-800 p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Or search an address
          </h2>
          <AddressSearch onSelect={handleAddressSelect} loading={addressSearchLoading} />
          {addressSearchError && <p className="mt-2 text-xs text-red-400">{addressSearchError}</p>}
        </div>
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

        <ParcelMap ref={mapRef} parcels={visibleParcels} onSelectParcel={setActiveBBL} />

        {parcels.length > 0 && (
          <div className="absolute bottom-4 left-4 z-10">
            <ScoreLegend counts={tierCounts} activeTiers={activeTiers} onToggle={toggleTier} />
          </div>
        )}

        {activeParcel && (
          <div className="absolute right-0 top-0 h-full w-[360px] shadow-2xl">
            <SidebarErrorBoundary onClose={() => setActiveBBL(null)}>
              <Sidebar parcel={activeParcel} onClose={() => setActiveBBL(null)} />
            </SidebarErrorBoundary>
          </div>
        )}
      </main>
    </div>
  )
}
