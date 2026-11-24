import { Environment, Lightformer } from '@react-three/drei'

/** Iluminación de estudio de fotografía de producto, sin descargar HDRIs. */
export function Studio({ warm = false }: { warm?: boolean }) {
  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[-2.5, 4, 3.5]} intensity={1.6} color={warm ? '#fff1ea' : '#ffffff'} castShadow={false} />
      <directionalLight position={[3, 1.5, -2]} intensity={0.9} color="#ffd9cf" />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#2a1418']} />
        {/* softbox principal arriba-izquierda */}
        <Lightformer form="rect" intensity={3.2} color="#ffffff" position={[-3, 4, 4]} scale={[5, 3, 1]} target={[0, 0, 0]} />
        {/* tira vertical para el brillo lineal del esmalte */}
        <Lightformer form="rect" intensity={4} color="#ffffff" position={[2.6, 1, 3]} scale={[0.6, 6, 1]} target={[0, 0, 0]} />
        {/* relleno cálido */}
        <Lightformer form="rect" intensity={1.2} color="#ffd6c8" position={[0, -3, 3]} scale={[6, 2, 1]} target={[0, 0, 0]} />
        {/* contraluz bordó */}
        <Lightformer form="ring" intensity={2.2} color="#b3263f" position={[0, 2, -5]} scale={4} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.5} color="#ffffff" position={[-5, 0, -1]} scale={[2, 5, 1]} target={[0, 0, 0]} />
      </Environment>
    </>
  )
}
