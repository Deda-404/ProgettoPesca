import { useEffect, useState } from 'react'
import { buildFishingForecast } from '../lib/fishingForecast'
import { fetchFishingConditions } from '../lib/openMeteo'

export function useFishingForecast(location) {
  const [state, setState] = useState({ data: null, loading: true, error: '' })

  useEffect(() => {
    if (!location?.latitude || !location?.longitude) return undefined

    const controller = new AbortController()
    setState((current) => ({ ...current, loading: true, error: '' }))

    fetchFishingConditions(location, { signal: controller.signal })
      .then(({ weather, marine }) => {
        setState({
          data: {
            ...buildFishingForecast(weather, marine),
            source: {
              weatherModelTimezone: weather.timezone,
              marineModelTimezone: marine.timezone,
              weatherGrid: { latitude: weather.latitude, longitude: weather.longitude },
              marineGrid: { latitude: marine.latitude, longitude: marine.longitude },
            },
          },
          loading: false,
          error: '',
        })
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return
        setState({ data: null, loading: false, error: error?.message || 'Impossibile caricare le previsioni.' })
      })

    return () => controller.abort()
  }, [location?.latitude, location?.longitude])

  return state
}
