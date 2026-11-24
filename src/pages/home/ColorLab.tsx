import { ArrowRight, HandPointing } from '@phosphor-icons/react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Chip, Skeleton } from '../../components/ui'
import { layer } from '../../data/seed'
import type { Finish, NailDesignParams, NailShape } from '../../lib/types'

const HandViewer = lazy(() => import('../../three/HandViewer'))

export const COLORS = [
  { name: 'Bordó Stefania', hex: '#570314' },
  { name: 'Rojo cereza', hex: '#9b0f1f' },
  { name: 'Chocolate', hex: '#492d23' },
  { name: 'Negro', hex: '#171516' },
  { name: 'Nude rosado', hex: '#e3b1a4' },
  { name: 'Leche', hex: '#f4ece4' },
  { name: 'Rosa chicle', hex: '#e98fa5' },
  { name: 'Lila', hex: '#b9a3d6' },
  { name: 'Azul noche', hex: '#1d2a4a' },
  { name: 'Oliva', hex: '#5f6136' },
]

export const FINISHES: { id: Finish; label: string }[] = [
  { id: 'gloss', label: 'Brillo' },
  { id: 'matte', label: 'Mate' },
  { id: 'chrome', label: 'Espejo' },
  { id: 'cat-eye', label: 'Ojo de gato' },
]

export const SHAPES: { id: NailShape; label: string }[] = [
  { id: 'almond', label: 'Almendra' },
  { id: 'oval', label: 'Ovalada' },
  { id: 'squoval', label: 'Squoval' },
  { id: 'square', label: 'Cuadrada' },
  { id: 'coffin', label: 'Coffin' },
  { id: 'stiletto', label: 'Stiletto' },
]

export function colorParams(hex: string, finish: Finish, shape: NailShape, length = 0.7): NailDesignParams {
  return {
    shape,
    length,
    all: layer({
      base: hex,
      baseOpacity: 1,
      finish,
      finishColor: finish === 'chrome' ? hex : finish === 'cat-eye' ? '#e9c27a' : undefined,
    }),
  }
}

/** Selector de color liso: render 3D en tiempo real de tips de soft gel. */
export function ColorPicker({
  value,
  onChange,
  viewerClass = 'h-[360px] sm:h-[420px]',
}: {
  value: { hex: string; finish: Finish; shape: NailShape }
  onChange: (v: { hex: string; finish: Finish; shape: NailShape; name: string }) => void
  viewerClass?: string
}) {
  const params = useMemo(() => colorParams(value.hex, value.finish, value.shape), [value])
  const nameOf = (hex: string) => COLORS.find((c) => c.hex === hex)?.name ?? hex
  return (
    <div>
      <div className="relative overflow-hidden rounded-[32px] bg-[radial-gradient(80%_70%_at_50%_40%,#ffffff,#f3efee)] ring-1 ring-gris-100">
        <Suspense fallback={<Skeleton className={`${viewerClass} w-full rounded-none`} />}>
          <HandViewer params={params} className={viewerClass} />
        </Suspense>
        <p className="pointer-events-none absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-[12px] text-ink/60 backdrop-blur">
          <HandPointing size={14} /> Arrastrá para girar
        </p>
      </div>
      <fieldset className="mt-5">
        <legend className="mb-3 text-[14px] font-semibold">
          Color <span className="font-normal text-choco">· {nameOf(value.hex)}</span>
        </legend>
        <div className="flex flex-wrap gap-2.5">
          {COLORS.map((c) => (
            <button
              key={c.hex}
              type="button"
              aria-label={c.name}
              aria-pressed={value.hex === c.hex}
              onClick={() => onChange({ ...value, hex: c.hex, name: c.name })}
              className={`h-10 w-10 rounded-full ring-offset-2 transition hover:scale-110 ${value.hex === c.hex ? 'ring-2 ring-bordo' : 'ring-1 ring-black/10'}`}
              style={{ background: `radial-gradient(circle at 32% 28%, rgb(255 255 255 / 0.55), transparent 38%), ${c.hex}` }}
            />
          ))}
        </div>
      </fieldset>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <fieldset>
          <legend className="mb-2 text-[14px] font-semibold">Terminación</legend>
          <div className="flex flex-wrap gap-2">
            {FINISHES.map((f) => (
              <Chip key={f.id} type="button" active={value.finish === f.id} onClick={() => onChange({ ...value, finish: f.id, name: nameOf(value.hex) })}>
                {f.label}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-[14px] font-semibold">Forma</legend>
          <div className="flex flex-wrap gap-2">
            {SHAPES.map((s) => (
              <Chip key={s.id} type="button" active={value.shape === s.id} onClick={() => onChange({ ...value, shape: s.id, name: nameOf(value.hex) })}>
                {s.label}
              </Chip>
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  )
}

export function ColorLab() {
  const navigate = useNavigate()
  const [v, setV] = useState<{ hex: string; finish: Finish; shape: NailShape; name: string }>({ hex: '#570314', finish: 'gloss', shape: 'almond', name: 'Bordó Stefania' })
  return (
    <section id="color" className="mx-auto max-w-[1400px] scroll-mt-6 px-4 py-20 sm:px-8 md:py-28">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-16">
        <div className="order-2 lg:order-1">
          <ColorPicker value={v} onChange={setV} viewerClass="h-[380px] sm:h-[480px]" />
        </div>
        <div className="order-1 lg:order-2">
          <h2 className="text-[clamp(44px,6vw,80px)] leading-[0.95] text-bordo">¿Un color liso? Probalo en 3D</h2>
          <p className="mt-4 max-w-[44ch] text-choco">Elegí color, terminación y forma. Lo ves en tips de soft gel en tiempo real, con el brillo real del esmalte.</p>
          <button
            onClick={() => navigate(`/reservar?color=${encodeURIComponent(v.hex)}&acabado=${v.finish}&forma=${v.shape}`)}
            className="group mt-8 inline-flex h-14 items-center gap-6 rounded-full bg-ink pl-7 pr-2 text-[16px] font-semibold text-white transition hover:bg-black/85 active:scale-[0.99]"
          >
            Reservar con {v.name}
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink transition group-hover:translate-x-0.5">
              <ArrowRight size={18} weight="bold" />
            </span>
          </button>
        </div>
      </div>
    </section>
  )
}
