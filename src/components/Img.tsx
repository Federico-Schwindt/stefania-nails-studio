import { useEffect, useState, type ImgHTMLAttributes } from 'react'
import { api, assetUrl } from '../lib/api'

/** Resuelve una ref de imagen (URL, ruta del sitio o `img:<id>` guardada en Neon) a algo usable en <img src>. */
const direct = (ref: string) => (/^(\/|https?:|data:|blob:)/.test(ref) ? ref : assetUrl(ref))

export function useImageSrc(ref?: string) {
  const [src, setSrc] = useState<string | undefined>(() => (ref && !ref.startsWith('img:') ? direct(ref) : undefined))
  useEffect(() => {
    let alive = true
    if (!ref) {
      setSrc(undefined)
      return
    }
    if (!ref.startsWith('img:')) {
      setSrc(direct(ref))
      return
    }
    api
      .resolveImage(ref)
      .then((s) => alive && setSrc(s))
      .catch(() => alive && setSrc(undefined))
    return () => {
      alive = false
    }
  }, [ref])
  return src
}

/** <img> que entiende las refs `img:<id>` guardadas en la base. Muestra un placeholder mientras carga. */
export function Img({ src, className = '', alt = '', ...rest }: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { src?: string }) {
  const resolved = useImageSrc(src)
  if (!resolved) return <span aria-hidden className={`block animate-pulse bg-gris-100 ${className}`} />
  return <img src={resolved} alt={alt} className={className} {...rest} />
}

/** Abre una imagen (también refs `img:`) en una pestaña nueva. */
export async function openImage(ref: string) {
  const src = ref.startsWith('img:') ? await api.resolveImage(ref) : direct(ref)
  const w = window.open()
  if (w) w.document.write(`<title>Imagen</title><body style="margin:0;background:#111;display:grid;place-items:center;min-height:100vh"><img src="${src}" style="max-width:100%;max-height:100vh"></body>`)
}
