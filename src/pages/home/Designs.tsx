import { ArrowUpRight, Check, ImageSquare } from '@phosphor-icons/react'
import { motion, useScroll, useTransform } from 'motion/react'
import { useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Img } from '../../components/Img'
import { Skeleton } from '../../components/ui'
import { thumbUrl } from '../../lib/api'
import { useCatalog } from '../../lib/store'
import type { Design } from '../../lib/types'
import { Eyebrow, WRAP, useMedia } from './parts'

/** Tarjeta para la grilla del flujo de reserva: foto real; al pasar el mouse muestra el diseño en la mano. */
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
      className="group block w-full text-left"
    >
      <div
        className={`${compact ? 'aspect-square' : 'aspect-[4/5]'} relative overflow-hidden rounded-[1.25rem] bg-[#151314] transition ${
          active ? 'ring-2 ring-ink ring-offset-2 ring-offset-coal' : ''
        }`}
      >
        {img ? (
          <Img src={img.startsWith('img:') ? img : thumbUrl(img)} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-4 text-center">
            <span className="font-serif text-2xl text-bone">{d.name}</span>
          </div>
        )}
        {d.renderUrl && d.photoUrl && (
          <img
            src={thumbUrl(d.renderUrl)}
            alt=""
            className="absolute inset-0 h-full w-full bg-[#f4f2ef] object-cover opacity-0 transition duration-500 group-hover:opacity-100"
            loading="lazy"
          />
        )}
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className={`truncate font-serif leading-tight text-ink ${compact ? 'text-[17px]' : 'text-[20px]'}`}>{d.name}</span>
        {active && <Check size={16} weight="bold" className="shrink-0 text-ink" />}
      </div>
    </button>
  )
}

/** Tarjeta grande de la galería de la portada (marco doble, nombre sobre la foto). */
function GalleryCard({ d, onOpen }: { d: Design; onOpen: (d: Design) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(d)}
      aria-label={`Reservar con el diseño ${d.name}`}
      className="group w-[74vw] max-w-[340px] shrink-0 snap-start text-left md:w-[340px] md:max-w-none lg:w-[380px]"
    >
      <div className="rounded-[2rem] border border-bone/10 bg-bone/[0.03] p-1.5 transition duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-1.5 group-hover:border-bone/25">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[calc(2rem-0.375rem)] bg-[#151314]">
          {d.photoUrl && (
            <Img
              src={d.photoUrl.startsWith('img:') ? d.photoUrl : thumbUrl(d.photoUrl)}
              alt={`Trabajo real: ${d.name}`}
              className="h-full w-full object-cover transition duration-[1.2s] ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.05]"
              loading="lazy"
            />
          )}
          {d.renderUrl && (
            <img
              src={thumbUrl(d.renderUrl)}
              alt=""
              className="absolute inset-0 h-full w-full bg-[#f4f2ef] object-cover opacity-0 transition duration-700 group-hover:opacity-100"
              loading="lazy"
            />
          )}
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-coal/85 to-transparent transition-opacity duration-500 group-hover:opacity-60" />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
            <div className="min-w-0">
              <p className="truncate font-serif text-[28px] leading-none text-bone">{d.name}</p>
              {d.description && <p className="mt-1.5 line-clamp-1 text-[13px] text-bone/65">{d.description}</p>}
            </div>
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bone text-coal transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:rotate-45">
              <ArrowUpRight size={17} weight="bold" />
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}

/** Galería: en escritorio el scroll vertical mueve la fila de trabajos hacia el costado; en celular se desliza con el dedo. */
export function Designs() {
  const { designs, loaded } = useCatalog()
  const navigate = useNavigate()
  const desktop = useMedia('(min-width: 768px)')
  const list = designs.filter((d) => d.photoUrl)
  const section = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const [dist, setDist] = useState(0)
  const pinned = desktop && dist > 0

  useLayoutEffect(() => {
    const el = track.current
    if (!el) return
    const measure = () => setDist(Math.max(0, el.scrollWidth - window.innerWidth))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [list.length, desktop, pinned, loaded])

  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] })
  const x = useTransform(scrollYProgress, [0.04, 0.96], [0, -dist])
  const bar = useTransform(scrollYProgress, [0.04, 0.96], [0, 1])
  const open = (d: Design) => navigate(`/reservar?diseno=${d.id}`)

  const head = (
    <div className={`${WRAP} flex flex-col justify-between gap-6 md:flex-row md:items-end`}>
      <div>
        <Eyebrow>Fotos reales de clientas</Eyebrow>
        <h2 className="mt-6 text-[clamp(52px,7vw,118px)] leading-[0.9] tracking-[-0.025em] text-bone">Mis trabajos</h2>
      </div>
      <div className="md:max-w-[34ch] md:pb-3">
        <p className="text-[16px] leading-relaxed text-bone/55">
          {desktop ? 'Pasá el mouse para ver cada diseño en mano. ' : 'Deslizá para ver más. '}Tocá el que te guste y reservás con ese diseño.
        </p>
        {pinned && (
          <div className="mt-5 h-px w-full bg-bone/15">
            <motion.div style={{ scaleX: bar }} className="h-px origin-left bg-bone" />
          </div>
        )}
      </div>
    </div>
  )

  const cards = (
    <>
      {!loaded
        ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="aspect-[4/5] w-[74vw] max-w-[340px] shrink-0 rounded-[2rem] md:w-[340px] lg:w-[380px]" />)
        : list.map((d) => <GalleryCard key={d.id} d={d} onOpen={open} />)}
      <Link
        to="/reservar"
        className="group flex w-[74vw] max-w-[340px] shrink-0 snap-start flex-col justify-between rounded-[2rem] border border-bone/10 bg-accent/30 p-7 md:w-[340px] md:max-w-none lg:w-[380px]"
      >
        <ImageSquare size={30} weight="light" className="text-bone/80" />
        <div>
          <p className="font-serif text-[40px] leading-[1] text-bone">¿Tenés una idea?</p>
          <p className="mt-3 text-[15px] leading-relaxed text-bone/65">Subí fotos de lo que te gusta cuando reservás y lo adapto a tu uña.</p>
          <span className="mt-6 inline-flex items-center gap-2 text-[15px] font-semibold text-bone">
            Reservar con mi idea <ArrowUpRight size={16} className="transition duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </>
  )

  if (pinned) {
    return (
      <section id="disenos" ref={section} className="relative scroll-mt-0" style={{ height: `calc(100dvh + ${dist}px)` }}>
        <div className="sticky top-0 flex h-[100dvh] flex-col justify-center gap-12 overflow-hidden pt-16">
          {head}
          <motion.div ref={track} style={{ x }} className="flex w-max gap-5 px-12 lg:px-[max(3rem,calc((100vw-1440px)/2+3rem))]">
            {cards}
          </motion.div>
        </div>
      </section>
    )
  }

  return (
    <section id="disenos" ref={section} className="scroll-mt-24 py-24 md:py-32">
      {head}
      <div key={loaded ? list.length : -1} ref={track} className="no-scrollbar mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 sm:scroll-px-8 sm:px-8">
        {cards}
      </div>
    </section>
  )
}
