import { ArrowUpRight, InstagramLogo, Minus, Plus, WhatsappLogo } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { assetUrl } from '../../lib/api'
import { money } from '../../lib/pricing'
import { useCatalog } from '../../lib/store'
import { BTN_GHOST, BTN_PRIMARY, Eyebrow, SectionHead, WRAP, ease, reveal } from './parts'

/* ---------------- El estudio ---------------- */
export function About() {
  return (
    <section id="estudio" className={`${WRAP} scroll-mt-20 py-16 md:py-24`}>
      <div className="border-t border-bone/10 pt-5">
        <Eyebrow>El estudio</Eyebrow>
      </div>
      <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
        <motion.figure {...reveal()} className="lg:col-span-5">
          <img
            src={assetUrl('img/estudio/stefania-fondo.webp')}
            alt="Retrato de Stefania con los brazos cruzados y uñas bordó"
            className="aspect-[4/5] w-full rounded-[10px] object-cover"
            loading="lazy"
          />
        </motion.figure>
        <motion.div {...reveal(1)} className="flex flex-col lg:col-span-6 lg:col-start-7">
          <h2 className="text-[clamp(38px,4.6vw,66px)] leading-[1.02] tracking-[-0.02em] text-bone">Conocé a Stefania</h2>
          <p className="mt-8 font-serif text-[clamp(24px,2.3vw,32px)] leading-[1.25] text-bone/90">
            Cada turno es uno a uno, en su estudio. Trabaja semipermanente, soft gel y polygel, y dibuja cada diseño a mano, desde una francesita fina hasta un animal print.
          </p>
          <p className="mt-6 max-w-[52ch] text-[16px] leading-relaxed text-bone/60">
            Traé tu idea o elegila de su galería: la charlan al empezar y se adapta a la forma de tu uña.
          </p>
          <dl className="mt-10 grid grid-cols-2 border-t border-bone/10 lg:mt-auto">
            {[
              ['Servicios', 'Semipermanente, soft gel, polygel y sistema dual'],
              ['Diseños', 'A mano, según tu idea o de la galería'],
              ['Turnos', 'Online, uno a uno'],
              ['Confirmación', 'Por WhatsApp'],
            ].map(([k, v], i) => (
              <div key={k} className={`border-b border-bone/10 py-5 ${i % 2 === 0 ? 'pr-6' : 'border-l pl-6'}`}>
                <dt className="text-[12px] font-semibold uppercase tracking-[0.18em] text-bone/45">{k}</dt>
                <dd className="mt-2 text-[15px] leading-snug text-bone/85">{v}</dd>
              </div>
            ))}
          </dl>
        </motion.div>
      </div>
    </section>
  )
}

