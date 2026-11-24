import { failure, HttpError, isObject, json, readObject } from '../_shared/cors.ts'
import { applyPayment, database, paymentId, validSignature } from '../_shared/mercadopago.ts'

Deno.serve(async req => {
  try {
    const query = new URL(req.url).searchParams
    const body = req.body ? await readObject(req) : {}
    const topic = query.get('type') ?? query.get('topic') ?? body.type
    if (topic !== 'payment') return json({ ok: true })
    const id = paymentId(query.get('data.id') ?? query.get('id') ?? (isObject(body.data) ? body.data.id : undefined))
    if (!id) throw new HttpError(400, 'Falta el identificador del pago.')
    const secret = Deno.env.get('MP_WEBHOOK_SECRET')
    if (secret && !await validSignature(req.headers, id, secret)) throw new HttpError(401, 'Firma de notificación inválida.')
    await applyPayment(database(), id)
    return json({ ok: true })
  } catch (error) {
    return failure(error)
  }
})
