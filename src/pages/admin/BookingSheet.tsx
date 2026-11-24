import { useEffect, useState, type ReactNode } from 'react'
import { InstagramLogo, WhatsappLogo } from '@phosphor-icons/react'
import { Button, Field, Select, TextArea, toast } from '../../components/ui'
import { api, assetUrl } from '../../lib/api'
import { money } from '../../lib/pricing'
import type { Booking, BookingStatus } from '../../lib/types'
import { statusNames } from './Calendar'
import { AdminSheet, dateLabel, ErrorText, LoadState, useAction, useLoad } from './shared'

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0"><dt className="text-xs font-semibold uppercase tracking-wide text-choco">{label}</dt><dd className="mt-1 break-words whitespace-pre-line">{children}</dd></div>
}
function Inspiration({ url, index }: { url: string; index: number }) {
  const src = assetUrl(url)
  const [fullSize, setFullSize] = useState<string>()
  // Browsers block navigation to a top-level data URL. Demo uploads use JPEG data URLs.
  useEffect(() => {
    if (!src?.startsWith('data:image/')) return
    let live = true
    let objectUrl: string | undefined
    fetch(src).then(r => r.blob()).then(blob => {
      if (live) { objectUrl = URL.createObjectURL(blob); setFullSize(objectUrl) }
    }).catch(() => {})
    return () => { live = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [src])
  return <a href={fullSize ?? src} target="_blank" rel="noreferrer" className="overflow-hidden rounded-2xl ring-1 ring-gris">
    <img src={src} alt={'Abrir foto de inspiración ' + index} className="aspect-square w-full object-cover" />
  </a>
}
const paymentMethods = { manual: 'Manual', simulated: 'Pago de prueba', mercadopago: 'Mercado Pago' }
const paymentStates: Record<string, string> = { approved: 'Aprobado', rejected: 'Rechazado', pending: 'Pendiente', in_process: 'En proceso', refunded: 'Reintegrado', cancelled: 'Cancelado' }

export default function BookingSheet({ booking: b, onClose, onChange }: { booking: Booking; onClose: () => void; onChange: () => void }) {
  const [notes, setNotes] = useState(b.adminNotes ?? '')
  const action = useAction()
  const message = 'Hola ' + b.clientName + '! Te escribo de Stefania Nails Studio por tu turno del ' + b.date + ' a las ' + b.time + '.'
  const whatsapp = 'https://wa.me/' + b.phone.replace(/\D/g, '') + '?text=' + encodeURIComponent(message)
  const instagram = b.instagram?.trim().replace(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\//i, '').replace(/^@/, '').split(/[/?#]/)[0]
  function update(status: BookingStatus) {
    if (status === 'rejected' && b.status !== status && !window.confirm('¿Querés rechazar este turno?')) return
    if (status === 'cancelled' && b.status !== status && !window.confirm('¿Querés cancelar este turno?')) return
    void action.run(async () => {
      await api.updateBookingStatus(b.id, status, notes)
      toast.ok(status === b.status ? 'Notas guardadas.' : 'Estado del turno actualizado.')
      onChange()
    })
  }
  function remove() {
    if (!window.confirm('¿Querés eliminar el turno ' + b.code + ' de forma definitiva?')) return
    void action.run(async () => { await api.deleteBooking(b.id); toast.ok('Turno eliminado.'); onChange() })
  }
  return <AdminSheet wide title={'Turno ' + b.code} onClose={() => { if (!action.busy) onClose() }}>
    <div className="space-y-5">
      <div className="rounded-[28px] bg-bordo-50 p-5">
        <p className="text-sm font-semibold text-bordo">{statusNames[b.status]}</p>
        <h3 className="mt-1 break-words text-3xl text-bordo">{b.clientName}</h3>
        <p className="mt-1 text-choco">{dateLabel(b.date)} · {b.time} · {b.durationMin} min</p>
      </div>
      <dl className="grid gap-5 sm:grid-cols-2">
        <Detail label="Teléfono">{b.phone}<a className="mt-1 flex items-center gap-1 text-sm text-bordo underline" href={whatsapp} target="_blank" rel="noreferrer"><WhatsappLogo size={17} />Escribir por WhatsApp</a></Detail>
        <Detail label="Instagram">{instagram ? <a className="inline-flex items-center gap-1 text-bordo underline" href={'https://www.instagram.com/' + encodeURIComponent(instagram) + '/'} target="_blank" rel="noreferrer"><InstagramLogo size={17} />@{instagram}</a> : 'Sin indicar'}</Detail>
        <Detail label="Servicio">{b.serviceName}</Detail><Detail label="Diseño">{b.designName || 'Sin diseño elegido'}</Detail>
        <Detail label="Extras">{b.extras.length ? <ul>{b.extras.map(e => <li key={e.extraId}>{e.name} × {e.qty} · {money(e.price * e.qty)}</li>)}</ul> : 'Sin extras'}</Detail>
        <Detail label="Notas de la clienta">{b.notes || 'Sin notas'}</Detail>
      </dl>
      <section><h3 className="mb-2 text-2xl text-bordo">Inspiración</h3>
        {b.inspoUrls.length ? <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{b.inspoUrls.map((url, i) => <Inspiration key={i} url={url} index={i + 1} />)}</div> : <p className="text-sm text-choco">Sin fotos adjuntas.</p>}
      </section>
      <section className="rounded-[28px] bg-gris-50 p-5"><h3 className="mb-3 text-2xl text-bordo">Pago</h3>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <Detail label="Total">{money(b.total)}</Detail><Detail label="Seña">{money(b.deposit)}</Detail>
          <Detail label="Estado del pago">{b.paymentStatus ? paymentStates[b.paymentStatus] ?? b.paymentStatus : b.status === 'pending_payment' ? 'Pendiente' : 'Sin registrar'}</Detail>
          <Detail label="Método">{b.paymentMethod ? paymentMethods[b.paymentMethod] : 'Sin registrar'}</Detail>
          <Detail label="ID de pago">{b.paymentId || 'Sin registrar'}</Detail>
        </dl>
      </section>
      <TextArea label="Notas internas" value={notes} disabled={action.busy} onChange={e => setNotes(e.target.value)} />
      <ErrorText message={action.error} />
      <fieldset className="flex flex-wrap gap-2" disabled={action.busy}>
        {b.status === 'paid' && <><Button onClick={() => update('confirmed')}>Confirmar</Button><Button variant="outline" onClick={() => update('rejected')}>Rechazar</Button></>}
        {b.status === 'confirmed' && <Button onClick={() => update('completed')}>Marcar completado</Button>}
        <Button variant="outline" disabled={notes === (b.adminNotes ?? '')} onClick={() => update(b.status)}>Guardar notas</Button>
        {['confirmed', 'pending_payment', 'paid'].includes(b.status) && <Button variant="outline" onClick={() => update('cancelled')}>Cancelar turno</Button>}
        <Button variant="danger" onClick={remove}>Eliminar</Button>
      </fieldset>
    </div>
  </AdminSheet>
}

const getServices = () => api.getServices()
export function ManualBooking({ date, onClose, onCreate }: { date: string; onClose: () => void; onCreate: (booking: Booking) => void }) {
  const services = useLoad(getServices)
  const active = services.data?.filter(s => s.active)
  const action = useAction()
  return <AdminSheet title="Nuevo turno" onClose={() => { if (!action.busy) onClose() }}>
    {!active ? <LoadState {...services} /> : !active.length ? <p>Activá un servicio en Servicios para cargar un turno.</p> :
      <form onSubmit={e => {
        e.preventDefault()
        const form = new FormData(e.currentTarget)
        const value = (name: string) => String(form.get(name) ?? '').trim()
        void action.run(async () => {
          const booking = await api.createManualBooking({ serviceId: value('service'), date: value('date'), time: value('time'),
            clientName: value('client'), phone: value('phone'), notes: value('notes'), extras: [], inspoUrls: [] })
          toast.ok('Turno creado y confirmado.')
          onCreate(booking)
        })
      }}>
        <fieldset disabled={action.busy} className="grid gap-4">
          <Select label="Servicio" name="service" required defaultValue=""><option disabled value="">Elegí un servicio</option>{active.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
          <div className="grid grid-cols-2 gap-3"><Field label="Fecha" name="date" type="date" required defaultValue={date} /><Field label="Hora" name="time" type="time" required /></div>
          <Field label="Nombre de la clienta" name="client" required minLength={2} /><Field label="Teléfono" type="tel" name="phone" minLength={8} required />
          <TextArea label="Notas" name="notes" /><ErrorText message={action.error} />
          <Button loading={action.busy}>Crear turno</Button>
        </fieldset>
      </form>}
  </AdminSheet>
}
