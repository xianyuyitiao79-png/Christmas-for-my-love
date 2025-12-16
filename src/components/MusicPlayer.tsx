import { useState, useRef, useEffect } from 'react'

export function MusicPlayer() {
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(0.5)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (audioRef.current) {
      if (playing) {
        audioRef.current.play().catch(e => console.error("Playback failed", e))
      } else {
        audioRef.current.pause()
      }
    }
  }, [playing])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  return (
    <div className="fixed bottom-8 left-8 z-50 flex items-center gap-4 p-4 rounded-2xl border border-[#D4AF37]/30 bg-black/40 backdrop-blur-xl shadow-[0_0_20px_rgba(0,0,0,0.3)]">
      {/* Audio Element */}
      <audio ref={audioRef} src="/music.mp3" loop preload="auto" />

      {/* Play/Pause Button */}
      <button
        onClick={() => setPlaying(!playing)}
        className="group relative w-12 h-12 flex items-center justify-center rounded-full border border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-all duration-300"
      >
        {playing ? (
           // Pause Icon
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
             <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
           </svg>
        ) : (
           // Play Icon
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 ml-1">
             <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
           </svg>
        )}
        <div className="absolute inset-0 rounded-full ring-1 ring-[#D4AF37] opacity-50 group-hover:scale-110 transition-transform duration-500" />
      </button>

      {/* Volume Control */}
      <div className="flex flex-col gap-1 w-24">
        <span className="text-[10px] text-[#D4AF37] font-serif tracking-widest uppercase opacity-80">
            Volume
        </span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-full h-1 bg-[#D4AF37]/30 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#D4AF37] hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
        />
      </div>
    </div>
  )
}
