'use client'

import { Info, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGrowth } from '@/context/GrowthContext'
import { cn } from '@/lib/utils'

interface InlineGuideTipProps {
  hasTasks: boolean
}

export default function InlineGuideTip({ hasTasks }: InlineGuideTipProps) {
  const { currentTheme, isRTL } = useGrowth()
  const [isDismissed, setIsDismissed] = useState(true) // Default true to prevent flash

  useEffect(() => {
    // Check localStorage only on client
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('dismissed_core_tips') === 'true'
      setIsDismissed(dismissed)
    }
  }, [])

  if (hasTasks || isDismissed) return null

  const handleDismiss = () => {
    setIsDismissed(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem('dismissed_core_tips', 'true')
    }
  }

  return (
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={cn(
            "relative w-full overflow-hidden rounded-xl bg-[#09090b] border p-5 sm:p-6 mb-6 shadow-2xl z-10",
            isRTL ? "text-right" : "text-left"
          )}
          style={{ borderColor: `${currentTheme.color}30` }}
        >
          {/* Subtle background glow */}
          <div 
            className="absolute -inset-1 opacity-10 blur-2xl pointer-events-none" 
            style={{ backgroundColor: currentTheme.color }} 
          />
          
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 rtl:left-4 rtl:right-auto text-white/50 hover:text-white transition-colors cursor-pointer z-20 p-1"
            title="Dismiss tip"
          >
            <X className="text-sm sm:text-base w-3.5 h-3.5" />
          </button>

          <div className="relative z-10 space-y-4">
            <h3 
              className="text-sm font-space font-black tracking-widest uppercase flex items-center gap-2"
              style={{ color: currentTheme.color }}
            >
              <Info className="text-lg w-[18px] h-[18px]" />
              {isRTL ? 'دليل سريع' : 'Quick Guide'}
            </h3>
            
            <ul className="space-y-3 text-sm text-[#FFFFFF] font-medium leading-relaxed max-w-2xl">
              <li className="flex items-start gap-3">
                <span className="shrink-0 mt-0.5 opacity-80">⚡</span>
                <span>
                  {isRTL ? (
                    <>
                      <strong>إضافة سريعة:</strong> اضغط على <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono border border-white/20 mx-1">Ctrl + G</kbd> (أو Cmd + G للماك) في أي مكان بالمنصة لفتح لوحة الإنزال السريع. ضيف مهمة طائرة أو اكتب ملحوظة في ثواني من غير ما تسيب صفحتك الحالية.
                    </>
                  ) : (
                    <>
                      <strong>QUICK ADD:</strong> Press <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono border border-white/20 mx-1">Ctrl + G</kbd> (or Cmd + G) anywhere to instantly drop a quick task or raw note.
                    </>
                  )}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="shrink-0 mt-0.5 opacity-80">🎯</span>
                <span>
                  {isRTL ? (
                    <>
                      <strong>سحب المنهج:</strong> اضغط على زرار 'استيراد قائمة تشغيل' بالأسفل، وارمي لينك كورس يوتيوب. السيستم هيقيس الفيديوهات أوتوماتيك ويوزع شُرط الصعوبة النسيبية بناءً على حجم الكورس.
                    </>
                  ) : (
                    <>
                      <strong>CAPTURE SYLLABUS:</strong> Click "Import Playlist" below to map a YouTube course and generate your relative difficulty scale.
                    </>
                  )}
                </span>
              </li>
            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
