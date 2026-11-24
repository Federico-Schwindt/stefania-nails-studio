import { useCallback, useState } from 'react'
import { DownloadSimple } from '@phosphor-icons/react'
import { Button, Chip, Field, toast } from '../../components/ui'
import { api } from '../../lib/api'
import { money } from '../../lib/pricing'
import { addDays, isoDate, parseIso } from '../../lib/slots'
import type { Booking, Stats } from '../../lib/types'
import { methodNames, statusNames } from './labels'
import { dateLabel, ErrorText, heading, LoadState, Metrics, panel, studioDate, useAction, useLoad } from './shared'

const periods = ['Hoy', 'Semana', 'Mes', 'Mes anterior', 'Personalizado'] as const
type Period = typeof periods[number]
function range(period: Period, today: string) {
  const date = parseIso(today), y = date.getFullYear(), m = date.getMonth()
  if (period === 'Semana') {
    const monday = addDays(date, -((date.getDay() + 6) % 7))
    return { from: isoDate(monday), to: isoDate(addDays(monday, 6)) }
  }
  if (period === 'Mes' || period === 'Mes anterior') {
    const month = m - Number(period === 'Mes anterior')
    return { from: isoDate(new Date(y, month, 1)), to: isoDate(new Date(y, month + 1, 0)) }
  }
  return { from: today, to: today }
}

function csv(bookings: Booking[]) {
  function cell(value: string | number) {
    const raw = String(value)
    const safe = typeof value === 'string' && /^\s*[=+@-]/.test(raw) ? "'" + raw : raw
    return '"' + safe.replaceAll('"', '""') + '"'
  }
  const rows: (string | number)[][] = [['fecha', 'hora', 'código', 'clienta', 'teléfono', 'servicio', 'diseño', 'total', 'seña', 'cobrado', 'estado', 'medio de pago']]
  for (const b of bookings) {
    const methods = [...new Set([b.depositMethod, b.balanceMethod])].flatMap(m => m ? [methodNames[m]] : [])
    rows.push([b.date, b.time, b.code, b.clientName, b.phone, b.serviceName, b.designName ?? '', b.total, b.deposit, b.paidAmount, statusNames[b.status], methods.join(' / ')])
  }
  return '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n')
}

function Breakdown({ title, headers, rows }: { title: string; headers: string[]; rows: (string | number)[][] }) {
  return <section className={panel}><h2 className={heading}>{title}</h2>
    {rows.length ? <table className="mt-3 w-full text-left text-sm"><thead><tr>{headers.map(h => <th key={h} scope="col" className="py-2 pr-2 text-choco last:text-right">{h}</th>)}</tr></thead>
      <tbody>{rows.map((row, i) => <tr key={i} className="border-t border-gris">{row.map((cell, j) => <td key={j} className="py-2 pr-2 last:pr-0 last:text-right">{cell}</td>)}</tr>)}</tbody></table>
      : <p className="mt-3 text-sm text-choco">Sin datos en este período.</p>}
  </section>
}
function DailyChart({ days }: { days: Stats['byDay'] }) {
  const max = Math.max(1, ...days.map(d => d.revenue))
  return <section className={panel}><h2 className={heading}>Cobrado por día</h2>
    {days.length ? <ul className="mt-4 max-h-96 space-y-3 overflow-y-auto">{days.map(d => <li key={d.date} className="grid grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-3 text-sm">
      <time dateTime={d.date}>{dateLabel(d.date, { day: 'numeric', month: 'short' })}</time>
      <div aria-hidden="true"><div className="h-3 rounded-full bg-bordo" style={{ width: (d.revenue / max * 100) + '%' }} /></div>
      <span className="tabular-nums">{money(d.revenue)}</span>
    </li>)}</ul> : <p className="mt-3 text-sm text-choco">No hay turnos en este período.</p>}
  </section>
}

function PeriodStats({ from, to }: { from: string; to: string }) {
  const load = useLoad(useCallback(() => api.getStats(from, to), [from, to]))
  const action = useAction()
  const s = load.data
  if (!s) return <LoadState {...load} />
  return <>
    <Metrics items={[
      ['Cobrado', money(s.revenue)], ['Señas', money(s.depositsCollected)], ['Turnos', s.bookings], ['Atendidos', s.completed],
      ['No vinieron', s.noShows], ['Cancelados', s.cancelled], ['Clientas nuevas', s.newClients], ['A cobrar', money(s.expected)],
    ]} />
    <p className="text-sm text-choco">Cobrado suma los pagos de los turnos atendidos en el período. Las señas y los medios de pago se agrupan por fecha de cobro.</p>
    <DailyChart days={s.byDay} />
    <div className="grid items-start gap-4 xl:grid-cols-3">
      <Breakdown title="Por servicio" headers={['Servicio', 'Turnos', 'Cobrado']} rows={s.byService.map(x => [x.name, x.count, money(x.revenue)])} />
      <Breakdown title="Por medio de pago" headers={['Medio', 'Cobrado']} rows={s.byMethod.map(x => [methodNames[x.method], money(x.amount)])} />
      <Breakdown title="Diseños más pedidos" headers={['Diseño', 'Turnos']} rows={s.topDesigns.map(x => [x.name, x.count])} />
    </div>
    <ErrorText message={action.error} />
    <Button icon={<DownloadSimple />} variant="outline" loading={action.busy} onClick={() => void action.run(async () => {
      const bookings = await api.listBookings(from, to)
      const url = URL.createObjectURL(new Blob([csv(bookings)], { type: 'text/csv;charset=utf-8' }))
      const a = document.createElement('a')
      a.href = url; a.download = 'turnos-' + from + '-al-' + to + '.csv'
      document.body.append(a); a.click(); a.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.ok('CSV exportado.')
    })}>Exportar CSV</Button>
  </>
}
export default function Reports() {
  const today = studioDate()
  const [period, setPeriod] = useState<Period>('Mes')
  const [custom, setCustom] = useState(() => range('Mes', today))
  const { from, to } = period === 'Personalizado' ? custom : range(period, today)
  return <div className="space-y-5">
    <section className={panel}><h2 className={heading}>Período</h2>
      <div className="my-3 flex flex-wrap gap-2">{periods.map(p => <Chip key={p} active={p === period} onClick={() => setPeriod(p)}>{p}</Chip>)}</div>
      {period === 'Personalizado' ? <div className="grid max-w-lg gap-3 sm:grid-cols-2">
        <Field label="Desde" type="date" value={from} onChange={e => setCustom({ from: e.target.value, to })} />
        <Field label="Hasta" type="date" value={to} onChange={e => setCustom({ from, to: e.target.value })} />
      </div> : <p className="text-sm text-choco">{dateLabel(from)}{to !== from && ' al ' + dateLabel(to)}</p>}
    </section>
    {from && to && from <= to ? <PeriodStats from={from} to={to} /> : <ErrorText message="Elegí una fecha inicial y una final igual o posterior." />}
  </div>
}
