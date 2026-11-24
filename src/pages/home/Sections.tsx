import { ArrowUpRight, CalendarCheck, CaretDown, CreditCard, ImageSquare, InstagramLogo, Sparkle, WhatsappLogo, X } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { assetUrl } from '../../lib/api'
import { money } from '../../lib/pricing'
import { useCatalog } from '../../lib/store'

const ease = [0.16, 1, 0.3, 1] as const
const reveal = (i = 0) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.8, delay: i * 0.08, ease },
})

/* ---------------- Conocé a Stefania ---------------- */
export function About() {
  return (
    <section className="mx-auto max-w-[1400px] px-4 py-20 sm:px-8 md:py-28">
      <div className="grid items-center gap-10 md:grid-cols-12 md:gap-6">
        <motion.div {...reveal()} className="relative md:col-span-5 md:col-start-1">
          <img src={assetUrl('img/estudio/stefania-estudio.webp')} alt="Stefania, dueña del estudio, sentada en su mesa de trabajo" className="aspect-[4/5] w-full rounded-[32px] object-cover" loading="lazy" />
          <img
            src={assetUrl('img/estudio/stefania-fondo.webp')}
            alt="Retrato de Stefania con uñas bordó"
            className="absolute -bottom-8 -right-4 hidden aspect-[4/5] w-[42%] rounded-[24px] object-cover ring-8 ring-white sm:block md:-right-16"
            loading="lazy"
          />
        </motion.div>
        <motion.div {...reveal(1)} className="md:col-span-6 md:col-start-7">
          <h2 className="text-[clamp(44px,6vw,80px)] leading-[0.95] text-bordo">Conocé a Stefania</h2>
          <p className="mt-6 max-w-[52ch] text-[18px] leading-relaxed text-ink/85">
            Cada turno es uno a uno, en su estudio. Trabaja semipermanente, soft gel y polygel, y dibuja cada diseño a mano, desde una francesita fina hasta un animal print.
          </p>
          <p className="mt-4 max-w-[52ch] text-choco">Traé tu idea o elegila de su galería: la charlan al empezar y se adapta a tu uña.</p>
          <div className="mt-8 flex items-center gap-4">
            <Logo className="h-12 text-bordo" />
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ---------------- Trabajos (galería real) ---------------- */
const WORKS = [
  { src: 'img/trabajos/ojo-de-gato-azul-2.webp', alt: 'Uñas largas ojo de gato azul con relieves cromados plateados', tall: true },
  { src: 'img/trabajos/animal-print.webp', alt: 'Uñas almendra con animal print en tonos chocolate' },
  { src: 'img/trabajos/milky-glitter.webp', alt: 'Blanco lechoso con glitter plateado y strass', tall: true },
  { src: 'img/trabajos/francesita-dorada.webp', alt: 'Francesita blanca con filo dorado y strass' },
  { src: 'img/trabajos/negro-espejo.webp', alt: 'Uñas cortas cuadradas en negro espejo' },
  { src: 'img/estudio/glitter.webp', alt: 'Frasco de esmalte con glitter plateado', tall: true },
  { src: 'img/trabajos/velvet-chocolate.webp', alt: 'Nude aterciopelado con una uña chocolate y anillos dorados' },
  { src: 'img/trabajos/corazones.webp', alt: 'Uñas cortas con corazones, estrellas y rayas rosas', tall: true },
  { src: 'img/trabajos/francesita-colores.webp', alt: 'Francesita fina de colores con detalles dorados' },
  { src: 'img/trabajos/dorado-chrome.webp', alt: 'Puntas doradas espejadas y una uña ojo de gato con perla' },
  { src: 'img/trabajos/french-joya.webp', alt: 'Francesita profunda con strass en una uña', tall: true },
  { src: 'img/trabajos/plata-puntitos.webp', alt: 'Cromado plata con nude y lunares negros' },
  { src: 'img/estudio/gota.webp', alt: 'Gota de esmalte cayendo del pincel', tall: true },
  { src: 'img/trabajos/florcitas.webp', alt: 'Francesita fina con flores y puntitos' },
  { src: 'img/trabajos/milky-chocolate.webp', alt: 'Milky con uñas chocolate y anillos dorados' },
  { src: 'img/trabajos/puntitos-frutales.webp', alt: 'Uñas rosa, manteca con lunares rojos y puntas coral', tall: true },
  { src: 'img/trabajos/baby-boomer.webp', alt: 'Baby boomer nude con strass en una uña' },
  { src: 'img/trabajos/milky-aurora.webp', alt: 'Blanco lechoso con una uña de foil iridiscente' },
  { src: 'img/trabajos/latte.webp', alt: 'Nude café con leche liso', tall: true },
  { src: 'img/trabajos/french-corta.webp', alt: 'Francesita clásica en uñas cortas' },
  { src: 'img/estudio/torno.webp', alt: 'Torno de manicura en mano con guante negro' },
  { src: 'img/trabajos/nude-rosado.webp', alt: 'Nude rosado corto y natural' },
  { src: 'img/trabajos/francesita-almendra.webp', alt: 'Francesita profunda en blanco leche', tall: true },
  { src: 'img/trabajos/natural-fino.webp', alt: 'Nude rosado con micro francesita' },
]

export function Works() {
  const [open, setOpen] = useState<number | null>(null)
  const [all, setAll] = useState(false)
  const shown = all ? WORKS : WORKS.slice(0, 12)
  return (
    <section id="trabajos" className="scroll-mt-24 bg-white py-20 md:py-28">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
        <h2 className="max-w-3xl text-[clamp(44px,6vw,80px)] leading-[0.95] text-bordo">Trabajos reales del estudio</h2>
        <p className="mt-4 max-w-[48ch] text-choco">Fotos sin filtros de clientas reales. Tocá una para verla grande.</p>
        <div className="mt-10 columns-2 gap-3 sm:gap-4 md:columns-3 lg:columns-4">
          {shown.map((w, i) => (
            <motion.button
              key={w.src}
              {...reveal(i % 4)}
              onClick={() => setOpen(i)}
              className="group mb-3 block w-full overflow-hidden rounded-[22px] sm:mb-4"
              aria-label={`Ver foto: ${w.alt}`}
            >
              <img src={assetUrl(w.src.replace('.webp', '-sm.webp'))} alt={w.alt} loading="lazy" className={`w-full object-cover transition duration-[1.2s] group-hover:scale-105 ${w.tall ? 'aspect-[3/4]' : 'aspect-[4/5]'}`} />
            </motion.button>
          ))}
        </div>
        {!all && WORKS.length > 12 && (
          <div className="mt-6 flex justify-center">
            <button onClick={() => setAll(true)} className="inline-flex h-12 items-center rounded-full px-6 text-[15px] font-semibold text-ink ring-1 ring-gris transition hover:ring-bordo">
              Ver más trabajos ({WORKS.length - 12})
            </button>
          </div>
        )}
      </div>
      <AnimatePresence>
        {open !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/85 p-4 backdrop-blur"
            onClick={() => setOpen(null)}
            role="dialog"
            aria-modal="true"
            aria-label={WORKS[open].alt}
          >
            <motion.img
              initial={{ scale: 0.94 }}
              animate={{ scale: 1 }}
              src={assetUrl(WORKS[open].src)}
              alt={WORKS[open].alt}
              className="max-h-[88dvh] max-w-full rounded-[24px] object-contain"
            />
            <button aria-label="Cerrar" className="absolute right-5 top-5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink">
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

/* ---------------- Cómo reservar (pila fija al hacer scroll) ---------------- */
const STEPS = [
  { icon: Sparkle, title: 'Elegí tu servicio', text: 'Semipermanente, capping, soft gel o sistema dual. Ves el precio y la duración antes de seguir.', img: 'img/trabajos/baby-boomer.webp', tone: 'bg-white' },
  { icon: ImageSquare, title: 'Mostrá tu idea', text: 'Elegí un diseño de la galería, probá un color en 3D o subí tus fotos de inspiración.', img: 'img/disenos/florcitas.webp', tone: 'bg-bordo-50' },
  { icon: CalendarCheck, title: 'Reservá día y hora', text: 'Ves sólo los horarios libres reales. Stefania confirma tu turno desde su agenda.', img: 'img/marca/tarjeta.webp', tone: 'bg-gris-50' },
  { icon: CreditCard, title: 'Dejá la seña', text: 'Por transferencia o Mercado Pago, en un minuto. Se descuenta del total el día del turno.', img: 'img/estudio/estudio.webp', tone: 'bg-bordo text-white' },
]

export function HowTo() {
  return (
    <section className="bg-[#f3efee] py-20 md:py-28">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-8">
        <h2 className="mb-10 text-[clamp(44px,6vw,80px)] leading-[0.95] text-bordo md:mb-14">Reservá en cuatro pasos</h2>
        <div className="relative">
          {STEPS.map((s, i) => {
            const dark = s.tone.startsWith('bg-bordo text')
            return (
            <div key={s.title} className="sticky mb-6" style={{ top: `${24 + i * 22}px` }}>
              <article className={`grid min-h-[340px] overflow-hidden rounded-[32px] shadow-[0_30px_60px_-40px_rgb(73_45_35/0.5)] md:grid-cols-2 ${s.tone}`}>
                <div className="flex flex-col justify-between p-8 md:p-12">
                  <span className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${dark ? 'bg-white/15' : 'bg-bordo text-white'}`}>
                    <s.icon size={22} />
                  </span>
                  <div className="mt-10">
                    <h3 className="text-[clamp(36px,4vw,56px)] leading-none">{s.title}</h3>
                    <p className={`mt-4 max-w-[38ch] text-[17px] ${dark ? 'text-white/80' : 'text-choco'}`}>{s.text}</p>
                  </div>
                </div>
                <div className="relative hidden md:block">
                  <img src={assetUrl(s.img)} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                </div>
              </article>
            </div>
            )
          })}
        </div>
        <div className="mt-6 flex justify-center">
          <Link to="/reservar" className="group inline-flex h-14 items-center gap-6 rounded-full bg-bordo pl-7 pr-2 text-[16px] font-semibold text-white transition hover:bg-bordo-700">
            Reservar turno
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-bordo transition group-hover:rotate-45">
              <ArrowUpRight size={18} weight="bold" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ---------------- Políticas ---------------- */
export function Policies() {
  const { settings } = useCatalog()
  const all = settings?.policies ?? []
  // la política de la seña va primero y destacada; el resto en pares para no dejar huecos
  const hi = Math.max(0, all.findIndex((p) => /seña/i.test(p)))
  const items = all.length ? [all[hi], ...all.filter((_, i) => i !== hi)] : []
  if (!items.length) return null
  return (
    <section id="politicas" className="mx-auto max-w-[1400px] scroll-mt-24 px-4 py-20 sm:px-8 md:py-28">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]">
        <motion.div {...reveal()}>
          <h2 className="text-[clamp(44px,6vw,80px)] leading-[0.95] text-bordo">Antes de tu turno</h2>
          <p className="mt-4 max-w-[36ch] text-choco">Al reservar aceptás estas políticas de trabajo. Están para cuidar tu tiempo y el de las demás clientas.</p>
          <img src={assetUrl('img/estudio/herramientas.webp')} alt="Herramientas de manicura esterilizadas" className="mt-8 hidden aspect-[4/3] w-full rounded-[28px] object-cover grayscale lg:block" loading="lazy" />
        </motion.div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((p, i) => (
            <motion.li
              key={i}
              {...reveal(i % 2)}
              className={`rounded-[24px] p-6 ${i === 0 ? 'bg-bordo text-white sm:col-span-2' : 'bg-gris-50 ring-1 ring-gris-100'} ${i === items.length - 1 && items.length % 2 === 0 ? 'sm:col-span-2' : ''}`}
            >
              <span className={`font-serif text-[40px] leading-none ${i === 0 ? 'text-white/40' : 'text-bordo/30'}`}>{String(i + 1).padStart(2, '0')}</span>
              <p className={`mt-3 leading-relaxed ${i === 0 ? 'text-[20px] font-medium' : 'text-[16px] text-ink/85'}`}>{p}</p>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ---------------- Estudio y contacto + pie ---------------- */
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export function Contact() {
  const { settings, hours } = useCatalog()
  const wa = settings?.whatsapp
  const ig = settings?.instagram
  const open = [1, 2, 3, 4, 5, 6, 0].map((d) => hours.find((h) => h.weekday === d)).filter(Boolean)
  return (
    <section id="estudio" className="scroll-mt-24 p-2 sm:p-3">
      <div className="relative mx-auto max-w-[1480px] overflow-hidden rounded-[30px] bg-ink text-white sm:rounded-[36px]">
        <img src={assetUrl('img/estudio/estudio.webp')} alt="El estudio: mesa de manicura, lámpara y el cartel de Stefania Nail Studio en la pared" className="absolute inset-0 h-full w-full object-cover opacity-45" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/20" />
        <div className="relative grid gap-10 px-6 py-16 sm:px-10 md:grid-cols-2 md:py-24 lg:px-16">
          <div>
            <h2 className="text-[clamp(44px,6vw,84px)] leading-[0.95]">Te esperamos en el estudio</h2>
            {settings?.address && <p className="mt-4 text-white/75">{settings.address}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              {wa && (
                <a
                  href={`https://wa.me/${wa}?text=${encodeURIComponent('Hola Stefania! Quería consultar por un turno.')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-14 items-center gap-2 rounded-full bg-white px-6 text-[16px] font-semibold text-bordo transition hover:bg-bordo-50"
                >
                  <WhatsappLogo size={20} weight="fill" /> Escribinos por WhatsApp
                </a>
              )}
              {ig && (
                <a href={`https://instagram.com/${ig}`} target="_blank" rel="noreferrer" className="glass inline-flex h-14 items-center gap-2 rounded-full px-6 text-[16px] font-semibold">
                  <InstagramLogo size={20} /> @{ig}
                </a>
              )}
            </div>
          </div>
          {open.length > 0 && (
            <div className="glass self-end rounded-[28px] p-6 md:ml-auto md:w-[360px]">
              <p className="mb-3 text-[14px] font-semibold text-white/80">Horarios</p>
              <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-[15px]">
                {open.map((h) => (
                  <div key={h!.weekday} className="contents">
                    <dt className="text-white/75">{DAYS[h!.weekday]}</dt>
                    <dd className={h!.enabled ? 'text-white' : 'text-white/45'}>{h!.enabled ? `${h!.start} a ${h!.end}` : 'Cerrado'}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="mx-auto max-w-[1400px] px-4 pb-10 pt-16 sm:px-8">
      <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
        <Logo className="h-20 text-bordo md:h-28" />
        <nav aria-label="Pie" className="flex flex-wrap gap-x-6 gap-y-2 text-[15px] text-ink/70">
          <a href="#servicios" className="hover:text-bordo">Servicios</a>
          <a href="#disenos" className="hover:text-bordo">Diseños</a>
          <a href="#politicas" className="hover:text-bordo">Políticas</a>
          <Link to="/reservar" className="hover:text-bordo">Reservar</Link>
          <Link to="/mi-turno" className="hover:text-bordo">Mi turno</Link>
          <Link to="/admin" className="hover:text-bordo">Acceso estudio</Link>
        </nav>
      </div>
      <p className="mt-10 border-t border-gris-100 pt-6 text-[13px] text-choco/80">© {new Date().getFullYear()} Stefania Nails Studio</p>
    </footer>
  )
}

/* ---------------- Preguntas frecuentes ---------------- */
export function Faq() {
  const { settings } = useCatalog()
  const [open, setOpen] = useState<number | null>(0)
  const sena = settings ? (settings.depositMode === 'fixed' ? money(settings.depositValue) : `${settings.depositValue}% del total`) : 'una seña'
  const items = [
    { q: '¿Cómo reservo?', a: 'Elegís el servicio, el diseño o color y un horario libre de la agenda. Al final dejás la seña y listo: Stefania te confirma por WhatsApp.' },
    { q: '¿Cuánto es la seña y cómo la pago?', a: `La seña es de ${sena}. Podés pagarla por transferencia o con Mercado Pago y subir el comprobante desde la misma página. Se descuenta del total el día del turno.` },
    { q: '¿Puedo cambiar o cancelar mi turno?', a: `Sí. Entrá a "Mi turno" con tu código y tu WhatsApp. Podés cancelar hasta ${settings?.cancelHours ?? 24} horas antes. Para cambiar el horario escribile a Stefania.` },
    { q: '¿Qué pasa si llego tarde?', a: 'Hay 10 minutos de tolerancia. Después se cobra un excedente, y con 20 minutos de demora el turno se cancela.' },
    { q: '¿Puedo llevar mi propia idea?', a: 'Claro. En la reserva podés subir fotos de inspiración; Stefania las ve antes del turno y lo adapta a tu uña.' },
    { q: '¿Cuánto dura cada servicio?', a: 'Depende del servicio: desde 1 hora un semipermanente hasta 2 horas y media un sistema dual. Lo ves al elegirlo.' },
  ]
  return (
    <section id="preguntas" className="scroll-mt-24 bg-gris-50 py-20 md:py-28">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 sm:px-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]">
        <div>
          <h2 className="text-[clamp(44px,6vw,80px)] leading-[0.95] text-bordo">Preguntas frecuentes</h2>
          <p className="mt-4 max-w-[34ch] text-choco">¿Te queda alguna duda? Escribile a Stefania por WhatsApp.</p>
        </div>
        <ul className="space-y-3">
          {items.map((it, i) => {
            const on = open === i
            return (
              <li key={it.q} className="overflow-hidden rounded-[22px] bg-white ring-1 ring-gris-100">
                <button onClick={() => setOpen(on ? null : i)} aria-expanded={on} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-[17px] font-semibold text-ink">
                  {it.q}
                  <CaretDown size={18} className={`shrink-0 text-bordo transition ${on ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {on && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.35, ease }} className="overflow-hidden">
                      <p className="px-6 pb-5 text-[16px] leading-relaxed text-choco">{it.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
