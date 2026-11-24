import { ArrowLeft, CalendarPlus, CheckCircle, ClockCountdown, WarningCircle, WhatsappLogo, XCircle } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { Button, Skeleton, errMsg, toast } from '../../components/ui'
import { api, BACKEND_MODE, loadApi } from '../../lib/api'
import { money } from '../../lib/pricing'
import { useCatalog } from '../../lib/store'
import type { Booking, BookingStatus as Status } from '../../lib/types'
import { fmtDate } from './Booking'

const STATUS: Record<Status, { label: string; text: string; tone: string; Icon: typeof CheckCircle }> = {
  pending_payment: { label: 'Falta la seña', text: 'Tu horario está reservado por 30 minutos. Pagá la seña para asegurarlo.', tone: 'bg-gris-50 text-ink', Icon: ClockCountdown },
  paid: { label: 'Seña recibida', text: 'Recibimos tu seña. Stefania confirma tu turno por WhatsApp en breve.', tone: 'bg-bordo-50 text-bordo', Icon: CheckCircle },
  confirmed: { label: 'Turno confirmado', text: 'Te esperamos en el estudio. Llegá con las uñas limpias y sin esmalte tradicional.', tone: 'bg-bordo text-white', Icon: CheckCircle },
  completed: { label: 'Turno realizado', text: 'Gracias por venir. Te esperamos para el próximo.', tone: 'bg-gris-50 text-ink', Icon: CheckCircle },
  cancelled: { label: 'Turno cancelado', text: 'Este turno fue cancelado. Si fue un error, escribinos por WhatsApp.', tone: 'bg-gris-50 text-ink', Icon: XCircle },
  rejected: { label: 'Turno no disponible', text: 'No pudimos tomar este turno. Escribinos por WhatsApp para buscar otro horario.', tone: 'bg-gris-50 text-ink', Icon: WarningCircle },
}

