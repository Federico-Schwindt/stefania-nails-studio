# Base de datos (Neon)

El sitio se publica en GitHub Pages (estático) y guarda turnos, clientas, cobros y fotos en **Neon** (Postgres).
No hay servidor intermedio: el navegador habla con Neon por HTTP usando un **rol restringido**.

## Seguridad

| Rol | Dónde vive | Qué puede hacer |
| --- | --- | --- |
| `neondb_owner` | Sólo en `.env.local` de tu compu (`DATABASE_URL`) | Todo. Se usa para instalar/actualizar el esquema. **Nunca va al sitio.** |
| `studio_web` | En el sitio (secret `VITE_NEON_URL` de GitHub Actions) | Sólo ejecutar las funciones del esquema `api`. No puede leer tablas, ni crear nada. |

- Las tablas están en el esquema `app`, sin permisos para `studio_web`.
- Las funciones de administración (`api.admin_*`) piden un token de sesión que se obtiene con la contraseña del panel.
  Las contraseñas se guardan con bcrypt; 5 intentos fallidos bloquean el acceso 15 minutos.
- El rol web tiene `statement_timeout` de 8 s y un límite de conexiones.
- Las fotos (inspiración, comprobantes, diseños) se guardan comprimidas en la tabla `app.images`.

## Instalar o actualizar

1. Poné la conexión del dueño en `.env.local`:
   ```
   DATABASE_URL=postgresql://neondb_owner:...@...neon.tech/neondb?sslmode=require
   ```
2. Corré:
   ```
   npm run db:setup
   ```
   Aplica `db/neon/schema.sql`, carga servicios/diseños/horarios iniciales (sin pisar lo que ya se editó desde el panel),
   crea el rol `studio_web` y escribe en `.env.local`: `VITE_NEON_URL`, `STUDIO_WEB_PASSWORD` y, la primera vez, `ADMIN_PASSWORD`.
3. Para que el sitio publicado use la base, el secret `VITE_NEON_URL` tiene que estar en GitHub
   (Settings → Secrets and variables → Actions). El workflow de deploy lo inyecta al compilar.

Es idempotente: se puede volver a correr después de cambiar `db/neon/schema.sql`.

## Panel de Stefania

- Entrar en `#/admin` con la contraseña del panel (`ADMIN_PASSWORD` en `.env.local`). Cambiala desde **Ajustes → Seguridad**.
- Cobro de la seña: en **Ajustes → Cobro de la seña** elegí *Transferencia o link de Mercado Pago* y completá alias/CBU y/o el link de pago
  de Mercado Pago (se crea desde la app de Mercado Pago por el monto de la seña). Las clientas avisan que pagaron (con comprobante)
  y el turno queda en *Señas para revisar* hasta que lo marques como recibido.

## Si alguna vez se filtra una contraseña

- Rol web: borrá `STUDIO_WEB_PASSWORD` de `.env.local`, corré `npm run db:setup` (genera una nueva) y actualizá el secret `VITE_NEON_URL`.
- Dueño: reseteala desde la consola de Neon (Roles) y actualizá `DATABASE_URL`.
