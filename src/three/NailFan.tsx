import { ContactShadows } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { type Finger, type NailDesignParams, type NailLayer } from '../lib/types'
import { buildNailGeometry, NailSurface, type FingerRig } from './nail'
import { createNailCanvas, drawNail, type NailCanvas } from './nailTexture'

/*
  Render de producto: cinco tips de soft gel en abanico (uno por dedo), como un muestrario.
  Cada tip usa la misma geometría paramétrica y las mismas texturas que el diseño real.
*/

const SIZES: Record<Finger, { r: number; len: number }> = {
  thumb: { r: 0.088, len: 0.24 },
  index: { r: 0.074, len: 0.2 },
  middle: { r: 0.077, len: 0.21 },
  ring: { r: 0.072, len: 0.2 },
  pinky: { r: 0.062, len: 0.18 },
}
// orden visual: meñique a pulgar, como una mano derecha vista desde el dorso
const ORDER: Finger[] = ['pinky', 'ring', 'middle', 'index', 'thumb']
const SEEDS: Record<Finger, number> = { thumb: 11, index: 23, middle: 37, ring: 41, pinky: 53 }

function rigFor(f: Finger): FingerRig {
  const s = SIZES[f]
  return { dip: [0, 0, 0], tip: [0, s.len, 0], d: [0, 1, 0], n: [0, 0, 1], l: [1, 0, 0], r1: s.r, r2: s.r * 0.94, length: s.len, flat: 0.86 }
}

export const layerOf = (p: NailDesignParams, f: Finger): NailLayer => ({ ...p.all, ...(p.fingers?.[f] ?? {}) })

function Tip({ finger, params }: { finger: Finger; params: NailDesignParams }) {
  const layer = layerOf(params, finger)
  const key = JSON.stringify(layer)
  const surf = useMemo(() => new NailSurface(rigFor(finger), params.shape, params.length), [finger, params.shape, params.length])
  const geometry = useMemo(() => {
    const g = buildNailGeometry(surf, 28, 56)
    // centrar el tip en su origen para poder girarlo
    g.computeBoundingBox()
    const c = new THREE.Vector3()
    g.boundingBox!.getCenter(c)
    g.translate(-c.x, -c.y, -c.z)
    return g
  }, [surf])
  const canvas = useMemo<NailCanvas>(() => createNailCanvas(surf.aspect), [surf])
  const tex = useMemo(() => {
    const map = new THREE.CanvasTexture(canvas.color)
    map.colorSpace = THREE.SRGBColorSpace
    map.flipY = false
    map.anisotropy = 8
    const orm = new THREE.CanvasTexture(canvas.orm)
    orm.flipY = false
    return { map, orm }
  }, [canvas])
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        map: tex.map,
        roughnessMap: tex.orm,
        metalnessMap: tex.orm,
        roughness: 1,
        metalness: 1,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        envMapIntensity: 1.4,
        side: THREE.DoubleSide,
        thickness: 0.02,
        ior: 1.5,
      }),
    [tex],
  )
  useEffect(() => {
    drawNail(canvas, { ...layer, baseOpacity: Math.max(layer.baseOpacity, 0.35) }, { tBed: 1.01, seed: SEEDS[finger] })
    tex.map.needsUpdate = true
    tex.orm.needsUpdate = true
    const sheer = layer.finish !== 'chrome' && layer.baseOpacity < 0.9 && layer.pattern === 'none'
    material.transmission = sheer ? 0.35 * (1 - layer.baseOpacity) : 0
    material.clearcoat = layer.finish === 'matte' ? 0 : 1
    material.clearcoatRoughness = layer.finish === 'matte' ? 0.7 : 0.03
    material.needsUpdate = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, canvas])
  useEffect(() => () => (geometry.dispose(), material.dispose(), tex.map.dispose(), tex.orm.dispose()), [geometry, material, tex])
  return <mesh geometry={geometry} material={material} castShadow />
}

export function NailFan({ params, spread = 0 }: { params: NailDesignParams; spread?: number }) {
  const group = useRef<THREE.Group>(null)
  const tips = useRef<(THREE.Group | null)[]>([])
  const spreadRef = useRef(0)
  const lastKey = useRef('')
  const pulse = useRef(0)
  const key = JSON.stringify(params)

  useFrame((state, dt) => {
    spreadRef.current += (spread - spreadRef.current) * (1 - Math.exp(-dt * 5))
    if (key !== lastKey.current) {
      lastKey.current = key
      pulse.current = 1
    }
    pulse.current = Math.max(0, pulse.current - dt * 1.8)
    const t = state.clock.elapsedTime
    const sp = spreadRef.current
    tips.current.forEach((g, i) => {
      if (!g) return
      const k = i - 2
      const angle = k * (0.2 + sp * 0.1)
      const radius = 0.62
      g.position.set(Math.sin(angle) * radius * (1 + sp * 0.15), Math.cos(angle) * radius - radius + Math.sin(t * 0.9 + i) * 0.006, -Math.abs(k) * 0.02)
      g.rotation.set(-0.35 + Math.sin(t * 0.6 + i * 0.7) * 0.05, Math.sin(t * 0.4 + i) * 0.25 + k * 0.08, -angle)
      const s = 1 + Math.sin(pulse.current * Math.PI) * 0.06 * (1 - Math.abs(k) * 0.15)
      g.scale.setScalar(s)
    })
    if (group.current) group.current.rotation.y = Math.sin(t * 0.3) * 0.12
  })

  return (
    <group>
      <group ref={group} position={[0, 0.08, 0]}>
        {ORDER.map((fg, i) => (
          <group key={fg} ref={(el) => void (tips.current[i] = el)}>
            <Tip finger={fg} params={params} />
          </group>
        ))}
      </group>
      <ContactShadows position={[0, -0.22, 0]} opacity={0.32} scale={2.2} blur={2.6} far={0.6} color="#492d23" />
    </group>
  )
}
