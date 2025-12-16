import { useEffect, useRef, useState } from 'react'
import { GestureRecognizer, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision'

interface GestureControllerProps {
  onGesture: (action: 'Assemble' | 'Disperse' | null) => void
  onRotate: (rotation: number) => void // -1 to 1
}

export function GestureController({ onGesture, onRotate }: GestureControllerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [recognizer, setRecognizer] = useState<GestureRecognizer | null>(null)
  const [webcamRunning, setWebcamRunning] = useState(false)
  const requestRef = useRef<number>(0)

  // 1. Initialize Recognizer
  useEffect(() => {
    const init = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
      )
      
      const gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 2 // Enable 2 hands
      })
      
      setRecognizer(gestureRecognizer)
    }
    
    init()
  }, [])

  // 2. Enable Webcam
  useEffect(() => {
    if (!recognizer) return

    const enableCam = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 320, height: 240 } // Low res for performance
          })
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            videoRef.current.addEventListener('loadeddata', predictWebcam)
            setWebcamRunning(true)
          }
        } catch (err) {
          console.error('Webcam error:', err)
        }
      }
    }

    enableCam()
    
    return () => {
       // Cleanup stream
       if (videoRef.current && videoRef.current.srcObject) {
         const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
         tracks.forEach(t => t.stop())
       }
       cancelAnimationFrame(requestRef.current)
    }
  }, [recognizer])

  // 3. Prediction Loop
  const predictWebcam = () => {
    if (!videoRef.current || !canvasRef.current || !recognizer) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    if (video.readyState === 4) { // ENOUGH_DATA
        // Resize canvas to match video
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        
        // Detect
        const results = recognizer.recognizeForVideo(video, Date.now())
        
        // Draw
        if (ctx) {
            ctx.save()
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            
            // Draw video frame (optional, maybe mirror it)
            // ctx.scale(-1, 1)
            // ctx.translate(-canvas.width, 0)
            // ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            
            // Draw landmarks
            if (results.landmarks) {
                const drawingUtils = new DrawingUtils(ctx)
                for (const landmarks of results.landmarks) {
                    drawingUtils.drawConnectors(landmarks, GestureRecognizer.HAND_CONNECTIONS, {
                        color: '#00FF00',
                        lineWidth: 2
                    })
                    drawingUtils.drawLandmarks(landmarks, {
                        color: '#FF0000',
                        lineWidth: 1
                    })
                }
            }
            ctx.restore()
        }

        // Handle Gestures
        let action: 'Assemble' | 'Disperse' | null = null
        let rotation = 0

        if (results.handedness.length > 0) {
            for (let i = 0; i < results.handedness.length; i++) {
                const hand = results.handedness[i][0]
                const gesture = results.gestures[i][0]
                const landmarks = results.landmarks[i]
                
                // MediaPipe Handedness: "Left" usually means actor's Left hand (Right side of screen in selfie)
                const isLeft = hand.categoryName === 'Left'
                const isRight = hand.categoryName === 'Right'
                
                if (isLeft) {
                    // Left Hand: Assemble/Disperse (Fist/Palm)
                    if (gesture.categoryName === 'Closed_Fist') {
                        action = 'Assemble'
                    } else if (gesture.categoryName === 'Open_Palm') {
                        action = 'Disperse'
                    }
                }
                
                if (isRight) {
                    // Right Hand: Rotation via Tilt
                    
                    const wrist = landmarks[0]
                    const tip = landmarks[12] // Middle finger tip
                    
                    const dx = tip.x - wrist.x
                    const threshold = 0.05
                    const gain = 3.0
                    
                    if (Math.abs(dx) > threshold) {
                         // dx negative -> Rotate Left (Positive)
                         // dx positive -> Rotate Right (Negative)
                         rotation = -(dx * gain)
                         rotation = Math.max(-1, Math.min(1, rotation))
                    }
                }
            }
        }
        
        onGesture(action)
        onRotate(rotation)
    }

    requestRef.current = requestAnimationFrame(predictWebcam)
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end pointer-events-none">
      <div className="bg-black/50 p-2 rounded-lg backdrop-blur-sm border border-gold/30">
        <h3 className="text-white text-xs mb-1 font-mono text-center">Gesture Control</h3>
        <div className="relative w-32 h-24 bg-black/80 rounded overflow-hidden">
            <video 
                ref={videoRef} 
                className="absolute top-0 left-0 w-full h-full object-cover opacity-50 -scale-x-100" 
                autoPlay 
                playsInline 
                muted
            />
            <canvas 
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full object-cover -scale-x-100"
            />
        </div>
        <div className="text-[10px] text-gray-300 mt-1 space-y-1">
            <p>Left Hand (Scale):</p>
            <p className="pl-2">✊ Fist: <span className="text-red-400">Assemble</span></p>
            <p className="pl-2">🖐 Palm: <span className="text-emerald-400">Disperse</span></p>
            <div className="h-1" />
            <p>Right Hand (Rotate):</p>
            <p className="pl-2">👋 Tilt L/R: <span className="text-blue-400">Spin</span></p>
        </div>
      </div>
    </div>
  )
}
