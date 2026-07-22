import { useMemo, useRef } from 'react'
import Map, { Source, Layer } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { READINESS_FILL_EXPRESSION } from '../lib/scoring'

const NYC_INITIAL_VIEW = { longitude: -73.98, latitude: 40.75, zoom: 11 }

// Free, no-key vector basemap (CARTO's Dark Matter style) instead of Mapbox —
// MapLibre GL JS is a fully open-source fork of Mapbox GL JS with no usage
// billing, so there's no token, no account, and no cost ceiling to manage.
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

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

// Only primitive fields go into GeoJSON properties. MapLibre serializes a
// client-side GeoJSON source's properties the same way it would vector-tile
// properties — nested arrays/objects (like a parcel's score breakdown) come
// back out of queryRenderedFeatures as JSON *strings*, not the original
// value. Keeping this to bbl + score sidesteps that entirely: the click
// handler below just uses the bbl to look up the real parcel object from
// React state, which was never round-tripped through the map at all.
function parcelsToGeoJSON(parcels) {
  return {
    type: 'FeatureCollection',
    features: parcels
      .filter((p) => typeof p.longitude === 'number' && typeof p.latitude === 'number')
      .map((p) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
        properties: { bbl: p.bbl, readiness_score: p.readiness_score },
      })),
  }
}

export default function ParcelMap({ parcels, onSelectParcel }) {
  const mapRef = useRef(null)
  const geojson = useMemo(() => parcelsToGeoJSON(parcels), [parcels])

  return (
    <Map
      ref={mapRef}
      initialViewState={NYC_INITIAL_VIEW}
      mapStyle={MAP_STYLE}
      interactiveLayerIds={['parcel-points']}
      onClick={(e) => {
        const feature = e.features?.[0]
        if (feature) onSelectParcel(feature.properties.bbl)
      }}
      // The map mounts inside a flex layout before that layout's final size
      // is settled, so the canvas otherwise gets stuck at the browser's
      // default 400x300 — force a resize once the map has actually loaded.
      onLoad={(e) => e.target.resize()}
      style={{ width: '100%', height: '100%' }}
    >
      <Source id="parcels" type="geojson" data={geojson}>
        <Layer {...circleLayer} />
      </Source>
    </Map>
  )
}
