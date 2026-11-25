import { useCallback, useEffect, useState } from 'react'
import { Button, toast } from '../../components/ui'
import { api } from '../../lib/api'
import { money } from '../../lib/pricing'
import { addDays, isoDate, parseIso } from '../../lib/slots'
import type { Booking, BookingStatus } from '../../lib/types'
import BookingSheet from './BookingSheet'
import { BookingStyle, linkPill, PaymentDialog, Photo, StatusPill, WhatsApp } from './BookingTools'
import { activeStatus } from './labels'
import { waLink } from './whatsapp'
import { dateLabel, ErrorText, heading, LoadState, Metrics, panel, studioDate, useAction, useLoad } from './shared'

const start = (b: Booking) => Date.parse(b.date + 'T' + b.time + ':00-03:00')
export default function Today() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  const today = studioDate(new Date(now)), tomorrow = isoDate(addDays(parseIso(today), 1))
  const load = useLoad(useCallback(() => Promise.all([
    api.listBookings('0001-01-01', '9999-12-31'), api.getStats(today, today), api.getSettings(),
  ]), [today]))
  const [paying, setPaying] = useState<Booking>()
  const [selected, setSelected] = useState<Booking>()
  const action = useAction()
  if (!load.data) return <LoadState {...load} />
  const [bookings, stats, settings] = load.data
  const day = bookings.filter(b => b.date === today)
  const upcoming = bookings.filter(b => activeStatus(b.status) && start(b) + b.durationMin * 60_000 > now)
  const next = upcoming[0]
  const reminders = bookings.filter(b => b.date === tomorrow && activeStatus(b.status))
  const review = bookings.filter(b => b.status === 'payment_review')
  function update(b: Booking, status: BookingStatus) {
    if (status === 'rejected' && !window.confirm('¿Querés rechazar el turno de ' + b.clientName + '?')) return
    void action.run(async () => {
      await api.updateBookingStatus(b.id, status); toast.ok('Estado del turno actualizado.'); load.reload()
    })
  }
  return <div className="space-y-6">
    <header><h2 className={heading}>Hola, Stefania</h2><p className="mt-1 capitalize text-choco">{dateLabel(today, { weekday: 'long', day: 'numeric', month: 'long' })}</p></header>
    <Metrics items={[
      ['Turnos de hoy', stats.bookings], ['Por confirmar', bookings.filter(b => b.status === 'paid').length + review.length],
      ['Señas por revisar', review.length], ['Cobrado hoy', money(stats.byMethod.reduce((sum, m) => sum + m.amount, 0))],
    ]} />
    <section className={panel + ' bg-gris-50/50'}>
      <h2 className="text-sm font-semibold text-ink">{next && start(next) <= now ? 'Ahora' : 'Próxima clienta'}</h2>
      {next ? <><button className="mt-1 text-left font-serif text-4xl text-ink underline-offset-4 hover:underline" onClick={() => setSelected(next)}>{next.clientName}</button>
        <p>{next.date === today ? 'Hoy' : dateLabel(next.date)} · {next.time} · {next.serviceName}</p></> : <p className="mt-2 text-choco">No tenés turnos próximos.</p>}
    </section>
    <ErrorText message={action.error} />
    <section className={panel}><h2 className={heading}>Turnos de hoy</h2>
      {!day.length ? <p className="mt-3 text-choco">Hoy tenés la agenda libre.</p> :
        <ul className="divide-y divide-gris">{day.map(b => <li key={b.id} className="grid gap-3 py-4 sm:grid-cols-[4rem_1fr]">
          <strong className="text-ink tabular-nums">{b.time}</strong>
          <div className="min-w-0 space-y-2"><div className="flex flex-wrap items-center gap-2">
            <button className="break-words text-left text-lg font-semibold hover:underline" onClick={() => setSelected(b)}>{b.clientName}</button><StatusPill status={b.status} />
          </div><p>{b.serviceName}</p><BookingStyle booking={b} />
          <fieldset disabled={action.busy} className="flex flex-wrap gap-2">
            {b.status === 'paid' && <Button size="sm" onClick={() => update(b, 'confirmed')}>Confirmar</Button>}
            {b.paidAmount < b.total && (activeStatus(b.status) || b.status === 'completed') && <Button size="sm" variant="outline" onClick={() => setPaying(b)}>Cobrar saldo</Button>}
            {b.status === 'confirmed' && <Button size="sm" onClick={() => update(b, 'completed')}>Completado</Button>}
            {activeStatus(b.status) && <Button size="sm" variant="outline" onClick={() => update(b, 'no_show')}>No vino</Button>}
            {activeStatus(b.status) || b.status === 'completed'
              ? <WhatsApp booking={b} settings={settings} template={b.status === 'completed' ? 'thanks' : ['pending_payment', 'payment_review'].includes(b.status) ? 'payment' : 'confirm'} label="WhatsApp" />
              : <a className={linkPill} href={waLink(b.phone, 'Hola ' + b.clientName + '! Te escribo por tu turno ' + b.code + '.')} target="_blank" rel="noreferrer">WhatsApp</a>}
          </fieldset></div>
        </li>)}</ul>}
    </section>
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <section className={panel}><h2 className={heading}>Mañana</h2>
        {!reminders.length && <p className="mt-3 text-choco">No hay turnos para mañana.</p>}
        {reminders.map(b => <div key={b.id} className="mt-3 space-y-2 border-t border-gris pt-3">
          <p><strong>{b.time} · {b.clientName}</strong><br />{b.serviceName}</p>
          <div className="flex flex-wrap items-center gap-2"><WhatsApp label="Enviar recordatorio" template="reminder" settings={settings} booking={b} onClick={() => void action.run(async () => {
            await api.markReminded(b.id); toast.ok('Recordatorio marcado.'); load.reload()
          })} />{b.remindedAt && <span className="rounded-full bg-gris-50 px-3 py-1 text-xs text-ink">Recordado</span>}</div>
        </div>)}
      </section>
      <section className={panel}><h2 className={heading}>Señas para revisar</h2>
        {!review.length && <p className="mt-3 text-choco">No quedan señas por revisar.</p>}
        {review.map(b => <div key={b.id} className="mt-3 space-y-3 border-t border-gris pt-3">
          <p><strong>{b.clientName} · {money(b.deposit)}</strong><br />{dateLabel(b.date)} · {b.time} · {b.serviceName}</p>
          {b.depositProofUrl ? <Photo src={b.depositProofUrl} label="comprobante de seña" /> : <p className="text-sm text-choco">Sin comprobante adjunto.</p>}
          <fieldset disabled={action.busy} className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void action.run(async () => {
              await api.recordPayment(b.id, b.deposit, b.depositMethod ?? 'transfer', 'deposit')
              toast.ok('Seña registrada.'); load.reload()
            })}>Seña recibida</Button>
            <WhatsApp template="payment" booking={b} settings={settings} />
            <Button size="sm" variant="outline" onClick={() => update(b, 'rejected')}>Rechazar</Button>
          </fieldset>
        </div>)}
      </section>
    </div>
    {paying && <PaymentDialog booking={paying} balanceOnly onClose={() => setPaying(undefined)} onPaid={() => { setPaying(undefined); load.reload() }} />}
    {selected && <BookingSheet booking={selected} onClose={() => setSelected(undefined)} onChange={() => { setSelected(undefined); load.reload() }} />}
  </div>
}
