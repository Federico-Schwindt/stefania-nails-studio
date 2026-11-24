import type { NailLayer } from '../lib/types'

/**
 * Dibuja el diseño de una uña sobre dos canvas:
 *  - color: albedo (lecho rosado + base translúcida + punta + patrón)
 *  - orm:   G = rugosidad, B = metalizado (formato glTF / three.js)
 * El rectángulo de textura cubre el ancho máximo de la uña (u) por su largo (v, 0 = cutícula).
 */
export interface PaintState {
  color: string
  progress: number // 0..1 cuánto se extendió el esmalte
  origin: [number, number] // uv del impacto de la gota
}

export interface NailCanvas {
  color: HTMLCanvasElement
  orm: HTMLCanvasElement
}

const W = 256

function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return ((s >>> 0) % 100000) / 100000
  }
}

function hexA(hex: string, a: number) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export function createNailCanvas(aspect: number): NailCanvas {
  const h = Math.min(1024, Math.max(256, Math.round(W * aspect)))
  const mk = () => {
    const c = document.createElement('canvas')
    c.width = W
    c.height = h
    return c
  }
  return { color: mk(), orm: mk() }
}

/** Línea de sonrisa de la francesita, en px (y crece hacia la punta). */
function smileY(x: number, w: number, h: number, layer: NailLayer, tBed: number) {
  const u = (x / w) * 2 - 1
  const size = layer.tipSize
  const free = 1 - tBed
  switch (layer.tip) {
    case 'french': {
      const v0 = tBed - 0.01 - size * 0.06
      return (v0 - (0.05 + size * 0.1) * (u * u)) * h
    }
    case 'deep-french': {
      const v0 = tBed - 0.03 - size * 0.14
      return (v0 - (0.08 + size * 0.16) * (u * u)) * h
    }
    case 'v-french': {
      const v0 = tBed + 0.02 - size * 0.1
      return (v0 - (0.1 + size * 0.16) * Math.abs(u)) * h
    }
    case 'micro-french':
      return (1 - Math.max(0.06, free * (0.22 + size * 0.35))) * h
    default:
      return h
  }
}

function drawFlower(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, petal: string, center: string) {
  ctx.fillStyle = petal
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    ctx.beginPath()
    ctx.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.5, r * 0.36, a, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = center
  ctx.beginPath()
  ctx.arc(x, y, r * 0.26, 0, Math.PI * 2)
  ctx.fill()
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 === 0 ? r : r * 0.45
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  ctx.closePath()
  ctx.fill()
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x, y + r * 0.9)
  ctx.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.6, y - r * 1.1, x, y - r * 0.35)
  ctx.bezierCurveTo(x + r * 0.6, y - r * 1.1, x + r * 1.4, y - r * 0.1, x, y + r * 0.9)
  ctx.fill()
}

