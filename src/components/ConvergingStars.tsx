import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function ConvergingStars() {
  const count = 3000
  const mesh = useRef<THREE.Points>(null)
  
  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count)
    for(let i=0; i<count; i++) {
        const r = 40 + Math.random() * 60
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        
        pos[i*3] = r * Math.sin(phi) * Math.cos(theta)
        pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta)
        pos[i*3+2] = r * Math.cos(phi)
        
        vel[i] = 0.02 + Math.random() * 0.05
    }
    return [pos, vel]
  }, [])

  useFrame(() => {
    if (!mesh.current) return
    const pos = mesh.current.geometry.attributes.position.array as Float32Array
    
    for(let i=0; i<count; i++) {
        const ix = i * 3
        const x = pos[ix]
        const y = pos[ix+1]
        const z = pos[ix+2]
        
        // Simple convergence to center (0,0,0)
        // Move by fraction of current position
        const v = velocities[i]
        
        pos[ix] -= x * v * 0.1
        pos[ix+1] -= y * v * 0.1
        pos[ix+2] -= z * v * 0.1
        
        // Respawn if too close
        const d2 = x*x + y*y + z*z
        if (d2 < 25) { // Radius < 5
             const r = 80 + Math.random() * 20
             const theta = Math.random() * Math.PI * 2
             const phi = Math.acos(2 * Math.random() - 1)
             pos[ix] = r * Math.sin(phi) * Math.cos(theta)
             pos[ix+1] = r * Math.sin(phi) * Math.sin(theta)
             pos[ix+2] = r * Math.cos(phi)
        }
    }
    mesh.current.geometry.attributes.position.needsUpdate = true
    
    // Rotate entire field slowly
    mesh.current.rotation.y += 0.0005
    mesh.current.rotation.z += 0.0002
  })

  return (
    <points ref={mesh}>
        <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial 
            size={0.15} 
            color="#FFD700" 
            transparent 
            opacity={0.6} 
            sizeAttenuation 
            blending={THREE.AdditiveBlending}
        />
    </points>
  )
}