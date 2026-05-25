'use client'

import { AlertOctagon, MoveRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGrowth } from '@/context/GrowthContext'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'

const PinkArrow = ({ position }: { position: string }) => {
  const isVertical = position === 'top' || position === 'bottom'
  return (
    <motion.div
      animate={isVertical ? { y: [0, -10, 0] } : { x: [0, 10, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      className={cn(
        "absolute z-[600] text-[#FF00E5] drop-shadow-[0_0_8px_#FF00E5]",
        position === 'right' && "-left-12 top-1/2 -translate-y-1/2 rotate-180",
        position === 'left' && "-right-12 top-1/2 -translate-y-1/2",
        position === 'bottom' && "left-1/2 -translate-x-1/2 -top-12 rotate-90",
        position === 'top' && "left-1/2 -translate-x-1/2 -bottom-12 -rotate-90"
      )}
    >
      <MoveRight className="text-4xl w-10 h-10" />
    </motion.div>
  )
}

const STEPS = [
  { 
    id: 'sidebar', 
    title: 'NEURAL_INDEX', 
    text: 'Access your goal canvas, brain notes, and achievements here.', 
    target: '.sidebar-target',
    position: 'right'
  },
  { 
    id: 'header', 
    title: 'TELEMETRY_SYNC', 
    text: 'Monitor your global goal progress and neural streak in real-time.', 
    target: '.header-target',
    position: 'bottom'
  },
  { 
    id: 'cells', 
    title: 'ENERGY_CORES', 
    text: 'Your goals manifest as liquid energy. Keep them filled to maintain peak performance.', 
    target: '.cells-target',
    position: 'top'
  }
]

export default function Tutorial() {
  const { tutorialActive, setTutorialActive, profile } = useGrowth()
  const [currentStep, setCurrentStep] = useState(0)
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (tutorialActive) {
      updateSpotlight()
      window.addEventListener('resize', updateSpotlight)
      return () => window.removeEventListener('resize', updateSpotlight)
    }
  }, [tutorialActive, currentStep])

  const updateSpotlight = () => {
    const target = document.querySelector(STEPS[currentStep].target)
    if (target) {
      setSpotlightRect(target.getBoundingClientRect())
    }
  }

  if (!tutorialActive) return null

  const finish = () => {
    setTutorialActive(false)
    if (profile) {
      localStorage.setItem(`tutorial_done_${profile.id}`, 'true')
      // First contact trigger logic can be handled in Shell or GrowthContext
      // For now, we signal completion
    }
  }

  const next = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      finish()
    }
  }

  return (
    <div className="fixed inset-0 z-[500] pointer-events-none">
       {/* Spotlight Mask */}
       <motion.div 
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         className="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-[2px] pointer-events-auto"
         style={{
           clipPath: spotlightRect 
             ? `polygon(0% 0%, 0% 100%, ${spotlightRect.left}px 100%, ${spotlightRect.left}px ${spotlightRect.top}px, ${spotlightRect.right}px ${spotlightRect.top}px, ${spotlightRect.right}px ${spotlightRect.bottom}px, ${spotlightRect.left}px ${spotlightRect.bottom}px, ${spotlightRect.left}px 100%, 100% 100%, 100% 0%)`
             : 'none'
         }}
       />

       <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              x: spotlightRect && (STEPS[currentStep].position === 'right' || STEPS[currentStep].position === 'left') ? 0 : '-50%',
              y: spotlightRect && (STEPS[currentStep].position === 'bottom' || STEPS[currentStep].position === 'top') ? 0 : '-50%'
            }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute w-full max-w-md p-8 glass-panel border-neon-green/30 pointer-events-auto shadow-[0_0_50px_rgba(57,255,20,0.1)] z-[700]"
          >
            <PinkArrow position={STEPS[currentStep].position} />
            <header className="flex justify-between items-center mb-6">
               <div className="flex items-center gap-3">
                 <AlertOctagon className="text-neon-green animate-pulse" />
                 <h3 className="text-2xl font-black font-space tracking-tighter text-primary uppercase">
                   {STEPS[currentStep].title}
                 </h3>
               </div>
               <span className="text-[10px] font-space text-foreground/40 font-black">STEP_0{currentStep + 1}</span>
            </header>

            <p className="text-xl font-space font-bold mb-10 text-foreground/80 leading-snug">
               "{STEPS[currentStep].text}"
            </p>

            <div className="flex justify-between items-center pt-6 border-t border-black/5 dark:border-white/5">
               <button 
                 onClick={finish}
                 className="text-[10px] font-space tracking-[0.3em] uppercase font-black text-foreground/20 hover:text-red-500 transition-colors"
               >
                 SKIP_PROTOCOL
               </button>
               
               <button 
                 onClick={next}
                 className="bg-neon-green text-[#131313] px-8 py-3 rounded-sm font-space text-[10px] tracking-widest uppercase font-black hover:scale-105 transition-all"
               >
                 {currentStep === STEPS.length - 1 ? 'INITIALIZE_HUD' : 'NEXT_STATION'}
               </button>
            </div>
         </motion.div>
       </AnimatePresence>
    </div>
  )
}
