// Tipos de dominio compartidos por el frontend, el modo demo y el backend Supabase.
// Fechas en formato ISO local: date = 'YYYY-MM-DD', time = 'HH:mm'.

export type Finger = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky'
export const FINGERS: Finger[] = ['thumb', 'index', 'middle', 'ring', 'pinky']

export type NailShape = 'almond' | 'oval' | 'square' | 'squoval' | 'coffin' | 'stiletto'
export type TipStyle = 'none' | 'french' | 'deep-french' | 'v-french' | 'micro-french' | 'ombre'
export type Finish = 'gloss' | 'matte' | 'chrome' | 'glitter' | 'cat-eye'
export type PatternType =
  | 'none'
  | 'dots'
  | 'flowers'
  | 'stars'
  | 'hearts'
  | 'lines'
  | 'cow'
  | 'leopard'
  | 'tortoise'
  | 'swirl'
export type AccentType = 'none' | 'strass' | 'gold-line' | 'charm' | 'pearl'

/** Capa de diseño que se puede aplicar a todas las uñas o sólo a algunas (uña "acento"). */
export interface NailLayer {
  base: string // color base (hex)
  baseOpacity: number // 0..1 (nude translúcido < 1)
  tip: TipStyle
  tipColor: string
  tipSize: number // 0..1
  tipMetal?: boolean // punta metalizada (dorado / plateado espejado)
  pattern: PatternType
  patternColor: string
  patternColor2?: string
  patternScale: number // 0..1
  finish: Finish
  finishColor?: string // color del chrome / glitter / cat-eye
  accent: AccentType
  accentColor?: string
}

export interface NailDesignParams {
  shape: NailShape
  length: number // 0 (corta) .. 1 (larga)
  all: NailLayer
  /** Overrides por dedo (parciales sobre `all`). */
  fingers?: Partial<Record<Finger, Partial<NailLayer>>>
}

export interface Design {
  id: string
  name: string
  description?: string
  tags: string[]
  photoUrl?: string // foto real del trabajo
  renderUrl?: string // render fotorrealista del diseño sobre la mano modelo
  params: NailDesignParams
  serviceId?: string // servicio sugerido
  active: boolean
  sort: number
  createdAt?: string
}

export interface Service {
  id: string
  name: string
  description?: string
  price: number // ARS
  priceFrom: boolean // "desde $..."
  durationMin: number
  active: boolean
  sort: number
}

export interface Extra {
  id: string
  name: string
  price: number
  /** 'unit' = precio por unidad (ej. por uña), 'flat' = precio fijo */
  mode: 'unit' | 'flat'
  maxQty: number
  active: boolean
  sort: number
}

export interface BookingExtra {
  extraId: string
  name: string
  price: number
  qty: number
}

export type BookingStatus =
  | 'pending_payment' // creada, falta la seña
  | 'payment_review' // la clienta avisó que pagó (transferencia / link): Stefania lo verifica
  | 'paid' // seña acreditada, espera confirmación del admin
  | 'confirmed' // confirmada por el admin
  | 'completed' // atendida
  | 'no_show' // no vino
  | 'cancelled'
  | 'rejected'

/** Cómo pagó la clienta la seña o el saldo. */
export type PayMethod = 'transfer' | 'mercadopago' | 'cash' | 'simulated' | 'other'

export interface ColorChoice {
  hex: string
  name: string
  finish: Finish
  shape: NailShape
}

export interface Booking {
  id: string
  code: string // código corto legible, ej. "SN-4F7K"
  createdAt: string
  clientName: string
  phone: string
  instagram?: string
  notes?: string
  serviceId: string
  serviceName: string
  extras: BookingExtra[]
  designId?: string
  designName?: string
  color?: ColorChoice
  inspoUrls: string[] // imágenes de inspiración subidas por la clienta
  date: string // YYYY-MM-DD
  time: string // HH:mm
  durationMin: number
  total: number
  deposit: number
  /** Total cobrado hasta ahora (seña + saldo). */
  paidAmount: number
  status: BookingStatus
  depositMethod?: PayMethod
  depositProofUrl?: string // comprobante de transferencia subido por la clienta
  balanceMethod?: PayMethod
  paymentId?: string
  remindedAt?: string // último recordatorio enviado por WhatsApp
  adminNotes?: string
}

