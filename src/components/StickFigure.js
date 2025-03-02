import { useRef } from 'react'
import { RigidBody, useSphericalJoint, usePrismaticJoint, useFixedJoint, CuboidCollider } from '@react-three/rapier'
import { Box, useGLTF, Text } from '@react-three/drei'
import { Vector3 } from 'three'
import { useControls } from 'leva'

const typeRigidBody = 'fixed'
const gravityScale = 0.1

function BoneLabel({ text, position }) {
  return (
    <Text position={[position[0], position[1] + 0.2, position[2]]} fontSize={0.1} color="white" anchorX="center" anchorY="bottom">
      {text}
    </Text>
  )
}

export function StickFigure({ position = [0, 0, 0], debug = true }) {
  const { nodes, materials } = useGLTF('/pepe.glb')

  // Dimensions controls
  const dimensions = useControls('Dimensions', {
    rootDimensions: { value: [0.15, 0.4, 0.15], step: 0.01 },
    headDimensions: { value: [0.073831, 0.73831, 0.073831], step: 0.01 },
    armDimensions: { value: [0.2, 0.2, 0.2], step: 0.01 },
    legDimensions: { value: [0.2, 0.2, 0.2], step: 0.01 },
    forearmDimensions: { value: [0.1, 0.2, 0.2], step: 0.01 },
    handDimensions: { value: [0.1, 0.1, 0.1], step: 0.01 }
  })

  // Body Position controls
  const bodyPositions = useControls('Body Positions', {
    rootPosition: { value: [0, 0, 0], step: 0.01 },
    headPosition: { value: [0, 0.859261, 0], step: 0.01 },
    armlPosition: { value: [0, 0.373411, 0], step: 0.01 },
    armrPosition: { value: [0, 0.373411, 0], step: 0.01 },
    leglPosition: { value: [0, 0.373411, 0], step: 0.01 },
    legrPosition: { value: [0, 0.373411, 0], step: 0.01 },
    // others
    forearmlPosition: { value: [0.65, 1.123411, -0.16], step: 0.01 },
    forearmrPosition: { value: [-0.65, 1.123411, -0.16], step: 0.01 },
    handlPosition: { value: [1.0, 1.123411, -0.2], step: 0.01 },
    handrPosition: { value: [-1.0, 1.123411, -0.2], step: 0.01 }
  })

  // Rotation controls for limbs
  const rotations = useControls('Limb Rotations', {
    forearmlRotation: { value: [0, 0, -90], step: 0.1 },
    handlRotation: { value: [0, 0, -90], step: 0.1 },
    forearmrRotation: { value: [0, 0, 90], step: 0.1 },
    handrRotation: { value: [0, 0, 90], step: 0.1 }
  })

  // Offset controls for visual adjustments
  const offsets = useControls('Visual Offsets', {
    boneOffset: { value: [0, 0, 0], step: 0.01 },
    armlOffset: { value: [0, 0, 0], step: 0.01 },
    armrOffset: { value: [0, 0, 0], step: 0.01 },
    leglOffset: { value: [0, 0, 0], step: 0.01 },
    legrOffset: { value: [0, 0, 0], step: 0.01 },
    forearmlOffset: { value: [0, 0, 0], step: 0.01 },
    forearmrOffset: { value: [0, 0, 0], step: 0.01 },
    handlOffset: { value: [0, 0, 0], step: 0.01 },
    handrOffset: { value: [0, 0, 0], step: 0.01 }
  })

  // Refs for all major body parts
  const root = useRef(null)
  const head = useRef(null)
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
  // useSphericalJoint(root, head, [
  //   getRelativePosition(anchorPositions.rootTailPosition, anchorPositions.rootTailPosition),
  //   getRelativePosition(anchorPositions.rootTailPosition, anchorPositions.rootTailPosition)
  // ])

  return (
    <group position={position}>
      {/* Root/Bone (main body) */}
      <RigidBody
        ref={root}
        gravityScale={gravityScale}
        position={bodyPositions.rootPosition}
        type={typeRigidBody}
        linearDamping={2}
        angularDamping={3}
        friction={1}>
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

      {/* Head */}
      {/* <RigidBody
        ref={head}
        gravityScale={gravityScale}
        position={bodyPositions.headPosition}
        type={typeRigidBody}
        linearDamping={2}
        angularDamping={3}
        friction={1}>
        <CuboidCollider args={dimensions.headDimensions} />
        <primitive object={nodes.Head} />
      </RigidBody> */}

      {/* Left Arm */}
      <RigidBody
        ref={armL}
        gravityScale={gravityScale}
        position={bodyPositions.armlPosition}
        type={typeRigidBody}
        linearDamping={2}
        angularDamping={3}
        friction={1}>
        <CuboidCollider args={dimensions.armDimensions} />
        <group position={offsets.armlOffset}>
          <primitive object={nodes.arml} />
        </group>
      </RigidBody>

      {/* Right Arm */}
      <RigidBody
        ref={armR}
        gravityScale={gravityScale}
        position={bodyPositions.armrPosition}
        type={typeRigidBody}
        linearDamping={2}
        angularDamping={3}
        friction={1}>
        <CuboidCollider args={dimensions.armDimensions} />
        <group position={offsets.armrOffset}>
          <primitive object={nodes.armr} />
        </group>
      </RigidBody>

      {/* Left Leg */}
      <RigidBody
        ref={legL}
        gravityScale={gravityScale}
        position={bodyPositions.leglPosition}
        type={typeRigidBody}
        linearDamping={2}
        angularDamping={3}
        friction={1}>
        <CuboidCollider args={dimensions.legDimensions} />
        <group position={offsets.leglOffset}>
          <primitive object={nodes.legl} />
        </group>
      </RigidBody>

      {/* Right Leg */}
      <RigidBody
        ref={legR}
        gravityScale={gravityScale}
        position={bodyPositions.legrPosition}
        type={typeRigidBody}
        linearDamping={2}
        angularDamping={3}
        friction={1}>
        <CuboidCollider args={dimensions.legDimensions} />
        <group position={offsets.legrOffset}>
          <primitive object={nodes.legr} />
        </group>
      </RigidBody>

      {/* Left Forearm */}
      <RigidBody
        ref={forearmL}
        gravityScale={gravityScale}
        position={bodyPositions.forearmlPosition}
        rotation={rotations.forearmlRotation.map((r) => (r * Math.PI) / 180)}
        type={typeRigidBody}
        linearDamping={2}
        angularDamping={3}
        friction={1}>
        <CuboidCollider args={dimensions.forearmDimensions} />
        <group position={offsets.forearmlOffset}>
          <primitive object={nodes.forearml} />
        </group>
      </RigidBody>

      {/* Right Forearm */}
      <RigidBody
        ref={forearmR}
        gravityScale={gravityScale}
        position={bodyPositions.forearmrPosition}
        rotation={rotations.forearmrRotation.map((r) => (r * Math.PI) / 180)}
        type={typeRigidBody}
        linearDamping={2}
        angularDamping={3}
        friction={1}>
        <CuboidCollider args={dimensions.forearmDimensions} />
        <group position={offsets.forearmrOffset}>
          <primitive object={nodes.forearmr} />
        </group>
      </RigidBody>

      {/* Left Hand */}
      <RigidBody
        ref={handL}
        gravityScale={gravityScale}
        position={bodyPositions.handlPosition}
        rotation={rotations.handlRotation.map((r) => (r * Math.PI) / 180)}
        type={typeRigidBody}
        linearDamping={2}
        angularDamping={3}
        friction={1}>
        <CuboidCollider args={dimensions.handDimensions} />
        <group position={offsets.handlOffset}>
          <primitive object={nodes.handl} />
        </group>
      </RigidBody>

      {/* Right Hand */}
      <RigidBody
        ref={handR}
        gravityScale={gravityScale}
        position={bodyPositions.handrPosition}
        rotation={rotations.handrRotation.map((r) => (r * Math.PI) / 180)}
        type={typeRigidBody}
        linearDamping={2}
        angularDamping={3}
        friction={1}>
        <CuboidCollider args={dimensions.handDimensions} />
        <group position={offsets.handrOffset}>
          <primitive object={nodes.handr} />
        </group>
      </RigidBody>

      {/* Main mesh */}
      {/* <primitive object={nodes.Scene} scale={[2, 2, 2]} /> */}
    </group>
  )
}

useGLTF.preload('/pepe.glb')
