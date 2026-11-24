import { PresentationControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { Suspense } from 'react'
import type { NailDesignParams } from '../lib/types'
import { NailFan } from './NailFan'
import { Studio } from './Studio'

/** Aleja la cámara en pantallas angostas para que entre todo el abanico. */
function FitCamera() {
  const { camera, size } = useThree()
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height)
    camera.position.z = aspect < 0.8 ? 1.75 : aspect < 1.2 ? 1.4 : 1.12
    camera.updateProjectionMatrix()
  }, [camera, size])
  return null
}

/**
 * Visor 3D de diseño: muestrario de tips de soft gel (uno por dedo) con el diseño aplicado.
 * Se mantiene el nombre HandViewer por compatibilidad con el panel admin.
 */
export default function HandViewer({
  params,
  focus = false,
  className = '',
  interactive = true,
}: {
  params: NailDesignParams
  focus?: boolean
  className?: string
  interactive?: boolean
}) {
  const fan = <NailFan params={params} spread={focus ? 1 : 0} />
  return (
    <div className={`relative ${className}`}>
      <Canvas camera={{ position: [0, 0.04, 1.12], fov: 30 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }} shadows={false}>
        <Suspense fallback={null}>
          <Studio />
          <FitCamera />
          {interactive ? (
            <PresentationControls global={false} cursor snap polar={[-0.4, 0.4]} azimuth={[-1.2, 1.2]} speed={1.5}>
              {fan}
            </PresentationControls>
          ) : (
            fan
          )}
        </Suspense>
      </Canvas>
    </div>
  )
}