export interface NewBookingInput {
  clientName: string
  phone: string
  instagram?: string
  notes?: string
  serviceId: string
  extras: { extraId: string; qty: number }[]
  designId?: string
  color?: ColorChoice
  inspoUrls: string[]
  date: string
  time: string
}

/** Horario semanal. weekday: 0 = domingo .. 6 = sábado */
export interface WorkingHours {
  weekday: number
  enabled: boolean
  start: string // HH:mm
  end: string // HH:mm
}

export interface BlockedSlot {
  id: string
  date: string
  /** Si start/end están vacíos se bloquea el día completo. */
  start?: string
  end?: string
  reason?: string
}

export interface Settings {
  depositMode: 'fixed' | 'percent'
  depositValue: number // ARS si fixed, % si percent
  slotStepMin: number // granularidad de turnos (ej. 30)
  minNoticeHours: number // anticipación mínima para reservar
  maxDaysAhead: number
  cancelHours: number // hasta cuántas horas antes la clienta puede cancelar sola (políticas: 24)
  whatsapp: string // ej. 5493446571429
  instagram: string // ej. stefania.studionails
  address?: string
  mapsUrl?: string
  /** simulated = demo sin cobro; manual = transferencia y/o link de Mercado Pago que Stefania verifica. */
  paymentsMode: 'simulated' | 'manual'
  transferAlias?: string
  transferCbu?: string
  transferHolder?: string
  mpLink?: string // link de pago de Mercado Pago para la seña
  policies: string[]
  /** Plantillas de WhatsApp. Variables: {nombre} {fecha} {hora} {servicio} {codigo} {sena} {total} {saldo} */
  waTemplates: { confirm: string; reminder: string; payment: string; thanks: string }
}

export interface BusySlot {
  date: string
  time: string
  durationMin: number
}

export interface PaymentStart {
  /** Ruta interna o URL a la que hay que llevar a la clienta para pagar la seña. */
  redirectUrl: string
  mode: 'simulated' | 'manual'
}

// ---------- Panel de Stefania ----------

export interface Client {
  phone: string // clave: teléfono normalizado (sólo dígitos)
  name: string
  instagram?: string
  notes?: string // notas privadas (alergias, preferencias, forma de uña, etc.)
  birthday?: string // MM-DD
  visits: number // turnos atendidos
  noShows: number
  cancellations: number
  totalSpent: number // suma cobrada en turnos atendidos
  firstVisit?: string // YYYY-MM-DD
  lastVisit?: string
  nextBooking?: { id: string; date: string; time: string; serviceName: string }
}

export interface ClientDetail {
  client: Client
  bookings: Booking[]
}

export interface WaitlistEntry {
  id: string
  createdAt: string
  name: string
  phone: string
  serviceId?: string
  serviceName?: string
  preferred: string // texto libre: días/horarios que le sirven
  status: 'open' | 'contacted' | 'booked' | 'closed'
}

export interface NewWaitlistInput {
  name: string
  phone: string
  serviceId?: string
  preferred: string
}

export interface Stats {
  from: string
  to: string
  bookings: number // turnos en el período (no cancelados ni rechazados)
  completed: number
  noShows: number
  cancelled: number
  revenue: number // cobrado en turnos atendidos
  depositsCollected: number // señas cobradas en el período
  expected: number // total de turnos confirmados/pendientes por atender
  newClients: number
  byService: { serviceId: string; name: string; count: number; revenue: number }[]
  byDay: { date: string; count: number; revenue: number }[]
  byMethod: { method: PayMethod; amount: number }[]
  topDesigns: { name: string; count: number }[]
}
