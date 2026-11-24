import * as THREE from 'three'
import type { NailShape } from '../lib/types'

export interface FingerRig {
  dip: [number, number, number]
  tip: [number, number, number]
  d: [number, number, number]
  n: [number, number, number]
  l: [number, number, number]
  r1: number
  r2: number
  length: number
  flat: number
}

const smooth = (x: number) => x * x * (3 - 2 * x)

/**
 * Superficie paramétrica de una uña apoyada sobre la falange distal.
 * s ∈ [-1, 1] ancho (relativo al ancho local), t ∈ [0, 1] desde la cutícula hasta el borde libre.
 */
export class NailSurface {
  readonly dip: THREE.Vector3
  readonly d: THREE.Vector3
  readonly n: THREE.Vector3
  readonly l: THREE.Vector3
  readonly c0: number
  readonly Ln: number
  readonly Wmax: number
  /** t donde termina el lecho y empieza el borde libre */
  readonly tBed: number
  private readonly shapeStart: number
  private readonly tc: number

  constructor(
    readonly rig: FingerRig,
    readonly shape: NailShape,
    length: number,
  ) {
    this.dip = new THREE.Vector3(...rig.dip)
    this.d = new THREE.Vector3(...rig.d)
    this.n = new THREE.Vector3(...rig.n)
    this.l = new THREE.Vector3(...rig.l)
    const L = rig.length
    this.c0 = L * 0.34
    const aBed = L + rig.r2 * 0.32
    const free = 0.008 + Math.max(0, Math.min(1, length)) * (shape === 'stiletto' ? 0.2 : 0.16)
    this.Ln = aBed - this.c0 + free
    this.tBed = (aBed - this.c0) / this.Ln
    this.Wmax = this.rAt(this.c0) * 0.8
    this.tc = Math.min(0.3, (this.Wmax * 0.5) / this.Ln)

    const taper: Record<NailShape, number> = {
      oval: this.Wmax * 1.05,
      almond: this.Wmax * 2.3,
      stiletto: this.Wmax * 3.6,
      square: 0.006,
      squoval: this.Wmax * 0.5,
      coffin: Math.max(free, this.Wmax * 1.4),
    }
    this.shapeStart = Math.max(this.tc + 0.08, 1 - taper[shape] / this.Ln)
  }

  rAt(a: number) {
    const L = this.rig.length
    const k = Math.min(1, Math.max(0, a / L))
    return this.rig.r1 + (this.rig.r2 - this.rig.r1) * k
  }

  /** Medio ancho de la uña en t. */
  width(t: number) {
    const W = this.Wmax
    let w = W
    if (t < this.tc) {
      const k = (this.tc - t) / this.tc
      w = W * Math.sqrt(Math.max(0, 1 - k * k))
    }
    if (this.shape === 'square' || this.shape === 'squoval' || this.shape === 'coffin') w *= 1 + 0.05 * Math.max(0, t - this.tBed)
    if (t > this.shapeStart) {
      const u = Math.min(1, (t - this.shapeStart) / (1 - this.shapeStart))
      switch (this.shape) {
        case 'oval':
          w *= Math.sqrt(Math.max(0, 1 - u * u))
          break
        case 'almond':
          w *= Math.pow(Math.cos((u * Math.PI) / 2), 0.78)
          break
        case 'stiletto':
          w *= Math.pow(Math.cos((u * Math.PI) / 2), 1.25)
          break
        case 'square':
          w *= Math.sqrt(Math.max(0, 1 - u * u))
          break
        case 'squoval':
          w *= Math.pow(Math.max(0, 1 - Math.pow(u, 3.2)), 1 / 3.2)
          break
        case 'coffin': {
          const corner = u > 0.93 ? Math.sqrt(Math.max(0, 1 - ((u - 0.93) / 0.07) ** 2)) : 1
          w *= (1 - 0.4 * smooth(u)) * (0.35 + 0.65 * corner)
          break
        }
      }
    }
    return Math.max(w, 0.0004)
  }

