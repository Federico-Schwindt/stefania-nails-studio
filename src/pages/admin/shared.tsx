import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Button, Sheet, Skeleton, Toggle, errMsg } from '../../components/ui'
import { parseIso } from '../../lib/slots'

export const panel = 'min-w-0 rounded-[28px] bg-white p-5 ring-1 ring-inset ring-gris sm:p-6'
export const heading = 'font-serif text-3xl leading-tight text-ink'

export function useLoad<T>(load: () => Promise<T>) {
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<{ load: typeof load; revision: number; data?: T; error?: string }>()
  useEffect(() => {
    let current = true
    load().then(
      data => { if (current) setResult({ load, revision, data }) },
      error => { if (current) setResult({ load, revision, error: errMsg(error) }) },
    )
    return () => { current = false }
  }, [load, revision])
  const fresh = result?.load === load && result.revision === revision ? result : undefined
  const reload = useCallback(() => setRevision(value => value + 1), [])
  return { data: fresh?.data, error: fresh?.error, reload }
}

export function useAction() {
  const locked = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function run(task: () => Promise<void>) {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    setError('')
    try { await task() }
    catch (cause) { setError(errMsg(cause)) }
    finally { locked.current = false; setBusy(false) }
  }
  return { busy, error, run }
}

export function ErrorText({ message }: { message?: string }) {
  return message ? <p role="alert" className="rounded-2xl bg-gris-50 px-4 py-3 text-sm text-ink">{message}</p> : null
}

export function LoadState({ error, reload }: { error?: string; reload: () => void }) {
  return error ? <div className="space-y-3"><ErrorText message={error} /><Button variant="outline" onClick={reload}>Volver a intentar</Button></div>
    : <div role="status" aria-label="Cargando" className="space-y-4"><Skeleton className="h-16" /><Skeleton className="h-32" /></div>
}

export function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <div className="flex items-center justify-between gap-3 text-sm font-semibold"><span>{label}</span><Toggle label={label} checked={checked} onChange={onChange} /></div>
}

export function dateLabel(date: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) {
  return parseIso(date).toLocaleDateString('es-AR', options)
}

// The shared sheet handles Escape. Keep keyboard navigation inside the dialog as well.
export function AdminSheet({ title, onClose, wide, children }: { title: string; onClose: () => void; wide?: boolean; children: ReactNode }) {
  const content = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const dialog = content.current?.closest<HTMLElement>('[role="dialog"]')
    if (!dialog) return
    const opener = document.activeElement
    const controls = () => Array.from(dialog.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex="0"]'))
      .filter(el => !el.matches(':disabled') && el.getClientRects().length > 0)
    controls()[0]?.focus()
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const items = controls()
      const first = items[0]
      const last = items.at(-1)
      if (!first || !last) { event.preventDefault(); return }
      if (!dialog.contains(document.activeElement) || document.activeElement === (event.shiftKey ? first : last)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      }
    }
    document.addEventListener('keydown', trap)
    return () => { document.removeEventListener('keydown', trap); if (opener instanceof HTMLElement && opener.isConnected) opener.focus() }
  }, [])
  return <Sheet open title={title} onClose={onClose} wide={wide}><div ref={content}>{children}</div></Sheet>
}

const studioDateFormat = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })
export const studioDate = (instant = new Date()) => studioDateFormat.format(instant)

export function Metrics({ items }: { items: [string, string | number][] }) {
  return <dl className="grid grid-cols-2 gap-3 xl:grid-cols-4">{items.map(([label, value]) =>
    <div key={label} className={panel}><dt className="text-sm text-choco">{label}</dt>
      <dd className="mt-2 break-words font-serif text-3xl leading-tight text-ink sm:text-4xl">{value}</dd></div>)}</dl>
}
