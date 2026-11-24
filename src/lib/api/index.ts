import type { Api } from './types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const BACKEND_MODE: Api['mode'] = SUPABASE_URL && SUPABASE_KEY ? 'supabase' : 'demo'

let impl: Promise<Api> | null = null
export function loadApi(): Promise<Api> {
  if (!impl) {
    impl =
      BACKEND_MODE === 'supabase'
        ? import('./supabase').then((m) => m.createSupabaseApi(SUPABASE_URL!, SUPABASE_KEY!))
        : import('./local').then((m) => m.createLocalApi())
  }
  return impl
}

type AsyncMethods = { [K in keyof Api as Api[K] extends (...a: never[]) => unknown ? K : never]: Api[K] }

/** Fachada: cada método espera a que cargue la implementación elegida. */
export const api = new Proxy({} as AsyncMethods & { mode: Api['mode'] }, {
  get(_t, prop: string) {
    if (prop === 'mode') return BACKEND_MODE
    return async (...args: unknown[]) => {
      const a = await loadApi()
      const fn = (a as unknown as Record<string, (...x: unknown[]) => unknown>)[prop]
      return fn.apply(a, args)
    }
  },
})

/** Resuelve rutas relativas de assets (img/...) contra la base de GitHub Pages. */
export function assetUrl(u?: string) {
  if (!u) return u
  if (/^(https?:|data:|blob:)/.test(u)) return u
  return import.meta.env.BASE_URL + u.replace(/^\//, '')
}

/** Miniatura: las fotos propias del sitio tienen versión -sm; las subidas se usan tal cual. */
export function thumbUrl(u?: string) {
  if (!u) return u
  if (/^img\/.+\.webp$/.test(u) && !u.endsWith('-sm.webp')) return assetUrl(u.replace(/\.webp$/, '-sm.webp'))
  return assetUrl(u)
}
