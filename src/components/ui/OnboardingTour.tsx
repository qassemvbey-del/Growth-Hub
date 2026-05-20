'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGrowth } from '@/context/GrowthContext'

const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'SYSTEM_ONLINE',
    subtitle: 'WORKSPACE_BRIEFING // V7.0',
    body: 'Welcome to Growth Hub — your personal Life OS. This guided walk-through will show you the key systems.',
    bodyAr: 'مرحباً بك في Growth Hub — نظام تشغيل حياتك الشخصي. هذا الدليل الإرشادي سيريك الأنظمة الرئيسية.',
    icon: 'bolt',
    arrowDir: null as null | 'top' | 'bottom',
  },
  {
    id: 'xp-bar',
    title: 'XP_TRACKER',
    subtitle: 'MEMBER_RANK // PROGRESSION',
    body: 'This is your XP Bar. Complete goal tasks to earn XP and rank up from RECRUIT to CONQUEROR.',
    bodyAr: 'هذا شريط XP الخاص بك. أتمم مهام الأهداف لكسب XP والترقي من RECRUIT إلى CONQUEROR.',
    icon: 'military_tech',
    arrowDir: 'top' as null | 'top' | 'bottom',
  },
  {
    id: 'mission-grid',
    title: 'MY GOALS',
    subtitle: 'ACTIVE_GOALS // GRID',
    body: 'Your active goals appear here as Energy Cells. Tap any cell to view tasks and track progress.',
    bodyAr: 'أهدافك النشطة تظهر هنا كخلايا طاقة. اضغط على أي خلية لعرض المهام وتتبع التقدم.',
    icon: 'grid_view',
    arrowDir: 'bottom' as null | 'top' | 'bottom',
  },
  {
    id: 'sidebar',
    title: 'NAVIGATION',
    subtitle: 'SECTOR_MAP // CREATED',
    body: 'Use the navigation options to switch between Dashboard, Goals, Notes, Achievements, and Wins.',
    bodyAr: 'استخدم خيارات التنقل للتنقل بين لوحة التحكم والمهام والملاحظات والإنجازات والخزنة.',
    icon: 'explore',
    arrowDir: 'bottom' as null | 'top' | 'bottom',
  },
  {
    id: 'complete',
    title: 'BRIEFING_COMPLETE',
    subtitle: 'MEMBER_CLEARED // DASHBOARD',
    body: 'You are ready to begin. Create goals, earn XP, and achieve your objectives.',
    bodyAr: 'تم تفعيل حسابك. أنشئ الأهداف، اكسب XP، وحقق أهدافك.',
    icon: 'verified',
    arrowDir: null as null | 'top' | 'bottom',
  },
]

