import { ArrowLeft, MagnifyingGlass } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { Button, Field, errMsg } from '../../components/ui'
import { api } from '../../lib/api'

/** "Mi turno": la clienta busca su reserva con el código y su WhatsApp. */
export default function MyBooking() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)

  const search = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(undefined)
    if (code.trim().length < 4 || phone.replace(/\D/g, '').length < 8) {
      setError('Ingresá el código de tu reserva y tu WhatsApp.')
      return
    }
    setLoading(true)
    try {
      const b = await api.findBooking(code.trim().toUpperCase(), phone)
      if (!b) setError('No encontramos un turno con esos datos. Revisá el código y el teléfono.')
      else {
        sessionStorage.setItem(`sns-phone-${b.id}`, phone)
        navigate(`/reserva/${b.id}`)
      }
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-studio px-4 py-6 sm:py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-[15px] font-medium hover:bg-ink/5">
            <ArrowLeft size={18} /> Inicio
          </Link>
          <Logo className="h-9 text-ink" />
          <span className="w-[72px]" />
        </div>
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={search}
          className="rounded-[14px] glass-light p-6 shadow-[0_40px_80px_-50px_rgb(23_21_22/0.6)] sm:p-8"
        >
          <h1 className="text-[44px] leading-none text-ink">Mi turno</h1>
          <p className="mt-3 text-choco">Buscá tu reserva para ver el estado, pagar la seña o cancelarla.</p>
          <div className="mt-6 space-y-4">
            <Field label="Código de reserva" placeholder="Ej. SN-4F7K" value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="characters" />
            <Field label="WhatsApp con el que reservaste" type="tel" inputMode="tel" placeholder="Ej. 3446 571429" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          {error && <p className="mt-4 text-[14px] font-medium text-ink">{error}</p>}
          <Button type="submit" size="lg" className="mt-6 w-full" loading={loading} icon={<MagnifyingGlass size={18} />}>
            Buscar mi turno
          </Button>
          <p className="mt-4 text-center text-[13px] text-choco">El código te aparece al reservar y en el mensaje de confirmación.</p>
        </motion.form>
      </div>
    </div>
  )
}
