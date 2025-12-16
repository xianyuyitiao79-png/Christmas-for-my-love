import { useState, useEffect } from 'react'

export function Countdown() {
  const [days, setDays] = useState(0)

  useEffect(() => {
    const calculateDays = () => {
      const now = new Date()
      // Target: January 1, 2026
      const target = new Date('2026-01-01T00:00:00')
      
      // Difference in milliseconds
      const diff = target.getTime() - now.getTime()
      
      // Convert to days (ceil to include the partial current day)
      const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24))
      
      setDays(Math.max(0, diffDays)) // Prevent negative if past date
    }

    calculateDays()
    
    // Update every minute to check for day change
    // Or simpler: just calculate once on mount if only days matter.
    // But user asked to "Update automatically when day changes".
    const timer = setInterval(calculateDays, 60000)
    
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="mt-4">
        <p className="text-2xl text-white/90 font-serif tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            <span className="text-[#D4AF37] font-bold text-3xl mr-2">{days}</span>
            Days Until We Meet
        </p>
    </div>
  )
}
