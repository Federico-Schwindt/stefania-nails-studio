import { useState } from 'react'
import { CaretDown, Plus, Trash } from '@phosphor-icons/react'
import { Button, Field, Select, TextArea, toast } from '../../components/ui'
import { api } from '../../lib/api'
import { money } from '../../lib/pricing'
import type { Extra, Service } from '../../lib/types'
import { ErrorText, heading, LoadState, panel, Switch, useAction, useLoad } from './shared'

type Item = Service | Extra
type Kind = 'service' | 'extra'
const getCatalog = () => Promise.all([api.getServices(), api.getExtras()])

function ItemRow({ item, fresh, onSave, onRemove }: { item: Item; fresh: boolean; onSave: (item: Item) => void; onRemove: () => void }) {
  const service = 'durationMin' in item
  const [active, setActive] = useState(item.active)
  const [priceFrom, setPriceFrom] = useState(service && item.priceFrom)
  const [mode, setMode] = useState<Extra['mode']>('mode' in item ? item.mode : 'unit')
  const action = useAction()
  function remove() {
    if (fresh) { onRemove(); return }
    if (!window.confirm('¿Querés eliminar «' + item.name + '»?')) return
    void action.run(async () => {
      if (service) await api.deleteService(item.id)
      else await api.deleteExtra(item.id)
      toast.ok(service ? 'Servicio eliminado.' : 'Extra eliminado.')
      onRemove()
    })
  }
  return <details open={fresh || undefined} className="group rounded-[28px] bg-white ring-1 ring-inset ring-gris">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-[28px] px-5 py-4 [&::-webkit-details-marker]:hidden">
      <div className="min-w-0"><h3 className="break-words text-2xl text-bordo">{item.name || (service ? 'Nuevo servicio' : 'Nuevo extra')}</h3>
        {!fresh && <p className="mt-1 text-sm text-choco">{service && item.priceFrom && 'Desde '}{money(item.price)} · {service ? item.durationMin + ' min' : item.mode === 'unit' ? 'Por unidad' : 'Precio fijo'} · {item.active ? 'Activo' : 'Inactivo'}</p>}
      </div><CaretDown size={20} className="shrink-0 text-bordo transition group-open:rotate-180" />
    </summary>
    <form className="px-5 pb-5" onSubmit={e => {
      e.preventDefault()
      const values = new FormData(e.currentTarget)
      const get = (key: string) => String(values.get(key) ?? '').trim()
      void action.run(async () => {
        const name = get('name')
        if (!name) throw new Error('Ingresá un nombre.')
        const common = { id: item.id, name, price: Number(get('price')), sort: Number(get('sort')), active }
        const result = service ? await api.saveService({ ...common, description: get('description'), priceFrom, durationMin: Number(get('duration')) })
          : await api.saveExtra({ ...common, mode, maxQty: Number(get('qty')) })
        onSave(result)
        toast.ok(service ? 'Servicio guardado.' : 'Extra guardado.')
      })
    }}>
      <fieldset disabled={action.busy} className="grid gap-4 border-t border-gris/60 pt-4">
        <Field label="Nombre" name="name" required defaultValue={item.name} />
        {service && <TextArea label="Descripción" name="description" defaultValue={item.description} />}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Precio ($)" type="number" min="0" name="price" required defaultValue={item.price} />
          <Field label="Orden" name="sort" type="number" required defaultValue={item.sort} />
        </div>
        {service ? <>
          <Field label="Duración (minutos)" type="number" min="5" max="720" name="duration" required defaultValue={item.durationMin} />
          <Switch label="Mostrar precio desde" checked={priceFrom} onChange={setPriceFrom} />
        </> : <>
          <Select label="Modalidad" value={mode} onChange={e => setMode(e.target.value as Extra['mode'])}><option value="unit">Por unidad</option><option value="flat">Precio fijo</option></Select>
          <Field label="Cantidad máxima" type="number" min="1" max="50" name="qty" required defaultValue={item.maxQty} />
        </>}
        <Switch label={service ? 'Servicio activo' : 'Extra activo'} checked={active} onChange={setActive} />
        <ErrorText message={action.error} />
        <div className="flex flex-wrap gap-2">
          <Button loading={action.busy}>{service ? 'Guardar servicio' : 'Guardar extra'}</Button>
          <Button type="button" variant="outline" icon={<Trash />} onClick={remove}>{fresh ? 'Descartar' : 'Eliminar'}</Button>
        </div>
      </fieldset>
    </form>
  </details>
}

function ItemList({ initial, kind }: { initial: Item[]; kind: Kind }) {
  const [items, setItems] = useState(initial)
  const [newItem, setNewItem] = useState<Item>()
  const service = kind === 'service'
  function add() {
    const common = { id: crypto.randomUUID(), name: '', price: 0, sort: Math.max(0, ...items.map(i => i.sort)) + 1, active: true }
    setNewItem(service ? { ...common, priceFrom: false, durationMin: 60 } : { ...common, mode: 'unit', maxQty: 10 })
  }
  return <section className="min-w-0 space-y-3">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
      <h2 className={heading}>{service ? 'Servicios del estudio' : 'Extras'}</h2>
      <Button onClick={add} size="sm" variant="outline" icon={<Plus />} disabled={!!newItem}>{service ? 'Agregar servicio' : 'Agregar extra'}</Button>
    </div>
    {newItem && <ItemRow key={newItem.id} item={newItem} fresh onRemove={() => setNewItem(undefined)} onSave={saved => { setItems(prev => [...prev, saved]); setNewItem(undefined) }} />}
    {!items.length && !newItem && <p className={panel + ' text-sm text-choco'}>{service ? 'Todavía no cargaste servicios.' : 'Todavía no cargaste extras.'}</p>}
    {[...items].sort((a, b) => a.sort - b.sort).map(item => <ItemRow key={item.id} item={item} fresh={false}
      onSave={saved => setItems(prev => prev.map(i => i.id === saved.id ? saved : i))}
      onRemove={() => setItems(prev => prev.filter(i => i.id !== item.id))} />)}
  </section>
}

export default function Services() {
  const load = useLoad(getCatalog)
  if (!load.data) return <LoadState {...load} />
  return <div className="grid items-start gap-8 xl:grid-cols-2"><ItemList initial={load.data[0]} kind="service" /><ItemList initial={load.data[1]} kind="extra" /></div>
}
