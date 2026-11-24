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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