export default function OnboardingTour() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const { isRTL, currentTheme, mounted } = useGrowth()

  useEffect(() => {
    if (!mounted) return
    const done = localStorage.getItem('onboarding_complete')
    if (!done) {
      const t = setTimeout(() => setVisible(true), 1200)
      return () => clearTimeout(t)
    }
  }, [mounted])

  const dismiss = () => {
    localStorage.setItem('onboarding_complete', 'true')
    setVisible(false)
  }

  const next = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      dismiss()
    }
  }

  const current = TOUR_STEPS[step]
  const isFirst = step === 0
  const isLast = step === TOUR_STEPS.length - 1
  const neonColor = currentTheme?.color || '#39FF14'

  if (!visible) return null

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* ── TRUE FROSTED GLASS OVERLAY ──
              NO solid background div. Real backdrop-blur only. */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            // Exact class spec from the brief
            className="fixed inset-0 backdrop-blur-md bg-white/60 dark:bg-black/60 z-[9999] flex items-center justify-center"
            onClick={dismiss}
          >
            {/* Tour Card — stop click propagation */}
            <motion.div
              key={`step-${step}`}
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="w-[calc(100vw-2rem)] max-w-md"
              onClick={e => e.stopPropagation()}
            >
              {/* Neon border card */}
              <div
                className="relative rounded-sm border bg-white/95 dark:bg-[#030303] overflow-hidden shadow-2xl"
                style={{ borderColor: `${neonColor}40` }}
              >
                {/* Top neon line */}
                <div
                  className="absolute top-0 inset-x-0 h-[1.5px]"
                  style={{ background: `linear-gradient(90deg, transparent, ${neonColor}, transparent)` }}
                />

                {/* Scanline texture */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-[0.025]"
                  style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 4px)' }}
                />

                <div className="p-6 md:p-8 space-y-6">
                  {/* Step progress bars */}
                  <div className="flex items-center gap-2">
                    {TOUR_STEPS.map((_, i) => (
                      <div
                        key={i}
                        className="h-[2px] flex-1 rounded-full transition-all duration-500"
                        style={{ backgroundColor: i <= step ? neonColor : `${neonColor}20` }}
                      />
                    ))}
                  </div>

                  {/* Icon + Title */}
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-sm flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${neonColor}12`, border: `1px solid ${neonColor}30` }}
                    >
                      <span
                        className="material-symbols-outlined text-2xl"
                        style={{ color: neonColor, textShadow: `0 0 12px ${neonColor}` }}
                      >
                        {current.icon}
                      </span>
                    </div>
                    <div>
                      <h2
                        className="text-xl md:text-2xl font-black font-space uppercase italic tracking-tight leading-none"
                        style={{ color: neonColor }}
                      >
                        {current.title}
                      </h2>
                      <p className="text-[9px] font-space text-zinc-500 dark:text-white/20 tracking-[0.4em] uppercase font-black mt-1">
                        {current.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Body */}
                  <p className="text-sm md:text-base font-space text-zinc-800 dark:text-white/70 leading-relaxed" dir="auto">
                    {isRTL ? current.bodyAr : current.body}
                  </p>

                  {/* Arrow hint */}
                  {current.arrowDir && (
                    <div className="flex items-center gap-2 text-[10px] font-space font-black tracking-widest uppercase" style={{ color: neonColor }}>
                      <span className="material-symbols-outlined text-sm animate-bounce">
                        {current.arrowDir === 'top' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                      {isRTL ? 'انظر إلى العنصر' : `ELEMENT_${current.arrowDir.toUpperCase()}`}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-white/5">
                    <button
                      onClick={dismiss}
                      className="text-[10px] font-space font-black tracking-[0.3em] uppercase text-zinc-500 dark:text-white/20 hover:text-zinc-900 dark:hover:text-white/60 transition-all"
                    >
                      {isRTL ? 'تخطي' : 'SKIP TOUR'}
                    </button>

                    <div className="flex items-center gap-3">
                      {!isFirst && (
                        <button
                          onClick={() => setStep(s => s - 1)}
                          className="px-4 py-2 border border-zinc-200 dark:border-white/10 text-[10px] font-space font-black tracking-widest uppercase text-zinc-600 dark:text-white/40 hover:border-zinc-400 dark:hover:border-white/30 hover:text-zinc-900 dark:hover:text-white/60 transition-all rounded-sm"
                        >
                          {isRTL ? 'السابق' : 'BACK'}
                        </button>
                      )}
                      <button
                        onClick={next}
                        className="px-6 py-2 font-space font-black text-[10px] tracking-widest uppercase text-black transition-all rounded-sm hover:scale-105 active:scale-95"
                        style={{ backgroundColor: neonColor, boxShadow: `0 0 20px ${neonColor}40` }}
                      >
                        {isLast
                          ? (isRTL ? 'ابدأ العمل' : 'GET STARTED')
                          : (isRTL ? 'التالي' : 'GOT_IT')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step counter */}
              <div className="text-center mt-3 text-[9px] font-space text-zinc-500 dark:text-white/20 tracking-widest uppercase">
                STEP_{step + 1}_OF_{TOUR_STEPS.length}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
