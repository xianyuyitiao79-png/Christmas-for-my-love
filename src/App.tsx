import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useState, useEffect } from 'react'
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, OrbitControls, PerspectiveCamera, Stars, Loader } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { Leva } from 'leva'
import * as THREE from 'three'
import { Tree } from './components/Tree'
import { Snow } from './components/Snow'
import { GestureController } from './components/GestureController'
import { MusicPlayer } from './components/MusicPlayer'
import { SantaSleigh } from './components/SantaSleigh'
import { Countdown } from './components/Countdown'
import { IntroGift } from './components/IntroGift'
import { CameraController } from './components/CameraController'
import { IntroSnow } from './components/IntroSnow'
import { useSpring, animated } from '@react-spring/three'

function App() {
  const [formed, setFormed] = useState(false)
  const [gestureRotation, setGestureRotation] = useState(0)
  
  // Intro State: 'waiting' | 'opening' | 'finished'
  const [introState, setIntroState] = useState<'waiting' | 'opening' | 'finished'>('waiting')

  const { treeScale } = useSpring({
    treeScale: introState === 'waiting' ? 0 : 1,
    config: { mass: 1, tension: 40, friction: 20 },
    delay: introState === 'opening' ? 1500 : 0 // Delayed until camera is inside
  })

  // Auto-form trigger (moved to after intro)
  useEffect(() => {
    if (introState === 'finished') {
        const t = setTimeout(() => setFormed(true), 1000)
        return () => clearTimeout(t)
    }
  }, [introState])

  const handleIntroOpen = () => {
    setIntroState('opening')
    // Cinematic timing: 
    // 0s: Click
    // 0.5s: Ribbon unties (handled in IntroGift)
    // 1.0s: Lid opens & Burst (handled in IntroGift)
    // 1.2s: Disintegration starts
    // 1.5s: Camera moves in (CameraController)
    // 4.0s: Fully dispersed & Camera inside, switch to finished
    setTimeout(() => {
        setIntroState('finished')
    }, 4000)
  }

  const handleGesture = (action: 'Assemble' | 'Disperse' | null) => {
    if (action === 'Assemble') {
      setFormed(true)
    } else if (action === 'Disperse') {
      setFormed(false)
    }
  }

  const handleRotate = (rotation: number) => {
    setGestureRotation(rotation)
  }

  return (
    <>
      <Leva hidden />
      <Loader /> {/* Loading Screen */}
      <GestureController 
        onGesture={handleGesture} 
        onRotate={handleRotate} 
      />
      <MusicPlayer />
      
      <Canvas dpr={[1, 1.5]}>
        <color attach="background" args={['#050505']} />
        
        {/* Intro Snow Effect */}
        {introState !== 'finished' ? (
           <IntroSnow />
        ) : (
           <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        )}

        <Suspense fallback={null}>
          <CameraController introState={introState} />
          
          <ambientLight intensity={0.2} />
          {/* Only show bright environment when finished, or keep it dim? Let's use it for reflections but hidden bg */}
          <Environment preset="lobby" background={false} />
          
          {introState !== 'finished' && (
              <IntroGift onOpen={handleIntroOpen} />
          )}
          
          {introState !== 'waiting' && (
             <animated.group scale={treeScale}>
                <SantaSleigh />
                <Snow />
                <Tree 
                    formed={formed} 
                    onToggle={() => setFormed(s => !s)} 
                    gestureRotation={gestureRotation}
                />
             </animated.group>
          )}

          <EffectComposer>
            <Bloom luminanceThreshold={0.8} mipmapBlur intensity={1.2} radius={0.4} />
          </EffectComposer>
          
          <OrbitControls 
            enableRotate={introState === 'finished'} 
            enableZoom={introState === 'finished'} 
            enablePan={false} 
          />
        </Suspense>
      </Canvas>
      
      {/* UI Elements - Only show after intro or fade them in? Let's show them after finished */}
      <div 
        className={`absolute top-0 left-0 w-full p-8 pointer-events-none text-white font-serif z-10 flex justify-between items-start transition-opacity duration-1000 ${introState === 'finished' ? 'opacity-100' : 'opacity-0'}`}
      >
        <div>
          <h1 className="text-4xl font-bold text-[#D4AF37] drop-shadow-[0_0_10px_rgba(212,175,55,0.8)]">
            MERRY CHRISTMAS
          </h1>
          <Countdown />
        </div>
        
        <button 
          className="pointer-events-auto group relative px-8 py-3 rounded-full border border-[#D4AF37]/50 bg-black/40 backdrop-blur-xl text-[#D4AF37] font-serif text-lg tracking-widest uppercase hover:bg-[#D4AF37]/10 hover:border-[#D4AF37] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all duration-500 overflow-hidden"
          onClick={() => setFormed(s => !s)}
        >
          <span className="relative z-10">{formed ? 'Disperse Tree' : 'Assemble Tree'}</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
        </button>
      </div>
    </>
  )
}

export default App
