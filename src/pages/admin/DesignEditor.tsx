import { Component, lazy, Suspense, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, Trash } from '@phosphor-icons/react'
import { Button, Field, Select, Skeleton, TextArea, toast } from '../../components/ui'
import { api, assetUrl } from '../../lib/api'
import type { Design, Service } from '../../lib/types'
import LayerControls from './LayerControls'
import { ErrorText, heading, panel, Switch, useAction } from './shared'

const HandViewer = lazy(() => import('../../three/HandViewer'))

class PreviewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? <p role="status" className="rounded-[28px] bg-gris-50 p-6 text-choco">La vista 3D no está disponible en este navegador. Podés seguir editando el diseño.</p> : this.props.children
  }
}

function designId(name: string) {
  const slug = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return (slug || 'diseno') + '-' + crypto.randomUUID().slice(0, 4)
}

export default function DesignEditor({ initial, services, onClose, onSaved }: { initial: Design; services: Service[]; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState(initial)
  const saveId = useRef(initial.id)
  const [tags, setTags] = useState(initial.tags.join(', '))
  const action = useAction()
  const upload = useAction()
  const busy = action.busy || upload.busy
  function patch(change: Partial<Design>) { setDraft(current => ({ ...current, ...change })) }
  async function save() {
    const name = draft.name.trim()
    if (!name) throw new Error('Ingresá el nombre del diseño.')
    saveId.current ||= designId(name)
    await api.saveDesign({ ...draft, id: saveId.current, name, tags: tags.split(',').map(t => t.trim()).filter(Boolean) })
    toast.ok('Diseño guardado.')
    onSaved()
  }
  function remove() {
    if (!window.confirm('¿Querés eliminar el diseño «' + initial.name + '» de forma definitiva?')) return
    void action.run(async () => { await api.deleteDesign(initial.id); toast.ok('Diseño eliminado.'); onSaved() })
  }
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center gap-4">
      <Button variant="outline" size="sm" disabled={busy} icon={<ArrowLeft />} onClick={onClose}>Volver a diseños</Button>
      <h2 className={heading}>{initial.id ? 'Editar diseño' : 'Nuevo diseño'}</h2>
    </div>
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="min-w-0 lg:sticky lg:top-5">
        <PreviewBoundary><Suspense fallback={<Skeleton className="h-[420px] lg:h-[560px]" />}>
          <HandViewer params={draft.params} focus className="h-[420px] overflow-hidden rounded-[28px] bg-gris-50 lg:h-[560px]" />
        </Suspense></PreviewBoundary>
      </div>
      <form onSubmit={e => { e.preventDefault(); void action.run(save) }} className="min-w-0">
        <fieldset disabled={busy} className="grid min-w-0 gap-5">
          <section className={panel + ' grid gap-4'}>
            <h3 className={heading}>Ficha del diseño</h3>
            <Field label="Nombre" required value={draft.name} onChange={e => patch({ name: e.target.value })} />
            <TextArea label="Descripción" value={draft.description ?? ''} onChange={e => patch({ description: e.target.value })} />
            <Field label="Etiquetas" hint="Separalas con comas." value={tags} onChange={e => setTags(e.target.value)} />
            <Select label="Servicio sugerido" value={draft.serviceId ?? ''} onChange={e => patch({ serviceId: e.target.value || undefined })}>
              <option value="">Sin sugerencia</option>{services.map(s => <option key={s.id} value={s.id}>{s.name}{s.active ? '' : ' (inactivo)'}</option>)}
            </Select>
            <Field label="Foto del trabajo" type="file" accept="image/*" className="py-2 text-sm" onChange={e => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) void upload.run(async () => {
                const photoUrl = await api.uploadDesignPhoto(file, file.name)
                patch({ photoUrl })
                toast.ok('Foto cargada.')
              })
            }} />
            {upload.busy && <p role="status" className="text-sm text-choco">Subiendo foto…</p>}
            <ErrorText message={upload.error} />
            {draft.photoUrl && <img src={assetUrl(draft.photoUrl)} className="max-h-48 rounded-2xl object-contain" alt="Foto del diseño" />}
            <Field label="Orden" type="number" required value={Number.isFinite(draft.sort) ? draft.sort : ''} onChange={e => patch({ sort: e.target.valueAsNumber })} />
            <Switch label="Diseño activo" checked={draft.active} onChange={active => patch({ active })} />
          </section>
          <LayerControls params={draft.params} onChange={params => patch({ params })} />
          <ErrorText message={action.error} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={action.busy}>Guardar diseño</Button>
            {initial.id && <Button type="button" variant="danger" icon={<Trash />} onClick={remove}>Eliminar diseño</Button>}
          </div>
        </fieldset>
      </form>
    </div>
  </div>
}
