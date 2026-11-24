import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Mercado Pago vuelve con ?reserva=<id> (sin hash): lo pasamos a la ruta de estado de la reserva.
const qs = new URLSearchParams(window.location.search)
const back = qs.get('reserva')
if (back) {
  const rest = new URLSearchParams(qs)
  rest.delete('reserva')
  const extra = rest.toString()
  window.history.replaceState(null, '', window.location.pathname + `#/reserva/${back}${extra ? `?${extra}` : ''}`)
}

// Si el navegador abrió una versión vieja desde su caché, recargamos con la última publicada.
declare const __BUILD_ID__: string
if (import.meta.env.PROD) {
  fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((v: { build?: string } | null) => {
      if (!v?.build || v.build === __BUILD_ID__) return
      const key = `sns-reloaded-${v.build}`
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
      window.location.reload()
    })
    .catch(() => {})
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
