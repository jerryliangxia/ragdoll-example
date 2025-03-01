import { useRef } from 'react'
import { RigidBody, useSphericalJoint, CuboidCollider } from '@react-three/rapier'
import { useControls } from 'leva'
import { Block } from '../helpers/Block'

function Limb({ position, prevBody = null, color = '#ff7b00', scale = [0.4, 0.4, 0.4], config }) {
  const bodyA = useRef(null)
  const bodyB = useRef(null)

  // Joint between A and B within the limb - increased distance and stiffness
  useSphericalJoint(
    bodyA,
    bodyB,
    [
      [0, -config.jointDistance, 0],
      [0, config.jointDistance, 0]
    ],
    {
      stiffness: config.jointStiffness,
      damping: config.jointDamping
    }
  )

  // Joint with previous body if it exists
  if (prevBody) {
    useSphericalJoint(
      prevBody,
      bodyA,
      [
        [0, -config.jointDistance, 0],
        [0, config.jointDistance, 0]
      ],
      {
        stiffness: config.jointStiffness,
        damping: config.jointDamping
      }
    )
  }

  return (
    <group position={position}>
      <RigidBody ref={bodyA} linearDamping={config.linearDamping} angularDamping={config.angularDamping} friction={config.friction} colliders="cuboid">
        <Block scale={scale} color={color} />
      </RigidBody>
      <RigidBody ref={bodyB} linearDamping={config.linearDamping} angularDamping={config.angularDamping} friction={config.friction} colliders="cuboid">
        <Block scale={scale} color={color} />
      </RigidBody>
    </group>
  )
}

export function StickFigure({ startHeight = 15 }) {
  const head = useRef(null)
  const torso = useRef(null)
  const pelvis = useRef(null)

  const config = useControls({
    // Physics parameters
    jointStiffness: { value: 1000, min: 0, max: 5000, step: 100 },
    jointDamping: { value: 100, min: 0, max: 500, step: 10 },
    linearDamping: { value: 2, min: 0, max: 10, step: 0.1 },
    angularDamping: { value: 3, min: 0, max: 10, step: 0.1 },
    friction: { value: 1, min: 0, max: 5, step: 0.1 },
    jointDistance: { value: 0.4, min: 0.1, max: 1, step: 0.1 },

    // Figure dimensions
    headSize: { value: 0.6, min: 0.2, max: 1, step: 0.1 },
    torsoWidth: { value: 0.4, min: 0.2, max: 1, step: 0.1 },
    torsoHeight: { value: 1.2, min: 0.5, max: 2, step: 0.1 },
    pelvisWidth: { value: 0.5, min: 0.2, max: 1, step: 0.1 },
    pelvisHeight: { value: 0.4, min: 0.2, max: 1, step: 0.1 },
    limbWidth: { value: 0.3, min: 0.1, max: 0.5, step: 0.05 },
    limbHeight: { value: 0.8, min: 0.3, max: 1.5, step: 0.1 },

    // Spacing
    armSpacing: { value: 1.2, min: 0.5, max: 2, step: 0.1 },
    legSpacing: { value: 0.6, min: 0.2, max: 1, step: 0.1 }
  })

  useSphericalJoint(
    head,
    torso,
    [
      [0, -config.jointDistance, 0],
      [0, config.jointDistance, 0]
    ],
    {
      stiffness: config.jointStiffness,
      damping: config.jointDamping
    }
  )

  useSphericalJoint(
    torso,
    pelvis,
    [
      [0, -config.jointDistance, 0],
      [0, config.jointDistance, 0]
    ],
    {
      stiffness: config.jointStiffness,
      damping: config.jointDamping
    }
  )

  return (
    <>
      {/* Head */}
      <RigidBody
        ref={head}
        position={[0, startHeight, 0]}
        linearDamping={config.linearDamping}
        angularDamping={config.angularDamping}
        friction={config.friction}
        colliders="cuboid">
        <Block scale={[config.headSize, config.headSize, config.headSize]} color="red" />
      </RigidBody>

      {/* Torso */}
      <RigidBody
        ref={torso}
        position={[0, startHeight - 1.5, 0]}
        linearDamping={config.linearDamping}
        angularDamping={config.angularDamping}
        friction={config.friction}
        lockRotations={true}
        colliders="cuboid">
        <Block scale={[config.torsoWidth, config.torsoHeight, config.torsoWidth]} color="#ff7b00" />
      </RigidBody>

      {/* Pelvis */}
      <RigidBody
        ref={pelvis}
        position={[0, startHeight - 3, 0]}
        linearDamping={config.linearDamping}
        angularDamping={config.angularDamping}
        friction={config.friction}
        lockRotations={true}
        colliders="cuboid">
        <Block scale={[config.pelvisWidth, config.pelvisHeight, config.pelvisWidth]} color="#ff7b00" />
      </RigidBody>

      {/* Arms */}
      <Limb
        position={[-config.armSpacing, startHeight - 1.5, 0]}
        prevBody={torso}
        scale={[config.limbWidth, config.limbHeight, config.limbWidth]}
        config={config}
      />
      <Limb
        position={[config.armSpacing, startHeight - 1.5, 0]}
        prevBody={torso}
        scale={[config.limbWidth, config.limbHeight, config.limbWidth]}
        config={config}
      />

      {/* Legs */}
      <Limb
        position={[-config.legSpacing, startHeight - 3.5, 0]}
        prevBody={pelvis}
        scale={[config.limbWidth, config.limbHeight, config.limbWidth]}
        config={config}
      />
      <Limb
        position={[config.legSpacing, startHeight - 3.5, 0]}
        prevBody={pelvis}
        scale={[config.limbWidth, config.limbHeight, config.limbWidth]}
        config={config}
      />
    </>
  )
}
