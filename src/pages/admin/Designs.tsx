import { useState } from 'react'
import { Flower, Plus } from '@phosphor-icons/react'
import { Button, Toggle, toast } from '../../components/ui'
import { layer } from '../../data/seed'
import { Img } from '../../components/Img'
import { api } from '../../lib/api'
import type { Design } from '../../lib/types'
import DesignEditor from './DesignEditor'
import { ErrorText, heading, LoadState, useAction, useLoad } from './shared'

const getCatalog = () => Promise.all([api.getDesigns(), api.getServices()])
export default function Designs() {
  const load = useLoad(getCatalog)
  const [editing, setEditing] = useState<Design>()
  const action = useAction()
  if (!load.data) return <LoadState {...load} />
  const [designs, services] = load.data
  if (editing) return <DesignEditor initial={editing} services={services} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); load.reload() }} />
  function create() {
    setEditing({ id: '', name: '', tags: [], active: true, sort: Math.max(0, ...designs.map(d => d.sort)) + 1,
      params: { shape: 'almond', length: 0.5, all: layer({ base: '#570314', baseOpacity: 1 }) } })
  }
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className={heading}>Catálogo de diseños</h2><Button icon={<Plus />} onClick={create}>Nuevo diseño</Button></div>
    <ErrorText message={action.error} />
    {!designs.length && <p className="rounded-[28px] bg-gris-50 p-5 text-choco">Creá tu primer diseño para mostrarlo en el catálogo.</p>}
    <fieldset disabled={action.busy} className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{designs.map(d =>
      <article key={d.id} className="min-w-0 overflow-hidden rounded-[28px] bg-white ring-1 ring-gris">
        <button className="block w-full text-left focus-visible:outline-offset-[-3px]" aria-label={'Editar ' + d.name} onClick={() => setEditing(d)}>
          {(d.photoUrl || d.renderUrl) ? <Img loading="lazy" src={d.photoUrl || d.renderUrl} alt="" className="aspect-[4/3] w-full bg-bordo-50 object-cover" /> :
            <div className="grid aspect-[4/3] place-items-center bg-bordo-50 text-bordo"><Flower size={48} /></div>}
          <div className="p-5 pb-3"><h3 className="break-words text-3xl leading-tight text-bordo">{d.name}</h3>
            {!!d.tags.length && <div className="mt-2 flex flex-wrap gap-1">{d.tags.map((tag, i) => <span key={i} className="max-w-full rounded-full bg-gris-50 px-2.5 py-1 text-xs break-words text-choco">{tag}</span>)}</div>}
          </div>
        </button>
        <div className="mx-5 flex items-center justify-between gap-3 border-t border-gris/50 py-3 text-sm text-choco">
          {d.active ? 'Activo' : 'Inactivo'}<Toggle label={'Diseño activo, ' + d.name} checked={d.active} onChange={active => void action.run(async () => {
            await api.saveDesign({ ...d, active }); load.reload(); toast.ok(active ? 'Diseño activado.' : 'Diseño desactivado.')
          })} />
        </div>
      </article>)}</fieldset>
  </div>
}
