import { lazy, Suspense } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from './components/ui'
import Home from './pages/Home'

const Booking = lazy(() => import('./pages/booking/Booking'))
const BookingStatus = lazy(() => import('./pages/booking/BookingStatus'))
const SimulatedPay = lazy(() => import('./pages/booking/SimulatedPay'))
const AdminApp = lazy(() => import('./pages/admin/AdminApp'))

function Fallback() {
  return <div className="min-h-[100dvh] bg-white" aria-busy="true" />
}

export default function App() {
  return (
    <HashRouter>
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/reservar" element={<Booking />} />
          <Route path="/reserva/:id" element={<BookingStatus />} />
          <Route path="/pago-simulado/:id" element={<SimulatedPay />} />
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
      <Toaster />
    </HashRouter>
  )
}
