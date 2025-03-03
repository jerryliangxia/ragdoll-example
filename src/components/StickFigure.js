import { useRef } from 'react'
import { RigidBody, useSphericalJoint, CuboidCollider } from '@react-three/rapier'
import { useGLTF, Text } from '@react-three/drei'
import { useControls } from 'leva'

// for debug
const typeRigidBody = 'dynamic'
const isMeshVisible = true

function BoneLabel({ text, position }) {
  return (
    <Text position={[position[0], position[1] + 0.2, position[2]]} fontSize={0.1} color="white" anchorX="center" anchorY="bottom">
      {text}
    </Text>
  )
}

export function StickFigure({ position = [0, 0, 0], debug = true, axeVisible = false }) {
  const { nodes } = useGLTF('/pepe.glb')

  // Disable frustum culling for all objects in the model and hide axe parts
  nodes.Scene.traverse((object) => {
    object.frustumCulled = false
    // Control Axe and AxeHead visibility
    if (object.name === 'Axe' || object.name === 'AxeHead') {
      object.visible = axeVisible
    }
  })

  // Dimensions controls
  const dimensions = useControls('Dimensions', {
    rootDimensions: { value: [0.25, 0.25, 0.25], step: 0.01 },
    headDimensions: { value: [0.073831, 0.73831, 0.073831], step: 0.01 },
    armDimensions: { value: [0.13, 0.1, 0.13], step: 0.01 },
    legDimensions: { value: [0.2, 0.2, 0.2], step: 0.01 }
  })

  // Body Position controls
  const bodyPositions = useControls('Body Positions', {
    rootPosition: { value: [0, 1, 0], step: 0.01 },
    headPosition: { value: [0, 0.859261, 0], step: 0.01 },
    armlPosition: { value: [0.4, 1.13, 0], step: 0.01 },
    armrPosition: { value: [-0.4, 1.13, 0], step: 0.01 },
    leglPosition: { value: [0.25, 0.5, 0], step: 0.01 },
    legrPosition: { value: [-0.25, 0.5, 0], step: 0.01 }
  })

  // Fixed rotations for limbs
  const fixedRotations = {
    armlRotation: [0, 0, -90],
    armrRotation: [0, 0, 90]
  }

  // Offset controls for visual adjustments
  const offsets = useControls('Visual Offsets', {
    boneOffset: { value: [0, -1, 0], step: 0.01 },
    armlOffset: { value: [-0.3, -0.75, 0], step: 0.01 },
    armrOffset: { value: [0.3, -0.75, 0], step: 0.01 },
    leglOffset: { value: [-0.25, -0.5, 0], step: 0.01 },
    legrOffset: { value: [0.25, -0.5, 0], step: 0.01 }
  })

  // Refs for all major body parts
  const root = useRef(null)
  const armL = useRef(null)
  const armR = useRef(null)
  const legL = useRef(null)
  const legR = useRef(null)

  // Calculate relative positions
  const getRelativePosition = (pos1, pos2) => [(pos1[0] - pos2[0]) / 2, (pos1[1] - pos2[1]) / 2, (pos1[2] - pos2[2]) / 2]

  // useSphericalJoint(A,B,(B,A),(A,B))
  useSphericalJoint(root, legL, [
    getRelativePosition(bodyPositions.leglPosition, bodyPositions.rootPosition),
    getRelativePosition(bodyPositions.rootPosition, bodyPositions.leglPosition)
  ])
  useSphericalJoint(root, legR, [
    getRelativePosition(bodyPositions.legrPosition, bodyPositions.rootPosition),
    getRelativePosition(bodyPositions.rootPosition, bodyPositions.legrPosition)
  ])
  useSphericalJoint(root, armL, [
    getRelativePosition(bodyPositions.armlPosition, bodyPositions.rootPosition),
    getRelativePosition(bodyPositions.rootPosition, bodyPositions.armlPosition)
  ])
  useSphericalJoint(root, armR, [
    getRelativePosition(bodyPositions.armrPosition, bodyPositions.rootPosition),
    getRelativePosition(bodyPositions.rootPosition, bodyPositions.armrPosition)
  ])

  return (
    <group position={position}>
      {/* Root/Bone (main body) */}
      <RigidBody ref={root} position={bodyPositions.rootPosition} type={typeRigidBody} linearDamping={2} angularDamping={3} friction={1}>
        <CuboidCollider args={dimensions.rootDimensions} />
        {debug && (
          <>
            <BoneLabel text="Bone" position={[0, 0.2, 0]} />
          </>
        )}
        <group position={offsets.boneOffset}>
          <primitive object={nodes.Bone} />
        </group>
      </RigidBody>

      {/* Left Arm */}
      <RigidBody ref={armL} position={bodyPositions.armlPosition} type={typeRigidBody} linearDamping={2} angularDamping={3} friction={1}>
        <CuboidCollider args={dimensions.armDimensions} />
        <group position={offsets.armlOffset}>
          <primitive object={nodes.arml} rotation={fixedRotations.armlRotation.map((r) => (r * Math.PI) / 180)} />
        </group>
      </RigidBody>

      {/* Right Arm */}
      <RigidBody ref={armR} position={bodyPositions.armrPosition} type={typeRigidBody} linearDamping={2} angularDamping={3} friction={1}>
        <CuboidCollider args={dimensions.armDimensions} />
        <group position={offsets.armrOffset}>
          <primitive object={nodes.armr} rotation={fixedRotations.armrRotation.map((r) => (r * Math.PI) / 180)} />
        </group>
      </RigidBody>

      {/* Left Leg */}
      <RigidBody ref={legL} position={bodyPositions.leglPosition} type={typeRigidBody} linearDamping={2} angularDamping={3} friction={1}>
        <CuboidCollider args={dimensions.legDimensions} />
        <group position={offsets.leglOffset}>
          <primitive object={nodes.legl} />
        </group>
      </RigidBody>

      {/* Right Leg */}
      <RigidBody ref={legR} position={bodyPositions.legrPosition} type={typeRigidBody} linearDamping={2} angularDamping={3} friction={1}>
        <CuboidCollider args={dimensions.legDimensions} />
        <group position={offsets.legrOffset}>
          <primitive object={nodes.legr} />
        </group>
      </RigidBody>

      {/* Main mesh */}
      {isMeshVisible && <primitive object={nodes.Scene} scale={[2, 2, 2]} />}
    </group>
  )
}

useGLTF.preload('/pepe.glb')