function icsFor(b: Booking) {
  const [y, m, d] = b.date.split('-').map(Number)
  const [hh, mm] = b.time.split(':').map(Number)
  const start = new Date(y, m - 1, d, hh, mm)
  const end = new Date(start.getTime() + b.durationMin * 60000)
  const f = (x: Date) => x.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Stefania Nails Studio//Turnos//ES',
    'BEGIN:VEVENT',
    `UID:${b.id}@stefania-nails`,
    `DTSTAMP:${f(new Date())}`,
    `DTSTART:${f(start)}`,
    `DTEND:${f(end)}`,
    `SUMMARY:${b.serviceName} · Stefania Nails Studio`,
    `DESCRIPTION:Código ${b.code}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export default function BookingStatus() {
  const { id = '' } = useParams()
  const [qs] = useSearchParams()
  const { settings, load } = useCatalog()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)

  const fetchBooking = useCallback(async () => {
    try {
      const paymentId = qs.get('payment_id') ?? qs.get('collection_id')
      if (BACKEND_MODE === 'supabase' && paymentId && paymentId !== 'null') {
        const [{ verifyPayment }, impl] = await Promise.all([import('../../lib/api/supabase'), loadApi()])
        try {
          setBooking(await verifyPayment(impl, id, paymentId))
          return
        } catch {
          /* si falla la verificación, mostramos el estado guardado */
        }
      }
      setBooking(await api.getBooking(id))
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setLoading(false)
    }
  }, [id, qs])

  useEffect(() => {
    load()
    fetchBooking()
  }, [fetchBooking, load])

  // si la seña está en proceso, reconsultar cada tanto (webhook de Mercado Pago)
  useEffect(() => {
    if (booking?.status !== 'pending_payment' || !qs.get('payment_id')) return
    const t = setInterval(fetchBooking, 5000)
    return () => clearInterval(t)
  }, [booking?.status, qs, fetchBooking])

  const pay = async () => {
    if (!booking) return
    setPaying(true)
    try {
      const p = await api.startPayment(booking.id)
      if (p.redirectUrl.startsWith('#')) window.location.hash = p.redirectUrl.slice(1)
      else window.location.href = p.redirectUrl
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setPaying(false)
    }
  }

  const st = booking ? STATUS[booking.status] : null
  const wa = settings?.whatsapp
  const waText = booking ? `Hola Stefania! Reservé un turno (${booking.code}) para el ${fmtDate(booking.date)} a las ${booking.time}.` : ''

  return (
    <div className="min-h-[100dvh] bg-[#f3efee] px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-[15px] font-medium hover:bg-ink/5">
            <ArrowLeft size={18} /> Inicio
          </Link>
          <Logo className="h-9 text-bordo" />
          <span className="w-[72px]" />
        </div>

        {loading ? (
          <Skeleton className="h-[480px] rounded-[32px]" />
        ) : !booking || !st ? (
          <div className="rounded-[32px] bg-white p-8 text-center">
            <WarningCircle size={36} className="mx-auto text-bordo" />
            <h1 className="mt-3 text-4xl text-bordo">No encontramos tu reserva</h1>
            <p className="mt-2 text-choco">Revisá el enlace o escribinos por WhatsApp.</p>
          </div>
        ) : (
          <motion.article initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden rounded-[32px] bg-white shadow-[0_40px_80px_-50px_rgb(73_45_35/0.6)]">
            <div className={`flex items-center gap-3 px-6 py-4 ${st.tone}`}>
              <st.Icon size={22} weight="fill" />
              <p className="font-semibold">{st.label}</p>
            </div>
            {/* tarjeta de turno, como la de la marca */}
            <div className="relative bg-[#f7f2ef] p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-serif text-[30px] leading-none text-bordo">Tu próximo turno</p>
                  <p className="mt-2 text-[14px] text-choco">{st.text}</p>
                </div>
                <Logo className="hidden h-12 shrink-0 text-bordo sm:block" />
              </div>
              <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5">
                <div className="border-b border-bordo/20 pb-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-choco">Fecha</dt>
                  <dd className="mt-1 font-medium">{fmtDate(booking.date)}</dd>
                </div>
                <div className="border-b border-bordo/20 pb-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-choco">Hora</dt>
                  <dd className="mt-1 font-medium">{booking.time} h</dd>
                </div>
                <div className="col-span-2 border-b border-bordo/20 pb-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-choco">Servicio</dt>
                  <dd className="mt-1 font-medium">
                    {booking.serviceName}
                    {booking.designName && <span className="text-choco"> · {booking.designName}</span>}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-choco">Código</dt>
                  <dd className="mt-1 font-mono text-[15px] font-semibold tracking-wider">{booking.code}</dd>
                </div>
                <div className="text-right">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-choco">Total</dt>
                  <dd className="mt-1 font-serif text-[26px] leading-none">{money(booking.total)}</dd>
                </div>
              </dl>
              {booking.deposit > 0 && (
                <p className="mt-4 text-[14px] text-choco">
                  Seña {booking.status === 'pending_payment' ? 'a pagar' : 'abonada'}: <span className="font-semibold text-ink">{money(booking.deposit)}</span>
                  {booking.paymentMethod === 'simulated' && ' (pago de prueba)'}
                </p>
              )}
            </div>
            <div className="grid gap-3 p-6 sm:grid-cols-2">
              {booking.status === 'pending_payment' ? (
                <Button size="lg" className="sm:col-span-2" loading={paying} onClick={pay}>
                  Pagar seña de {money(booking.deposit)}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  icon={<CalendarPlus size={18} />}
                  onClick={() => {
                    const blob = new Blob([icsFor(booking)], { type: 'text/calendar' })
                    const a = document.createElement('a')
                    a.href = URL.createObjectURL(blob)
                    a.download = `turno-${booking.code}.ics`
                    a.click()
                    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
                  }}
                >
                  Agendar en el calendario
                </Button>
              )}
              {wa && (
                <a
                  href={`https://wa.me/${wa}?text=${encodeURIComponent(waText)}`}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-[15px] font-semibold text-white transition hover:bg-black/85 ${booking.status === 'pending_payment' ? 'sm:col-span-2' : ''}`}
                >
                  <WhatsappLogo size={18} weight="fill" /> Escribir a Stefania
                </a>
              )}
            </div>
          </motion.article>
        )}
        <p className="mt-6 text-center text-[13px] text-choco">Guardá este enlace para ver el estado de tu turno.</p>
      </div>
    </div>
  )
}
