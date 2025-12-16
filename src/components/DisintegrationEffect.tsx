import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface DisintegrationEffectProps {
  geometry: THREE.BufferGeometry
  color?: string
  progress: number // 0 to 1
  scale?: [number, number, number]
  position?: [number, number, number]
  rotation?: [number, number, number]
}

export function DisintegrationEffect({ 
  geometry, 
  color = "#FFD700", 
  progress,
  scale = [1, 1, 1],
  position = [0, 0, 0],
  rotation = [0, 0, 0]
}: DisintegrationEffectProps) {
  const shaderRef = useRef<THREE.ShaderMaterial>(null)

  // Create dense points from geometry
  const particles = useMemo(() => {
    // Clone and ensure we have enough density
    // For a BoxGeometry, we might want to sample points on surface or just use vertices if dense enough
    // Let's assume the passed geometry is dense enough or we sample it
    
    // Actually, sampling is better for uniform distribution
    const sampler = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial())
    // We can't easily use MeshSurfaceSampler here without importing it.
    // Let's just use the vertices of a high-segment geometry passed in.
    
    return geometry
  }, [geometry])

  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uColor: { value: new THREE.Color(color) }
    },
    vertexShader: `
      uniform float uTime;
      uniform float uProgress;
      attribute vec3 aRandom;
      
      varying float vAlpha;
      
      // Simplex Noise
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
      float snoise(vec3 v) {
        const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy) );
        vec3 x0 = v - i + dot(i, C.xxx) ;
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute( permute( permute(
                  i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
        float n_ = 0.142857142857;
        vec3  ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );
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

      void main() {
        vec3 pos = position;
        
        // Explosion Logic
        float n = snoise(pos * 0.5 + uTime * 0.5);
        vec3 dir = normalize(pos + vec3(n));
        
        // Explode outward based on progress
        // Non-linear ease for "pop"
        float p = uProgress;
        
        pos += dir * p * 15.0; // Fly far
        pos += vec3(0.0, p * 5.0, 0.0); // Drift up
        
        // Noise distortion
        pos.x += sin(uTime * 5.0 + pos.y) * 0.2 * p;
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        
        // Size attenuation
        gl_PointSize = (4.0 - p * 3.0) * (100.0 / -mvPosition.z);
        
        // Fade out
        vAlpha = 1.0 - smoothstep(0.0, 0.8, p);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vAlpha;
      
      void main() {
        if (vAlpha <= 0.01) discard;
        
        // Soft circle
        vec2 xy = gl_PointCoord.xy - vec2(0.5);
        float r = length(xy);
        if (r > 0.5) discard;
        
        gl_FragColor = vec4(uColor, vAlpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }), [color])

  useFrame((state) => {
    if (shaderRef.current) {
        shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime
        shaderRef.current.uniforms.uProgress.value = progress
    }
  })

  return (
    <points 
        scale={scale} 
        position={position} 
        rotation={rotation}
    >
        <primitive object={particles} attach="geometry" />
        <primitive object={material} attach="material" ref={shaderRef} />
    </points>
  )
}