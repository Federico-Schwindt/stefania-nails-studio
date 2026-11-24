import { ArrowRight, ArrowUpRight, InstagramLogo, List, Sparkle, X } from '@phosphor-icons/react'
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { assetUrl, thumbUrl } from '../../lib/api'
import { money } from '../../lib/pricing'
import { useCatalog } from '../../lib/store'

const INTRO_KEY = 'sns-intro-seen'
const ease = [0.16, 1, 0.3, 1] as const
const VIDEO = assetUrl('video/intro.mp4')!
const VIDEO_WEBM = assetUrl('video/intro.webm')!
const POSTER = assetUrl('video/intro-poster.webp')!
const OWNER = assetUrl('img/estudio/stefania-hero.webp')!
const OWNER_SM = assetUrl('img/estudio/stefania-hero-sm.webp')!
/** Momento del video en que la uña ya quedó esmaltada: ahí el bordó inunda la pantalla. */
const FLOOD_AT = 2.7

function MaskLine({ show, delay = 0, className = '', pad = '-mt-[0.2em] pt-[0.2em]', children }: { show: boolean; delay?: number; className?: string; pad?: string; children: React.ReactNode }) {
  return (
    <span className={`line-mask ${pad} ${className}`}>
      <motion.span className="block" initial={{ y: '130%' }} animate={{ y: show ? '0%' : '130%' }} transition={{ duration: 1.05, delay, ease }}>
        {children}
      </motion.span>
    </span>
  )
}

const NAV = [
  { href: '#servicios', label: 'Servicios' },
  { href: '#disenos', label: 'Diseños' },
  { href: '#trabajos', label: 'Trabajos' },
  { href: '#estudio', label: 'Estudio' },
]

