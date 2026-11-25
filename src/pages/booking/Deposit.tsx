import { ArrowSquareOut, Bank, Check, Copy, CreditCard, UploadSimple, WarningCircle } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Img } from '../../components/Img'
import { Logo } from '../../components/Logo'
import { Button, Skeleton, errMsg, toast } from '../../components/ui'
import { api } from '../../lib/api'
import { money } from '../../lib/pricing'
import { useCatalog } from '../../lib/store'
import type { Booking, PayMethod } from '../../lib/types'
import { fmtDate } from './Booking'

function CopyRow({ label, value }: { label: string; value: string }) {
  const [ok, setOk] = useState(false)
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-gris-100">
      <div className="min-w-0">
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-choco">{label}</p>
        <p className="truncate font-mono text-[16px] font-semibold text-ink">{value}</p>
      </div>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(value).catch(() => {})
          setOk(true)
          setTimeout(() => setOk(false), 1600)
        }}
        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-gris-50 px-4 text-[13px] font-semibold text-ink transition hover:bg-gris-100"
      >
        {ok ? <Check size={15} weight="bold" /> : <Copy size={15} />} {ok ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  )
}

/** Página de seña para el cobro manual: transferencia o link de Mercado Pago, con aviso a Stefania. */
export default function Deposit() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { settings, load } = useCatalog()
  const [b, setB] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [method, setMethod] = useState<PayMethod>('transfer')
  const [proof, setProof] = useState<string>()
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    load()
    api
      .getBooking(id)
      .then(setB)
      .catch((e) => toast.error(errMsg(e)))
      .finally(() => setLoading(false))
  }, [id, load])

  useEffect(() => {
    if (settings && !settings.transferAlias && !settings.transferCbu && settings.mpLink) setMethod('mercadopago')
  }, [settings])

  const hasTransfer = !!(settings?.transferAlias || settings?.transferCbu)
  const hasMp = !!settings?.mpLink

  const upload = async (f?: File) => {
    if (!f) return
    setUploading(true)
    try {
      setProof(await api.uploadImage(f, f.name))
      toast.ok('Comprobante cargado')
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const send = async () => {
    setSending(true)
    try {
      await api.reportDeposit(id, method, proof)
      toast.ok('¡Listo! Stefania va a verificar tu seña.')
      navigate(`/reserva/${id}`, { replace: true })
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-studio px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex justify-center">
          <Link to="/" aria-label="Inicio">
            <Logo className="h-10 text-accent" />
          </Link>
        </div>
        {loading ? (
          <Skeleton className="h-[520px] rounded-[32px]" />
        ) : !b ? (
          <p className="rounded-[28px] glass-light p-8 text-center">No encontramos la reserva.</p>
        ) : b.status !== 'pending_payment' && b.status !== 'payment_review' ? (
          <div className="rounded-[28px] glass-light p-8 text-center">
            <p className="font-serif text-3xl text-ink">Esta reserva no tiene una seña pendiente.</p>
            <Link to={`/reserva/${id}`} className="mt-4 inline-block font-semibold text-ink underline">
              Ver mi turno
            </Link>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-[32px] glass-light shadow-[0_40px_80px_-50px_rgb(23_21_22/0.6)]">
            <div className="bg-ink px-6 py-6 text-white">
              <p className="text-white/80">Seña para confirmar tu turno</p>
              <p className="font-serif text-[56px] leading-none">{money(b.deposit)}</p>
              <p className="mt-2 text-[14px] text-white/75">
                {b.serviceName} · {fmtDate(b.date)}, {b.time} h · {b.code}
              </p>
            </div>

            <div className="space-y-5 p-6">
              <p className="flex items-start gap-2 rounded-2xl bg-gris-50 p-3 text-[14px] text-ink">
                <WarningCircle size={18} className="mt-0.5 shrink-0" /> Tu horario queda reservado por 1 hora. Pagá la seña y tocá "Ya pagué la seña".
              </p>

              {(hasTransfer || hasMp) && (
                <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Medio de pago">
                  {hasTransfer && (
                    <button
                      role="radio"
                      aria-checked={method === 'transfer'}
                      onClick={() => setMethod('transfer')}
                      className={`flex flex-col items-start gap-2 rounded-2xl p-4 text-left transition ${method === 'transfer' ? 'bg-gris-50 ring-2 ring-ink' : 'ring-1 ring-gris hover:ring-ink/40'}`}
                    >
                      <Bank size={22} className="text-ink" />
                      <span className="text-[15px] font-semibold">Transferencia</span>
                    </button>
                  )}
                  {hasMp && (
                    <button
                      role="radio"
                      aria-checked={method === 'mercadopago'}
                      onClick={() => setMethod('mercadopago')}
                      className={`flex flex-col items-start gap-2 rounded-2xl p-4 text-left transition ${method === 'mercadopago' ? 'bg-gris-50 ring-2 ring-ink' : 'ring-1 ring-gris hover:ring-ink/40'}`}
                    >
                      <CreditCard size={22} className="text-ink" />
                      <span className="text-[15px] font-semibold">Mercado Pago</span>
                    </button>
                  )}
                </div>
              )}

              {!hasTransfer && !hasMp && (
                <p className="rounded-2xl bg-gris-50 p-4 text-[14px] text-choco">
                  Stefania te va a pasar los datos para la seña por WhatsApp. Tocá "Avisar a Stefania" para que te escriba.
                </p>
              )}

              {method === 'transfer' && hasTransfer && settings && (
                <div className="space-y-2.5">
                  {settings.transferAlias && <CopyRow label="Alias" value={settings.transferAlias} />}
                  {settings.transferCbu && <CopyRow label="CBU / CVU" value={settings.transferCbu} />}
                  {settings.transferHolder && <p className="px-1 text-[13px] text-choco">Titular: {settings.transferHolder}</p>}
                  <CopyRow label="Importe" value={String(b.deposit)} />
                </div>
              )}

              {method === 'mercadopago' && hasMp && settings?.mpLink && (
                <a
                  href={settings.mpLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-14 items-center justify-center gap-2 rounded-full bg-[#009ee3] text-[16px] font-semibold text-white transition hover:brightness-95"
                >
                  Pagar {money(b.deposit)} con Mercado Pago <ArrowSquareOut size={18} />
                </a>
              )}

              <div>
                <p className="mb-2 text-[14px] font-semibold">Comprobante (opcional)</p>
                {proof ? (
                  <div className="flex items-center gap-3">
                    <Img src={proof} alt="Comprobante cargado" className="h-20 w-16 rounded-xl object-cover ring-1 ring-gris-100" />
                    <button onClick={() => setProof(undefined)} className="text-[14px] font-semibold text-ink underline">
                      Quitar
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gris px-4 py-4 text-[14px] font-semibold text-ink transition hover:border-ink">
                    <UploadSimple size={18} className="text-ink" /> {uploading ? 'Subiendo...' : 'Subir captura del pago'}
                    <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} disabled={uploading} />
                  </label>
                )}
              </div>

              <Button size="lg" className="w-full" loading={sending} onClick={send}>
                {hasTransfer || hasMp ? 'Ya pagué la seña' : 'Avisar a Stefania'}
              </Button>
              <p className="text-center text-[12px] text-choco">La seña no es reembolsable. Se descuenta del total el día del turno.</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
