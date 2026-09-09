const MONTH_LABELS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
const TIME_BANDS = [
  { id: 'night', label: 'Notte', test: (hour) => hour < 5 || hour >= 22 },
  { id: 'dawn', label: 'Alba', test: (hour) => hour >= 5 && hour < 9 },
  { id: 'morning', label: 'Mattina', test: (hour) => hour >= 9 && hour < 13 },
  { id: 'afternoon', label: 'Pomeriggio', test: (hour) => hour >= 13 && hour < 18 },
  { id: 'evening', label: 'Sera', test: (hour) => hour >= 18 && hour < 22 },
]

function normalizeLabel(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

function addCount(map, key, label) {
  if (!key) return
  const current = map.get(key) || { key, label, count: 0 }
  current.count += 1
  map.set(key, current)
}

function ranked(map, limit = 5) {
  return [...map.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'it'))
    .slice(0, limit)
}

function gearLabel(item) {
  const name = [item?.brand, item?.model].filter(Boolean).join(' ').trim()
  return name || normalizeLabel(item?.category) || 'Attrezzatura'
}

export function buildPersonalStats(catches = [], spots = [], gear = []) {
  const spotById = new Map(spots.map((spot) => [spot.id, spot]))
  const gearById = new Map(gear.map((item) => [item.id, item]))

  const speciesCounts = new Map()
  const spotCounts = new Map()
  const gearCounts = new Map()
  const lureCounts = new Map()
  const monthCounts = MONTH_LABELS.map((label, month) => ({ month, label, count: 0 }))
  const timeBandCounts = TIME_BANDS.map((band) => ({ id: band.id, label: band.label, count: 0 }))

  let knownWeightCount = 0
  let totalWeight = 0
  let knownLengthCount = 0
  let totalLength = 0
  let geolocated = 0
  let withPhoto = 0
  let withGear = 0

  for (const item of catches) {
    const species = normalizeLabel(item.species)
    if (species) addCount(speciesCounts, species.toLocaleLowerCase('it'), species)

    const spot = item.spotId ? spotById.get(item.spotId) : null
    const locationLabel = normalizeLabel(spot?.name || item.locationLabel)
    if (locationLabel) addCount(spotCounts, locationLabel.toLocaleLowerCase('it'), locationLabel)

    const lure = normalizeLabel(item.lure)
    if (lure) addCount(lureCounts, lure.toLocaleLowerCase('it'), lure)

    const ids = [...new Set(item.gearIds ?? [])]
    if (ids.length) withGear += 1
    ids.forEach((id) => {
      const linked = gearById.get(id)
      if (!linked) return
      addCount(gearCounts, id, gearLabel(linked))
    })

    const weight = Number(item.weight)
    if (Number.isFinite(weight) && weight > 0) {
      knownWeightCount += 1
      totalWeight += weight
    }

    const length = Number(item.length)
    if (Number.isFinite(length) && length > 0) {
      knownLengthCount += 1
      totalLength += length
    }

    const hasCoordinates = Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude))
    if (hasCoordinates || spot) geolocated += 1
    if (item.photoPath || item.photoLocalKey || item.photoUrl) withPhoto += 1

    const date = new Date(item.caughtAt)
    if (!Number.isNaN(date.getTime())) {
      monthCounts[date.getMonth()].count += 1
      const hour = date.getHours()
      const bandIndex = TIME_BANDS.findIndex((band) => band.test(hour))
      if (bandIndex >= 0) timeBandCounts[bandIndex].count += 1
    }
  }

  const topSpecies = ranked(speciesCounts)
  const topSpots = ranked(spotCounts)
  const topGear = ranked(gearCounts)
  const topLures = ranked(lureCounts)
  const bestMonth = [...monthCounts].sort((a, b) => b.count - a.count)[0]
  const bestTimeBand = [...timeBandCounts].sort((a, b) => b.count - a.count)[0]

  return {
    totals: {
      catches: catches.length,
      species: speciesCounts.size,
      spotsUsed: spotCounts.size,
      gearUsed: gearCounts.size,
      geolocated,
      withPhoto,
      withGear,
      totalWeight: knownWeightCount ? Number(totalWeight.toFixed(2)) : null,
      averageWeight: knownWeightCount ? Number((totalWeight / knownWeightCount).toFixed(2)) : null,
      averageLength: knownLengthCount ? Number((totalLength / knownLengthCount).toFixed(1)) : null,
    },
    topSpecies,
    topSpots,
    topGear,
    topLures,
    monthCounts,
    timeBandCounts,
    bestMonth: bestMonth?.count ? bestMonth : null,
    bestTimeBand: bestTimeBand?.count ? bestTimeBand : null,
  }
}

export { MONTH_LABELS }
