// Minimal point-in-polygon utilities for filtering parcels against a
// neighborhood boundary. Avoids a turf.js dependency for one function.

function pointInRing(x, y, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0]
    const yi = ring[i][1]
    const xj = ring[j][0]
    const yj = ring[j][1]
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function pointInPolygonCoords(x, y, polygonCoords) {
  // polygonCoords: [outerRing, hole1, hole2, ...]
  if (!pointInRing(x, y, polygonCoords[0])) return false
  for (let i = 1; i < polygonCoords.length; i++) {
    if (pointInRing(x, y, polygonCoords[i])) return false // inside a hole
  }
  return true
}

// geometry: GeoJSON Polygon or MultiPolygon (as returned by Socrata's the_geom)
export function pointInGeometry(lng, lat, geometry) {
  if (!geometry) return false
  if (geometry.type === 'Polygon') {
    return pointInPolygonCoords(lng, lat, geometry.coordinates)
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((poly) => pointInPolygonCoords(lng, lat, poly))
  }
  return false
}

export function geometryBounds(geometry) {
  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity

  const visitRing = (ring) => {
    for (const [lng, lat] of ring) {
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
    }
  }

  const polys = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates]
  for (const poly of polys) {
    for (const ring of poly) visitRing(ring)
  }

  return { minLng, minLat, maxLng, maxLat }
}

export function mergeBounds(boundsList) {
  return boundsList.reduce(
    (acc, b) => ({
      minLng: Math.min(acc.minLng, b.minLng),
      minLat: Math.min(acc.minLat, b.minLat),
      maxLng: Math.max(acc.maxLng, b.maxLng),
      maxLat: Math.max(acc.maxLat, b.maxLat),
    }),
    { minLng: Infinity, minLat: Infinity, maxLng: -Infinity, maxLat: -Infinity },
  )
}
