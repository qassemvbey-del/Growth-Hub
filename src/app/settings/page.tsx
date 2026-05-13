'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Shell from '@/components/layout/Shell'
import { useGrowth } from '@/context/GrowthContext'
import { createClient } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'

export default function SettingsPage() {
  const { profile, setProfile, mounted, t, isRTL } = useGrowth()
  const { showToast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    full_name: '',
    age: '',
    language: 'en',
    ai_name: '',
    gender: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        age: profile.age?.toString() || '',
        language: profile.language || 'en',
        ai_name: profile.ai_name || '',
        gender: profile.gender || ''
      })
    }
  }, [profile])

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name,
        age: formData.age ? parseInt(formData.age) : null,
        language: formData.language,
        ai_name: formData.ai_name,
        gender: formData.gender,
      })
      .eq('id', user.id)

    if (!error) {
      setProfile({ ...profile, ...formData, age: formData.age ? parseInt(formData.age) : null } as any)
      showToast(isRTL ? 'تم حفظ التغييرات بنجاح' : 'SETTINGS_UPDATED_SUCCESSFULLY', 'success')
      if (formData.language !== profile?.language) {
        window.location.reload()
      }
    } else {
      showToast('UPDATE_ERROR', 'error')
    }
    setSaving(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (!mounted) return null

  return (
    <Shell>
      <div className="min-h-[calc(100vh-64px)] p-6 md:p-12 flex flex-col items-center">
        <div className="w-full max-w-2xl space-y-12">
          
          <header className="space-y-4">
            <h1 className="text-4xl md:text-7xl font-black font-space tracking-tighter uppercase italic text-black dark:text-white leading-none">
              {t('settings')}
            </h1>
            <p className="text-[10px] md:text-xs font-space text-neon-green tracking-[0.5em] uppercase font-black opacity-40">
              {isRTL ? 'تخصيص النظام' : 'SYSTEM_CONFIGURATION'} // ID_{profile?.id?.slice(0, 8).toUpperCase()}
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            
            {/* Left Column: Identity */}
            <section className="space-y-8">
              <h3 className="text-xs md:text-sm font-space font-black text-neon-green tracking-[0.3em] uppercase border-b border-black/5 dark:border-white/5 pb-2">
                {isRTL ? 'الهوية' : 'IDENTITY_REF'}
              </h3>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] md:text-xs font-space text-black/40 dark:text-white/20 tracking-widest uppercase font-black">{t('fullName')}</label>
                  <input
                    value={formData.full_name}
                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full bg-black/5 dark:bg-white/[0.02] border border-black/10 dark:border-white/10 p-4 font-space text-base md:text-lg font-black text-black dark:text-white outline-none focus:border-neon-green/50 transition-all uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] md:text-xs font-space text-black/40 dark:text-white/20 tracking-widest uppercase font-black">{t('age')}</label>
                    <input
                      type="number"
                      value={formData.age}
                      onChange={e => setFormData({ ...formData, age: e.target.value })}
                      className="w-full bg-black/5 dark:bg-white/[0.02] border border-black/10 dark:border-white/10 p-4 font-space text-base md:text-lg font-black text-black dark:text-white outline-none focus:border-neon-green/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] md:text-xs font-space text-black/40 dark:text-white/20 tracking-widest uppercase font-black">{t('gender')}</label>
                    <select
                      value={formData.gender || ''}
                      onChange={e => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full bg-black/5 dark:bg-white/[0.02] border border-black/10 dark:border-white/10 p-4 font-space text-base md:text-lg font-black text-black dark:text-white outline-none focus:border-neon-green/50 transition-all appearance-none"
                    >
                      <option value="" disabled>{isRTL ? 'اختر' : 'SELECT'}</option>
                      <option value="Male">{t('male')}</option>
                      <option value="Female">{t('female')}</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] md:text-xs font-space text-black/40 dark:text-white/20 tracking-widest uppercase font-black">{isRTL ? 'اللغة' : 'LANGUAGE'}</label>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'en', label: 'English' },
                      { key: 'ar', label: 'العربية' }
                    ].map(l => (
                      <button
                        key={l.key}
                        onClick={() => setFormData({ ...formData, language: l.key as any })}
                        className={cn(
                          'p-4 border font-space text-sm md:text-base font-black transition-all',
                          formData.language === l.key 
                            ? 'bg-neon-green text-black border-neon-green shadow-[0_0_15px_rgba(57,255,20,0.2)]' 
                            : 'bg-black/5 dark:bg-white/[0.02] border-black/10 dark:border-white/10 text-black/40 dark:text-white/20'
                        )}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Right Column: AI Coach */}
            <section className="space-y-8">
              <h3 className="text-xs md:text-sm font-space font-black text-neon-green tracking-[0.3em] uppercase border-b border-black/5 dark:border-white/5 pb-2">
                {isRTL ? 'المدرب الذكي' : 'AI COACH'}
              </h3>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] md:text-xs font-space text-black/40 dark:text-white/20 tracking-widest uppercase font-black">{t('aiName')}</label>
                  <input
                    value={formData.ai_name}
                    onChange={e => setFormData({ ...formData, ai_name: e.target.value })}
                    className="w-full bg-black/5 dark:bg-white/[0.02] border border-black/10 dark:border-white/10 p-4 font-space text-base md:text-lg font-black text-black dark:text-white outline-none focus:border-neon-green/50 transition-all uppercase"
                  />
                </div>



                <div className="pt-4 space-y-4">
                   <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-neon-green text-black py-5 font-space font-black text-sm md:text-base uppercase tracking-[0.2em] shadow-xl shadow-neon-green/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {saving ? (isRTL ? 'جاري الحفظ...' : 'SAVING...') : t('save')}
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full py-4 border border-red-500/20 text-red-500/60 hover:bg-red-500/10 hover:text-red-500 transition-all font-space font-black text-xs md:text-sm uppercase tracking-widest"
                  >
                    {t('logout')}
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* System Manual Accordion */}
          <section className="w-full pt-16 border-t border-black/5 dark:border-white/5 space-y-10">
            <header className="space-y-2">
              <h2 className="text-2xl font-space font-black tracking-tight text-black dark:text-white uppercase italic">
                SYSTEM<span className="text-neon-green">_MANUAL</span>
              </h2>
              <p className="text-[10px] font-space text-black/40 dark:text-white/30 tracking-[0.4em] uppercase font-black">
                {isRTL ? 'دليل تشغيل النظام' : 'OPERATIONAL PROTOCOLS & CORE LOGIC'}
              </p>
            </header>

            <div className="space-y-4">
              {[
                { 
                  title: isRTL ? 'نظرة عامة على النظام' : 'System Overview', 
                  content: isRTL ? 'Growth Hub هو نظام تشغيل لحياتك، مصمم لتحويل أهدافك إلى طاقة قابلة للقياس.' : 'Growth Hub is your professional Life OS, designed to transform abstract objectives into measurable energy cells.' 
                },
                { 
                  title: isRTL ? 'هيكلية المهمات' : 'Mission Architecture', 
                  content: isRTL ? 'يمكنك إدارة "المهمات المباشرة" (Live Missions) وتحديد أحجامها. كل حجم يغير شكل خلية الطاقة.' : 'Manage your LIVE MISSIONS through a tiered architecture. High-priority objectives manifest as complex geometric cells (Hex, Shard, etc.) on your mission hub.' 
                },
                { 
                  title: isRTL ? 'أوزان المهام والتقدم' : 'Mission Weights & Goals', 
                  content: isRTL ? 'كل "هدف نشط" (Active Goal) له وزن محدد. النظام يحسب التقدم بناءً على مجموع الأوزان.' : 'Every ACTIVE GOAL within a mission has a specific weight. The system calculates real-time accountability by comparing completed weights against the total mission volume.' 
                },
                { 
                  title: isRTL ? 'المدرب الذكي' : 'AI Coach Protocol', 
                  content: isRTL ? 'يراقب النظام أداءك باستمرار. النمط "الشرس" سيعطيك ملاحظات قوية عند التأخر، بينما النمط "الهادئ" سيكون أكثر تشجيعاً.' : 'Select between SAVAGE and GENTLE coaching protocols. The AI monitors your mission velocity and provides real-time feedback based on your chosen intensity.' 
                },
                { 
                  title: isRTL ? 'الرتب والمظاهر' : 'XP & Theme Vaulting', 
                  content: isRTL ? 'تجمع نقاط XP مع كل مهمة تنجزها لتطوير رتبتك وفتح حزم مظاهر بصرية فريدة في الخزنة.' : 'Earn XP through goal completion to elevate your operator rank. Higher ranks grant access to exclusive UI protocols and geometric themes in the THEME VAULT.' 
                },
                { 
                  title: isRTL ? 'خزنة الإنجازات' : 'Legacy Archiving', 
                  content: isRTL ? 'المهمات المكتملة لا تختفي، بل يتم أرشفتها في الخزنة كإنجازات دائمة.' : 'Completed missions are automatically migrated to the LEGACY VAULT. This ensures your history of performance is preserved while keeping your mission hub focused on active objectives.' 
                }
              ].map((item, idx) => (
                <AccordionItem key={idx} title={item.title} content={item.content} />
              ))}
            </div>
          </section>

        </div>
      </div>
    </Shell>
  )
}

