import { Canvas } from '@react-three/fiber'
import { Box, Environment, OrbitControls, ContactShadows, Sphere } from '@react-three/drei'
import { Physics, RigidBody, useSphericalJoint, MeshCollider, CuboidCollider } from '@react-three/rapier'
import { Suspense, useRef, useEffect, useState } from 'react'
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
  const pepeRef = useRef()
  const [isShiftPressed, setIsShiftPressed] = useState(false)
  const controlsRef = useRef()

  const handleReset = () => {
    if (pepeRef.current) {
      pepeRef.current.reset()
    }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true)
        if (controlsRef.current) {
          controlsRef.current.enabled = true
        }
      }
    }

    const handleKeyUp = (e) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false)
        if (controlsRef.current) {
          controlsRef.current.enabled = false
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    const scene = document.querySelector('canvas')?.parentElement
    if (scene) {
      scene.addEventListener('reset-pepe', handleReset)
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      if (scene) {
        scene.removeEventListener('reset-pepe', handleReset)
      }
    }
  }, [])

  return (
    <group>
      <OrbitControls ref={controlsRef} enabled={isShiftPressed} enablePan={true} enableZoom={true} enableRotate={true} />

      {/* Just one stick figure */}
      <StickFigure ref={pepeRef} position={[0, 1, 0]} forearmsEnabled={false} isShiftPressed={isShiftPressed} />

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
    </group>
  )
}

export default function App() {
  return (
    <div className="App">
      <button
        onClick={() => {
          const scene = document.querySelector('canvas')?.parentElement
          if (scene) {
            const event = new CustomEvent('reset-pepe')
            scene.dispatchEvent(event)
          }
        }}
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          zIndex: 1000
        }}>
        Reset Pepe
      </button>
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
            position: [0, 5, 15],
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
