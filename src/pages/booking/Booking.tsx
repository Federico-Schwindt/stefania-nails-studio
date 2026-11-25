import { ArrowLeft, ArrowRight, CalendarBlank, Check, Clock, ImageSquare, Minus, Plus, ShieldCheck, Sparkle, Trash, UploadSimple } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Img } from '../../components/Img'
import { Logo } from '../../components/Logo'
import { Button, Chip, Field, Skeleton, TextArea, errMsg, toast } from '../../components/ui'
import { api, assetUrl } from '../../lib/api'
import { computeDeposit, computeExtras, computeTotal, money } from '../../lib/pricing'
import { addDays, availableTimes, dayIsBookable, isoDate, parseIso } from '../../lib/slots'
import { useCatalog, useDraft } from '../../lib/store'
import type { BlockedSlot, BusySlot } from '../../lib/types'
import { WaitlistForm } from './WaitlistForm'
import { DesignCard } from '../home/Designs'

const STEPS = ['Servicio', 'Diseño', 'Fecha', 'Tus datos', 'Seña'] as const
const ease = [0.16, 1, 0.3, 1] as const
const DOW = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export const fmtDate = (iso: string) => {
  const d = parseIso(iso)
  return `${['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`
}

type DesignMode = 'galeria' | 'inspo'

