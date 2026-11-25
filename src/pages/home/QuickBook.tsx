import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Skeleton } from '../../components/ui'
import { assetUrl } from '../../lib/api'
import { dayLabel, useNextSlots, useSchedule } from '../../lib/availability'
import { money } from '../../lib/pricing'
import { useCatalog } from '../../lib/store'
import { BTN_GLASS, Bubble, Eyebrow, WRAP, formatDuration, reveal } from './parts'

/** Reserva rápida: servicio → próximos horarios libres → sigue en el flujo de reserva con todo precargado. */
export function QuickBook() {
  const navigate = useNavigate()
  const { services, settings, hours, loaded } = useCatalog()
  const { busy, blocked, loading } = useSchedule(30)
  const [serviceId, setServiceId] = useState<string>()
  useEffect(() => {
    if (!serviceId && services.length) setServiceId(services[0].id)
  }, [services, serviceId])
  const service = services.find((s) => s.id === serviceId)
  const slots = useNextSlots({ service, settings, hours, busy, blocked, limit: 12 })
  const ready = loaded && !loading

  const grouped = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const s of slots) m.set(s.date, [...(m.get(s.date) ?? []), s.time])
    return [...m.entries()].slice(0, 4)
  }, [slots])

  return (
    <section id="reservar" aria-labelledby="qb-title" className="scroll-mt-24 py-24 md:py-32">
      <div className={WRAP}>
        <motion.div {...reveal()} className="relative overflow-hidden rounded-[2.5rem] border border-bone/10 p-2">
          {/* fondo: el estudio desenfocado, para que el vidrio tenga algo real detrás */}
          <img src={assetUrl('img/estudio/estudio.webp')} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl" loading="lazy" />
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(70%_80%_at_0%_100%,rgb(87_3_20/0.7),transparent_70%)]" />
          <div aria-hidden className="absolute inset-0 bg-coal/45" />

          <div className="relative grid gap-10 rounded-[calc(2.5rem-0.5rem)] border border-bone/10 bg-coal/55 p-6 shadow-[inset_0_1px_1px_rgb(255_255_255/0.08)] sm:p-10 lg:grid-cols-12 lg:gap-14 lg:p-14">
            <div className="flex flex-col lg:col-span-4">
              <Eyebrow>Reserva online</Eyebrow>
              <h2 id="qb-title" className="mt-6 text-[clamp(44px,5vw,76px)] leading-[0.95] tracking-[-0.02em] text-bone">
                Reservá en un minuto
              </h2>
              <p className="mt-5 max-w-[34ch] text-[16px] leading-relaxed text-bone/60">
                Elegí el servicio y tocá un horario libre. Después sumás tu diseño y tus datos.
              </p>
              {settings && (
                <p className="mt-6 text-[14px] text-bone/45">
                  Para confirmar dejás una seña de {settings.depositMode === 'fixed' ? money(settings.depositValue) : `${settings.depositValue}%`}. El resto lo pagás en el estudio.
                </p>
              )}
              <Link to={`/reservar${serviceId ? `?servicio=${serviceId}` : ''}`} className={`${BTN_GLASS} mt-8 w-fit pr-2 lg:mt-auto`}>
                Ver todos los horarios <Bubble dark={false} />
              </Link>
            </div>

            <div className="lg:col-span-8">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-bone/50">1 · Servicio</p>
              {!loaded ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Skeleton key={i} className="h-12 w-40 rounded-full" />
                  ))}
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Servicio">
                  {services.map((s) => {
                    const on = s.id === serviceId
                    return (
                      <button
                        key={s.id}
                        role="radio"
                        aria-checked={on}
                        onClick={() => setServiceId(s.id)}
                        className={`rounded-full border px-5 py-3 text-left transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97] ${
                          on ? 'border-bone bg-bone text-coal' : 'border-bone/15 bg-bone/[0.04] text-bone hover:border-bone/35'
                        }`}
                      >
                        <span className="block text-[14px] font-semibold leading-tight">{s.name}</span>
                        <span className={`block text-[12px] ${on ? 'text-coal/60' : 'text-bone/50'}`}>
                          {s.priceFrom ? 'desde ' : ''}
                          {money(s.price)} · {formatDuration(s.durationMin)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              <p className="mt-10 text-[11px] font-medium uppercase tracking-[0.2em] text-bone/50">2 · Horario libre</p>
              <AnimatePresence mode="wait">
                {!ready ? (
                  <motion.div key="sk" exit={{ opacity: 0 }} className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Skeleton className="h-28 rounded-[1.5rem]" />
                    <Skeleton className="h-28 rounded-[1.5rem]" />
                  </motion.div>
                ) : grouped.length === 0 ? (
                  <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 rounded-[1.5rem] border border-bone/10 bg-bone/[0.03] p-5 text-[15px] text-bone/60">
                    No me quedan horarios libres en los próximos días para este servicio. Al reservar podés anotarte en la lista de espera y te aviso.
                  </motion.p>
                ) : (
                  <motion.div
                    key={serviceId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                    className="mt-4 grid gap-3 sm:grid-cols-2"
                  >
                    {grouped.map(([date, times]) => (
                      <div key={date} className="rounded-[1.5rem] border border-bone/10 bg-bone/[0.03] p-4">
                        <p className="font-serif text-[24px] capitalize leading-none text-bone">{dayLabel(date)}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {times.map((t) => (
                            <button
                              key={t}
                              onClick={() => navigate(`/reservar?servicio=${serviceId}&fecha=${date}&hora=${t}`)}
                              className="h-10 rounded-full border border-bone/15 px-4 text-[14px] font-semibold tabular-nums text-bone transition duration-300 hover:border-bone hover:bg-bone hover:text-coal active:scale-95"
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
