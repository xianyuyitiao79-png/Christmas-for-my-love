import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

export function SantaSleigh() {
  const sleighRef = useRef<THREE.Group>(null)
  const tailRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!sleighRef.current) return
    
    const t = state.clock.elapsedTime
    
    // Spiral/Helical Flight Logic
    const radius = 28 // Closer to tree
    const speed = 0.6 // Faster
    
    // Calculate position
    const x = Math.sin(t * speed) * radius
    const z = Math.cos(t * speed) * radius
    
    // Add vertical movement
    const y = 10 + Math.sin(t * 0.5) * 15
    
    sleighRef.current.position.set(x, y, z)
    
    // Rotate to face forward direction of travel
    const nextT = t + 0.1
    const nextX = Math.sin(nextT * speed) * radius
    const nextZ = Math.cos(nextT * speed) * radius
    const nextY = 10 + Math.sin(nextT * 0.5) * 15
    
    sleighRef.current.lookAt(nextX, nextY, nextZ)
  })

  return (
    <>
      <group ref={sleighRef}>
        {/* Sleigh Body */}
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[2, 1, 3]} />
          <meshStandardMaterial color="#8B0000" /> {/* Dark Red */}
        </mesh>
        
        {/* Runners (Gold) */}
        <mesh position={[0.8, -0.5, 0]}>
          <boxGeometry args={[0.1, 0.1, 3.5]} />
          <meshStandardMaterial color="#D4AF37" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[-0.8, -0.5, 0]}>
          <boxGeometry args={[0.1, 0.1, 3.5]} />
          <meshStandardMaterial color="#D4AF37" metalness={0.8} roughness={0.2} />
        </mesh>
        
        {/* Santa (Abstract) */}
        <mesh position={[0, 0.8, -0.5]}>
          <sphereGeometry args={[0.6, 16, 16]} />
          <meshStandardMaterial color="#FF0000" />
        </mesh>
        <mesh position={[0, 1.4, -0.5]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial color="#FFCC99" /> {/* Skin tone */}
        </mesh>
        {/* Beard */}
        <mesh position={[0, 1.3, -0.2]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        {/* Hat */}
        <mesh position={[0, 1.6, -0.5]}>
          <coneGeometry args={[0.3, 0.6, 16]} />
          <meshStandardMaterial color="#FF0000" />
        </mesh>

        {/* Reindeer (Abstract Group) - Ahead of sleigh */}
        <group position={[0, 0, 4]}>
           {/* Reindeer 1 (Left) */}
           <Reindeer position={[-0.8, 0, 0]} />
           {/* Reindeer 2 (Right) */}
           <Reindeer position={[0.8, 0, 0]} />
           
           {/* Reindeer 3 (Left Front) */}
           <Reindeer position={[-0.8, 0, 2.5]} />
           {/* Reindeer 4 (Right Front) */}
           <Reindeer position={[0.8, 0, 2.5]} />
           
           {/* Reins (Lines connecting sleigh to deer) */}
           <mesh position={[0, 0.5, -1]} rotation={[Math.PI/2, 0, 0]}>
               <cylinderGeometry args={[0.02, 0.02, 4]} />
               <meshBasicMaterial color="#5C4033" />
           </mesh>
        </group>
        
        // Magic Trail Particles
        <pointLight color="#FFD700" intensity={1} distance={10} decay={2} />
        
        {/* Attachment Point for Banner */}
        {/* Move it further back to create distance */}
        {/* Sleigh body ends at z=1.5. Let's put attachment at z=-2.5 */}
        <group ref={tailRef} position={[0, 0.5, -2.5]} />
        
        {/* Visual String connecting Sleigh to Banner Start */}
        <mesh position={[0, 0.5, -2]} rotation={[Math.PI/2, 0, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 1.5]} />
            <meshBasicMaterial color="#C0C0C0" transparent opacity={0.5} />
        </mesh>
      </group>

      {/* Physics Cloth Banner */}
      <ClothBanner attachmentRef={tailRef} />
    </>
  )
}

