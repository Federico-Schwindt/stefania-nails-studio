import { useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { addDays, availableTimes, dayIsBookable, isoDate, parseIso, toMin } from './slots'
import type { BlockedSlot, BusySlot, Service, Settings, WorkingHours } from './types'

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function dayLabel(iso: string, now = new Date()) {
  const today = isoDate(now)
  const tomorrow = isoDate(addDays(now, 1))
  if (iso === today) return 'Hoy'
  if (iso === tomorrow) return 'Mañana'
  const d = parseIso(iso)
  return `${DAYS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** Ocupación (turnos y bloqueos) de los próximos `days` días, cargada una vez. */
export function useSchedule(days = 21) {
  const [busy, setBusy] = useState<BusySlot[]>([])
  const [blocked, setBlocked] = useState<BlockedSlot[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    const from = isoDate(new Date())
    const to = isoDate(addDays(new Date(), days))
    Promise.all([api.getBusy(from, to), api.getBlocked(from, to)])
      .then(([b, bl]) => {
        if (!alive) return
        setBusy(b)
        setBlocked(bl)
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [days])
  return { busy, blocked, loading }
}

/** Próximos horarios libres para un servicio, ordenados. */
export function useNextSlots(opts: {
  service?: Service
  settings: Settings | null
  hours: WorkingHours[]
  busy: BusySlot[]
  blocked: BlockedSlot[]
  limit?: number
}) {
  const { service, settings, hours, busy, blocked, limit = 8 } = opts
  return useMemo(() => {
    if (!service || !settings) return []
    const out: { date: string; time: string }[] = []
    const max = Math.min(settings.maxDaysAhead, 30)
    for (let i = 0; i <= max && out.length < limit; i++) {
      const date = isoDate(addDays(new Date(), i))
      if (!dayIsBookable(date, hours, blocked, settings)) continue
      const times = availableTimes({ date, duration: service.durationMin, hours, blocked, busy, settings })
      // repartimos: hasta 3 horarios por día para mostrar variedad
      for (const time of times.slice(0, 3)) {
        if (out.length >= limit) break
        out.push({ date, time })
      }
    }
    return out
  }, [service, settings, hours, busy, blocked, limit])
}

/** Estado de atención: abierto ahora o próxima apertura. */
export function openStatus(hours: WorkingHours[], now = new Date()) {
  const wh = hours.find((h) => h.weekday === now.getDay())
  const mins = now.getHours() * 60 + now.getMinutes()
  if (wh?.enabled && mins >= toMin(wh.start) && mins < toMin(wh.end)) return { open: true, text: `Abierto ahora · hasta las ${wh.end}` }
  for (let i = 0; i < 8; i++) {
    const d = addDays(now, i)
    const h = hours.find((x) => x.weekday === d.getDay())
    if (!h?.enabled) continue
    if (i === 0 && mins >= toMin(h.start)) continue
    return { open: false, text: `Cerrado · abre ${i === 0 ? 'hoy' : i === 1 ? 'mañana' : `el ${DAYS[d.getDay()]}`} a las ${h.start}` }
  }
  return { open: false, text: 'Cerrado por ahora' }
}
