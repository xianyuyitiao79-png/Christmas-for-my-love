import * as THREE from 'three'
import { inSphere } from 'maath/random'

// Adjusted for Height : Base Diameter = 44 : 28 ≈ 1.57 : 1 (Fatter)
export const TREE_HEIGHT = 44
export const TREE_RADIUS = 14
export const FOLIAGE_COUNT = 45000 // Slightly increased again for volume
export const ORNAMENT_COUNT = 2800 // Doubled from 1400
export const TIER_COUNT = 7

// Advanced Tree Geometry
// Returns a point inside the segmented cone volume
function randomPointInTree(height: number, radius: number, out: THREE.Vector3) {
  // 1. Pick a random height (biased towards bottom for volume density)
  // PDF(y) ~ (1-y/H) approx, or just uniform for foliage is fine, 
  // but for realistic volume we want more points at bottom.
  // Let's use simple uniform y for now, but reject some to shape density?
  // Or just uniform y and let radius define volume.
  
  const y = Math.random() * height
  const normalizedH = y / height
  
  // 2. Global Envelope: r(h) = r_base * (1 - h/H)^alpha
  const alpha = 1.1 // User requested [0.8, 1.2]
  const globalRadius = radius * Math.pow(1 - normalizedH, alpha)
  
  // 3. Tier Logic (Segmented Cone)
  // We want 5 distinct tiers.
  // We modulate the radius to create "flares"
  // Tier phase goes from 0 to 1 within each tier
  const tierPhase = (normalizedH * TIER_COUNT) % 1 
  
  // Sawtooth-like modifier: Wide at bottom of tier (phase=0), narrower at top (phase=1)
  // Sharper cut:
  // Use a more aggressive curve to define the "under-cut" of branches
  // 0 -> 1.0 (Full radius)
  // 1 -> 0.4 (Deep indent)
  const tierFactor = 0.4 + 0.6 * Math.pow(1 - tierPhase, 1.2)
  
  const finalMaxRadius = globalRadius * tierFactor
  
  // 4. Random Point Distribution (Branch Bias)
  const angle = Math.random() * Math.PI * 2
  
  // Bias r towards finalMaxRadius to fill "branches" not core
  // Use r = R * (0.2 + 0.8 * sqrt(random))
  // This pushes 80% of points to the outer 80% of radius
  const rBias = 0.2 + 0.8 * Math.sqrt(Math.random())
  const r = rBias * finalMaxRadius
  
  const x = Math.cos(angle) * r
  const z = Math.sin(angle) * r
  
  // Center vertically
  out.set(x, y - height / 2, z)
  return out
}

// Helper for surface points (for ornaments)
function randomPointOnTreeSurface(height: number, radius: number, out: THREE.Vector3) {
  const y = Math.random() * height
  const normalizedH = y / height
  
  // Density decreases with height
  if (Math.random() > (1 - normalizedH * 0.7)) {
     return randomPointOnTreeSurface(height, radius, out)
  }

  const alpha = 1.1
  const globalRadius = radius * Math.pow(1 - normalizedH, alpha)
  const tierPhase = (normalizedH * TIER_COUNT) % 1
  const tierFactor = 0.4 + 0.6 * Math.pow(1 - tierPhase, 1.2)
  const finalMaxRadius = globalRadius * tierFactor
  
  const angle = Math.random() * Math.PI * 2
  // Surface bias: 0.85 to 1.0 (strict surface)
  const r = finalMaxRadius * (0.9 + 0.1 * Math.random())
  
  const x = Math.cos(angle) * r
  const z = Math.sin(angle) * r
  
  out.set(x, y - height / 2, z)
  return out
}

