import { useMemo, useRef, useState } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { generatePhotoData } from '../utils/tree-math'

interface PhotoOrnamentsProps {
  progressRef: React.MutableRefObject<number>
  formed: boolean
}

const PHOTO_COUNT = 12

export function PhotoOrnaments({ progressRef, formed }: PhotoOrnamentsProps) {
  // Load textures
  // We assume photos are named 1.jpg to 12.jpg
  const photoPaths = useMemo(() => {
    return Array.from({ length: PHOTO_COUNT }, (_, i) => `/photos/${i + 1}.jpg`)
  }, [])

  const textures = useLoader(THREE.TextureLoader, photoPaths)

  const photos = useMemo(() => generatePhotoData(PHOTO_COUNT), [])

  // Luxury Ease
  const easeInOutCubic = (x: number): number => {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }
  
  // Track active photo for fullscreen
  const [activePhoto, setActivePhoto] = useState<number | null>(null)
  
  return (
    <group>
      {photos.map((data, i) => (
        <PhotoItem 
            key={i} 
            data={data} 
            texture={textures[i]} 
            progressRef={progressRef} 
            easeInOutCubic={easeInOutCubic}
            isActive={activePhoto === i}
            onSelect={() => setActivePhoto(activePhoto === i ? null : i)}
        />
      ))}
      
      {/* Fullscreen Overlay when active */}
      {activePhoto !== null && (
          <Html fullscreen style={{ pointerEvents: 'none' }}>
              <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto" onClick={() => setActivePhoto(null)}>
                  {/* Backdrop handled by component logic, just click handler here */}
              </div>
          </Html>
      )}
    </group>
  )
}

