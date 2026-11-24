import { ArrowRight, CalendarBlank, Clock } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Skeleton } from '../../components/ui'
import { dayLabel, useNextSlots, useSchedule } from '../../lib/availability'
import { money } from '../../lib/pricing'
import { useCatalog } from '../../lib/store'

/** Widget de reserva rápida: servicio → próximos horarios libres → seguir en el flujo de reserva. */
export function QuickBook({ className = '' }: { className?: string }) {
  const navigate = useNavigate()
  const { services, settings, hours, loaded } = useCatalog()
  const { busy, blocked, loading } = useSchedule(30)
  const [serviceId, setServiceId] = useState<string>()
  useEffect(() => {
    if (!serviceId && services.length) setServiceId(services[0].id)
  }, [services, serviceId])
  const service = services.find((s) => s.id === serviceId)
  const slots = useNextSlots({ service, settings, hours, busy, blocked, limit: 6 })
  const ready = loaded && !loading

  const grouped = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const s of slots) m.set(s.date, [...(m.get(s.date) ?? []), s.time])
    return [...m.entries()]
  }, [slots])

  return (
    <div className={`rounded-[28px] bg-white p-5 shadow-[0_30px_70px_-40px_rgb(73_45_35/0.55)] ring-1 ring-gris-100 sm:p-6 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-serif text-[26px] leading-none text-ink">Reservá tu turno</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-bordo-50 px-3 py-1 text-[12px] font-semibold text-bordo">
          <CalendarBlank size={14} /> Agenda en vivo
        </span>
      </div>

      <p className="mb-2 mt-4 text-[13px] font-semibold text-choco">1. Elegí el servicio</p>
      {!loaded ? (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[68px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Servicio">
          {services.slice(0, 6).map((s) => {
            const on = s.id === serviceId
            return (
              <button
                key={s.id}
                role="radio"
                aria-checked={on}
                onClick={() => setServiceId(s.id)}
                className={`rounded-2xl px-3.5 py-2.5 text-left transition ${on ? 'bg-bordo text-white shadow-[0_10px_24px_-12px_rgb(87_3_20/0.7)]' : 'bg-gris-50 text-ink ring-1 ring-gris-100 hover:ring-bordo/40'}`}
              >
                <span className="block truncate text-[14px] font-semibold leading-tight">{s.name}</span>
                <span className={`mt-1 flex items-center justify-between text-[12px] ${on ? 'text-white/80' : 'text-choco'}`}>
                  <span>
                    {s.priceFrom ? 'desde ' : ''}
                    {money(s.price)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} /> {s.durationMin}′
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}

      <p className="mb-2 mt-4 text-[13px] font-semibold text-choco">2. Elegí un horario libre</p>
      <AnimatePresence mode="wait">
        {!ready ? (
          <motion.div key="sk" exit={{ opacity: 0 }} className="space-y-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </motion.div>
        ) : grouped.length === 0 ? (
          <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl bg-gris-50 p-4 text-[14px] text-choco">
            No hay horarios libres en los próximos días para este servicio. Podés anotarte en la lista de espera al reservar.
          </motion.p>
        ) : (
          <motion.div key={serviceId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-2.5">
            {grouped.map(([date, times]) => (
              <div key={date} className="flex items-center gap-3">
                <span className="w-[70px] shrink-0 text-[13px] font-semibold capitalize text-ink">{dayLabel(date)}</span>
                <div className="flex flex-wrap gap-2">
                  {times.map((t) => (
                    <button
                      key={t}
                      onClick={() => navigate(`/reservar?servicio=${serviceId}&fecha=${date}&hora=${t}`)}
                      className="h-9 rounded-full bg-white px-3.5 text-[14px] font-semibold tabular-nums text-ink ring-1 ring-gris transition hover:bg-bordo hover:text-white hover:ring-bordo active:scale-95"
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
        className="group mt-5 inline-flex h-12 w-full items-center justify-between rounded-full bg-ink pl-5 pr-1.5 text-[15px] font-semibold text-white transition hover:bg-black/85 active:scale-[0.99]"
      >
        Ver todos los horarios
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink transition group-hover:translate-x-0.5">
          <ArrowRight size={16} weight="bold" />
        </span>
      </button>
      {settings && (
        <p className="mt-3 text-center text-[12px] text-choco">
          Seña de {settings.depositMode === 'fixed' ? money(settings.depositValue) : `${settings.depositValue}%`} para confirmar. El resto se abona en el estudio.
        </p>
      )}
    </div>
  )
}
