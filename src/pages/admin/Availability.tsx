import { useCallback, useState } from 'react'
import { Trash } from '@phosphor-icons/react'
import { Button, Field, IconButton, Toggle, toast } from '../../components/ui'
import { api } from '../../lib/api'
import { addDays, isoDate } from '../../lib/slots'
import type { WorkingHours } from '../../lib/types'
import { dateLabel, ErrorText, heading, LoadState, panel, useAction, useLoad } from './shared'

const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const getHours = () => api.getWorkingHours()

function HoursEditor({ initial }: { initial: WorkingHours[] }) {
  const [hours, setHours] = useState(() => days.map((_, weekday) =>
    initial.find(h => h.weekday === weekday) ?? { weekday, enabled: false, start: '09:00', end: '18:00' }))
  const action = useAction()
  function change(weekday: number, values: Partial<WorkingHours>) {
    setHours(list => list.map(h => h.weekday === weekday ? { ...h, ...values } : h))
  }
  return <form onSubmit={e => {
    e.preventDefault()
    void action.run(async () => {
      const invalid = hours.find(h => h.enabled && h.start >= h.end)
      if (invalid) throw new Error('Revisá el horario de ' + days[invalid.weekday].toLowerCase() + '. El cierre debe ser posterior a la apertura.')
      const normalized = hours.map(h => ({ ...h, start: h.start || '09:00', end: h.end || '18:00' }))
      await api.saveWorkingHours(normalized)
      setHours(normalized)
      toast.ok('Horarios guardados.')
    })
  }}>
    <fieldset disabled={action.busy} className="space-y-4">{hours.map(h => <div key={h.weekday} className="grid items-center gap-3 border-b border-gris/50 pb-4 sm:grid-cols-[1fr_2fr]">
      <div className="flex items-center justify-between gap-3 pr-2"><span>{days[h.weekday]}</span><Toggle label={'Atención el ' + days[h.weekday].toLowerCase()} checked={h.enabled} onChange={enabled => change(h.weekday, { enabled })} /></div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Apertura" aria-label={'Apertura, ' + days[h.weekday]} type="time" value={h.start} disabled={!h.enabled} required={h.enabled} onChange={e => change(h.weekday, { start: e.target.value })} />
        <Field label="Cierre" aria-label={'Cierre, ' + days[h.weekday]} type="time" value={h.end} disabled={!h.enabled} required={h.enabled} onChange={e => change(h.weekday, { end: e.target.value })} />
      </div>
    </div>)}</fieldset>
    <div className="mt-4 space-y-3"><ErrorText message={action.error} /><Button loading={action.busy}>Guardar horarios</Button></div>
  </form>
}

function BlockedDates() {
  const now = new Date()
  const today = isoDate(now)
  const until = isoDate(addDays(now, 180))
  const blocks = useLoad(useCallback(() => api.getBlocked(today, until), [today, until]))
  const action = useAction()
  const sorted = blocks.data && [...blocks.data].sort((a, b) => (a.date + (a.start ?? '')).localeCompare(b.date + (b.start ?? '')))
  return <section className={panel}>
    <h2 className={heading}>Bloqueos</h2>
    <form className="mt-4" onSubmit={e => {
      e.preventDefault()
      const form = e.currentTarget
      const values = new FormData(form)
      const get = (key: string) => String(values.get(key) ?? '').trim()
      void action.run(async () => {
        const start = get('start'), end = get('end')
        if (!!start !== !!end || (start && start >= end)) throw new Error('Elegí un inicio y un fin posterior, o dejá ambos horarios vacíos.')
        await api.addBlocked({ date: get('date'), start: start || undefined, end: end || undefined, reason: get('reason') || undefined })
        form.reset()
        blocks.reload()
        toast.ok('Bloqueo agregado para el ' + dateLabel(get('date')) + '.')
      })
    }}>
      <fieldset disabled={action.busy} className="grid gap-4">
        <Field label="Fecha" name="date" type="date" min={today} required />
        <div className="grid grid-cols-2 gap-2"><Field label="Desde" name="start" type="time" /><Field label="Hasta" name="end" type="time" /></div>
        <p className="text-sm text-choco">Dejá los horarios vacíos para bloquear el día completo.</p>
        <Field label="Motivo (opcional)" name="reason" />
        <Button variant="outline" className="justify-self-start">Agregar bloqueo</Button>
      </fieldset>
    </form>
    <div className="mt-4"><ErrorText message={action.error} /></div>
    <h3 className="mt-6 mb-3 text-2xl text-bordo">Próximos 180 días</h3>
    {!sorted ? <LoadState {...blocks} /> : sorted.length === 0 ? <p className="rounded-2xl bg-gris-50 p-4 text-sm text-choco">No tenés bloqueos programados.</p> :
      <ul className="divide-y divide-gris/50">{sorted.map(b => <li key={b.id} className="flex items-center justify-between gap-2 py-3 text-sm">
        <div className="min-w-0 break-words"><strong>{dateLabel(b.date)}</strong><p>{b.start && b.end ? b.start + ' a ' + b.end : 'Día completo'}</p>{b.reason && <p className="text-choco">{b.reason}</p>}</div>
        <IconButton disabled={action.busy} className="shrink-0 text-bordo" label={'Quitar bloqueo del ' + dateLabel(b.date)} onClick={() => void action.run(async () => {
          await api.removeBlocked(b.id); blocks.reload(); toast.ok('Bloqueo quitado.')
        })}><Trash size={19} /></IconButton>
      </li>)}</ul>}
  </section>
}

export default function Availability() {
  const hours = useLoad(getHours)
  return <div className="grid items-start gap-5 xl:grid-cols-[1.2fr_1fr]">
    <section className={panel}><h2 className={heading + ' mb-5'}>Horarios de atención</h2>
      {hours.data ? <HoursEditor initial={hours.data} /> : <LoadState {...hours} />}
    </section>
    <BlockedDates />
  </div>
}
