import type {
  BlockedSlot,
  Booking,
  BookingStatus,
  BusySlot,
  Design,
  Extra,
  NewBookingInput,
  PaymentStart,
  Service,
  Settings,
  WorkingHours,
} from '../types'

/**
 * Contrato único de datos. Hay dos implementaciones:
 *  - `local.ts`    modo demo (localStorage + IndexedDB) para GitHub Pages sin backend.
 *  - `supabase.ts` backend real (Postgres + Storage + Edge Functions de Mercado Pago).
 */
export interface Api {
  readonly mode: 'demo' | 'supabase'

  // ---------- Público ----------
  getServices(): Promise<Service[]>
  getExtras(): Promise<Extra[]>
  getDesigns(): Promise<Design[]>
  getSettings(): Promise<Settings>
  getWorkingHours(): Promise<WorkingHours[]>
  getBlocked(from: string, to: string): Promise<BlockedSlot[]>
  /** Turnos ocupados (sin datos personales) entre dos fechas inclusive. */
  getBusy(from: string, to: string): Promise<BusySlot[]>
  /** Sube una imagen de inspiración y devuelve su URL pública. */
  uploadInspo(file: Blob, filename: string): Promise<string>
  /** Crea la reserva en estado pending_payment. Valida solapamientos del lado del servidor. */
  createBooking(input: NewBookingInput): Promise<Booking>
  /** Lectura pública de una reserva por id (sólo para la clienta que la creó: id es UUID no adivinable). */
  getBooking(id: string): Promise<Booking | null>
  /** Inicia el pago de la seña. */
  startPayment(bookingId: string): Promise<PaymentStart>
  /** Sólo modo simulado: marca la seña como pagada. */
  confirmSimulatedPayment(bookingId: string, approved: boolean): Promise<Booking>

  // ---------- Admin ----------
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  isAdmin(): Promise<boolean>
  listBookings(from: string, to: string): Promise<Booking[]>
  updateBookingStatus(id: string, status: BookingStatus, adminNotes?: string): Promise<Booking>
  /** Reserva creada por el admin (ej. turno tomado por WhatsApp). Queda confirmada. */
  createManualBooking(input: NewBookingInput): Promise<Booking>
  deleteBooking(id: string): Promise<void>
  saveDesign(design: Design): Promise<Design>
  deleteDesign(id: string): Promise<void>
  uploadDesignPhoto(file: Blob, filename: string): Promise<string>
  saveService(service: Service): Promise<Service>
  deleteService(id: string): Promise<void>
  saveExtra(extra: Extra): Promise<Extra>
  deleteExtra(id: string): Promise<void>
  saveWorkingHours(hours: WorkingHours[]): Promise<void>
  addBlocked(slot: Omit<BlockedSlot, 'id'>): Promise<BlockedSlot>
  removeBlocked(id: string): Promise<void>
  saveSettings(settings: Settings): Promise<void>
}
