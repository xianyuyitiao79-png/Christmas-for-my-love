import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface SpiralLightsProps {
  progressRef: React.MutableRefObject<number>
  formed: boolean
}

// Light configuration
const LIGHT_COUNT = 400
const TURNS = 8 // How many times it wraps around
const HEIGHT = 25
const RADIUS_BOTTOM = 16 // Increased from 12
const RADIUS_TOP = 2 // Increased from 0 to prevent pinching at top

export function SpiralLights({ progressRef, formed }: SpiralLightsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  // Generate static positions for the lights along a perfect spiral
  const lightData = useMemo(() => {
    return Array.from({ length: LIGHT_COUNT }, (_, i) => {
      const t = i / (LIGHT_COUNT - 1) // 0 to 1
      
      // Calculate Spiral Position
      const angle = t * TURNS * Math.PI * 2
      const radius = THREE.MathUtils.lerp(RADIUS_BOTTOM, RADIUS_TOP, t)
      const y = THREE.MathUtils.lerp(-20, 15, t) // Bottom to Top
      
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      
      const targetPos = new THREE.Vector3(x, y, z)
      
      // Chaos position (exploded outwards)
      const chaosPos = targetPos.clone().multiplyScalar(3).add(
          new THREE.Vector3(
              (Math.random() - 0.5) * 20,
              (Math.random() - 0.5) * 20,
              (Math.random() - 0.5) * 20
          )
      )
      
      return { chaosPos, targetPos, t }
    })
  }, [])

  useFrame((state) => {
    if (!meshRef.current) return
    
    const time = state.clock.elapsedTime
    
    // Smooth progress
    // We use the global progressRef which is already lerped in Tree.tsx
    // But we want to apply local staggering.
    const globalP = progressRef.current
    
    // Twist effect
    // We want the twist to be stronger when dispersed
    // We'll base it on localP inside the loop
    const rotateY = (vec: THREE.Vector3, angle: number) => {
        const s = Math.sin(angle)
        const c = Math.cos(angle)
        const x = vec.x
        const z = vec.z
        vec.x = c * x + s * z
        vec.z = -s * x + c * z
    }

    // Breathing effect (Subtle)
    // 2-4 second cycle -> 0.25 - 0.5 Hz. Let's use 0.5 Hz (2s)
    const breath = Math.sin(time * Math.PI) * 0.15 + 1.0 // 0.85 to 1.15

    lightData.forEach((data, i) => {
        const { chaosPos, targetPos, t } = data
        
        // Stagger Logic
        // t is 0 (bottom) to 1 (top).
        // Assemble (0->1): Top first.
        // Disperse (1->0): Bottom first.
        // Formula: localP = globalP * 2 - (1 - t)
        // Check: gp=0.5 -> Top(1) = 1.0, Bottom(0) = 0.0
        
        let localP = globalP * 2.5 - (1.5 - t * 1.5) // Tuning for better overlap
        localP = THREE.MathUtils.clamp(localP, 0, 1)
        
        // Ease the local progress
        // cubic ease
        const p = localP < 0.5 ? 4 * localP * localP * localP : 1 - Math.pow(-2 * localP + 2, 3) / 2;
        
        // Twist strength based on local progress
        const twistStrength = (1 - p) * 15.0
        
        // Interpolate position
        dummy.position.lerpVectors(chaosPos, targetPos, p)
        
        // Apply twist
        rotateY(dummy.position, twistStrength)
        
        // Scale pulse (twinkle) + Breathing
        // Offset phase by index for running lights effect
        const pulse = Math.sin(time * 3 + i * 0.2) * 0.5 + 0.5
        const scale = (0.5 + pulse * 0.5) * breath * p // Scale down to 0 when hidden
        
        dummy.scale.setScalar(scale)
        
        dummy.updateMatrix()
        meshRef.current!.setMatrixAt(i, dummy.matrix)
    })
    
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, LIGHT_COUNT]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial 
            color="#FFFFFF" 
            emissive="#FFFFFF" 
            emissiveIntensity={2.0} 
            toneMapped={false} 
        />
    </instancedMesh>
  )
}
