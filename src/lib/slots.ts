import type { BlockedSlot, BusySlot, Settings, WorkingHours } from './types'

export const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}
export const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const parseIso = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const addDays = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

const overlaps = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1

/** Horarios disponibles de un día para un servicio de `duration` minutos. */
export function availableTimes(opts: {
  date: string
  duration: number
  hours: WorkingHours[]
  blocked: BlockedSlot[]
  busy: BusySlot[]
  settings: Settings
  now?: Date
}): string[] {
  const { date, duration, hours, blocked, busy, settings } = opts
  const now = opts.now ?? new Date()
  const day = parseIso(date)
  const wh = hours.find((h) => h.weekday === day.getDay())
  if (!wh || !wh.enabled) return []
  const dayBlocks = blocked.filter((b) => b.date === date)
  if (dayBlocks.some((b) => !b.start || !b.end)) return []

  const start = toMin(wh.start)
  const end = toMin(wh.end)
  const step = Math.max(10, settings.slotStepMin || 30)
  const minStart = now.getTime() + settings.minNoticeHours * 3600_000
  const dayBusy = busy.filter((b) => b.date === date)

  const out: string[] = []
  for (let t = start; t + duration <= end; t += step) {
    const slotDate = new Date(day)
    slotDate.setHours(Math.floor(t / 60), t % 60, 0, 0)
    if (slotDate.getTime() < minStart) continue
    if (dayBlocks.some((b) => overlaps(t, t + duration, toMin(b.start!), toMin(b.end!)))) continue
    if (dayBusy.some((b) => overlaps(t, t + duration, toMin(b.time), toMin(b.time) + b.durationMin))) continue
    out.push(toTime(t))
  }
  return out
}

export function dayIsBookable(date: string, hours: WorkingHours[], blocked: BlockedSlot[], settings: Settings, now = new Date()) {
  const d = parseIso(date)
  const today = parseIso(isoDate(now))
  const diff = Math.round((d.getTime() - today.getTime()) / 86400_000)
  if (diff < 0 || diff > settings.maxDaysAhead) return false
  const wh = hours.find((h) => h.weekday === d.getDay())
  if (!wh?.enabled) return false
  if (blocked.some((b) => b.date === date && (!b.start || !b.end))) return false
  return true
}
