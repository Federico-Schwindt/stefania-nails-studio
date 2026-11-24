import { SEED_DESIGNS, SEED_EXTRAS, SEED_HOURS, SEED_SERVICES, SEED_SETTINGS } from '../../data/seed'
import { computeDeposit, computeExtras, computeTotal } from '../pricing'
import { toMin } from '../slots'
import type {
  Booking, Client, Design, Extra, NewBookingInput, PayMethod, Service, Settings, Stats,
  BlockedSlot, WaitlistEntry, WorkingHours,
} from '../types'
import type { Api } from './types'

type Profile = Pick<Partial<Client>, 'name' | 'instagram' | 'notes' | 'birthday'>
type Payment = { id: string; bookingId: string; amount: number; method: PayMethod; kind: 'deposit' | 'balance'; createdAt: string }
interface DB {
  version: 1
  seedRev: number
  services: Service[]
  extras: Extra[]
  designs: Design[]
  hours: WorkingHours[]
  blocked: BlockedSlot[]
  settings: Settings
  bookings: Booking[]
  images: Record<string, string>
  imageUploads: number[]
  payments: Payment[]
  clients: Record<string, Profile>
  waitlist: WaitlistEntry[]
  sessionVersion?: string
  password: string
}

export const DEMO_ADMIN_PASSWORD = 'stefania'
const SESSION_KEY = 'sns-demo-admin'
const uid = () => crypto.randomUUID()
const now = () => new Date().toISOString()
const hour = 3600_000
const digits = (value: string) => value.replace(/\D/g, '')
const phoneKey = (value: string) => digits(value).slice(-10)
const compareSlot = (a: Booking, b: Booking) => (a.date + a.time).localeCompare(b.date + b.time)
const active = ['pending_payment', 'payment_review', 'paid', 'confirmed']
const busy = (b: Booking) => ['payment_review', 'paid', 'confirmed', 'completed'].includes(b.status)
  || (b.status === 'pending_payment' && Date.parse(b.createdAt) > Date.now() - hour)
const studioDay = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })
const inPeriod = (date: string, from: string, to: string) => date >= from && date <= to

function migrate(stored?: DB): DB {
  if (!stored) return {
    version: 1, seedRev: 3, services: SEED_SERVICES, extras: SEED_EXTRAS, designs: SEED_DESIGNS, hours: SEED_HOURS,
    settings: SEED_SETTINGS, blocked: [], bookings: [], images: {}, payments: [], clients: {}, waitlist: [],
    imageUploads: [], password: DEMO_ADMIN_PASSWORD,
  }
  if ((stored.seedRev ?? 1) < 2) {
    for (const d of SEED_DESIGNS) {
      const old = stored.designs.find(x => x.id === d.id)
      if (old) old.renderUrl ??= d.renderUrl
      else stored.designs.push(d)
    }
  }
  if ((stored.seedRev ?? 1) < 3) {
    stored.settings = { ...SEED_SETTINGS, ...stored.settings, waTemplates: { ...SEED_SETTINGS.waTemplates, ...stored.settings.waTemplates } }
    for (const b of stored.bookings) b.paidAmount ??= 0
    stored.payments ??= []
    stored.clients ??= {}
    stored.waitlist ??= []
    stored.imageUploads ??= []
    stored.images ??= {}
    stored.password ??= DEMO_ADMIN_PASSWORD
    stored.seedRev = 3
  }
  return stored
}

// Read, validate and persist in one transaction, including when two tabs book the same slot.
async function transaction<T>(write: boolean, fn: (db: DB) => T): Promise<T> {
  const conn = await new Promise<IDBDatabase>((resolve, reject) => {
    const open = indexedDB.open('stefania-nails-demo', 1)
    open.onupgradeneeded = () => open.result.createObjectStore('kv')
    open.onsuccess = () => resolve(open.result)
    open.onerror = () => reject(open.error)
  })
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = conn.transaction('kv', write ? 'readwrite' : 'readonly')
      const kv = tx.objectStore('kv')
      const request = kv.get('db')
      let result: T
      tx.oncomplete = () => resolve(result)
      tx.onabort = () => reject(tx.error ?? new Error('No se pudieron guardar los datos.'))
      request.onsuccess = () => {
        try {
          const db = migrate(request.result as DB | undefined)
          result = fn(db)
          if (write) kv.put(db, 'db')
        } catch (error) { tx.abort(); reject(error) }
      }
    })
  } finally { conn.close() }
}

