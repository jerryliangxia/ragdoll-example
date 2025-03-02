import { useRef } from 'react'
import { RigidBody, useSphericalJoint, CuboidCollider } from '@react-three/rapier'
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
    rootDimensions: { value: [0.049009, 0.980182, 0.049009], step: 0.01 },
    headDimensions: { value: [0.073831, 0.73831, 0.073831], step: 0.01 },
    armDimensions: { value: [0.020324, 0.306184, 0.020324], step: 0.01 },
    legDimensions: { value: [0.033359, 0.310378, 0.033359], step: 0.01 }
  })

  // Head/Tail Position controls
  const anchorPositions = useControls('Anchor Points', {
    rootHeadPosition: { value: [0, 0.386498, 0], step: 0.01 },
    rootTailPosition: { value: [0, 1.36668, 0], step: 0.01 },
    leglHeadPosition: { value: [0.359812, 0.571024, -0.013526], step: 0.01 },
    legrHeadPosition: { value: [-0.359812, 0.571024, -0.013526], step: 0.01 },
    armlHeadPosition: { value: [0.633096, 1.17059, 0.137221], step: 0.01 },
    armrHeadPosition: { value: [-0.633096, 1.17059, 0.137221], step: 0.01 }
  })

  // Body Position controls
  const bodyPositions = useControls('Body Positions', {
    rootPosition: { value: [0, 0.876589, 0], step: 0.01 },
    headPosition: { value: [0, 1.73585, 0], step: 0.01 },
    armlPosition: { value: [0.785971, 1.16282, 0.139699], step: 0.01 },
    armrPosition: { value: [-0.785971, 1.16282, 0.139699], step: 0.01 },
    leglPosition: { value: [0.387086, 0.419553, 0.006382], step: 0.01 },
    legrPosition: { value: [-0.387086, 0.419553, 0.006382], step: 0.01 }
  })

  // Refs for all major body parts
  const root = useRef(null)
  const head = useRef(null)
  const armL = useRef(null)
  const armR = useRef(null)
  const legL = useRef(null)
  const legR = useRef(null)

  // Calculate relative positions
  const getRelativePosition = (pos1, pos2) => [(pos1[0] - pos2[0]) / 2, (pos1[1] - pos2[1]) / 2, (pos1[2] - pos2[2]) / 2]

  // useSphericalJoint(A,B,(B,A),(A,B))
  useSphericalJoint(root, legL, [
    getRelativePosition(anchorPositions.leglHeadPosition, anchorPositions.rootTailPosition),
    getRelativePosition(anchorPositions.rootTailPosition, anchorPositions.leglHeadPosition)
  ])
  useSphericalJoint(root, legR, [
    getRelativePosition(anchorPositions.legrHeadPosition, anchorPositions.rootTailPosition),
    getRelativePosition(anchorPositions.rootTailPosition, anchorPositions.legrHeadPosition)
  ])
  useSphericalJoint(root, armL, [
    getRelativePosition(anchorPositions.armlHeadPosition, anchorPositions.rootTailPosition),
    getRelativePosition(anchorPositions.rootTailPosition, anchorPositions.armlHeadPosition)
  ])
  useSphericalJoint(root, armR, [
    getRelativePosition(anchorPositions.armrHeadPosition, anchorPositions.rootTailPosition),
    getRelativePosition(anchorPositions.rootTailPosition, anchorPositions.armrHeadPosition)
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
        <primitive object={nodes.Bone} />
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
        <primitive object={nodes.arml} />
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
        <primitive object={nodes.armr} />
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
        <primitive object={nodes.legl} />
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
        <primitive object={nodes.legr} />
      </RigidBody>

      {/* Main mesh */}
      <primitive object={nodes.Scene} scale={[2, 2, 2]} />
    </group>
  )
}

useGLTF.preload('/pepe.glb')
