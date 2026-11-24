import type { Finish, NailShape, PayMethod, BookingStatus } from '../../lib/types'

export const shapes: Record<NailShape, string> = { almond: 'Almendra', oval: 'Ovalada', square: 'Cuadrada', squoval: 'Squoval', coffin: 'Coffin', stiletto: 'Stiletto' }
export const finishes: Record<Finish, string> = { gloss: 'Brillo', matte: 'Mate', chrome: 'Espejo', glitter: 'Glitter', 'cat-eye': 'Ojo de gato' }
export const methodNames: Record<PayMethod, string> = { cash: 'Efectivo', transfer: 'Transferencia', mercadopago: 'Mercado Pago', simulated: 'Pago de prueba', other: 'Otro' }
export const statusNames: Record<BookingStatus, string> = {
  pending_payment: 'Pendiente de pago', payment_review: 'Seña en revisión', paid: 'Por confirmar', confirmed: 'Confirmado',
  completed: 'Completado', no_show: 'No vino', rejected: 'Rechazado', cancelled: 'Cancelado',
}
export const activeStatus = (status: BookingStatus) => ['pending_payment', 'payment_review', 'paid', 'confirmed'].includes(status)
