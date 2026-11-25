import { ArrowUpRight } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { Skeleton } from '../../components/ui'
import { assetUrl } from '../../lib/api'
import { money } from '../../lib/pricing'
import { useCatalog } from '../../lib/store'
import { SectionHead, WRAP, formatDuration, reveal } from './parts'

/** Lista de precios tipo carta: nombre, descripción, duración y precio. */
export function Services() {
  const { services, extras, loaded } = useCatalog()

  return (
    <section id="servicios" className={`${WRAP} scroll-mt-20 py-16 md:py-24`}>
      <SectionHead label="Servicios" title="Servicios y precios" text="Precios por sesión en el estudio. La seña se paga al reservar y se descuenta del total." />

      <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {!loaded ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-[92px] rounded-[8px]" />
              ))}
            </div>
          ) : (
            <ul className="border-t border-bone/10">
              {services.map((s, i) => (
                <motion.li key={s.id} {...reveal(i)} className="border-b border-bone/10">
                  <Link to={`/reservar?servicio=${s.id}`} className="group grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 py-6 sm:py-7">
                    <h3 className="text-[clamp(26px,2.5vw,36px)] leading-[1.05] text-bone decoration-bone/40 underline-offset-[6px] group-hover:underline">{s.name}</h3>
                    <p className="text-right font-serif text-[clamp(26px,2.5vw,36px)] leading-[1.05] text-bone">
                      {s.priceFrom && <span className="mr-2 align-middle font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-bone/45">desde</span>}
                      {money(s.price)}
                    </p>
                    {s.description ? <p className="max-w-[50ch] text-[15px] leading-relaxed text-bone/55">{s.description}</p> : <span />}
                    <p className="whitespace-nowrap pt-0.5 text-right text-[14px] text-bone/45">{formatDuration(s.durationMin)}</p>
                  </Link>
                </motion.li>
              ))}
            </ul>
          )}

          {extras.length > 0 && (
            <div className="mt-10">
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-bone/45">Extras</p>
              <ul className="mt-3 border-t border-bone/10">
                {extras.map((x) => (
                  <li key={x.id} className="flex items-baseline justify-between gap-6 border-b border-bone/10 py-3.5 text-[15px]">
                    <span className="text-bone/75">{x.name}</span>
                    <span className="whitespace-nowrap font-semibold text-bone">
                      {money(x.price)}
                      {x.mode === 'unit' ? ' c/u' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link to="/reservar" className="group mt-10 inline-flex items-center gap-2 text-[15px] font-semibold text-bone underline decoration-bone/30 underline-offset-[6px] transition hover:decoration-bone">
            Reservar un turno <ArrowUpRight size={16} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <motion.figure {...reveal(1)} className="hidden lg:col-span-4 lg:col-start-9 lg:block">
          <div className="sticky top-28">
            <img
              src={assetUrl('img/trabajos/baby-boomer-strass.webp')}
              alt="Uñas almendra largas con degradé lechoso y strass, hechas en el estudio"
              className="aspect-[4/5] w-full rounded-[10px] object-cover"
              loading="lazy"
            />
            <figcaption className="mt-3 text-[13px] text-bone/45">Soft gel con degradé lechoso y strass.</figcaption>
          </div>
        </motion.figure>
      </div>
    </section>
  )
}
