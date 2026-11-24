# Stefania Nails Studio

Sitio y app de turnos de **Stefania Nails Studio**: portada con intro en video, catálogo de diseños reales pasados a una mano modelo, probador de color en 3D (tips de soft gel en tiempo real), reservas con seña online y panel de administración.

**En vivo:** https://federico-schwindt.github.io/stefania-nails-studio/

## Stack

- Vite + React 19 + TypeScript + Tailwind v4 + Motion
- Three.js / React Three Fiber para el probador de color 3D
- Supabase (Postgres, Auth, Storage, Edge Functions) para la agenda real
- Mercado Pago Checkout Pro para la seña (Edge Functions `create-preference` y `mp-webhook`)
- GitHub Pages + GitHub Actions para el deploy

## Modos

| Modo | Cuándo | Qué pasa |
| --- | --- | --- |
| **Demo** | Sin variables de Supabase | Todo funciona en el navegador (IndexedDB). El pago es simulado. Admin: contraseña `stefania`. |
| **Real** | Con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` | Agenda compartida, fotos de inspiración en Storage, admin con usuario real y seña con Mercado Pago. |

Para activar el modo real seguí [docs/BACKEND.md](docs/BACKEND.md).

## Desarrollo

```bash
npm install
npm run dev
```

## Rutas

- `#/` portada
- `#/reservar` reserva paso a paso (servicio, diseño, fecha, datos, seña)
- `#/reserva/:id` estado del turno (vuelta de Mercado Pago)
- `#/admin` panel de Stefania (agenda, disponibilidad, diseños, servicios, ajustes)

## Material de marca

`brand/identidad` tiene la guía, logo y paleta. Las fotos originales pesadas (`brand/estudio`, `brand/trabajos`, `brand/duena`) no se versionan; en el sitio se usan las versiones optimizadas de `public/img`.