function ClothBanner({ attachmentRef }: { attachmentRef: any }) {
    const meshRef = useRef<THREE.Mesh>(null)
    const texture = useBannerTexture()
    const backTexture = useBannerBackTexture()
    
    // Cloth Simulation Params
    const w = 10
    const h = 6
    const restDist = 0.4
    
    // Particles state
    // We need persistent state for Verlet integration
    const particles = useMemo(() => {
        const count = w * h
        const pos = new Float32Array(count * 3)
        const oldPos = new Float32Array(count * 3)
        const mass = new Float32Array(count)
        
        // Initialize flat
        for(let y=0; y<h; y++) {
            for(let x=0; x<w; x++) {
                const i = (y * w + x)
                const px = x * restDist
                const py = -y * restDist // Hang down
                const pz = 0
                
                pos[i*3] = px
                pos[i*3+1] = py
                pos[i*3+2] = pz
                
                oldPos[i*3] = px
                oldPos[i*3+1] = py
                oldPos[i*3+2] = pz
                
                // Pin the first column (x=0)
                mass[i] = x === 0 ? 0 : 1 // 0 mass = infinite mass (fixed)
            }
        }
        return { pos, oldPos, mass }
    }, [])
    
    // Constraints
    const constraints = useMemo(() => {
        const links = []
        for(let y=0; y<h; y++) {
            for(let x=0; x<w; x++) {
                const i = y * w + x
                // Right neighbor
                if (x < w - 1) links.push([i, i+1, restDist])
                // Bottom neighbor
                if (y < h - 1) links.push([i, i+w, restDist])
                // Shear/diagonal (optional for stiffness)
                // if (x < w - 1 && y < h - 1) links.push([i, i+w+1, restDist * 1.414])
            }
        }
        return links
    }, [])
    
    const vec3 = new THREE.Vector3()
    const worldPos = new THREE.Vector3()
    
    useFrame((state, delta) => {
        if (!meshRef.current || !attachmentRef.current) return
        
        const { pos, oldPos, mass } = particles
        const dt = Math.min(delta, 0.03) // Clamp dt
        const drag = 0.98
        const gravity = -9.8
        
        // 1. Update Attachment Point (Pinning)
        attachmentRef.current.getWorldPosition(worldPos)
        
        // Pin the entire first column to the attachment bar?
        // Let's create a virtual vertical bar at the attachment point
        // attachmentRef is center of the bar
        for(let y=0; y<h; y++) {
            const i = y * w + 0 // First column
            // Offset y to center the banner vertically on the attachment point
            // Height is (h-1)*restDist = 5 * 0.4 = 2.0
            // Start y at +1.0
            const yOffset = 1.0 - y * restDist
            
            pos[i*3] = worldPos.x
            pos[i*3+1] = worldPos.y + yOffset
            pos[i*3+2] = worldPos.z
            
            // Reset oldPos to avoid velocity explosion on pin
            // Actually better to let velocity implicitly handle "drag"
            // But for pinned, we force position.
        }
        
        // 2. Verlet Integration
        for(let i=0; i<pos.length/3; i++) {
            if (mass[i] === 0) continue // Skip pinned
            
            const idx = i*3
            const x = pos[idx]
            const y = pos[idx+1]
            const z = pos[idx+2]
            
            const vx = (x - oldPos[idx]) * drag
            const vy = (y - oldPos[idx+1]) * drag
            const vz = (z - oldPos[idx+2]) * drag
            
            oldPos[idx] = x
            oldPos[idx+1] = y
            oldPos[idx+2] = z
            
            // Forces
            // Gravity (Reduced for floaty flag look)
            let ay = gravity * 0.3 * dt * dt
            
            // Wind / Noise
            // Simple sine wave wind + random
            const noise = Math.sin(x * 0.5 + z * 0.5 + state.clock.elapsedTime * 5) * 0.1
            const wx = noise * 0.05 // Drastically reduced wind force (was 0.2)
            const wz = noise * 0.05
            
            // Drag / Air Resistance (make it trail behind)
            // If the sleigh is moving forward (local +Z relative to banner? No, banner is in world space)
            // Sleigh moves in +Z local, but banner is trailing.
            // Effectively, air pushes opposite to velocity.
            // Let's just add a constant "drag back" force relative to the attachment point's movement?
            // Actually, inertia handles most of it.
            // Just dampen the swing.
            
            pos[idx] = x + vx + wx
            pos[idx+1] = y + vy + ay
            pos[idx+2] = z + vz + wz
        }
        
        // 3. Constraints Relaxation
        const iterations = 3
        for(let k=0; k<iterations; k++) {
            for(let j=0; j<constraints.length; j++) {
                const [i1, i2, d] = constraints[j]
                
                const idx1 = i1 * 3
                const idx2 = i2 * 3
                
                const x1 = pos[idx1], y1 = pos[idx1+1], z1 = pos[idx1+2]
                const x2 = pos[idx2], y2 = pos[idx2+1], z2 = pos[idx2+2]
                
                const dx = x2 - x1
                const dy = y2 - y1
                const dz = z2 - z1
                
                const dist = Math.sqrt(dx*dx + dy*dy + dz*dz)
                const diff = (dist - d) / dist
                
                const m1 = mass[i1]
                const m2 = mass[i2]
                const mSum = m1 + m2
                if(mSum === 0) continue
                
                const scalar1 = (m1 / mSum) * 0.5 // approximate stiffness
                const scalar2 = (m2 / mSum) * 0.5
                
                // Correction
                const cx = dx * diff * 0.5
                const cy = dy * diff * 0.5
                const cz = dz * diff * 0.5
                
                if (m1 !== 0) {
                    pos[idx1] += cx
                    pos[idx1+1] += cy
                    pos[idx1+2] += cz
                }
                
                if (m2 !== 0) {
                    pos[idx2] -= cx
                    pos[idx2+1] -= cy
                    pos[idx2+2] -= cz
                }
            }
        }
        
        // 4. Update Geometry
        const geo = meshRef.current.geometry
        geo.attributes.position.array.set(pos)
        geo.attributes.position.needsUpdate = true
        geo.computeVertexNormals()
    })
    
    // We need two meshes back-to-back or a custom shader for different sides
    // Simplest is two meshes slightly offset? No, cloth is single layer.
    // Standard material only supports one map.
    // Let's use a group with two meshes sharing the geometry, one flipped normal?
    // Or just render twice with different side and map.
    // Actually, physically simulated cloth is best as one mesh.
    // We can use a shader material to flip UVs on backface or use different textures.
    // Let's try rendering two meshes sharing the same geometry ref?
    // But geometry updates every frame.
    // Let's just use the mesh for Front and another mesh for Back with negative scale?
    
    return (
        <group>
            {/* Front Face */}
            <mesh ref={meshRef} castShadow receiveShadow frustumCulled={false}>
                <planeGeometry args={[1, 1, w-1, h-1]} />
                <meshStandardMaterial 
                    map={texture} 
                    side={THREE.FrontSide} 
                    roughness={0.4}
                    metalness={0.1}
                    alphaTest={0.5}
                />
            </mesh>
            
            {/* Back Face (Mirrored Texture) */}
            {/* We can re-use the geometry if we extract it, but ref updates it. */}
            {/* Let's clone the mesh logic or just put a second material on the back? */}
            {/* Three.js doesn't support double-sided materials with different maps easily. */}
            {/* We will add a second mesh that copies the first mesh's geometry every frame? */}
            {/* Or better: Use a second mesh that shares the SAME geometry object instance. */}
            <BackFace meshRef={meshRef} texture={backTexture} />
        </group>
    )
}

