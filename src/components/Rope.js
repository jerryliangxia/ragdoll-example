import { useFrame } from '@react-three/fiber'
import { Sphere } from '@react-three/drei'
import { RigidBody, useSphericalJoint } from '@react-three/rapier'
import { forwardRef, useRef, createRef } from 'react'
import { Quaternion } from 'three'

const RopeSegment = forwardRef(({ position, component, type }, ref) => {
  return (
    <RigidBody colliders="ball" ref={ref} type={type} position={position}>
      {component}
    </RigidBody>
  )
})

const RopeJoint = ({ a, b }) => {
  useSphericalJoint(a, b, [
    [-0.5, 0, 0],
    [0.5, 0, 0]
  ])
  return null
}

export function Rope({ length = 10 }) {
  const refs = useRef(Array.from({ length }).map(() => createRef()))

  useFrame(() => {
    const now = performance.now()
    refs.current[0].current?.setNextKinematicRotation(new Quaternion(0, Math.sin(now / 800) * 6, 0))
  })

  return (
    <group>
      {refs.current.map((ref, i) => (
        <RopeSegment
          ref={ref}
          key={i}
          position={[i * 1, 0, 0]}
          component={
            <Sphere args={[0.5]}>
              <meshStandardMaterial />
            </Sphere>
          }
          type={i === 0 ? 'kinematicPosition' : 'dynamic'}
        />
      ))}
      {refs.current.map((ref, i) => i > 0 && <RopeJoint a={refs.current[i]} b={refs.current[i - 1]} key={i} />)}
    </group>
  )
}