function slotTimestamp(date: string, time: string) {
  const day = new Date(date + 'T00:00:00Z')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(+day) || day.toISOString().slice(0, 10) !== date
    || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Elegí una fecha y un horario válidos.')
  return Date.parse(date + 'T' + time + ':00-03:00')
}

function assertFree(db: DB, date: string, time: string, duration: number, ignore?: string) {
  const start = toMin(time)
  const overlaps = (other: number, end: number) => start < end && other < start + duration
  if (db.blocked.some(b => b.date === date && (!b.start || (b.end && overlaps(toMin(b.start), toMin(b.end))))) ||
    db.bookings.some(b => b.id !== ignore && b.date === date && busy(b) && overlaps(toMin(b.time), toMin(b.time) + b.durationMin))) {
    throw new Error('Ese horario ya no está disponible. Elegí otro, por favor.')
  }
}

function create(db: DB, input: NewBookingInput, manual: boolean): Booking {
  const clientName = input.clientName.trim(), phone = input.phone.trim()
  if (clientName.length < 2 || clientName.length > 120) throw new Error('Ingresá tu nombre y apellido.')
  if (digits(phone).length < 8 || phone.length > 40) throw new Error('Ingresá un WhatsApp válido, con código de área.')
  if ((input.notes?.length ?? 0) > 2000) throw new Error('Las notas pueden tener hasta 2000 caracteres.')
  if (input.inspoUrls.length > 6) throw new Error('Podés subir hasta 6 imágenes de inspiración.')
  if (input.inspoUrls.some(url => url.length > 400)) throw new Error('Revisá las imágenes de inspiración.')
  const service = db.services.find(s => s.id === input.serviceId && s.active)
  if (!service) throw new Error('El servicio elegido no está disponible.')
  const { date, time } = input
  const instant = slotTimestamp(date, time)
  if (!manual) {
    if (instant < Date.now() + db.settings.minNoticeHours * hour) throw new Error('Ese horario ya no se puede reservar online. Elegí otro, por favor.')
    if (Date.parse(date) - Date.parse(studioDay.format(new Date())) > db.settings.maxDaysAhead * 24 * hour) throw new Error('Todavía no se puede reservar esa fecha.')
    const weekday = new Date(date).getUTCDay()
    const h = db.hours.find(x => x.weekday === weekday && x.enabled)
    if (!h || time < h.start || toMin(time) + service.durationMin > toMin(h.end)) throw new Error('El turno queda fuera del horario de atención.')
  }
  assertFree(db, date, time, service.durationMin)
  const extras = computeExtras(db.extras, input.extras), total = computeTotal(service, extras)
  let code: string
  do {
    code = 'SN-' + Array.from(crypto.getRandomValues(new Uint8Array(4)), n => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n % 32]).join('')
  } while (db.bookings.some(b => b.code === code))
  const booking: Booking = {
    ...input, id: uid(), code, createdAt: now(), clientName, phone, instagram: input.instagram?.trim().replace(/^@/, '') || undefined,
    notes: input.notes?.trim() || undefined, serviceName: service.name, durationMin: service.durationMin, extras,
    designName: db.designs.find(d => d.id === input.designId)?.name, total, paidAmount: 0,
    deposit: manual ? 0 : computeDeposit(total, db.settings), status: manual ? 'confirmed' : 'pending_payment',
  }
  db.bookings.push(booking)
  db.clients[phoneKey(phone)] ??= { name: clientName, instagram: booking.instagram }
  return booking
}

function booking(db: DB, id: string) {
  const b = db.bookings.find(x => x.id === id)
  if (!b) throw new Error('No encontramos el turno.')
  return b
}

function credit(db: DB, b: Booking, amount: number, method: PayMethod, kind: Payment['kind']) {
  db.payments.push({ id: uid(), bookingId: b.id, createdAt: now(), amount, method, kind })
  b.paidAmount += amount
  if (kind === 'balance') b.balanceMethod = method
  else {
    b.depositMethod = method
    if (['pending_payment', 'payment_review'].includes(b.status)) b.status = 'paid'
  }
  return b
}