/* ---------------- Reservas y políticas ---------------- */
export function Policies() {
  const { settings } = useCatalog()
  const all = settings?.policies ?? []
  const hi = Math.max(0, all.findIndex((p) => /seña/i.test(p)))
  const items = all.length ? [all[hi], ...all.filter((_, i) => i !== hi)] : []
  const sena = settings ? (settings.depositMode === 'fixed' ? money(settings.depositValue) : `${settings.depositValue}% del total`) : 'la seña'
  const steps = [
    'Elegí el servicio, tu diseño y un horario libre.',
    `Dejá la seña de ${sena} por transferencia o Mercado Pago.`,
    'Stefania revisa el pago y te confirma el turno por WhatsApp.',
  ]
  return (
    <section id="politicas" className={`${WRAP} scroll-mt-20 py-16 md:py-24`}>
      <SectionHead label="Reservas" title="Antes de tu turno" text="Al reservar aceptás estas condiciones. Están para cuidar tu tiempo y el de las demás clientas." />
      <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-12">
        <motion.div {...reveal()} className="lg:col-span-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-bone/45">Cómo se reserva</p>
          <ol className="mt-3 border-t border-bone/10">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-5 border-b border-bone/10 py-5">
                <span className="font-serif text-[28px] leading-none text-bone/35">{i + 1}</span>
                <span className="text-[16px] leading-snug text-bone/85">{s}</span>
              </li>
            ))}
          </ol>
        </motion.div>
        {items.length > 0 && (
          <motion.div {...reveal(1)} className="lg:col-span-7 lg:col-start-6">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-bone/45">Políticas del estudio</p>
            <ul className="mt-3 border-t border-bone/10">
              {items.map((p, i) => (
                <li key={i} className={`border-b border-bone/10 py-5 text-[16px] leading-relaxed ${i === 0 ? 'font-semibold text-bone' : 'text-bone/75'}`}>
                  {i === 0 ? <span className="border-l-2 border-accent pl-4">{p}</span> : p}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>
    </section>
  )
}

/* ---------------- Preguntas frecuentes ---------------- */
export function Faq() {
  const { settings } = useCatalog()
  const [open, setOpen] = useState<number | null>(0)
  const sena = settings ? (settings.depositMode === 'fixed' ? money(settings.depositValue) : `${settings.depositValue}% del total`) : 'una seña'
  const wa = settings?.whatsapp
  const items = [
    { q: '¿Cómo reservo?', a: 'Elegís el servicio, el diseño y un horario libre de la agenda. Al final dejás la seña y Stefania te confirma por WhatsApp.' },
    { q: '¿Cuánto es la seña y cómo la pago?', a: `La seña es de ${sena}. Podés pagarla por transferencia o con Mercado Pago y subir el comprobante desde la misma página. Se descuenta del total el día del turno.` },
    { q: '¿Puedo cambiar o cancelar mi turno?', a: `Sí. Entrá a "Mi turno" con tu código y tu WhatsApp. Podés cancelar hasta ${settings?.cancelHours ?? 24} horas antes. Para cambiar el horario escribile a Stefania.` },
    { q: '¿Qué pasa si llego tarde?', a: 'Hay 10 minutos de tolerancia. Después se cobra un excedente, y con 20 minutos de demora el turno se cancela.' },
    { q: '¿Puedo llevar mi propia idea?', a: 'Claro. En la reserva podés subir fotos de inspiración; Stefania las ve antes del turno y lo adapta a tu uña.' },
    { q: '¿Cuánto dura cada servicio?', a: 'Depende del servicio: desde 1 hora un semipermanente hasta 2 horas y media un sistema dual. Lo ves al elegirlo.' },
  ]
  return (
    <section id="preguntas" className={`${WRAP} scroll-mt-20 py-16 md:py-24`}>
      <div className="border-t border-bone/10 pt-5">
        <Eyebrow>Preguntas</Eyebrow>
      </div>
      <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-4">
          <h2 className="text-[clamp(38px,4.6vw,66px)] leading-[1.02] tracking-[-0.02em] text-bone">Preguntas frecuentes</h2>
          <p className="mt-5 max-w-[34ch] text-[16px] leading-relaxed text-bone/60">¿Te queda alguna duda? Escribile a Stefania por WhatsApp.</p>
          {wa && (
            <a
              href={`https://wa.me/${wa}?text=${encodeURIComponent('Hola Stefania, tengo una consulta.')}`}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-[15px] font-semibold text-bone underline decoration-bone/30 underline-offset-[6px] transition hover:decoration-bone"
            >
              <WhatsappLogo size={18} /> Escribir por WhatsApp
            </a>
          )}
        </div>
        <ul className="border-t border-bone/10 lg:col-span-7 lg:col-start-6">
          {items.map((it, i) => {
            const on = open === i
            return (
              <li key={it.q} className="border-b border-bone/10">
                <button
                  onClick={() => setOpen(on ? null : i)}
                  aria-expanded={on}
                  className="flex w-full items-center justify-between gap-6 py-6 text-left text-[18px] font-medium text-bone transition hover:text-bone/80"
                >
                  {it.q}
                  {on ? <Minus size={18} className="shrink-0" /> : <Plus size={18} className="shrink-0 text-bone/60" />}
                </button>
                <AnimatePresence initial={false}>
                  {on && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.3, ease }} className="overflow-hidden">
                      <p className="max-w-[62ch] pb-6 text-[16px] leading-relaxed text-bone/60">{it.a}</p>
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

/* ---------------- Contacto ---------------- */
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export function Contact() {
  const { settings, hours } = useCatalog()
  const wa = settings?.whatsapp
  const ig = settings?.instagram
  const week = [1, 2, 3, 4, 5, 6, 0].map((d) => hours.find((h) => h.weekday === d)).filter((h) => !!h)
  return (
    <section id="contacto" className={`${WRAP} scroll-mt-20 py-16 md:py-24`}>
      <SectionHead label="Contacto" title="Te esperamos en el estudio" />
      <div className="mt-12 grid gap-10 lg:mt-16 lg:grid-cols-12 lg:gap-12">
        <motion.figure {...reveal()} className="lg:col-span-6">
          <img
            src={assetUrl('img/estudio/estudio.webp')}
            alt="El estudio: mesa de manicura, lámpara y el cartel de Stefania Nail Studio en la pared"
            className="aspect-[4/3] w-full rounded-[10px] object-cover object-top"
            loading="lazy"
          />
        </motion.figure>
        <motion.div {...reveal(1)} className="grid content-start gap-10 lg:col-span-5 lg:col-start-8">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-bone/45">Dirección</p>
            {settings?.address ? (
              <>
                <p className="mt-3 text-[20px] leading-snug text-bone">{settings.address}</p>
                {settings.mapsUrl && (
                  <a href={settings.mapsUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-[15px] font-semibold text-bone underline decoration-bone/30 underline-offset-[6px] hover:decoration-bone">
                    Cómo llegar <ArrowUpRight size={15} />
                  </a>
                )}
              </>
            ) : (
              <p className="mt-3 text-[17px] leading-snug text-bone/75">Te pasamos la dirección exacta por WhatsApp cuando se confirma el turno.</p>
            )}
          </div>
          {week.length > 0 && (
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-bone/45">Horarios</p>
              <dl className="mt-3 border-t border-bone/10">
                {week.map((h) => (
                  <div key={h!.weekday} className="flex justify-between gap-6 border-b border-bone/10 py-3 text-[15px]">
                    <dt className="text-bone/70">{DAYS[h!.weekday]}</dt>
                    <dd className={`tabular-nums ${h!.enabled ? 'text-bone' : 'text-bone/40'}`}>{h!.enabled ? `${h!.start} a ${h!.end}` : 'Cerrado'}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            {wa && (
              <a href={`https://wa.me/${wa}?text=${encodeURIComponent('Hola Stefania, quería consultar por un turno.')}`} target="_blank" rel="noreferrer" className={BTN_PRIMARY}>
                <WhatsappLogo size={18} /> WhatsApp
              </a>
            )}
            {ig && (
              <a href={`https://instagram.com/${ig}`} target="_blank" rel="noreferrer" className={BTN_GHOST}>
                <InstagramLogo size={18} /> @{ig}
              </a>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ---------------- Pie ---------------- */
export function Footer() {
  return (
    <footer className={`${WRAP} pb-10 pt-8`}>
      <div className="flex flex-col gap-8 border-t border-bone/10 pt-10 md:flex-row md:items-end md:justify-between">
        <Logo className="h-14 text-bone md:h-16" />
        <nav aria-label="Pie" className="flex flex-wrap gap-x-7 gap-y-2 text-[14px] text-bone/55">
          <a href="#servicios" className="hover:text-bone">Servicios</a>
          <a href="#disenos" className="hover:text-bone">Diseños</a>
          <a href="#politicas" className="hover:text-bone">Políticas</a>
          <Link to="/reservar" className="hover:text-bone">Reservar</Link>
          <Link to="/mi-turno" className="hover:text-bone">Mi turno</Link>
          <Link to="/admin" className="hover:text-bone">Acceso estudio</Link>
        </nav>
      </div>
      <p className="mt-10 text-[13px] text-bone/35">© {new Date().getFullYear()} Stefania Nails Studio</p>
    </footer>
  )
}
