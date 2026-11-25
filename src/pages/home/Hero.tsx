import { CalendarCheck, ChatCircleDots, InstagramLogo, List, MagnifyingGlass, ShieldCheck, Sparkle, X } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { assetUrl, thumbUrl } from '../../lib/api'
import { openStatus } from '../../lib/availability'
import { useCatalog } from '../../lib/store'
import { QuickBook } from './QuickBook'

const ease = [0.16, 1, 0.3, 1] as const
const OWNER = assetUrl('img/estudio/stefania-hero.webp')!
const OWNER_SM = assetUrl('img/estudio/stefania-hero-sm.webp')!

const NAV = [
  { href: '#servicios', label: 'Servicios' },
  { href: '#disenos', label: 'Diseños' },
  { href: '#trabajos', label: 'Trabajos' },
  { href: '#preguntas', label: 'Preguntas' },
]

function scrollToId(e: React.MouseEvent, href: string) {
  e.preventDefault()
  document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const enter = (delay: number, reduce: boolean | null) => ({
  initial: reduce ? false : { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay, ease },
})

export function Navbar() {
  const { settings } = useCatalog()
  const [menu, setMenu] = useState(false)
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-gris-100/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-8">
          <Link to="/" aria-label="Stefania Nails Studio, inicio" className="shrink-0">
            <Logo className="h-10 text-accent" />
          </Link>
          <nav aria-label="Principal" className="hidden items-center gap-7 lg:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} onClick={(e) => scrollToId(e, n.href)} className="text-[15px] font-medium text-ink/75 transition hover:text-ink">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {settings?.instagram && (
              <a
                href={`https://instagram.com/${settings.instagram}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram del estudio"
                className="hidden h-10 w-10 items-center justify-center rounded-full ring-1 ring-gris transition hover:ring-ink md:inline-flex"
              >
                <InstagramLogo size={19} />
              </a>
            )}
            <Link to="/mi-turno" className="hidden h-10 items-center gap-2 rounded-full px-4 text-[14px] font-semibold text-ink ring-1 ring-gris transition hover:ring-ink sm:inline-flex">
              <MagnifyingGlass size={16} /> Mi turno
            </Link>
            <Link
              to="/reservar"
              className="inline-flex h-10 items-center rounded-full bg-ink px-4 text-[14px] font-semibold text-white transition hover:bg-black active:scale-[0.98] md:px-5"
            >
              Reservar turno
            </Link>
            <button aria-label="Abrir menú" onClick={() => setMenu(true)} className="inline-flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-gris lg:hidden">
              <List size={20} />
            </button>
          </div>
        </div>
      </header>
      <AnimatePresence>
        {menu && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-white p-5" role="dialog" aria-modal="true" aria-label="Menú">
            <div className="flex items-center justify-between">
              <Logo className="h-10 text-accent" />
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
              <Link to="/mi-turno" className="mt-4 font-serif text-5xl text-ink">
                Mi turno
              </Link>
            </nav>
            <Link to="/reservar" className="absolute inset-x-5 bottom-8 inline-flex h-14 items-center justify-center rounded-full bg-ink text-[16px] font-semibold text-white">
              Reservar turno
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export function Hero() {
  const reduce = useReducedMotion()
  const { hours, designs } = useCatalog()
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])
  const status = useMemo(() => (hours.length ? openStatus(hours, now) : null), [hours, now])
  const featured = designs.find((d) => d.id === 'ojo-de-gato-azul') ?? designs.find((d) => d.renderUrl)

  return (
    <section aria-label="Portada" className="relative overflow-hidden">
      {/* manchas suaves detrás del vidrio: grises con un destello bordó mínimo */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-24 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgb(23_21_22/0.10),transparent_68%)]" />
        <div className="absolute left-[30%] top-[55%] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgb(87_3_20/0.07),transparent_70%)]" />
        <div className="absolute -top-40 left-[20%] h-[380px] w-[520px] rounded-full bg-[radial-gradient(circle,rgb(255_255_255/0.9),transparent_70%)]" />
      </div>
      <div className="relative mx-auto grid max-w-[1400px] gap-8 px-4 pb-14 pt-6 sm:px-8 md:pt-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start lg:gap-12 lg:pb-20">
        {/* columna izquierda: propuesta + reserva rápida */}
        <div className="flex flex-col">
          <motion.div {...enter(0, reduce)} className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold text-ink ring-1 ring-gris-100">
            <span className={`h-2 w-2 rounded-full ${status?.open ? 'bg-emerald-500' : 'bg-gris'}`} aria-hidden />
            {status ? status.text : 'Turnos online'}
          </motion.div>
          <motion.h1 {...enter(0.08, reduce)} className="mt-4 text-[clamp(40px,4.7vw,70px)] leading-[0.98] tracking-[-0.015em] text-ink">
            Tu manicura, reservada <em className="italic text-accent">en un minuto.</em>
          </motion.h1>
          <motion.p {...enter(0.16, reduce)} className="mt-4 max-w-[52ch] text-[16px] leading-relaxed text-ink/75 md:text-[17px]">
            Elegí servicio y horario libre, mirá diseños reales del estudio y dejá tu seña online. Stefania te confirma por WhatsApp.
          </motion.p>
          <motion.div {...enter(0.24, reduce)} className="mt-6">
            <QuickBook />
          </motion.div>
        </div>

        {/* columna derecha: Stefania en un panel negro de estudio */}
        <motion.div {...enter(0.1, reduce)} className="relative h-[520px] sm:h-[600px] lg:sticky lg:top-24 lg:h-[min(760px,calc(100dvh-130px))]">
          <div className="absolute inset-0 overflow-hidden rounded-[36px] bg-[#0e0d0d] ring-1 ring-black/40">
            {/* luz de estudio detrás de ella para separar su ropa negra del fondo */}
            <div className="absolute inset-0 bg-[radial-gradient(48%_42%_at_50%_46%,rgb(255_255_255/0.20),transparent_72%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(90%_60%_at_50%_0%,rgb(255_255_255/0.08),transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(55%_35%_at_85%_105%,rgb(87_3_20/0.45),transparent_70%)]" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <p aria-hidden className="absolute -right-4 top-6 select-none font-serif text-[clamp(120px,15vw,220px)] leading-none text-white/[0.07]">
              Stefania
            </p>
            <img
              src={OWNER}
              srcSet={`${OWNER_SM} 640w, ${OWNER} 1000w`}
              sizes="(max-width: 1024px) 80vw, 600px"
              alt="Stefania, dueña de Stefania Nails Studio, con uñas bordó"
              className="absolute bottom-0 left-1/2 h-[92%] w-auto max-w-none -translate-x-1/2 select-none drop-shadow-[0_24px_40px_rgb(0_0_0/0.5)]"
              fetchPriority="high"
              draggable={false}
            />
          </div>

          {/* tarjetas flotantes */}
          <motion.div
            initial={reduce ? false : { opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease }}
            className="glass-light absolute left-4 top-5 max-w-[230px] rounded-[22px] p-4 sm:left-6 sm:top-6"
          >
            <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
              <CalendarCheck size={18} className="text-accent" /> Confirmación por WhatsApp
            </p>
            <p className="mt-1 text-[12px] leading-snug text-choco">Recibís el recordatorio un día antes de tu turno.</p>
          </motion.div>
          <motion.div
            initial={reduce ? false : { opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.65, ease }}
            className="glass-light absolute bottom-6 right-4 w-[200px] rounded-[22px] p-2.5 sm:right-6"
          >
            {featured?.renderUrl && <img src={thumbUrl(featured.renderUrl)} alt="" className="aspect-[5/4] w-full rounded-[16px] bg-white object-cover" loading="lazy" />}
            <div className="px-1.5 pb-1 pt-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-choco">Diseño destacado</p>
              <p className="font-serif text-[20px] leading-tight text-ink">{featured?.name ?? 'Firma bordó'}</p>
              <Link to={`/reservar?diseno=${featured?.id ?? ''}`} className="mt-2 inline-flex h-8 items-center rounded-full bg-ink px-3.5 text-[12px] font-semibold text-white">
                Lo quiero
              </Link>
            </div>
          </motion.div>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8, ease }}
            className="glass absolute bottom-6 left-4 hidden items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold text-white sm:left-6 sm:flex"
          >
            <ShieldCheck size={17} /> Seña online segura
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

const FEATURES = [
  { icon: CalendarCheck, title: 'Agenda en vivo', text: 'Sólo ves horarios realmente libres.' },
  { icon: Sparkle, title: 'Diseños reales', text: 'Mirá cada trabajo en la mano antes de elegir.' },
  { icon: ShieldCheck, title: 'Seña online', text: 'Transferencia o Mercado Pago, sin vueltas.' },
  { icon: ChatCircleDots, title: 'Todo por WhatsApp', text: 'Confirmación y recordatorio de tu turno.' },
]

export function FeatureStrip() {
  return (
    <section aria-label="Ventajas" className="border-y border-gris-100 bg-gris-50/60">
      <ul className="mx-auto grid max-w-[1400px] grid-cols-2 gap-x-6 gap-y-6 px-4 py-8 sm:px-8 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <li key={f.title} className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-ink ring-1 ring-gris-100">
              <f.icon size={21} />
            </span>
            <div>
              <p className="text-[15px] font-semibold text-ink">{f.title}</p>
              <p className="text-[14px] leading-snug text-choco">{f.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
