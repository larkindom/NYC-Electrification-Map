import { useCallback, useEffect, useState } from 'react'
import { fetchNeighborhoods, fetchParcelByBBL, fetchParcelsForNeighborhoods } from '../lib/socrata'
import { calculateReadiness, median } from '../lib/scoring'

export function useParcelData() {
  const [neighborhoods, setNeighborhoods] = useState([])
  const [neighborhoodsLoading, setNeighborhoodsLoading] = useState(true)
  const [selected, setSelected] = useState([])
  const [parcels, setParcels] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [addressSearchLoading, setAddressSearchLoading] = useState(false)
  const [addressSearchError, setAddressSearchError] = useState(null)

  useEffect(() => {
    fetchNeighborhoods()
      .then(setNeighborhoods)
      .catch((err) => setError(err.message))
      .finally(() => setNeighborhoodsLoading(false))
  }, [])

  const loadParcels = useCallback(async (names) => {
    if (!names.length) {
      setParcels([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const raw = await fetchParcelsForNeighborhoods(names)
      const ghgMedian = median(raw.map((p) => p.total_ghg_emissions))
      const scored = raw.map((p) => {
        const { score, breakdown } = calculateReadiness(p, ghgMedian)
        return { ...p, readiness_score: score, readiness_breakdown: breakdown }
      })
      setParcels(scored)
    } catch (err) {
      setError(err.message)
      setParcels([])
    } finally {
      setLoading(false)
    }
  }, [])

  const applySelection = useCallback(
    (names) => {
      setSelected(names)
      loadParcels(names)
    },
    [loadParcels],
  )

  // A searched address has no neighborhood context to compute a GHG median
  // against. Falling back to the median of whatever parcel set is already
  // loaded is a reasonable proxy when one exists (still "neighborhood
  // relative", just from a previous selection); with nothing loaded there's
  // no defensible reference point, so the GHG-vs-median criterion is left
  // out of the denominator entirely rather than guessing — same "excluded,
  // not penalized" treatment calculateReadiness already gives missing data.
  const loadAddressParcel = useCallback(
    async (bbl) => {
      setAddressSearchLoading(true)
      setAddressSearchError(null)
      try {
        const parcel = await fetchParcelByBBL(bbl)
        if (!parcel) {
          setAddressSearchError('Could not load that parcel.')
          return null
        }

        const ghgMedian = parcels.length ? median(parcels.map((p) => p.total_ghg_emissions)) : undefined
        const { score, breakdown } = calculateReadiness(parcel, ghgMedian)
        const scored = { ...parcel, readiness_score: score, readiness_breakdown: breakdown }

        setParcels((prev) => [...prev.filter((p) => p.bbl !== scored.bbl), scored])
        return scored
      } catch (err) {
        setAddressSearchError(err.message)
        return null
      } finally {
        setAddressSearchLoading(false)
      }
    },
    [parcels],
  )

  return {
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
  }
}
