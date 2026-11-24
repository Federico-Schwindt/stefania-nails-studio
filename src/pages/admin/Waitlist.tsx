import { Trash, WhatsappLogo } from '@phosphor-icons/react'
import { Button, Select, toast } from '../../components/ui'
import { api } from '../../lib/api'
import type { WaitlistEntry } from '../../lib/types'
import { linkPill } from './BookingTools'
import { dateLabel, ErrorText, heading, LoadState, panel, studioDate, useAction, useLoad } from './shared'
import { waLink } from './whatsapp'

const statuses: Record<WaitlistEntry['status'], string> = { open: 'Abierta', contacted: 'Contactada', booked: 'Reservó', closed: 'Cerrada' }
const loadEntries = () => api.listWaitlist()

function Entry({ entry: w, reload }: { entry: WaitlistEntry; reload: () => void }) {
  const action = useAction()
  return <article className={panel + ' space-y-3'}>
    <h2 className={heading + ' break-words'}>{w.name}</h2><p>{w.phone}</p>
    <p><strong>{w.serviceName || 'Sin servicio indicado'}</strong></p>
    <p className="whitespace-pre-wrap break-words">{w.preferred || 'Sin preferencia de horario.'}</p>
    <p className="text-sm text-choco">Se anotó el {dateLabel(studioDate(new Date(w.createdAt)))}</p>
    <Select label="Estado" value={w.status} disabled={action.busy} onChange={e => {
      const status = e.target.value as WaitlistEntry['status']
      void action.run(async () => { await api.updateWaitlist(w.id, status); toast.ok('Estado actualizado.'); reload() })
    }}>{Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select>
    <div className="flex flex-wrap gap-2">
      <a className={linkPill} href={waLink(w.phone, 'Hola ' + w.name + '! Te escribo de Stefania Nails Studio por la lista de espera.')} target="_blank" rel="noreferrer"><WhatsappLogo />WhatsApp</a>
      <Button size="sm" variant="outline" icon={<Trash />} disabled={action.busy} onClick={() => {
        if (window.confirm('¿Querés eliminar a ' + w.name + ' de la lista de espera?')) void action.run(async () => {
          await api.deleteWaitlist(w.id); toast.ok('Entrada eliminada.'); reload()
        })
      }}>Eliminar</Button>
    </div><ErrorText message={action.error} />
  </article>
}
export default function Waitlist() {
  const load = useLoad(loadEntries)
  if (!load.data) return <LoadState {...load} />
  return load.data.length ? <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">{load.data.map(w => <Entry key={w.id} entry={w} reload={load.reload} />)}</div> :
    <p className={panel}>Todavía no hay clientas en la lista de espera.</p>
}
