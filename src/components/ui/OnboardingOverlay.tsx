'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface OnboardingOverlayProps {
  language: 'en' | 'ar'
  onComplete: () => void
}

const STEPS = [
  {
    id: 1,
    titleEn: 'YOUR GOALS COME ALIVE',
    titleAr: 'تجسيد الأهداف وتطويرها',
    descEn: 'Every goal you add becomes a living crystal. Complete tasks to fill it up. When it hits 100%, it transforms into a permanent achievement.',
    descAr: 'كل هدف تضيفه يظهر كعنصر تفاعلي نشط. أكمل المهام المرتبطة به لزيادة تقدمه، وعند وصوله إلى 100% يتحول لإنجاز دائم موثق في مكتبتك.'
  },
  {
    id: 2,
    titleEn: '9 UNITS. CHOOSE WISELY.',
    titleAr: 'سعة التركيز: 9 وحدات',
    descEn: 'Your brain can only handle so much at once. You have 9 Focus Units. Big goal = 3 units. Medium = 1.5. Small = 1. Pick your battles carefully.',
    descAr: 'يعمل العقل بأقصى كفاءة عند التركيز المحدود. يمنحك النظام 9 وحدات تركيز كحد أقصى؛ الأهداف الكبيرة تستهلك 3 وحدات، المتوسطة 1.5، والصغيرة وحدة واحدة. خطط لأهدافك بذكاء.'
  },
  {
    id: 3,
    titleEn: 'LEVEL UP YOUR LIFE',
    titleAr: 'تطور مستوى الإنتاجية',
    descEn: 'Every task you complete earns XP. Your rank evolves from Recruit to Ace to Conqueror. Fall behind on deadlines and you lose XP. Stay sharp.',
    descAr: 'إكمال المهام يمنحك نقاط خبرة (XP). يتطور تصنيفك المهني تدريجياً ليعكس حجم التزامك. تأخرك عن المواعيد النهائية يؤدي إلى تراجع نقاطك تدريجياً.'
  },
  {
    id: 4,
    titleEn: 'YOUR PERSONAL COMMANDER',
    titleAr: 'المساعد الذكي المخصص',
    descEn: 'SAVAGE knows your data. He tells you exactly what to focus on today, which goals are in danger, and what your next move should be. No generic advice. Ever.',
    descAr: 'يقوم المساعد الذكي بتحليل أدائك بدقة، ليوجهك مباشرة إلى المهام الأكثر أهمية اليوم، وينبهك للأهداف المعرضة للتأخير لتتخذ الإجراء المناسب بناءً على معطيات حقيقية.'
  },
  {
    id: 5,
    titleEn: 'NEVER MISS A DEADLINE',
    titleAr: 'متابعة مستمرة ودقيقة',
    descEn: 'Your inbox sends weekly performance reports, deadline warnings 3 days before they hit, and celebrates every goal you complete. Stay informed. Stay ahead.',
    descAr: 'تلقَّ تقارير أداء أسبوعية مفصلة، وتنبيهات استباقية قبل 3 أيام من المواعيد النهائية للمهام، بجانب توثيق واحتفاء بكافة الأهداف المكتملة لتبقى دائماً في طليعة المنجزين.'
  }
]

