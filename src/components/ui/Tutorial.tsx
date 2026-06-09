'use client'

import { AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGrowth } from '@/context/GrowthContext'
import { cn } from '@/lib/utils'

const STEPS_EN = [
  { 
    id: 'sidebar', 
    title: 'Sidebar Navigation', 
    text: 'Access your Goals, Notes, Achievements, and Settings directly from this sidebar control hub.', 
    target: '.sidebar-target',
    position: 'right'
  },
  { 
    id: 'start-goal', 
    title: 'Start Here!', 
    text: 'This is your seeded welcome goal card. Click on it to open it and start tracking your first tasks!', 
    target: '.onboarding-start-goal',
    position: 'top'
  }
]

const STEPS_AR = [
  { 
    id: 'sidebar', 
    title: 'القائمة الجانبية للتحكم', 
    text: 'يمكنك الانتقال بسرعة بين الأهداف، الملاحظات، لوحة الإنجازات، وإعدادات الحساب الشخصي.', 
    target: '.sidebar-target',
    position: 'right'
  },
  { 
    id: 'start-goal', 
    title: 'ابدأ من هنا!', 
    text: 'هذا هو هدفك الترحيبي الأول المجهز لمساعدتك. اضغط على الكارت لفتحه واستعراض المهام التفاعلية الأولى!', 
    target: '.onboarding-start-goal',
    position: 'top'
  }
]

export default function Tutorial() {
  const { isTourActive, setIsTourActive, profile, isRTL, currentTheme } = useGrowth()
  const [currentStep, setCurrentStep] = useState(0)
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null)
  const [coords, setCoords] = useState({ top: 150, left: 200 })

  const steps = isRTL ? STEPS_AR : STEPS_EN

  useEffect(() => {
    if (isTourActive) {
      updateSpotlight()
      window.addEventListener('resize', updateSpotlight)
      window.addEventListener('scroll', updateSpotlight, true)
      return () => {
        window.removeEventListener('resize', updateSpotlight)
        window.removeEventListener('scroll', updateSpotlight, true)
      }
    }
  }, [isTourActive, currentStep])

  const updateSpotlight = () => {
    const activeSteps = isRTL ? STEPS_AR : STEPS_EN
    const target = document.querySelector(activeSteps[currentStep].target)
    if (target) {
      setSpotlightRect(target.getBoundingClientRect())
    } else {
      setSpotlightRect(null)
    }
  }

  useEffect(() => {
    if (spotlightRect && typeof window !== 'undefined') {
      const margin = window.innerWidth < 640 ? 16 : 24
      const popupWidth = Math.min(360, window.innerWidth - margin * 2)
      const popupHeight = 240
      
      let top = 0
      let left = 0
      
      const position = steps[currentStep].position
      
      if (position === 'right') {
        left = spotlightRect.right + margin
        top = spotlightRect.top + (spotlightRect.height - popupHeight) / 2
      } else if (position === 'left') {
        left = spotlightRect.left - popupWidth - margin
        top = spotlightRect.top + (spotlightRect.height - popupHeight) / 2
      } else if (position === 'bottom') {
        left = spotlightRect.left + (spotlightRect.width - popupWidth) / 2
        top = spotlightRect.bottom + margin
      } else { // top
        left = spotlightRect.left + (spotlightRect.width - popupWidth) / 2
        top = spotlightRect.top - popupHeight - margin
      }
      
      // Screen boundary clamps to prevent clipping
      left = Math.max(margin, Math.min(left, window.innerWidth - popupWidth - margin))
      top = Math.max(margin, Math.min(top, window.innerHeight - popupHeight - margin))
      
      setCoords({ top, left })
    }
  }, [spotlightRect, currentStep, isRTL])

  if (!isTourActive) return null

  const finish = () => {
    setIsTourActive(false)
    localStorage.setItem('tour_completed', 'true')
  }

  const next = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      finish()
    }
  }

  return (
    <div className="fixed inset-0 z-[500] pointer-events-none select-none">
       {/* High-quality Spotlight Mask */}
       <motion.div 
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         className="absolute inset-0 bg-black/60 backdrop-blur-[1px] pointer-events-auto transition-all"
         style={{
           clipPath: spotlightRect 
             ? `polygon(0% 0%, 0% 100%, ${spotlightRect.left}px 100%, ${spotlightRect.left}px ${spotlightRect.top}px, ${spotlightRect.right}px ${spotlightRect.top}px, ${spotlightRect.right}px ${spotlightRect.bottom}px, ${spotlightRect.left}px ${spotlightRect.bottom}px, ${spotlightRect.left}px 100%, 100% 100%, 100% 0%)`
             : 'none'
         }}
       />

       <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="absolute p-6 rounded-md border bg-zinc-950/95 border-white/10 text-white pointer-events-auto shadow-2xl z-[700] w-[calc(100vw-32px)] sm:w-[360px]"
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              boxShadow: `0 10px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1), 0 0 15px -3px ${currentTheme.color}20`
            }}
          >
            <header className="flex justify-between items-center mb-4">
               <div className="flex items-center gap-2">
                 <AlertCircle className="w-5 h-5" style={{ color: currentTheme.color }} />
                 <h3 className="text-sm font-bold font-space text-zinc-100">
                   {steps[currentStep].title}
                 </h3>
               </div>
               <span className="text-[10px] font-mono text-zinc-500 font-medium">
                 {isRTL ? `الخطوة ${currentStep + 1}/${steps.length}` : `Step ${currentStep + 1} of ${steps.length}`}
               </span>
            </header>

            <p className="text-xs text-zinc-300 leading-relaxed mb-6 font-medium">
               {steps[currentStep].text}
            </p>

            <div className="flex justify-between items-center pt-4 border-t border-white/5">
               <button 
                 onClick={finish}
                 className="text-[10px] font-space font-medium text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
               >
                 {isRTL ? 'تخطي' : 'Skip'}
               </button>
               
               <button 
                 onClick={next}
                 className="flex items-center gap-1.5 px-4 py-2 rounded-md text-black font-space text-[10px] font-medium hover:opacity-95 transition-all cursor-pointer"
                 style={{ backgroundColor: currentTheme.color }}
               >
                 <span>
                   {currentStep === steps.length - 1 
                     ? (isRTL ? 'فهمت!' : 'Got it') 
                     : (isRTL ? 'التالي' : 'Next')
                   }
                 </span>
                 {isRTL ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
               </button>
            </div>
         </motion.div>
       </AnimatePresence>
    </div>
  )
}
