export const DEFAULT_LOCATION = {
  id: 'marina-di-massa',
  name: 'Marina di Massa',
  area: 'Costa Apuana',
  latitude: 44.007,
  longitude: 10.0999,
}

export const COASTAL_PRESETS = [
  { id: 'livorno', name: 'Livorno', latitude: 43.5485, longitude: 10.3106 },
  { id: 'viareggio', name: 'Viareggio', latitude: 43.8669, longitude: 10.2502 },
  { id: 'forte-dei-marmi', name: 'Forte dei Marmi', latitude: 43.9585, longitude: 10.1699 },
  DEFAULT_LOCATION,
  { id: 'marina-di-carrara', name: 'Marina di Carrara', latitude: 44.0428, longitude: 10.0355 },
  { id: 'lerici', name: 'Lerici', latitude: 44.0759, longitude: 9.9111 },
  { id: 'la-spezia', name: 'La Spezia', latitude: 44.1025, longitude: 9.8241 },
]

export const ITALY_BOUNDS = {
  south: 35.3,
  north: 47.2,
  west: 6.5,
  east: 18.8,
}

export function isInItaly({ latitude, longitude }) {
  return (
    latitude >= ITALY_BOUNDS.south &&
    latitude <= ITALY_BOUNDS.north &&
    longitude >= ITALY_BOUNDS.west &&
    longitude <= ITALY_BOUNDS.east
  )
}

export function nearestPreset(location) {
  if (!location) return DEFAULT_LOCATION

  return COASTAL_PRESETS.reduce((best, candidate) => {
    const dLat = candidate.latitude - location.latitude
    const dLon = candidate.longitude - location.longitude
    const distance = dLat * dLat + dLon * dLon

    if (!best || distance < best.distance) return { ...candidate, distance }
    return best
  }, null)
}
