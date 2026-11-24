import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { InstagramLogo } from '@phosphor-icons/react'
import { Button, Field, Select, TextArea, toast } from '../../components/ui'
import { api } from '../../lib/api'
import { money } from '../../lib/pricing'
import type { Booking, BookingStatus, Client } from '../../lib/types'
import { activeStatus, methodNames, statusNames } from './labels'
import { BookingStyle, PaymentDialog, Photo, Totals, WhatsApp } from './BookingTools'
import { templateKeys } from './whatsapp'
import { AdminSheet, dateLabel, ErrorText, LoadState, useAction, useLoad } from './shared'

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0"><dt className="text-xs font-semibold uppercase tracking-wide text-choco">{label}</dt><dd className="mt-1 break-words whitespace-pre-line">{children}</dd></div>
}
const getSettings = () => api.getSettings()

export default function BookingSheet({ booking: b, onClose, onChange }: { booking: Booking; onClose: () => void; onChange: () => void }) {
  const [notes, setNotes] = useState(b.adminNotes ?? '')
  const action = useAction()
  const settings = useLoad(getSettings)
  const [paying, setPaying] = useState(false)
  const [moving, setMoving] = useState(false)
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
  if (paying) return <PaymentDialog booking={b} onClose={() => setPaying(false)} onPaid={onChange} />
  return <AdminSheet wide title={'Turno ' + b.code} onClose={() => { if (!action.busy) onClose() }}>
    <div className="space-y-5">
      <div className="rounded-[28px] bg-bordo-50 p-5">
        <p className="text-sm font-semibold text-bordo">{statusNames[b.status]}</p>
        <h3 className="mt-1 break-words text-3xl text-bordo">{b.clientName}</h3>
        <p className="mt-1 text-choco">{dateLabel(b.date)} · {b.time} · {b.durationMin} min</p>
      </div>
      <dl className="grid gap-5 sm:grid-cols-2">
        <Detail label="Teléfono">{b.phone}<Link to={'/admin/clientas?telefono=' + encodeURIComponent(b.phone)} className="mt-1 block text-sm text-bordo underline">Ver ficha de la clienta</Link></Detail>
        <Detail label="Instagram">{instagram ? <a className="inline-flex items-center gap-1 text-bordo underline" href={'https://www.instagram.com/' + encodeURIComponent(instagram) + '/'} target="_blank" rel="noreferrer"><InstagramLogo size={17} />@{instagram}</a> : 'Sin indicar'}</Detail>
        <Detail label="Servicio">{b.serviceName}</Detail><Detail label="Diseño">{b.designName || b.color ? <BookingStyle booking={b} /> : 'Sin diseño elegido'}</Detail>
        <Detail label="Extras">{b.extras.length ? <ul>{b.extras.map(e => <li key={e.extraId}>{e.name} × {e.qty} · {money(e.price * e.qty)}</li>)}</ul> : 'Sin extras'}</Detail>
        <Detail label="Notas de la clienta">{b.notes || 'Sin notas'}</Detail>
      </dl>
      <section><h3 className="mb-2 text-2xl text-bordo">Inspiración</h3>
        {b.inspoUrls.length ? <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{b.inspoUrls.map((url, i) => <Photo key={i} src={url} label={'foto de inspiración ' + (i + 1)} />)}</div> : <p className="text-sm text-choco">Sin fotos adjuntas.</p>}
      </section>
      <section className="space-y-3"><h3 className="text-2xl text-bordo">Pago</h3>
        <Totals booking={b} />
        <p className="text-sm">Seña de {money(b.deposit)}{b.depositMethod && ' · ' + methodNames[b.depositMethod]}</p>
        {b.balanceMethod && <p className="text-sm">Medio del saldo · {methodNames[b.balanceMethod]}</p>}
        {b.paymentId && <p className="text-sm">Referencia · {b.paymentId}</p>}
        {b.depositProofUrl && <div><p className="mb-2 text-sm">Comprobante de seña</p><Photo src={b.depositProofUrl} label="comprobante de seña" /></div>}
        <Button size="sm" disabled={action.busy} onClick={() => setPaying(true)}>Cobrar</Button>
      </section>
      <section className="space-y-3"><h3 className="text-2xl text-bordo">WhatsApp</h3>
        {settings.data ? <div className="flex flex-wrap gap-2">{templateKeys.map(key =>
          <WhatsApp key={key} template={key} booking={b} settings={settings.data!} onClick={key === 'reminder' ? () => void action.run(async () => {
            await api.markReminded(b.id); toast.ok('Recordatorio marcado.'); onChange()
          }) : undefined} />)}</div> : <LoadState {...settings} />}
      </section>
      <Button variant="outline" size="sm" disabled={action.busy} onClick={() => setMoving(!moving)}>{moving ? 'Cerrar reprogramación' : 'Reprogramar'}</Button>
      {moving && <form onSubmit={e => {
        e.preventDefault()
        const f = new FormData(e.currentTarget)
        void action.run(async () => {
          await api.rescheduleBooking(b.id, String(f.get('date')), String(f.get('time')))
          toast.ok('Turno reprogramado.'); onChange()
        })
      }}><fieldset disabled={action.busy} className="grid gap-3 sm:grid-cols-2">
        <Field label="Nueva fecha" type="date" name="date" defaultValue={b.date} required />
        <Field label="Nueva hora" type="time" name="time" defaultValue={b.time} required />
        <Button>Guardar horario</Button>
      </fieldset></form>}
      <TextArea label="Notas internas" value={notes} disabled={action.busy} onChange={e => setNotes(e.target.value)} />
      <ErrorText message={action.error} />
      <fieldset className="flex flex-wrap gap-2" disabled={action.busy}>
        {b.status === 'paid' && <><Button onClick={() => update('confirmed')}>Confirmar</Button><Button variant="outline" onClick={() => update('rejected')}>Rechazar</Button></>}
        {activeStatus(b.status) && <Button variant="outline" onClick={() => update('no_show')}>No vino</Button>}
        {b.status === 'payment_review' && <><Button onClick={() => void action.run(async () => {
          await api.recordPayment(b.id, b.deposit, b.depositMethod ?? 'transfer', 'deposit'); toast.ok('Seña registrada.'); onChange()
        })}>Seña recibida</Button><Button variant="outline" onClick={() => update('rejected')}>Rechazar</Button></>}
        {b.status === 'confirmed' && <Button onClick={() => update('completed')}>Marcar completado</Button>}
        <Button variant="outline" disabled={notes === (b.adminNotes ?? '')} onClick={() => update(b.status)}>Guardar notas</Button>
        {activeStatus(b.status) && <Button variant="outline" onClick={() => update('cancelled')}>Cancelar turno</Button>}
        <Button variant="danger" onClick={remove}>Eliminar</Button>
      </fieldset>
    </div>
  </AdminSheet>
}

