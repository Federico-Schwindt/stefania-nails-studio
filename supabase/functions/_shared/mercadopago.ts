import { createClient } from 'npm:@supabase/supabase-js@2'
import { HttpError } from './cors.ts'

export function env(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new HttpError(500, 'Falta configurar el servicio de pagos.')
  return value
}

export function database() {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
type Database = ReturnType<typeof database>

export function isBookingId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value)
}

export function paymentId(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return String(value)
  if (typeof value === 'string' && /^[0-9]{1,32}$/.test(value)) return value
}

export async function mpRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch('https://api.mercadopago.com' + path, {
    ...options,
    headers: {
      Authorization: 'Bearer ' + env('MP_ACCESS_TOKEN'),
      'Content-Type': 'application/json',
      ...options.headers,
    },
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) {
    console.error('Mercado Pago respondió', response.status, response.headers.get('x-request-id'))
    if (response.status === 404) throw new HttpError(404, 'Mercado Pago no encontró el pago o la preferencia.')
    throw new HttpError(502, 'Mercado Pago no pudo completar la operación.')
  }
  return await response.json() as T
}

type Payment = {
  id: number | string
  status: string
  external_reference: string | null
  currency_id: string
  transaction_amount: number
}

export async function applyPayment(db: Database, id: string, expectedBooking?: string) {
  const payment = await mpRequest<Payment>('/v1/payments/' + encodeURIComponent(id))
  if (paymentId(payment.id) !== id || !payment.status) {
    throw new HttpError(502, 'Mercado Pago devolvió datos de pago incompletos.')
  }
  if (expectedBooking && payment.external_reference !== expectedBooking) {
    throw new HttpError(409, 'El pago no corresponde a esta reserva.')
  }
  if (!isBookingId(payment.external_reference)) return null
  const { data: booking, error } = await db.from('bookings').select('id, deposit')
    .eq('id', payment.external_reference).maybeSingle<{ id: string; deposit: number }>()
  if (error) throw new HttpError(500, error.message)
  if (!booking) return null
  if (payment.status === 'approved' &&
      (payment.currency_id !== 'ARS' || payment.transaction_amount !== booking.deposit)) {
    throw new HttpError(409, 'El importe o la moneda del pago no coinciden con la seña.')
  }
  const result = await db.rpc('record_mp_payment', {
    p_id: booking.id, p_payment_id: id, p_status: payment.status,
  }).maybeSingle<Record<string, unknown>>()
  if (result.error) throw new HttpError(500, result.error.message)
  return result.data
}

export async function validSignature(headers: Headers, id: string, secret: string): Promise<boolean> {
  const parts = (headers.get('x-signature') ?? '').split(',').map(part => part.trim())
  const ts = parts.find(part => part.startsWith('ts='))?.slice(3)
  const v1 = parts.find(part => part.startsWith('v1='))?.slice(3)
  const requestId = headers.get('x-request-id')
  if (!ts || !/^\d+$/.test(ts) || !v1 || !/^[0-9a-f]{64}$/i.test(v1) || !requestId) return false
  const encoder = new TextEncoder()
  const manifest = 'id:' + id + ';request-id:' + requestId + ';ts:' + ts + ';'
  const signature = Uint8Array.from(v1.match(/../g)!, byte => Number.parseInt(byte, 16))
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
  return crypto.subtle.verify('HMAC', key, signature, encoder.encode(manifest))
}
