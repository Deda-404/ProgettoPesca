import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import './forecast.css'
import './catchGeo.css'
import './guest.css'

function syncGuestUiFromStorage() {
  try {
    const guestMode = JSON.parse(localStorage.getItem('xfish:guest-mode') || 'false') === true
    document.documentElement.dataset.xfishGuest = guestMode ? 'true' : 'false'
  } catch {
    document.documentElement.dataset.xfishGuest = 'false'
  }
}

syncGuestUiFromStorage()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // L'app resta utilizzabile anche se il service worker non può essere registrato.
    })
  })
}
