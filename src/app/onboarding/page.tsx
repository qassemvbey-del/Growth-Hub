'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useGrowth, type Language, type AiPersonality } from '@/context/GrowthContext'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 'language',   label: 'LANGUAGE',   title: { en: 'CHOOSE_INTERFACE_LANGUAGE', ar: 'اختر لغة النظام' } },
  { id: 'ai_protocol', label: 'AI_COACH',   title: { en: 'SELECT_AI_BEHAVIORAL_PROTOCOL', ar: 'اختر شخصية المدرب الذكي' } },
  { id: 'identity',   label: 'IDENTITY',   title: { en: 'WHO_ARE_YOU?', ar: 'من أنت؟' } },
  { id: 'mission',    label: 'MISSION',    title: { en: 'YOUR_MAIN_MISSION?', ar: 'ما هي مهمتك الكبرى؟' } },
  { id: 'project',    label: 'PROJECT',    title: { en: 'WEEKLY_PROJECT?', ar: 'مشروع الأسبوع؟' } },
  { id: 'focus',      label: 'DAILY',      title: { en: 'DAILY_FOCUS?', ar: 'تركيز اليوم؟' } }
]

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({
    language: 'en' as Language,
    ai_personality: 'GENTLE' as AiPersonality,
    full_name: '',
    age: '',
    mission_goal: '',
    weekly_project: '',
    daily_focus: ''
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { refreshProfile, isRTL: globalRTL } = useGrowth()

  // Local RTL check for onboarding before profile is loaded
  const isRTL = formData.language === 'ar'

  useEffect(() => {
    async function prefill() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.full_name) {
        setFormData(prev => ({ ...prev, full_name: user.user_metadata.full_name }))
      }
    }
    prefill()
  }, [])

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      completeOnboarding()
    }
  }

  const completeOnboarding = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: formData.full_name || user.user_metadata?.full_name || 'OPERATOR',
          age: parseInt(formData.age) || null,
          mission_goal: formData.mission_goal,
          weekly_project: formData.weekly_project,
          daily_focus: formData.daily_focus,
          language: formData.language,
          ai_personality: formData.ai_personality,
          onboarded: true,
          updated_at: new Date().toISOString()
        })
      
      if (profileError) {
        setLoading(false)
        return
      }

      const missions = []
      if (formData.mission_goal)    missions.push({ user_id: user.id, title: formData.mission_goal, sync_to_dashboard: true, status: 'ACTIVE', is_archived: false })
      if (formData.weekly_project)  missions.push({ user_id: user.id, title: formData.weekly_project, sync_to_dashboard: true, status: 'ACTIVE', is_archived: false })
      if (formData.daily_focus)     missions.push({ user_id: user.id, title: formData.daily_focus, sync_to_dashboard: true, status: 'ACTIVE', is_archived: false })
      if (missions.length > 0) await supabase.from('cups').insert(missions)

      await refreshProfile()
      router.push('/')
    } else {
       router.push('/')
    }
    setLoading(false)
  }

  const handleSkip = () => completeOnboarding()

  return (
    <div className={cn(
      "min-h-screen bg-[#F0F2F5] dark:bg-[#0D0D0D] flex flex-col items-center justify-center p-8 relative overflow-hidden transition-colors",
      isRTL ? "font-noto" : "font-space"
    )} dir={isRTL ? 'rtl' : 'ltr'}>
      
      {/* Step Progress HUD */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 flex gap-8 z-20 overflow-x-auto max-w-full px-8 pb-4 scrollbar-hide">
         {STEPS.map((step, i) => (
           <div key={step.id} className="flex flex-col items-center gap-2 min-w-[100px]">
             <div className={cn(
               "w-full h-[3px] bg-black/5 dark:bg-white/5 transition-all duration-700 rounded-full",
               i <= currentStep ? "bg-[#39FF14] shadow-[0_0_15px_#39FF14]" : ""
             )} />
             <span className={cn(
               "text-[9px] md:text-[11px] font-black tracking-widest uppercase whitespace-nowrap transition-colors",
               i === currentStep ? "text-[#39FF14]" : "text-black/20 dark:text-white/10"
             )}>
               {step.label}
             </span>
           </div>
         ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: isRTL ? -30 : 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isRTL ? 30 : -30 }}
          className="w-full max-w-3xl space-y-12 relative z-10"
        >
           <header className="space-y-4">
              <span className="text-[10px] md:text-xs text-[#39FF14] tracking-[0.6em] uppercase font-bold opacity-60">
                {isRTL ? 'الخطوة' : 'STEP'} _0{currentStep + 1}
              </span>
              <h2 className={cn(
                "text-3xl md:text-6xl font-black tracking-tighter italic uppercase text-black dark:text-white leading-tight",
                isRTL ? "text-4xl md:text-7xl" : ""
              )}>
                {STEPS[currentStep].title[formData.language === 'ar' ? 'ar' : 'en']}
              </h2>
           </header>

           <div className="space-y-10">

              {/* STEP 0: Language */}
              {currentStep === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {[
                     { id: 'en', label: 'ENGLISH', sub: 'STANDARD' },
                     { id: 'ar', label: 'العربية', sub: 'ARABIC' }
                   ].map(lang => (
                     <button
                       key={lang.id}
                       onClick={() => setFormData({ ...formData, language: lang.id as Language })}
                       className={cn(
                         "p-8 md:p-12 border rounded-sm text-left transition-all group relative overflow-hidden",
                         lang.id === 'ar' ? 'text-right' : 'text-left',
                         formData.language === lang.id 
                          ? "bg-[#39FF14]/10 border-[#39FF14] shadow-[0_0_30px_rgba(57,255,20,0.1)]" 
                          : "bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10"
                       )}
                     >
                       <div className="space-y-3 relative z-10">
                          <p className={cn("text-[10px] md:text-xs font-black tracking-widest uppercase", formData.language === lang.id ? "text-[#39FF14]" : "text-black/20 dark:text-white/20")}>{lang.sub}</p>
                          <p className={cn("text-2xl md:text-4xl font-black", formData.language === lang.id ? "text-black dark:text-white" : "text-black/40 dark:text-white/30")}>{lang.label}</p>
                       </div>
                       {formData.language === lang.id && (
                         <motion.div layoutId="lang-check" className={cn("absolute top-6 text-[#39FF14]", isRTL ? 'left-6' : 'right-6')}>
                            <span className="material-symbols-outlined text-3xl">check_circle</span>
                         </motion.div>
                       )}
                     </button>
                   ))}
                </div>
              )}

              {/* STEP 1: AI Personality */}
              {currentStep === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* SAVAGE */}
                  <button
                    onClick={() => setFormData({ ...formData, ai_personality: 'SAVAGE' })}
                    className={cn(
                      "p-8 md:p-12 border rounded-sm text-start transition-all relative overflow-hidden group",
                      formData.ai_personality === 'SAVAGE'
                        ? "bg-[#FF3131]/10 border-[#FF3131] shadow-[0_0_40px_rgba(255,49,49,0.15)]"
                        : "bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10"
                    )}
                  >
                    <div className="space-y-6">
                      <span className="text-5xl">🔥</span>
                      <p className={cn("text-2xl md:text-3xl font-black uppercase italic tracking-tighter", formData.ai_personality === 'SAVAGE' ? "text-[#FF3131]" : "text-black/40 dark:text-white/30")}>
                        {isRTL ? 'قاسي' : 'SAVAGE'}
                      </p>
                      <p className={cn("text-sm md:text-base leading-relaxed font-bold", formData.ai_personality === 'SAVAGE' ? "text-black/70 dark:text-white/70" : "text-black/20 dark:text-white/20")}>
                        {isRTL ? "المدرب سيكون حاداً جداً إذا تأخرت. لا رحمة. لا أعذار. منطق الضغط العالي فقط." : "AI will trash talk if you're late. No mercy. No excuses. High pressure logic only."}
                      </p>
                    </div>
                  </button>

                  {/* GENTLE */}
                  <button
                    onClick={() => setFormData({ ...formData, ai_personality: 'GENTLE' })}
                    className={cn(
                      "p-8 md:p-12 border rounded-sm text-start transition-all relative overflow-hidden group",
                      formData.ai_personality === 'GENTLE'
                        ? "bg-[#39FF14]/10 border-[#39FF14] shadow-[0_0_40px_rgba(57,255,20,0.15)]"
                        : "bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10"
                    )}
                  >
                    <div className="space-y-6">
                      <span className="text-5xl">💚</span>
                      <p className={cn("text-2xl md:text-3xl font-black uppercase italic tracking-tighter", formData.ai_personality === 'GENTLE' ? "text-[#39FF14]" : "text-black/40 dark:text-white/30")}>
                        {isRTL ? 'لطيف' : 'GENTLE'}
                      </p>
                      <p className={cn("text-sm md:text-base leading-relaxed font-bold", formData.ai_personality === 'GENTLE' ? "text-black/70 dark:text-white/70" : "text-black/20 dark:text-white/20")}>
                        {isRTL ? "مدرب داعم. يركز على التعزيز الإيجابي والنمو المستمر بخطوات ثابتة." : "Supportive AI coach. Focuses on positive reinforcement and steady growth."}
                      </p>
                    </div>
                  </button>
                </div>
              )}

              {/* STEP 2: Identity */}
              {currentStep === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <label className="text-[10px] md:text-xs font-black text-black/30 dark:text-white/20 tracking-widest uppercase">{isRTL ? 'الاسم بالكامل' : 'FULL_NAME'}</label>
                      <input 
                        type="text"
                        placeholder="ENTER_NAME"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 p-8 rounded-sm text-2xl md:text-3xl outline-none focus:border-[#39FF14]/50 focus:bg-[#39FF14]/5 transition-all uppercase placeholder:opacity-5 text-black dark:text-white font-black italic"
                      />
                   </div>
                   <div className="space-y-4">
                      <label className="text-[10px] md:text-xs font-black text-black/30 dark:text-white/20 tracking-widest uppercase">{isRTL ? 'العمر' : 'AGE'}</label>
                      <input 
                        type="number"
                        placeholder="00"
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                        className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 p-8 rounded-sm text-2xl md:text-3xl outline-none focus:border-[#39FF14]/50 focus:bg-[#39FF14]/5 transition-all uppercase placeholder:opacity-5 text-black dark:text-white font-black italic"
                      />
                   </div>
                </div>
              )}

              {/* STEPS 3-5: Mission / Project / Focus */}
              {currentStep >= 3 && (
                <div className="space-y-6">
                   <label className="text-[10px] md:text-xs font-black text-[#39FF14] tracking-widest uppercase">
                     {currentStep === 3 ? (isRTL ? 'الهدف الأكبر // بعيد المدى' : 'MACRO_GOAL // LONG_TERM') : 
                      currentStep === 4 ? (isRTL ? 'مشروع الأسبوع // متوسط المدى' : 'MESO_PROJECT // WEEKLY') : 
                      (isRTL ? 'تركيز اليوم // قصير المدى' : 'MICRO_FOCUS // DAILY')}
                   </label>
                   <textarea 
                     placeholder={isRTL ? 'اشرح تفاصيل هدفك...' : 'DESCRIBE_OBJECTIVE_SPECIFICS'}
                     value={currentStep === 3 ? formData.mission_goal : currentStep === 4 ? formData.weekly_project : formData.daily_focus}
                     onChange={(e) => {
                        const val = e.target.value
                        if (currentStep === 3) setFormData({ ...formData, mission_goal: val })
                        else if (currentStep === 4) setFormData({ ...formData, weekly_project: val })
                        else setFormData({ ...formData, daily_focus: val })
                     }}
                     className="w-full h-40 md:h-64 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 p-8 md:p-12 rounded-sm text-2xl md:text-5xl italic font-black outline-none focus:border-[#39FF14]/50 focus:bg-[#39FF14]/5 transition-all uppercase placeholder:opacity-5 text-black dark:text-white resize-none leading-tight"
                   />
                </div>
              )}

              {/* Navigation */}
               <div className="flex flex-col md:flex-row justify-between items-center pt-8 md:pt-16 gap-8">
                  <div className="flex items-center gap-8 w-full md:w-auto justify-between">
                    <button 
                      onClick={() => currentStep > 0 && setCurrentStep(prev => prev - 1)}
                      className={cn(
                        "text-[10px] md:text-xs font-black tracking-[0.4em] uppercase px-10 py-5 border border-black/10 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-black/30 dark:text-white/20 rounded-sm",
                        currentStep === 0 ? "opacity-0 pointer-events-none" : ""
                      )}
                    >
                      {isRTL ? 'رجوع' : 'BACK'}
                    </button>

                    <button
                      onClick={handleSkip}
                      disabled={loading}
                      className="text-[10px] md:text-xs font-black tracking-[0.4em] uppercase text-black/20 dark:text-white/10 hover:text-black/60 dark:hover:text-white/40 transition-all flex items-center gap-3 disabled:opacity-30"
                    >
                      {isRTL ? 'تخطي البروتوكول' : 'SKIP_PROTOCOL'}
                      <span className="material-symbols-outlined text-lg">fast_forward</span>
                    </button>
                  </div>
                  
                  <button 
                    disabled={loading}
                    onClick={handleNext}
                    className="w-full md:w-auto flex items-center justify-center gap-8 bg-[#39FF14] text-[#0D0D0D] px-12 md:px-20 py-5 md:py-8 rounded-sm text-[14px] md:text-[16px] tracking-[0.3em] font-black uppercase hover:scale-105 active:scale-95 transition-all shadow-[0_0_50px_rgba(57,255,20,0.25)]"
                  >
                    {loading ? (isRTL ? 'جاري التحميل...' : 'CALIBRATING...') : currentStep === STEPS.length - 1 ? (isRTL ? 'بدء التشغيل' : 'FINALIZE_UPLINK') : (isRTL ? 'الخطوة التالية' : 'NEXT_STEP')}
                    <span className="material-symbols-outlined text-3xl rotate-0 rtl:rotate-180">arrow_forward</span>
                  </button>
               </div>
           </div>
        </motion.div>
      </AnimatePresence>

      <div className="fixed inset-0 pointer-events-none opacity-[0.03] scanlines dark:opacity-[0.05]" />
    </div>
  )
}
