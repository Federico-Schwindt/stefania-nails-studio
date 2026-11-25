import { lazy, Suspense, useLayoutEffect } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from './components/ui'
import Home from './pages/Home'

const Booking = lazy(() => import('./pages/booking/Booking'))
const BookingStatus = lazy(() => import('./pages/booking/BookingStatus'))
const SimulatedPay = lazy(() => import('./pages/booking/SimulatedPay'))
const Deposit = lazy(() => import('./pages/booking/Deposit'))
const MyBooking = lazy(() => import('./pages/booking/MyBooking'))
const AdminApp = lazy(() => import('./pages/admin/AdminApp'))

function Fallback() {
  return <div className="min-h-[100dvh]" aria-busy="true" />
}

/** Sitio público en tema oscuro; el panel del estudio queda claro (más cómodo para trabajar). */
function ThemeScope() {
  const { pathname } = useLocation()
  useLayoutEffect(() => {
    const dark = !pathname.startsWith('/admin')
    document.documentElement.classList.toggle('theme-dark', dark)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b0a0a' : '#171516')
  }, [pathname])
  return null
}

export default function App() {
  return (
    <HashRouter>
      <ThemeScope />
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/reservar" element={<Booking />} />
          <Route path="/reserva/:id" element={<BookingStatus />} />
          <Route path="/pago-simulado/:id" element={<SimulatedPay />} />
          <Route path="/sena/:id" element={<Deposit />} />
          <Route path="/mi-turno" element={<MyBooking />} />
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
      <Toaster />
    </HashRouter>
  )
}
