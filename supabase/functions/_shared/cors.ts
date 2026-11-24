export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { ...corsHeaders, 'Cache-Control': 'no-store' } })
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function readObject(req: Request): Promise<Record<string, unknown>> {
  const value: unknown = await req.json().catch(() => null)
  return isObject(value) ? value : {}
}

export function failure(error: unknown): Response {
  if (error instanceof HttpError) return json({ error: error.message }, error.status)
  console.error('Error interno de pagos', error instanceof Error ? error.name : 'desconocido')
  return json({ error: 'No se pudo procesar el pago. Volvé a intentar.' }, 500)
}
