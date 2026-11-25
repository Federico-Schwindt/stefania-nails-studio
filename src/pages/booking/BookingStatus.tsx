import { ArrowLeft, CalendarPlus, CheckCircle, ClockCountdown, HourglassMedium, WarningCircle, WhatsappLogo, XCircle } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { Button, Field, Sheet, Skeleton, errMsg, toast } from '../../components/ui'
import { api } from '../../lib/api'
import { money } from '../../lib/pricing'
import { useCatalog } from '../../lib/store'
import type { Booking, BookingStatus as Status } from '../../lib/types'
import { NailSwatch } from '../home/ColorLab'
import { fmtDate } from './Booking'

const STATUS: Record<Status, { label: string; text: string; tone: string; Icon: typeof CheckCircle }> = {
  pending_payment: { label: 'Falta la seña', text: 'Tu horario está reservado por 1 hora. Dejá la seña para asegurarlo.', tone: 'bg-gris-50 text-ink', Icon: ClockCountdown },
  payment_review: { label: 'Verificando tu seña', text: 'Recibimos tu aviso de pago. Stefania lo revisa y te confirma por WhatsApp.', tone: 'bg-gris-50 text-ink', Icon: HourglassMedium },
  paid: { label: 'Seña recibida', text: 'Recibimos tu seña. Stefania confirma tu turno por WhatsApp en breve.', tone: 'bg-gris-50 text-ink', Icon: CheckCircle },
  confirmed: { label: 'Turno confirmado', text: 'Te esperamos en el estudio. Llegá con las uñas limpias y sin esmalte tradicional.', tone: 'bg-ink text-white', Icon: CheckCircle },
  completed: { label: 'Turno realizado', text: 'Gracias por venir. Te esperamos para el próximo.', tone: 'bg-gris-50 text-ink', Icon: CheckCircle },
  no_show: { label: 'No asististe', text: 'Este turno figura como ausente. Si fue un error, escribile a Stefania.', tone: 'bg-gris-50 text-ink', Icon: XCircle },
  cancelled: { label: 'Turno cancelado', text: 'Este turno fue cancelado. Si querés, reservá otro horario.', tone: 'bg-gris-50 text-ink', Icon: XCircle },
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
    'BEGIN:VALARM',
    'TRIGGER:-PT3H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Turno en Stefania Nails Studio',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export default function BookingStatus() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { settings, load } = useCatalog()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [phone, setPhone] = useState(() => sessionStorage.getItem(`sns-phone-${id}`) ?? '')
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string>()

  const fetchBooking = useCallback(async () => {
    try {
      setBooking(await api.getBooking(id))
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
    fetchBooking()
  }, [fetchBooking, load])

  // mientras Stefania revisa la seña, actualizamos solos
  useEffect(() => {
    if (booking?.status !== 'payment_review') return
    const t = setInterval(fetchBooking, 20000)
    return () => clearInterval(t)
  }, [booking?.status, fetchBooking])

  const pay = async () => {
    if (!booking) return
    setPaying(true)
    try {
      const p = await api.startPayment(booking.id)
      if (p.redirectUrl.startsWith('#')) navigate(p.redirectUrl.slice(1))
      else window.location.href = p.redirectUrl
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setPaying(false)
    }
  }

  const cancel = async () => {
    if (!booking) return
    setCancelError(undefined)
    setCancelling(true)
    try {
      setBooking(await api.cancelBookingByClient(booking.id, phone))
      setCancelOpen(false)
      toast.ok('Tu turno quedó cancelado.')
    } catch (e) {
      setCancelError(errMsg(e))
    } finally {
      setCancelling(false)
    }
  }

  const st = booking ? STATUS[booking.status] : null
  const wa = settings?.whatsapp
  const waText = booking ? `Hola Stefania! Te escribo por mi turno ${booking.code} del ${fmtDate(booking.date)} a las ${booking.time}.` : ''
  const active = booking && ['pending_payment', 'payment_review', 'paid', 'confirmed'].includes(booking.status)

  return (
    <div className="min-h-[100dvh] bg-studio px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-[15px] font-medium hover:bg-ink/5">
            <ArrowLeft size={18} /> Inicio
          </Link>
          <Logo className="h-9 text-ink" />
          <span className="w-[72px]" />
        </div>

        {loading ? (
          <Skeleton className="h-[480px] rounded-[14px]" />
        ) : !booking || !st ? (
          <div className="rounded-[14px] glass-light p-8 text-center">
            <WarningCircle size={36} className="mx-auto text-ink" />
            <h1 className="mt-3 text-4xl text-ink">No encontramos tu reserva</h1>
            <p className="mt-2 text-choco">Revisá el enlace o buscala en "Mi turno".</p>
            <Link to="/mi-turno" className="mt-4 inline-block font-semibold text-ink underline">
              Ir a Mi turno
            </Link>
          </div>
        ) : (
          <motion.article
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden rounded-[14px] glass-light shadow-[0_40px_80px_-50px_rgb(23_21_22/0.6)]"
          >
            <div className={`flex items-center gap-3 px-6 py-4 ${st.tone}`}>
              <st.Icon size={22} weight="fill" />
              <p className="font-semibold">{st.label}</p>
            </div>
            <div className="relative bg-gris-50/80 p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-serif text-[30px] leading-none text-ink">Tu próximo turno</p>
                  <p className="mt-2 text-[14px] text-choco">{st.text}</p>
                </div>
                <Logo className="hidden h-12 shrink-0 text-ink sm:block" />
              </div>
              <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5">
                <div className="border-b border-ink/20 pb-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-choco">Fecha</dt>
                  <dd className="mt-1 font-medium">{fmtDate(booking.date)}</dd>
                </div>
                <div className="border-b border-ink/20 pb-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-choco">Hora</dt>
                  <dd className="mt-1 font-medium">{booking.time} h</dd>
                </div>
                <div className="col-span-2 border-b border-ink/20 pb-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-choco">Servicio</dt>
                  <dd className="mt-1 flex items-center gap-2 font-medium">
                    {booking.color && <NailSwatch hex={booking.color.hex} finish={booking.color.finish} shape={booking.color.shape} className="h-6 w-4" />}
                    <span>
                      {booking.serviceName}
                      {booking.designName && <span className="text-choco"> · {booking.designName}</span>}
                      {booking.color && <span className="text-choco"> · {booking.color.name}</span>}
                    </span>
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
                  Seña: <span className="font-semibold text-ink">{money(booking.deposit)}</span>
                  {booking.paidAmount >= booking.deposit && booking.paidAmount > 0 ? ' · abonada' : booking.status === 'payment_review' ? ' · en revisión' : ' · pendiente'}
                </p>
              )}
            </div>
            <div className="grid gap-3 p-6 sm:grid-cols-2">
              {booking.status === 'pending_payment' ? (
                <Button size="lg" className="sm:col-span-2" loading={paying} onClick={pay}>
                  Pagar seña de {money(booking.deposit)}
                </Button>
              ) : active ? (
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
              ) : (
                <Link to="/reservar" className="inline-flex h-11 items-center justify-center rounded-[8px] bg-ink px-5 text-[15px] font-semibold text-white">
                  Reservar otro turno
                </Link>
              )}
              {wa && (
                <a
                  href={`https://wa.me/${wa}?text=${encodeURIComponent(waText)}`}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-ink px-5 text-[15px] font-semibold text-white transition hover:bg-ink/85 ${booking.status === 'pending_payment' ? 'sm:col-span-2' : ''}`}
                >
                  <WhatsappLogo size={18} weight="fill" /> Escribir a Stefania
                </a>
              )}
              {active && (
                <button onClick={() => setCancelOpen(true)} className="text-[14px] font-semibold text-choco underline-offset-4 hover:text-ink hover:underline sm:col-span-2">
                  Cancelar turno
                </button>
              )}
            </div>
          </motion.article>
        )}
        <p className="mt-6 text-center text-[13px] text-choco">Guardá este enlace o tu código para ver el estado de tu turno desde "Mi turno".</p>
      </div>

      <Sheet open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancelar turno">
        <p className="text-choco">
          Podés cancelar hasta {settings?.cancelHours ?? 24} horas antes. La seña no es reembolsable. Para confirmar, ingresá el WhatsApp con el que reservaste.
        </p>
        <div className="mt-4">
          <Field label="WhatsApp" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={cancelError} />
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button variant="outline" onClick={() => setCancelOpen(false)}>
            Volver
          </Button>
          <Button variant="danger" loading={cancelling} onClick={cancel}>
            Sí, cancelar
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
