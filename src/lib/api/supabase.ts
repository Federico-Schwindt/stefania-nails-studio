import { createClient, FunctionsHttpError } from '@supabase/supabase-js'
import type { Api } from './types'
import type {
  BlockedSlot, Booking, BusySlot, Design, Extra, NewBookingInput, PaymentStart, Service, Settings, WorkingHours,
} from '../types'

type ServiceRow = Pick<Service, 'id' | 'name' | 'price' | 'active' | 'sort'> & {
  description: string | null; price_from: boolean; duration_min: number
}
type ExtraRow = Omit<Extra, 'maxQty'> & { max_qty: number }
type DesignRow = Pick<Design, 'id' | 'name' | 'tags' | 'params' | 'active' | 'sort'> & {
  description: string | null; photo_url: string | null; render_url: string | null; service_id: string | null; created_at: string
}
type BookingRow = Pick<Booking, 'id' | 'code' | 'phone' | 'extras' | 'date' | 'time' | 'total' | 'deposit' | 'status'> & {
  created_at: string; client_name: string; instagram: string | null; notes: string | null
  service_id: string; service_name: string; design_id: string | null; design_name: string | null
  inspo_urls: string[]; duration_min: number; payment_id: string | null; payment_status: string | null
  payment_method: NonNullable<Booking['paymentMethod']> | null; mp_preference_id: string | null; admin_notes: string | null
}
type BlockedRow = { id: string; date: string; start: string | null; end: string | null; reason: string | null }
type BusyRow = { date: string; time: string; duration_min: number }
type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] }
type Rpc<Args, Returns> = { Args: Args; Returns: Returns }
type Database = {
  public: {
    Tables: {
      services: Table<ServiceRow>; extras: Table<ExtraRow>; designs: Table<DesignRow>; bookings: Table<BookingRow>
      working_hours: Table<{ [K in keyof WorkingHours]: WorkingHours[K] }>
      blocked_slots: Table<BlockedRow>; settings: Table<{ id: number; data: Settings }>
    }
    Views: Record<never, never>
    Functions: {
      is_admin: Rpc<Record<never, never>, boolean>
      get_busy: Rpc<{ p_from: string; p_to: string }, BusyRow[]>
      get_booking: Rpc<{ p_id: string }, BookingRow | null>
      create_booking: Rpc<{ p: NewBookingInput }, BookingRow>
      create_manual_booking: Rpc<{ p: NewBookingInput }, BookingRow>
      confirm_simulated_payment: Rpc<{ p_id: string; p_approved: boolean }, BookingRow>
    }
  }
}

const hhmm = (time: string) => time.slice(0, 5)
function service({ description, price_from, duration_min, ...rest }: ServiceRow): Service {
  return { ...rest, description: description ?? undefined, priceFrom: price_from, durationMin: duration_min }
}
function extra({ max_qty, ...rest }: ExtraRow): Extra {
  return { ...rest, maxQty: max_qty }
}
function design({ description, photo_url, render_url, service_id, created_at, ...rest }: DesignRow): Design {
  return { ...rest, description: description ?? undefined, photoUrl: photo_url ?? undefined, renderUrl: render_url ?? undefined,
    serviceId: service_id ?? undefined, createdAt: created_at }
}
function booking(r: BookingRow): Booking {
  return {
    id: r.id, code: r.code, createdAt: r.created_at, clientName: r.client_name, phone: r.phone,
    instagram: r.instagram ?? undefined, notes: r.notes ?? undefined, serviceId: r.service_id,
    serviceName: r.service_name, extras: r.extras, designId: r.design_id ?? undefined,
    designName: r.design_name ?? undefined, inspoUrls: r.inspo_urls, date: r.date, time: hhmm(r.time),
    durationMin: r.duration_min, total: r.total, deposit: r.deposit, status: r.status, paymentId: r.payment_id ?? undefined,
    paymentStatus: r.payment_status ?? undefined, paymentMethod: r.payment_method ?? undefined, adminNotes: r.admin_notes ?? undefined,
  }
}
function blocked(r: BlockedRow): BlockedSlot {
  return { id: r.id, date: r.date, start: r.start ? hhmm(r.start) : undefined,
    end: r.end ? hhmm(r.end) : undefined, reason: r.reason ?? undefined }
}

