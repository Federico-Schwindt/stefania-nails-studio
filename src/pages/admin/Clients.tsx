import { useCallback, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, WhatsappLogo } from '@phosphor-icons/react'
import { Button, Field, TextArea, toast } from '../../components/ui'
import { api } from '../../lib/api'
import { money } from '../../lib/pricing'
import type { Client, ClientDetail } from '../../lib/types'
import { ManualBooking } from './BookingSheet'
import { linkPill, StatusPill } from './BookingTools'
import { dateLabel, ErrorText, heading, LoadState, panel, studioDate, useAction, useLoad } from './shared'
import { waLink } from './whatsapp'

function ClientSummary({ client: c }: { client: Client }) {
  return <div className="space-y-1 text-sm text-choco">
    <p>{c.visits} {c.visits === 1 ? 'visita' : 'visitas'} · Total gastado {money(c.totalSpent)}</p>
    <p>Última visita · {c.lastVisit ? dateLabel(c.lastVisit) : 'Sin visitas'}</p>
    <p>Próximo turno · {c.nextBooking ? dateLabel(c.nextBooking.date) + ' · ' + c.nextBooking.time + ' · ' + c.nextBooking.serviceName : 'Sin reservar'}</p>
    {c.noShows > 0 && <span className="inline-block rounded-full bg-gris-50 px-3 py-1 text-xs font-semibold text-ink">No vino · {c.noShows}</span>}
  </div>
}

function Profile({ detail, onSave }: { detail: ClientDetail; onSave: () => void }) {
  const c = detail.client
  const action = useAction()
  const [creating, setCreating] = useState(false)
  return <div className="space-y-5">
    <Link className={linkPill} to="/admin/clientas"><ArrowLeft />Volver a clientas</Link>
    <section className={panel + ' space-y-4'}>
      <h2 className={heading}>{c.name}</h2><p>{c.phone}</p><ClientSummary client={c} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" icon={<Plus />} onClick={() => setCreating(true)}>Nuevo turno para esta clienta</Button>
        <a href={waLink(c.phone)} target="_blank" rel="noreferrer" className={linkPill}><WhatsappLogo />WhatsApp</a>
      </div>
    </section>
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <section className={panel}><h2 className={heading}>Ficha de la clienta</h2>
        <form className="mt-4" onSubmit={e => {
          e.preventDefault()
          const data = new FormData(e.currentTarget)
          const get = (key: string) => String(data.get(key) ?? '').trim()
          void action.run(async () => {
            const birthday = get('birthday')
            if (birthday) {
              const date = new Date('2000-' + birthday + 'T00:00:00Z')
              if (!Number.isFinite(+date) || date.toISOString().slice(5, 10) !== birthday) throw new Error('Revisá el mes y el día del cumpleaños.')
            }
            await api.saveClient(c.phone, { name: get('name'), notes: get('notes'), instagram: get('instagram').replace(/^@/, ''), birthday })
            toast.ok('Ficha guardada.'); onSave()
          })
        }}><fieldset disabled={action.busy} className="grid gap-4">
          <Field label="Nombre" name="name" defaultValue={c.name} required />
          <Field label="Instagram" name="instagram" defaultValue={c.instagram} />
          <Field label="Cumpleaños (MM-DD)" name="birthday" defaultValue={c.birthday} placeholder="11-25" pattern="[0-9]{2}-[0-9]{2}" />
          <TextArea label="Notas privadas" hint="Anotá alergias, preferencias y cuidados." name="notes" defaultValue={c.notes} />
          <ErrorText message={action.error} /><Button loading={action.busy}>Guardar ficha</Button>
        </fieldset></form>
      </section>
      <section className={panel}><h2 className={heading}>Historial de turnos</h2>
        {!detail.bookings.length && <p className="mt-3 text-choco">Todavía no hay turnos registrados.</p>}
        <ul className="divide-y divide-gris">{detail.bookings.map(b => <li key={b.id} className="space-y-1 py-3">
          <p className="font-semibold">{dateLabel(b.date)} · {b.time}</p><p>{b.serviceName} · {b.code}</p><StatusPill status={b.status} />
          <p className="text-sm text-choco">Total {money(b.total)} · Cobrado {money(b.paidAmount)}</p>
        </li>)}</ul>
      </section>
    </div>
    {creating && <ManualBooking client={c} date={studioDate()} onClose={() => setCreating(false)} onCreate={() => { setCreating(false); onSave() }} />}
  </div>
}

function ClientPage({ phone }: { phone: string }) {
  const load = useLoad(useCallback(() => api.getClient(phone), [phone]))
  if (load.data === undefined) return <LoadState {...load} />
  if (!load.data) return <div className={panel}><p>No encontramos esta clienta.</p><Link to="/admin/clientas" className={linkPill}>Volver a clientas</Link></div>
  return <Profile detail={load.data} onSave={load.reload} />
}

function Directory() {
  const [search, setSearch] = useState('')
  const query = /^[+\d()\s.-]+$/.test(search) ? search.replace(/\D/g, '').slice(-10) : search.trim().replace(/^@/, '')
  const load = useLoad(useCallback(() => api.listClients(query), [query]))
  return <div className="space-y-5">
    <div className="max-w-lg"><Field type="search" label="Buscar clienta" placeholder="Nombre, teléfono o Instagram" value={search} onChange={e => setSearch(e.target.value)} /></div>
    {!load.data ? <LoadState {...load} /> : !load.data.length ? <p className={panel}>{search ? 'No encontramos clientas con esa búsqueda.' : 'Las clientas aparecen acá cuando reservan su primer turno.'}</p> :
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{load.data.map(c => <li key={c.phone} className={panel}>
        <Link className="block space-y-2" to={'/admin/clientas?telefono=' + encodeURIComponent(c.phone)}>
          <h2 className={heading + ' break-words'}>{c.name}</h2><p>{c.phone}{c.instagram && ' · @' + c.instagram}</p>
          <ClientSummary client={c} /><span className="text-sm font-semibold text-ink underline">Ver ficha</span>
        </Link>
      </li>)}</ul>}
  </div>
}
export default function Clients() {
  const [params] = useSearchParams()
  const phone = params.get('telefono')
  return phone ? <ClientPage key={phone} phone={phone} /> : <Directory />
}
