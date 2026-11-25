import type { ReactNode } from 'react'
import type { WorkingHours } from '../../lib/types'

/* Piezas compartidas de la portada: contenedor, encabezados de sección, botones y formatos. */

export const ease = [0.16, 1, 0.3, 1] as const

export const reveal = (i = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.6, delay: Math.min(i, 6) * 0.05, ease },
})

/** Ancho de página: 1440 px en escritorio, márgenes que crecen con la pantalla. */
export const WRAP = 'mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12'

export const BTN_PRIMARY =
  'inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-bone px-6 text-[15px] font-semibold text-coal transition hover:bg-[#fff] active:scale-[0.98]'
export const BTN_GHOST =
  'inline-flex h-12 items-center justify-center gap-2 rounded-[8px] px-6 text-[15px] font-semibold text-bone ring-1 ring-inset ring-bone/20 transition hover:ring-bone/60 active:scale-[0.98]'

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-[12px] font-semibold uppercase tracking-[0.2em] text-bone/55 ${className}`}>{children}</p>
}

/** Encabezado de sección al estilo de la guía de marca: línea fina, etiqueta y titular. */
export function SectionHead({ label, title, text, id }: { label: string; title: ReactNode; text?: ReactNode; id?: string }) {
  return (
    <div className="border-t border-bone/10 pt-5">
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-8 grid gap-5 lg:mt-10 lg:grid-cols-12 lg:items-end">
        <h2 id={id} className="text-[clamp(38px,4.6vw,66px)] leading-[1.02] tracking-[-0.02em] text-bone lg:col-span-7">
          {title}
        </h2>
        {text && <p className="max-w-[46ch] text-[16px] leading-relaxed text-bone/60 lg:col-span-4 lg:col-start-9">{text}</p>}
      </div>
    </div>
  )
}

export function scrollToId(e: React.MouseEvent, href: string) {
  e.preventDefault()
  document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
