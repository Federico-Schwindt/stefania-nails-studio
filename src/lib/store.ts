import { create } from 'zustand'
import { api } from './api'
import type { ColorChoice, Design, Extra, Service, Settings, WorkingHours } from './types'

interface CatalogState {
  loaded: boolean
  loading: boolean
  error?: string
  services: Service[]
  extras: Extra[]
  designs: Design[]
  settings: Settings | null
  hours: WorkingHours[]
  load: (force?: boolean) => Promise<void>
}

/** Catálogo público cacheado (servicios, extras, diseños, ajustes, horarios). */
export const useCatalog = create<CatalogState>((set, get) => ({
  loaded: false,
  loading: false,
  services: [],
  extras: [],
  designs: [],
  settings: null,
  hours: [],
  async load(force) {
    if ((get().loaded || get().loading) && !force) return
    set({ loading: true, error: undefined })
    try {
      const [services, extras, designs, settings, hours] = await Promise.all([
        api.getServices(),
        api.getExtras(),
        api.getDesigns(),
        api.getSettings(),
        api.getWorkingHours(),
      ])
      set({ services, extras, designs, settings, hours, loaded: true, loading: false })
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'No pudimos cargar los datos.' })
    }
  },
}))

export interface BookingDraft {
  serviceId?: string
  extras: Record<string, number>
  designId?: string
  color?: ColorChoice
  inspo: { url: string; name: string }[]
  date?: string
  time?: string
  clientName: string
  phone: string
  instagram: string
  notes: string
  acceptPolicies: boolean
}

const emptyDraft = (): BookingDraft => ({
  extras: {},
  inspo: [],
  clientName: '',
  phone: '',
  instagram: '',
  notes: '',
  acceptPolicies: false,
})

interface DraftState {
  draft: BookingDraft
  set: (patch: Partial<BookingDraft>) => void
  reset: () => void
}

const KEY = 'sns-draft'
const initial = (): BookingDraft => {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (raw) return { ...emptyDraft(), ...JSON.parse(raw) }
  } catch {
    /* sin acceso a storage */
  }
  return emptyDraft()
}

export const useDraft = create<DraftState>((set) => ({
  draft: initial(),
  set: (patch) =>
    set((s) => {
      const draft = { ...s.draft, ...patch }
      try {
        sessionStorage.setItem(KEY, JSON.stringify(draft))
      } catch {
        /* noop */
      }
      return { draft }
    }),
  reset: () => {
    sessionStorage.removeItem(KEY)
    set({ draft: emptyDraft() })
  },
}))
