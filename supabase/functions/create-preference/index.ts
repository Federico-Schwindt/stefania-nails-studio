import { corsHeaders, failure, HttpError, json, readObject } from '../_shared/cors.ts'
import { applyPayment, database, env, isBookingId, mpRequest, paymentId } from '../_shared/mercadopago.ts'

interface Preference {
  id: string
  init_point: string
  sandbox_init_point: string
}

interface CheckoutBooking {
  id: string
  code: string
  service_name: string
  client_name: string
  deposit: number
  status: string
  created_at: string
  mp_preference_id: string | null
}

function fetchPreference(id: string) {
  return mpRequest<Preference>('/checkout/preferences/' + encodeURIComponent(id))
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Usá el método POST.' }, 405)
  try {
    const body = await readObject(req)
    if (!isBookingId(body.bookingId)) throw new HttpError(400, 'El identificador de la reserva es inválido.')
    const db = database()
    if (body.action === 'verify') {
      const id = paymentId(body.paymentId)
      if (!id) throw new HttpError(400, 'Falta un identificador de pago válido.')
      const updated = await applyPayment(db, id, body.bookingId)
      if (!updated) throw new HttpError(404, 'No se encontró la reserva.')
      return json(updated)
    }
    if (body.action !== undefined && body.action !== 'create') throw new HttpError(400, 'Acción desconocida.')
    const { data: b, error } = await db.from('bookings')
      .select('id,code,service_name,client_name,deposit,status,created_at,mp_preference_id')
      .eq('id', body.bookingId).maybeSingle<CheckoutBooking>()
    if (error) throw new HttpError(500, error.message)
    if (!b) throw new HttpError(404, 'No se encontró la reserva.')
    if (b.status !== 'pending_payment') throw new HttpError(409, 'La reserva no tiene un pago pendiente.')
    if (Date.parse(b.created_at) + 30 * 60_000 <= Date.now()) throw new HttpError(409, 'Venció el plazo de pago. Volvé a reservar.')
    const settings = await db.from('settings').select('data').eq('id', 1).single<{ data: { paymentsMode: string } }>()
    if (settings.error) throw new HttpError(500, settings.error.message)
    if (settings.data.data.paymentsMode !== 'mercadopago') throw new HttpError(409, 'Mercado Pago está desactivado.')

    const back = env('SITE_URL').replace(/\/+$/, '') + '/?reserva=' + b.id
    const now = Date.now()
    let pref = b.mp_preference_id
      ? await fetchPreference(b.mp_preference_id)
      : await mpRequest<Preference>('/checkout/preferences', {
        method: 'POST',
        headers: { 'X-Idempotency-Key': b.id },
        body: JSON.stringify({
          items: [{ id: b.code, title: 'Seña ' + b.service_name + ' · Stefania Nails Studio',
            quantity: 1, unit_price: b.deposit, currency_id: 'ARS' }],
          payer: { name: b.client_name }, external_reference: b.id,
          back_urls: { success: back, failure: back, pending: back }, auto_return: 'approved',
          notification_url: env('SUPABASE_URL').replace(/\/+$/, '') + '/functions/v1/mp-webhook',
          statement_descriptor: 'STEFANIA NAILS', expires: true,
          expiration_date_from: new Date(now).toISOString(),
          expiration_date_to: new Date(now + 30 * 60_000).toISOString(),
        }),
      })
    if (!pref.id) throw new HttpError(502, 'Mercado Pago no devolvió una preferencia.')
    if (!b.mp_preference_id) {
      const saved = await db.from('bookings').update({ mp_preference_id: pref.id })
        .eq('id', b.id).eq('status', 'pending_payment').is('mp_preference_id', null).select('id').maybeSingle()
      if (saved.error) throw new HttpError(500, saved.error.message)
      if (!saved.data) {
        // Si hubo dos clics simultáneos, ambos deben redirigir a la misma preferencia.
        const current = await db.from('bookings').select('mp_preference_id').eq('id', b.id)
          .eq('status', 'pending_payment').maybeSingle<{ mp_preference_id: string | null }>()
        if (current.error) throw new HttpError(500, current.error.message)
        if (!current.data?.mp_preference_id) throw new HttpError(409, 'La reserva ya no está pendiente de pago.')
        pref = await fetchPreference(current.data.mp_preference_id)
      }
    }
    const redirectUrl = env('MP_ACCESS_TOKEN').startsWith('TEST-') ? pref.sandbox_init_point : pref.init_point
    if (!redirectUrl) throw new HttpError(502, 'Mercado Pago no devolvió un enlace de pago.')
    return json({ redirectUrl, preferenceId: pref.id, mode: 'mercadopago' })
  } catch (error) {
    return failure(error)
  }
})
