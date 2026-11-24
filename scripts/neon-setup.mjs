// Instala o actualiza la base de Neon.
//   node --experimental-strip-types scripts/neon-setup.mjs
// Lee DATABASE_URL (rol dueño) de .env.local. Es idempotente: se puede correr las veces que haga falta.
// - Aplica db/neon/schema.sql
// - Carga servicios, extras, diseños, horarios y ajustes iniciales (sin pisar lo que ya editó Stefania)
// - Crea el rol web restringido `studio_web` y escribe VITE_NEON_URL en .env.local
// - Crea la contraseña del panel si no existe y la guarda en .env.local (ADMIN_PASSWORD)
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import pg from 'pg'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, '.env.local')
const env = Object.fromEntries(
  (existsSync(envPath) ? readFileSync(envPath, 'utf8') : '')
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
)
if (!env.DATABASE_URL) throw new Error('Falta DATABASE_URL en .env.local')

const saveEnv = (key, value) => {
  env[key] = value
  writeFileSync(envPath, Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n') + '\n')
}
const secret = (n) => randomBytes(n).toString('base64url')

const { SEED_SERVICES, SEED_EXTRAS, SEED_DESIGNS, SEED_HOURS, SEED_SETTINGS } = await import(
  pathToFileURL(join(root, 'src/data/seed.ts')).href
)

const url = env.DATABASE_URL.replace('channel_binding=require', 'channel_binding=prefer').replace('sslmode=require', 'sslmode=verify-full')
const db = new pg.Client({ connectionString: url })
await db.connect()

// 1) rol web (antes del esquema, para que el bloque de permisos lo encuentre)
if (!env.STUDIO_WEB_PASSWORD) saveEnv('STUDIO_WEB_PASSWORD', secret(24))
const roleExists = (await db.query(`select 1 from pg_roles where rolname = 'studio_web'`)).rowCount > 0
await db.query(
  `${roleExists ? 'alter' : 'create'} role studio_web with login password '${env.STUDIO_WEB_PASSWORD}' nosuperuser nocreatedb nocreaterole noinherit connection limit 40`,
)
const dbName = (await db.query('select current_database() as d')).rows[0].d
await db.query(`revoke temporary on database "${dbName}" from public`)
await db.query(`grant connect on database "${dbName}" to studio_web`)

// 2) esquema
await db.query(readFileSync(join(root, 'db/neon/schema.sql'), 'utf8'))
console.log('✓ esquema aplicado')

// 3) datos iniciales (no pisan cambios hechos desde el panel)
for (const s of SEED_SERVICES) {
  await db.query(
    `insert into app.services (id, name, description, price, price_from, duration_min, active, sort)
     values ($1,$2,$3,$4,$5,$6,$7,$8) on conflict (id) do nothing`,
    [s.id, s.name, s.description ?? null, s.price, s.priceFrom, s.durationMin, s.active, s.sort],
  )
}
for (const e of SEED_EXTRAS) {
  await db.query(
    `insert into app.extras (id, name, price, mode, max_qty, active, sort) values ($1,$2,$3,$4,$5,$6,$7) on conflict (id) do nothing`,
    [e.id, e.name, e.price, e.mode, e.maxQty, e.active, e.sort],
  )
}
for (const d of SEED_DESIGNS) {
  await db.query(
    `insert into app.designs (id, name, description, tags, photo_url, render_url, params, service_id, active, sort)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     on conflict (id) do update set render_url = coalesce(app.designs.render_url, excluded.render_url)`,
    [d.id, d.name, d.description ?? null, d.tags, d.photoUrl ?? null, d.renderUrl ?? null, d.params, d.serviceId ?? null, d.active, d.sort],
  )
}
for (const h of SEED_HOURS) {
  await db.query(
    `insert into app.working_hours (weekday, enabled, start, "end") values ($1,$2,$3,$4) on conflict (weekday) do nothing`,
    [h.weekday, h.enabled, h.start, h.end],
  )
}
// ajustes: se agregan claves nuevas sin pisar las existentes
await db.query(
  `insert into app.settings (id, data) values (1, $1::jsonb)
   on conflict (id) do update set data = $1::jsonb || app.settings.data`,
  [{ ...SEED_SETTINGS, paymentsMode: 'manual' }],
)
console.log('✓ datos iniciales')

// 4) contraseña del panel
const hasAdmin = (await db.query('select 1 from app.admin where id = 1')).rowCount > 0
if (!hasAdmin) {
  if (!env.ADMIN_PASSWORD) saveEnv('ADMIN_PASSWORD', secret(9))
  await db.query(`insert into app.admin (id, password_hash) values (1, crypt($1, gen_salt('bf', 10)))`, [env.ADMIN_PASSWORD])
  console.log('✓ contraseña del panel creada (ver ADMIN_PASSWORD en .env.local)')
}

// 5) URL pública para el navegador (rol restringido)
const u = new URL(env.DATABASE_URL)
u.username = 'studio_web'
u.password = env.STUDIO_WEB_PASSWORD
u.searchParams.delete('channel_binding')
saveEnv('VITE_NEON_URL', u.toString())

const counts = (await db.query(
  `select (select count(*) from app.services) s, (select count(*) from app.designs) d, (select count(*) from app.bookings) b`,
)).rows[0]
console.log(`✓ listo · servicios ${counts.s} · diseños ${counts.d} · turnos ${counts.b}`)
await db.end()
