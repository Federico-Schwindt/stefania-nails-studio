import { useState } from 'react'
import { Button, Field, Select, TextArea, toast } from '../../components/ui'
import { api } from '../../lib/api'
import type { Settings } from '../../lib/types'
import { ErrorText, heading, LoadState, panel, useAction, useLoad } from './shared'

const getSettings = () => api.getSettings()
function SettingsForm({ initial }: { initial: Settings }) {
  const [mode, setMode] = useState(initial.depositMode)
  const action = useAction()
  return <form onSubmit={e => {
    e.preventDefault()
    const values = new FormData(e.currentTarget)
    const get = (name: string) => String(values.get(name) ?? '').trim()
    void action.run(async () => {
      await api.saveSettings({ depositMode: mode, depositValue: Number(get('deposit')), slotStepMin: Number(get('step')),
        minNoticeHours: Number(get('notice')), maxDaysAhead: Number(get('ahead')), whatsapp: get('whatsapp'), instagram: get('instagram'),
        address: get('address'), paymentsMode: get('payments') === 'mercadopago' && api.mode !== 'demo' ? 'mercadopago' : 'simulated',
        policies: get('policies').split(/\r?\n/).map(p => p.trim()).filter(Boolean) })
      toast.ok('Ajustes guardados.')
    })
  }}>
    <fieldset disabled={action.busy} className="space-y-5">
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <div className="grid gap-5">
          <section className={panel + ' grid gap-4'}>
            <h2 className={heading}>Seña y cobros</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Tipo de seña" value={mode} onChange={e => setMode(e.target.value as Settings['depositMode'])}><option value="fixed">Monto fijo</option><option value="percent">Porcentaje</option></Select>
              <Field label={mode === 'fixed' ? 'Seña ($)' : 'Seña (%)'} name="deposit" type="number" min="0" step={mode === 'percent' ? 'any' : 1} max={mode === 'percent' ? 100 : undefined} required defaultValue={initial.depositValue} />
            </div>
            <Select label="Medio de pago" name="payments" defaultValue={api.mode === 'demo' ? 'simulated' : initial.paymentsMode} hint="Para cobrar con Mercado Pago necesitás el backend Supabase y tu access token configurado (docs/BACKEND.md)">
              <option value="simulated">Pago de prueba (simulado)</option><option value="mercadopago" disabled={api.mode === 'demo'}>Mercado Pago</option>
            </Select>
          </section>
          <section className={panel + ' grid gap-4'}><h2 className={heading}>Reservas</h2>
            <Field name="step" label="Intervalo entre horarios (minutos)" type="number" min="1" required defaultValue={initial.slotStepMin} />
            <Field name="notice" label="Anticipación mínima (horas)" type="number" min="0" step="any" required defaultValue={initial.minNoticeHours} />
            <Field name="ahead" label="Anticipación máxima (días)" type="number" min="0" required defaultValue={initial.maxDaysAhead} />
          </section>
        </div>
        <div className="grid gap-5">
          <section className={panel + ' grid gap-4'}><h2 className={heading}>Contacto</h2>
            <Field label="WhatsApp" name="whatsapp" type="tel" defaultValue={initial.whatsapp} />
            <Field label="Instagram" name="instagram" defaultValue={initial.instagram} />
            <Field label="Dirección" name="address" defaultValue={initial.address} />
          </section>
          <section className={panel + ' grid gap-4'}><h2 className={heading}>Políticas del estudio</h2>
            <TextArea label="Políticas de reserva" hint="Escribí una política por línea." rows={9} name="policies" defaultValue={initial.policies.join('\n')} />
          </section>
        </div>
      </div>
      <ErrorText message={action.error} /><Button loading={action.busy}>Guardar ajustes</Button>
    </fieldset>
  </form>
}

export default function SettingsPage() {
  const load = useLoad(getSettings)
  return load.data ? <SettingsForm initial={load.data} /> : <LoadState {...load} />
}