function drawPattern(ctx: CanvasRenderingContext2D, layer: NailLayer, w: number, h: number, seed: number) {
  const r = rng(seed)
  const s = 0.5 + layer.patternScale
  const c1 = layer.patternColor
  const c2 = layer.patternColor2 ?? c1
  ctx.save()
  switch (layer.pattern) {
    case 'dots': {
      ctx.fillStyle = c1
      const gap = 46 / s
      for (let y = gap * 0.6; y < h; y += gap) {
        const row = Math.round(y / gap)
        for (let x = (row % 2) * gap * 0.5 + gap * 0.3; x < w; x += gap) {
          ctx.beginPath()
          ctx.arc(x + (r() - 0.5) * 6, y + (r() - 0.5) * 6, 9 * s * (0.8 + r() * 0.4), 0, Math.PI * 2)
          ctx.fill()
        }
      }
      break
    }
    case 'flowers': {
      const n = Math.max(1, Math.round(1 + s))
      for (let i = 0; i < n; i++) drawFlower(ctx, w * (0.5 + (r() - 0.5) * 0.3), h * (0.35 + i * 0.3), 46 * s, c1, c2)
      ctx.fillStyle = c1
      for (let i = 0; i < 7; i++) {
        ctx.beginPath()
        ctx.arc(w * r(), h * (0.15 + r() * 0.7), 4 + r() * 4, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'stars': {
      ctx.fillStyle = c1
      drawStar(ctx, w * 0.5, h * 0.42, 54 * s)
      for (let i = 0; i < 4; i++) drawStar(ctx, w * (0.2 + r() * 0.6), h * (0.62 + r() * 0.28), 12 + r() * 10)
      break
    }
    case 'hearts': {
      ctx.fillStyle = c1
      drawHeart(ctx, w * 0.5, h * 0.42, 46 * s)
      for (let i = 0; i < 3; i++) drawHeart(ctx, w * (0.25 + r() * 0.5), h * (0.66 + r() * 0.24), 12 + r() * 8)
      break
    }
    case 'lines': {
      ctx.strokeStyle = c1
      ctx.lineWidth = 9 * s
      ctx.lineCap = 'round'
      const gap = 40 / s
      for (let x = gap * 0.5; x < w; x += gap) {
        ctx.beginPath()
        ctx.moveTo(x, -10)
        for (let y = 0; y <= h + 20; y += 30) ctx.lineTo(x + Math.sin(y * 0.02 + x) * 6, y)
        ctx.stroke()
      }
      break
    }
    case 'cow': {
      ctx.fillStyle = c1
      for (let i = 0; i < 6; i++) {
        const cx = w * r()
        const cy = h * (0.1 + r() * 0.85)
        const rad = (30 + r() * 40) * s
        ctx.beginPath()
        for (let k = 0; k <= 12; k++) {
          const a = (k / 12) * Math.PI * 2
          const rr = rad * (0.7 + r() * 0.5)
          ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 1.2)
        }
        ctx.closePath()
        ctx.fill()
      }
      break
    }
    case 'leopard': {
      for (let i = 0; i < 16; i++) {
        const cx = w * r()
        const cy = h * r()
        const rad = (12 + r() * 10) * s
        ctx.fillStyle = c2
        ctx.beginPath()
        ctx.ellipse(cx, cy, rad, rad * 0.8, r() * 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = c1
        ctx.lineWidth = 5
        ctx.beginPath()
        ctx.arc(cx, cy, rad * 1.15, r() * 2, r() * 2 + 2.6)
        ctx.stroke()
      }
      break
    }
    case 'tortoise': {
      const g = ctx.createLinearGradient(0, 0, w, h)
      g.addColorStop(0, hexA(c2, 0.9))
      g.addColorStop(1, hexA(c1, 0.95))
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      ctx.filter = 'blur(10px)'
      for (let i = 0; i < 14; i++) {
        ctx.fillStyle = r() > 0.5 ? hexA(c1, 0.9) : hexA('#1c0d07', 0.85)
        ctx.beginPath()
        ctx.ellipse(w * r(), h * r(), (18 + r() * 30) * s, (14 + r() * 26) * s, r() * 3, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.filter = 'none'
      break
    }
    case 'swirl': {
      ctx.strokeStyle = c1
      ctx.lineWidth = 12 * s
      ctx.lineCap = 'round'
      for (let k = 0; k < 3; k++) {
        ctx.beginPath()
        ctx.moveTo(-10, h * (0.2 + k * 0.25))
        ctx.bezierCurveTo(w * 0.3, h * (0.05 + k * 0.25), w * 0.7, h * (0.45 + k * 0.25), w + 10, h * (0.25 + k * 0.25))
        ctx.stroke()
      }
      ctx.strokeStyle = c2
      ctx.lineWidth = 6 * s
      ctx.beginPath()
      ctx.moveTo(-10, h * 0.55)
      ctx.bezierCurveTo(w * 0.4, h * 0.35, w * 0.6, h * 0.8, w + 10, h * 0.6)
      ctx.stroke()
      break
    }
  }
  ctx.restore()
}

export function drawNail(
  canvas: NailCanvas,
  layer: NailLayer,
  opts: { tBed: number; seed: number; paint?: PaintState },
) {
  const ctx = canvas.color.getContext('2d')!
  const orm = canvas.orm.getContext('2d')!
  const w = canvas.color.width
  const h = canvas.color.height
  const bedY = opts.tBed * h
  const roughBase = layer.finish === 'matte' ? 200 : layer.finish === 'chrome' ? 30 : 70
  const metalBase = layer.finish === 'chrome' ? 255 : 0

  // --- uña natural: lecho rosado, lúnula y borde libre
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  const bed = ctx.createLinearGradient(0, 0, 0, bedY)
  bed.addColorStop(0, '#f6d8d2')
  bed.addColorStop(0.18, '#efc1b9')
  bed.addColorStop(1, '#eab2aa')
  ctx.fillStyle = bed
  ctx.fillRect(0, 0, w, bedY + 2)
  ctx.fillStyle = '#f7ece4'
  ctx.fillRect(0, bedY, w, h - bedY)
  const lun = ctx.createRadialGradient(w / 2, 0, 0, w / 2, 0, w * 0.5)
  lun.addColorStop(0, 'rgba(255,245,242,0.65)')
  lun.addColorStop(1, 'rgba(255,245,242,0)')
  ctx.fillStyle = lun
  ctx.fillRect(0, 0, w, h * 0.3)

  // --- color base
  if (layer.finish === 'chrome') {
    ctx.fillStyle = layer.finishColor ?? '#dcdcdc'
    ctx.fillRect(0, 0, w, h)
  } else {
    ctx.fillStyle = hexA(layer.base, layer.baseOpacity)
    ctx.fillRect(0, 0, w, h)
  }

  orm.fillStyle = `rgb(255,${roughBase},${metalBase})`
  orm.fillRect(0, 0, w, h)

  // --- ojo de gato: banda brillante diagonal
  if (layer.finish === 'cat-eye') {
    const c = layer.finishColor ?? '#e2b765'
    const g = ctx.createLinearGradient(w * 0.1, 0, w * 0.9, h)
    g.addColorStop(0.32, hexA(c, 0))
    g.addColorStop(0.5, hexA(c, 0.95))
    g.addColorStop(0.68, hexA(c, 0))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    const gm = orm.createLinearGradient(w * 0.1, 0, w * 0.9, h)
    gm.addColorStop(0.3, 'rgb(255,60,0)')
    gm.addColorStop(0.5, 'rgb(255,40,210)')
    gm.addColorStop(0.7, 'rgb(255,60,0)')
    orm.fillStyle = gm
    orm.fillRect(0, 0, w, h)
  }

  // --- glitter: chispas en albedo + metalizado puntual
  if (layer.finish === 'glitter') {
    const r = rng(opts.seed * 7 + 3)
    const c = layer.finishColor ?? '#f2e6dc'
    for (let i = 0; i < 520; i++) {
      const x = r() * w
      const y = r() * h
      const s = 1 + r() * 2.6
      ctx.fillStyle = hexA(c, 0.5 + r() * 0.5)
      ctx.fillRect(x, y, s, s)
      orm.fillStyle = `rgb(255,${20 + r() * 40},${180 + r() * 75})`
      orm.fillRect(x, y, s, s)
    }
  }

  // --- patrón
  if (layer.pattern !== 'none') drawPattern(ctx, layer, w, h, opts.seed)

  // --- punta
  if (layer.tip === 'ombre') {
    const start = (opts.tBed - 0.55 * layer.tipSize) * h
    const g = ctx.createLinearGradient(0, start, 0, h)
    g.addColorStop(0, hexA(layer.tipColor, 0))
    g.addColorStop(0.55, hexA(layer.tipColor, 0.75))
    g.addColorStop(1, hexA(layer.tipColor, 1))
    ctx.fillStyle = g
    ctx.fillRect(0, Math.max(0, start), w, h)
  } else if (layer.tip !== 'none') {
    const path = new Path2D()
    path.moveTo(0, h + 2)
    for (let x = 0; x <= w; x += 4) path.lineTo(x, smileY(x, w, h, layer, opts.tBed))
    path.lineTo(w, h + 2)
    path.closePath()
    ctx.fillStyle = layer.tipColor
    ctx.fill(path)
    if (layer.tipMetal) {
      orm.fillStyle = 'rgb(255,28,255)'
      orm.fill(path)
    }
    if (layer.accent === 'gold-line') {
      const line = new Path2D()
      for (let x = 0; x <= w; x += 4) {
        const y = smileY(x, w, h, layer, opts.tBed)
        if (x === 0) line.moveTo(x, y)
        else line.lineTo(x, y)
      }
      const col = layer.accentColor ?? '#d4ad62'
      ctx.strokeStyle = col
      ctx.lineWidth = 7
      ctx.stroke(line)
      orm.strokeStyle = 'rgb(255,30,255)'
      orm.lineWidth = 7
      orm.stroke(line)
    }
  }

  // --- animación de esmaltado (gota)
  if (opts.paint && opts.paint.progress > 0) {
    const p = opts.paint
    const cx = p.origin[0] * w
    const cy = p.origin[1] * h
    const maxR = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy)) * 1.05
    const R = maxR * Math.min(1, p.progress)
    ctx.fillStyle = p.color
    ctx.beginPath()
    const wob = rng(opts.seed + 11)
    const k = 28
    const phases = Array.from({ length: 4 }, () => wob() * Math.PI * 2)
    for (let i = 0; i <= k; i++) {
      const a = (i / k) * Math.PI * 2
      const wv = 1 + (1 - p.progress) * 0.18 * (Math.sin(a * 3 + phases[0]) * 0.6 + Math.sin(a * 5 + phases[1]) * 0.4)
      ctx.lineTo(cx + Math.cos(a) * R * wv, cy + Math.sin(a) * R * wv)
    }
    ctx.closePath()
    ctx.fill()
    orm.fillStyle = 'rgb(255,30,0)'
    orm.beginPath()
    orm.arc(cx, cy, R, 0, Math.PI * 2)
    orm.fill()
  }
}
