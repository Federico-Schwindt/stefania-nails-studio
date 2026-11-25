import { ArrowRight, Check } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColorChoice, Finish, NailShape } from '../../lib/types'

export const COLORS = [
  { name: 'Bordó Stefania', hex: '#570314' },
  { name: 'Rojo cereza', hex: '#9b0f1f' },
  { name: 'Chocolate', hex: '#492d23' },
  { name: 'Negro', hex: '#171516' },
  { name: 'Latte', hex: '#c9a68c' },
  { name: 'Nude rosado', hex: '#e3b1a4' },
  { name: 'Leche', hex: '#f4ece4' },
  { name: 'Rosa chicle', hex: '#e98fa5' },
  { name: 'Lila', hex: '#b9a3d6' },
  { name: 'Celeste', hex: '#9cc3e6' },
  { name: 'Azul noche', hex: '#1d2a4a' },
  { name: 'Oliva', hex: '#5f6136' },
]

export const FINISHES: { id: Finish; label: string; hint: string }[] = [
  { id: 'gloss', label: 'Brillo', hint: 'Clásico espejado' },
  { id: 'matte', label: 'Mate', hint: 'Suave, sin brillo' },
  { id: 'chrome', label: 'Espejo', hint: 'Efecto metalizado' },
  { id: 'cat-eye', label: 'Ojo de gato', hint: 'Brillo magnético' },
]

export const SHAPES: { id: NailShape; label: string }[] = [
  { id: 'almond', label: 'Almendra' },
  { id: 'oval', label: 'Ovalada' },
  { id: 'squoval', label: 'Squoval' },
  { id: 'square', label: 'Cuadrada' },
  { id: 'coffin', label: 'Coffin' },
  { id: 'stiletto', label: 'Stiletto' },
]

/** Silueta de cada forma de uña (sólo CSS). */
const SHAPE_STYLE: Record<NailShape, React.CSSProperties> = {
  almond: { borderRadius: '50% 50% 42% 42% / 72% 72% 28% 28%' },
  oval: { borderRadius: '50% 50% 44% 44% / 52% 52% 30% 30%' },
  squoval: { borderRadius: '30% 30% 40% 40% / 22% 22% 26% 26%' },
  square: { borderRadius: '8% 8% 36% 36% / 6% 6% 22% 22%' },
  coffin: { borderRadius: '18% 18% 40% 40% / 10% 10% 26% 26%', clipPath: 'polygon(22% 0, 78% 0, 100% 100%, 0 100%)' },
  stiletto: { clipPath: 'polygon(50% 0, 88% 60%, 100% 100%, 0 100%, 12% 60%)', borderRadius: '0 0 40% 40% / 0 0 26% 26%' },
}

/** Relleno de la uña según color y terminación. */
export function polishBackground(hex: string, finish: Finish) {
  switch (finish) {
    case 'matte':
      return hex
    case 'chrome':
      return `linear-gradient(115deg, ${hex} 0%, #ffffff 28%, ${hex} 46%, #f2f2f2 62%, ${hex} 82%)`
    case 'cat-eye':
      return `linear-gradient(160deg, ${hex} 25%, rgb(255 236 200 / 0.95) 50%, ${hex} 75%)`
    default:
      return `radial-gradient(70% 45% at 32% 22%, rgb(255 255 255 / 0.65), transparent 55%), linear-gradient(180deg, ${hex}, ${hex})`
  }
}

export function NailSwatch({ hex, finish, shape, className = '' }: { hex: string; finish: Finish; shape: NailShape; className?: string }) {
  return (
    <span
      aria-hidden
      className={`block shadow-[inset_-6px_-8px_14px_rgb(0_0_0/0.18)] ${className}`}
      style={{ background: polishBackground(hex, finish), ...SHAPE_STYLE[shape] }}
    />
  )
}

