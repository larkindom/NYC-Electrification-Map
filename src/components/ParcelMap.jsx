import { useMemo, useRef } from 'react'
import Map, { Source, Layer } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { READINESS_FILL_EXPRESSION } from '../lib/scoring'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

const NYC_INITIAL_VIEW = { longitude: -73.98, latitude: 40.75, zoom: 11 }

// PLUTO's own tax-lot polygon field (`geom`) isn't pulled per parcel — at
// city scale that payload gets enormous fast — so parcels render as
// color-coded points rather than filled lot outlines. Same interpolate/color
// logic the spec asks for, applied to a circle layer instead of a fill layer.
const circleLayer = {
  id: 'parcel-points',
  type: 'circle',
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 2, 16, 8],
    'circle-color': READINESS_FILL_EXPRESSION,
    'circle-stroke-width': 0.5,
    'circle-stroke-color': '#0a0a0a',
    'circle-opacity': 0.85,
  },
}

function parcelsToGeoJSON(parcels) {
  return {
    type: 'FeatureCollection',
    features: parcels
      .filter((p) => typeof p.longitude === 'number' && typeof p.latitude === 'number')
      .map((p) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
        properties: p,
      })),
  }
}

export default function ParcelMap({ parcels, onSelectParcel }) {
  const mapRef = useRef(null)
  const geojson = useMemo(() => parcelsToGeoJSON(parcels), [parcels])

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-full items-center justify-center bg-neutral-950 p-6 text-center text-neutral-400">
        Missing VITE_MAPBOX_TOKEN — set it in .env.local to render the map.
      </div>
    )
  }

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={MAPBOX_TOKEN}
      initialViewState={NYC_INITIAL_VIEW}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      interactiveLayerIds={['parcel-points']}
      onClick={(e) => {
        const feature = e.features?.[0]
        if (feature) onSelectParcel(feature.properties)
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <Source id="parcels" type="geojson" data={geojson}>
        <Layer {...circleLayer} />
      </Source>
    </Map>
  )
}
