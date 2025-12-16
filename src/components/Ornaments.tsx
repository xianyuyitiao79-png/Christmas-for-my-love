import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { generateOrnamentData, ORNAMENT_COUNT } from '../utils/tree-math'

interface OrnamentsProps {
  progressRef: React.MutableRefObject<number>
  formed: boolean
}

export function Ornaments({ progressRef, formed }: OrnamentsProps) {
  const boxMeshRef = useRef<THREE.InstancedMesh>(null)
  const sphereMeshRef = useRef<THREE.InstancedMesh>(null)
  
  const { boxes, spheres } = useMemo(() => {
    const allData = generateOrnamentData(ORNAMENT_COUNT)
    const boxes = allData.filter(d => d.type === 'box')
    const spheres = allData.filter(d => d.type === 'ball' || d.type === 'light')
    return { boxes, spheres }
  }, [])
  
  const dummy = useMemo(() => new THREE.Object3D(), [])
  
  // Current interpolated positions stored in a ref to avoid re-renders but allow physics later
  // For now, we just lerp between chaos and target based on global progress
  
  // Luxury Ease
  const easeInOutCubic = (x: number): number => {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  useFrame((state) => {
    const t = state.clock.elapsedTime
    // Use non-linear ease for luxury feel
    // const p = easeInOutCubic(progressRef.current) 
    const globalP = progressRef.current
    
    // Spiral logic: Twist based on (1-p)
    // const twistStrength = (1 - p) * 10.0
    
    const rotateY = (vec: THREE.Vector3, angle: number) => {
        const s = Math.sin(angle)
        const c = Math.cos(angle)
        const x = vec.x
        const z = vec.z
        vec.x = c * x + s * z
        vec.z = -s * x + c * z
    }
    
    // Helper for Stagger
    const getLocalP = (y: number) => {
        // Normalize Y approx -10 to 12
        const normT = (y + 10) / 22
        const safeT = THREE.MathUtils.clamp(normT, 0, 1)
        
        let localP = globalP * 2.5 - (1.5 - safeT * 1.5)
        localP = THREE.MathUtils.clamp(localP, 0, 1)
        return easeInOutCubic(localP)
    }
    
    // Update Boxes
    if (boxMeshRef.current) {
      boxes.forEach((data, i) => {
        const { chaosPos, targetPos } = data
        
        const p = getLocalP(targetPos.y)
        const twistStrength = (1 - p) * 10.0
        
        // Lerp
        dummy.position.lerpVectors(chaosPos, targetPos, p)
        
        // Apply spiral
        rotateY(dummy.position, twistStrength)
        
        // Add some rotation for boxes
        dummy.rotation.x = t * 0.5 + i
        dummy.rotation.y = t * 0.3 + i
        
        // Scale based on p (pop in)
        // Keep scale when dispersed (p=0) for "dispersed in air" effect
        // Or do we want them to stay full size? 
        // User said "don't shrink after dispersing". 
        // So scale should be constant 1.5, maybe just fade in opacity if needed?
        // Or just keep them visible.
        dummy.scale.setScalar(1.5)
        
        dummy.updateMatrix()
        boxMeshRef.current!.setMatrixAt(i, dummy.matrix)
      })
      boxMeshRef.current.instanceMatrix.needsUpdate = true
    }
    
    // Update Spheres
    if (sphereMeshRef.current) {
      spheres.forEach((data, i) => {
        const { chaosPos, targetPos } = data
        
        const p = getLocalP(targetPos.y)
        const twistStrength = (1 - p) * 10.0
        
        // Lerp
        dummy.position.lerpVectors(chaosPos, targetPos, p)
        
        // Apply spiral
        rotateY(dummy.position, twistStrength)
        
        // Add some floating/breathing
        dummy.position.y += Math.sin(t * 2 + i) * 0.05 * p
        
        let scale = 0.9
        if (data.type === 'light') scale = 0.5
        
        // dummy.scale.setScalar(scale * p)
        dummy.scale.setScalar(scale)
        
        dummy.updateMatrix()
        sphereMeshRef.current!.setMatrixAt(i, dummy.matrix)
      })
      sphereMeshRef.current.instanceMatrix.needsUpdate = true
    }
  })
  
  // Set colors once
  useMemo(() => {
    if (!boxMeshRef.current && boxes.length > 0) return // Should be handled in useEffect if refs are not ready, but usually we render mesh first
  }, [])

  // We need to set colors in a useEffect because refs are null initially? 
  // Actually standard way is to use <instancedMesh> and in layoutEffect set colors.
  
  React.useLayoutEffect(() => {
    if (boxMeshRef.current) {
      boxes.forEach((data, i) => {
        boxMeshRef.current!.setColorAt(i, data.color)
      })
      boxMeshRef.current.instanceColor!.needsUpdate = true
    }
    if (sphereMeshRef.current) {
      spheres.forEach((data, i) => {
        sphereMeshRef.current!.setColorAt(i, data.color)
      })
      sphereMeshRef.current.instanceColor!.needsUpdate = true
    }
  }, [boxes, spheres])

  return (
    <group>
      <instancedMesh ref={boxMeshRef} args={[undefined, undefined, boxes.length]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial roughness={0.3} metalness={0.8} />
      </instancedMesh>
      
      <instancedMesh ref={sphereMeshRef} args={[undefined, undefined, spheres.length]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial roughness={0.2} metalness={0.9} emissive="#333" emissiveIntensity={0.2} />
      </instancedMesh>
    </group>
  )
}
