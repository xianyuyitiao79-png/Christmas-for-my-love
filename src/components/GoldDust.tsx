import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const COUNT = 300

export function GoldDust() {
  const { viewport } = useThree()
  const mesh = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  
  // Particle state
  const particles = useMemo(() => {
    const data = []
    for (let i = 0; i < COUNT; i++) {
      data.push({
        pos: new THREE.Vector3(
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20
        ),
        vel: new THREE.Vector3(0, 0, 0),
        acc: new THREE.Vector3(0, 0, 0),
        size: Math.random() * 0.2 + 0.05
      })
    }
    return data
  }, [])

  // Mouse vector in 3D
  const mouse3D = useRef(new THREE.Vector3())

  useFrame((state) => {
    // Map pointer to 3D position (at z=0 or somewhat in front of tree)
    // We want the dust to follow the mouse.
    // Viewport width/height at z=0.
    // Actually viewport gives us the size at z=0 (default target).
    // But our camera is at z=20.
    // So let's project pointer to z=5 or something closer to tree.
    
    // Simple unproject logic:
    // pointer.x * viewport.width/2
    
    // But viewport is at `target` distance (default 0).
    // So:
    mouse3D.current.set(
      (state.pointer.x * viewport.width) / 2,
      (state.pointer.y * viewport.height) / 2,
      5 // Move attraction point slightly in front
    )
    
    if (mesh.current) {
      particles.forEach((p, i) => {
        // Attraction force
        const diff = new THREE.Vector3().copy(mouse3D.current).sub(p.pos)
        const dist = diff.length()
        
        // Only attract if close enough or global weak attraction
        // Let's make it a magical swirl
        
        if (dist < 10) {
           diff.normalize().multiplyScalar(0.5) // Attraction strength
           p.acc.add(diff)
        }
        
        // Random Brownian motion / drift
        p.acc.x += (Math.random() - 0.5) * 0.05
        p.acc.y += (Math.random() - 0.5) * 0.05 - 0.02 // Gravity slightly down
        p.acc.z += (Math.random() - 0.5) * 0.05
        
        // Update physics
        p.vel.add(p.acc)
        p.vel.multiplyScalar(0.96) // Friction
        p.pos.add(p.vel)
        p.acc.set(0, 0, 0) // Reset acc
        
        // Bounds check - reset if too far
        if (p.pos.y < -10) {
            p.pos.y = 10
            p.pos.x = (Math.random() - 0.5) * 20
            p.pos.z = (Math.random() - 0.5) * 20
            p.vel.set(0,0,0)
        }
        
        // Update Instance
        dummy.position.copy(p.pos)
        dummy.scale.setScalar(p.size)
        // Rotate particle for sparkle
        dummy.rotation.x += 0.01
        dummy.rotation.y += 0.01
        
        dummy.updateMatrix()
        mesh.current!.setMatrixAt(i, dummy.matrix)
      })
      mesh.current.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, COUNT]}>
      {/* Snowflake shape or just simple plane/sphere? Plane with texture is best, but sphere is easiest */}
      <sphereGeometry args={[1, 8, 8]} /> 
      <meshStandardMaterial 
        color="#FFD700" 
        emissive="#FFD700" 
        emissiveIntensity={0.8}
        roughness={0.1}
        metalness={1}
      />
    </instancedMesh>
  )
}
