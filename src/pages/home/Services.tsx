import { ArrowUpRight } from '@phosphor-icons/react'
import { AnimatePresence, motion, useMotionValue, useSpring } from 'motion/react'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Skeleton } from '../../components/ui'
import { assetUrl } from '../../lib/api'
import { money } from '../../lib/pricing'
import { useCatalog } from '../../lib/store'
import { Eyebrow, WRAP, formatDuration, reveal } from './parts'

/** Foto de un trabajo real para cada servicio (los servicios nuevos usan las de la lista en orden). */
const PHOTO: Record<string, string> = {
  semi: 'img/trabajos/nude-rosado-sm.webp',
  'semi-niv': 'img/trabajos/milky-glitter-sm.webp',
  capping: 'img/trabajos/francesita-almendra-sm.webp',
  softgel: 'img/trabajos/baby-boomer-strass-sm.webp',
  dual: 'img/trabajos/animal-print-sm.webp',
}
const FALLBACK = ['img/trabajos/latte-sm.webp', 'img/trabajos/french-joya-sm.webp', 'img/trabajos/velvet-chocolate-sm.webp']
const photoFor = (id: string, i: number) => assetUrl(PHOTO[id] ?? FALLBACK[i % FALLBACK.length])!

/** Lista grande de servicios: al pasar el mouse, una foto del trabajo sigue al cursor. */
export function Services() {
  const { services, extras, loaded } = useCatalog()
  const [hover, setHover] = useState<number | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 260, damping: 28, mass: 0.6 })
  const sy = useSpring(y, { stiffness: 260, damping: 28, mass: 0.6 })

  return (
    <section id="servicios" className="scroll-mt-24 py-24 md:py-32">
      <div className={WRAP}>
        <motion.div {...reveal()} className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Eyebrow>Servicios</Eyebrow>
            <h2 className="mt-6 text-[clamp(52px,7vw,118px)] leading-[0.9] tracking-[-0.025em] text-bone">Servicios y precios</h2>
          </div>
          <p className="max-w-[36ch] text-[16px] leading-relaxed text-bone/55 md:pb-3">Precios por sesión. La seña la dejás al reservar y se descuenta del total.</p>
        </motion.div>

        <div
          ref={box}
          className="relative mt-14 md:mt-20"
          onMouseMove={(e) => {
            const r = box.current!.getBoundingClientRect()
            x.set(e.clientX - r.left)
            y.set(e.clientY - r.top)
          }}
          onMouseLeave={() => setHover(null)}
        >
          {/* foto que sigue al cursor (sólo con mouse) */}
          <motion.div
            aria-hidden
            style={{ x: sx, y: sy }}
            className="pointer-events-none absolute left-0 top-0 z-20 hidden md:block"
          >
            <AnimatePresence>
              {hover !== null && services[hover] && (
                <motion.div
                  key={services[hover].id}
                  initial={{ opacity: 0, scale: 0.85, rotate: -4 }}
                  animate={{ opacity: 1, scale: 1, rotate: -2 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
                  className="absolute w-[240px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[1.5rem] border border-bone/15 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.9)] lg:w-[280px]"
                >
                  <img src={photoFor(services[hover].id, hover)} alt="" className="aspect-[3/4] w-full object-cover" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {!loaded ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-24 rounded-[1.5rem]" />
              ))}
            </div>
          ) : (
            <ul className="border-t border-bone/10">
              {services.map((s, i) => (
                <motion.li key={s.id} {...reveal(i)} className="border-b border-bone/10" onMouseEnter={() => setHover(i)}>
                  <Link to={`/reservar?servicio=${s.id}`} className="group relative isolate block overflow-hidden py-6 md:py-9">
                    <span
                      aria-hidden
                      className="absolute inset-0 -z-10 origin-left scale-x-0 bg-gradient-to-r from-accent/50 via-accent/20 to-transparent transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-x-100"
                    />
                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 md:grid-cols-12 md:gap-x-6">
                      <img src={photoFor(s.id, i)} alt="" className="h-16 w-12 rounded-xl object-cover md:hidden" loading="lazy" />
                      <span className="hidden text-[13px] tabular-nums text-bone/35 md:col-span-1 md:block">{String(i + 1).padStart(2, '0')}</span>
                      <div className="min-w-0 md:col-span-6">
                        <h3 className="text-[clamp(28px,4.4vw,68px)] leading-[0.95] tracking-[-0.02em] text-bone transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] md:group-hover:translate-x-4">
                          {s.name}
                        </h3>
                        <p className="mt-1.5 text-[13px] text-bone/50 md:hidden">{formatDuration(s.durationMin)}</p>
                      </div>
                      <p className="hidden text-[14px] leading-snug text-bone/50 md:col-span-3 md:block">
                        {s.description}
                        <span className="mt-1 block text-bone/35">{formatDuration(s.durationMin)}</span>
                      </p>
                      <div className="flex items-center justify-end gap-4 md:col-span-2">
                        <p className="text-right font-serif text-[clamp(24px,2.4vw,38px)] leading-none text-bone">
                          {s.priceFrom && <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-[0.2em] text-bone/45">desde</span>}
                          {money(s.price)}
                        </p>
                        <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-bone/15 text-bone transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:rotate-45 group-hover:border-bone group-hover:bg-bone group-hover:text-coal lg:inline-flex">
                          <ArrowUpRight size={17} />
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.li>
              ))}
            </ul>
          )}
        </div>

        {extras.length > 0 && (
          <motion.div {...reveal()} className="mt-8 flex flex-wrap items-center gap-2">
            <span className="mr-2 text-[11px] font-medium uppercase tracking-[0.2em] text-bone/45">Extras</span>
            {extras.map((x) => (
              <span key={x.id} className="inline-flex items-center gap-3 rounded-full border border-bone/10 bg-bone/[0.04] px-4 py-2 text-[14px] text-bone/75">
                {x.name}
                <span className="font-semibold text-bone">
                  {money(x.price)}
                  {x.mode === 'unit' ? ' c/u' : ''}
                </span>
              </span>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  )
}
