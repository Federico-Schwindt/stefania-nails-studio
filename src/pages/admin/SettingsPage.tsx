import { useState } from 'react'
import { Button, Field, Select, TextArea, toast } from '../../components/ui'
import { api } from '../../lib/api'
import type { Settings } from '../../lib/types'
import { ErrorText, heading, LoadState, panel, useAction, useLoad } from './shared'

import { templateKeys, templateNames } from './whatsapp'

function Security() {
  const action = useAction()
  return <section className={panel + ' mt-5 max-w-xl'}><h2 className={heading}>Seguridad</h2>
    <form className="mt-4" onSubmit={e => {
      e.preventDefault()
      const form = e.currentTarget
      const data = new FormData(form)
      void action.run(async () => {
        await api.changePassword(String(data.get('current')), String(data.get('next')))
        form.reset(); toast.ok('Contraseña actualizada.')
      })
    }}><fieldset className="grid gap-4" disabled={action.busy}>
      <Field type="password" label="Contraseña actual" name="current" autoComplete="current-password" required />
      <Field type="password" label="Contraseña nueva" name="next" autoComplete="new-password" minLength={8} required hint="Usá al menos 8 caracteres." />
      <ErrorText message={action.error} /><Button loading={action.busy} variant="outline">Cambiar contraseña</Button>
    </fieldset></form>
  </section>
}
const templateVariables = '{nombre} {fecha} {hora} {servicio} {codigo} {sena} {total} {saldo}'
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
        cancelHours: Number(get('cancelHours')), minNoticeHours: Number(get('notice')), maxDaysAhead: Number(get('ahead')), whatsapp: get('whatsapp'), instagram: get('instagram'),
        address: get('address'), mapsUrl: get('mapsUrl'), paymentsMode: get('payments') === 'manual' ? 'manual' : 'simulated',
        transferAlias: get('transferAlias'), transferCbu: get('transferCbu'), transferHolder: get('transferHolder'), mpLink: get('mpLink'),
        waTemplates: { confirm: get('confirm'), reminder: get('reminder'), payment: get('payment'), thanks: get('thanks') },
        policies: get('policies').split(/\r?\n/).map(p => p.trim()).filter(Boolean) })
      toast.ok('Ajustes guardados.')
    })
  }}>
    <fieldset disabled={action.busy} className="space-y-5">
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <div className="grid gap-5">
          <section className={panel + ' grid gap-4'}>
            <h2 className={heading}>Seña</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Tipo de seña" value={mode} onChange={e => setMode(e.target.value as Settings['depositMode'])}><option value="fixed">Monto fijo</option><option value="percent">Porcentaje</option></Select>
              <Field label={mode === 'fixed' ? 'Seña ($)' : 'Seña (%)'} name="deposit" type="number" min="0" step={mode === 'percent' ? 'any' : 1} max={mode === 'percent' ? 100 : undefined} required defaultValue={initial.depositValue} />
            </div>
          </section>
          <section className={panel + ' grid gap-4'}><h2 className={heading}>Cobro de la seña</h2>
            <Select label="Modo de cobro" name="payments" defaultValue={initial.paymentsMode}>
              <option value="manual">Transferencia o link de Mercado Pago (vos verificás)</option>
              <option value="simulated">Pago de prueba (simulado)</option>
            </Select>
            <Field label="Alias" name="transferAlias" defaultValue={initial.transferAlias} />
            <Field label="CBU o CVU" name="transferCbu" inputMode="numeric" defaultValue={initial.transferCbu} />
            <Field label="Titular de la cuenta" name="transferHolder" defaultValue={initial.transferHolder} />
            <Field label="Link de Mercado Pago" name="mpLink" type="url" defaultValue={initial.mpLink} hint="Creá un link de pago en la app de Mercado Pago por el monto de la seña y pegalo acá" />
          </section>
          <section className={panel + ' grid gap-4'}><h2 className={heading}>Reservas online</h2>
            <Field name="step" label="Intervalo entre horarios (minutos)" type="number" min="1" required defaultValue={initial.slotStepMin} />
            <Field name="notice" label="Anticipación mínima (horas)" type="number" min="0" step="1" required defaultValue={initial.minNoticeHours} />
            <Field name="ahead" label="Anticipación máxima (días)" type="number" min="0" required defaultValue={initial.maxDaysAhead} />
            <Field label="Anticipación para cancelar (horas)" name="cancelHours" type="number" min="0" required defaultValue={initial.cancelHours} />
          </section>
        </div>
        <div className="grid gap-5">
          <section className={panel + ' grid gap-4'}><h2 className={heading}>Contacto</h2>
            <Field label="WhatsApp" name="whatsapp" type="tel" defaultValue={initial.whatsapp} />
            <Field label="Instagram" name="instagram" defaultValue={initial.instagram} />
            <Field label="Enlace de Google Maps" name="mapsUrl" type="url" defaultValue={initial.mapsUrl} />
            <Field label="Dirección" name="address" defaultValue={initial.address} />
          </section>
          <section className={panel + ' grid gap-4'}><h2 className={heading}>Plantillas de WhatsApp</h2>
            <p className="text-sm text-choco">Podés usar {templateVariables}.</p>
            {templateKeys.map(key => <TextArea key={key} label={templateNames[key]} name={key} required defaultValue={initial.waTemplates[key]} />)}
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
  return load.data ? <><SettingsForm initial={load.data} /><Security /></> : <LoadState {...load} />
}
