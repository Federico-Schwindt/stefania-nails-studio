import { CreditCard, LockSimple, ShieldCheck } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { Button, Skeleton, errMsg, toast } from '../../components/ui'
import { api } from '../../lib/api'
import { money } from '../../lib/pricing'
import type { Booking } from '../../lib/types'
import { fmtDate } from './Booking'

/**
 * Pago de prueba: simula el paso por el checkout para probar el circuito completo
 * (reserva → seña → aviso al admin) sin cobrar. Con Mercado Pago configurado, este
 * paso lo reemplaza el Checkout Pro real.
 */
export default function SimulatedPay() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [b, setB] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState<'ok' | 'ko' | null>(null)

  useEffect(() => {
    api
      .getBooking(id)
      .then(setB)
      .catch((e) => toast.error(errMsg(e)))
      .finally(() => setLoading(false))
  }, [id])

  const pay = async (approved: boolean) => {
    setWorking(approved ? 'ok' : 'ko')
    try {
      const r = await api.confirmSimulatedPayment(id, approved)
      if (approved) toast.ok('Pago de prueba aprobado')
      else toast.error('Pago de prueba rechazado')
      navigate(`/reserva/${r.id}`, { replace: true })
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setWorking(null)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-studio px-4 py-6 sm:py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex justify-center">
          <Link to="/" aria-label="Inicio">
            <Logo className="h-10 text-ink" />
          </Link>
        </div>
        {loading ? (
          <Skeleton className="h-[460px] rounded-[14px]" />
        ) : !b ? (
          <p className="rounded-[12px] glass-light p-8 text-center">No encontramos la reserva.</p>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-[14px] glass-light shadow-[0_40px_80px_-50px_rgb(23_21_22/0.6)]">
            <div className="bg-accent bg-[radial-gradient(80%_120%_at_100%_0%,rgb(239_233_223/0.14),transparent_60%)] px-6 py-5 text-bone">
              <p className="inline-flex items-center gap-2 rounded-full bg-bone/15 px-3 py-1 text-[12px] font-semibold uppercase tracking-wider">Pago de prueba</p>
              <p className="mt-3 text-bone/80">Seña para {b.serviceName}</p>
              <p className="font-serif text-[52px] leading-none">{money(b.deposit)}</p>
              <p className="mt-2 text-[14px] text-bone/75">
                {fmtDate(b.date)}, {b.time} h · Código {b.code}
              </p>
            </div>
            <div className="space-y-4 p-6">
              <div className="rounded-[10px] bg-gris-50 p-4 ring-1 ring-gris-100">
                <p className="inline-flex items-center gap-2 text-[14px] font-semibold">
                  <CreditCard size={18} className="text-ink" /> Tarjeta de prueba
                </p>
                <p className="mt-2 font-mono text-[17px] tracking-[0.18em]">5031 7557 3453 0604</p>
                <p className="mt-1 text-[13px] text-choco">Titular APRO · Vto 11/30 · CVV 123</p>
              </div>
              <p className="flex items-start gap-2 text-[13px] text-choco">
                <ShieldCheck size={18} className="mt-0.5 shrink-0 text-ink" />
                Este es un pago simulado para probar el circuito de reservas. No se cobra nada. Cuando el estudio active Mercado Pago, este paso abre el checkout real.
              </p>
              <Button size="lg" className="w-full" loading={working === 'ok'} disabled={!!working} onClick={() => pay(true)} icon={<LockSimple size={18} />}>
                Aprobar pago de prueba
              </Button>
              <Button variant="danger" className="w-full" loading={working === 'ko'} disabled={!!working} onClick={() => pay(false)}>
                Simular pago rechazado
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
