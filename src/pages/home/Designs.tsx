import { ArrowRight, Camera } from '@phosphor-icons/react'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Img } from '../../components/Img'
import { Skeleton } from '../../components/ui'
import { assetUrl, thumbUrl } from '../../lib/api'
import { useCatalog } from '../../lib/store'
import type { Design } from '../../lib/types'

const ease = [0.16, 1, 0.3, 1] as const

/** Tarjeta: foto real del trabajo. Al pasar el mouse (o tocar) muestra el diseño en la mano. */
export function DesignCard({
  d,
  active,
  onPreview,
  onSelect,
  compact,
}: {
  d: Design
  active: boolean
  onPreview: (d: Design) => void
  onSelect: (d: Design) => void
  compact?: boolean
}) {
  const img = d.photoUrl ?? d.renderUrl
  return (
    <button
      type="button"
      onMouseEnter={() => onPreview(d)}
      onFocus={() => onPreview(d)}
      onClick={() => onSelect(d)}
      aria-pressed={active}
      aria-label={`${d.name}. ${d.description ?? ''}`}
      className={`group relative block w-full overflow-hidden rounded-[24px] text-left transition duration-500 ${
        active ? 'ring-2 ring-ink ring-offset-2 ring-offset-coal' : 'ring-1 ring-gris-100 hover:-translate-y-1'
      }`}
    >
      <div className={`${compact ? 'aspect-square' : 'aspect-[4/5]'} relative overflow-hidden bg-gris-50`}>
        {img ? (
          <Img src={img.startsWith('img:') ? img : thumbUrl(img)} alt="" className="h-full w-full object-cover transition duration-[1.1s] group-hover:scale-[1.06]" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-ink p-4 text-center">
            <span className="font-serif text-3xl text-bone">{d.name}</span>
          </div>
        )}
        {d.renderUrl && d.photoUrl && (
          <img
            src={thumbUrl(d.renderUrl)}
            alt=""
            className="absolute inset-0 h-full w-full bg-white object-cover opacity-0 transition duration-700 group-hover:opacity-100 lg:hidden"
            loading="lazy"
          />
        )}
      </div>
      <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 rounded-[18px] bg-coal/65 px-3.5 py-2.5 ring-1 ring-bone/10 backdrop-blur-md">
        <span className="truncate font-serif text-[18px] leading-none text-ink sm:text-[20px]">{d.name}</span>
        {d.photoUrl && (
          <span title="Foto real del estudio" className="hidden shrink-0 items-center gap-1 text-[11px] sm:inline-flex font-semibold uppercase tracking-wide text-choco/70">
            <Camera size={13} /> Real
          </span>
        )}
      </div>
    </button>
  )
}

