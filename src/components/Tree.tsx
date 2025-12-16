import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useDrag } from '@use-gesture/react'
import { useControls, button } from 'leva'
import * as THREE from 'three'
import { Foliage } from './Foliage'
import { Ornaments } from './Ornaments'
import { Star } from './Star'
import { PhotoOrnaments } from './PhotoOrnaments'
import { SpiralLights } from './SpiralLights'

export interface TreeProps {
  formed: boolean
  onToggle: () => void
  gestureRotation?: number // -1 to 1 (0 is neutral)
}

export function Tree({ formed, onToggle, gestureRotation = 0 }: TreeProps) {
  const groupRef = useRef<THREE.Group>(null)
  
  // Physics state for rotation
  const rotationVelocity = useRef(0)
  const isDragging = useRef(false)
  
  // Progress state for morphing
  const progressRef = useRef(0)
  
  // Controls
  useControls({
    'Toggle Tree': button(() => onToggle()),
    'Reset Rotation': button(() => {
        if(groupRef.current) groupRef.current.rotation.y = 0
        rotationVelocity.current = 0
    })
  })

  // Auto-form after a delay
  // Handled by parent now or ignored
  
  // Gesture for spinning
  const bind = useDrag(({ delta: [dx], down }) => {
    isDragging.current = down
    // Add velocity based on drag delta (x-axis drag rotates around y-axis)
    // Adjust sensitivity as needed
    rotationVelocity.current += dx * 0.005
  })
  
  useFrame((_state, delta) => {
    // 1. Morphing Logic
    const targetProgress = formed ? 1 : 0
    // Slower, more cinematic lerp (approx 2-3 seconds to full form)
    // Using a smaller factor creates a "Zeno's paradox" approach, never fully reaching 1,
    // but close enough. For linear-ish time, we might want a constant speed, 
    // but lerp feels organic. Let's try 0.8 * delta.
    progressRef.current = THREE.MathUtils.lerp(progressRef.current, targetProgress, delta * 0.8)
    
    // 2. Rotation Physics
    if (!isDragging.current) {
      // Gesture Override
      if (gestureRotation !== 0) {
        // Direct control velocity
        // gestureRotation is -1 to 1.
        // Multiply by a factor for speed.
        rotationVelocity.current = gestureRotation * 0.05
      } else {
        // Apply friction when not controlled
        rotationVelocity.current *= 0.96 
      }
    }
    
    // Minimal rotation speed to keep it alive if desired, or just stop
    if (Math.abs(rotationVelocity.current) < 0.0001) rotationVelocity.current = 0
    
    if (groupRef.current) {
      groupRef.current.rotation.y += rotationVelocity.current
      
      // Luxury Auto-Spin:
      // When forming (progress < 0.9), spin faster to simulate "vortex assembly"
      // When formed, slow ambient spin.
      
      if (!isDragging.current) {
         if (formed && progressRef.current < 0.95) {
             // Assembly phase: Accelerate rotation
             // The closer to 0 (chaos), the faster it spins? Or spin as it tightens?
             // Let's spin as it forms.
             groupRef.current.rotation.y += 0.02 * (1 - progressRef.current)
         } else if (!formed && progressRef.current > 0.05) {
             // Disassembly phase
             groupRef.current.rotation.y -= 0.02 * progressRef.current
         } else if (Math.abs(rotationVelocity.current) < 0.001) {
             // Idle spin
             groupRef.current.rotation.y += 0.003
         }
      }
    }
  })
  
  return (
    // @ts-ignore
    <group ref={groupRef} {...bind()} rotation={[0, 0, 0]}>
      <Foliage progressRef={progressRef} formed={formed} />
      <Ornaments progressRef={progressRef} formed={formed} />
      <SpiralLights progressRef={progressRef} formed={formed} />
      <PhotoOrnaments progressRef={progressRef} formed={formed} />
      <Star progressRef={progressRef} formed={formed} />
    </group>
  )
}
