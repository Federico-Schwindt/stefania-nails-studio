import type {
  BlockedSlot,
  Booking,
  BookingStatus,
  BusySlot,
  ClientDetail,
  Client,
  Design,
  Extra,
  NewBookingInput,
  NewWaitlistInput,
  PayMethod,
  PaymentStart,
  Service,
  Settings,
  Stats,
  WaitlistEntry,
  WorkingHours,
} from '../types'

/**
 * Contrato único de datos. Implementaciones:
 *  - `local.ts` modo demo (IndexedDB del navegador), para probar sin base de datos.
 *  - `neon.ts`  base real en Neon (Postgres). El navegador sólo puede ejecutar las funciones
 *               del esquema `api` con un rol restringido; las tablas no son accesibles.
 */
export interface Api {
  readonly mode: 'demo' | 'neon'

  // ---------- Público ----------
  getServices(): Promise<Service[]>
  getExtras(): Promise<Extra[]>
  getDesigns(): Promise<Design[]>
  getSettings(): Promise<Settings>
  getWorkingHours(): Promise<WorkingHours[]>
  getBlocked(from: string, to: string): Promise<BlockedSlot[]>
  /** Turnos ocupados (sin datos personales) entre dos fechas inclusive. */
  getBusy(from: string, to: string): Promise<BusySlot[]>
  /** Sube una imagen (inspiración, comprobante o foto de diseño) y devuelve una URL/ref para guardar. */
  uploadImage(file: Blob, filename: string): Promise<string>
  /** Resuelve una ref devuelta por uploadImage a algo usable en <img src>. Las URLs normales se devuelven igual. */
  resolveImage(ref: string): Promise<string>
  /** Crea la reserva en estado pending_payment. Valida solapamientos del lado del servidor. */
  createBooking(input: NewBookingInput): Promise<Booking>
  /** Lectura pública de una reserva por id (UUID no adivinable). */
  getBooking(id: string): Promise<Booking | null>
  /** Busca un turno por código + teléfono (para "Mi turno"). */
  findBooking(code: string, phone: string): Promise<Booking | null>
  /** La clienta cancela su turno. Falla si faltan menos de settings.cancelHours. */
  cancelBookingByClient(id: string, phone: string): Promise<Booking>
  /** Inicia el pago de la seña (devuelve a dónde ir). */
  startPayment(bookingId: string): Promise<PaymentStart>
  /** La clienta avisa que pagó la seña (con comprobante opcional). Pasa a payment_review. */
  reportDeposit(bookingId: string, method: PayMethod, proofUrl?: string): Promise<Booking>
  /** Sólo modo simulado: marca la seña como pagada. */
  confirmSimulatedPayment(bookingId: string, approved: boolean): Promise<Booking>
  /** Anotarse en la lista de espera. */
  joinWaitlist(input: NewWaitlistInput): Promise<void>

  // ---------- Admin ----------
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  isAdmin(): Promise<boolean>
  changePassword(current: string, next: string): Promise<void>
  listBookings(from: string, to: string): Promise<Booking[]>
  updateBookingStatus(id: string, status: BookingStatus, adminNotes?: string): Promise<Booking>
  /** Registra un cobro (seña o saldo). amount se suma a paidAmount. */
  recordPayment(id: string, amount: number, method: PayMethod, kind: 'deposit' | 'balance'): Promise<Booking>
  /** Marca que se envió un recordatorio por WhatsApp. */
  markReminded(id: string): Promise<Booking>
  /** Reserva creada por el admin (ej. turno tomado por WhatsApp). Queda confirmada. */
  createManualBooking(input: NewBookingInput): Promise<Booking>
  /** Cambia día/horario de un turno existente (valida solapamientos). */
  rescheduleBooking(id: string, date: string, time: string): Promise<Booking>
  deleteBooking(id: string): Promise<void>
  listClients(search?: string): Promise<Client[]>
  getClient(phone: string): Promise<ClientDetail | null>
  saveClient(phone: string, data: { name?: string; notes?: string; birthday?: string; instagram?: string }): Promise<void>
  getStats(from: string, to: string): Promise<Stats>
  listWaitlist(): Promise<WaitlistEntry[]>
  updateWaitlist(id: string, status: WaitlistEntry['status']): Promise<void>
  deleteWaitlist(id: string): Promise<void>
  saveDesign(design: Design): Promise<Design>
  deleteDesign(id: string): Promise<void>
  saveService(service: Service): Promise<Service>
  deleteService(id: string): Promise<void>
  saveExtra(extra: Extra): Promise<Extra>
  deleteExtra(id: string): Promise<void>
  saveWorkingHours(hours: WorkingHours[]): Promise<void>
  addBlocked(slot: Omit<BlockedSlot, 'id'>): Promise<BlockedSlot>
  removeBlocked(id: string): Promise<void>
  saveSettings(settings: Settings): Promise<void>
}