export function generateFoliageData(count: number) {
  const chaosPositions = new Float32Array(count * 3)
  const targetPositions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  
  const temp = new THREE.Vector3()
  const color = new THREE.Color()
  
  // Chaos: Random in sphere
  const sphereData = inSphere(new Float32Array(count * 3), { radius: 35 }) as Float32Array
  
  for (let i = 0; i < count; i++) {
    // Chaos
    chaosPositions[i * 3] = sphereData[i * 3]
    chaosPositions[i * 3 + 1] = sphereData[i * 3 + 1]
    chaosPositions[i * 3 + 2] = sphereData[i * 3 + 2]
    
    // Target: Segmented Tree
    randomPointInTree(TREE_HEIGHT, TREE_RADIUS, temp)
    targetPositions[i * 3] = temp.x
    targetPositions[i * 3 + 1] = temp.y
    targetPositions[i * 3 + 2] = temp.z
    
    // Color: Mix of Deep Emerald Greens and some Gold highlights
    if (Math.random() > 0.95) {
      // Gold highlight (less frequent but brighter)
      color.setHex(0xFFD700).lerp(new THREE.Color(0xFFAA00), Math.random())
    } else {
      // Deep Emerald Green
      // Darker at bottom? 
      const normalizedH = (temp.y + TREE_HEIGHT/2) / TREE_HEIGHT
      const baseGreen = new THREE.Color(0x004020)
      // Lighter at tips/top?
      baseGreen.lerp(new THREE.Color(0x006030), normalizedH * 0.5 + Math.random() * 0.5)
      color.copy(baseGreen)
    }
    
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }
  
  return { chaosPositions, targetPositions, colors }
}

export function generatePhotoData(count: number) {
  const data: { chaosPos: THREE.Vector3, targetPos: THREE.Vector3, id: number }[] = []
  
  for (let i = 0; i < count; i++) {
    // Chaos
    const chaosPos = new THREE.Vector3(
      (Math.random() - 0.5) * 50,
      (Math.random() - 0.5) * 50,
      (Math.random() - 0.5) * 50
    )
    
    // Target: Distribute helically or randomly on surface
    const targetPos = new THREE.Vector3()
    
    // We want photos to be clearly visible, maybe spiraling up the tree
    // Height from bottom to 80% up
    const y = (i / count) * (TREE_HEIGHT * 0.8)
    const normalizedH = y / TREE_HEIGHT
    
    // Calculate radius at this height (outer surface)
    const alpha = 1.1
    const globalRadius = TREE_RADIUS * Math.pow(1 - normalizedH, alpha)
    // Push out slightly more than foliage to float
    // Reduced offset: was + 2.0, now + 1.0 to be closer
    const r = globalRadius + 1.0 
    
    // Golden angle spiral
    const angle = i * 2.4 // roughly 137.5 degrees in radians
    
    const x = Math.cos(angle) * r
    const z = Math.sin(angle) * r
    
    targetPos.set(x, y - TREE_HEIGHT/2, z)
    
    data.push({ chaosPos, targetPos, id: i + 1 })
  }
  
  return data
}

export type OrnamentType = 'box' | 'ball' | 'light' | 'star'

export function generateOrnamentData(count: number) {
  const data: { chaosPos: THREE.Vector3, targetPos: THREE.Vector3, type: OrnamentType, color: THREE.Color }[] = []
  
  // 1. Add THE STAR (Top Vertex)
  // y = 0.95H ~ 1.0H
  // Note: We handle the Star in a separate component now, but we can keep a placeholder or just ignore it here.
  // Actually, let's REMOVE it from here so it doesn't render as a ball.
  // Ornaments component filters by type, so if we don't push 'star' type, it won't be in the instanced mesh.
  // We will NOT add the star to this data array. The Star component will handle itself.
  
  // 2. Add other ornaments
  for (let i = 0; i < count; i++) {
    // Chaos
    const chaosPos = new THREE.Vector3(
      (Math.random() - 0.5) * 60,
      (Math.random() - 0.5) * 60,
      (Math.random() - 0.5) * 60
    )
    
    const targetPos = new THREE.Vector3()
    randomPointOnTreeSurface(TREE_HEIGHT, TREE_RADIUS, targetPos)
    
    const rand = Math.random()
    let type: OrnamentType = 'ball'
    let col = new THREE.Color()
    
    if (rand < 0.15) {
      type = 'box' // Heavy
      col.setHex(0x8B0000) // Red
      if(Math.random() > 0.6) col.setHex(0xFFD700)
    } else if (rand < 0.6) {
      type = 'ball' // Medium
      col.setHex(0xFF0000)
      if(Math.random() > 0.4) col.setHex(0xFFD700) // Gold
      if(Math.random() > 0.7) col.setHex(0xE0E0E0) // Silver
    } else {
      type = 'light' // Light
      col.setHex(0xFFFFE0) // Warm light
    }
    
    data.push({ chaosPos, targetPos, type, color: col })
  }
  
  return data
}