type Result<T> = { data: T; error: null } | { data: unknown; error: { message: string } }
function data<T>(result: Result<T>): T {
  if (result.error) throw new Error(result.error.message)
  return result.data
}
async function allRows<T>(page: (from: number, to: number) => PromiseLike<Result<T[]>>): Promise<T[]> {
  const rows: T[] = []
  for (;;) {
    const batch = data(await page(rows.length, rows.length + 499))
    rows.push(...batch)
    if (batch.length < 500) return rows
  }
}

type Verify = (bookingId: string, paymentId: string) => Promise<Booking>
const verifiers = new WeakMap<Api, Verify>()

export async function verifyPayment(api: Api, bookingId: string, paymentId: string): Promise<Booking> {
  const verify = verifiers.get(api)
  if (!verify) throw new Error('La verificación de Mercado Pago requiere una conexión a Supabase.')
  return verify(bookingId, paymentId)
}

export function createSupabaseApi(url: string, anonKey: string): Api {
  const db = createClient<Database>(url, anonKey)

  async function invoke<T>(body: { action: 'create' | 'verify'; bookingId: string; paymentId?: string }): Promise<T> {
    const result = await db.functions.invoke<T>('create-preference', { body })
    if (result.error instanceof FunctionsHttpError && result.error.context instanceof Response) {
      const payload = await result.error.context.json().catch(() => null)
      if (typeof payload?.error === 'string') throw new Error(payload.error)
    }
    if (result.error) throw new Error(result.error.message)
    if (result.data == null) throw new Error('El servicio de pagos devolvió una respuesta vacía.')
    return result.data
  }
  async function upload(bucket: 'inspo' | 'designs', file: Blob, filename: string) {
    const clean = filename.split(/[\\/]/).pop()?.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^[.-]+/, '').slice(-120) || 'imagen'
    const path = new Date().toISOString().slice(0, 7) + '/' + crypto.randomUUID() + '-' + clean
    const storage = db.storage.from(bucket)
    data(await storage.upload(path, file, { contentType: file.type || undefined }))
    return storage.getPublicUrl(path).data.publicUrl
  }
  async function remove(table: 'services' | 'extras' | 'designs' | 'bookings' | 'blocked_slots', id: string) {
    data(await db.from(table).delete().eq('id', id).select('id').single())
  }
  async function getSettings() {
    return data(await db.from('settings').select('data').eq('id', 1).single<{ data: Settings }>()).data
  }

  const api: Api = {
    mode: 'supabase',
    // Las políticas SELECT filtran los inactivos con la misma sesión que hace la consulta.
    async getServices() {
      return (await allRows((a,b) => db.from('services').select().order('sort').order('id').range(a,b))).map(service)
    },
    async getExtras() {
      return (await allRows((a,b) => db.from('extras').select().order('sort').order('id').range(a,b))).map(extra)
    },
    async getDesigns() {
      return (await allRows((a,b) => db.from('designs').select().order('sort').order('id').range(a,b))).map(design)
    },
    getSettings,
    async getWorkingHours() {
      return data(await db.from('working_hours').select().order('weekday'))
        .map(row => ({ ...row, start: hhmm(row.start), end: hhmm(row.end) }))
    },
    async getBlocked(from, to) {
      return (await allRows((a,b) => db.from('blocked_slots').select().gte('date', from).lte('date', to)
        .order('date').order('start').order('id').range(a,b))).map(blocked)
    },
    async getBusy(from, to) {
      const rows = await allRows((a,b) => db.rpc('get_busy', { p_from: from, p_to: to }).order('date').order('time').range(a,b))
      return rows.map((r): BusySlot => ({ date: r.date, time: hhmm(r.time), durationMin: r.duration_min }))
    },
    uploadInspo: (file, filename) => upload('inspo', file, filename),
    async createBooking(input) {
      return booking(data(await db.rpc('create_booking', { p: input }).single<BookingRow>()))
    },
    async getBooking(id) {
      const row = data(await db.rpc('get_booking', { p_id: id }).maybeSingle<BookingRow>())
      return row?.id ? booking(row) : null
    },
    async startPayment(bookingId) {
      if ((await getSettings()).paymentsMode === 'simulated') {
        return { redirectUrl: '#/pago-simulado/' + bookingId, mode: 'simulated' }
      }
      return invoke<PaymentStart>({ action: 'create', bookingId })
    },
    async confirmSimulatedPayment(bookingId, approved) {
      return booking(data(await db.rpc('confirm_simulated_payment', { p_id: bookingId, p_approved: approved }).single<BookingRow>()))
    },
    async signIn(email, password) {
      data(await db.auth.signInWithPassword({ email, password }))
    },
    async signOut() {
      const { error } = await db.auth.signOut()
      if (error) throw new Error(error.message)
    },
    async isAdmin() {
      const { data: auth, error } = await db.auth.getSession()
      if (error) throw new Error(error.message)
      return !!auth.session && data(await db.rpc('is_admin'))
    },
    async listBookings(from, to) {
      return (await allRows((a,b) => db.from('bookings').select().gte('date', from).lte('date', to)
        .order('date').order('time').order('id').range(a,b))).map(booking)
    },
    async updateBookingStatus(id, status, adminNotes) {
      return booking(data(await db.from('bookings').update({ status, admin_notes: adminNotes })
        .eq('id', id).select().single<BookingRow>()))
    },
    async createManualBooking(input) {
      return booking(data(await db.rpc('create_manual_booking', { p: input }).single<BookingRow>()))
    },
    deleteBooking: id => remove('bookings', id),
    async saveDesign({ description, photoUrl, renderUrl, serviceId, createdAt, ...rest }) {
      return design(data(await db.from('designs').upsert({ ...rest, description: description ?? null,
        photo_url: photoUrl ?? null, render_url: renderUrl ?? null, service_id: serviceId ?? null, created_at: createdAt }, { onConflict: 'id' })
        .select().single<DesignRow>()))
    },
    deleteDesign: id => remove('designs', id),
    uploadDesignPhoto: (file, filename) => upload('designs', file, filename),
    async saveService({ description, priceFrom, durationMin, ...rest }) {
      return service(data(await db.from('services').upsert({ ...rest, description: description ?? null,
        price_from: priceFrom, duration_min: durationMin }, { onConflict: 'id' }).select().single<ServiceRow>()))
    },
    deleteService: id => remove('services', id),
    async saveExtra({ maxQty, ...rest }) {
      return extra(data(await db.from('extras').upsert({ ...rest, max_qty: maxQty }, { onConflict: 'id' }).select().single<ExtraRow>()))
    },
    deleteExtra: id => remove('extras', id),
    async saveWorkingHours(hours) {
      data(await db.from('working_hours').upsert(hours, { onConflict: 'weekday' }))
    },
    async addBlocked(slot) {
      return blocked(data(await db.from('blocked_slots').insert({ ...slot, start: slot.start || null, end: slot.end || null })
        .select().single<BlockedRow>()))
    },
    removeBlocked: id => remove('blocked_slots', id),
    async saveSettings(settings) {
      data(await db.from('settings').upsert({ id: 1, data: settings }, { onConflict: 'id' }))
    },
  }
  verifiers.set(api, async (bookingId, paymentId) =>
    booking(await invoke<BookingRow>({ action: 'verify', bookingId, paymentId })))
  return api
}
