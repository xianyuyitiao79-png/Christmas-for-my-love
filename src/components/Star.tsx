import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { TREE_HEIGHT } from '../utils/tree-math'

interface StarProps {
  progressRef: React.MutableRefObject<number>
  formed: boolean
}

export function Star({ progressRef, formed }: StarProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  // Create a 5-pointed star shape
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    const points = 5
    const outerRadius = 2.5 // Increased from 1.5
    const innerRadius = 1.0 // Increased from 0.6
    
    for (let i = 0; i < points * 2; i++) {
      // Start at PI/2 (90 degrees) to point straight up
      // We go clockwise or counter-clockwise? 
      // i increments -> angle increases -> counter-clockwise
      const angle = (i * Math.PI) / points + Math.PI / 2
      const radius = i % 2 === 0 ? outerRadius : innerRadius
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      if (i === 0) shape.moveTo(x, y)
      else shape.lineTo(x, y)
    }
    shape.closePath()
    
    const extrudeSettings = {
      depth: 0.6, // Thicker
      bevelEnabled: true,
      bevelThickness: 0.2, // More bevel
      bevelSize: 0.2,
      bevelSegments: 2
    }
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings)
  }, [])
  
  // Center geometry
  useMemo(() => geometry.center(), [geometry])
  
  // Move star up to avoid clipping with tree tip
  // Tree tip is at TREE_HEIGHT / 2 (22). Star radius ~2.5.
  // We place it at 22 + 3.0 = 25.0 to sit nicely on top.
  const targetPos = useMemo(() => new THREE.Vector3(0, TREE_HEIGHT / 2 + 3.0, 0), [])
  const chaosPos = useMemo(() => new THREE.Vector3(0, 30, 0), []) // Float high above
  
  // Luxury Ease
  const easeInOutCubic = (x: number): number => {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  useFrame((state) => {
    if (!meshRef.current) return
    
    const t = state.clock.elapsedTime
    
    // Stagger Logic for Star (t=1, Top)
    // localP = globalP * 2.5 - (1.5 - 1.5) = globalP * 2.5
    let localP = progressRef.current * 2.5
    localP = THREE.MathUtils.clamp(localP, 0, 1)
    
    const p = easeInOutCubic(localP)
    
    // Position Lerp
    meshRef.current.position.lerpVectors(chaosPos, targetPos, p)
    
    // Rotation: Spin fast when forming, slow when formed
    meshRef.current.rotation.y = t * 0.5
    // Add a little wobble
    meshRef.current.rotation.z = Math.sin(t * 2) * 0.1
    
    // Scale pulse
    const pulse = 1 + Math.sin(t * 3) * 0.1
    // Shrink when in chaos?
    const formScale = p * 1.0 + (1-p) * 0.1
    meshRef.current.scale.setScalar(pulse * formScale)
  })

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial 
        color="#FFD700" 
        emissive="#FFD700" 
        emissiveIntensity={2.0} // Very bright
        roughness={0.1}
        metalness={1.0}
      />
    </mesh>
  )
}
