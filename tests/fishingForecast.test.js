import test from 'node:test'
import assert from 'node:assert/strict'
import { buildFishingForecast, buildSolunarPeriods, findTideEvents, moonInfo } from '../src/lib/fishingForecast.js'

test('moon phase maps new, quarter and full moon correctly', () => {
  assert.equal(moonInfo(0).label, 'Luna nuova')
  assert.equal(moonInfo(0).illumination, 0)
  assert.equal(moonInfo(0.25).label, 'Primo quarto')
  assert.equal(moonInfo(0.25).illumination, 0.5)
  assert.equal(moonInfo(0.5).label, 'Luna piena')
  assert.equal(moonInfo(0.5).illumination, 1)
  assert.equal(moonInfo(0.75).label, 'Ultimo quarto')
})

test('solunar periods are generated from moonrise and moonset', () => {
  const periods = buildSolunarPeriods('2026-09-09T20:00', '2026-09-10T08:00')
  assert.deepEqual(periods.minor, ['19:15–20:45', '07:15–08:45'])
  assert.deepEqual(periods.major, ['01:00–03:00', '13:00–15:00'])
})

test('tide extrema are detected from a sea-level series', () => {
  const now = new Date()
  now.setMinutes(0, 0, 0)
  const times = Array.from({ length: 7 }, (_, i) => new Date(now.getTime() + i * 15 * 60 * 1000).toISOString())
  const events = findTideEvents({
    time: times,
    sea_level_height_msl: [0.1, 0.2, 0.3, 0.2, 0.1, 0.05, 0.1],
  })

  assert.equal(events[0].type, 'Alta')
  assert.equal(events[1].type, 'Bassa')
})

test('forecast builder returns bounded score and marine values', () => {
  const date = new Date().toISOString().slice(0, 10)
  const hours = Array.from({ length: 24 }, (_, i) => `${date}T${String(i).padStart(2, '0')}:00`)
  const quarterHours = Array.from({ length: 16 }, (_, i) => `${date}T${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`)

  const weather = {
    current: {
      temperature_2m: 23,
      apparent_temperature: 24,
      relative_humidity_2m: 70,
      pressure_msl: 1014,
      wind_speed_10m: 12,
      wind_direction_10m: 220,
      wind_gusts_10m: 22,
      weather_code: 1,
    },
    hourly: {
      time: hours,
      pressure_msl: hours.map((_, i) => 1012 + i * 0.1),
    },
    daily: {
      time: [date],
      sunrise: [`${date}T06:45`],
      sunset: [`${date}T19:35`],
      moonrise: [`${date}T20:00`],
      moonset: [`${date}T08:00`],
      moon_phase: [0.5],
      precipitation_probability_max: [15],
      wind_speed_10m_max: [18],
      wind_gusts_10m_max: [30],
      weather_code: [1],
    },
  }

  const marine = {
    current: {
      wave_height: 0.7,
      wave_direction: 240,
      wave_period: 5.5,
      swell_wave_height: 0.4,
      swell_wave_direction: 250,
      swell_wave_period: 7,
      sea_surface_temperature: 23,
      ocean_current_velocity: 0.4,
      ocean_current_direction: 180,
    },
    hourly: {
      time: hours,
      sea_level_height_msl: hours.map((_, i) => 0.1 + Math.sin(i / 4) * 0.1),
    },
    minutely_15: {
      time: quarterHours,
      sea_level_height_msl: quarterHours.map((_, i) => 0.1 + Math.sin(i / 2) * 0.08),
    },
    daily: {
      wave_height_max: [0.9],
    },
  }

  const result = buildFishingForecast(weather, marine)
  assert.ok(result.score >= 10 && result.score <= 96)
  assert.equal(result.current.airTemperature, 23)
  assert.equal(result.current.waveHeight, 0.7)
  assert.equal(result.astronomy.moon.label, 'Luna piena')
  assert.ok(Number.isFinite(result.current.seaLevel))
})
