import { useState } from 'react'
import { WhatsappLogo } from '@phosphor-icons/react'
import { Img, openImage } from '../../components/Img'
import { Button, Field, Select, toast } from '../../components/ui'
import { api } from '../../lib/api'
import { money } from '../../lib/pricing'
import type { Booking, PayMethod, Settings } from '../../lib/types'
import { AdminSheet, ErrorText, useAction } from './shared'
import { finishes, methodNames, shapes, statusNames } from './labels'
import { fillTemplate, waLink, templateNames, type TemplateKey } from './whatsapp'

export const linkPill = 'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-bordo ring-1 ring-inset ring-gris hover:bg-bordo-50'
export function WhatsApp({ booking, settings, template, label, onClick }: {
  booking: Booking; settings: Settings; template: TemplateKey; label?: string; onClick?: () => void
}) {
  return <a className={linkPill} target="_blank" rel="noreferrer" onClick={onClick}
    href={waLink(booking.phone, fillTemplate(template, booking, settings))}><WhatsappLogo size={17} />{label ?? templateNames[template]}</a>
}

export function BookingStyle({ booking: b }: { booking: Booking }) {
  return <div className="flex flex-wrap items-center gap-2 text-xs text-choco">
    {b.designName && <span className="rounded-full bg-gris-50 px-3 py-1">{b.designName}</span>}
    {b.color && <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 ring-1 ring-inset ring-gris">
      <span className="size-4 shrink-0 rounded-full ring-1 ring-inset ring-black/10" style={{ backgroundColor: b.color.hex }} />
      {b.color.name} · {finishes[b.color.finish]} · {shapes[b.color.shape]}</span>}
  </div>
}
export function StatusPill({ status }: { status: Booking['status'] }) {
  const style = status === 'paid' ? 'bg-bordo text-white' : ['payment_review', 'confirmed'].includes(status) ? 'bg-bordo-50 text-bordo' : 'bg-gris-100 text-choco'
  return <span className={'inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ' + style}>{statusNames[status]}</span>
}

export function Photo({ src, label }: { src: string; label: string }) {
  return <button type="button" aria-label={'Abrir ' + label} className="overflow-hidden rounded-2xl ring-1 ring-gris"
    onClick={() => {
      if (/["<>]/.test(src)) { toast.error('Revisá la imagen.'); return }
      void openImage(src).catch(() => toast.error('No se pudo abrir la imagen.'))
    }}><Img src={src} alt={label} className="aspect-square w-24 object-cover" /></button>
}

export function Totals({ booking: b }: { booking: Booking }) {
  return <dl className="grid grid-cols-3 gap-2 rounded-2xl bg-gris-50 p-3 text-sm">
    {([['Total', b.total], ['Cobrado', b.paidAmount], ['Saldo', Math.max(0, b.total - b.paidAmount)]] as const).map(([label, value]) =>
      <div key={label}><dt className="text-xs text-choco">{label}</dt><dd className="break-words font-semibold">{money(value)}</dd></div>)}
  </dl>
}
export function PaymentDialog({ booking: b, onClose, onPaid, balanceOnly = false }: {
  booking: Booking; onClose: () => void; onPaid: () => void; balanceOnly?: boolean
}) {
  const action = useAction()
  const [kind, setKind] = useState<'balance' | 'deposit'>('balance')
  const [amount, setAmount] = useState(String(Math.max(0, b.total - b.paidAmount)))
  const [method, setMethod] = useState<PayMethod>('cash')
  return <AdminSheet title={balanceOnly ? 'Cobrar saldo' : 'Registrar cobro'} onClose={() => { if (!action.busy) onClose() }}>
    <p className="mb-4">{b.clientName} · {b.serviceName}</p><Totals booking={b} />
    <form className="mt-4" onSubmit={e => { e.preventDefault(); void action.run(async () => {
      await api.recordPayment(b.id, Number(amount), method, kind)
      toast.ok('Cobro registrado.'); onPaid()
    }) }}>
      <fieldset disabled={action.busy} className="grid gap-4">
        {!balanceOnly && <Select label="Concepto" value={kind} onChange={e => {
          const next = e.target.value === 'deposit' ? 'deposit' : 'balance'
          setKind(next); setAmount(String(next === 'deposit' ? b.deposit : Math.max(0, b.total - b.paidAmount)))
        }}><option value="balance">Saldo</option><option value="deposit">Seña</option></Select>}
        <Field label="Importe ($)" type="number" min="1" step="1" required value={amount} onChange={e => setAmount(e.target.value)} />
        <Select label="Medio de pago" value={method} onChange={e => setMethod(e.target.value as PayMethod)}>
          {(['cash', 'transfer', 'mercadopago'] as const).map(m => <option key={m} value={m}>{methodNames[m]}</option>)}
        </Select>
        <ErrorText message={action.error} /><Button loading={action.busy}>Registrar cobro</Button>
      </fieldset>
    </form>
  </AdminSheet>
}