/** Selector de color liso con tarjetas cuadradas (color, terminación y forma). */
export function ColorPicker({ value, onChange, compact }: { value: ColorChoice; onChange: (v: ColorChoice) => void; compact?: boolean }) {
  return (
    <div className={compact ? '' : 'grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]'}>
      {!compact && (
        <div className="flex aspect-square items-center justify-center rounded-[32px] bg-[radial-gradient(80%_70%_at_50%_35%,#ffffff,#f1ecea)] ring-1 ring-gris-100">
          <div className="flex items-end gap-3">
            {[0.78, 0.92, 1, 0.9, 0.7].map((h, i) => (
              <motion.span
                key={`${value.hex}-${value.finish}-${value.shape}-${i}`}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className="block"
                style={{ width: `clamp(${30 * h}px, ${5.2 * h}vw, ${60 * h}px)`, height: `clamp(${52 * h}px, ${9 * h}vw, ${104 * h}px)` }}
              >
                <NailSwatch hex={value.hex} finish={value.finish} shape={value.shape} className="h-full w-full" />
              </motion.span>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-6">
        <fieldset>
          <legend className="mb-3 text-[14px] font-semibold text-ink">
            Color <span className="font-normal text-choco">· {value.name}</span>
          </legend>
          <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6">
            {COLORS.map((c) => {
              const on = c.hex === value.hex
              return (
                <button
                  key={c.hex}
                  type="button"
                  aria-pressed={on}
                  aria-label={c.name}
                  title={c.name}
                  onClick={() => onChange({ ...value, hex: c.hex, name: c.name })}
                  className={`group relative aspect-square overflow-hidden rounded-2xl transition active:scale-95 ${on ? 'ring-2 ring-ink ring-offset-2' : 'ring-1 ring-black/10 hover:-translate-y-0.5'}`}
                  style={{ background: polishBackground(c.hex, value.finish === 'matte' ? 'matte' : 'gloss') }}
                >
                  {on && (
                    <span className="absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-ink shadow">
                      <Check size={12} weight="bold" />
                    </span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-black/35 px-1 py-1 text-center text-[10px] font-semibold leading-tight text-white opacity-0 transition group-hover:opacity-100 sm:text-[11px]">
                    {c.name}
                  </span>
                </button>
              )
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-[14px] font-semibold text-ink">Terminación</legend>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {FINISHES.map((f) => {
              const on = f.id === value.finish
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onChange({ ...value, finish: f.id })}
                  className={`flex flex-col items-start gap-2 rounded-2xl p-3 text-left transition ${on ? 'bg-gris-50 ring-2 ring-ink' : 'bg-white ring-1 ring-gris hover:ring-ink/40'}`}
                >
                  <span className="block aspect-square w-9 rounded-xl ring-1 ring-black/10" style={{ background: polishBackground(value.hex, f.id) }} />
                  <span>
                    <span className="block text-[14px] font-semibold text-ink">{f.label}</span>
                    <span className="block text-[12px] text-choco">{f.hint}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-[14px] font-semibold text-ink">Forma</legend>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
            {SHAPES.map((s) => {
              const on = s.id === value.shape
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onChange({ ...value, shape: s.id })}
                  className={`flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl transition ${on ? 'bg-gris-50 ring-2 ring-ink' : 'bg-white ring-1 ring-gris hover:ring-ink/40'}`}
                >
                  <NailSwatch hex={value.hex} finish="gloss" shape={s.id} className="h-9 w-6" />
                  <span className="text-[12px] font-semibold text-ink">{s.label}</span>
                </button>
              )
            })}
          </div>
        </fieldset>
      </div>
    </div>
  )
}

export const DEFAULT_COLOR: ColorChoice = { hex: '#570314', name: 'Bordó Stefania', finish: 'gloss', shape: 'almond' }

export function ColorLab() {
  const navigate = useNavigate()
  const [v, setV] = useState<ColorChoice>(DEFAULT_COLOR)
  return (
    <section id="color" className="mx-auto max-w-[1400px] scroll-mt-24 px-4 py-20 sm:px-8 md:py-28">
      <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h2 className="text-[clamp(44px,6vw,80px)] leading-[0.95] text-ink">¿Un color liso?</h2>
          <p className="mt-4 max-w-[46ch] text-choco">Elegí color, terminación y forma. Te lo guardamos en la reserva para que Stefania lo tenga listo.</p>
        </div>
        <button
          onClick={() => navigate(`/reservar?color=${encodeURIComponent(v.hex)}&acabado=${v.finish}&forma=${v.shape}`)}
          className="group inline-flex h-14 shrink-0 items-center gap-6 rounded-full bg-ink pl-7 pr-2 text-[16px] font-semibold text-white transition hover:bg-black/85 active:scale-[0.99]"
        >
          Reservar con {v.name}
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink transition group-hover:translate-x-0.5">
            <ArrowRight size={18} weight="bold" />
          </span>
        </button>
      </div>
      <ColorPicker value={v} onChange={setV} />
    </section>
  )
}