function BackFace({ meshRef, texture }: { meshRef: any, texture: THREE.Texture }) {
    const backRef = useRef<THREE.Mesh>(null)
    
    useFrame(() => {
        if (meshRef.current && backRef.current) {
            // Copy geometry? No, just assign it once if possible.
            // But React rerenders.
            // Let's manually sync position attribute?
            // Actually, we can just share the geometry via state or prop?
            // But geometry is created inside the first mesh.
            
            // Hack: Copy buffer attributes
            const srcGeo = meshRef.current.geometry
            const dstGeo = backRef.current.geometry
            
            // If lengths match
            if (srcGeo.attributes.position.count === dstGeo.attributes.position.count) {
                 dstGeo.attributes.position.array.set(srcGeo.attributes.position.array)
                 dstGeo.attributes.position.needsUpdate = true
                 dstGeo.computeVertexNormals()
            }
        }
    })
    
    return (
        <mesh ref={backRef} frustumCulled={false}>
             {/* Same args as parent */}
            <planeGeometry args={[1, 1, 9, 5]} /> 
            <meshStandardMaterial 
                map={texture} 
                side={THREE.BackSide} 
                roughness={0.4}
                metalness={0.1}
                alphaTest={0.5}
            />
        </mesh>
    )
}

function useBannerTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 128
    const ctx = canvas.getContext('2d')!
    
    // Transparent BG? No, festive red.
    ctx.fillStyle = '#8B0000'
    ctx.fillRect(0, 0, 512, 128)
    
    // Gold Border
    ctx.strokeStyle = '#FFD700'
    ctx.lineWidth = 15
    ctx.strokeRect(0, 0, 512, 128)
    
    // Front Text (Normal)
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 80px serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    // Draw Front
    ctx.fillText('LOVE YOU', 256, 64)
    
    // Create texture
    const tex = new THREE.CanvasTexture(canvas)
    tex.anisotropy = 16
    return tex
  }, [])
}

function useBannerBackTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 128
    const ctx = canvas.getContext('2d')!
    
    // Transparent BG? No, festive red.
    ctx.fillStyle = '#8B0000'
    ctx.fillRect(0, 0, 512, 128)
    
    // Gold Border
    ctx.strokeStyle = '#FFD700'
    ctx.lineWidth = 15
    ctx.strokeRect(0, 0, 512, 128)
    
    // Back Text (Mirrored)
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 80px serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    ctx.save()
    ctx.translate(512, 0)
    ctx.scale(-1, 1)
    ctx.fillText('LOVE YOU', 256, 64)
    ctx.restore()
    
    const tex = new THREE.CanvasTexture(canvas)
    tex.anisotropy = 16
    return tex
  }, [])
}

function Reindeer({ position }: { position: [number, number, number] }) {
    const groupRef = useRef<THREE.Group>(null)
    
    useFrame((state) => {
        if (!groupRef.current) return
        // Gallop animation
        const t = state.clock.elapsedTime
        groupRef.current.position.y = position[1] + Math.sin(t * 10 + position[2]) * 0.2
        groupRef.current.rotation.x = Math.sin(t * 10 + position[2]) * 0.1
    })

    return (
        <group ref={groupRef} position={position}>
            {/* Body */}
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.5, 0.5, 1.2]} />
                <meshStandardMaterial color="#8B4513" /> {/* Brown */}
            </mesh>
            {/* Neck */}
            <mesh position={[0, 0.4, 0.5]} rotation={[-0.5, 0, 0]}>
                <boxGeometry args={[0.3, 0.6, 0.3]} />
                <meshStandardMaterial color="#8B4513" />
            </mesh>
            {/* Head */}
            <mesh position={[0, 0.8, 0.7]}>
                <boxGeometry args={[0.35, 0.35, 0.5]} />
                <meshStandardMaterial color="#8B4513" />
            </mesh>
            {/* Red Nose (Rudolph check?) */}
            {/* Let's make the front right one Rudolph */}
            {position[2] > 2 && position[0] > 0 && (
                <mesh position={[0, 0.8, 1.0]}>
                    <sphereGeometry args={[0.08, 8, 8]} />
                    <meshStandardMaterial color="#FF0000" emissive="#FF0000" emissiveIntensity={2} />
                </mesh>
            )}
            
            {/* Legs */}
            <mesh position={[-0.2, -0.6, 0.4]}>
                <boxGeometry args={[0.1, 0.8, 0.1]} />
                <meshStandardMaterial color="#8B4513" />
            </mesh>
            <mesh position={[0.2, -0.6, 0.4]}>
                <boxGeometry args={[0.1, 0.8, 0.1]} />
                <meshStandardMaterial color="#8B4513" />
            </mesh>
            <mesh position={[-0.2, -0.6, -0.4]}>
                <boxGeometry args={[0.1, 0.8, 0.1]} />
                <meshStandardMaterial color="#8B4513" />
            </mesh>
            <mesh position={[0.2, -0.6, -0.4]}>
                <boxGeometry args={[0.1, 0.8, 0.1]} />
                <meshStandardMaterial color="#8B4513" />
            </mesh>
            
            {/* Antlers */}
            <mesh position={[0, 1.1, 0.6]}>
                <cylinderGeometry args={[0.4, 0.1, 0.4]} />
                <meshStandardMaterial color="#D2B48C" /> {/* Tan */}
            </mesh>
        </group>
    )
}
