// Modo demo: toda la información vive en IndexedDB del navegador.
// Sirve para mostrar y probar el sitio en GitHub Pages sin backend.
// Para una agenda real compartida entre clientas y admin, configurá Supabase (docs/BACKEND.md).

import { SEED_DESIGNS, SEED_EXTRAS, SEED_HOURS, SEED_SERVICES, SEED_SETTINGS } from '../../data/seed'
import { computeDeposit, computeExtras, computeTotal } from '../pricing'
import { availableTimes } from '../slots'
import type {
  BlockedSlot,
  Booking,
  BookingStatus,
  BusySlot,
  Design,
  Extra,
  NewBookingInput,
  Service,
  Settings,
  WorkingHours,
} from '../types'
import type { Api } from './types'

interface DB {
  version: 1
  services: Service[]
  extras: Extra[]
  designs: Design[]
  hours: WorkingHours[]
  blocked: BlockedSlot[]
  settings: Settings
  bookings: Booking[]
  images: Record<string, string>
}

export const DEMO_ADMIN_PASSWORD = 'stefania'
const DB_NAME = 'stefania-nails-demo'
const KEY = 'db'
const SESSION_KEY = 'sns-demo-admin'

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore('kv')
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
async function kvGet<T>(key: string): Promise<T | undefined> {
  const db = await idb()
  return new Promise((resolve, reject) => {
    const r = db.transaction('kv').objectStore('kv').get(key)
    r.onsuccess = () => resolve(r.result as T | undefined)
    r.onerror = () => reject(r.error)
  })
}
async function kvSet(key: string, value: unknown) {
  const db = await idb()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite')
    tx.objectStore('kv').put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

const clone = <T,>(v: T): T => structuredClone(v)
const uid = () => crypto.randomUUID()
const code = () => 'SN-' + Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('')
const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms))

async function compressImage(file: Blob, max = 1280, quality = 0.82): Promise<string> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}

