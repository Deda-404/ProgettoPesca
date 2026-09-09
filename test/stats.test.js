import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPersonalStats } from '../src/lib/stats.js'

test('personal stats rank species, spots, gear and lures', () => {
  const spots = [{ id: 's1', name: 'Pontile' }]
  const gear = [
    { id: 'g1', category: 'canna', brand: 'Zebco', model: '2.40' },
    { id: 'g2', category: 'artificiale', brand: 'Yo-Zuri', model: 'Minnow' },
  ]
  const catches = [
    {
      species: 'Spigola', caughtAt: '2026-01-10T06:30:00+01:00', spotId: 's1', gearIds: ['g1', 'g2'], lure: 'Minnow', weight: 2.4, length: 62,
    },
    {
      species: 'spigola', caughtAt: '2026-01-12T07:10:00+01:00', spotId: 's1', gearIds: ['g1'], lure: 'Minnow', weight: 1.8, length: 55,
    },
    {
      species: 'Serra', caughtAt: '2026-08-20T19:20:00+02:00', locationLabel: 'Marina di Massa', gearIds: ['g1'], lure: 'WTD', latitude: 44.0, longitude: 10.1,
    },
  ]

  const result = buildPersonalStats(catches, spots, gear)

  assert.equal(result.totals.catches, 3)
  assert.equal(result.totals.species, 2)
  assert.equal(result.topSpecies[0].label.toLowerCase(), 'spigola')
  assert.equal(result.topSpecies[0].count, 2)
  assert.equal(result.topSpots[0].label, 'Pontile')
  assert.equal(result.topGear[0].label, 'Zebco 2.40')
  assert.equal(result.topGear[0].count, 3)
  assert.equal(result.topLures[0].label, 'Minnow')
  assert.equal(result.totals.averageWeight, 2.1)
  assert.equal(result.totals.averageLength, 58.5)
})

test('personal stats stay empty-safe', () => {
  const result = buildPersonalStats([], [], [])
  assert.equal(result.totals.catches, 0)
  assert.deepEqual(result.topSpecies, [])
  assert.equal(result.bestMonth, null)
  assert.equal(result.bestTimeBand, null)
})