/** Escenario: renders de la mano modelo, apilados para un fundido instantáneo entre diseños. */
export function DesignStage({ designs, current, className = '' }: { designs: Design[]; current?: Design; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rx = useSpring(useTransform(my, (v) => v * -6), { stiffness: 120, damping: 18 })
  const ry = useSpring(useTransform(mx, (v) => v * 8), { stiffness: 120, damping: 18 })
  const glareX = useTransform(mx, (v) => `${50 + v * 40}%`)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { rootMargin: '400px' })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`relative [perspective:1400px] ${className}`}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        mx.set(((e.clientX - r.left) / r.width) * 2 - 1)
        my.set(((e.clientY - r.top) / r.height) * 2 - 1)
      }}
      onPointerLeave={() => {
        mx.set(0)
        my.set(0)
      }}
    >
      <motion.div style={{ rotateX: rx, rotateY: ry }} className="relative aspect-[4/5] overflow-hidden rounded-[32px] bg-white shadow-[0_40px_80px_-40px_rgb(23_21_22/0.45)] ring-1 ring-gris-100">
        {designs.map((d) =>
          d.renderUrl && seen ? (
            <img
              key={d.id}
              src={assetUrl(d.renderUrl)}
              alt={current?.id === d.id ? `Diseño ${d.name} sobre la mano modelo` : ''}
              aria-hidden={current?.id !== d.id}
              className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform,filter] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                current?.id === d.id ? 'scale-100 opacity-100 blur-0' : 'scale-[1.025] opacity-0 blur-[2px]'
              }`}
              loading="lazy"
              decoding="async"
            />
          ) : null,
        )}
        {current && !current.renderUrl && current.photoUrl && <Img src={current.photoUrl} alt={`Trabajo real: ${current.name}`} className="absolute inset-0 h-full w-full object-cover" />}
        {!seen && <Skeleton className="absolute inset-0 rounded-none" />}
        {/* reflejo que sigue al puntero */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-soft-light"
          style={{ background: useTransform(glareX, (x) => `radial-gradient(60% 50% at ${x} 20%, rgb(255 255 255 / 0.55), transparent 70%)`) }}
        />
      </motion.div>
    </div>
  )
}

export function Designs() {
  const { designs, loaded } = useCatalog()
  const navigate = useNavigate()
  const [hover, setHover] = useState<Design | null>(null)
  const [selected, setSelected] = useState<Design | null>(null)
  const current = hover ?? selected ?? designs.find((d) => d.renderUrl) ?? designs[0]

  return (
    <section id="disenos" className="relative scroll-mt-24 border-y border-bone/[0.06] bg-[radial-gradient(50%_40%_at_15%_20%,rgb(87_3_20/0.22),transparent_70%)] py-20 md:py-28">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14">
          <div className="lg:sticky lg:top-6 lg:self-start">
            <h2 className="text-[clamp(44px,6vw,80px)] leading-[0.95] text-ink">Elegí tu diseño</h2>
            <p className="mt-4 max-w-[46ch] text-choco">Cada foto es un trabajo real del estudio. Pasá el mouse para verlo en la mano y elegí el tuyo.</p>
            <div className="relative mt-8">
              {loaded ? <DesignStage designs={designs} current={current} /> : <Skeleton className="aspect-[4/5] w-full rounded-[32px]" />}
              <AnimatePresence mode="wait">
                {current && (
                  <motion.div
                    key={current.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.35, ease }}
                    className="pointer-events-none absolute left-4 top-4 max-w-[70%] rounded-[18px] bg-coal/60 px-4 py-3 ring-1 ring-bone/10 backdrop-blur-md"
                  >
                    <p className="font-serif text-[26px] leading-none text-ink">{current.name}</p>
                    {current.description && <p className="mt-1 text-[13px] text-choco">{current.description}</p>}
                  </motion.div>
                )}
              </AnimatePresence>
              {current?.photoUrl && current.renderUrl && (
                <figure className="absolute bottom-4 right-4 w-[88px] overflow-hidden rounded-[16px] bg-white p-1 shadow-lg">
                  <Img src={current.photoUrl.startsWith('img:') ? current.photoUrl : thumbUrl(current.photoUrl)} alt={`Foto real del trabajo ${current.name}`} className="aspect-[4/5] w-full rounded-[12px] object-cover" />
                  <figcaption className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-choco">Foto real</figcaption>
                </figure>
              )}
            </div>
            <button
              onClick={() => current && navigate(`/reservar?diseno=${current.id}`)}
              className="group mt-6 inline-flex h-14 w-full items-center justify-between rounded-full bg-ink pl-7 pr-2 text-[16px] font-semibold text-white transition hover:bg-ink/85 active:scale-[0.99] sm:w-auto sm:gap-6"
            >
              Reservar con este diseño
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink transition group-hover:translate-x-0.5">
                <ArrowRight size={18} weight="bold" />
              </span>
            </button>
          </div>

          <div>
            {!loaded ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="aspect-[4/5]" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4" onMouseLeave={() => setHover(null)}>
                {designs
                  .filter((d) => d.photoUrl)
                  .map((d, i) => (
                    <motion.div
                      key={d.id}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.7, delay: (i % 3) * 0.06, ease }}
                      className={i % 3 === 1 ? 'sm:translate-y-8' : ''}
                    >
                      <DesignCard d={d} active={selected?.id === d.id} onPreview={setHover} onSelect={setSelected} />
                    </motion.div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
