import { CalendarBlank } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { assetUrl } from '../../lib/api'
import { dayLabel, openStatus, useNextSlots, useSchedule } from '../../lib/availability'
import { useCatalog } from '../../lib/store'
import { BTN_BONE, BTN_GLASS, Bubble, Eyebrow, WRAP, ease, scrollToId } from './parts'

const OWNER = assetUrl('img/estudio/stefania-hero.webp')!
const OWNER_SM = assetUrl('img/estudio/stefania-hero-sm.webp')!

const NAV = [
  { href: '#servicios', label: 'Servicios' },
  { href: '#disenos', label: 'Diseños' },
  { href: '#estudio', label: 'Stefania' },
  { href: '#preguntas', label: 'Preguntas' },
  { href: '#contacto', label: 'Contacto' },
]

/* ---------------- Navegación: isla de vidrio flotante ---------------- */
export function Navbar() {
  const [menu, setMenu] = useState(false)
  useEffect(() => {
    document.body.style.overflow = menu ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menu])

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3 sm:top-5">
        <header className="pointer-events-auto flex h-14 w-full max-w-[1120px] items-center justify-between gap-4 rounded-full border border-bone/10 bg-coal/55 pl-5 pr-2 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] backdrop-blur-xl backdrop-saturate-150">
          <Link to="/" aria-label="Stefania Nails Studio, inicio" className="shrink-0" onClick={() => setMenu(false)}>
            <Logo className="h-8 text-bone" />
          </Link>
          <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={(e) => scrollToId(e, n.href)}
                className="rounded-full px-4 py-2 text-[14px] font-medium text-bone/65 transition duration-300 hover:bg-bone/[0.06] hover:text-bone"
              >
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            <Link to="/mi-turno" className="hidden rounded-full px-4 py-2 text-[14px] font-medium text-bone/65 transition hover:text-bone sm:inline">
              Mi turno
            </Link>
            <Link
              to="/reservar"
              className="inline-flex h-10 items-center rounded-full bg-bone px-5 text-[14px] font-semibold text-coal transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#fff] active:scale-[0.97]"
            >
              Reservar
            </Link>
            <button
              aria-label={menu ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menu}
              onClick={() => setMenu((m) => !m)}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-bone/15 lg:hidden"
            >
              <span className={`absolute h-px w-4 bg-bone transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${menu ? 'rotate-45' : '-translate-y-[3px]'}`} />
              <span className={`absolute h-px w-4 bg-bone transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${menu ? '-rotate-45' : 'translate-y-[3px]'}`} />
            </button>
          </div>
        </header>
      </div>

      <AnimatePresence>
        {menu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease }}
            className="fixed inset-0 z-40 flex flex-col bg-coal/85 px-6 pb-10 pt-28 backdrop-blur-3xl lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
          >
            <nav className="flex flex-col">
              {[...NAV, { href: '#/mi-turno', label: 'Mi turno' }].map((n, i) => (
                <div key={n.href} className="overflow-hidden">
                  <motion.a
                    href={n.href}
                    initial={{ y: 56, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.7, delay: 0.08 + i * 0.05, ease }}
                    onClick={(e) => {
                      setMenu(false)
                      if (!n.href.startsWith('#/')) scrollToId(e, n.href)
                    }}
                    className="block py-2 font-serif text-[46px] leading-[1.05] text-bone"
                  >
                    {n.label}
                  </motion.a>
                </div>
              ))}
            </nav>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.7, ease }} className="mt-auto">
              <Link to="/reservar" onClick={() => setMenu(false)} className={`${BTN_BONE} w-full justify-between`}>
                Reservar turno <Bubble />
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/* ---------------- Portada: tapa de revista ---------------- */
export function Hero() {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const { hours, settings, services } = useCatalog()
  const { busy, blocked } = useSchedule(21)
  const first = services[0]
  const next = useNextSlots({ service: first, settings, hours, busy, blocked, limit: 1 })[0]
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])
  const status = useMemo(() => (hours.length ? openStatus(hours, now) : null), [hours, now])

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const wordY = useTransform(scrollYProgress, [0, 1], [0, 160])
  const imgY = useTransform(scrollYProgress, [0, 1], [0, -40])
  const imgScale = useTransform(scrollYProgress, [0, 1], [1, 1.06])

  const up = (d: number) => ({
    initial: reduce ? false : { opacity: 0, y: 40, filter: 'blur(10px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { duration: 1.1, delay: d, ease },
  })

  return (
    <section ref={ref} aria-label="Portada" className="relative isolate flex min-h-[100dvh] flex-col overflow-hidden">
      {/* escenario: luz bordó, firma gigante y Stefania por delante */}
      <div className="relative h-[66vh] min-h-[460px] md:absolute md:inset-0 md:h-auto">
        <div
          aria-hidden
          className="absolute left-1/2 top-[58%] -z-10 aspect-square w-[min(120vw,1100px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(87_3_20/0.85)_0%,rgb(87_3_20/0.28)_38%,transparent_68%)]"
        />
        <motion.p
          aria-hidden
          style={{ y: reduce ? 0 : wordY }}
          initial={reduce ? false : { opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.4, ease }}
          className="absolute inset-x-0 top-[12vh] select-none text-center font-serif uppercase leading-[0.8] tracking-[-0.03em] text-bone text-[clamp(84px,22vw,350px)] md:top-[14vh]"
        >
          Stefania
        </motion.p>
        <motion.div
          style={{ y: reduce ? 0 : imgY, scale: reduce ? 1 : imgScale }}
          initial={reduce ? false : { opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.3, delay: 0.15, ease }}
          className="absolute inset-x-0 bottom-0 flex justify-center"
        >
          <img
            src={OWNER}
            srcSet={`${OWNER_SM} 640w, ${OWNER} 1000w`}
            sizes="(max-width: 768px) 90vw, 700px"
            alt="Stefania, dueña de Stefania Nails Studio, con uñas bordó"
            className="h-[56vh] min-h-[400px] w-auto max-w-none select-none md:h-[84vh] md:max-h-[900px]"
            fetchPriority="high"
            draggable={false}
          />
        </motion.div>
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-coal via-coal/70 to-transparent" />
      </div>

      {/* texto y próximo turno */}
      <div className={`${WRAP} relative z-10 -mt-16 grid gap-8 pb-10 md:mt-auto md:grid-cols-12 md:items-end md:pb-12`}>
        <div className="md:col-span-6 lg:col-span-5">
          <motion.div {...up(0.35)}>
            <Eyebrow>
              <span className={`h-1.5 w-1.5 rounded-full ${status?.open ? 'bg-emerald-400' : 'bg-bone/40'}`} aria-hidden />
              {status?.text ?? 'Nails Studio · Turnos online'}
            </Eyebrow>
          </motion.div>
          <motion.h1 {...up(0.45)} className="mt-5 max-w-[16ch] text-[clamp(36px,3.6vw,58px)] leading-[1.02] tracking-[-0.02em] text-bone">
            Manicura de autor, hecha a mano en el estudio.
          </motion.h1>
          <motion.div {...up(0.55)} className="mt-7 flex flex-wrap gap-3">
            <Link to="/reservar" className={BTN_BONE}>
              Reservar turno <Bubble />
            </Link>
            <a href="#servicios" onClick={(e) => scrollToId(e, '#servicios')} className={BTN_GLASS}>
              Ver precios
            </a>
          </motion.div>
        </div>

        <motion.div {...up(0.65)} className="md:col-span-5 md:col-start-8 lg:col-span-4 lg:col-start-9">
          <div className="rounded-[2rem] border border-bone/10 bg-bone/[0.04] p-1.5 backdrop-blur-xl">
            <div className="rounded-[calc(2rem-0.375rem)] border border-bone/[0.06] bg-coal/50 p-5 shadow-[inset_0_1px_1px_rgb(255_255_255/0.08)]">
              <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-bone/55">
                <CalendarBlank size={14} weight="light" /> Próximo turno libre
              </p>
              {next && first ? (
                <>
                  <p className="mt-3 font-serif text-[40px] leading-none text-bone">
                    <span className="capitalize">{dayLabel(next.date)}</span>, {next.time}
                  </p>
                  <p className="mt-2 text-[14px] text-bone/55">{first.name}</p>
                  <Link
                    to={`/reservar?servicio=${first.id}&fecha=${next.date}&hora=${next.time}`}
                    className="group mt-5 flex h-12 items-center justify-between rounded-full bg-bone/[0.07] pl-5 pr-1.5 text-[14px] font-semibold text-bone transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-bone hover:text-coal"
                  >
                    Tomar este horario
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-bone text-coal transition duration-500 group-hover:bg-coal group-hover:text-bone">
                      <CalendarBlank size={15} />
                    </span>
                  </Link>
                </>
              ) : (
                <>
                  <p className="mt-3 font-serif text-[34px] leading-none text-bone">Agenda online</p>
                  <p className="mt-2 text-[14px] text-bone/55">Mirá los horarios libres y reservá con seña.</p>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ---------------- Banda en movimiento ---------------- */
const BAND = ['Semipermanente', 'Soft gel', 'Capping en polygel', 'Sistema dual', 'Diseño a mano', 'Nivelación']

export function Marquee() {
  return (
    <div aria-hidden className="relative overflow-hidden border-y border-bone/10 bg-accent py-5 md:py-6">
      <div className="marquee-track flex w-max">
        {[0, 1].map((k) => (
          <div key={k} className="flex shrink-0 items-center">
            {BAND.map((t) => (
              <span key={t} className="flex items-center whitespace-nowrap font-serif text-[clamp(28px,3.2vw,48px)] italic leading-none text-bone">
                <span className="px-8 md:px-12">{t}</span>
                <span className="h-2 w-2 rotate-45 bg-bone/50" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