export default function Booking() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { services, extras, designs, settings, hours, loaded, load } = useCatalog()
  const { draft, set } = useDraft()
  // si llega desde la reserva rápida con servicio y horario elegidos, arrancamos en el diseño
  const [step, setStep] = useState(() => (params.get('servicio') && params.get('hora') ? 1 : 0))
  const [mode, setMode] = useState<DesignMode>('galeria')
  const [hoverDesign, setHoverDesign] = useState<string | null>(null)
  const [busy, setBusy] = useState<BusySlot[]>([])
  const [blocked, setBlocked] = useState<BlockedSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileRef = useRef<HTMLInputElement>(null)
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    load()
  }, [load])

  // parámetros de entrada (desde la portada)
  useEffect(() => {
    const patch: Partial<typeof draft> = {}
    const sv = params.get('servicio')
    const fecha = params.get('fecha')
    const hora = params.get('hora')
    if (fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) patch.date = fecha
    if (hora && /^\d{2}:\d{2}$/.test(hora)) patch.time = hora
    const ds = params.get('diseno')
    if (sv) patch.serviceId = sv
    if (ds) {
      patch.designId = ds
      patch.color = undefined
    }
    if (Object.keys(patch).length) set(patch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // si viene un diseño con servicio sugerido y no hay servicio elegido
  useEffect(() => {
    if (!loaded) return
    if (!draft.serviceId && draft.designId) {
      const d = designs.find((x) => x.id === draft.designId)
      if (d?.serviceId) set({ serviceId: d.serviceId })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded])

  const service = services.find((s) => s.id === draft.serviceId)
  const design = designs.find((d) => d.id === draft.designId)
  const selectedExtras = useMemo(
    () => computeExtras(extras, Object.entries(draft.extras).filter(([, q]) => q > 0).map(([extraId, qty]) => ({ extraId, qty }))),
    [extras, draft.extras],
  )
  const total = service ? computeTotal(service, selectedExtras) : 0
  const deposit = service && settings ? computeDeposit(total, settings) : 0

  // días y horarios
  const days = useMemo(() => {
    if (!settings) return []
    const today = new Date()
    return Array.from({ length: settings.maxDaysAhead + 1 }, (_, i) => isoDate(addDays(today, i)))
  }, [settings])

  useEffect(() => {
    if (step !== 2 || !days.length) return
    let alive = true
    setSlotsLoading(true)
    Promise.all([api.getBusy(days[0], days[days.length - 1]), api.getBlocked(days[0], days[days.length - 1])])
      .then(([b, bl]) => {
        if (!alive) return
        setBusy(b)
        setBlocked(bl)
      })
      .catch((e) => toast.error(errMsg(e)))
      .finally(() => alive && setSlotsLoading(false))
    return () => {
      alive = false
    }
  }, [step, days])

  // días con al menos un horario libre para la duración del servicio elegido
  const bookableDays = useMemo(() => {
    if (!settings) return []
    return days.filter(
      (d) =>
        dayIsBookable(d, hours, blocked, settings) &&
        (!service || availableTimes({ date: d, duration: service.durationMin, hours, blocked, busy, settings }).length > 0),
    )
  }, [days, hours, blocked, busy, settings, service])
  const times = useMemo(() => {
    if (!draft.date || !service || !settings) return []
    return availableTimes({ date: draft.date, duration: service.durationMin, hours, blocked, busy, settings })
  }, [draft.date, service, settings, hours, blocked, busy])

  useEffect(() => {
    if (step === 2 && !slotsLoading && bookableDays.length && (!draft.date || !bookableDays.includes(draft.date))) set({ date: bookableDays[0], time: undefined })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, bookableDays, slotsLoading])

  const go = (n: number) => {
    setStep(n)
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const canNext = [
    !!service,
    true,
    !!draft.date && !!draft.time && times.includes(draft.time),
    true,
    true,
  ][step]

  const next = () => {
    if (step === 3) {
      const e: Record<string, string> = {}
      if (draft.clientName.trim().length < 2) e.name = 'Ingresá tu nombre y apellido.'
      if (draft.phone.replace(/\D/g, '').length < 8) e.phone = 'Ingresá un WhatsApp válido, con código de área.'
      if (!draft.acceptPolicies) e.policies = 'Para reservar tenés que aceptar las políticas del estudio.'
      setErrors(e)
      if (Object.keys(e).length) return
    }
    if (step < STEPS.length - 1) go(step + 1)
  }

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const room = 5 - draft.inspo.length
    const list = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, room)
    if (!list.length) return
    setUploading(true)
    try {
      const uploaded: { url: string; name: string }[] = []
      for (const f of list) {
        if (f.size > 12 * 1024 * 1024) {
          toast.error(`${f.name} pesa más de 12 MB.`)
          continue
        }
        uploaded.push({ url: await api.uploadImage(f, f.name), name: f.name })
      }
      set({ inspo: [...draft.inspo, ...uploaded] })
      if (uploaded.length) toast.ok(uploaded.length === 1 ? 'Imagen subida' : `${uploaded.length} imágenes subidas`)
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const submit = async () => {
    if (!service || !draft.date || !draft.time) return
    setSubmitting(true)
    try {
      const booking = await api.createBooking({
        clientName: draft.clientName,
        phone: draft.phone,
        instagram: draft.instagram || undefined,
        notes: draft.notes.trim() || undefined,
        color: draft.color,
        serviceId: service.id,
        extras: selectedExtras.map((e) => ({ extraId: e.extraId, qty: e.qty })),
        designId: draft.designId,
        inspoUrls: draft.inspo.map((i) => i.url),
        date: draft.date,
        time: draft.time,
      })
      const pay = await api.startPayment(booking.id)
      useDraft.getState().reset()
      if (pay.redirectUrl.startsWith('#')) navigate(pay.redirectUrl.slice(1))
      else window.location.href = pay.redirectUrl
    } catch (e) {
      toast.error(errMsg(e))
      if (/horario/i.test(errMsg(e))) go(2)
    } finally {
      setSubmitting(false)
    }
  }

  const previewDesign = designs.find((d) => d.id === (hoverDesign ?? draft.designId))
  const visual = previewDesign?.renderUrl ?? previewDesign?.photoUrl ?? draft.inspo[0]?.url

  return (
    <div className="min-h-[100dvh] bg-studio">
      <div ref={topRef} />
      {/* barra superior */}
      <header className="sticky top-0 z-30 border-b border-bone/[0.07] bg-coal/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6">
          <button
            onClick={() => (step === 0 ? navigate('/') : go(step - 1))}
            className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-[15px] font-medium text-ink transition hover:bg-ink/5"
          >
            <ArrowLeft size={18} /> <span className="hidden sm:inline">{step === 0 ? 'Volver al inicio' : 'Atrás'}</span>
          </button>
          <Link to="/" aria-label="Inicio">
            <Logo className="h-9 text-ink" />
          </Link>
          <span className="w-[88px] text-right text-[13px] font-medium text-choco sm:w-[140px]">
            {step + 1} de {STEPS.length}
          </span>
        </div>
        <nav aria-label="Pasos" className="mx-auto max-w-[1280px] px-4 pb-3 sm:px-6">
          <ol className="no-scrollbar flex gap-2 overflow-x-auto">
            {STEPS.map((s, i) => (
              <li key={s}>
                <button
                  disabled={i > step}
                  onClick={() => i < step && go(i)}
                  aria-current={i === step ? 'step' : undefined}
                  className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold transition ${
                    i === step ? 'bg-ink text-white' : i < step ? 'bg-gris-50 text-ink hover:bg-gris-100' : 'bg-gris-50 text-ink/40'
                  }`}
                >
                  {i < step && <Check size={13} weight="bold" />}
                  {s}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </header>

      <div className="mx-auto grid max-w-[1280px] gap-6 px-4 pb-36 pt-6 sm:px-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:pb-16">
        {/* contenido del paso */}
        <main className="min-w-0 rounded-[14px] glass-light p-5 shadow-[0_30px_60px_-50px_rgb(23_21_22/0.5)] sm:p-8">
          {!loaded ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.4, ease }}>
                {step === 0 && (
                  <section aria-labelledby="h-serv">
                    <h1 id="h-serv" className="text-[clamp(36px,5vw,56px)] leading-none text-ink">
                      ¿Qué te querés hacer?
                    </h1>
                    <p className="mt-2 text-choco">Elegí el servicio. Los extras se suman al total.</p>
                    <div className="mt-6 grid gap-3" role="radiogroup" aria-label="Servicio">
                      {services.map((s) => {
                        const on = s.id === draft.serviceId
                        return (
                          <button
                            key={s.id}
                            role="radio"
                            aria-checked={on}
                            onClick={() => set({ serviceId: s.id, time: undefined })}
                            className={`flex items-center justify-between gap-4 rounded-[10px] p-5 text-left transition ${on ? 'bg-ink text-white' : 'bg-gris-50 ring-1 ring-gris-100 hover:ring-ink/40'}`}
                          >
                            <div className="min-w-0">
                              <p className="font-serif text-[28px] leading-none">{s.name}</p>
                              <p className={`mt-1.5 line-clamp-2 text-[14px] ${on ? 'text-white/75' : 'text-choco'}`}>{s.description}</p>
                              <p className={`mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium ${on ? 'text-white/80' : 'text-ink/60'}`}>
                                <Clock size={14} /> {s.durationMin} min
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              {s.priceFrom && <span className={`block text-[11px] font-semibold uppercase tracking-wider ${on ? 'text-white/70' : 'text-choco'}`}>desde</span>}
                              <span className="font-serif text-[30px] leading-none">{money(s.price)}</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    {extras.length > 0 && (
                      <div className="mt-8">
                        <h2 className="font-serif text-[28px] text-ink">Extras</h2>
                        <div className="mt-3 grid gap-3">
                          {extras.map((x) => {
                            const q = draft.extras[x.id] ?? 0
                            const setQ = (n: number) => set({ extras: { ...draft.extras, [x.id]: Math.max(0, Math.min(x.maxQty, n)) } })
                            return (
                              <div key={x.id} className="flex items-center justify-between gap-4 rounded-[10px] bg-white p-4 ring-1 ring-gris-100">
                                <div className="min-w-0">
                                  <p className="font-medium">{x.name}</p>
                                  <p className="text-[14px] text-choco">
                                    {money(x.price)}
                                    {x.mode === 'unit' ? ' por uña' : ''}
                                  </p>
                                </div>
                                {x.mode === 'flat' ? (
                                  <Chip active={q > 0} onClick={() => setQ(q > 0 ? 0 : 1)}>
                                    {q > 0 ? 'Agregado' : 'Agregar'}
                                  </Chip>
                                ) : (
                                  <div className="flex items-center gap-2" role="group" aria-label={`Cantidad de ${x.name}`}>
                                    <button aria-label="Quitar uno" onClick={() => setQ(q - 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-gris disabled:opacity-40" disabled={q === 0}>
                                      <Minus size={16} />
                                    </button>
                                    <span className="w-6 text-center font-semibold tabular-nums" aria-live="polite">{q}</span>
                                    <button aria-label="Sumar uno" onClick={() => setQ(q + 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-ink text-white disabled:opacity-40" disabled={q >= x.maxQty}>
                                      <Plus size={16} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {step === 1 && (
                  <section aria-labelledby="h-dis">
                    <h1 id="h-dis" className="text-[clamp(36px,5vw,56px)] leading-none text-ink">
                      Tu diseño
                    </h1>
                    <p className="mt-2 text-choco">Elegí un diseño de mis trabajos o subí fotos de lo que te gusta. Si preferís, lo charlamos en el turno.</p>
                    <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto" role="tablist">
                      {(
                        [
                          ['galeria', 'Galería', Sparkle],
                          ['inspo', `Tu inspiración${draft.inspo.length ? ` (${draft.inspo.length})` : ''}`, ImageSquare],
                        ] as const
                      ).map(([id, label, Icon]) => (
                        <Chip key={id} role="tab" aria-selected={mode === id} active={mode === id} onClick={() => setMode(id)}>
                          <Icon size={15} /> {label}
                        </Chip>
                      ))}
                    </div>

                    {mode === 'galeria' && (
                      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3" onMouseLeave={() => setHoverDesign(null)}>
                        {designs.map((d) => (
                          <DesignCard
                            key={d.id}
                            d={d}
                            compact
                            active={draft.designId === d.id}
                            onPreview={(x) => setHoverDesign(x.id)}
                            onSelect={(x) => set({ designId: draft.designId === x.id ? undefined : x.id, color: undefined })}
                          />
                        ))}
                      </div>
                    )}


                    {mode === 'inspo' && (
                      <div className="mt-6">
                        <label
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault()
                            onFiles(e.dataTransfer.files)
                          }}
                          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[12px] border-2 border-dashed border-gris p-8 text-center transition hover:border-ink hover:bg-gris-50/50 ${
                            draft.inspo.length >= 5 ? 'pointer-events-none opacity-50' : ''
                          }`}
                        >
                          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white">
                            <UploadSimple size={24} />
                          </span>
                          <span className="font-semibold">{uploading ? 'Subiendo...' : 'Subí fotos de diseños que te gusten'}</span>
                          <span className="text-[14px] text-choco">Hasta 5 imágenes. Las veo antes de tu turno.</span>
                          <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} disabled={uploading || draft.inspo.length >= 5} />
                        </label>
                        {draft.inspo.length > 0 && (
                          <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                            {draft.inspo.map((img, i) => (
                              <li key={img.url} className="group relative aspect-square overflow-hidden rounded-[18px] bg-gris-50">
                                <Img src={img.url} alt={`Inspiración ${i + 1}`} className="h-full w-full object-cover" />
                                <button
                                  aria-label="Quitar imagen"
                                  onClick={() => set({ inspo: draft.inspo.filter((x) => x.url !== img.url) })}
                                  className="absolute right-1.5 top-1.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink shadow"
                                >
                                  <Trash size={15} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </section>
                )}

                {step === 2 && (
                  <section aria-labelledby="h-fecha">
                    <h1 id="h-fecha" className="text-[clamp(36px,5vw,56px)] leading-none text-ink">
                      ¿Cuándo venís?
                    </h1>
                    <p className="mt-2 text-choco">Sólo ves los horarios libres para {service ? `${service.name.toLowerCase()} (${service.durationMin} min)` : 'tu servicio'}.</p>
                    {slotsLoading ? (
                      <div className="mt-6 space-y-4">
                        <Skeleton className="h-24" />
                        <Skeleton className="h-40" />
                      </div>
                    ) : bookableDays.length === 0 ? (
                      <div className="mt-8 rounded-[12px] bg-gris-50 p-8 text-center">
                        <CalendarBlank size={32} className="mx-auto text-ink" />
                        <p className="mt-3 font-semibold">No hay horarios libres por ahora.</p>
                        <p className="text-choco">Anotate en la lista de espera y te aviso si se libera un turno.</p>
                        <WaitlistForm serviceId={service?.id} defaultName={draft.clientName} defaultPhone={draft.phone} className="mt-6 text-left" />
                      </div>
                    ) : (
                      <>
                        <div className="no-scrollbar -mx-1 mt-6 flex snap-x gap-2 overflow-x-auto px-1 pb-2" role="listbox" aria-label="Día">
                          {days.map((d) => {
                            const ok = bookableDays.includes(d)
                            const on = draft.date === d
                            const dt = parseIso(d)
                            return (
                              <button
                                key={d}
                                role="option"
                                aria-selected={on}
                                disabled={!ok}
                                onClick={() => set({ date: d, time: undefined })}
                                className={`flex w-[68px] shrink-0 snap-start flex-col items-center rounded-[10px] py-3 transition ${
                                  on ? 'bg-ink text-white' : ok ? 'bg-gris-50 ring-1 ring-gris-100 hover:ring-ink/40' : 'bg-transparent text-ink/25 line-through'
                                }`}
                              >
                                <span className="text-[12px] font-semibold uppercase">{DOW[dt.getDay()]}</span>
                                <span className="font-serif text-[30px] leading-none">{dt.getDate()}</span>
                                <span className="text-[11px]">{MONTHS[dt.getMonth()].slice(0, 3)}</span>
                              </button>
                            )
                          })}
                        </div>
                        {draft.date && (
                          <div className="mt-6">
                            <h2 className="font-serif text-[26px] text-ink">{fmtDate(draft.date)}</h2>
                            {times.length === 0 ? (
                              <div className="mt-3 rounded-[10px] bg-gris-50 p-5">
                                <p className="text-choco">No quedan horarios libres este día para este servicio. Probá otro día o anotate en la lista de espera.</p>
                                <WaitlistForm serviceId={service?.id} defaultName={draft.clientName} defaultPhone={draft.phone} preferred={draft.date ? fmtDate(draft.date) : ''} className="mt-4" />
                              </div>
                            ) : (
                              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Horario">
                                {times.map((t) => (
                                  <button
                                    key={t}
                                    role="radio"
                                    aria-checked={draft.time === t}
                                    onClick={() => set({ time: t })}
                                    className={`h-12 rounded-[8px] text-[15px] font-semibold tabular-nums transition ${draft.time === t ? 'bg-ink text-white' : 'bg-white ring-1 ring-gris hover:ring-ink'}`}
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </section>
                )}

                {step === 3 && (
                  <section aria-labelledby="h-datos">
                    <h1 id="h-datos" className="text-[clamp(36px,5vw,56px)] leading-none text-ink">
                      Tus datos
                    </h1>
                    <p className="mt-2 text-choco">Te escribo por WhatsApp para confirmar el turno.</p>
                    <div className="mt-6 grid gap-5 sm:grid-cols-2">
                      <Field label="Nombre y apellido" autoComplete="name" value={draft.clientName} onChange={(e) => set({ clientName: e.target.value })} error={errors.name} />
                      <Field
                        label="WhatsApp"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="Ej. 3446 571429"
                        value={draft.phone}
                        onChange={(e) => set({ phone: e.target.value })}
                        error={errors.phone}
                        hint="Con código de área, sin 0 ni 15."
                      />
                      <Field label="Instagram (opcional)" placeholder="@tuusuario" value={draft.instagram} onChange={(e) => set({ instagram: e.target.value })} />
                      <div className="sm:col-span-2">
                        <TextArea label="¿Algo que tenga que saber? (opcional)" value={draft.notes} onChange={(e) => set({ notes: e.target.value })} hint="Por ejemplo: si venís con esmalte para retirar o tenés alguna alergia." />
                      </div>
                    </div>
                    <div className="mt-8 rounded-[12px] bg-gris-50 p-5 ring-1 ring-gris-100">
                      <p className="inline-flex items-center gap-2 font-semibold">
                        <ShieldCheck size={18} className="text-ink" /> Políticas del estudio
                      </p>
                      <ul className="mt-3 grid gap-1.5 text-[14px] text-ink/80">
                        {settings?.policies.map((p) => (
                          <li key={p} className="flex gap-2">
                            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink" aria-hidden />
                            {p}
                          </li>
                        ))}
                      </ul>
                      <label className="mt-4 flex cursor-pointer items-start gap-3">
                        <input type="checkbox" checked={draft.acceptPolicies} onChange={(e) => set({ acceptPolicies: e.target.checked })} className="mt-1 h-5 w-5 accent-[#171516]" />
                        <span className="text-[15px] font-medium">Leí y acepto las políticas de trabajo.</span>
                      </label>
                      {errors.policies && <p className="mt-2 text-[13px] font-medium text-ink">{errors.policies}</p>}
                    </div>
                  </section>
                )}

                {step === 4 && service && draft.date && draft.time && (
                  <section aria-labelledby="h-pago">
                    <h1 id="h-pago" className="text-[clamp(36px,5vw,56px)] leading-none text-ink">
                      Confirmá con la seña
                    </h1>
                    <p className="mt-2 text-choco">Tu horario queda reservado 1 hora mientras dejás la seña.</p>
                    <div className="mt-6 overflow-hidden rounded-[12px] bg-gris-50/80 p-6 ring-1 ring-gris-100">
                      <p className="font-serif text-[22px] text-ink">Tu próximo turno</p>
                      <dl className="mt-4 grid grid-cols-2 gap-4 text-[15px]">
                        <div>
                          <dt className="text-[12px] font-semibold uppercase tracking-[0.14em] text-choco">Fecha</dt>
                          <dd className="mt-1 font-medium">{fmtDate(draft.date)}</dd>
                        </div>
                        <div>
                          <dt className="text-[12px] font-semibold uppercase tracking-[0.14em] text-choco">Hora</dt>
                          <dd className="mt-1 font-medium">{draft.time} h</dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-[12px] font-semibold uppercase tracking-[0.14em] text-choco">Servicio</dt>
                          <dd className="mt-1 font-medium">
                            {service.name}
                            {selectedExtras.length > 0 && <span className="text-choco"> + {selectedExtras.map((e) => (e.qty > 1 ? `${e.qty} ${e.name.split(' (')[0].toLowerCase()}` : e.name.split(' (')[0])).join(', ')}</span>}
                          </dd>
                        </div>
                      </dl>
                      <div className="mt-6 flex items-end justify-between border-t border-gris/60 pt-4">
                        <span className="text-choco">Total del servicio</span>
                        <span className="font-serif text-[26px]">{money(total)}</span>
                      </div>
                      <div className="mt-2 flex items-end justify-between">
                        <span className="font-semibold">Seña a pagar ahora</span>
                        <span className="font-serif text-[40px] leading-none text-ink">{money(deposit)}</span>
                      </div>
                      <p className="mt-2 text-right text-[13px] text-choco">El resto ({money(total - deposit)}) lo abonás en el estudio.</p>
                    </div>
                    <Button size="lg" className="mt-6 w-full" loading={submitting} onClick={submit} iconRight={<ArrowRight size={18} weight="bold" />}>
                      Reservar y dejar la seña
                    </Button>
                    {settings?.paymentsMode === 'simulated' ? (
                      <p className="mt-3 text-center text-[13px] text-choco">Modo prueba: el pago es simulado y no se cobra nada.</p>
                    ) : (
                      <p className="mt-3 text-center text-[13px] text-choco">En el siguiente paso pagás por transferencia o Mercado Pago.</p>
                    )}
                  </section>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>

        {/* resumen */}
        <aside className="hidden lg:block">
          <div className="sticky top-[140px] overflow-hidden rounded-[14px] glass-light shadow-[0_30px_60px_-50px_rgb(23_21_22/0.5)]">
            <div className="relative aspect-[4/5] bg-gris-50">
              <AnimatePresence mode="wait">
                {visual ? (
                  <motion.div key={visual} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }} className="absolute inset-0">
                    <Img src={visual} alt="" className="h-full w-full object-cover" />
                  </motion.div>
                ) : (
                  <motion.img key="hand" src={assetUrl('img/disenos/firma-bordo.webp')} alt="" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 h-full w-full object-cover" />
                )}
              </AnimatePresence>
            </div>
            <div className="p-6">
              <p className="font-serif text-[26px] leading-none text-ink">Tu turno</p>
              <dl className="mt-4 space-y-3 text-[14px]">
                <Row label="Servicio" value={service?.name} />
                <Row label="Diseño" value={design?.name ?? (draft.inspo.length ? 'Tu inspiración' : 'Lo charlamos en el turno')} />
                {draft.inspo.length > 0 && (
                  <div className="flex gap-1.5">
                    {draft.inspo.map((i) => (
                      <Img key={i.url} src={i.url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    ))}
                  </div>
                )}
                <Row label="Fecha" value={draft.date ? `${fmtDate(draft.date)}${draft.time ? `, ${draft.time} h` : ''}` : undefined} />
              </dl>
              {service && (
                <div className="mt-5 flex items-end justify-between border-t border-gris-100 pt-4">
                  <span className="text-choco">Total</span>
                  <span className="font-serif text-[30px] leading-none">{money(total)}</span>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* barra inferior */}
      {step < 4 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-bone/[0.08] bg-coal/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="min-w-0">
              {service ? (
                <>
                  <p className="truncate text-[13px] text-choco">{service.name}</p>
                  <p className="font-serif text-[26px] leading-none">{money(total)}</p>
                </>
              ) : (
                <p className="text-[14px] text-choco">Elegí un servicio para seguir</p>
              )}
            </div>
            <Button size="lg" onClick={next} disabled={!canNext} iconRight={<ArrowRight size={18} weight="bold" />}>
              Continuar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-choco">{label}</dt>
      <dd className={`text-right font-medium ${value ? 'text-ink' : 'text-ink/35'}`}>{value ?? 'Sin elegir'}</dd>
    </div>
  )
}
