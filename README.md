# Stefania Nails Studio

Sitio y sistema de turnos de **Stefania Nails Studio**: reserva online con agenda en vivo, catálogo de diseños reales sobre una mano modelo, colores en tarjetas, seña por transferencia o Mercado Pago, "Mi turno" para las clientas y un panel completo para Stefania.

**En vivo:** https://federico-schwindt.github.io/stefania-nails-studio/

## Stack

- Vite + React 19 + TypeScript + Tailwind v4 + Motion
- Neon (Postgres) consultado por HTTP con un rol restringido: ver [docs/NEON.md](docs/NEON.md)
- GitHub Pages + GitHub Actions para el deploy

## Para las clientas

- Reserva rápida desde la portada: servicio → próximos horarios libres → seguir.
- Diseños reales del estudio (hover para verlos en la mano), colores lisos con terminación y forma, fotos de inspiración.
- Seña por transferencia (alias/CBU con copiar) o link de Mercado Pago, con comprobante.
- **Mi turno** (`#/mi-turno`): ver estado, pagar la seña, agendar en el calendario o cancelar.
- Lista de espera cuando no hay horarios.

## Para Stefania (`#/admin`)

Hoy (agenda del día, cobros, recordatorios), Agenda semanal, Clientas (historial, notas, alergias, gasto), Caja y reportes (exportar CSV), Lista de espera, Disponibilidad y vacaciones, Diseños, Servicios y Ajustes (seña, cobro, plantillas de WhatsApp, contraseña).

## Modos

| Modo | Cuándo | Qué pasa |
| --- | --- | --- |
| **Neon** | Con `VITE_NEON_URL` | Datos reales compartidos entre clientas y panel. |
| **Demo** | Sin variables | Todo vive en el navegador (IndexedDB). Pago simulado. Panel: contraseña `stefania`. |

## Desarrollo

```bash
npm install
npm run db:setup   # instala/actualiza la base (necesita DATABASE_URL en .env.local)
npm run dev
```

## Material de marca

`brand/identidad` tiene la guía, logo y paleta. Las fotos originales pesadas no se versionan; el sitio usa las versiones optimizadas de `public/img`.