function clientRows(db: DB): Client[] {
  const groups = new Map<string, Booking[]>(Object.keys(db.clients).map(key => [key, []]))
  for (const b of db.bookings) {
    const key = phoneKey(b.phone)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(b)
  }
  const today = studioDay.format(new Date())
  return Array.from(groups, ([key, list]) => {
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const profile = db.clients[key]
    const completed = list.filter(b => b.status === 'completed').sort(compareSlot)
    const next = list.filter(b => b.date >= today && active.includes(b.status)).sort(compareSlot)[0]
    return {
      ...profile, phone: list[0]?.phone ?? key, name: profile?.name ?? list[0]?.clientName ?? '',
      instagram: profile?.instagram ?? list.find(b => b.instagram)?.instagram,
      visits: completed.length, noShows: list.filter(b => b.status === 'no_show').length,
      cancellations: list.filter(b => b.status === 'cancelled').length, totalSpent: completed.reduce((n, b) => n + b.paidAmount, 0),
      firstVisit: completed[0]?.date, lastVisit: completed.at(-1)?.date,
      nextBooking: next && { id: next.id, date: next.date, time: next.time, serviceName: next.serviceName },
    }
  }).sort((a, b) => (b.lastVisit ?? '').localeCompare(a.lastVisit ?? '') || a.name.localeCompare(b.name))
}

function stats(db: DB, from: string, to: string): Stats {
  const result: Stats = { from, to, bookings: 0, completed: 0, noShows: 0, cancelled: 0, revenue: 0,
    depositsCollected: 0, expected: 0, newClients: 0, byService: [], byDay: [], byMethod: [], topDesigns: [] }
  const services = new Map<string, Stats['byService'][number]>()
  const days = new Map<string, Stats['byDay'][number]>()
  const designs = new Map<string, number>()
  const methods = new Map<PayMethod, number>()
  const firstVisits = new Map<string, string>()
  for (const b of db.bookings) {
    const key = phoneKey(b.phone)
    if (b.status === 'completed' && b.date < (firstVisits.get(key) ?? '9999-99-99')) firstVisits.set(key, b.date)
    if (!inPeriod(b.date, from, to)) continue
    if (b.status === 'cancelled') result.cancelled++
    if (b.status === 'cancelled' || b.status === 'rejected') continue
    const revenue = b.status === 'completed' ? b.paidAmount : 0
    result.bookings++
    if (b.status === 'completed') result.completed++
    if (b.status === 'no_show') result.noShows++
    if (active.includes(b.status)) result.expected += b.total
    result.revenue += revenue
    const s = services.get(b.serviceId) ?? { serviceId: b.serviceId, name: b.serviceName, count: 0, revenue: 0 }
    s.count++; s.revenue += revenue
    if (b.serviceName > s.name) s.name = b.serviceName
    services.set(b.serviceId, s)
    const d = days.get(b.date) ?? { date: b.date, count: 0, revenue: 0 }
    d.count++; d.revenue += revenue
    days.set(b.date, d)
    if (b.designName) designs.set(b.designName, (designs.get(b.designName) ?? 0) + 1)
  }
  for (const p of db.payments) {
    if (!inPeriod(studioDay.format(new Date(p.createdAt)), from, to)) continue
    if (p.kind === 'deposit') result.depositsCollected += p.amount
    methods.set(p.method, (methods.get(p.method) ?? 0) + p.amount)
  }
  result.newClients = [...firstVisits.values()].filter(d => inPeriod(d, from, to)).length
  result.byService = [...services.values()].sort((a, b) => b.count - a.count)
  result.byDay = [...days.values()].sort((a, b) => a.date.localeCompare(b.date))
  result.byMethod = Array.from(methods, ([method, amount]) => ({ method, amount }))
  result.topDesigns = Array.from(designs, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8)
  return result
}

