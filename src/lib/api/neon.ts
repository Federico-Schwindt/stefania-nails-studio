// Backend real: Neon (Postgres) consultado desde el navegador por HTTP con un rol restringido
// que sólo puede ejecutar funciones del esquema `api`. Ver db/neon/schema.sql.
import { neon } from '@neondatabase/serverless'
import type {
  BlockedSlot,
  Booking,
  BusySlot,
  Client,
  ClientDetail,
  Design,
  Extra,
  Service,
  Settings,
  Stats,
  WaitlistEntry,
  WorkingHours,
} from '../types'
import type { Api } from './types'

interface Catalog {
  services: Service[]
  extras: Extra[]
  designs: Design[]
  settings: Settings
  hours: WorkingHours[]
}

const TOKEN_KEY = 'sns-admin-token'

async function toBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer())
  let s = ''
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  return btoa(s)
}

/** Reduce la imagen antes de guardarla (máx. 1400 px, JPEG ~0,82). */
async function compress(file: Blob, max = 1400, quality = 0.82): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo leer la imagen.'))), 'image/jpeg', quality))
  } catch {
    throw new Error('No pudimos leer esa imagen. Probá con una foto JPG o PNG.')
  }
}

export function createNeonApi(url: string): Api {
  const sql = neon(url, { disableWarningInBrowsers: true })
  const token = () => localStorage.getItem(TOKEN_KEY) ?? ''

  async function call<T>(fn: string, ...args: unknown[]): Promise<T> {
    const params = args.map((a) => (a !== null && typeof a === 'object' ? JSON.stringify(a) : a))
    const placeholders = args.map((a, i) => `$${i + 1}${a !== null && typeof a === 'object' ? '::jsonb' : ''}`).join(', ')
    try {
      const rows = (await sql.query(`select api.${fn}(${placeholders}) as r`, params)) as { r: T }[]
      return rows[0]?.r as T
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (/sesión venció/i.test(msg)) localStorage.removeItem(TOKEN_KEY)
      // los mensajes de las funciones ya están en español; los de red no
      throw new Error(/fetch|network|failed/i.test(msg) ? 'No hay conexión. Revisá internet y probá de nuevo.' : msg.replace(/^error:\s*/i, ''))
    }
  }

  let catalog: Promise<Catalog> | null = null
  const getCatalog = () => {
    if (!catalog) {
      catalog = (token() ? call<Catalog>('admin_catalog', token()).catch(() => call<Catalog>('catalog')) : call<Catalog>('catalog')).catch((e) => {
        catalog = null
        throw e
      })
    }
    return catalog
  }
  const invalidate = () => {
    catalog = null
  }
  const images = new Map<string, Promise<string>>()

  return {
    mode: 'neon',

    getServices: async () => (await getCatalog()).services,
    getExtras: async () => (await getCatalog()).extras,
    getDesigns: async () => (await getCatalog()).designs,
    getSettings: async () => (await getCatalog()).settings,
    getWorkingHours: async () => (await getCatalog()).hours,
    getBlocked: (from, to) => call<BlockedSlot[]>('blocked', from, to),
    getBusy: (from, to) => call<BusySlot[]>('busy', from, to),

    async uploadImage(file) {
      const small = await compress(file)
      return call<string>('upload_image', await toBase64(small), 'image/jpeg')
    },
    resolveImage(ref) {
      if (!ref.startsWith('img:')) return Promise.resolve(ref)
      let p = images.get(ref)
      if (!p) {
        p = call<string>('image', ref.slice(4)).then((d) => d ?? '')
        p.catch(() => images.delete(ref))
        images.set(ref, p)
      }
      return p
    },

    createBooking: (input) => call<Booking>('create_booking', input),
    getBooking: (id) => call<Booking | null>('get_booking', id),
    findBooking: (code, phone) => call<Booking | null>('find_booking', code, phone),
    cancelBookingByClient: (id, phone) => call<Booking>('cancel_booking', id, phone),
    async startPayment(bookingId) {
      const s = (await getCatalog()).settings
      return s.paymentsMode === 'simulated'
        ? { redirectUrl: `#/pago-simulado/${bookingId}`, mode: 'simulated' }
        : { redirectUrl: `#/sena/${bookingId}`, mode: 'manual' }
    },
    reportDeposit: (id, method, proof) => call<Booking>('report_deposit', id, method, proof ?? null),
    confirmSimulatedPayment: (id, approved) => call<Booking>('confirm_simulated', id, approved),
    joinWaitlist: (input) => call<void>('join_waitlist', input),

    async signIn(_email, password) {
      const t = await call<string>('admin_login', password)
      localStorage.setItem(TOKEN_KEY, t)
      invalidate()
    },
    async signOut() {
      const t = token()
      localStorage.removeItem(TOKEN_KEY)
      invalidate()
      if (t) await call('admin_logout', t).catch(() => {})
    },
    async isAdmin() {
      const t = token()
      if (!t) return false
      const ok = await call<boolean>('admin_check', t).catch(() => false)
      if (!ok) localStorage.removeItem(TOKEN_KEY)
      return ok
    },
    changePassword: (current, next) => call<void>('admin_change_password', token(), current, next),
    listBookings: (from, to) => call<Booking[]>('admin_bookings', token(), from, to),
    updateBookingStatus: (id, status, notes) => call<Booking>('admin_set_status', token(), id, status, notes ?? null),
    recordPayment: (id, amount, method, kind) => call<Booking>('admin_record_payment', token(), id, Math.round(amount), method, kind),
    markReminded: (id) => call<Booking>('admin_mark_reminded', token(), id),
    createManualBooking: (input) => call<Booking>('admin_create_booking', token(), input),
    rescheduleBooking: (id, date, time) => call<Booking>('admin_reschedule', token(), id, date, time),
    deleteBooking: (id) => call<void>('admin_delete_booking', token(), id),
    listClients: (search) => call<Client[]>('admin_clients', token(), search ?? ''),
    getClient: (phone) => call<ClientDetail | null>('admin_client', token(), phone),
    saveClient: (phone, data) => call<void>('admin_save_client', token(), phone, data),
    getStats: (from, to) => call<Stats>('admin_stats', token(), from, to),
    listWaitlist: () => call<WaitlistEntry[]>('admin_waitlist', token()),
    updateWaitlist: (id, status) => call<void>('admin_waitlist_status', token(), id, status),
    deleteWaitlist: (id) => call<void>('admin_waitlist_delete', token(), id),
    async saveDesign(design) {
      const r = await call<Design>('admin_save_design', token(), design)
      invalidate()
      return r
    },
    async deleteDesign(id) {
      await call('admin_delete_design', token(), id)
      invalidate()
    },
    async saveService(service) {
      const r = await call<Service>('admin_save_service', token(), service)
      invalidate()
      return r
    },
    async deleteService(id) {
      await call('admin_delete_service', token(), id)
      invalidate()
    },
    async saveExtra(extra) {
      const r = await call<Extra>('admin_save_extra', token(), extra)
      invalidate()
      return r
    },
    async deleteExtra(id) {
      await call('admin_delete_extra', token(), id)
      invalidate()
    },
    async saveWorkingHours(hours) {
      await call('admin_save_hours', token(), hours)
      invalidate()
    },
    addBlocked: (slot) => call<BlockedSlot>('admin_add_blocked', token(), slot),
    removeBlocked: (id) => call<void>('admin_remove_blocked', token(), id),
    async saveSettings(settings) {
      await call('admin_save_settings', token(), settings)
      invalidate()
    },
  }
}
