import { useCallback, useEffect, useState } from 'react'
import { fetchNeighborhoods, fetchParcelsForNeighborhoods } from '../lib/socrata'
import { calculateReadiness, median } from '../lib/scoring'

export function useParcelData() {
  const [neighborhoods, setNeighborhoods] = useState([])
  const [neighborhoodsLoading, setNeighborhoodsLoading] = useState(true)
  const [selected, setSelected] = useState([])
  const [parcels, setParcels] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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

  return {
    neighborhoods,
    neighborhoodsLoading,
    selected,
    applySelection,
    parcels,
    loading,
    error,
  }
}
