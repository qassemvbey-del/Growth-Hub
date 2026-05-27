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

const STEPS_EN = [
  { 
    id: 'sidebar', 
    title: 'NAVIGATION INDEX', 
    text: 'Access your goal canvas, brain notes, achievements, and settings directly from this sidebar control hub.', 
    target: '.sidebar-target',
    position: 'right'
  },
  { 
    id: 'header', 
    title: 'TELEMETRY STATUS', 
    text: 'Monitor your real-time XP accumulation, streak counter, and current system sync status at a glance.', 
    target: '.header-target',
    position: 'bottom'
  },
  { 
    id: 'cells', 
    title: 'PINNED TARGETS', 
    text: 'Your most important active goals are locked in this grid. Tap any target to complete tasks and earn XP.', 
    target: '.cells-target',
    position: 'top'
  }
]

const STEPS_AR = [
  { 
    id: 'sidebar', 
    title: 'مؤشر التنقل الرئيسي', 
    text: 'من هنا يمكنك الوصول إلى لوحة الأهداف، الملاحظات الذكية، الإنجازات وإعدادات الحساب بسهولة.', 
    target: '.sidebar-target',
    position: 'right'
  },
  { 
    id: 'header', 
    title: 'لوحة القياسات الحية', 
    text: 'راقب مستوى نقاط الخبرة (XP)، عداد الأيام المتتالية المشتعل، وحالة التزامن المباشر في الوقت الفعلي.', 
    target: '.header-target',
    position: 'bottom'
  },
  { 
    id: 'cells', 
    title: 'مصفوفة الأهداف المثبتة', 
    text: 'هنا تظهر أهدافك الرئيسية كخلايا طاقة. اضغط على أي هدف لمشاهدة المهام وإكمالها لترقية مستواك.', 
    target: '.cells-target',
    position: 'top'
  }
]

export default function Tutorial() {
  const { tutorialActive, setTutorialActive, profile, isRTL } = useGrowth()
  const [currentStep, setCurrentStep] = useState(0)
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null)

  const steps = isRTL ? STEPS_AR : STEPS_EN

  useEffect(() => {
    if (tutorialActive) {
      updateSpotlight()
      window.addEventListener('resize', updateSpotlight)
      return () => window.removeEventListener('resize', updateSpotlight)
    }
  }, [tutorialActive, currentStep])

  const updateSpotlight = () => {
    const activeSteps = isRTL ? STEPS_AR : STEPS_EN
    const target = document.querySelector(activeSteps[currentStep].target)
    if (target) {
      setSpotlightRect(target.getBoundingClientRect())
    }
  }

  if (!tutorialActive) return null

  const finish = () => {
    setTutorialActive(false)
    if (profile) {
      localStorage.setItem(`tutorial_done_${profile.id}`, 'true')
    }
  }

  const next = () => {
    if (currentStep < steps.length - 1) {
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
              x: spotlightRect && (steps[currentStep].position === 'right' || steps[currentStep].position === 'left') ? 0 : '-50%',
              y: spotlightRect && (steps[currentStep].position === 'bottom' || steps[currentStep].position === 'top') ? 0 : '-50%'
            }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute w-full max-w-md p-8 glass-panel border-neon-green/30 pointer-events-auto shadow-[0_0_50px_rgba(57,255,20,0.1)] z-[700]"
          >
            <PinkArrow position={steps[currentStep].position} />
            <header className="flex justify-between items-center mb-6">
               <div className="flex items-center gap-3">
                 <AlertOctagon className="text-neon-green animate-pulse" />
                 <h3 className="text-2xl font-black font-space tracking-tighter text-primary uppercase">
                   {steps[currentStep].title}
                 </h3>
               </div>
               <span className="text-[10px] font-space text-foreground/40 font-black">
                 {isRTL ? `الخطوة 0${currentStep + 1}` : `STEP_0${currentStep + 1}`}
               </span>
            </header>

            <p className="text-xl font-space font-bold mb-10 text-foreground/80 leading-snug">
               "{steps[currentStep].text}"
            </p>

            <div className="flex justify-between items-center pt-6 border-t border-black/5 dark:border-white/5">
               <button 
                 onClick={finish}
                 className="text-[10px] font-space tracking-[0.3em] uppercase font-black text-foreground/20 hover:text-red-500 transition-colors cursor-pointer"
               >
                 {isRTL ? 'تخطي الجولة' : 'SKIP_TUTORIAL'}
               </button>
               
               <button 
                 onClick={next}
                 className="bg-neon-green text-[#131313] px-8 py-3 rounded-sm font-space text-[10px] tracking-widest uppercase font-black hover:scale-105 transition-all cursor-pointer"
               >
                 {currentStep === steps.length - 1 
                   ? (isRTL ? 'ابدأ الاستخدام' : 'INITIALIZE_HUD') 
                   : (isRTL ? 'الخطوة التالية' : 'NEXT_STATION')
                 }
               </button>
            </div>
         </motion.div>
       </AnimatePresence>
    </div>
  )
}
