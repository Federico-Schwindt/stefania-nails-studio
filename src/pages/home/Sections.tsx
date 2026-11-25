import { CalendarCheck, ChatCircleText, HandHeart, InstagramLogo, PaintBrush, Plus, WhatsappLogo } from '@phosphor-icons/react'
import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { assetUrl } from '../../lib/api'
import { money } from '../../lib/pricing'
import { useCatalog } from '../../lib/store'
import { BTN_BONE, BTN_GLASS, Bubble, Eyebrow, WRAP, ease, reveal, scrollToId, summarizeHours } from './parts'

/* ---------------- Conocé a Stefania ---------------- */
export function About() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const imgY = useTransform(scrollYProgress, [0, 1], ['-8%', '8%'])
  const pillars = [
    { icon: HandHeart, title: 'Uno a uno', text: 'Cada turno es sólo tuyo, en su estudio.' },
    { icon: PaintBrush, title: 'Diseño a mano', text: 'De una francesita fina a un animal print.' },
    { icon: CalendarCheck, title: 'Turnos online', text: 'Reservás y te confirma por WhatsApp.' },
  ]
  return (
    <section id="estudio" ref={ref} className="scroll-mt-24 py-24 md:py-36">
      <div className={`${WRAP} grid items-center gap-14 lg:grid-cols-12 lg:gap-16`}>
        <motion.div {...reveal()} className="lg:col-span-5">
          <div className="rounded-[2.5rem] border border-bone/10 bg-bone/[0.03] p-2">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[calc(2.5rem-0.5rem)]">
              <motion.img
                style={{ y: imgY }}
                src={assetUrl('img/estudio/stefania-fondo.webp')}
                alt="Retrato de Stefania con los brazos cruzados y uñas bordó"
                className="absolute inset-0 h-[116%] w-full -translate-y-[8%] object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </motion.div>
        <div className="lg:col-span-6 lg:col-start-7">
          <motion.div {...reveal()}>
            <Eyebrow>El estudio</Eyebrow>
          </motion.div>
          <motion.h2 {...reveal(1)} className="mt-6 text-[clamp(52px,7vw,118px)] leading-[0.9] tracking-[-0.025em] text-bone">
            Conocé a Stefania
          </motion.h2>
          <motion.p {...reveal(2)} className="mt-8 max-w-[30ch] font-serif text-[clamp(24px,2.4vw,34px)] leading-[1.2] text-bone/85">
            Trabaja semipermanente, soft gel y polygel, y dibuja cada diseño a mano.
          </motion.p>
          <motion.p {...reveal(3)} className="mt-5 max-w-[48ch] text-[16px] leading-relaxed text-bone/55">
            Traé tu idea o elegila de su galería: la charlan al empezar y se adapta a la forma de tu uña.
          </motion.p>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {pillars.map((p, i) => (
              <motion.div key={p.title} {...reveal(4 + i)} className="rounded-[1.5rem] border border-bone/10 bg-bone/[0.03] p-5">
                <p.icon size={26} weight="light" className="text-bone/80" />
                <p className="mt-6 text-[15px] font-semibold text-bone">{p.title}</p>
                <p className="mt-1 text-[13px] leading-snug text-bone/50">{p.text}</p>
              </motion.div>
            ))}
          </div>
          <motion.div {...reveal(7)} className="mt-10">
            <Logo className="h-12 text-bone/80" />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- Cómo se reserva + políticas ---------------- */
export function Policies() {
  const { settings } = useCatalog()
  const all = settings?.policies ?? []
  const hi = Math.max(0, all.findIndex((p) => /seña/i.test(p)))
  const items = all.length ? [all[hi], ...all.filter((_, i) => i !== hi)] : []
  const sena = settings ? (settings.depositMode === 'fixed' ? money(settings.depositValue) : `${settings.depositValue}% del total`) : 'la seña'
  const steps = [
    { t: 'Elegí', d: 'Servicio, diseño y un horario libre de la agenda.' },
    { t: 'Señá', d: `Dejá ${sena} por transferencia o Mercado Pago. Se descuenta del total.` },
    { t: 'Listo', d: 'Stefania revisa el pago y te confirma el turno por WhatsApp.' },
  ]
  return (
    <section id="politicas" className="scroll-mt-24 py-24 md:py-32">
      <div className={WRAP}>
        <motion.div {...reveal()}>
          <Eyebrow>Cómo se reserva</Eyebrow>
          <h2 className="mt-6 text-[clamp(52px,7vw,118px)] leading-[0.9] tracking-[-0.025em] text-bone">Tres pasos</h2>
        </motion.div>
        <div className="mt-14 grid gap-4 md:grid-cols-3 md:gap-5">
          {steps.map((s, i) => (
            <motion.div key={s.t} {...reveal(i)} className={`rounded-[2rem] border border-bone/10 bg-bone/[0.03] p-1.5 ${i === 1 ? 'md:translate-y-10' : ''}`}>
              <div className={`relative h-full overflow-hidden rounded-[calc(2rem-0.375rem)] p-7 shadow-[inset_0_1px_1px_rgb(255_255_255/0.06)] md:p-8 ${i === 1 ? 'bg-accent' : 'bg-[#121011]'}`}>
                <span aria-hidden className="pointer-events-none absolute -right-2 -top-6 select-none font-serif text-[150px] leading-none text-transparent [-webkit-text-stroke:1px_rgb(239_233_223/0.22)]">
                  {i + 1}
                </span>
                <p className="relative mt-16 font-serif text-[44px] leading-none text-bone">{s.t}</p>
                <p className={`relative mt-3 max-w-[30ch] text-[15px] leading-relaxed ${i === 1 ? 'text-bone/80' : 'text-bone/55'}`}>{s.d}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {items.length > 0 && (
          <motion.div {...reveal()} className="mt-20 rounded-[2rem] border border-bone/10 bg-bone/[0.03] p-1.5 md:mt-28">
            <div className="rounded-[calc(2rem-0.375rem)] bg-[#100e0f] p-6 shadow-[inset_0_1px_1px_rgb(255_255_255/0.06)] sm:p-10">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
                <p className="font-serif text-[clamp(32px,3.4vw,48px)] leading-none text-bone">Antes de tu turno</p>
                <p className="max-w-[44ch] text-[14px] text-bone/50">Al reservar aceptás estas condiciones. Cuidan tu tiempo y el de las demás clientas.</p>
              </div>
              <ul className="mt-8 grid gap-x-10 md:grid-cols-2">
                {items.map((p, i) => (
                  <li key={i} className="flex gap-4 border-t border-bone/10 py-4 text-[15px] leading-relaxed">
                    <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${i === 0 ? 'bg-[#b8475e]' : 'bg-bone/30'}`} aria-hidden />
                    <span className={i === 0 ? 'font-semibold text-bone' : 'text-bone/70'}>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
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
    <section id="preguntas" className="scroll-mt-24 py-24 md:py-32">
      <div className={`${WRAP} grid gap-12 lg:grid-cols-12 lg:gap-16`}>
        <motion.div {...reveal()} className="lg:col-span-5">
          <Eyebrow>Preguntas</Eyebrow>
          <h2 className="mt-6 text-[clamp(52px,6vw,100px)] leading-[0.9] tracking-[-0.025em] text-bone">Lo que más nos preguntan</h2>
          {wa && (
            <a href={`https://wa.me/${wa}?text=${encodeURIComponent('Hola Stefania, tengo una consulta.')}`} target="_blank" rel="noreferrer" className={`${BTN_GLASS} mt-10 pr-2`}>
              <ChatCircleText size={18} weight="light" /> Otra consulta <Bubble dark={false} />
            </a>
          )}
        </motion.div>
        <ul className="space-y-3 lg:col-span-7">
          {items.map((it, i) => {
            const on = open === i
            return (
              <motion.li
                key={it.q}
                {...reveal(i)}
                className={`rounded-[1.5rem] border transition-colors duration-500 ${on ? 'border-bone/20 bg-bone/[0.06]' : 'border-bone/10 bg-bone/[0.02] hover:border-bone/20'}`}
              >
                <button onClick={() => setOpen(on ? null : i)} aria-expanded={on} className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left text-[17px] font-medium text-bone md:px-7 md:py-6">
                  {it.q}
                  <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-bone/15 transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${on ? 'rotate-45 bg-bone text-coal' : 'text-bone'}`}>
                    <Plus size={15} />
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {on && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.45, ease }} className="overflow-hidden">
                      <p className="max-w-[60ch] px-6 pb-6 text-[15px] leading-relaxed text-bone/60 md:px-7">{it.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

/* ---------------- Cierre: reservá + contacto ---------------- */
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export function Contact() {
  const { settings, hours } = useCatalog()
  const wa = settings?.whatsapp
  const ig = settings?.instagram
  const week = [1, 2, 3, 4, 5, 6, 0].map((d) => hours.find((h) => h.weekday === d)).filter((h) => !!h)
  return (
    <section id="contacto" className="relative isolate scroll-mt-24 overflow-hidden pb-16 pt-28 md:pb-20 md:pt-40">
      <img src={assetUrl('img/estudio/estudio.webp')} alt="" aria-hidden className="absolute inset-0 -z-20 h-full w-full object-cover opacity-30" loading="lazy" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-coal via-coal/75 to-coal" />
      <div aria-hidden className="absolute left-1/2 top-1/3 -z-10 aspect-square w-[min(110vw,1000px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgb(87_3_20/0.6),transparent_65%)]" />

      <div className={WRAP}>
        <motion.div {...reveal()} className="flex flex-col items-center text-center">
          <Eyebrow>Te esperamos</Eyebrow>
          <h2 className="mt-7 text-[clamp(60px,10vw,170px)] leading-[0.85] tracking-[-0.03em] text-bone">
            Tu próximo
            <br />
            turno
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to="/reservar" className={BTN_BONE}>
              Reservar turno <Bubble />
            </Link>
            {wa && (
              <a href={`https://wa.me/${wa}?text=${encodeURIComponent('Hola Stefania, quería consultar por un turno.')}`} target="_blank" rel="noreferrer" className={BTN_GLASS}>
                <WhatsappLogo size={18} weight="light" /> WhatsApp
              </a>
            )}
          </div>
        </motion.div>

        <div className="mt-20 grid gap-4 md:mt-28 md:grid-cols-3">
          <motion.div {...reveal(0)} className="rounded-[2rem] border border-bone/10 bg-bone/[0.03] p-1.5 md:col-span-2">
            <div className="h-full rounded-[calc(2rem-0.375rem)] bg-coal/70 p-6 shadow-[inset_0_1px_1px_rgb(255_255_255/0.06)] sm:p-8">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-bone/50">Horarios · {summarizeHours(hours) || 'a confirmar'}</p>
              <dl className="mt-5 grid gap-x-10 sm:grid-cols-2">
                {week.map((h) => (
                  <div key={h!.weekday} className="flex justify-between gap-4 border-t border-bone/10 py-3 text-[15px]">
                    <dt className="text-bone/65">{DAYS[h!.weekday]}</dt>
                    <dd className={`tabular-nums ${h!.enabled ? 'text-bone' : 'text-bone/35'}`}>{h!.enabled ? `${h!.start} a ${h!.end}` : 'Cerrado'}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </motion.div>
          <motion.div {...reveal(1)} className="rounded-[2rem] border border-bone/10 bg-bone/[0.03] p-1.5">
            <div className="flex h-full flex-col rounded-[calc(2rem-0.375rem)] bg-coal/70 p-6 shadow-[inset_0_1px_1px_rgb(255_255_255/0.06)] sm:p-8">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-bone/50">Dónde</p>
              {settings?.address ? (
                <>
                  <p className="mt-4 font-serif text-[28px] leading-[1.1] text-bone">{settings.address}</p>
                  {settings.mapsUrl && (
                    <a href={settings.mapsUrl} target="_blank" rel="noreferrer" className="mt-3 text-[14px] font-semibold text-bone underline decoration-bone/30 underline-offset-4 hover:decoration-bone">
                      Cómo llegar
                    </a>
                  )}
                </>
              ) : (
                <p className="mt-4 text-[16px] leading-relaxed text-bone/70">Te pasamos la dirección exacta por WhatsApp cuando se confirma tu turno.</p>
              )}
              {ig && (
                <a href={`https://instagram.com/${ig}`} target="_blank" rel="noreferrer" className="mt-auto inline-flex items-center gap-2 pt-8 text-[15px] font-semibold text-bone transition hover:text-bone/70">
                  <InstagramLogo size={20} weight="light" /> @{ig}
                </a>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- Pie con la firma gigante ---------------- */
export function Footer() {
  return (
    <footer className="relative overflow-hidden pt-10">
      <div className={`${WRAP} flex flex-col gap-6 border-t border-bone/10 pt-8 md:flex-row md:items-center md:justify-between`}>
        <nav aria-label="Pie" className="flex flex-wrap gap-x-7 gap-y-2 text-[14px] text-bone/55">
          <a href="#servicios" onClick={(e) => scrollToId(e, '#servicios')} className="transition hover:text-bone">Servicios</a>
          <a href="#disenos" onClick={(e) => scrollToId(e, '#disenos')} className="transition hover:text-bone">Diseños</a>
          <a href="#politicas" onClick={(e) => scrollToId(e, '#politicas')} className="transition hover:text-bone">Políticas</a>
          <Link to="/reservar" className="transition hover:text-bone">Reservar</Link>
          <Link to="/mi-turno" className="transition hover:text-bone">Mi turno</Link>
          <Link to="/admin" className="transition hover:text-bone">Acceso estudio</Link>
        </nav>
        <p className="text-[13px] text-bone/35">© {new Date().getFullYear()} Stefania Nails Studio</p>
      </div>
      <p aria-hidden className="mt-6 select-none text-center font-serif uppercase leading-[0.72] tracking-[-0.03em] text-bone/[0.07] text-[clamp(84px,22vw,350px)]">
        Stefania
      </p>
    </footer>
  )
}
