import { useCallback, useState } from 'react'
import { CalendarBlank, CaretLeft, CaretRight, Clock, Coins, Plus, Receipt } from '@phosphor-icons/react'
import { Button, Chip, IconButton } from '../../components/ui'
import { api } from '../../lib/api'
import { money } from '../../lib/pricing'
import { addDays, isoDate, parseIso } from '../../lib/slots'
import type { Booking, BookingStatus } from '../../lib/types'
import BookingSheet, { ManualBooking } from './BookingSheet'
import Calendar from './Calendar'
import { dateLabel, LoadState, studioDate, useLoad } from './shared'

function monday(date: Date) { return isoDate(addDays(date, -(date.getDay() + 6) % 7)) }
const filters: { label: string; statuses?: BookingStatus[] }[] = [
  { label: 'Todas' }, { label: 'Por confirmar', statuses: ['paid', 'payment_review'] }, { label: 'Señas en revisión', statuses: ['payment_review'] }, { label: 'No vinieron', statuses: ['no_show'] },
  { label: 'Pendientes de pago', statuses: ['pending_payment'] },
  { label: 'Confirmadas', statuses: ['confirmed'] }, { label: 'Completadas', statuses: ['completed'] }, { label: 'Canceladas', statuses: ['cancelled', 'rejected'] },
]

export default function Agenda() {
  const today = studioDate()
  const [list, setList] = useState(false)
  const [from, setFrom] = useState(() => monday(parseIso(today)))
  const [filter, setFilter] = useState(filters[0])
  const [selected, setSelected] = useState<Booking>()
  const [creating, setCreating] = useState(false)
  const days = Array.from({ length: 7 }, (_, i) => isoDate(addDays(parseIso(from), i)))
  const to = days[6]
  const load = useLoad(useCallback(() => Promise.all([api.listBookings(from, to), api.getStats(from, to)]), [from, to]))
  const bookings = load.data?.[0]
  const stats = bookings && [
    { label: 'Turnos de la semana', value: bookings.length, icon: CalendarBlank },
    { label: 'Por confirmar', value: bookings.filter(b => ['paid', 'payment_review'].includes(b.status)).length, icon: Clock },
    { label: 'Señas cobradas', value: money(load.data![1].depositsCollected), icon: Coins },
    { label: 'Facturación estimada', value: money(bookings.reduce((sum, b) => sum + (['confirmed', 'completed'].includes(b.status) ? b.total : 0), 0)), icon: Receipt },
  ]
  function shift(days: number) { setFrom(date => isoDate(addDays(parseIso(date), days))) }
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-3xl text-bordo">Resumen semanal</h2>
      <Button icon={<Plus size={18} />} onClick={() => setCreating(true)}>Nuevo turno</Button>
    </div>
    {stats && <dl className="grid grid-cols-2 gap-3 xl:grid-cols-4">{stats.map(({ label, value, icon: Icon }) =>
      <div key={label} className="min-w-0 rounded-[28px] p-4 ring-1 ring-inset ring-gris sm:p-5">
        <dt className="flex flex-wrap items-center gap-2 text-sm text-choco"><Icon size={18} className="text-bordo" />{label}</dt>
        <dd className="mt-2 break-words font-serif text-3xl leading-tight text-bordo sm:text-4xl">{value}</dd>
      </div>)}</dl>}
    <section aria-label="Calendario semanal" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl text-bordo sm:text-3xl">{dateLabel(from, { day: 'numeric', month: 'short', ...(from.slice(0,4) !== to.slice(0,4) ? { year: 'numeric' } : {}) })} al {dateLabel(to, { day: 'numeric', month: 'short', year: 'numeric' })}</h2>
        <div className="flex items-center gap-1"><IconButton label="Semana anterior" onClick={() => shift(-7)}><CaretLeft /></IconButton>
          <Button size="sm" variant="outline" onClick={() => setFrom(monday(parseIso(today)))}>Hoy</Button>
          <IconButton label="Semana siguiente" onClick={() => shift(7)}><CaretRight /></IconButton></div>
      </div>
      <div role="group" aria-label="Vista de la agenda" className="hidden gap-2 lg:flex">
        <Chip active={!list} onClick={() => setList(false)}>Calendario</Chip><Chip active={list} onClick={() => setList(true)}>Lista</Chip>
      </div>
      <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-2">{filters.map(item =>
        <Chip key={item.label} active={filter === item} onClick={() => setFilter(item)}>{item.label}</Chip>)}</div>
      {bookings ? <Calendar list={list} days={days} bookings={bookings.filter(b => !filter.statuses || filter.statuses.includes(b.status))} filtered={!!filter.statuses} onOpen={setSelected} /> : <LoadState {...load} />}
    </section>
    {selected && <BookingSheet booking={selected} onClose={() => setSelected(undefined)} onChange={() => { setSelected(undefined); load.reload() }} />}
    {creating && <ManualBooking date={days.includes(today) ? today : from} onClose={() => setCreating(false)} onCreate={b => {
      setCreating(false)
      setFrom(monday(parseIso(b.date)))
      setFilter(filters[0])
      load.reload()
    }} />}
  </div>
}