function scrollToId(e: React.MouseEvent, href: string) {
  e.preventDefault()
  document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

type Phase = 'loading' | 'playing' | 'flood' | 'morph' | 'done'

export function Hero() {
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  const { designs, services, settings } = useCatalog()
  const wantsIntro = useMemo(() => {
    try {
      return !sessionStorage.getItem(INTRO_KEY) && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      return true
    }
  }, [])
  const [phase, setPhase] = useState<Phase>(wantsIntro ? 'loading' : 'done')
  const [menu, setMenu] = useState(false)
  const frame = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  useEffect(() => {
    const on = () => setMobile(window.innerWidth < 768)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])

  const show = phase === 'morph' || phase === 'done'
  const featured = useMemo(() => designs.find((d) => d.id === 'francesita-dorada') ?? designs.find((d) => d.photoUrl), [designs])
  const featuredService = services.find((s) => s.id === featured?.serviceId)

  // parallax del puntero (motion values: sin re-render)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 60, damping: 18 })
  const sy = useSpring(my, { stiffness: 60, damping: 18 })
  const rotY = useTransform(sx, (v) => v * 5)
  const rotX = useTransform(sy, (v) => -v * 3)
  const tx = useTransform(sx, (v) => v * 10)

  useEffect(() => {
    if (reduce) return
    const onMove = (e: PointerEvent) => {
      mx.set((e.clientX / window.innerWidth) * 2 - 1)
      my.set((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [mx, my, reduce])

  // bloquear scroll durante la intro
  useEffect(() => {
    document.documentElement.style.overflow = phase === 'done' || phase === 'morph' ? '' : 'hidden'
    return () => {
      document.documentElement.style.overflow = ''
    }
  }, [phase])

  const finished = useRef(false)
  const markSeen = () => {
    try {
      sessionStorage.setItem(INTRO_KEY, '1')
    } catch {
      /* noop */
    }
  }
  /** El esmalte inunda la pantalla y después se contrae hasta formar el panel. */
  const reveal = useCallback(() => {
    if (finished.current) return
    finished.current = true
    markSeen()
    setPhase('flood')
    setTimeout(() => setPhase('morph'), 750)
    setTimeout(() => setPhase('done'), 750 + 1300)
  }, [])
  const skip = useCallback(() => {
    finished.current = true
    markSeen()
    setPhase('done')
  }, [])

  // arranque del video
  useEffect(() => {
    if (phase !== 'loading') return
    const v = video.current
    if (!v) return
    let started = false
    const start = () => {
      if (started) return
      started = true
      if (document.visibilityState !== 'visible') return skip()
      v.play()
        .then(() => setPhase('playing'))
        .catch(() => skip())
    }
    v.addEventListener('canplaythrough', start, { once: true })
    if (v.readyState >= 4) start()
    const fallback = setTimeout(() => (v.readyState >= 2 ? start() : skip()), 6000)
    return () => {
      clearTimeout(fallback)
      v.removeEventListener('canplaythrough', start)
    }
  }, [phase, skip])

  // si el navegador pausa el video (pestaña oculta) lo retomamos; si se traba, revelamos igual
  useEffect(() => {
    if (phase !== 'playing') return
    const v = video.current
    if (!v) return
    let last = v.currentTime
    let stuck = 0
    const onVis = () => {
      if (document.visibilityState === 'visible' && v.paused) v.play().catch(() => skip())
    }
    document.addEventListener('visibilitychange', onVis)
    const watchdog = setInterval(() => {
      // con la pestaña oculta nadie ve la intro: pasamos directo a la portada
      if (document.visibilityState !== 'visible') return skip()
      if (v.paused) v.play().catch(() => skip())
      stuck = v.currentTime === last ? stuck + 1 : 0
      last = v.currentTime
      if (stuck >= 6) skip()
    }, 500)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      clearInterval(watchdog)
    }
  }, [phase, skip])

  const onTime = () => {
    const v = video.current
    if (v && phase === 'playing' && v.currentTime >= Math.min(FLOOD_AT, (v.duration || 99) - 0.2)) reveal()
  }

  const chrome = { initial: { opacity: 0, y: -12 }, animate: { opacity: show ? 1 : 0, y: show ? 0 : -12 }, transition: { duration: 0.8, delay: 0.35, ease } }
  const panelInset = mobile ? 'inset(50% 8px 8px 8px round 26px)' : 'inset(40% 12px 12px 12px round 32px)'

  return (
    <section aria-label="Portada" className="relative bg-[#f3efee] p-2 sm:p-3">
      <div
        ref={frame}
        className="relative mx-auto min-h-[calc(100dvh-16px)] max-w-[1480px] overflow-hidden rounded-[30px] bg-white sm:min-h-[calc(100dvh-24px)] sm:rounded-[36px] md:min-h-[max(700px,calc(100dvh-24px))]"
      >
        {/* Panel bordó: se inunda desde el centro cuando termina el video */}
        <motion.div
          aria-hidden
          className="absolute inset-x-2 bottom-2 top-[50%] rounded-[26px] bg-bordo sm:inset-x-3 sm:bottom-3 md:top-[40%] md:rounded-[32px]"
          initial={false}
          animate={{ opacity: phase === 'done' || !wantsIntro ? 1 : 0 }}
          transition={{ duration: 0 }}
        >
          <div className="absolute inset-0 rounded-[inherit] bg-[radial-gradient(120%_80%_at_50%_0%,rgb(255_255_255/0.10),transparent_60%)]" />
          <div className="absolute -left-24 bottom-[-30%] h-[70%] w-[45%] rounded-full bg-bordo-500/50 blur-3xl" />
          <div className="absolute -right-16 top-[-20%] h-[60%] w-[35%] rounded-full bg-black/25 blur-3xl" />
        </motion.div>

        {/* Titulares (detrás de la mano) */}
        <div className="pointer-events-none absolute inset-x-0 top-[78px] z-[5] px-5 sm:px-8 md:top-[92px] lg:px-14">
          <div className="flex items-start justify-between gap-4">
            <h1 className="sr-only">Stefania Nails Studio. Diseñá tus uñas, reservá tu turno.</h1>
            <div aria-hidden className="text-left">
              <MaskLine show={show} delay={0.15} className="font-serif text-[clamp(26px,3.3vw,54px)] italic leading-[1.1] text-ink">
                Diseñá tus
              </MaskLine>
              <MaskLine show={show} delay={0.25} pad="pt-[0.12em]" className="font-serif text-[clamp(72px,12vw,200px)] leading-[0.8] tracking-[-0.02em] text-bordo">
                UÑAS
              </MaskLine>
            </div>
            <div aria-hidden className="mt-[clamp(110px,28vw,150px)] text-right md:mt-6">
              <MaskLine show={show} delay={0.32} className="font-serif text-[clamp(26px,3.3vw,54px)] italic leading-[1.1] text-ink">
                <span className="inline-flex items-center gap-3">
                  Reservá tu
                  <Sparkle weight="fill" className="hidden size-[0.7em] text-bordo md:block" />
                </span>
              </MaskLine>
              <MaskLine show={show} delay={0.42} pad="pt-[0.12em]" className="font-serif text-[clamp(72px,12vw,200px)] leading-[0.8] tracking-[-0.02em] text-bordo">
                TURNO
              </MaskLine>
            </div>
          </div>
        </div>

        {/* Stefania, la dueña, sobre el panel (como en la referencia) */}
        <div className="pointer-events-none absolute bottom-0 left-1/2 z-10 h-[60%] -translate-x-1/2 sm:h-[66%] md:h-[94%]" style={{ perspective: 1200 }}>
          <motion.div
            className="relative h-full origin-bottom"
            initial={false}
            animate={{ y: show ? 0 : 70, opacity: show ? 1 : 0, scale: show ? 1 : 0.96 }}
            transition={{ duration: 1.2, delay: phase === 'morph' ? 0.35 : 0, ease }}
            style={{ rotateY: rotY, rotateX: rotX, translateX: tx }}
          >
            <img
              src={OWNER}
              srcSet={`${OWNER_SM} 640w, ${OWNER} 1000w`}
              sizes="(max-width: 768px) 70vw, 560px"
              alt="Stefania, dueña de Stefania Nails Studio, con los brazos cruzados y uñas bordó"
              className="block h-full w-auto max-w-none select-none drop-shadow-[0_24px_30px_rgb(40_0_10/0.18)]"
              draggable={false}
              fetchPriority="high"
            />
          </motion.div>
        </div>

        {/* Navegación */}
        <motion.header {...chrome} className="absolute inset-x-0 top-0 z-30 flex h-[68px] items-center justify-between px-4 sm:px-8 md:h-[76px] lg:px-14">
          <nav aria-label="Principal" className="hidden items-center gap-7 md:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} onClick={(e) => scrollToId(e, n.href)} className="text-[15px] font-medium text-ink/80 transition hover:text-bordo">
                {n.label}
              </a>
            ))}
          </nav>
          <Link to="/" aria-label="Stefania Nails Studio, inicio" className="md:absolute md:left-1/2 md:-translate-x-1/2">
            <Logo className="h-10 text-bordo md:h-12" />
          </Link>
          <div className="flex items-center gap-2">
            {settings?.instagram && (
              <a
                href={`https://instagram.com/${settings.instagram}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram del estudio"
                className="hidden h-10 w-10 items-center justify-center rounded-full ring-1 ring-gris transition hover:ring-bordo md:inline-flex"
              >
                <InstagramLogo size={19} />
              </a>
            )}
            <Link
              to="/reservar"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-bordo px-4 text-[14px] font-semibold text-white transition hover:bg-bordo-700 active:scale-[0.98] md:h-11 md:px-5 md:text-[15px]"
            >
              Reservar turno
            </Link>
            <button aria-label="Abrir menú" onClick={() => setMenu(true)} className="inline-flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-gris md:hidden">
              <List size={20} />
            </button>
          </div>
        </motion.header>

        {/* Contenido del panel */}
        <div className="absolute inset-x-2 bottom-2 top-[50%] z-20 sm:inset-x-3 sm:bottom-3 md:top-[40%]">
          <motion.div
            aria-hidden
            initial={false}
            animate={{ opacity: show ? 1 : 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%] rounded-b-[26px] bg-gradient-to-t from-bordo via-bordo/90 to-transparent md:hidden"
          />
          <div className="relative grid h-full grid-cols-1 px-5 pb-6 sm:px-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)] md:items-end md:gap-6 md:pb-10 md:pt-10 lg:px-12">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: show ? 1 : 0, y: show ? 0 : 24 }}
              transition={{ duration: 0.9, delay: 0.6, ease }}
              className="relative z-20 self-end text-white md:self-center"
            >
              <p className="mb-3 hidden items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.18em] text-white/70 md:flex">
                <Sparkle weight="fill" size={14} /> Manicura en el estudio
              </p>
              <p className="max-w-[34ch] text-[15px] leading-relaxed text-white/90 max-md:max-w-[20ch] md:text-[18px]">
                Semipermanente, soft gel y polygel con diseño a mano. Probá tu diseño y reservá con seña online.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3 md:mt-6">
                <button
                  onClick={() => navigate('/reservar')}
                  className="group inline-flex h-12 items-center gap-3 rounded-full bg-white pl-6 pr-2 text-[15px] font-semibold text-bordo transition hover:bg-bordo-50 active:scale-[0.98] md:h-14"
                >
                  Reservar turno
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-bordo text-white transition group-hover:translate-x-0.5 md:h-10 md:w-10">
                    <ArrowRight size={17} weight="bold" />
                  </span>
                </button>
                <a
                  href="#disenos"
                  onClick={(e) => scrollToId(e, '#disenos')}
                  className="glass hidden h-12 items-center rounded-full px-5 text-[15px] font-semibold text-white transition hover:bg-white/20 sm:inline-flex md:h-14 md:px-6"
                >
                  Ver diseños
                </a>
              </div>
            </motion.div>

            <div className="hidden md:block" />

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: show ? 1 : 0, y: show ? 0 : 24 }}
              transition={{ duration: 0.9, delay: 0.75, ease }}
              className="hidden flex-col items-end gap-6 md:flex"
            >
              <ul className="flex gap-6 text-center text-[13px] text-white/85 lg:gap-8">
                {['Semipermanente', 'Soft gel', 'Polygel'].map((s) => (
                  <li key={s}>
                    <a href="#servicios" onClick={(e) => scrollToId(e, '#servicios')} className="group flex flex-col items-center gap-2 hover:text-white">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 transition group-hover:bg-white/20">
                        <Sparkle size={16} weight={s === 'Soft gel' ? 'fill' : 'regular'} />
                      </span>
                      {s}
                    </a>
                  </li>
                ))}
              </ul>
              {featured && (
                <div className="w-[210px] lg:w-[230px]">
                  <p className="mb-2 text-center text-[14px] font-semibold text-white/90">Diseño destacado</p>
                  <Link
                    to={`/reservar?diseno=${featured.id}`}
                    className="group block rounded-[24px] bg-white p-2.5 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)] transition hover:-translate-y-1"
                  >
                    <div className="aspect-[5/4] overflow-hidden rounded-[18px] bg-gris-100">
                      <img src={thumbUrl(featured.photoUrl)} alt={`Trabajo real: ${featured.name}`} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" />
                    </div>
                    <div className="px-1.5 pb-1 pt-3 text-center">
                      <p className="font-serif text-[22px] leading-none text-ink">{featured.name}</p>
                      <p className="mt-1 text-[13px] text-choco">{featuredService ? featuredService.name : 'Diseño a mano'}</p>
                      <span className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-bordo px-4 text-[13px] font-semibold text-white">
                        {featuredService ? `${featuredService.priceFrom ? 'desde ' : ''}${money(featuredService.price)}` : 'Reservar'}
                        <ArrowUpRight size={14} weight="bold" />
                      </span>
                    </div>
                  </Link>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Intro: la gota de esmalte pinta la uña, el bordó inunda la pantalla y se convierte en el panel */}
        {wantsIntro && phase !== 'done' && (
          <>
            <motion.div className="absolute inset-0 z-40 bg-white" animate={{ opacity: phase === 'morph' ? 0 : 1 }} transition={{ duration: 0 }}>
              {phase !== 'morph' && (
                <video ref={video} className="h-full w-full object-cover" muted playsInline preload="auto" poster={POSTER} onTimeUpdate={onTime} aria-hidden>
                  <source src={VIDEO_WEBM} type="video/webm" />
                  <source src={VIDEO} type="video/mp4" />
                </video>
              )}
              <AnimatePresence>
                {phase === 'loading' && (
                  <motion.div exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center bg-white">
                    <Logo className="h-16 animate-pulse text-bordo" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            {(phase === 'flood' || phase === 'morph') && (
              <motion.div
                aria-hidden
                className={`absolute inset-0 bg-bordo ${phase === 'flood' ? 'z-[45]' : 'z-[8]'}`}
                initial={phase === 'flood' ? { clipPath: 'circle(0% at 50% 42%)' } : { clipPath: 'inset(0% 0px 0px 0px round 0px)' }}
                animate={phase === 'flood' ? { clipPath: 'circle(80% at 50% 42%)' } : { clipPath: panelInset }}
                transition={phase === 'flood' ? { duration: 0.75, ease: [0.7, 0, 0.84, 0] } : { duration: 1.15, ease: [0.65, 0, 0.35, 1] }}
                key={phase}
              >
                <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_40%,rgb(255_255_255/0.12),transparent_60%)]" />
              </motion.div>
            )}
            {(phase === 'playing' || phase === 'loading') && (
              <button onClick={skip} className="absolute bottom-5 right-5 z-50 rounded-full bg-ink/5 px-4 py-2 text-[13px] font-medium text-ink/70 backdrop-blur transition hover:bg-ink/10">
                Saltar intro
              </button>
            )}
          </>
        )}
      </div>

      {/* Menú mobile */}
      <AnimatePresence>
        {menu && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-white p-5" role="dialog" aria-modal="true" aria-label="Menú">
            <div className="flex items-center justify-between">
              <Logo className="h-10 text-bordo" />
              <button aria-label="Cerrar menú" onClick={() => setMenu(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-gris">
                <X size={20} />
              </button>
            </div>
            <nav className="mt-12 flex flex-col gap-2">
              {NAV.map((n, i) => (
                <motion.a
                  key={n.href}
                  href={n.href}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i, ease }}
                  onClick={(e) => {
                    setMenu(false)
                    scrollToId(e, n.href)
                  }}
                  className="font-serif text-5xl text-ink"
                >
                  {n.label}
                </motion.a>
              ))}
            </nav>
            <Link to="/reservar" className="absolute inset-x-5 bottom-8 inline-flex h-14 items-center justify-center rounded-full bg-bordo text-[16px] font-semibold text-white">
              Reservar turno
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
