import { useState } from 'react'
import { Button, Chip, Field, Select } from '../../components/ui'
import { FINGERS, type AccentType, type Finger, type Finish, type NailDesignParams, type NailLayer, type NailShape, type PatternType, type TipStyle } from '../../lib/types'
import { heading, panel, Switch } from './shared'

const shapes: Record<NailShape, string> = { almond: 'Almendra', oval: 'Ovalada', square: 'Cuadrada', squoval: 'Squoval', coffin: 'Coffin', stiletto: 'Stiletto' }
const fingers: Record<Finger, string> = { thumb: 'Pulgar', index: 'Índice', middle: 'Medio', ring: 'Anular', pinky: 'Meñique' }
const tips: Record<TipStyle, string> = { none: 'Sin punta', french: 'Francesita', 'deep-french': 'Francesita profunda', 'v-french': 'Francesita en V', 'micro-french': 'Micro francesita', ombre: 'Baby boomer' }
const patterns: Record<PatternType, string> = { none: 'Sin estampado', dots: 'Puntitos', flowers: 'Flores', stars: 'Estrellas', hearts: 'Corazones', lines: 'Rayas', cow: 'Vaquita', leopard: 'Leopardo', tortoise: 'Carey', swirl: 'Ondas' }
const finishes: Record<Finish, string> = { gloss: 'Brillo', matte: 'Mate', chrome: 'Espejo', glitter: 'Glitter', 'cat-eye': 'Ojo de gato' }
const accents: Record<AccentType, string> = { none: 'Sin aplicación', strass: 'Strass', 'gold-line': 'Filo dorado', pearl: 'Perla', charm: 'Dije' }

function Range({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="grid gap-2 text-sm font-semibold">
    <span className="flex items-center justify-between">{label}<span className="font-normal tabular-nums text-choco">{Math.round(value * 100)} %</span></span>
    <input type="range" aria-label={label} min="0" max="1" step="0.01" value={value} onChange={e => onChange(e.target.valueAsNumber)} className="h-8 w-full cursor-pointer accent-bordo" />
  </label>
}

function Choice<T extends string>({ label, options, value, onChange }: { label: string; options: Record<T, string>; value: T; onChange: (v: T) => void }) {
  return <Select label={label} value={value} onChange={e => onChange(e.target.value as T)}>
    {(Object.keys(options) as T[]).map(key => <option key={key} value={key}>{options[key]}</option>)}
  </Select>
}

export default function LayerControls({ params, onChange }: { params: NailDesignParams; onChange: (value: NailDesignParams) => void }) {
  const [finger, setFinger] = useState<'all' | Finger>('all')
  const overrides = finger === 'all' ? undefined : params.fingers?.[finger]
  const layer = { ...params.all, ...overrides }
  function edit(change: Partial<NailLayer>) {
    if (finger === 'all') onChange({ ...params, all: { ...params.all, ...change } })
    else onChange({ ...params, fingers: { ...params.fingers, [finger]: { ...overrides, ...change } } })
  }
  function reset() {
    if (finger === 'all') return
    const remaining = { ...params.fingers }
    delete remaining[finger]
    onChange({ ...params, fingers: remaining })
  }
  return <>
    <section className={panel + ' space-y-5'}>
      <h3 className={heading}>Forma y largo</h3>
      <div role="group" aria-label="Forma" className="flex flex-wrap gap-2">{(Object.keys(shapes) as NailShape[]).map(key =>
        <Chip type="button" key={key} active={params.shape === key} onClick={() => onChange({ ...params, shape: key })}>{shapes[key]}</Chip>)}</div>
      <Range label="Largo" value={params.length} onChange={length => onChange({ ...params, length })} />
    </section>
    <section className={panel + ' space-y-5'}>
      <h3 className={heading}>Capa</h3>
      <div role="group" aria-label="Uñas a editar" className="flex flex-wrap gap-2">
        <Chip type="button" active={finger === 'all'} onClick={() => setFinger('all')}>Todas</Chip>
        {FINGERS.map(f => <Chip type="button" key={f} active={f === finger} onClick={() => setFinger(f)}>{fingers[f]}</Chip>)}
      </div>
      {finger !== 'all' && <Button type="button" variant="outline" size="sm" disabled={!overrides} onClick={reset}>Restablecer este dedo</Button>}
      <div className="grid items-end gap-4 sm:grid-cols-2">
        <Field label="Color base" type="color" value={layer.base} onChange={e => edit({ base: e.target.value })} />
        <Range label="Opacidad de la base" value={layer.baseOpacity} onChange={baseOpacity => edit({ baseOpacity })} />
        <Choice label="Estilo de punta" options={tips} value={layer.tip} onChange={tip => edit({ tip })} />
        <Field label="Color de la punta" type="color" value={layer.tipColor} onChange={e => edit({ tipColor: e.target.value })} />
        <Range label="Tamaño de la punta" value={layer.tipSize} onChange={tipSize => edit({ tipSize })} />
        <Switch label="Punta metalizada" checked={!!layer.tipMetal} onChange={tipMetal => edit({ tipMetal })} />
        <Choice label="Estampado" options={patterns} value={layer.pattern} onChange={pattern => edit({ pattern })} />
        <Range label="Escala del estampado" value={layer.patternScale} onChange={patternScale => edit({ patternScale })} />
        <Field label="Color del estampado" type="color" value={layer.patternColor} onChange={e => edit({ patternColor: e.target.value })} />
        <Field label="Segundo color" type="color" value={layer.patternColor2 ?? layer.patternColor} onChange={e => edit({ patternColor2: e.target.value })} />
        <Choice label="Acabado" options={finishes} value={layer.finish} onChange={finish => edit({ finish })} />
        <Field label="Color del acabado" type="color" value={layer.finishColor ?? '#dcdcdc'} onChange={e => edit({ finishColor: e.target.value })} />
        <Choice label="Aplicación" options={accents} value={layer.accent} onChange={accent => edit({ accent })} />
        <Field label="Color de la aplicación" type="color" value={layer.accentColor ?? '#d4ad62'} onChange={e => edit({ accentColor: e.target.value })} />
      </div>
    </section>
  </>
}