const getServices = () => api.getServices()
export function ManualBooking({ date, client, onClose, onCreate }: { date: string; client?: Client; onClose: () => void; onCreate: (booking: Booking) => void }) {
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
            clientName: value('client'), phone: value('phone'), instagram: value('instagram'), notes: value('notes'), extras: [], inspoUrls: [] })
          toast.ok('Turno creado y confirmado.')
          onCreate(booking)
        })
      }}>
        <fieldset disabled={action.busy} className="grid gap-4">
          <Select label="Servicio" name="service" required defaultValue=""><option disabled value="">Elegí un servicio</option>{active.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
          <div className="grid grid-cols-2 gap-3"><Field label="Fecha" name="date" type="date" required defaultValue={date} /><Field label="Hora" name="time" type="time" required /></div>
          <Field label="Nombre de la clienta" name="client" defaultValue={client?.name} required minLength={2} /><Field label="Teléfono" type="tel" name="phone" defaultValue={client?.phone} minLength={8} required />
          <Field label="Instagram (opcional)" name="instagram" defaultValue={client?.instagram} />
          <TextArea label="Notas" name="notes" /><ErrorText message={action.error} />
          <Button loading={action.busy}>Crear turno</Button>
        </fieldset>
      </form>}
  </AdminSheet>
}
