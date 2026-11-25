import { motion } from 'motion/react'
import {
  forwardRef,
  useEffect,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { CircleNotch, X } from '@phosphor-icons/react'

/*
  Regla de formas del sitio:
  - Botones: 8px · Chips, horarios y toggles: pill
  - Inputs: 10px
  - Tarjetas: 12px / Paneles grandes: 14-16px · Fotos: 10px
*/

type Variant = 'primary' | 'dark' | 'light' | 'ghost' | 'outline' | 'danger'
const variants: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-ink/85',
  dark: 'bg-ink text-white hover:bg-ink/85',
  light: 'bg-white text-ink hover:bg-gris-50',
  ghost: 'bg-transparent text-ink hover:bg-ink/5',
  outline: 'bg-white text-ink ring-1 ring-inset ring-gris hover:ring-ink/40',
  danger: 'bg-white text-ink ring-1 ring-inset ring-ink/30 hover:bg-gris-50',
}
const sizes = {
  sm: 'h-9 px-4 text-[14px]',
  md: 'h-11 px-5 text-[15px]',
  lg: 'h-14 px-7 text-[16px]',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: keyof typeof sizes
  loading?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, iconRight, className = '', children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-[8px] font-semibold transition duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading ? <CircleNotch className="animate-spin" size={18} weight="bold" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  )
})

export function IconButton({
  label,
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-ink/5 active:scale-95 ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Chip({
  active,
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      aria-pressed={active}
      className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[14px] font-medium transition ${
        active ? 'bg-ink text-white' : 'bg-white text-ink ring-1 ring-inset ring-gris hover:ring-ink/40'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

function FieldShell({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[14px] font-semibold text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-err`} className="text-[13px] font-medium text-ink">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-choco/80">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

const inputCls =
  'w-full rounded-[10px] bg-white px-4 text-[16px] text-ink ring-1 ring-inset ring-gris placeholder:text-ink/45 transition focus:outline-none focus:ring-2 focus:ring-ink aria-[invalid=true]:ring-ink'

export const Field = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }>(
  function Field({ label, hint, error, className = '', id, ...rest }, ref) {
    const auto = useId()
    const fid = id ?? auto
    return (
      <FieldShell id={fid} label={label} hint={hint} error={error}>
        <input
          ref={ref}
          id={fid}
          aria-invalid={!!error}
          aria-describedby={error ? `${fid}-err` : hint ? `${fid}-hint` : undefined}
          className={`${inputCls} h-12 ${className}`}
          {...rest}
        />
      </FieldShell>
    )
  },
)

export function TextArea({ label, hint, error, className = '', id, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string; error?: string }) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error}>
      <textarea id={fid} aria-invalid={!!error} className={`${inputCls} min-h-24 py-3 ${className}`} {...rest} />
    </FieldShell>
  )
}

export function Select({ label, hint, error, className = '', id, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; hint?: string; error?: string }) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error}>
      <select id={fid} aria-invalid={!!error} className={`${inputCls} h-12 appearance-none ${className}`} {...rest}>
        {children}
      </select>
    </FieldShell>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${checked ? 'bg-ink' : 'bg-gris'}`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-[10px] bg-gris-100 ${className}`} />
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        className={`relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[14px] bg-white p-6 shadow-2xl sm:rounded-[12px] ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-3xl leading-tight text-ink">{title}</h2>
          <IconButton label="Cerrar" onClick={onClose} className="-mr-2 -mt-1">
            <X size={20} />
          </IconButton>
        </div>
        {children}
      </motion.div>
    </div>,
    document.body,
  )
}

// ---------- Toasts ----------
type ToastMsg = { id: number; text: string; tone: 'ok' | 'error' }
let pushToast: (t: Omit<ToastMsg, 'id'>) => void = () => {}
export const toast = {
  ok: (text: string) => pushToast({ text, tone: 'ok' }),
  error: (text: string) => pushToast({ text, tone: 'error' }),
}
export function Toaster() {
  const [items, setItems] = useState<ToastMsg[]>([])
  useEffect(() => {
    pushToast = (t) => {
      const id = Date.now() + Math.random()
      setItems((x) => [...x, { ...t, id }])
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 4200)
    }
  }, [])
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {items.map((t) => (
        <motion.div
          key={t.id}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`pointer-events-auto rounded-[8px] px-5 py-3 text-[14px] font-medium shadow-lg ${t.tone === 'ok' ? 'bg-ink text-white' : 'bg-ink text-white'}`}
        >
          {t.text}
        </motion.div>
      ))}
    </div>,
    document.body,
  )
}

export function errMsg(e: unknown) {
  return e instanceof Error ? e.message : 'Algo salió mal. Probá de nuevo.'
}
