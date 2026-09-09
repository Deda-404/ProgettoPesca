export function loadLocalState(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function saveLocalState(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // La webapp continua a funzionare anche se lo storage del browser non è disponibile.
  }
}
