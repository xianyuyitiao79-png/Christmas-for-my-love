import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface CameraControllerProps {
  introState: 'waiting' | 'opening' | 'finished'
}

export function CameraController({ introState }: CameraControllerProps) {
  const { camera } = useThree()
  // Store initial position to avoid jumping if needed, but we'll hardcode for cinematic feel
  
  useEffect(() => {
    if (introState === 'waiting') {
      // Start position looking at the gift
      camera.position.set(0, 3, 15)
      camera.lookAt(0, 2.5, 0)
    }
  }, [introState, camera])

  useFrame((state, delta) => {
    if (introState === 'opening') {
      // Move camera forward into the box center [0, 2.5, 0]
      // We target a point slightly in front of the box center to avoid clipping initially
      const target = new THREE.Vector3(0, 2.5, 0.5) // Deeper inside the box
      // Smoothly interpolate current position to target
      // Slower speed for "cinematic" feel
      camera.position.lerp(target, delta * 0.8)
      camera.lookAt(0, 2.5, 0)
    }
    
    if (introState === 'finished') {
       // When finished, we want to ensure the camera is in a good position for the tree
       // OrbitControls will enable, so we should be at a reasonable distance.
       // We can smoothly pull back if we want, but since 'finished' happens after the burst,
       // we can just snap to the tree view or lerp quickly.
       
       // Increase Z distance to 45 to comfortably fit the whole tree (height ~22 units)
       // Center Y at 1 (midpoint of -10 to 12)
       const treeViewPos = new THREE.Vector3(0, 1, 45)
       // If we are too close, pull back
       if (camera.position.distanceTo(treeViewPos) > 0.5) {
         camera.position.lerp(treeViewPos, delta * 2)
         camera.lookAt(0, 1, 0) // Look at tree center
       }
    }
  })

  return null
}
