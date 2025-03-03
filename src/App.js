import { Canvas } from '@react-three/fiber'
import { Box, Environment, OrbitControls, ContactShadows, Sphere } from '@react-three/drei'
import { Physics, RigidBody, useSphericalJoint, MeshCollider, CuboidCollider } from '@react-three/rapier'
import { Suspense, useRef } from 'react'
import { Rope } from './components/Rope'
import { StickFigure } from './components/StickFigure'
import './styles.css'

function HangingThing({ position }) {
  const anchor = useRef(null)
  const box = useRef(null)

  useSphericalJoint(anchor, box, [
    [0, 0, 0],
    [0, 2, 0]
  ])

  return (
    <group position={position}>
      {/* Anchor point */}
      <RigidBody ref={anchor} type="fixed" />

      {/* Hanging box */}
      <RigidBody ref={box} position={[0, -2, 0]}>
        <Box args={[0.2, 4, 0.2]}>
          <meshPhysicalMaterial />
        </Box>
        <MeshCollider type="ball">
          <Sphere args={[0.5]} position={[0, -2, 0]}>
            <meshPhysicalMaterial />
          </Sphere>
        </MeshCollider>
      </RigidBody>
    </group>
  )
}

function Scene() {
  return (
    <group>
      <HangingThing position={[-2, 3.5, 0]} />
      <HangingThing position={[-5, 3.5, 0]} />
      <HangingThing position={[-7, 3.5, 0]} />
      <HangingThing position={[2, 3.5, 0]} />
      <HangingThing position={[5, 3.5, 0]} />
      <HangingThing position={[7, 3.5, 0]} />

      <Rope length={10} />

      {/* Start stick figure higher up */}
      <StickFigure position={[0, 15, 0]} />

      {/* Floor */}
      <CuboidCollider position={[0, -2.5, 0]} args={[15, 1, 10]} />

      {/* Left Wall */}
      <CuboidCollider position={[-15, 8, 0]} args={[1, 12, 10]} />

      {/* Right Wall */}
      <CuboidCollider position={[15, 8, 0]} args={[1, 12, 10]} />

      {/* Back Wall */}
      <CuboidCollider position={[0, 8, -10]} args={[15, 12, 1]} />

      {/* Front Wall */}
      <CuboidCollider position={[0, 8, 10]} args={[15, 12, 1]} />

      {/* Ceiling */}
      <CuboidCollider position={[0, 18, 0]} args={[15, 1, 10]} />

      <ContactShadows scale={20} blur={0.4} opacity={0.2} position={[-0, -1.5, 0]} />

      <OrbitControls minDistance={1} maxDistance={50} minPolarAngle={0} maxPolarAngle={Math.PI / 1.5} />
    </group>
  )
}

export default function App() {
  return (
    <div className="App">
      <Suspense fallback={null}>
        <Canvas
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh'
          }}
          shadows
          camera={{
            position: [-8, 4, 8],
            fov: 50,
            near: 0.1,
            far: 1000
          }}>
          <Environment preset="studio" />
          <fog attach="fog" args={['#000', 2, 100]} />

          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
          <ambientLight intensity={0.5} />

          <Physics debug>
            <Scene />
          </Physics>
        </Canvas>
      </Suspense>
    </div>
  )
}
