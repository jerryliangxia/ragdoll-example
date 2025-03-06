import { useRef, useMemo, useCallback, useState, useEffect } from 'react'
import { RigidBody, useSphericalJoint, CuboidCollider, useFixedJoint, vec3 } from '@react-three/rapier'
import { useGLTF, Text } from '@react-three/drei'
import { useGraph, useFrame, useThree } from '@react-three/fiber'
import { SkeletonUtils } from 'three-stdlib'
import { Vector3, BoxGeometry, MeshStandardMaterial, Raycaster, Plane } from 'three'

// for debug
const typeRigidBody = 'dynamic'
const isMeshVisible = false

// Physics constants
const MAX_VELOCITY = 10 // Maximum velocity magnitude
const VELOCITY_AMPLIFIER = 2 // Amplify the throw velocity
const VELOCITY_SMOOTHING = 0.3 // Velocity smoothing factor (0-1)

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
  const { camera, mouse, viewport } = useThree()
  const [isDragging, setIsDragging] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [currentVelocity, setCurrentVelocity] = useState(0)
  const [maxVelocityReached, setMaxVelocityReached] = useState(false)
  const raycaster = useMemo(() => new Raycaster(), [])
  const dragPlane = useMemo(() => new Plane(new Vector3(0, 0, 1)), [])
  const dragOffset = useMemo(() => new Vector3(), [])
  const lastVelocity = useMemo(() => new Vector3(), [])
  const lastMousePosition = useRef({ x: 0, y: 0 })
  const dragStartTime = useRef(0)
  const lastPosition = useRef(new Vector3())

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

  // Handle pointer over for cursor style
  const handlePointerOver = useCallback(() => {
    setHovered(true)
    document.body.style.cursor = 'grab'
  }, [])

  // Handle pointer out for cursor style
  const handlePointerOut = useCallback(() => {
    setHovered(false)
    document.body.style.cursor = 'auto'
  }, [])

  // Get 3D point from mouse position
  const getMousePoint = useCallback(
    (mousePosition, targetZ) => {
      // Update the raycaster with the mouse position
      raycaster.setFromCamera(mousePosition, camera)

      // Update the drag plane to be at the target Z position
      dragPlane.constant = -targetZ

      // Get intersection point
      const intersectionPoint = new Vector3()
      raycaster.ray.intersectPlane(dragPlane, intersectionPoint)

      return intersectionPoint
    },
    [raycaster, camera, dragPlane]
  )

  // Handle drag start
  const handleDragStart = useCallback(
    (event) => {
      event.stopPropagation()
      setIsDragging(true)
      setCurrentVelocity(0)
      setMaxVelocityReached(false)
      document.body.style.cursor = 'grabbing'
      dragStartTime.current = Date.now()
      lastMousePosition.current = { x: mouse.x, y: mouse.y }

      if (root.current) {
        // Get current bone position
        const bonePosition = vec3(root.current.translation())
        lastPosition.current.set(bonePosition.x, bonePosition.y, bonePosition.z)

        // Get the click point in 3D space
        const clickPoint = getMousePoint(mouse, bonePosition.z)

        // Calculate offset from click point to bone center
        dragOffset.set(bonePosition.x - clickPoint.x, bonePosition.y - clickPoint.y, 0)

        // Set the rigid body to kinematic during dragging
        root.current.setBodyType(1) // 1 = kinematic
      }
    },
    [mouse, getMousePoint, dragOffset]
  )

  // Handle drag end
  const handleDragEnd = useCallback(
    (event) => {
      if (isDragging) {
        setIsDragging(false)
        setMaxVelocityReached(false)
        document.body.style.cursor = hovered ? 'grab' : 'auto'

        if (root.current) {
          // If not already dynamic (from max velocity), set it now
          if (root.current.bodyType() !== 0) {
            // Calculate velocity based on recent movement
            const velocity = lastVelocity.clone()

            // Set the rigid body back to dynamic
            root.current.setBodyType(0) // 0 = dynamic

            // Apply the velocity from dragging
            if (velocity.length() > 0.1) {
              root.current.setLinvel(
                {
                  x: velocity.x * VELOCITY_AMPLIFIER,
                  y: velocity.y * VELOCITY_AMPLIFIER,
                  z: 0
                },
                true
              )
            }
          }
        }
      }
    },
    [isDragging, hovered, lastVelocity]
  )

  // Add global event listeners to ensure drag continues even if pointer leaves the object
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleDragEnd()
      }
    }

    const handleGlobalMouseMove = (e) => {
      if (isDragging) {
        // Update last mouse position for velocity calculation
        lastMousePosition.current = {
          x: (e.clientX / window.innerWidth) * 2 - 1,
          y: -(e.clientY / window.innerHeight) * 2 + 1
        }
      }
    }

    window.addEventListener('mouseup', handleGlobalMouseUp)
    window.addEventListener('mousemove', handleGlobalMouseMove)

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp)
      window.removeEventListener('mousemove', handleGlobalMouseMove)
    }
  }, [isDragging, handleDragEnd])

  // Update position during dragging
  useFrame((state, delta) => {
    if (!root.current) return

    if (isDragging && !maxVelocityReached) {
      // Store the current position before updating
      const currentPosition = vec3(root.current.translation())
      const currentPos = new Vector3(currentPosition.x, currentPosition.y, currentPosition.z)

      // Use the mouse from state which is continuously updated
      const currentMouse = { x: state.mouse.x, y: state.mouse.y }

      // Direct dragging - update position immediately based on mouse
      const mousePoint = getMousePoint(currentMouse, currentPosition.z)

      // Apply the offset to get the new position
      const newPosition = {
        x: mousePoint.x + dragOffset.x,
        y: mousePoint.y + dragOffset.y,
        z: currentPosition.z
      }

      // Calculate velocity for when we release
      const newPos = new Vector3(newPosition.x, newPosition.y, newPosition.z)
      const frameVelocity = newPos.clone().sub(currentPos).divideScalar(delta)

      // Smooth the velocity using exponential moving average
      lastVelocity.lerp(frameVelocity, VELOCITY_SMOOTHING)

      // Calculate current velocity magnitude
      const velocityMagnitude = lastVelocity.length()
      setCurrentVelocity(velocityMagnitude)

      // Check if we've reached max velocity
      if (velocityMagnitude >= MAX_VELOCITY) {
        // We've reached max velocity - switch to dynamic mode
        setMaxVelocityReached(true)

        // Set the rigid body to dynamic
        root.current.setBodyType(0) // 0 = dynamic

        // Apply the capped velocity
        const cappedVelocity = lastVelocity.clone().normalize().multiplyScalar(MAX_VELOCITY)
        root.current.setLinvel(
          {
            x: cappedVelocity.x,
            y: cappedVelocity.y,
            z: 0
          },
          true
        )

        // We'll continue dragging visually, but the physics will take over
      } else {
        // Update position directly
        root.current.setTranslation(newPosition, true)
      }

      // Update last mouse position
      lastMousePosition.current = currentMouse
      lastPosition.current.copy(currentPos)
    }
  })

  return (
    <group position={position}>
      {/* Root/Bone (main body) */}
      <RigidBody ref={root} position={bodyPositions.rootPosition} type={typeRigidBody} linearDamping={2} angularDamping={3} friction={1}>
        <CuboidCollider args={dimensions.rootDimensions} />
        {debug && (
          <>
            <BoneLabel
              text={
                isDragging
                  ? maxVelocityReached
                    ? 'Max Velocity!'
                    : `Dragging: ${Math.min(100, Math.round((currentVelocity / MAX_VELOCITY) * 100))}%`
                  : 'Dynamic'
              }
              position={[0, 0.2, 0]}
            />
          </>
        )}
        <group position={offsets.boneOffset}>
          <primitive
            object={nodes.Bone}
            onPointerDown={handleDragStart}
            onPointerUp={handleDragEnd}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          />
        </group>
        {/* Add an invisible mesh that will handle the events */}
        <mesh onPointerDown={handleDragStart} onPointerUp={handleDragEnd} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut} visible={false}>
          <boxGeometry args={[dimensions.rootDimensions[0], dimensions.rootDimensions[1], dimensions.rootDimensions[2]]} />
          <meshStandardMaterial transparent opacity={0} />
        </mesh>
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

      {/* Forearms and Hands only render if enabled */}
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
