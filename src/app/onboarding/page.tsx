'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useGrowth, type Language } from '@/context/GrowthContext'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 'IDENTITY', label: 'IDENTITY', title: 'WHO_ARE_YOU?' },
  { id: 'FIRST_MISSION', label: 'MISSION', title: 'YOUR_FIRST_MISSION' },
  { id: 'SYSTEM_READY', label: 'READY', title: 'UPLINK_ESTABLISHED' }
]

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({
    name: '',
    language: 'en' as Language,
    missionTitle: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    missionSize: 'MEDIUM' as 'BIG' | 'MEDIUM' | 'SMALL'
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { refreshProfile, isRTL: globalRTL, currentTheme } = useGrowth()

  const isRTL = formData.language === 'ar'

  useEffect(() => {
    async function checkExisting() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check localStorage first for instant skip
      if (localStorage.getItem('onboarding_complete') === 'true') {
        router.push('/')
        return
      }

      // Check DB for profile or missions
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      const { data: missions } = await supabase.from('cups').select('id').eq('user_id', user.id).limit(1)

      if (profile?.full_name || (missions && missions.length > 0)) {
        localStorage.setItem('onboarding_complete', 'true')
        router.push('/')
      }
    }
    checkExisting()
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
      // 1. Update Profile
      console.log('ONBOARDING_FINALIZE // SAVING_PROFILE:', formData.name)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: formData.name,
          language: formData.language,
          onboarded: true,
          xp: 0,
          blocked: false,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })
      
      if (profileError) {
        console.error('ONBOARDING_ERROR // PROFILE_SAVE_FAILED:', profileError)
        setLoading(false)
        alert('CRITICAL_ERROR: Failed to save operator profile. Please try again.')
        return
      }

      // 2. Create First Mission
      if (formData.missionTitle) {
        await supabase.from('cups').insert({
          user_id: user.id,
          title: formData.missionTitle,
          start_date: formData.startDate,
          end_date: formData.endDate,
          size: formData.missionSize === 'BIG' ? 'lg' : formData.missionSize === 'MEDIUM' ? 'md' : 'sm',
          sync_to_dashboard: true,
          status: 'ACTIVE',
          is_archived: false
        })
      }

      localStorage.setItem('onboarding_complete', 'true')
      await refreshProfile()
      router.push('/')
    } else {
       router.push('/auth/login')
    }
    setLoading(false)
  }

  const sizes = [
    { id: 'BIG', label: 'BIG', color: '#FF3131', cost: '3 Units' },
    { id: 'MEDIUM', label: 'MEDIUM', color: '#FFD700', cost: '1.5 Units' },
    { id: 'SMALL', label: 'SMALL', color: '#39FF14', cost: '1 Unit' }
  ]

  return (
    <div className={cn(
      "min-h-screen bg-[#0D0D0D] text-white flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden",
      isRTL ? "font-tajawal" : "font-space"
    )} dir={isRTL ? 'rtl' : 'ltr'}>
      
      {/* HUD Background FX */}
      <div className="fixed inset-0 pointer-events-none opacity-5 cyber-grid" />
      <div className="fixed inset-0 pointer-events-none opacity-10 scanlines" />

      {/* Progress HUD */}
      <div className="absolute top-8 md:top-16 inset-x-0 flex justify-center gap-4 md:gap-12 px-6 z-20">
         {STEPS.map((step, i) => (
           <div key={step.id} className="flex flex-col items-center gap-2 min-w-[80px] md:min-w-[120px]">
             <div className={cn(
               "w-full h-[2px] transition-all duration-1000 rounded-full bg-white/5",
               i <= currentStep ? "bg-[#39FF14] shadow-[0_0_15px_#39FF14]" : ""
             )} />
             <span className={cn(
               "text-[9px] md:text-[10px] font-black tracking-widest uppercase transition-colors",
               i === currentStep ? "text-[#39FF14]" : "text-white/20"
             )}>
               {step.label}
             </span>
           </div>
         ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="w-full max-w-4xl space-y-12 relative z-10 py-12"
        >
            <header className="space-y-4 text-center md:text-start">
               <span className="text-[10px] md:text-xs text-[#39FF14] tracking-[0.5em] uppercase font-black opacity-50">
                 PHASE_0{currentStep + 1}
               </span>
               <h2 className="text-4xl md:text-8xl font-black tracking-tighter italic uppercase leading-none break-words">
                 {isRTL && currentStep === 0 ? 'من أنت؟' : 
                  isRTL && currentStep === 1 ? 'مهمتك الأولى' : 
                  isRTL && currentStep === 2 ? 'النظام جاهز' : 
                  STEPS[currentStep].title}
               </h2>
               {currentStep === 1 && (
                 <p className="text-white/40 font-bold uppercase tracking-widest text-xs md:text-sm">
                   {isRTL ? 'كل بطل يحتاج إلى هدف.' : 'Every operator needs a target.'}
                 </p>
               )}
            </header>

            <div className="space-y-8 md:space-y-12">
               {/* STEP 1: IDENTITY */}
               {currentStep === 0 && (
                 <div className="space-y-10">
                    <div className="space-y-4">
                       <label className="text-[10px] md:text-xs font-black text-white/30 tracking-[0.3em] uppercase">OPERATOR_NAME</label>
                       <input 
                         type="text"
                         placeholder="IDENTIFY_YOURSELF"
                         value={formData.name}
                         onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                         className="w-full bg-white/5 border border-white/5 p-6 md:p-10 rounded-sm text-2xl md:text-5xl outline-none focus:border-[#39FF14]/50 focus:bg-[#39FF14]/5 transition-all placeholder:opacity-5 font-black italic"
                       />
                    </div>
                    <div className="space-y-6">
                       <label className="text-[10px] md:text-xs font-black text-white/30 tracking-[0.3em] uppercase">INTERFACE_LANGUAGE</label>
                       <div className="flex gap-4">
                          {['en', 'ar'].map(l => (
                            <button
                              key={l}
                              onClick={() => setFormData({ ...formData, language: l as Language })}
                              className={cn(
                                "flex-1 py-6 md:py-8 border rounded-sm font-black tracking-widest transition-all uppercase",
                                formData.language === l 
                                  ? "bg-[#39FF14] text-black border-[#39FF14] shadow-[0_0_30px_rgba(57,255,20,0.3)]" 
                                  : "bg-white/5 border-white/5 text-white/40 hover:border-white/20"
                              )}
                            >
                              {l === 'en' ? 'ENGLISH' : 'العربية'}
                            </button>
                          ))}
                       </div>
                    </div>
                 </div>
               )}

               {/* STEP 2: FIRST MISSION */}
               {currentStep === 1 && (
                 <div className="space-y-8 md:space-y-12">
                    <div className="space-y-4">
                       <label className="text-[10px] md:text-xs font-black text-white/30 tracking-[0.3em] uppercase">MISSION_TITLE</label>
                       <input 
                         type="text"
                         placeholder={isRTL ? "ماذا تريد أن تحقق؟" : "What do you want to achieve?"}
                         value={formData.missionTitle}
                         onChange={(e) => setFormData({ ...formData, missionTitle: e.target.value })}
                         className="w-full bg-white/5 border border-white/5 p-6 md:p-10 rounded-sm text-2xl md:text-4xl outline-none focus:border-[#39FF14]/50 focus:bg-[#39FF14]/5 transition-all placeholder:opacity-10 font-black italic"
                       />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-4">
                          <label className="text-[10px] md:text-xs font-black text-white/30 tracking-[0.3em] uppercase">START_DATE</label>
                          <input 
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 p-5 rounded-sm outline-none focus:border-[#39FF14]/50 transition-all font-space uppercase text-white font-bold"
                          />
                       </div>
                       <div className="space-y-4">
                          <label className="text-[10px] md:text-xs font-black text-white/30 tracking-[0.3em] uppercase">END_DATE</label>
                          <input 
                            type="date"
                            value={formData.endDate}
                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 p-5 rounded-sm outline-none focus:border-[#39FF14]/50 transition-all font-space uppercase text-white font-bold"
                          />
                       </div>
                    </div>

                    <div className="space-y-6">
                       <label className="text-[10px] md:text-xs font-black text-white/30 tracking-[0.3em] uppercase">MISSION_SIZE</label>
                       <div className="grid grid-cols-3 gap-4">
                          {sizes.map(s => (
                            <button
                              key={s.id}
                              onClick={() => setFormData({ ...formData, missionSize: s.id as any })}
                              className={cn(
                                "flex flex-col items-center justify-center p-6 md:p-8 border rounded-sm transition-all group relative overflow-hidden",
                                formData.missionSize === s.id 
                                  ? "bg-white/10" 
                                  : "bg-white/5 border-white/5 hover:border-white/20"
                              )}
                              style={{ borderColor: formData.missionSize === s.id ? s.color : undefined }}
                            >
                              <span className="text-xs md:text-sm font-black tracking-widest uppercase mb-1" style={{ color: formData.missionSize === s.id ? s.color : 'inherit', opacity: formData.missionSize === s.id ? 1 : 0.4 }}>{s.label}</span>
                              <span className="text-[9px] font-bold uppercase opacity-30">{s.cost}</span>
                              {formData.missionSize === s.id && (
                                <motion.div layoutId="size-indicator" className="absolute bottom-0 inset-x-0 h-1" style={{ backgroundColor: s.color, boxShadow: `0 0 15px ${s.color}` }} />
                              )}
                            </button>
                          ))}
                       </div>
                    </div>
                 </div>
               )}

               {/* STEP 3: SYSTEM READY */}
               {currentStep === 2 && (
                 <div className="glass-panel p-8 md:p-12 border-white/10 space-y-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                       <span className="material-symbols-outlined text-9xl">verified_user</span>
                    </div>

                    <div className="space-y-8 relative z-10">
                       <div className="space-y-2">
                          <p className="text-[10px] font-black text-[#39FF14] tracking-widest uppercase opacity-60">OPERATOR_PROFILE</p>
                          <p className="text-2xl md:text-5xl font-black italic uppercase tracking-tighter">{formData.name || 'ANONYMOUS'}</p>
                       </div>
                       
                       <div className="space-y-2">
                          <p className="text-[10px] font-black text-[#39FF14] tracking-widest uppercase opacity-60">PRIMARY_OBJECTIVE</p>
                          <p className="text-xl md:text-3xl font-black italic uppercase text-white/80 leading-tight">{formData.missionTitle || 'NO_TARGET_SET'}</p>
                       </div>

                       <div className="grid grid-cols-2 md:grid-cols-3 gap-8 pt-4">
                          <div>
                             <p className="text-[9px] font-black text-white/30 tracking-widest uppercase">WINDOW</p>
                             <p className="text-xs font-bold">{formData.startDate} // {formData.endDate || 'TBD'}</p>
                          </div>
                          <div>
                             <p className="text-[9px] font-black text-white/30 tracking-widest uppercase">CAPACITY_COST</p>
                             <p className="text-xs font-bold" style={{ color: sizes.find(s => s.id === formData.missionSize)?.color }}>{sizes.find(s => s.id === formData.missionSize)?.cost}</p>
                          </div>
                          <div>
                             <p className="text-[9px] font-black text-white/30 tracking-widest uppercase">AI_COACH</p>
                             <p className="text-xs font-bold">RECRUIT_PROTOCOL</p>
                          </div>
                       </div>
                    </div>

                    <div className="bg-[#39FF14]/5 p-4 border border-[#39FF14]/20 text-[#39FF14] text-[10px] md:text-xs font-bold tracking-wider uppercase text-center animate-pulse">
                      {isRTL ? "جارٍ إعداد الأوامر القتالية..." : "COMPILING_TACTICAL_PROTOCOLS..."}
                    </div>
                 </div>
               )}

               {/* Navigation */}
               <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-6">
                  <div className="flex items-center gap-8">
                    <button 
                      onClick={() => currentStep > 0 && setCurrentStep(prev => prev - 1)}
                      className={cn(
                        "text-[10px] font-black tracking-widest uppercase px-8 py-4 border border-white/10 hover:bg-white/5 transition-all text-white/30 rounded-sm",
                        currentStep === 0 ? "opacity-0 pointer-events-none" : ""
                      )}
                    >
                      {isRTL ? 'رجوع' : 'BACK'}
                    </button>
                  </div>
                  
                  <button 
                    disabled={loading || (currentStep === 0 && !formData.name) || (currentStep === 1 && (!formData.missionTitle || !formData.endDate))}
                    onClick={handleNext}
                    className="w-full md:w-auto flex items-center justify-center gap-10 bg-[#39FF14] text-black px-12 md:px-24 py-6 md:py-8 rounded-sm text-[14px] md:text-[18px] tracking-[0.4em] font-black uppercase hover:scale-105 active:scale-95 transition-all shadow-[0_0_60px_rgba(57,255,20,0.2)] disabled:opacity-20 disabled:grayscale"
                  >
                    {loading ? (isRTL ? 'جاري المزامنة...' : 'SYNCING...') : currentStep === STEPS.length - 1 ? (isRTL ? 'تفعيل النظام' : 'INITIALIZE_SYSTEM') : (isRTL ? 'التالي' : 'NEXT_PHASE')}
                    <span className="material-symbols-outlined text-3xl">arrow_forward</span>
                  </button>
               </div>
            </div>
        </motion.div>
      </AnimatePresence>

      <div className="fixed bottom-8 text-[8px] md:text-[10px] font-space text-white/10 tracking-[1em] uppercase font-black">
        NEURAL_MESH_ESTABLISHED // V8.0
      </div>
    </div>
  )
}
