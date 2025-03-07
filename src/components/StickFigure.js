import { useRef, useMemo, useCallback, useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { RigidBody, useSphericalJoint, CuboidCollider, useFixedJoint, vec3 } from '@react-three/rapier'
import { useGLTF, Text } from '@react-three/drei'
import { useGraph, useFrame, useThree } from '@react-three/fiber'
import { SkeletonUtils } from 'three-stdlib'
import { Vector3, BoxGeometry, MeshStandardMaterial, Raycaster, Plane } from 'three'

// for debug
const typeRigidBody = 'dynamic'
const isMeshVisible = true

// Physics constants
const MAX_VELOCITY = 50 // Increased maximum velocity for faster movements
const VELOCITY_AMPLIFIER = 1 // Reduced amplifier since we're using raw velocities
const VELOCITY_SMOOTHING = 0.5 // Increased smoothing factor for more responsive movement
const MIN_DELTA = 1 / 60 // Minimum delta time to prevent huge velocity spikes
const POSITION_SMOOTHING = 0.8 // Smoothing factor for position updates

function BoneLabel({ text, position }) {
  return (
    <Text position={[position[0], position[1] + 0.2, position[2]]} fontSize={0.1} color="white" anchorX="center" anchorY="bottom">
      {text}
    </Text>
  )
}

export const StickFigure = forwardRef(({ position = [0, 0, 0], debug = true, axeVisible = false, forearmsEnabled = false, isShiftPressed = false }, ref) => {
  const { scene } = useGLTF('/pepe.glb')
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes } = useGraph(clone)
  const { camera, mouse, viewport } = useThree()
  const [isDragging, setIsDragging] = useState(false)
  const [draggedPart, setDraggedPart] = useState(null)
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

  // Static dimensions
  const dimensions = {
    rootDimensions: [0.25, 0.25, 0.25],
    headDimensions: [0.073831, 0.73831, 0.073831],
    armDimensions: forearmsEnabled ? [0.13, 0.1, 0.13] : [0.4, 0.2, 0.2],
    legDimensions: [0.2, 0.2, 0.2],
    forearmDimensions: [0.1, 0.1, 0.1],
    handDimensions: [0.1, 0.1, 0.1]
  }

  // Static body positions
  const bodyPositions = {
    rootPosition: [0, 1, 0],
    headPosition: [0, 0.859261, 0],
    armlPosition: [0.8, 1.13, 0],
    armrPosition: [-0.8, 1.13, 0],
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
    armlOffset: forearmsEnabled ? [-0.3, -0.75, 0] : [-0.7, -0.75, 0],
    armrOffset: forearmsEnabled ? [0.3, -0.75, 0] : [0.7, -0.75, 0],
    leglOffset: [-0.25, -0.3, 0],
    legrOffset: [0.25, -0.3, 0],
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

  // Handle pointer over for cursor style
  const handlePointerOver = useCallback(() => {
    if (!isShiftPressed) {
      setHovered(true)
      document.body.style.cursor = 'grab'
    }
  }, [isShiftPressed])

  // Handle pointer out for cursor style
  const handlePointerOut = useCallback(() => {
    if (!isShiftPressed) {
      setHovered(false)
      document.body.style.cursor = 'auto'
    }
  }, [isShiftPressed])

  // Handle drag start for any part
  const handleDragStart = useCallback(
    (event, part) => {
      // Don't start drag if shift is pressed
      if (isShiftPressed) return

      event.stopPropagation()
      setIsDragging(true)
      setDraggedPart(part)
      setCurrentVelocity(0)
      setMaxVelocityReached(false)
      document.body.style.cursor = 'grabbing'
      dragStartTime.current = Date.now()
      lastMousePosition.current = { x: mouse.x, y: mouse.y }

      const currentPart = {
        root: root.current,
        armL: armL.current,
        armR: armR.current,
        legL: legL.current,
        legR: legR.current
      }[part]

      if (currentPart) {
        // Get current part position
        const partPosition = vec3(currentPart.translation())
        lastPosition.current.set(partPosition.x, partPosition.y, partPosition.z)

        // Get the click point in 3D space
        const clickPoint = getMousePoint(mouse, partPosition.z)

        // Calculate offset from click point to part center
        dragOffset.set(partPosition.x - clickPoint.x, partPosition.y - clickPoint.y, 0)

        // Set the rigid body to kinematic during dragging
        currentPart.setBodyType(1) // 1 = kinematic
      }
    },
    [mouse, getMousePoint, dragOffset, isShiftPressed]
  )

  // Handle drag end for any part
  const handleDragEnd = useCallback(
    (event) => {
      if (isDragging) {
        setIsDragging(false)
        document.body.style.cursor = hovered ? 'grab' : 'auto'

        const currentPart = {
          root: root.current,
          armL: armL.current,
          armR: armR.current,
          legL: legL.current,
          legR: legR.current
        }[draggedPart]

        if (currentPart) {
          // If not already dynamic (from max velocity), set it now
          if (currentPart.bodyType() !== 0) {
            // Calculate velocity based on recent movement
            const velocity = lastVelocity.clone()

            // Set the rigid body back to dynamic
            currentPart.setBodyType(0) // 0 = dynamic

            // Apply the velocity from dragging
            if (velocity.length() > 0.1) {
              currentPart.setLinvel(
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
        setDraggedPart(null)
        setMaxVelocityReached(false)
      }
    },
    [isDragging, hovered, draggedPart, lastVelocity]
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

  // Update useFrame to handle any dragged part
  useFrame((state, delta) => {
    if (!isDragging || !draggedPart) return

    const currentPart = {
      root: root.current,
      armL: armL.current,
      armR: armR.current,
      legL: legL.current,
      legR: legR.current
    }[draggedPart]

    if (!currentPart) return

    if (!maxVelocityReached) {
      // Get the current mouse position in 3D space
      const currentMouse = { x: state.mouse.x, y: state.mouse.y }
      const mousePoint = getMousePoint(currentMouse, currentPart.translation().z)

      // Apply the offset to get the target position
      const targetPosition = {
        x: mousePoint.x + dragOffset.x,
        y: mousePoint.y + dragOffset.y,
        z: currentPart.translation().z
      }

      // Store current position for velocity calculation
      const currentPosition = vec3(currentPart.translation())
      const currentPos = new Vector3(currentPosition.x, currentPosition.y, currentPosition.z)

      // Calculate instantaneous velocity with delta time clamping
      const clampedDelta = Math.max(delta, MIN_DELTA)
      const frameVelocity = new Vector3((targetPosition.x - currentPosition.x) / clampedDelta, (targetPosition.y - currentPosition.y) / clampedDelta, 0)

      // Smooth the velocity for throwing
      lastVelocity.lerp(frameVelocity, VELOCITY_SMOOTHING)

      // Calculate current velocity magnitude
      const velocityMagnitude = lastVelocity.length()
      setCurrentVelocity(velocityMagnitude)

      // Check if we've reached max velocity
      if (velocityMagnitude >= MAX_VELOCITY) {
        // We've reached max velocity - switch to dynamic mode
        setMaxVelocityReached(true)
        currentPart.setBodyType(0) // 0 = dynamic

        // Apply the capped velocity
        const cappedVelocity = lastVelocity.clone().normalize().multiplyScalar(MAX_VELOCITY)
        currentPart.setLinvel(
          {
            x: cappedVelocity.x,
            y: cappedVelocity.y,
            z: 0
          },
          true
        )
      } else {
        // Create a smoothed position by lerping between current and target
        const smoothedPosition = new Vector3(currentPosition.x, currentPosition.y, currentPosition.z).lerp(
          new Vector3(targetPosition.x, targetPosition.y, targetPosition.z),
          POSITION_SMOOTHING
        )

        // Update position with smoothing
        currentPart.setTranslation(
          {
            x: smoothedPosition.x,
            y: smoothedPosition.y,
            z: targetPosition.z
          },
          true
        )
      }

      // Update last position for next frame
      lastPosition.current.copy(currentPos)
      lastMousePosition.current = currentMouse
    }
  })

  // Add reset function
  useImperativeHandle(ref, () => ({
    reset: () => {
      // Reset all body positions and velocities
      const bodyMap = {
        root: { ref: root.current, posKey: 'rootPosition' },
        armL: { ref: armL.current, posKey: 'armlPosition' },
        armR: { ref: armR.current, posKey: 'armrPosition' },
        legL: { ref: legL.current, posKey: 'leglPosition' },
        legR: { ref: legR.current, posKey: 'legrPosition' }
      }

      Object.values(bodyMap).forEach(({ ref, posKey }) => {
        if (ref) {
          // Reset to original position
          const pos = bodyPositions[posKey]
          ref.setTranslation({ x: pos[0], y: pos[1], z: pos[2] }, true)
          // Reset velocity
          ref.setLinvel({ x: 0, y: 0, z: 0 }, true)
          // Reset angular velocity
          ref.setAngvel({ x: 0, y: 0, z: 0 }, true)
          // Reset rotation
          ref.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
          // Ensure body is dynamic
          ref.setBodyType(0)
        }
      })

      // Reset state
      setIsDragging(false)
      setDraggedPart(null)
      setMaxVelocityReached(false)
      setCurrentVelocity(0)
    }
  }))

  return (
    <group position={position}>
      {/* Root/Bone (main body) */}
      <RigidBody ref={root} position={bodyPositions.rootPosition} type={typeRigidBody} linearDamping={2} angularDamping={3} friction={1}>
        <CuboidCollider args={dimensions.rootDimensions} />
        {debug && (
          <>
            <BoneLabel
              text={
                isDragging && draggedPart === 'root'
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
            onPointerDown={(e) => handleDragStart(e, 'root')}
            onPointerUp={handleDragEnd}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          />
        </group>
        <mesh
          onPointerDown={(e) => handleDragStart(e, 'root')}
          onPointerUp={handleDragEnd}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          visible={false}>
          <boxGeometry args={dimensions.rootDimensions} />
          <meshStandardMaterial transparent opacity={0} />
        </mesh>
      </RigidBody>

      {/* Left Arm */}
      <RigidBody ref={armL} position={bodyPositions.armlPosition} type={typeRigidBody} linearDamping={2} angularDamping={3} friction={1}>
        <CuboidCollider args={dimensions.armDimensions} />
        {debug && draggedPart === 'armL' && (
          <BoneLabel
            text={maxVelocityReached ? 'Max Velocity!' : `Dragging: ${Math.min(100, Math.round((currentVelocity / MAX_VELOCITY) * 100))}%`}
            position={[0, 0.2, 0]}
          />
        )}
        <group position={offsets.armlOffset}>
          <primitive
            object={nodes.arml}
            rotation={fixedRotations.armlRotation.map((r) => (r * Math.PI) / 180)}
            onPointerDown={(e) => handleDragStart(e, 'armL')}
            onPointerUp={handleDragEnd}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          />
        </group>
        <mesh
          onPointerDown={(e) => handleDragStart(e, 'armL')}
          onPointerUp={handleDragEnd}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          visible={false}>
          <boxGeometry args={dimensions.armDimensions} />
          <meshStandardMaterial transparent opacity={0} />
        </mesh>
      </RigidBody>

      {/* Right Arm */}
      <RigidBody ref={armR} position={bodyPositions.armrPosition} type={typeRigidBody} linearDamping={2} angularDamping={3} friction={1}>
        <CuboidCollider args={dimensions.armDimensions} />
        {debug && draggedPart === 'armR' && (
          <BoneLabel
            text={maxVelocityReached ? 'Max Velocity!' : `Dragging: ${Math.min(100, Math.round((currentVelocity / MAX_VELOCITY) * 100))}%`}
            position={[0, 0.2, 0]}
          />
        )}
        <group position={offsets.armrOffset}>
          <primitive
            object={nodes.armr}
            rotation={fixedRotations.armrRotation.map((r) => (r * Math.PI) / 180)}
            onPointerDown={(e) => handleDragStart(e, 'armR')}
            onPointerUp={handleDragEnd}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          />
        </group>
        <mesh
          onPointerDown={(e) => handleDragStart(e, 'armR')}
          onPointerUp={handleDragEnd}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          visible={false}>
          <boxGeometry args={dimensions.armDimensions} />
          <meshStandardMaterial transparent opacity={0} />
        </mesh>
      </RigidBody>

      {/* Left Leg */}
      <RigidBody ref={legL} position={bodyPositions.leglPosition} type={typeRigidBody} linearDamping={2} angularDamping={3} friction={1}>
        <CuboidCollider args={dimensions.legDimensions} />
        {debug && draggedPart === 'legL' && (
          <BoneLabel
            text={maxVelocityReached ? 'Max Velocity!' : `Dragging: ${Math.min(100, Math.round((currentVelocity / MAX_VELOCITY) * 100))}%`}
            position={[0, 0.2, 0]}
          />
        )}
        <group position={offsets.leglOffset}>
          <primitive
            object={nodes.legl}
            onPointerDown={(e) => handleDragStart(e, 'legL')}
            onPointerUp={handleDragEnd}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          />
        </group>
        <mesh
          onPointerDown={(e) => handleDragStart(e, 'legL')}
          onPointerUp={handleDragEnd}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          visible={false}>
          <boxGeometry args={dimensions.legDimensions} />
          <meshStandardMaterial transparent opacity={0} />
        </mesh>
      </RigidBody>

      {/* Right Leg */}
      <RigidBody ref={legR} position={bodyPositions.legrPosition} type={typeRigidBody} linearDamping={2} angularDamping={3} friction={1}>
        <CuboidCollider args={dimensions.legDimensions} />
        {debug && draggedPart === 'legR' && (
          <BoneLabel
            text={maxVelocityReached ? 'Max Velocity!' : `Dragging: ${Math.min(100, Math.round((currentVelocity / MAX_VELOCITY) * 100))}%`}
            position={[0, 0.2, 0]}
          />
        )}
        <group position={offsets.legrOffset}>
          <primitive
            object={nodes.legr}
            onPointerDown={(e) => handleDragStart(e, 'legR')}
            onPointerUp={handleDragEnd}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
          />
        </group>
        <mesh
          onPointerDown={(e) => handleDragStart(e, 'legR')}
          onPointerUp={handleDragEnd}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          visible={false}>
          <boxGeometry args={dimensions.legDimensions} />
          <meshStandardMaterial transparent opacity={0} />
        </mesh>
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
})

useGLTF.preload('/pepe.glb')
