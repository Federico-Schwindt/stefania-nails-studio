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
  | 'pending_payment' // creada, falta pagar la seña
  | 'paid' // seña acreditada, espera confirmación del admin
  | 'confirmed' // confirmada por el admin
  | 'completed'
  | 'cancelled'
  | 'rejected'

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
  inspoUrls: string[] // imágenes de inspiración subidas por la clienta
  date: string // YYYY-MM-DD
  time: string // HH:mm
  durationMin: number
  total: number
  deposit: number
  status: BookingStatus
  paymentId?: string
  paymentStatus?: string
  paymentMethod?: 'mercadopago' | 'simulated' | 'manual'
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
  whatsapp: string // ej. 543446571429
  instagram: string // ej. stefania.studionails
  address?: string
  paymentsMode: 'simulated' | 'mercadopago'
  policies: string[]
}

export interface BusySlot {
  date: string
  time: string
  durationMin: number
}

export interface PaymentStart {
  /** URL a la que hay que redirigir (Mercado Pago Checkout Pro o simulador interno). */
  redirectUrl: string
  mode: 'simulated' | 'mercadopago'
  preferenceId?: string
}
