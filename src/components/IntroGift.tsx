import { useRef, useState, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSpring, animated } from '@react-spring/three'
import { Sparkles, Text, Float } from '@react-three/drei'
import { DisintegrationEffect } from './DisintegrationEffect'

interface IntroGiftProps {
  onOpen: () => void
}

export function IntroGift({ onOpen }: IntroGiftProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExploding, setIsExploding] = useState(false)
  const groupRef = useRef<THREE.Group>(null)
  const textRef = useRef<THREE.Group>(null)
  
  // Dense geometries for explosion
  const boxGeo = useMemo(() => new THREE.BoxGeometry(5, 5, 5, 16, 16, 16), [])
  const lidGeo = useMemo(() => new THREE.BoxGeometry(5.2, 0.5, 5.2, 16, 2, 16), [])
  
  // Spring animation
  const { lidRotation, scale, emergeY, ribbonScale, lidLift, explosionProgress } = useSpring({
    lidRotation: isOpen ? -Math.PI / 1.1 : 0,
    lidLift: isOpen ? 0 : 0.1, 
    scale: isOpen ? 1 : 1, // Don't scale up massive anymore, let it explode
    emergeY: 0, 
    ribbonScale: isOpen ? 0 : 1,
    explosionProgress: isExploding ? 1 : 0,
    from: { emergeY: -10 },
    config: (key) => {
        if (key === 'lidRotation') return { mass: 1, tension: 60, friction: 18, delay: 500 }
        if (key === 'ribbonScale') return { duration: 400 }
        if (key === 'explosionProgress') return { duration: 2500 } // Slow explosion
        if (key === 'emergeY') return { duration: 2000 }
        return { mass: 1, tension: 170, friction: 26 }
    },
    onStart: () => {
        if (isOpen) onOpen()
    }
  })

  // Trigger explosion after lid opens
  useEffect(() => {
    if (isOpen) {
        const t = setTimeout(() => setIsExploding(true), 1200) // Wait for lid to open & burst
        return () => clearTimeout(t)
    }
  }, [isOpen])

  const handleClick = (e: any) => {
    e.stopPropagation()
    if (isOpen) return
    setIsOpen(true)
  }

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const yBob = Math.sin(t * 1.0) * 0.2 + emergeY.get() 
    
    // Animate Box (only if not exploding yet)
    if (groupRef.current && !isExploding) {
        groupRef.current.position.y = yBob
        groupRef.current.rotation.y = Math.sin(t * 0.2) * 0.1 + t * 0.1
        groupRef.current.rotation.x = Math.sin(t * 0.5) * 0.05
        groupRef.current.rotation.z = Math.cos(t * 0.3) * 0.05
    }
    
    // Animate Text
    if (textRef.current) {
        textRef.current.position.y = yBob
        // Fade out text when exploding
        if (isExploding) {
            textRef.current.visible = false
        }
    }
  })
  
  // Luxury Material Props
  // Re-create materials on every render if needed or keep memo. 
  // IMPORTANT: StandardMaterial needs lights to be visible!
  const goldMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#FFD700",
    metalness: 1.0,
    roughness: 0.15,
    envMapIntensity: 2.5,
  }), [])
  
  const velvetMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#800000", // Darker red
    roughness: 0.9,
    metalness: 0.1,
    emissive: "#300000",
    emissiveIntensity: 0.2
  }), [])

  return (
    <group>
        {/* Floating Text - Particle Style */}
        <animated.group ref={textRef} position-y={emergeY}>
           {!isOpen && (
             <group position={[0, -1.5, 3]}>
                <Float speed={2} rotationIntensity={0} floatIntensity={0.5}>
                    <Text 
                        fontSize={1.5} // Even Bigger
                        anchorX="center" 
                        anchorY="middle"
                        letterSpacing={0.15}
                        // font="/fonts/Inter-Bold.woff" // Removed to fix loading issue
                    >
                        FOR MY LOVE
                        <meshStandardMaterial 
                            color="#FFD700" 
                            toneMapped={false}
                            emissive="#FFD700"
                            emissiveIntensity={2}
                        />
                    </Text>
                    {/* Add sparkles around text to simulate particle formation */}
                    <Sparkles count={80} scale={[8, 1.5, 0.5]} size={4} speed={0.4} opacity={0.6} color="#FFD700" />
                </Float>
             </group>
           )}
        </animated.group>

        {/* EXPLOSION PARTICLES (Rendered when isExploding is true) */}
        {isExploding && (
           <group position={[0, 0, 0]}> 
             {/* Note: We need to match the last known position/rotation of the box
                 Ideally we would lerp, but since it's an explosion, starting from 0,0,0 + yBob offset is close enough
                 or we can pass the animated values.
                 But React Spring values are objects.
                 Let's just position them at 0, 2.5, 0 (base) roughly.
                 For precision, we'd need to freeze the rotation.
                 Let's assume the box is roughly center.
             */}
             <DisintegrationEffect 
                geometry={boxGeo} 
                progress={explosionProgress.get()} 
                position={[0, 2.5, 0]}
                color="#FFD700"
             />
             {/* Lid Explosion - Harder to position perfectly due to rotation
                 We can wrap it in the same animated group logic?
             */}
           </group>
        )}

        {/* SOLID BOX (Hidden when exploding) */}
        <animated.group 
            ref={groupRef} 
            onClick={handleClick} 
            position-y={emergeY}
            scale={scale}
            visible={!isExploding}
        >
      {/* Light Burst and Particles */}
      {isOpen && (
        <group position={[0, 2.5, 0]}>
           <pointLight color="#ffdd00" intensity={50} distance={60} decay={2} />
           <Sparkles count={200} scale={6} size={10} speed={2} color="#FFD700" />
           <Sparkles count={100} scale={8} size={20} speed={1} color="#FFFFFF" />
           <mesh>
             <sphereGeometry args={[0.8, 32, 32]} />
             <meshBasicMaterial color="#FFD700" transparent opacity={0.8} side={THREE.BackSide} />
           </mesh>
        </group>
      )}
      
      {/* Light Leak (Internal Glow) - Stronger */}
      {!isOpen && (
          <>
            <pointLight position={[0, 2.5, 0]} intensity={5} color="#FFAA00" distance={8} decay={2} />
            {/* God Rays / Volumetric Glow Mesh REMOVED */}
          </>
      )}

      {/* Box Base - Golden */}
      <mesh position={[0, 2.5, 0]} castShadow receiveShadow material={goldMaterial}>
        <boxGeometry args={[5, 5, 5]} />
      </mesh>
      
      {/* Ribbon Vertical - Red Velvet */}
      <mesh position={[0, 2.5, 0]} material={velvetMaterial}>
        <boxGeometry args={[5.05, 5, 1]} />
      </mesh>
      <mesh position={[0, 2.5, 0]} material={velvetMaterial}>
        <boxGeometry args={[1, 5, 5.05]} />
      </mesh>

      {/* Lid Group */}
      <animated.group 
        position-x={0}
        position-z={-2.5}
        // @ts-ignore
        position-y={lidLift.to(l => 5 + l)} // Lift slightly for leak
        rotation-x={lidRotation}
      >
          {/* Lid Geometry */}
          <group position={[0, 0.25, 2.5]}>
            <mesh castShadow receiveShadow material={goldMaterial}>
                <boxGeometry args={[5.2, 0.5, 5.2]} />
            </mesh>
            {/* Lid Ribbon */}
            <mesh material={velvetMaterial}>
                <boxGeometry args={[5.25, 0.55, 1]} />
            </mesh>
            <mesh material={velvetMaterial}>
                <boxGeometry args={[1, 0.55, 5.25]} />
            </mesh>
            
            {/* Bow Knot - Animated scale to untie */}
            <animated.group position={[0, 0.5, 0]} scale={ribbonScale}>
                <mesh rotation={[0, 0, Math.PI/4]} material={velvetMaterial}>
                    <torusGeometry args={[0.8, 0.2, 16, 32]} />
                </mesh>
                <mesh rotation={[0, 0, -Math.PI/4]} material={velvetMaterial}>
                    <torusGeometry args={[0.8, 0.2, 16, 32]} />
                </mesh>
            </animated.group>
          </group>
      </animated.group>
      
    </animated.group>
    </group>
  )
}
