import { compassDirection, weatherCodeLabel } from './openMeteo.js'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

function timeToMinutes(value) {
  if (!value || !value.includes('T')) return null
  const [hours, minutes] = value.split('T')[1].split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  return hours * 60 + minutes
}

function minutesToTime(total) {
  if (!Number.isFinite(total)) return '—'
  const normalized = ((Math.round(total) % 1440) + 1440) % 1440
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function periodAround(center, halfWindowMinutes) {
  if (!Number.isFinite(center)) return '—'
  return `${minutesToTime(center - halfWindowMinutes)}–${minutesToTime(center + halfWindowMinutes)}`
}

export function moonInfo(phase) {
  if (!Number.isFinite(phase)) return { label: '—', illumination: null, strength: 0.5 }

  const normalized = ((phase % 1) + 1) % 1
  const illumination = clamp(1 - Math.abs(normalized - 0.5) * 2, 0, 1)

  let label = 'Luna nuova'
  if (normalized >= 0.0625 && normalized < 0.1875) label = 'Crescente'
  else if (normalized >= 0.1875 && normalized < 0.3125) label = 'Primo quarto'
  else if (normalized >= 0.3125 && normalized < 0.4375) label = 'Gibbosa crescente'
  else if (normalized >= 0.4375 && normalized < 0.5625) label = 'Luna piena'
  else if (normalized >= 0.5625 && normalized < 0.6875) label = 'Gibbosa calante'
  else if (normalized >= 0.6875 && normalized < 0.8125) label = 'Ultimo quarto'
  else if (normalized >= 0.8125 && normalized < 0.9375) label = 'Calante'

  const strength = clamp(Math.abs(illumination - 0.5) * 2, 0, 1)
  return { label, illumination, strength }
}

export function buildSolunarPeriods(moonrise, moonset) {
  const rise = timeToMinutes(moonrise)
  let set = timeToMinutes(moonset)

  if (!Number.isFinite(rise) || !Number.isFinite(set)) {
    return { major: ['—', '—'], minor: ['—', '—'] }
  }

  if (set <= rise) set += 1440
  const upperTransit = (rise + set) / 2
  const lowerTransit = upperTransit + 720

  return {
    major: [periodAround(upperTransit, 60), periodAround(lowerTransit, 60)],
    minor: [periodAround(rise, 45), periodAround(set, 45)],
  }
}

function pressureTrend(hourly) {
  const times = hourly?.time || []
  const values = hourly?.pressure_msl || []
  if (times.length < 4 || values.length < 4) return 0

  const now = Date.now()
  let index = times.findIndex((time) => new Date(time).getTime() >= now)
  if (index < 0) index = values.length - 1
  const previous = Math.max(0, index - 3)
  const current = Number(values[index])
  const past = Number(values[previous])
  if (!Number.isFinite(current) || !Number.isFinite(past)) return 0
  return current - past
}

function tideRangeForDay(series, dateString) {
  const times = series?.time || []
  const values = series?.sea_level_height_msl || []
  const points = values
    .map(Number)
    .filter((value, index) => times[index]?.startsWith(dateString) && Number.isFinite(value))
  if (!points.length) return null
  return Math.max(...points) - Math.min(...points)
}

function nearestSeriesValue(series, variable) {
  const times = series?.time || []
  const values = series?.[variable] || []
  if (!times.length || !values.length) return null

  const now = Date.now()
  let bestIndex = -1
  let bestDistance = Number.POSITIVE_INFINITY

  times.forEach((time, index) => {
    const value = Number(values[index])
    if (!Number.isFinite(value)) return
    const distance = Math.abs(new Date(time).getTime() - now)
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  })

  return bestIndex >= 0 ? Number(values[bestIndex]) : null
}

export function findTideEvents(series, limit = 4) {
  const times = series?.time || []
  const values = series?.sea_level_height_msl || []
  const now = Date.now()
  const events = []

  for (let i = 1; i < values.length - 1; i += 1) {
    const previous = Number(values[i - 1])
    const current = Number(values[i])
    const next = Number(values[i + 1])
    if (![previous, current, next].every(Number.isFinite)) continue

    const timestamp = new Date(times[i]).getTime()
    if (timestamp < now - 30 * 60 * 1000) continue

    if (current > previous && current >= next) events.push({ type: 'Alta', time: times[i], value: current })
    else if (current < previous && current <= next) events.push({ type: 'Bassa', time: times[i], value: current })

    if (events.length >= limit) break
  }

  return events
}

function scoreConditions({ wind, gust, wave, rain, pressureDelta, moonStrength, tideRange }) {
  let score = 55

  if (wind >= 5 && wind <= 24) score += 10
  else if (wind > 35) score -= 14
  else if (wind > 28) score -= 7

  if (gust > 50) score -= 12
  else if (gust > 38) score -= 6

  if (wave >= 0.3 && wave <= 1.25) score += 12
  else if (wave > 2) score -= 18
  else if (wave > 1.5) score -= 9

  if (rain <= 25) score += 5
  else if (rain >= 70) score -= 10

  if (pressureDelta >= -2.5 && pressureDelta <= 1.5) score += 6
  else if (Math.abs(pressureDelta) > 5) score -= 6

  score += Math.round(moonStrength * 7)
  if (Number.isFinite(tideRange)) score += clamp(Math.round(tideRange * 20), 0, 7)

  return clamp(Math.round(score), 10, 96)
}

function scoreLabel(score) {
  if (score >= 85) return 'Eccellente'
  if (score >= 72) return 'Molto buona'
  if (score >= 58) return 'Buona'
  if (score >= 43) return 'Discreta'
  return 'Debole'
}

function buildAdvice({ month, wave, wind, seaTemp, sunrise, sunset, score }) {
  const dawn = sunrise?.split('T')[1]?.slice(0, 5) || 'alba'
  const dusk = sunset?.split('T')[1]?.slice(0, 5) || 'tramonto'
  const dawnMinutes = timeToMinutes(sunrise)
  const postDawn = Number.isFinite(dawnMinutes) ? minutesToTime(dawnMinutes + 90) : 'circa 90 min dopo l’alba'

  if (month >= 5 && month <= 10 && seaTemp >= 20 && wave <= 1.3 && wind <= 30) {
    return {
      title: 'Serra e predatori costieri',
      text: `Condizioni compatibili con spinning a serra e altri predatori. Prova soprattutto ${dawn}–${postDawn} e nell’ultima ora prima delle ${dusk}.`,
    }
  }

  if ((month >= 10 || month <= 3) && wave >= 0.35 && wave <= 1.7 && wind <= 35) {
    return {
      title: 'Spigola favorita',
      text: `Mare e stagione sono interessanti per la spigola. Concentrati su cambi di luce, foce e acqua leggermente mossa; riferimento alba ${dawn}, tramonto ${dusk}.`,
    }
  }

  return {
    title: score >= 70 ? 'Buona finestra per lo spinning' : 'Seleziona bene la finestra',
    text: `Le fasce più affidabili restano i cambi di luce e i periodi solunari. Alba ${dawn}, tramonto ${dusk}; controlla vento e onda prima di scegliere lo spot.`,
  }
}

export function buildFishingForecast(weather, marine) {
  const currentWeather = weather?.current || {}
  const currentMarine = marine?.current || {}
  const dailyWeather = weather?.daily || {}
  const dailyMarine = marine?.daily || {}
  const tideSeries = marine?.minutely_15?.time?.length ? marine.minutely_15 : marine?.hourly
  const todayDate = dailyWeather.time?.[0]
  const moonPhaseRaw = dailyWeather.moon_phase?.[0]
  const moon = moonInfo(moonPhaseRaw === null || moonPhaseRaw === undefined ? Number.NaN : Number(moonPhaseRaw))
  const solunar = buildSolunarPeriods(dailyWeather.moonrise?.[0], dailyWeather.moonset?.[0])
  const pressureDelta = pressureTrend(weather?.hourly)
  const tideRange = tideRangeForDay(tideSeries, todayDate)
  const seaLevel = nearestSeriesValue(tideSeries, 'sea_level_height_msl')

  const score = scoreConditions({
    wind: Number(currentWeather.wind_speed_10m) || 0,
    gust: Number(currentWeather.wind_gusts_10m) || 0,
    wave: Number(currentMarine.wave_height) || 0,
    rain: Number(dailyWeather.precipitation_probability_max?.[0]) || 0,
    pressureDelta,
    moonStrength: moon.strength,
    tideRange,
  })

  const days = (dailyWeather.time || []).map((date, index) => {
    const rawPhase = dailyWeather.moon_phase?.[index]
    const dayMoon = moonInfo(rawPhase === null || rawPhase === undefined ? Number.NaN : Number(rawPhase))
    const dayScore = scoreConditions({
      wind: Number(dailyWeather.wind_speed_10m_max?.[index]) || 0,
      gust: Number(dailyWeather.wind_gusts_10m_max?.[index]) || 0,
      wave: Number(dailyMarine.wave_height_max?.[index]) || 0,
      rain: Number(dailyWeather.precipitation_probability_max?.[index]) || 0,
      pressureDelta: 0,
      moonStrength: dayMoon.strength,
      tideRange: tideRangeForDay(marine?.hourly, date),
    })

    return {
      date,
      score: dayScore,
      label: scoreLabel(dayScore),
      weatherCode: dailyWeather.weather_code?.[index],
      waveMax: dailyMarine.wave_height_max?.[index],
      windMax: dailyWeather.wind_speed_10m_max?.[index],
    }
  })

  const seaTemp = Number(currentMarine.sea_surface_temperature)
  const month = todayDate ? new Date(`${todayDate}T12:00:00`).getMonth() + 1 : new Date().getMonth() + 1
  const advice = buildAdvice({
    month,
    wave: Number(currentMarine.wave_height) || 0,
    wind: Number(currentWeather.wind_speed_10m) || 0,
    seaTemp: Number.isFinite(seaTemp) ? seaTemp : 0,
    sunrise: dailyWeather.sunrise?.[0],
    sunset: dailyWeather.sunset?.[0],
    score,
  })

  return {
    score,
    scoreLabel: scoreLabel(score),
    current: {
      airTemperature: currentWeather.temperature_2m,
      apparentTemperature: currentWeather.apparent_temperature,
      humidity: currentWeather.relative_humidity_2m,
      pressure: currentWeather.pressure_msl,
      pressureDelta,
      windSpeed: currentWeather.wind_speed_10m,
      windDirection: compassDirection(currentWeather.wind_direction_10m),
      windDegrees: currentWeather.wind_direction_10m,
      windGusts: currentWeather.wind_gusts_10m,
      weatherLabel: weatherCodeLabel(currentWeather.weather_code),
      waveHeight: currentMarine.wave_height,
      waveDirection: compassDirection(currentMarine.wave_direction),
      wavePeriod: currentMarine.wave_period,
      swellHeight: currentMarine.swell_wave_height,
      swellDirection: compassDirection(currentMarine.swell_wave_direction),
      swellPeriod: currentMarine.swell_wave_period,
      seaTemperature: currentMarine.sea_surface_temperature,
      currentVelocity: currentMarine.ocean_current_velocity,
      currentDirection: compassDirection(currentMarine.ocean_current_direction),
      seaLevel,
    },
    astronomy: {
      sunrise: dailyWeather.sunrise?.[0],
      sunset: dailyWeather.sunset?.[0],
      moonrise: dailyWeather.moonrise?.[0],
      moonset: dailyWeather.moonset?.[0],
      moon,
      solunar,
    },
    tideEvents: findTideEvents(tideSeries),
    days,
    advice,
  }
}
