import { CalendarBlank } from '@phosphor-icons/react'
import { toMin, toTime } from '../../lib/slots'
import type { Booking, BookingStatus } from '../../lib/types'
import { dateLabel, studioDate } from './shared'

import { statusNames } from './labels'
const muted = 'border border-gris/60 bg-gris-50 text-choco/75'
const styles: Record<BookingStatus, string> = {
  paid: 'bg-bordo text-white', confirmed: 'border border-gris border-l-4 border-l-bordo bg-white text-ink',
  pending_payment: 'border border-dashed border-gris bg-gris-100 text-choco',
  payment_review: 'border border-bordo bg-bordo-50 text-bordo', no_show: 'border border-dashed border-choco bg-gris-50 text-ink',
  completed: muted, rejected: muted + ' line-through', cancelled: muted + ' line-through',
}

// Give overlapping appointments separate columns until the entire group ends.
function positionBookings(bookings: Booking[]) {
  const positions: { booking: Booking; start: number; end: number; lane: number; columns: number }[] = []
  let lanes: number[] = []
  let groupStart = 0
  for (const booking of [...bookings].sort((a, b) => a.time.localeCompare(b.time))) {
    const start = toMin(booking.time)
    const end = start + booking.durationMin
    if (lanes.every(until => until <= start)) {
      groupStart = positions.length
      lanes = []
    }
    const free = lanes.findIndex(until => until <= start)
    const lane = free < 0 ? lanes.length : free
    lanes[lane] = end
    positions.push({ booking, start, end, lane, columns: lanes.length })
    if (free < 0) for (let i = groupStart; i < positions.length; i++) positions[i].columns = lanes.length
  }
  return positions
}

type Props = { days: string[]; bookings: Booking[]; onOpen: (b: Booking) => void; filtered: boolean; list: boolean }
export default function Calendar({ days, bookings, onOpen, filtered, list }: Props) {
  const startHour = Math.floor(Math.min(480, ...bookings.map(b => toMin(b.time))) / 60)
  const endHour = Math.ceil(Math.max(1260, ...bookings.map(b => toMin(b.time) + b.durationMin)) / 60)
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => i + startHour)
  const today = studioDate()
  const daily = days.map(date => ({ date, bookings: bookings.filter(b => b.date === date) }))
  const empty = bookings.length === 0
  return <>
    {empty && <div className="mb-4 flex items-center gap-3 rounded-2xl bg-gris-50 p-4 text-sm text-choco"><CalendarBlank size={23} />
      {filtered ? 'No hay turnos con este estado en la semana.' : 'Tu semana está libre. Podés agregar un turno desde «Nuevo turno».'}</div>}
    {!list && <div className="hidden overflow-hidden rounded-[28px] ring-1 ring-gris lg:block">
      <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] bg-gris-50 text-center">
        <div aria-hidden="true" />
        {days.map(date => <div key={date} className="border-l border-gris/50 py-2">
          <span className="block text-xs font-medium uppercase text-choco">{dateLabel(date, { weekday: 'short' })}</span>
          <span className={'mx-auto grid size-8 place-items-center rounded-full font-serif text-2xl ' + (date === today ? 'bg-bordo text-white' : 'text-bordo')}>{Number(date.slice(-2))}</span>
        </div>)}
      </div>
      <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-t border-gris/70 pb-5">
        <div className="relative text-center text-xs tabular-nums text-choco" style={{ height: (endHour - startHour) * 56 }}>
          {hours.map(hour => <span key={hour} className="absolute inset-x-0" style={{ top: (hour - startHour) * 56 }}>{toTime(hour * 60)}</span>)}
        </div>
        {daily.map(day => <div key={day.date} className="relative border-l border-gris/50" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0 55px, var(--color-gris-100) 55px 56px)' }}>
          {positionBookings(day.bookings).map(({ booking: b, start, end, lane, columns }) => {
            const label = [b.clientName, b.serviceName, dateLabel(b.date), b.time, statusNames[b.status]].join(' · ')
            return <button key={b.id} aria-label={label} title={label} onClick={() => onOpen(b)}
              className={'absolute overflow-hidden rounded-lg px-1.5 text-left text-xs leading-tight focus-visible:z-10 ' + styles[b.status]}
              style={{ top: (start - startHour * 60) * 56 / 60, height: Math.max(1, (end - start) * 56 / 60 - 1), left: 'calc(' + lane * 100 / columns + '% + 1px)', width: 'calc(' + 100 / columns + '% - 2px)' }}>
              <span className="block truncate font-semibold">{b.time} · {b.clientName}</span><span className="block truncate">{b.serviceName}</span><span className="block truncate">{statusNames[b.status]}</span>
            </button>
          })}
        </div>)}
      </div>
    </div>}
    <div className={list ? "space-y-5" : "space-y-5 lg:hidden"}>{daily.filter(d => d.bookings.length > 0).map(day =>
      <section key={day.date}>
        <h3 className="mb-2 text-2xl capitalize text-bordo">{dateLabel(day.date, { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
        <div className="grid gap-2">{day.bookings.map(b => <button key={b.id} onClick={() => onOpen(b)} className={'grid grid-cols-[auto_1fr] items-start gap-3 rounded-2xl p-3 text-left text-sm ' + styles[b.status]}>
          <strong className="tabular-nums">{b.time}</strong><span className="min-w-0 break-words"><strong>{b.clientName}</strong><br />{b.serviceName}<br /><span className="text-xs">{statusNames[b.status]}</span></span>
        </button>)}</div>
      </section>)}</div>
  </>
}
