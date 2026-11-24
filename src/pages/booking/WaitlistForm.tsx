import { BellRinging, Check } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button, Field, errMsg } from '../../components/ui'
import { api } from '../../lib/api'

/** Anotarse en la lista de espera cuando no hay horarios. */
export function WaitlistForm({
  serviceId,
  defaultName = '',
  defaultPhone = '',
  preferred = '',
  className = '',
}: {
  serviceId?: string
  defaultName?: string
  defaultPhone?: string
  preferred?: string
  className?: string
}) {
  const [name, setName] = useState(defaultName)
  const [phone, setPhone] = useState(defaultPhone)
  const [when, setWhen] = useState(preferred)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()

  if (done)
    return (
      <p className={`flex items-center gap-2 rounded-2xl bg-bordo-50 p-4 font-medium text-bordo ${className}`}>
        <Check size={18} weight="bold" /> ¡Listo! Te avisamos por WhatsApp si se libera un turno.
      </p>
    )

  return (
    <form
      className={`grid gap-3 sm:grid-cols-2 ${className}`}
      onSubmit={async (e) => {
        e.preventDefault()
        setError(undefined)
        setLoading(true)
        try {
          await api.joinWaitlist({ name, phone, serviceId, preferred: when })
          setDone(true)
        } catch (err) {
          setError(errMsg(err))
        } finally {
          setLoading(false)
        }
      }}
    >
      <Field label="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      <Field label="WhatsApp" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
      <div className="sm:col-span-2">
        <Field label="¿Qué días u horarios te sirven?" placeholder="Ej. martes o jueves después de las 16" value={when} onChange={(e) => setWhen(e.target.value)} error={error} />
      </div>
      <Button type="submit" variant="dark" loading={loading} icon={<BellRinging size={18} />} className="sm:col-span-2">
        Avisarme si se libera
      </Button>
    </form>
  )
}
