import { ArrowUpRight } from '@phosphor-icons/react'
import { useEffect, useState, type ReactNode } from 'react'
import type { WorkingHours } from '../../lib/types'

/* Piezas compartidas de la portada: contenedor, etiquetas, botones, animaciones y formatos. */

export const ease = [0.32, 0.72, 0, 1] as const

/** Entrada al aparecer en pantalla: sube, se enfoca y aparece. */
export const reveal = (i = 0) => ({
  initial: { opacity: 0, y: 36, filter: 'blur(8px)' },
  whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.9, delay: Math.min(i, 6) * 0.07, ease },
})

/** Ancho de página: 1440 px en escritorio, márgenes que crecen con la pantalla. */
export const WRAP = 'mx-auto w-full max-w-[1440px] px-4 sm:px-8 lg:px-12'

const SPRING = 'transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]'

export const BTN_BONE = `group inline-flex h-14 items-center gap-4 rounded-full bg-bone pl-7 pr-2 text-[15px] font-semibold text-coal ${SPRING} hover:bg-[#fff] active:scale-[0.98]`
export const BTN_GLASS = `group inline-flex h-14 items-center gap-3 rounded-full border border-bone/15 bg-bone/[0.05] px-7 text-[15px] font-semibold text-bone ${SPRING} hover:border-bone/30 hover:bg-bone/10 active:scale-[0.98]`

/** Flecha dentro de su propio círculo, pegada al borde derecho del botón. */
export function Bubble({ dark = true }: { dark?: boolean }) {
  return (
    <span
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${SPRING} group-hover:-translate-y-px group-hover:translate-x-0.5 group-hover:scale-105 ${
        dark ? 'bg-coal text-bone' : 'bg-bone/10 text-bone'
      }`}
    >
      <ArrowUpRight size={16} weight="bold" />
    </span>
  )
}

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex w-fit items-center gap-2 rounded-full border border-bone/15 bg-bone/[0.04] px-3 py-1 text-[10.5px] font-medium uppercase tracking-[0.22em] text-bone/70 ${className}`}>
      {children}
    </span>
  )
}

export function scrollToId(e: React.MouseEvent, href: string) {
  e.preventDefault()
  document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function useMedia(query: string) {
  const [on, setOn] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const f = () => setOn(m.matches)
    f()
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [query])
  return on
}

export function formatDuration(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return [h ? `${h} h` : '', m ? `${m} min` : ''].filter(Boolean).join(' ')
}

const SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const hhmm = (t: string) => (t.endsWith(':00') ? String(Number(t.slice(0, 2))) : `${Number(t.slice(0, 2))}:${t.slice(3, 5)}`)

/** "Lun a Vie 9 a 19 · Sáb 9 a 14": agrupa días seguidos con el mismo horario. */
export function summarizeHours(hours: WorkingHours[]) {
  const order = [1, 2, 3, 4, 5, 6, 0]
  const days = order.map((d) => hours.find((h) => h.weekday === d)).filter((h): h is WorkingHours => !!h && h.enabled)
  const groups: { from: number; to: number; start: string; end: string }[] = []
  for (const h of days) {
    const g = groups[groups.length - 1]
    const prevIdx = g ? order.indexOf(g.to) : -2
    if (g && g.start === h.start && g.end === h.end && order.indexOf(h.weekday) === prevIdx + 1) g.to = h.weekday
    else groups.push({ from: h.weekday, to: h.weekday, start: h.start, end: h.end })
  }
  return groups
    .map((g) => `${SHORT[g.from]}${g.to !== g.from ? ` a ${SHORT[g.to]}` : ''} ${hhmm(g.start)} a ${hhmm(g.end)}`)
    .join(' · ')
}
