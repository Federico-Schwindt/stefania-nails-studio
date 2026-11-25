import { ArrowUpRight, Clock, Sparkle } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { Skeleton } from '../../components/ui'
import { assetUrl } from '../../lib/api'
import { money } from '../../lib/pricing'
import { useCatalog } from '../../lib/store'
import type { Service } from '../../lib/types'

const ease = [0.16, 1, 0.3, 1] as const

function Price({ s, className = '' }: { s: Service; className?: string }) {
  return (
    <p className={`font-serif leading-none ${className}`}>
      {s.priceFrom && <span className="mr-2 align-middle font-sans text-[0.32em] font-semibold uppercase tracking-[0.14em] opacity-70">desde</span>}
      {money(s.price)}
    </p>
  )
}

function Duration({ min }: { min: number }) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium">
      <Clock size={15} /> {h ? `${h} h` : ''} {m ? `${m} min` : ''}
    </span>
  )
}

const BookLink = ({ id, tone = 'dark' }: { id: string; tone?: 'dark' | 'light' | 'bone' }) => (
  <Link
    to={`/reservar?servicio=${id}`}
    aria-label="Reservar este servicio"
    className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition group-hover:rotate-45 ${
      tone === 'dark' ? 'bg-ink text-white' : tone === 'bone' ? 'bg-bone text-coal' : 'bg-white text-ink'
    }`}
  >
    <ArrowUpRight size={18} weight="bold" />
  </Link>
)

export function Services() {
  const { services, extras, loaded } = useCatalog()
  const [a, b, c, d, e, ...rest] = services

  const cell = (i: number) => ({
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.25 },
    transition: { duration: 0.8, delay: i * 0.07, ease },
  })

  return (
    <section id="servicios" className="mx-auto max-w-[1440px] scroll-mt-24 px-4 py-20 sm:px-8 md:py-28">
      <div className="mb-10 max-w-3xl md:mb-14">
        <h2 className="text-[clamp(44px,6vw,80px)] leading-[0.95] text-ink">Servicios y precios</h2>
        <p className="mt-4 max-w-[52ch] text-choco">Precios por sesión en el estudio. La seña se paga online al reservar y se descuenta del total.</p>
      </div>

      {!loaded ? (
        <div className="grid gap-4 md:grid-cols-12">
          <Skeleton className="h-[420px] md:col-span-5 md:row-span-2" />
          <Skeleton className="h-[200px] md:col-span-4" />
          <Skeleton className="h-[200px] md:col-span-3" />
          <Skeleton className="h-[200px] md:col-span-3" />
          <Skeleton className="h-[200px] md:col-span-4" />
        </div>
      ) : (
        <div className="grid auto-rows-[minmax(210px,auto)] gap-4 md:grid-cols-12">
          {d && (
            <motion.article {...cell(0)} className="group relative overflow-hidden rounded-[28px] bg-coal text-bone ring-1 ring-bone/10 md:col-span-5 md:row-span-2">
              <img src={assetUrl('img/trabajos/baby-boomer-strass.webp')} alt="Uñas largas almendra con degradé lechoso y strass, hechas en el estudio" className="absolute inset-0 h-full w-full object-cover opacity-80 transition duration-[1.2s] group-hover:scale-105" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-coal via-[rgb(87_3_20/0.35)] to-transparent" />
              <div className="relative flex h-full min-h-[420px] flex-col justify-end p-7">
                <span className="mb-auto inline-flex w-fit items-center gap-1.5 rounded-full bg-accent/80 px-3 py-1.5 text-[12px] font-semibold text-bone ring-1 ring-bone/20 backdrop-blur">
                  <Sparkle size={13} weight="fill" /> El más pedido
                </span>
                <h3 className="text-[44px] leading-none">{d.name}</h3>
                <p className="mt-2 max-w-[36ch] text-bone/80">{d.description}</p>
                <div className="mt-6 flex items-end justify-between gap-4">
                  <div>
                    <Price s={d} className="text-[48px]" />
                    <div className="mt-2 text-bone/75">
                      <Duration min={d.durationMin} />
                    </div>
                  </div>
                  <BookLink id={d.id} tone="bone" />
                </div>
              </div>
            </motion.article>
          )}
          {a && (
            <motion.article {...cell(1)} className="glass-light group flex flex-col justify-between rounded-[28px] p-7 md:col-span-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[34px] leading-none text-ink">{a.name}</h3>
                  <p className="mt-2 max-w-[32ch] text-[15px] text-choco">{a.description}</p>
                </div>
                <BookLink id={a.id} />
              </div>
              <div className="mt-6 flex items-end justify-between">
                <Price s={a} className="text-[52px] text-ink" />
                <span className="text-choco">
                  <Duration min={a.durationMin} />
                </span>
              </div>
            </motion.article>
          )}
          {b && (
            <motion.article {...cell(2)} className="glass-light group flex flex-col justify-between rounded-[28px] p-7 md:col-span-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[30px] leading-[1.02] text-ink">{b.name}</h3>
                <BookLink id={b.id} />
              </div>
              <div className="mt-6">
                <Price s={b} className="text-[44px] text-ink" />
                <span className="mt-2 block text-choco">
                  <Duration min={b.durationMin} />
                </span>
              </div>
            </motion.article>
          )}
          {c && (
            <motion.article {...cell(3)} className="group relative overflow-hidden rounded-[28px] md:col-span-3">
              <img src={assetUrl('img/trabajos/florcitas-sm.webp')} alt="Capping con francesita fina, flores y puntitos" className="absolute inset-0 h-full w-full object-cover transition duration-[1.2s] group-hover:scale-105" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-coal/85 via-coal/20 to-transparent" />
              <div className="relative flex h-full flex-col justify-between p-7 text-bone">
                <div className="flex justify-end">
                  <BookLink id={c.id} tone="bone" />
                </div>
                <div>
                  <h3 className="text-[30px] leading-none">{c.name}</h3>
                  <div className="mt-3 flex items-end justify-between">
                    <Price s={c} className="text-[40px]" />
                    <Duration min={c.durationMin} />
                  </div>
                </div>
              </div>
            </motion.article>
          )}
          {e && (
            <motion.article {...cell(4)} className="group flex flex-col justify-between rounded-[28px] bg-ink p-7 text-white md:col-span-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[34px] leading-none">{e.name}</h3>
                  <p className="mt-2 max-w-[34ch] text-[15px] text-white/75">{e.description}</p>
                </div>
                <BookLink id={e.id} tone="light" />
              </div>
              <div className="mt-6 flex items-end justify-between">
                <Price s={e} className="text-[52px]" />
                <span className="text-white/75">
                  <Duration min={e.durationMin} />
                </span>
              </div>
            </motion.article>
          )}
          {rest.map((s, i) => (
            <motion.article key={s.id} {...cell(5 + i)} className="glass-light group flex flex-col justify-between rounded-[28px] p-7 md:col-span-4">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-[30px] leading-none">{s.name}</h3>
                <BookLink id={s.id} />
              </div>
              <Price s={s} className="mt-6 text-[44px] text-ink" />
            </motion.article>
          ))}
        </div>
      )}

      {extras.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="mr-1 text-[14px] font-semibold text-ink">Extras</span>
          {extras.map((x) => (
            <span key={x.id} className="inline-flex items-center gap-2 rounded-full bg-bone/[0.04] px-4 py-2 text-[14px] text-ink/85 ring-1 ring-bone/10 backdrop-blur">
              {x.name}
              <span className="font-semibold text-ink">
                {money(x.price)}
                {x.mode === 'unit' ? ' c/u' : ''}
              </span>
            </span>
          ))}
        </div>
      )}
    </section>
  )
}