function AccordionItem({ title, content }: { title: string, content: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const { currentTheme } = useGrowth()

  return (
    <div className="relative group overflow-hidden">
      {/* Tactical Borders */}
      <div className="absolute top-0 left-0 w-1 h-1 border-t border-l opacity-40 group-hover:opacity-100 transition-opacity" style={{ borderColor: currentTheme.color }} />
      <div className="absolute top-0 right-0 w-1 h-1 border-t border-r opacity-40 group-hover:opacity-100 transition-opacity" style={{ borderColor: currentTheme.color }} />
      <div className="absolute bottom-0 left-0 w-1 h-1 border-b border-l opacity-40 group-hover:opacity-100 transition-opacity" style={{ borderColor: currentTheme.color }} />
      <div className="absolute bottom-0 right-0 w-1 h-1 border-b border-r opacity-40 group-hover:opacity-100 transition-opacity" style={{ borderColor: currentTheme.color }} />

      <div className={cn(
        "border transition-all duration-300 bg-white/50 dark:bg-white/[0.02] rounded-sm",
        isOpen ? "border-black/20 dark:border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.03)]" : "border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10"
      )}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex justify-between items-center p-5 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-start group/btn"
        >
          <span className={cn(
            "font-space font-black text-sm uppercase tracking-wider transition-colors",
            isOpen ? "text-black dark:text-white" : "text-black/60 dark:text-white/40"
          )}>
            {title}
          </span>
          <div className="flex items-center gap-4">
             <div className={cn(
                "w-8 h-[1px] bg-black/5 dark:bg-white/5 transition-all",
                isOpen && "w-12 bg-current opacity-40"
             )} style={{ color: currentTheme.color }} />
             <span 
               className={cn("material-symbols-outlined transition-all duration-500", isOpen ? "rotate-180 scale-125" : "opacity-40")}
               style={{ color: isOpen ? currentTheme.color : undefined, textShadow: isOpen ? `0 0 10px ${currentTheme.color}` : 'none' }}
             >
               expand_more
             </span>
          </div>
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-5 pb-6"
            >
              <div className="h-[1px] w-full bg-black/5 dark:bg-white/5 mb-4" />
              <p className="text-xs font-space text-black/60 dark:text-white/50 leading-relaxed italic border-l-2 pl-4 py-1" style={{ borderColor: `${currentTheme.color}33` }}>
                {content}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
