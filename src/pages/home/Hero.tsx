import { ArrowRight, List, X } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { assetUrl } from '../../lib/api'
import { openStatus } from '../../lib/availability'
import { money } from '../../lib/pricing'
import { useCatalog } from '../../lib/store'
import { BTN_GHOST, BTN_PRIMARY, Eyebrow, WRAP, ease, scrollToId, summarizeHours } from './parts'

const NAV = [
  { href: '#servicios', label: 'Servicios' },
  { href: '#disenos', label: 'Diseños' },
  { href: '#estudio', label: 'El estudio' },
  { href: '#preguntas', label: 'Preguntas' },
  { href: '#contacto', label: 'Contacto' },
]

export function Navbar() {
  const [menu, setMenu] = useState(false)
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-bone/[0.08] bg-coal/80 backdrop-blur-lg">
        <div className={`${WRAP} flex h-[72px] items-center justify-between gap-6`}>
          <Link to="/" aria-label="Stefania Nails Studio, inicio" className="shrink-0">
            <Logo className="h-10 text-bone" />
          </Link>
          <nav aria-label="Principal" className="hidden items-center gap-8 lg:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} onClick={(e) => scrollToId(e, n.href)} className="text-[14px] font-medium text-bone/65 transition hover:text-bone">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-5">
            <Link to="/mi-turno" className="hidden text-[14px] font-medium text-bone/65 transition hover:text-bone sm:inline">
              Mi turno
            </Link>
            <Link to="/reservar" className="inline-flex h-10 items-center rounded-[8px] bg-bone px-4 text-[14px] font-semibold text-coal transition hover:bg-[#fff] active:scale-[0.98] sm:px-5">
              Reservar
            </Link>
            <button aria-label="Abrir menú" onClick={() => setMenu(true)} className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] text-bone ring-1 ring-inset ring-bone/20 lg:hidden">
              <List size={20} />
            </button>
          </div>
        </div>
      </header>
      <AnimatePresence>
        {menu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[70] flex flex-col bg-coal px-5 pb-8 pt-4"
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
          >
            <div className="flex h-[56px] items-center justify-between">
              <Logo className="h-10 text-bone" />
              <button aria-label="Cerrar menú" onClick={() => setMenu(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] text-bone ring-1 ring-inset ring-bone/20">
                <X size={20} />
              </button>
            </div>
            <nav className="mt-10 border-t border-bone/10">
              {[...NAV, { href: '#/mi-turno', label: 'Mi turno' }].map((n, i) => (
                <motion.a
                  key={n.href}
                  href={n.href}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * i, ease }}
                  onClick={(e) => {
                    setMenu(false)
                    if (n.href.startsWith('#/')) return
                    scrollToId(e, n.href)
                  }}
                  className="flex items-center justify-between border-b border-bone/10 py-4 font-serif text-[34px] leading-none text-bone"
                >
                  {n.label}
                </motion.a>
              ))}
            </nav>
            <Link to="/reservar" className={`${BTN_PRIMARY} mt-auto w-full`}>
              Reservar turno
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function Fact({ label, value, dot }: { label: string; value: string; dot?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] font-semibold uppercase tracking-[0.18em] text-bone/45">{label}</dt>
      <dd className="mt-2 flex items-center gap-2 text-[15px] leading-snug text-bone/85">
        {dot !== undefined && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot ? 'bg-emerald-400' : 'bg-bone/30'}`} aria-hidden />}
        {value}
      </dd>
    </div>
  )
}

export function Hero() {
  const reduce = useReducedMotion()
  const { hours, settings } = useCatalog()
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])
  const status = useMemo(() => (hours.length ? openStatus(hours, now) : null), [hours, now])
  const schedule = useMemo(() => summarizeHours(hours), [hours])
  const deposit = settings ? (settings.depositMode === 'fixed' ? money(settings.depositValue) : `${settings.depositValue}% del total`) : null
  const fade = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease },
  })

  return (
    <section aria-label="Portada" className={`${WRAP} pb-16 pt-8 md:pt-12 lg:pb-24`}>
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="flex flex-col lg:col-span-6 lg:pb-2 lg:pt-10">
          <motion.div {...fade(0)}>
            <Eyebrow>Semipermanente · Soft gel · Polygel</Eyebrow>
          </motion.div>
          <motion.h1 {...fade(0.05)} className="mt-6 max-w-[12ch] text-[clamp(48px,6.4vw,96px)] leading-[0.96] tracking-[-0.025em] text-bone">
            Manicura en el estudio de Stefania
          </motion.h1>
          <motion.p {...fade(0.1)} className="mt-7 max-w-[44ch] text-[17px] leading-relaxed text-bone/65 md:text-[18px]">
            Uñas cuidadas y diseños hechos a mano, con atención uno a uno. Elegí tu horario online y lo asegurás con una seña.
          </motion.p>
          <motion.div {...fade(0.15)} className="mt-9 flex flex-wrap gap-3">
            <Link to="/reservar" className={BTN_PRIMARY}>
              Reservar turno <ArrowRight size={17} />
            </Link>
            <a href="#servicios" onClick={(e) => scrollToId(e, '#servicios')} className={BTN_GHOST}>
              Servicios y precios
            </a>
          </motion.div>
          <motion.dl {...fade(0.2)} className="mt-12 grid gap-6 border-t border-bone/10 pt-6 sm:grid-cols-3 sm:gap-8 lg:mt-auto">
            <Fact label="Hoy" value={status?.text ?? 'Turnos online'} dot={status?.open ?? false} />
            <Fact label="Horarios" value={schedule || 'Consultá por WhatsApp'} />
            <Fact label="Seña" value={deposit ? `${deposit}, se descuenta del total` : 'Al reservar'} />
          </motion.dl>
        </div>

        <motion.figure {...fade(0.08)} className="lg:col-span-6">
          <div className="overflow-hidden rounded-[10px] bg-[#151314]">
            <img
              src={assetUrl('img/estudio/stefania-estudio.webp')}
              alt="Stefania sentada en su mesa de trabajo, en el estudio"
              className="aspect-[4/5] w-full object-cover object-[50%_30%] lg:aspect-auto lg:h-[min(760px,calc(100dvh-150px))] lg:min-h-[560px]"
              fetchPriority="high"
            />
          </div>
          <figcaption className="mt-3 flex justify-between gap-4 text-[13px] text-bone/45">
            <span>Stefania, en su estudio</span>
            <span>Turnos uno a uno</span>
          </figcaption>
        </motion.figure>
      </div>
    </section>
  )
}