function PhotoItem({ data, texture, progressRef, easeInOutCubic, isActive, onSelect }: any) {
    const meshRef = useRef<THREE.Group>(null)
    const targetRef = useRef(new THREE.Vector3())
    const lookAtRef = useRef(new THREE.Vector3())
    
    // Animation state for click
    const activeProgress = useRef(0)
    
    // Spiral logic helper
    const rotateY = (vec: THREE.Vector3, angle: number) => {
        const s = Math.sin(angle)
        const c = Math.cos(angle)
        const x = vec.x
        const z = vec.z
        vec.x = c * x + s * z
        vec.z = -s * x + c * z
    }
    
    useFrame((state, delta) => {
        if (!meshRef.current) return
        
        // Update active transition
        activeProgress.current = THREE.MathUtils.lerp(activeProgress.current, isActive ? 1 : 0, delta * 5)
        const activeP = activeProgress.current
        
        const t = state.clock.elapsedTime
        // const p = easeInOutCubic(progressRef.current)
        const globalP = progressRef.current
        
        // Calculate Local Progress for Stagger
        // Normalize Y (Target Pos) approx -5 to 10?
        const { chaosPos, targetPos } = data
        const normT = (targetPos.y + 10) / 22
        const safeT = THREE.MathUtils.clamp(normT, 0, 1)
        
        let localP = globalP * 2.5 - (1.5 - safeT * 1.5)
        localP = THREE.MathUtils.clamp(localP, 0, 1)
        const p = easeInOutCubic(localP)
        
        // 1. Calculate Base Position (Tree)
        const treePos = new THREE.Vector3().lerpVectors(chaosPos, targetPos, p)
        
        // Apply spiral
        const twistStrength = (1 - p) * 10.0
        rotateY(treePos, twistStrength)
        
        // Floating + Swaying (Gentle swing)
        treePos.y += Math.sin(t * 1.5 + data.id) * 0.2
        
        // Swaying Rotation (When on tree)
        // Rotate around Z axis to swing left/right
        // Pivot is top center (handled by geometry offset or just rotation?)
        // Currently geometry is centered. We need to apply rotation before translation? 
        // No, we are setting position.
        // If we rotate meshRef, it rotates around its center.
        // To swing from top, we need to move the geometry down, or use a parent pivot.
        // Let's just apply a Z-rotation. It will look like swinging from center, which is okay-ish,
        // but swinging from top is better.
        // Let's add a Sway Group inside.
        
        // Actually, let's just add the sway rotation to the lookAt logic.
        // But lookAt overwrites rotation.
        
        // We can add the sway to the Z rotation AFTER lookAt.
        // Sway amplitude: 3-5 degrees = ~0.05 to 0.08 radians.
        if (!isActive) {
             const sway = Math.sin(t * 2 + data.id) * 0.08 * p // Sway only when formed
             meshRef.current.rotation.z += sway
        }
        // Get camera position and move forward
        const camPos = state.camera.position.clone()
        const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(state.camera.quaternion)
        const activeTarget = camPos.clone().add(camDir.multiplyScalar(10)) // 10 units in front of camera
        
        // 3. Interpolate between Tree and Active
        // Use a smooth curve for the transition
        const smoothActive = easeInOutCubic(activeP)
        meshRef.current.position.lerpVectors(treePos, activeTarget, smoothActive)
        
        // 4. Rotation Logic
        // Tree Mode: Face Outward from Center (0,y,0)
        // Active Mode: Face Camera
        
        // Calculate Tree Look Target (Center)
        const treeLook = new THREE.Vector3(0, meshRef.current.position.y, 0)
        // Calculate Active Look Target (Camera)
        const activeLook = state.camera.position.clone()
        
        // Interpolate look target
        lookAtRef.current.lerpVectors(treeLook, activeLook, smoothActive)
        
        meshRef.current.lookAt(lookAtRef.current)
        
        // Fix rotation: 
        // When looking at center (Tree Mode), we need to rotate 180 (PI) to face outward.
        // When looking at camera (Active Mode), we don't need rotation (plane faces +Z).
        // So we lerp the extra rotation from PI to 0.
        // Wait, if it's upside down, we might need to check the up vector.
        // Or simply, lookAt might be flipping it if it passes through zenith.
        // Let's force up vector to be (0,1,0)
        meshRef.current.up.set(0, 1, 0)
        
        meshRef.current.rotateY(Math.PI * (1 - smoothActive))
        
        // 5. Scale Logic
        // Tree Mode: 1.0
        // Active Mode: 3.0 (Big display)
        // Also add a spin effect during transition?
        
        const baseScale = 1.0
        const targetScale = 3.0
        const currentScale = THREE.MathUtils.lerp(baseScale, targetScale, smoothActive)
        meshRef.current.scale.setScalar(currentScale)
        
        // Extra spin during transition
        // User wants "Rotate around Z axis" (Spinning like a wheel)
        if (isActive) {
             // Continuous slow spin around Z axis (like a propeller)
             meshRef.current.rotation.z = t * 0.5 
             
             // Plus a little bit of Y sway for 3D feel
             meshRef.current.rotation.y += Math.sin(t * 0.5) * 0.1
        }
    })
    
    return (
        <group ref={meshRef} onClick={(e) => { e.stopPropagation(); onSelect() }}>
            {/* Hanging String (Hanger) */}
            {/* Visual line connecting to a virtual "branch" point */}
            {/* We can randomize the attachment point slightly to look like it's hooked on a nearby branch/ball */}
            {/* Just drawing a line straight up is good enough for now, but let's make it longer and angled */}
            <group position={[0, 2.3, 0]}>
                {/* String */}
                <mesh position={[0, 0.8, 0]} rotation={[0, 0, 0]}>
                    <cylinderGeometry args={[0.01, 0.01, 1.6]} />
                    <meshBasicMaterial color="#FFD700" transparent opacity={0.6} />
                </mesh>
                
                {/* Decorative Connector Ball (Simulating connection to tree ornament) */}
                <mesh position={[0, 1.6, 0]}>
                    <sphereGeometry args={[0.1, 8, 8]} />
                    <meshStandardMaterial color="#D4AF37" metalness={1.0} roughness={0.1} />
                </mesh>
            </group>
            
            {/* Hook/Ring on Frame */}
            <mesh position={[0, 2.3, 0]}>
                <torusGeometry args={[0.15, 0.03, 8, 16]} />
                <meshStandardMaterial color="#D4AF37" metalness={1.0} roughness={0.2} />
            </mesh>

            {/* Gold Outer Frame */}
            {/* Expanded to 3.6 x 4.6 for luxury border */}
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[3.6, 4.6, 0.1]} />
                <meshStandardMaterial color="#D4AF37" metalness={0.9} roughness={0.1} />
            </mesh>
            
            {/* White Matting (The "white border") */}
            <mesh position={[0, 0, 0.06]}>
                <boxGeometry args={[3.2, 4.2, 0.02]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.8} />
            </mesh>
            
            {/* Photo Plane */}
            {/* Size 3x4 */}
            <mesh position={[0, 0, 0.08]}>
                <planeGeometry args={[3, 4]} />
                <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
            </mesh>
        </group>
    )
}
