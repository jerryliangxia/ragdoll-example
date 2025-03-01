import { useRef } from 'react'
import { RigidBody, useSphericalJoint, CuboidCollider } from '@react-three/rapier'
import { Box, useGLTF, Text } from '@react-three/drei'
import { Vector3 } from 'three'

const typeRigidBody = 'dynamic'

function BoneLabel({ text, position }) {
  return (
    <Text position={[position[0], position[1] + 0.2, position[2]]} fontSize={0.1} color="white" anchorX="center" anchorY="bottom">
      {text}
    </Text>
  )
}

function Bone({ position, parentRef, length = 2, width = 0.2, debug = true, children, name, parentAnchor = [0, 0, 0], childAnchor = [0, 1, 0] }) {
  const bone = useRef(null)

  if (parentRef) {
    useSphericalJoint(
      parentRef,
      bone,
      [
        parentAnchor, // Custom parent anchor point
        childAnchor // Custom child anchor point
      ],
      {
        stiffness: 100,
        damping: 10
      }
    )
  }

  return (
    <RigidBody ref={bone} position={position} type={typeRigidBody} linearDamping={2} angularDamping={3} friction={1}>
      <CuboidCollider args={[width, length, width]} />
      {debug && (
        <>
          <BoneLabel text={name} position={[0, length / 2, 0]} />
        </>
      )}
      {children}
    </RigidBody>
  )
}

export function StickFigure({ position = [0, 0, 0], debug = true }) {
  const { nodes, materials } = useGLTF('/pepe.glb')

  // More detailed position logging
  console.log(
    'Detailed Bone Positions:',
    Object.entries(nodes)
      .filter(([key, value]) => value.isBone || key === 'Bone' || key === 'Head')
      .reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key]: {
            position: value.position.toArray(),
            parent: value.parent?.name || 'none',
            matrix: value.matrix.elements
          }
        }),
        {}
      )
  )

  // Refs for all major body parts
  const root = useRef(null)
  const armL = useRef(null)
  const armR = useRef(null)
  const legL = useRef(null)
  const legR = useRef(null)

  // radius, length
  const rootDimensions = [0.049009, 0.980182, 0.049009]
  const headDimensions = [0.073831, 0.73831]
  const armDimensions = [0.020324, 0.306184]
  const legDimensions = [0.033359, 0.310378]

  const rootHeadPosition = [0, 0.386498, 0]
  const rootTailPosition = [0, 1.36668, 0]
  const leglHeadPosition = [0.359812, 0.571024, -0.013526]
  const legrHeadPosition = [-0.359812, 0.571024, -0.013526]
  const armlHeadPosition = [0.633096, 1.17059, 0.137221]
  const armrHeadPosition = [-0.633096, 1.17059, 0.137221]

  const rootPosition = [0, 0.876589, 0]
  const headPosition = [0, 1.73585, 0]
  const armlPosition = [0.785971, 1.16282, 0.139699]
  const armrPosition = [-0.785971, 1.16282, 0.139699]
  const leglPosition = [0.387086, 0.419553, 0.006382]
  const legrPosition = [-0.387086, 0.419553, 0.006382]

  return (
    <group position={position}>
      {/* Root/Bone (main body) */}
      <RigidBody ref={root} position={rootPosition} type={typeRigidBody} linearDamping={2} angularDamping={3} friction={1}>
        <CuboidCollider args={rootDimensions} />
        {debug && (
          <>
            <BoneLabel text="Bone" position={[0, 0.2, 0]} />
          </>
        )}
        <primitive object={nodes.Bone} />
      </RigidBody>

      {/* Head */}
      <Bone
        parentRef={root}
        position={headPosition}
        length={headDimensions[1]}
        width={headDimensions[0]}
        debug={debug}
        name="Head"
        parentAnchor={rootTailPosition}
        childAnchor={rootTailPosition}>
        <primitive object={nodes.Head} />
      </Bone>

      {/* Left Arm */}
      <Bone
        parentRef={root}
        position={armlPosition}
        length={armDimensions[1]}
        width={armDimensions[0]}
        debug={debug}
        ref={armL}
        name="L.Arm"
        parentAnchor={rootTailPosition}
        childAnchor={armlHeadPosition}>
        <primitive object={nodes.arml} />
      </Bone>

      {/* Right Arm */}
      <Bone
        parentRef={root}
        position={armrPosition}
        length={armDimensions[1]}
        width={armDimensions[0]}
        debug={debug}
        ref={armR}
        name="R.Arm"
        parentAnchor={rootTailPosition}
        childAnchor={armrHeadPosition}>
        <primitive object={nodes.armr} />
      </Bone>

      {/* Left Leg */}
      <Bone
        parentRef={root}
        position={leglPosition}
        length={legDimensions[1]}
        width={legDimensions[0]}
        debug={debug}
        ref={legL}
        name="L.Leg"
        parentAnchor={rootHeadPosition} // Connect at head of Bone
        childAnchor={leglHeadPosition} // Connect at top of leg
      >
        <primitive object={nodes.legl} />
      </Bone>

      {/* Right Leg */}
      <Bone
        parentRef={root}
        position={legrPosition}
        length={legDimensions[1]}
        width={legDimensions[0]}
        debug={debug}
        ref={legR}
        name="R.Leg"
        parentAnchor={rootHeadPosition} // Connect at head of Bone
        childAnchor={legrHeadPosition} // Connect at top of leg
      >
        <primitive object={nodes.legr} />
      </Bone>

      {/* Main mesh */}
      <primitive object={nodes.Scene} />
    </group>
  )
}

useGLTF.preload('/pepe.glb')