  /** Altura de la cara superior sobre el eje del dedo. */
  height(a: number) {
    const L = this.rig.length
    const off = 0.0045
    if (a <= L) return this.rAt(a) * this.rig.flat + off
    const over = a - L
    return this.rig.r2 * this.rig.flat + off - 0.32 * over * over - 0.02 * over
  }

  point(s: number, t: number, out = new THREE.Vector3(), lift = 0) {
    const a = this.c0 + t * this.Ln
    const x = s * this.width(t)
    const Rc = this.rAt(Math.min(a, this.rig.length)) * 1.06
    const phi = x / Rc
    const h = this.height(a) + lift
    out
      .copy(this.dip)
      .addScaledVector(this.d, a)
      .addScaledVector(this.n, h + Rc * (Math.cos(phi) - 1))
      .addScaledVector(this.l, Rc * Math.sin(phi))
    return out
  }

  /** Normal aproximada de la superficie en (s, t). */
  normal(s: number, t: number, out = new THREE.Vector3()) {
    const e = 0.01
    const p0 = this.point(s, t)
    const ps = this.point(Math.min(1, s + e), t).sub(this.point(Math.max(-1, s - e), t))
    const pt = this.point(s, Math.min(1, t + e)).sub(this.point(s, Math.max(0, t - e)))
    out.crossVectors(ps, pt).normalize()
    if (out.dot(this.n) < 0) out.negate()
    void p0
    return out
  }

  /** UV físico: u ∝ posición lateral absoluta, v = t */
  uv(s: number, t: number): [number, number] {
    return [0.5 + (s * this.width(t)) / (2 * this.Wmax * 1.06), t]
  }

  /** Relación alto/ancho del rectángulo de textura (para dibujar sin deformar). */
  get aspect() {
    return this.Ln / (2 * this.Wmax * 1.06)
  }
}

/** Geometría cerrada (cara superior, inferior y canto) para una uña. */
export function buildNailGeometry(surf: NailSurface, segS = 22, segT = 46): THREE.BufferGeometry {
  const pos: number[] = []
  const uvs: number[] = []
  const idx: number[] = []
  const tmp = new THREE.Vector3()
  const nrm = new THREE.Vector3()
  const cols = segS + 1
  const rows = segT + 1
  const thick = (s: number, t: number) => (0.0085 + 0.004 * Math.min(1, t * 3)) * (1 - 0.55 * s * s)

  // cara superior y cara inferior
  for (let side = 0; side < 2; side++) {
    for (let j = 0; j < rows; j++) {
      const t = j / segT
      for (let i = 0; i < cols; i++) {
        const s = -1 + (2 * i) / segS
        surf.point(s, t, tmp)
        if (side === 1) {
          surf.normal(s, t, nrm)
          tmp.addScaledVector(nrm, -thick(s, t))
        }
        pos.push(tmp.x, tmp.y, tmp.z)
        const [u, v] = surf.uv(s, t)
        uvs.push(u, v)
      }
    }
  }
  const off = cols * rows
  for (let j = 0; j < segT; j++) {
    for (let i = 0; i < segS; i++) {
      const a = j * cols + i
      const b = a + 1
      const c = a + cols
      const d = c + 1
      idx.push(a, b, d, a, d, c) // superior
      idx.push(off + a, off + d, off + b, off + a, off + c, off + d) // inferior (invertida)
    }
  }
  // canto: recorrer el contorno (borde izquierdo, punta, borde derecho, base)
  const loop: number[] = []
  for (let j = 0; j < rows; j++) loop.push(j * cols) // izquierda
  for (let i = 1; i < cols; i++) loop.push(segT * cols + i) // punta
  for (let j = segT - 1; j >= 0; j--) loop.push(j * cols + segS) // derecha
  for (let i = segS - 1; i > 0; i--) loop.push(i) // base
  for (let k = 0; k < loop.length; k++) {
    const a = loop[k]
    const b = loop[(k + 1) % loop.length]
    idx.push(a, off + a, b, b, off + a, off + b)
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}
