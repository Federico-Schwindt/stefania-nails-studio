import type { Finish, NailShape } from '../../lib/types'

/* Muestra de esmalte liso: se usa para mostrar reservas viejas que guardaron un color. */

/** Silueta de cada forma de uña (sólo CSS). */
const SHAPE_STYLE: Record<NailShape, React.CSSProperties> = {
  almond: { borderRadius: '50% 50% 42% 42% / 72% 72% 28% 28%' },
  oval: { borderRadius: '50% 50% 44% 44% / 52% 52% 30% 30%' },
  squoval: { borderRadius: '30% 30% 40% 40% / 22% 22% 26% 26%' },
  square: { borderRadius: '8% 8% 36% 36% / 6% 6% 22% 22%' },
  coffin: { borderRadius: '18% 18% 40% 40% / 10% 10% 26% 26%', clipPath: 'polygon(22% 0, 78% 0, 100% 100%, 0 100%)' },
  stiletto: { clipPath: 'polygon(50% 0, 88% 60%, 100% 100%, 0 100%, 12% 60%)', borderRadius: '0 0 40% 40% / 0 0 26% 26%' },
}

/** Relleno de la uña según color y terminación. */
export function polishBackground(hex: string, finish: Finish) {
  switch (finish) {
    case 'matte':
      return hex
    case 'chrome':
      return `linear-gradient(115deg, ${hex} 0%, #ffffff 28%, ${hex} 46%, #f2f2f2 62%, ${hex} 82%)`
    case 'cat-eye':
      return `linear-gradient(160deg, ${hex} 25%, rgb(255 236 200 / 0.95) 50%, ${hex} 75%)`
    default:
      return `radial-gradient(70% 45% at 32% 22%, rgb(255 255 255 / 0.65), transparent 55%), linear-gradient(180deg, ${hex}, ${hex})`
  }
}

export function NailSwatch({ hex, finish, shape, className = '' }: { hex: string; finish: Finish; shape: NailShape; className?: string }) {
  return (
    <span
      aria-hidden
      className={`block shadow-[inset_-6px_-8px_14px_rgb(0_0_0/0.18)] ${className}`}
      style={{ background: polishBackground(hex, finish), ...SHAPE_STYLE[shape] }}
    />
  )
}
