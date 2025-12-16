import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const SNOW_COUNT = 3000
const SNOW_RANGE = 80 // Area size
const SNOW_HEIGHT = 80 // Fall height

export function Snow() {
  const pointsRef = useRef<THREE.Points>(null)
  
  // Generate static data
  const { positions, randoms, sizes } = useMemo(() => {
    const positions = new Float32Array(SNOW_COUNT * 3)
    const randoms = new Float32Array(SNOW_COUNT * 3) // x: drift speed, y: fall speed, z: offset
    const sizes = new Float32Array(SNOW_COUNT)
    
    for (let i = 0; i < SNOW_COUNT; i++) {
      // Random start positions
      positions[i * 3] = (Math.random() - 0.5) * SNOW_RANGE
      positions[i * 3 + 1] = (Math.random() - 0.5) * SNOW_HEIGHT + 20 // Start higher up
      positions[i * 3 + 2] = (Math.random() - 0.5) * SNOW_RANGE
      
      // Random properties
      randoms[i * 3] = Math.random() // drift
      randoms[i * 3 + 1] = Math.random() * 0.5 + 0.5 // speed (0.5 to 1.0)
      randoms[i * 3 + 2] = Math.random() * Math.PI * 2 // offset
      
      sizes[i] = Math.random() * 2.0 + 1.0 // Size variation
    }
    
    return { positions, randoms, sizes }
  }, [])
  
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#FFFFFF') }, // White
      uHeight: { value: SNOW_HEIGHT }
    },
    vertexShader: `
      uniform float uTime;
      uniform float uHeight;
      attribute vec3 aRandom; // x: drift, y: speed, z: offset
      attribute float aSize;
      
      varying float vAlpha;
      
      void main() {
        vec3 pos = position;
        
        // Fall animation
        float fallSpeed = aRandom.y * 5.0 + 2.0;
        float yOffset = mod(uTime * fallSpeed, uHeight);
        pos.y -= yOffset;
        
        // Wrap around
        if (pos.y < -uHeight/2.0) {
            pos.y += uHeight;
        }
        
        // Horizontal drift
        float driftFreq = aRandom.x * 2.0 + 1.0;
        float driftAmp = aRandom.x * 2.0 + 0.5;
        pos.x += sin(uTime * driftFreq + aRandom.z) * driftAmp;
        pos.z += cos(uTime * driftFreq * 0.8 + aRandom.z) * driftAmp;
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        
        // Size attenuation
        gl_PointSize = aSize * (300.0 / -mvPosition.z);
        
        // Soft edges based on depth? Or just random alpha
        vAlpha = 0.6 + 0.4 * sin(uTime + aRandom.z);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vAlpha;
      
      void main() {
        // Soft circle
        vec2 xy = gl_PointCoord.xy - vec2(0.5);
        float r = length(xy);
        if (r > 0.5) discard;
        
        // Soft edge
        float alpha = (0.5 - r) * 2.0;
        alpha = pow(alpha, 1.5); // Softer falloff
        
        gl_FragColor = vec4(uColor, alpha * vAlpha * 0.8);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }), [])

  useFrame((state) => {
    if (pointsRef.current) {
      material.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  return (
    <points ref={pointsRef} material={material}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={SNOW_COUNT}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={SNOW_COUNT}
          array={randoms}
          itemSize={3}
          args={[randoms, 3]}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={SNOW_COUNT}
          array={sizes}
          itemSize={1}
          args={[sizes, 1]}
        />
      </bufferGeometry>
    </points>
  )
}
