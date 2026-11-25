import { ArrowRight } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Skeleton } from '../../components/ui'
import { dayLabel, useNextSlots, useSchedule } from '../../lib/availability'
import { money } from '../../lib/pricing'
import { useCatalog } from '../../lib/store'
import { Eyebrow, WRAP, formatDuration } from './parts'

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
  const slots = useNextSlots({ service, settings, hours, busy, blocked, limit: 9 })
  const ready = loaded && !loading

  const grouped = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const s of slots) m.set(s.date, [...(m.get(s.date) ?? []), s.time])
    return [...m.entries()]
  }, [slots])

  return (
    <section aria-labelledby="qb-title" className={`${WRAP} pb-16 md:pb-24`}>
      <div className="grid overflow-hidden rounded-[12px] border border-bone/10 bg-[#100e0f] lg:grid-cols-12">
        <div className="flex flex-col border-b border-bone/10 p-6 sm:p-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:p-10">
          <Eyebrow>Reserva online</Eyebrow>
          <h2 id="qb-title" className="mt-5 text-[clamp(34px,3.4vw,50px)] leading-[1.02] tracking-[-0.02em] text-bone">
            Próximos turnos libres
          </h2>
          <p className="mt-4 max-w-[36ch] text-[15px] leading-relaxed text-bone/60">
            Elegí el servicio y tocá un horario. En el paso siguiente sumás tu diseño y tus datos.
          </p>
          {settings && (
            <p className="mt-8 border-t border-bone/10 pt-5 text-[14px] text-bone/50 lg:mt-auto">
              Seña de {settings.depositMode === 'fixed' ? money(settings.depositValue) : `${settings.depositValue}%`} para confirmar. El resto se abona en el estudio.
            </p>
          )}
        </div>

        <div className="p-6 sm:p-8 lg:col-span-8 lg:p-10">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-bone/45">Servicio</p>
          {!loaded ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-[64px] rounded-[8px]" />
              ))}
            </div>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Servicio">
              {services.map((s) => {
                const on = s.id === serviceId
                return (
                  <button
                    key={s.id}
                    role="radio"
                    aria-checked={on}
                    onClick={() => setServiceId(s.id)}
                    className={`rounded-[8px] border px-4 py-3 text-left transition ${on ? 'border-bone bg-bone text-coal' : 'border-bone/12 text-bone hover:border-bone/40'}`}
                  >
                    <span className="block text-[15px] font-semibold leading-tight">{s.name}</span>
                    <span className={`mt-1 block text-[13px] ${on ? 'text-coal/65' : 'text-bone/50'}`}>
                      {s.priceFrom ? 'desde ' : ''}
                      {money(s.price)} · {formatDuration(s.durationMin)}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          <p className="mt-8 text-[12px] font-semibold uppercase tracking-[0.18em] text-bone/45">Horarios libres</p>
          <AnimatePresence mode="wait">
            {!ready ? (
              <motion.div key="sk" exit={{ opacity: 0 }} className="mt-3 space-y-2">
                <Skeleton className="h-11 rounded-[8px]" />
                <Skeleton className="h-11 rounded-[8px]" />
              </motion.div>
            ) : grouped.length === 0 ? (
              <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 border-y border-bone/10 py-4 text-[15px] text-bone/60">
                No hay horarios libres en los próximos días para este servicio. Al reservar podés anotarte en la lista de espera.
              </motion.p>
            ) : (
              <motion.div key={serviceId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="mt-3 divide-y divide-bone/10 border-y border-bone/10">
                {grouped.map(([date, times]) => (
                  <div key={date} className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:gap-6">
                    <span className="w-[110px] shrink-0 text-[14px] font-semibold capitalize text-bone">{dayLabel(date)}</span>
                    <div className="flex flex-wrap gap-2">
                      {times.map((t) => (
                        <button
                          key={t}
                          onClick={() => navigate(`/reservar?servicio=${serviceId}&fecha=${date}&hora=${t}`)}
                          className="h-10 rounded-[8px] border border-bone/15 px-4 text-[14px] font-semibold tabular-nums text-bone transition hover:border-bone hover:bg-bone hover:text-coal active:scale-95"
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

          <button
            onClick={() => navigate(`/reservar${serviceId ? `?servicio=${serviceId}` : ''}`)}
            className="group mt-6 inline-flex items-center gap-2 text-[15px] font-semibold text-bone underline decoration-bone/30 underline-offset-[6px] transition hover:decoration-bone"
          >
            Ver todos los horarios
            <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </section>
  )
}
