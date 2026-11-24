import type { BookingExtra, Extra, Service, Settings } from './types'

export function computeExtras(extras: Extra[], selected: { extraId: string; qty: number }[]): BookingExtra[] {
  const out: BookingExtra[] = []
  for (const sel of selected) {
    const ex = extras.find((e) => e.id === sel.extraId && e.active)
    if (!ex) continue
    const qty = ex.mode === 'flat' ? 1 : Math.min(Math.max(1, Math.round(sel.qty)), ex.maxQty)
    out.push({ extraId: ex.id, name: ex.name, price: ex.price, qty })
  }
  return out
}

export function computeTotal(service: Service, extras: BookingExtra[]): number {
  return service.price + extras.reduce((acc, e) => acc + e.price * e.qty, 0)
}

export function computeDeposit(total: number, settings: Settings): number {
  if (settings.depositMode === 'percent') return Math.round((total * settings.depositValue) / 100)
  return Math.min(settings.depositValue, total)
}

const ars = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
export const money = (n: number) => ars.format(n).replace(/\s/g, '')
