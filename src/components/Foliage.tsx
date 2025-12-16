import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'
import { extend, ReactThreeFiber } from '@react-three/fiber'
import { FOLIAGE_COUNT, generateFoliageData } from '../utils/tree-math'

// Custom Shader Material
const FoliageMaterial = shaderMaterial(
  {
    uTime: 0,
    uProgress: 0,
    uColor: new THREE.Color(0.0, 1.0, 0.0),
  },
  // Vertex Shader
  `
    uniform float uTime;
    uniform float uProgress;
    attribute vec3 aChaosPos;
    attribute vec3 aTargetPos;
    attribute vec3 aColor;
    varying vec3 vColor;
    
    // Simplex noise function (simplified)
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) {
      const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
      // First corner
      vec3 i  = floor(v + dot(v, C.yyy) );
      vec3 x0 = v - i + dot(i, C.xxx) ;
      // Other corners
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min( g.xyz, l.zxy );
      vec3 i2 = max( g.xyz, l.zxy );
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
      vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y
      // Permutations
      i = mod289(i);
      vec4 p = permute( permute( permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
      float n_ = 0.142857142857; // 1.0/7.0
      vec3  ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4( x.xy, y.xy );
      vec4 b1 = vec4( x.zw, y.zw );
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                    dot(p2,x2), dot(p3,x3) ) );
    }

    vec3 rotateY(vec3 v, float angle) {
      float s = sin(angle);
      float c = cos(angle);
      return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z);
    }

    void main() {
      vColor = aColor;
      
      // Calculate Normalized Height (t) from aTargetPos.y
      // Range approx -10 to 12. Let's map to 0..1
      float t = (aTargetPos.y + 10.0) / 22.0;
      t = clamp(t, 0.0, 1.0);
      
      // Stagger Logic
      // localP = uProgress * 2.5 - (1.5 - t * 1.5)
      float localP = uProgress * 2.5 - (1.5 - t * 1.5);
      localP = clamp(localP, 0.0, 1.0);
      
      // Interpolate position
      // Luxury transition: smoothstep for organic ease
      float ease = smoothstep(0.0, 1.0, localP);
      
      vec3 pos = mix(aChaosPos, aTargetPos, ease);
      
      // Spiral Effect during transition
      // When uProgress is 0 (chaos), angle is 0 (or random?). 
      // Actually we want them to spiral IN.
      // So at 0.5 they are twisted, at 1.0 they are aligned.
      // Let's twist based on (1.0 - ease)
      
      float twistStrength = (1.0 - ease) * 10.0; // 10 radians twist
      // Modulate twist by height to create vortex shape?
      // Or just simple rotation
      pos = rotateY(pos, twistStrength);
      
      // Add wind/noise
      float noiseVal = snoise(pos * 0.5 + uTime * 0.5);
      pos += noiseVal * 0.2 * ease; // Only apply wind when formed mostly
      
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = (10.0 * (1.0 + noiseVal * 0.5)) * (1.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // Fragment Shader
  `
    varying vec3 vColor;
    
    void main() {
      // Circular particle
      vec2 coord = gl_PointCoord - vec2(0.5);
      if(length(coord) > 0.5) discard;
      
      // Soft edge
      float strength = 1.0 - (length(coord) * 2.0);
      strength = pow(strength, 1.5);
      
      gl_FragColor = vec4(vColor * 2.0, 1.0); // Boost color for bloom
      // gl_FragColor.a *= strength; // If using transparency
    }
  `
)

extend({ FoliageMaterial })

declare global {
  namespace JSX {
    interface IntrinsicElements {
      foliageMaterial: ReactThreeFiber.Object3DNode<THREE.ShaderMaterial, typeof FoliageMaterial>
    }
  }
}

interface FoliageProps {
  progressRef: React.MutableRefObject<number>
  formed: boolean
}

export function Foliage({ progressRef, formed }: FoliageProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  
  const { chaosPositions, targetPositions, colors } = useMemo(() => generateFoliageData(FOLIAGE_COUNT), [])
  
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
      // Directly access ref to avoid React render cycle lag
      // Also remove the double-lerp, just use the value from Tree which is already lerped
      materialRef.current.uniforms.uProgress.value = progressRef.current
    }
  })
  
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={FOLIAGE_COUNT}
          array={targetPositions} // Initial position for bounding box
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aChaosPos"
          count={FOLIAGE_COUNT}
          array={chaosPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aTargetPos"
          count={FOLIAGE_COUNT}
          array={targetPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aColor"
          count={FOLIAGE_COUNT}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      {/* @ts-ignore */}
      <foliageMaterial ref={materialRef} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}
