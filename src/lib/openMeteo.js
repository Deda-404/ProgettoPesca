const WEATHER_API = 'https://api.open-meteo.com/v1/forecast'
const MARINE_API = 'https://marine-api.open-meteo.com/v1/marine'

const WEATHER_CURRENT = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'pressure_msl',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'weather_code',
]

const WEATHER_HOURLY = [
  'temperature_2m',
  'relative_humidity_2m',
  'pressure_msl',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'precipitation_probability',
  'weather_code',
]

const WEATHER_DAILY = [
  'sunrise',
  'sunset',
  'moonrise',
  'moonset',
  'moon_phase',
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_probability_max',
  'wind_speed_10m_max',
  'wind_gusts_10m_max',
]

const MARINE_CURRENT = [
  'wave_height',
  'wave_direction',
  'wave_period',
  'swell_wave_height',
  'swell_wave_direction',
  'swell_wave_period',
  'sea_surface_temperature',
  'ocean_current_velocity',
  'ocean_current_direction',
]

const MARINE_HOURLY = [
  ...MARINE_CURRENT,
  'sea_level_height_msl',
]

const MARINE_DAILY = [
  'wave_height_max',
  'wave_direction_dominant',
  'wave_period_max',
  'swell_wave_height_max',
  'swell_wave_direction_dominant',
  'swell_wave_period_max',
]

function buildUrl(base, params) {
  const url = new URL(base)
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) url.searchParams.set(key, value.join(','))
    else if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
  })
  return url.toString()
}

async function fetchJson(url, signal) {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`Servizio dati non disponibile (${response.status})`)
  const data = await response.json()
  if (data?.error) throw new Error(data.reason || 'Risposta dati non valida')
  return data
}

export async function fetchFishingConditions({ latitude, longitude }, { signal } = {}) {
  const common = {
    latitude,
    longitude,
    timezone: 'Europe/Rome',
    forecast_days: 7,
  }

  const weatherUrl = buildUrl(WEATHER_API, {
    ...common,
    current: WEATHER_CURRENT,
    hourly: WEATHER_HOURLY,
    daily: WEATHER_DAILY,
    cell_selection: 'land',
  })

  const marineUrl = buildUrl(MARINE_API, {
    ...common,
    current: MARINE_CURRENT,
    hourly: MARINE_HOURLY,
    minutely_15: ['sea_level_height_msl'],
    forecast_minutely_15: 192,
    daily: MARINE_DAILY,
    cell_selection: 'sea',
  })

  const [weather, marine] = await Promise.all([
    fetchJson(weatherUrl, signal),
    fetchJson(marineUrl, signal),
  ])

  return { weather, marine }
}

export function weatherCodeLabel(code) {
  if (code === 0) return 'Sereno'
  if ([1, 2].includes(code)) return 'Poco nuvoloso'
  if (code === 3) return 'Coperto'
  if ([45, 48].includes(code)) return 'Nebbia'
  if ([51, 53, 55, 56, 57].includes(code)) return 'Pioviggine'
  if ([61, 63, 65, 66, 67].includes(code)) return 'Pioggia'
  if ([71, 73, 75, 77].includes(code)) return 'Neve'
  if ([80, 81, 82].includes(code)) return 'Rovesci'
  if ([85, 86].includes(code)) return 'Rovesci di neve'
  if ([95, 96, 99].includes(code)) return 'Temporale'
  return 'Variabile'
}

export function compassDirection(degrees) {
  const value = Number(degrees)
  if (!Number.isFinite(value)) return '—'
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
  return points[Math.round((((value % 360) + 360) % 360) / 45) % 8]
}