export default function OnboardingOverlay({ language, onComplete }: OnboardingOverlayProps) {
  const [step, setStep] = useState(0)
  const [showSkipConfirm, setShowSkipConfirm] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [mounted, setMounted] = useState(false)

  const isRTL = language === 'ar'
  const currentStepData = STEPS[step]

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSkipConfirm) {
        if (e.key === 'Escape') setShowSkipConfirm(false)
        return
      }
      if (e.key === 'ArrowRight' && !isRTL) handleNext()
      if (e.key === 'ArrowLeft' && !isRTL) handlePrev()
      if (e.key === 'ArrowLeft' && isRTL) handleNext()
      if (e.key === 'ArrowRight' && isRTL) handlePrev()
      if (e.key === 'Escape') setShowSkipConfirm(true)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [step, showSkipConfirm, isRTL])

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      finishOnboarding()
    }
  }

  const handlePrev = () => {
    if (step > 0) {
      setStep(s => s - 1)
    }
  }

  const finishOnboarding = () => {
    setIsClosing(true)
    setTimeout(() => {
      onComplete()
    }, 800)
  }

  const renderCircleContent = () => {
    switch (step) {
      case 0:
        return (
          <div className="flex flex-col items-center justify-center w-full h-full p-4 relative">
            <motion.span
              className="material-symbols-outlined text-6xl md:text-7xl"
              style={{ color: '#00ff00', filter: 'drop-shadow(0 0 10px #00ff00)' }}
              animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.1, 0.9] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              diamond
            </motion.span>
            <div className="absolute bottom-4 md:bottom-8 w-20 h-1 bg-white/20 rounded overflow-hidden">
              <motion.div
                className="h-full bg-[#00ff00]"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          </div>
        )
      case 1:
        return (
          <div className="flex flex-col items-center justify-center w-full h-full p-4 gap-2">
            <span className="text-[#ff00ff] font-space text-2xl md:text-3xl font-black drop-shadow-[0_0_10px_#ff00ff]">7.5/9</span>
            <div className="w-24 h-2 bg-white/10 rounded overflow-hidden shadow-[0_0_10px_#ff00ff33]">
              <motion.div
                className="h-full bg-[#ff00ff] shadow-[0_0_10px_#ff00ff]"
                initial={{ width: '0%' }}
                animate={{ width: '83%' }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        )
      case 2:
        return (
          <div className="flex flex-col items-center justify-center w-full h-full gap-2">
            <motion.div
              animate={{
                color: ['#94a3b8', '#2dd4bf', '#a855f7'],
                textShadow: ['0 0 10px #94a3b8', '0 0 15px #2dd4bf', '0 0 20px #a855f7']
              }}
              transition={{ duration: 4, repeat: Infinity }}
              className="text-4xl md:text-5xl font-black font-space flex flex-col items-center"
            >
              <span className="material-symbols-outlined text-5xl md:text-6xl mb-1">military_tech</span>
            </motion.div>
            <motion.span
              className="font-space font-black text-sm md:text-base text-zinc-900 dark:text-white"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              +500 XP
            </motion.span>
          </div>
        )
      case 3:
        return (
          <div className="flex flex-col items-center justify-center w-full h-full relative">
            <motion.span
              className="material-symbols-outlined text-5xl md:text-6xl text-[#00ff00]"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              support_agent
            </motion.span>
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.3 }}
              className="absolute top-2 right-2 bg-white dark:bg-black border border-[#00ff00] p-2 rounded-lg text-[8px] md:text-[10px] font-space font-bold text-[#00ff00] z-10 shadow-lg"
              dir="ltr"
            >
              FOCUS ON CCNA.<br />3 DAYS LEFT.
            </motion.div>
          </div>
        )
      case 4:
        return (
          <div className="flex flex-col items-center justify-center w-full h-full gap-2">
            <div className="relative">
              <motion.span
                className="material-symbols-outlined text-4xl md:text-5xl text-zinc-900 dark:text-white"
                animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              >
                notifications
              </motion.span>
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 md:w-5 md:h-5 flex items-center justify-center rounded-full font-bold">
                7
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-black/5 dark:bg-white/10 border border-zinc-200 dark:border-white/20 p-2 rounded text-[8px] md:text-[10px] text-zinc-900 dark:text-white text-center shadow-md"
            >
              Weekly Report<br />12 tasks done
            </motion.div>
          </div>
        )
    }
  }

  if (!mounted) return null

  const overlay = (
    <AnimatePresence>
      {!isClosing && (
        <motion.div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {/* LAYER 0: Fake blurred dashboard skeleton (zIndex: 0) */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, width: '100%', height: '100%',
            zIndex: 0,
            background: '#050505',
            pointerEvents: 'none',
            opacity: 0.55,
            display: 'flex',
            flexDirection: 'column',
            padding: '32px',
          }}>
            {/* Top nav bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
              <div style={{ width: '192px', height: '48px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }} />
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ width: '96px', height: '48px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }} />
                <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
              </div>
            </div>
            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '48px' }}>
              {[
                { accent: '#ff00ff', label: '83%' },
                { accent: '#2dd4bf', label: 'ACE' },
                { accent: '#a855f7', label: '1250 XP' },
              ].map((card, i) => (
                <div key={i} style={{
                  height: '128px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '12px',
                  border: `1px solid ${card.accent}33`,
                  padding: '16px',
                }}>
                  <div style={{ width: '96px', height: '12px', background: 'rgba(255,255,255,0.15)', borderRadius: '4px', marginBottom: '16px' }} />
                  <div style={{ fontSize: '28px', fontWeight: 900, color: card.accent, fontFamily: 'monospace' }}>{card.label}</div>
                </div>
              ))}
            </div>
            {/* Mission card skeletons */}
            <div style={{ display: 'flex', gap: '24px', overflow: 'hidden' }}>
              {[30, 65, 90].map((pct, i) => (
                <div key={i} style={{
                  width: '256px', height: '320px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '24px',
                  display: 'flex', alignItems: 'flex-end', flexShrink: 0,
                }}>
                  <div style={{ width: '100%', height: `${pct}%`, background: 'rgba(255,255,255,0.15)', borderRadius: '4px' }} />
                </div>
              ))}
            </div>
          </div>

          {/* LAYER 1: Backdrop blur + dark tint — the actual blur effect (zIndex: 1) */}
          <div className="absolute inset-0 z-[1] bg-white/65 dark:bg-black/65 backdrop-blur-md" />

          {/* LAYER 2: Interactive UI — circle + card (zIndex: 10) */}
          <div style={{
            position: 'relative', zIndex: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            paddingTop: '80px',
          }}>
            {/* Spotlight Circle */}
            <div className="relative flex items-center justify-center">
              {step > 0 && (
                <button
                  onClick={handlePrev}
                  className={cn(
                    "absolute text-zinc-500 dark:text-white/50 hover:text-zinc-900 dark:hover:text-white transition-colors",
                    isRTL ? "-right-12 md:-right-16" : "-left-12 md:-left-16"
                  )}
                >
                  <span className="material-symbols-outlined text-3xl">
                    {isRTL ? "arrow_forward" : "arrow_back"}
                  </span>
                </button>
              )}

              <motion.div
                className="w-[150px] h-[150px] md:w-[200px] md:h-[200px] rounded-full bg-white dark:bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden"
                style={{
                  boxShadow: '0 0 30px #00ff00, 0 0 60px rgba(0,255,0,0.3)',
                  border: '2px solid #00ff00'
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
              >
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-[#00ff00]"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeOut' }}
                />
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full flex items-center justify-center absolute inset-0"
                  >
                    {renderCircleContent()}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </div>

            {/* Connecting Neon Line */}
            <motion.div
              className="w-[1px] bg-[#00ff00]"
              style={{ boxShadow: '0 0 10px #00ff00' }}
              initial={{ height: 0 }}
              animate={{ height: 48 }}
              transition={{ delay: 0.5 }}
            />

            {/* Description Box */}
            <motion.div
              className="w-[90vw] md:w-[340px] rounded-2xl p-6 relative bg-white/95 dark:bg-[#0a0a0a]/95 shadow-2xl"
              style={{
                border: '1px solid rgba(0,255,0,0.3)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              {/* Step dots */}
              <div className="flex justify-center gap-2 mb-6" dir="ltr">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className="relative flex items-center justify-center outline-none"
                  >
                    <motion.div
                      className="rounded-full"
                      animate={{
                        width: i === step ? 12 : 6,
                        height: i === step ? 12 : 6,
                        backgroundColor: i === step ? '#00ff00' : '#4b5563'
                      }}
                      transition={{ type: 'spring' }}
                      style={i === step ? { boxShadow: '0 0 10px #00ff00' } : {}}
                    />
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="min-h-[140px]"
                >
                  <div className={cn("text-[10px] font-space text-zinc-500 dark:text-white/50 mb-2 uppercase tracking-widest font-black", isRTL && "text-right")}>
                    STEP {step + 1}/{STEPS.length}
                  </div>
                  <h2
                    className={cn("text-xl font-bold text-zinc-900 dark:text-white mb-3", isRTL && "text-right")}
                    style={{ fontFamily: isRTL ? 'Tajawal, sans-serif' : 'Space Grotesk, sans-serif' }}
                  >
                    {isRTL ? currentStepData.titleAr : currentStepData.titleEn}
                  </h2>
                  <p
                    className={cn("text-sm text-zinc-700 dark:text-white/70 leading-relaxed", isRTL && "text-right")}
                    style={{ fontFamily: isRTL ? 'Tajawal, sans-serif' : 'Inter, sans-serif' }}
                  >
                    {isRTL ? currentStepData.descAr : currentStepData.descEn}
                  </p>
                </motion.div>
              </AnimatePresence>

              <div className={cn("flex items-center justify-between mt-6 pt-4 border-t border-zinc-200 dark:border-white/10", isRTL && "flex-row-reverse")}>
                <button
                  onClick={() => setShowSkipConfirm(true)}
                  className="text-xs font-space font-bold tracking-wider text-zinc-500 dark:text-white/40 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  SKIP
                </button>

                {step < STEPS.length - 1 ? (
                  <button
                    onClick={handleNext}
                    className="px-6 py-2 bg-[#00ff00]/10 border border-[#00ff00]/50 text-[#00ff00] rounded-lg text-xs font-space font-bold tracking-wider uppercase hover:bg-[#00ff00]/20 transition-colors shadow-[0_0_15px_rgba(0,255,0,0.1)] flex items-center gap-1"
                  >
                    NEXT {isRTL
                      ? <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                      : <span className="material-symbols-outlined text-[14px]">arrow_forward</span>}
                  </button>
                ) : (
                  <button
                    onClick={finishOnboarding}
                    className="relative group px-6 py-2 bg-[#00ff00] text-black rounded-lg text-xs font-space font-black tracking-wider uppercase hover:brightness-110 transition-all shadow-[0_0_20px_rgba(0,255,0,0.4)] flex items-center gap-1"
                  >
                    <span className="relative z-10 flex items-center gap-1">
                      ENTER THE HUB {isRTL
                        ? <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                        : <span className="material-symbols-outlined text-[14px]">arrow_forward</span>}
                    </span>
                    <div className="absolute inset-0 bg-[#00ff00] rounded-lg blur-md opacity-0 group-hover:opacity-50 transition-opacity" />
                  </button>
                )}
              </div>
            </motion.div>
          </div>

          {/* Skip Confirm Dialog (zIndex: 50) */}
          <AnimatePresence>
            {showSkipConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-[50] flex items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-sm p-4"
              >
                <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-white/10 rounded-xl p-6 max-w-[320px] text-center shadow-2xl">
                  <h3 className="text-zinc-900 dark:text-white font-bold mb-3">Skip Tour?</h3>
                  <p className="text-zinc-600 dark:text-white/60 text-sm mb-6">
                    You can always find help in the{' '}
                    <span className="material-symbols-outlined text-[14px] align-middle">info</span>{' '}
                    button on the dashboard.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowSkipConfirm(false)}
                      className="flex-1 py-2 rounded bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-900 dark:text-white text-sm transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={finishOnboarding}
                      className="flex-1 py-2 rounded bg-[#00ff00]/20 text-[#00ff00] hover:bg-[#00ff00]/30 border border-[#00ff00]/30 text-sm transition-colors font-bold"
                    >
                      Skip Tour
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return createPortal(overlay, document.body)
}