export function createLocalApi(): Api {
  let cache: DB | null = null

  async function load(): Promise<DB> {
    if (cache) return cache
    const stored = await kvGet<DB>(KEY)
    cache =
      stored ??
      ({
        version: 1,
        services: clone(SEED_SERVICES),
        extras: clone(SEED_EXTRAS),
        designs: clone(SEED_DESIGNS),
        hours: clone(SEED_HOURS),
        blocked: [],
        settings: clone(SEED_SETTINGS),
        bookings: [],
        images: {},
      } satisfies DB)
    if (!stored) await kvSet(KEY, cache)
    // completar campos y diseños nuevos del seed en bases demo creadas antes
    const db = cache as DB & { seedRev?: number }
    if ((db.seedRev ?? 1) < 2) {
      for (const d of db.designs) {
        if (!d.renderUrl) d.renderUrl = SEED_DESIGNS.find((x) => x.id === d.id)?.renderUrl
      }
      for (const sd of SEED_DESIGNS) if (!db.designs.some((d) => d.id === sd.id)) db.designs.push(clone(sd))
      db.seedRev = 2
      await kvSet(KEY, db)
    }
    return cache
  }
  async function save(db: DB) {
    cache = db
    await kvSet(KEY, db)
  }
  async function mutate<T>(fn: (db: DB) => T): Promise<T> {
    const db = await load()
    const res = fn(db)
    await save(db)
    return clone(res)
  }
  const isAdminSync = () => sessionStorage.getItem(SESSION_KEY) === '1'
  const requireAdmin = () => {
    if (!isAdminSync()) throw new Error('Necesitás iniciar sesión como administradora.')
  }
  const busyOf = (db: DB): BusySlot[] =>
    db.bookings
      .filter(
        (b) =>
          ['paid', 'confirmed', 'completed'].includes(b.status) ||
          (b.status === 'pending_payment' && Date.now() - new Date(b.createdAt).getTime() < 30 * 60_000),
      )
      .map((b) => ({ date: b.date, time: b.time, durationMin: b.durationMin }))

  function buildBooking(db: DB, input: NewBookingInput, manual: boolean): Booking {
    const name = input.clientName.trim()
    const phone = input.phone.replace(/[^\d+]/g, '')
    if (name.length < 2) throw new Error('Ingresá tu nombre.')
    if (phone.length < 8) throw new Error('Ingresá un teléfono válido.')
    const service = db.services.find((s) => s.id === input.serviceId && s.active)
    if (!service) throw new Error('El servicio elegido no está disponible.')
    const extras = computeExtras(db.extras, input.extras)
    const total = computeTotal(service, extras)
    const design = input.designId ? db.designs.find((d) => d.id === input.designId) : undefined
    const busy = busyOf(db)
    if (!manual) {
      const free = availableTimes({
        date: input.date,
        duration: service.durationMin,
        hours: db.hours,
        blocked: db.blocked,
        busy,
        settings: db.settings,
      })
      if (!free.includes(input.time)) throw new Error('Ese horario ya no está disponible. Elegí otro, por favor.')
    }
    return {
      id: uid(),
      code: code(),
      createdAt: new Date().toISOString(),
      clientName: name,
      phone,
      instagram: input.instagram?.replace(/^@/, '').trim() || undefined,
      notes: input.notes?.trim() || undefined,
      serviceId: service.id,
      serviceName: service.name,
      extras,
      designId: design?.id,
      designName: design?.name,
      inspoUrls: input.inspoUrls,
      date: input.date,
      time: input.time,
      durationMin: service.durationMin,
      total,
      deposit: manual ? 0 : computeDeposit(total, db.settings),
      status: manual ? 'confirmed' : 'pending_payment',
      paymentMethod: manual ? 'manual' : undefined,
    }
  }

  const sorted = <T extends { sort: number }>(arr: T[]) => [...arr].sort((a, b) => a.sort - b.sort)

  return {
    mode: 'demo',

    async getServices() {
      const db = await load()
      return clone(sorted(isAdminSync() ? db.services : db.services.filter((s) => s.active)))
    },
    async getExtras() {
      const db = await load()
      return clone(sorted(isAdminSync() ? db.extras : db.extras.filter((s) => s.active)))
    },
    async getDesigns() {
      const db = await load()
      return clone(sorted(isAdminSync() ? db.designs : db.designs.filter((s) => s.active)))
    },
    async getSettings() {
      return clone((await load()).settings)
    },
    async getWorkingHours() {
      return clone((await load()).hours)
    },
    async getBlocked(from, to) {
      const db = await load()
      return clone(db.blocked.filter((b) => b.date >= from && b.date <= to))
    },
    async getBusy(from, to) {
      const db = await load()
      return busyOf(db).filter((b) => b.date >= from && b.date <= to)
    },
    async uploadInspo(file) {
      await delay(250)
      return compressImage(file)
    },
    async createBooking(input) {
      await delay(300)
      return mutate((db) => {
        const b = buildBooking(db, input, false)
        db.bookings.push(b)
        return b
      })
    },
    async getBooking(id) {
      const db = await load()
      return clone(db.bookings.find((b) => b.id === id) ?? null)
    },
    async startPayment(bookingId) {
      return { redirectUrl: `#/pago-simulado/${bookingId}`, mode: 'simulated' }
    },
    async confirmSimulatedPayment(bookingId, approved) {
      await delay(900)
      return mutate((db) => {
        const b = db.bookings.find((x) => x.id === bookingId)
        if (!b) throw new Error('No encontramos la reserva.')
        if (b.status !== 'pending_payment') return b
        b.paymentMethod = 'simulated'
        b.paymentStatus = approved ? 'approved' : 'rejected'
        if (approved) {
          b.status = 'paid'
          b.paymentId = 'SIM-' + Math.random().toString(36).slice(2, 10).toUpperCase()
        }
        return b
      })
    },

    async signIn(_email, password) {
      await delay(400)
      if (password !== DEMO_ADMIN_PASSWORD) throw new Error('Contraseña incorrecta.')
      sessionStorage.setItem(SESSION_KEY, '1')
    },
    async signOut() {
      sessionStorage.removeItem(SESSION_KEY)
    },
    async isAdmin() {
      return isAdminSync()
    },
    async listBookings(from, to) {
      requireAdmin()
      const db = await load()
      return clone(
        db.bookings
          .filter((b) => b.date >= from && b.date <= to)
          .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
      )
    },
    async updateBookingStatus(id, status: BookingStatus, adminNotes) {
      requireAdmin()
      return mutate((db) => {
        const b = db.bookings.find((x) => x.id === id)
        if (!b) throw new Error('No encontramos la reserva.')
        b.status = status
        if (adminNotes !== undefined) b.adminNotes = adminNotes
        return b
      })
    },
    async createManualBooking(input) {
      requireAdmin()
      return mutate((db) => {
        const b = buildBooking(db, input, true)
        db.bookings.push(b)
        return b
      })
    },
    async deleteBooking(id) {
      requireAdmin()
      await mutate((db) => {
        db.bookings = db.bookings.filter((b) => b.id !== id)
      })
    },
    async saveDesign(design) {
      requireAdmin()
      return mutate((db) => {
        const i = db.designs.findIndex((d) => d.id === design.id)
        if (i >= 0) db.designs[i] = design
        else db.designs.push(design)
        return design
      })
    },
    async deleteDesign(id) {
      requireAdmin()
      await mutate((db) => {
        db.designs = db.designs.filter((d) => d.id !== id)
      })
    },
    async uploadDesignPhoto(file) {
      requireAdmin()
      return compressImage(file, 1400, 0.85)
    },
    async saveService(service) {
      requireAdmin()
      return mutate((db) => {
        const i = db.services.findIndex((d) => d.id === service.id)
        if (i >= 0) db.services[i] = service
        else db.services.push(service)
        return service
      })
    },
    async deleteService(id) {
      requireAdmin()
      await mutate((db) => {
        db.services = db.services.filter((d) => d.id !== id)
      })
    },
    async saveExtra(extra) {
      requireAdmin()
      return mutate((db) => {
        const i = db.extras.findIndex((d) => d.id === extra.id)
        if (i >= 0) db.extras[i] = extra
        else db.extras.push(extra)
        return extra
      })
    },
    async deleteExtra(id) {
      requireAdmin()
      await mutate((db) => {
        db.extras = db.extras.filter((d) => d.id !== id)
      })
    },
    async saveWorkingHours(hours) {
      requireAdmin()
      await mutate((db) => {
        db.hours = hours
      })
    },
    async addBlocked(slot) {
      requireAdmin()
      return mutate((db) => {
        const b = { ...slot, id: uid() }
        db.blocked.push(b)
        return b
      })
    },
    async removeBlocked(id) {
      requireAdmin()
      await mutate((db) => {
        db.blocked = db.blocked.filter((b) => b.id !== id)
      })
    },
    async saveSettings(settings) {
      requireAdmin()
      await mutate((db) => {
        db.settings = settings
      })
    },
  }
}
