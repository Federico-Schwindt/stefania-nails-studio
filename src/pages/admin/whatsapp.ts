import { money } from '../../lib/pricing'
import { parseIso } from '../../lib/slots'
import type { Booking, Settings } from '../../lib/types'

export const templateNames: Record<keyof Settings['waTemplates'], string> = {
  confirm: 'Confirmar turno', reminder: 'Recordatorio', payment: 'Pedir seña', thanks: 'Gracias',
}
export type TemplateKey = keyof typeof templateNames
export const templateKeys = Object.keys(templateNames) as TemplateKey[]

export function fillTemplate(tpl: string, booking: Booking, settings: Settings) {
  const template = Object.hasOwn(templateNames, tpl) ? settings.waTemplates[tpl as TemplateKey] : tpl
  const values: Record<string, string> = {
    nombre: booking.clientName, fecha: parseIso(booking.date).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', ''),
    hora: booking.time, servicio: booking.serviceName, codigo: booking.code, sena: money(booking.deposit),
    total: money(booking.total), saldo: money(Math.max(0, booking.total - booking.paidAmount)),
  }
  return template.replace(/\{(\w+)\}/g, (token, key: string) => values[key] ?? token)
}

export function waLink(phone: string, text = '') {
  let number = phone.replace(/\D/g, '').replace(/^00/, '')
  const international = number.startsWith('54')
  if (international) number = number.slice(2)
  number = number.replace(/^0+/, '')
  if (number.startsWith('9') && number.length === 11) number = number.slice(1)
  if (number.length === 12) number = number.replace(/^(\d{2,4})15(\d{6,8})$/, '$1$2')
  if (number.startsWith('15') && number.length !== 10) number = number.slice(2)
  return 'https://wa.me/549' + number + (text ? '?text=' + encodeURIComponent(text) : '')
}
