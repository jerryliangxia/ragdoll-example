import { useRef, useMemo } from 'react'
import { RigidBody, useSphericalJoint, CuboidCollider, useFixedJoint } from '@react-three/rapier'
import { useGLTF, Text } from '@react-three/drei'
import { useGraph } from '@react-three/fiber'
import { SkeletonUtils } from 'three-stdlib'

// for debug
const typeRigidBody = 'dynamic'
const isMeshVisible = true

// Static dimensions
const dimensions = {
  rootDimensions: [0.25, 0.25, 0.25],
  headDimensions: [0.073831, 0.73831, 0.073831],
  armDimensions: [0.13, 0.1, 0.13],
  legDimensions: [0.2, 0.2, 0.2],
  forearmDimensions: [0.1, 0.1, 0.1],
  handDimensions: [0.1, 0.1, 0.1]
}

// Static body positions
const bodyPositions = {
  rootPosition: [0, 1, 0],
  headPosition: [0, 0.859261, 0],
  armlPosition: [0.4, 1.13, 0],
  armrPosition: [-0.4, 1.13, 0],
  leglPosition: [0.25, 0.5, 0],
  legrPosition: [-0.25, 0.5, 0],
  forearmlPosition: [0.65, 1.123411, -0.16],
  forearmrPosition: [-0.65, 1.123411, -0.16],
  handlPosition: [1.0, 1.123411, -0.2],
  handrPosition: [-1.0, 1.123411, -0.2]
}

// Static offsets
const offsets = {
  boneOffset: [0, -1, 0],
  armlOffset: [-0.3, -0.75, 0],
  armrOffset: [0.3, -0.75, 0],
  leglOffset: [-0.25, -0.5, 0],
  legrOffset: [0.25, -0.5, 0],
  forearmlOffset: [0.25, -0.27, 0],
  forearmrOffset: [-0.25, -0.27, 0],
  handlOffset: [0.25, -0.3, 0],
  handrOffset: [-0.25, -0.3, 0]
}

// Fixed rotations for limbs
const fixedRotations = {
  armlRotation: [0, 0, -90],
  armrRotation: [0, 0, 90],
  forearmlRotation: [0, 0, -90],
  forearmrRotation: [0, 0, 90],
  handlRotation: [0, 0, -90],
  handrRotation: [0, 0, 90]
}

function BoneLabel({ text, position }) {
  return (
    <Text position={[position[0], position[1] + 0.2, position[2]]} fontSize={0.1} color="white" anchorX="center" anchorY="bottom">
      {text}
    </Text>
  )
}

export function StickFigure({ position = [0, 0, 0], debug = true, axeVisible = false, forearmsEnabled = false }) {
  const { scene } = useGLTF('/pepe.glb')
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes } = useGraph(clone)

  // Disable frustum culling for all objects in the model and hide axe parts
  nodes.Scene.traverse((object) => {
    object.frustumCulled = false
    // Control Axe and AxeHead visibility
    if (object.name === 'Axe' || object.name === 'AxeHead') {
      object.visible = axeVisible
    }
  })

  // Refs for all major body parts
  const root = useRef(null)
  const armL = useRef(null)
  const armR = useRef(null)
  const legL = useRef(null)
  const legR = useRef(null)
  const forearmL = useRef(null)
  const forearmR = useRef(null)
  const handL = useRef(null)
  const handR = useRef(null)

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

  // Only create forearm and hand joints if enabled
  if (forearmsEnabled) {
    useFixedJoint(armL, forearmL, [
      getRelativePosition(bodyPositions.forearmlPosition, bodyPositions.armlPosition),
      [0, 0, 0, 1],
      getRelativePosition(bodyPositions.armlPosition, bodyPositions.forearmlPosition),
      [0, 0, 0, 1]
    ])
    useFixedJoint(armR, forearmR, [
      getRelativePosition(bodyPositions.forearmrPosition, bodyPositions.armrPosition),
      [0, 0, 0, 1],
      getRelativePosition(bodyPositions.armrPosition, bodyPositions.forearmrPosition),
      [0, 0, 0, 1]
    ])
    useFixedJoint(forearmL, handL, [
      getRelativePosition(bodyPositions.handlPosition, bodyPositions.forearmlPosition),
      [0, 0, 0, 1],
      getRelativePosition(bodyPositions.forearmlPosition, bodyPositions.handlPosition),
      [0, 0, 0, 1]
    ])
    useFixedJoint(forearmR, handR, [
      getRelativePosition(bodyPositions.handrPosition, bodyPositions.forearmrPosition),
      [0, 0, 0, 1],
      getRelativePosition(bodyPositions.forearmrPosition, bodyPositions.handrPosition),
      [0, 0, 0, 1]
    ])
  }

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

      {/* Forearms and Hands only render if are enabled */}
      {forearmsEnabled && (
        <>
          {/* Left Forearm */}
          <RigidBody ref={forearmL} position={bodyPositions.forearmlPosition} type={typeRigidBody} linearDamping={2} angularDamping={3} friction={1}>
            <CuboidCollider args={dimensions.forearmDimensions} />
            <group position={offsets.forearmlOffset}>
              <primitive object={nodes.forearml} rotation={fixedRotations.forearmlRotation.map((r) => (r * Math.PI) / 180)} />
            </group>
          </RigidBody>

          {/* Right Forearm */}
          <RigidBody ref={forearmR} position={bodyPositions.forearmrPosition} type={typeRigidBody} linearDamping={2} angularDamping={3} friction={1}>
            <CuboidCollider args={dimensions.forearmDimensions} />
            <group position={offsets.forearmrOffset}>
              <primitive object={nodes.forearmr} rotation={fixedRotations.forearmrRotation.map((r) => (r * Math.PI) / 180)} />
            </group>
          </RigidBody>

          {/* Left Hand */}
          <RigidBody ref={handL} position={bodyPositions.handlPosition} type={typeRigidBody} linearDamping={2} angularDamping={3} friction={1}>
            <CuboidCollider args={dimensions.handDimensions} />
            <group position={offsets.handlOffset}>
              <primitive object={nodes.handl} rotation={fixedRotations.handlRotation.map((r) => (r * Math.PI) / 180)} />
            </group>
          </RigidBody>

          {/* Right Hand */}
          <RigidBody ref={handR} position={bodyPositions.handrPosition} type={typeRigidBody} linearDamping={2} angularDamping={3} friction={1}>
            <CuboidCollider args={dimensions.handDimensions} />
            <group position={offsets.handrOffset}>
              <primitive object={nodes.handr} rotation={fixedRotations.handrRotation.map((r) => (r * Math.PI) / 180)} />
            </group>
          </RigidBody>
        </>
      )}

      {/* Main mesh */}
      {isMeshVisible && <primitive object={nodes.Scene} scale={[2, 2, 2]} />}
    </group>
  )
}

useGLTF.preload('/pepe.glb')