async function compressImage(file: Blob) {
  try {
    const bmp = await createImageBitmap(file)
    try {
      const scale = Math.min(1, 1400 / Math.max(bmp.width, bmp.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(bmp.width * scale))
      canvas.height = Math.max(1, Math.round(bmp.height * scale))
      canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
      return canvas.toDataURL('image/jpeg', 0.82)
    } finally { bmp.close() }
  } catch { throw new Error('No pudimos leer esa imagen. Probá con una foto JPG o PNG.') }
}

export function createLocalApi(): Api {
  let ready: Promise<void> | undefined
  function initialize() {
    ready ??= transaction(true, () => {}).catch(error => { ready = undefined; throw error })
    return ready
  }
  async function read<T>(fn: (db: DB) => T) { await initialize(); return transaction(false, fn) }
  async function mutate<T>(fn: (db: DB) => T) { await initialize(); return transaction(true, fn) }
  const isAdmin = (db: DB) => sessionStorage.getItem(SESSION_KEY) === (db.sessionVersion ?? '1')
  function authorized<T>(fn: (db: DB) => T) {
    return (db: DB) => {
      if (!isAdmin(db)) throw new Error('Tu sesión venció. Volvé a ingresar.')
      return fn(db)
    }
  }
  const adminRead = <T,>(fn: (db: DB) => T) => read(authorized(fn))
  const adminWrite = <T,>(fn: (db: DB) => T) => mutate(authorized(fn))
  function catalog<T extends { active: boolean; sort: number }>(db: DB, entries: T[]) {
    return entries.filter(x => isAdmin(db) || x.active).sort((a, b) => a.sort - b.sort)
  }

  return {
    mode: 'demo',
    getServices: () => read(db => catalog(db, db.services)),
    getExtras: () => read(db => catalog(db, db.extras)),
    getDesigns: () => read(db => catalog(db, db.designs)),
    getSettings: () => read(db => db.settings),
    getWorkingHours: () => read(db => db.hours.sort((a, b) => a.weekday - b.weekday)),
    getBlocked: (from, to) => read(db => db.blocked.filter(b => inPeriod(b.date, from, to)).sort((a, b) => (a.date + (a.start ?? '')).localeCompare(b.date + (b.start ?? '')))),
    getBusy: (from, to) => read(db => db.bookings.filter(b => inPeriod(b.date, from, to) && busy(b)).sort(compareSlot)
      .map(({ date, time, durationMin }) => ({ date, time, durationMin }))),
    async uploadImage(file) {
      const data = await compressImage(file)
      if (atob(data.split(',')[1]).length > 1_200_000) throw new Error('La imagen es muy pesada. Probá con otra.')
      return mutate(db => {
        db.imageUploads = db.imageUploads.filter(time => time > Date.now() - hour)
        if (db.imageUploads.length > 400) throw new Error('Se subieron muchas imágenes. Probá de nuevo en un rato.')
        const id = uid()
        db.images[id] = data
        db.imageUploads.push(Date.now())
        return 'img:' + id
      })
    },
    resolveImage: async ref => ref.startsWith('img:') ? read(db => db.images[ref.slice(4)] ?? '') : ref,
    createBooking: input => mutate(db => create(db, input, false)),
    getBooking: id => read(db => db.bookings.find(b => b.id === id) ?? null),
    findBooking: (code, phone) => read(db => db.bookings.find(b => b.code.toUpperCase() === code.trim().toUpperCase() && phoneKey(b.phone) === phoneKey(phone)) ?? null),
    cancelBookingByClient: (id, phone) => mutate(db => {
      const b = db.bookings.find(x => x.id === id && phoneKey(x.phone) === phoneKey(phone))
      if (!b) throw new Error('No encontramos el turno con ese teléfono.')
      if (!active.includes(b.status)) throw new Error('Este turno ya no se puede cancelar.')
      const h = db.settings.cancelHours
      if (slotTimestamp(b.date, b.time) < Date.now() + h * hour) throw new Error(`Faltan menos de ${h} horas para el turno: escribile a Stefania por WhatsApp para cancelarlo.`)
      b.status = 'cancelled'
      return b
    }),
    startPayment: id => read(db => ({ mode: db.settings.paymentsMode, redirectUrl: (db.settings.paymentsMode === 'simulated' ? '#/pago-simulado/' : '#/sena/') + id })),
    reportDeposit: (id, method, proof) => mutate(db => {
      if (!['transfer', 'mercadopago', 'other'].includes(method)) throw new Error('Elegí cómo pagaste la seña.')
      if (proof && proof.length > 400) throw new Error('Revisá el comprobante.')
      const b = db.bookings.find(x => x.id === id)
      if (!b || !['pending_payment', 'payment_review'].includes(b.status)) throw new Error('Este turno no tiene una seña pendiente.')
      b.status = 'payment_review'
      b.depositMethod = method
      if (proof) b.depositProofUrl = proof
      return b
    }),
    confirmSimulatedPayment: (id, approved) => mutate(db => {
      if (db.settings.paymentsMode !== 'simulated') throw new Error('Los pagos de prueba están desactivados.')
      const b = db.bookings.find(x => x.id === id && x.status === 'pending_payment')
      if (!b) throw new Error('Este turno no tiene una seña pendiente.')
      if (approved) {
        if (b.deposit > 0) credit(db, b, b.deposit, 'simulated', 'deposit')
        b.status = 'paid'
        b.depositMethod = 'simulated'
        b.paymentId = 'SIM-' + uid().slice(0, 8).toUpperCase()
      }
      return b
    }),
    joinWaitlist: input => mutate(db => {
      if (input.name.trim().length < 2) throw new Error('Ingresá tu nombre.')
      if (digits(input.phone).length < 8) throw new Error('Ingresá un WhatsApp válido.')
      if (db.waitlist.filter(w => Date.parse(w.createdAt) > Date.now() - hour).length > 100) throw new Error('Probá de nuevo en un rato.')
      db.waitlist.push({ ...input, id: uid(), name: input.name.trim().slice(0, 120), phone: input.phone.trim().slice(0, 40),
        preferred: input.preferred.slice(0, 500), createdAt: now(), status: 'open' })
    }),
    async signIn(_email, password) {
      const token = await read(db => {
        if (password !== db.password) throw new Error('Contraseña incorrecta.')
        return db.sessionVersion ?? '1'
      })
      sessionStorage.setItem(SESSION_KEY, token)
    },
    async signOut() { sessionStorage.removeItem(SESSION_KEY) },
    async isAdmin() { return !!sessionStorage.getItem(SESSION_KEY) && read(isAdmin) },
    async changePassword(current, next) {
      const token = await adminWrite(db => {
        if (next.length < 8) throw new Error('La contraseña nueva tiene que tener al menos 8 caracteres.')
        if (current !== db.password) throw new Error('La contraseña actual no es correcta.')
        db.password = next
        db.sessionVersion = uid()
        return db.sessionVersion
      })
      sessionStorage.setItem(SESSION_KEY, token)
    },
    async listBookings(from, to) {
      return adminRead(db => db.bookings.filter(b => inPeriod(b.date, from, to)).sort(compareSlot))
    },
    async updateBookingStatus(id, status, notes) {
      return adminWrite(db => {
        const b = booking(db, id)
        if (![...active, 'completed', 'no_show', 'rejected', 'cancelled'].includes(status)) throw new Error('Estado no válido.')
        if (!busy(b) && ['payment_review', 'paid', 'confirmed'].includes(status)) assertFree(db, b.date, b.time, b.durationMin, id)
        b.status = status
        if (notes !== undefined) b.adminNotes = notes
        return b
      })
    },
    async recordPayment(id, amount, method, kind) {
      return adminWrite(db => {
        const value = Math.round(amount)
        if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Ingresá un importe mayor a cero.')
        if (!['cash', 'transfer', 'mercadopago', 'simulated', 'other'].includes(method)) throw new Error('Elegí el medio de pago.')
        if (!['deposit', 'balance'].includes(kind)) throw new Error('Tipo de cobro no válido.')
        return credit(db, booking(db, id), value, method, kind)
      })
    },
    async markReminded(id) {
      return adminWrite(db => { const b = booking(db, id); b.remindedAt = now(); return b })
    },
    async createManualBooking(input) {
      return adminWrite(db => create(db, input, true))
    },
    async rescheduleBooking(id, date, time) {
      return adminWrite(db => {
        const b = booking(db, id)
        slotTimestamp(date, time)
        assertFree(db, date, time, b.durationMin, id)
        b.date = date; b.time = time; delete b.remindedAt
        return b
      })
    },
    async deleteBooking(id) {
      await adminWrite(db => {
        db.bookings = db.bookings.filter(b => b.id !== id)
        db.payments = db.payments.filter(p => p.bookingId !== id)
      })
    },
    async listClients(search = '') {
      const q = search.trim().toLowerCase(), number = digits(q)
      return adminRead(db => clientRows(db).filter(c => c.name.toLowerCase().includes(q) || c.instagram?.toLowerCase().includes(q)
        || (number && phoneKey(c.phone).includes(number))))
    },
    async getClient(phone) {
      const key = phoneKey(phone)
      return adminRead(db => {
        const client = clientRows(db).find(c => phoneKey(c.phone) === key)
        return client ? { client, bookings: db.bookings.filter(b => phoneKey(b.phone) === key).sort((a, b) => compareSlot(b, a)) } : null
      })
    },
    async saveClient(phone, data) {
      await adminWrite(db => {
        const key = phoneKey(phone)
        db.clients[key] = { ...db.clients[key], ...Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) }
      })
    },
    async getStats(from, to) { return adminRead(db => stats(db, from, to)) },
    async listWaitlist() {
      return adminRead(db => db.waitlist.map(w => ({ ...w, serviceName: db.services.find(s => s.id === w.serviceId)?.name }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
    },
    async updateWaitlist(id, status) {
      await adminWrite(db => {
        if (!['open', 'contacted', 'booked', 'closed'].includes(status)) throw new Error('Estado no válido.')
        const w = db.waitlist.find(w => w.id === id)
        if (w) w.status = status
      })
    },
    async deleteWaitlist(id) { await adminWrite(db => { db.waitlist = db.waitlist.filter(w => w.id !== id) }) },
    async saveDesign(design) {
      return adminWrite((db) => {
        const i = db.designs.findIndex((d) => d.id === design.id)
        const saved = { ...design, createdAt: db.designs[i]?.createdAt ?? now() }
        if (i >= 0) db.designs[i] = saved
        else db.designs.push(saved)
        return saved
      })
    },
    async deleteDesign(id) {
      await adminWrite((db) => {
        db.designs = db.designs.filter((d) => d.id !== id)
      })
    },
    async saveService(service) {
      return adminWrite((db) => {
        if (!Number.isInteger(service.price) || service.price < 0 || !Number.isInteger(service.durationMin) || service.durationMin < 5 || service.durationMin > 720) throw new Error('Revisá el precio y la duración del servicio (5 a 720 minutos).')
        const i = db.services.findIndex((d) => d.id === service.id)
        if (i >= 0) db.services[i] = service
        else db.services.push(service)
        return service
      })
    },
    async deleteService(id) {
      await adminWrite((db) => {
        db.services = db.services.filter((d) => d.id !== id)
      })
    },
    async saveExtra(extra) {
      return adminWrite((db) => {
        if (!Number.isInteger(extra.price) || extra.price < 0 || !Number.isInteger(extra.maxQty) || extra.maxQty < 1 || extra.maxQty > 50) throw new Error('Revisá el precio y la cantidad máxima (1 a 50).')
        const i = db.extras.findIndex((d) => d.id === extra.id)
        if (i >= 0) db.extras[i] = extra
        else db.extras.push(extra)
        return extra
      })
    },
    async deleteExtra(id) {
      await adminWrite((db) => {
        db.extras = db.extras.filter((d) => d.id !== id)
      })
    },
    async saveWorkingHours(hours) {
      await adminWrite((db) => {
        for (const h of hours) {
          if (!Number.isInteger(h.weekday) || h.weekday < 0 || h.weekday > 6) throw new Error('Revisá el día de atención.')
          slotTimestamp('2000-01-01', h.start)
          slotTimestamp('2000-01-01', h.end)
          db.hours = [...db.hours.filter(old => old.weekday !== h.weekday), h]
        }
      })
    },
    async addBlocked(slot) {
      return adminWrite((db) => {
        slotTimestamp(slot.date, slot.start || '00:00')
        slotTimestamp(slot.date, slot.end || '00:00')
        const b = { ...slot, id: uid() }
        db.blocked.push(b)
        return b
      })
    },
    async removeBlocked(id) {
      await adminWrite((db) => {
        db.blocked = db.blocked.filter((b) => b.id !== id)
      })
    },
    async saveSettings(settings) {
      await adminWrite((db) => {
        if (!['manual', 'simulated'].includes(settings.paymentsMode)) throw new Error('Revisá los ajustes.')
        db.settings = settings
      })
    },
  }
}
