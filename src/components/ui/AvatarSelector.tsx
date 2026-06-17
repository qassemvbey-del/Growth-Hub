'use client'

import { Check, HelpCircle, Save, X, Laptop, GraduationCap, Code, Globe, Calculator, Loader2, BookOpen } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { useGrowth } from '@/context/GrowthContext'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

const CLASSES = [
  {
    id: 'programmer',
    label: 'Programmer',
    arLabel: 'مبرمج',
    icon: Code,
    desc: 'Software, web, and systems development.',
    arDesc: 'تطوير البرمجيات والمواقع والأنظمة.',
    skills: [
      { name: 'Fix Errors', arName: 'تعديل الأخطاء', rank: 'Silver', arRank: 'سيلفر' },
      { name: 'Code Review', arName: 'مراجعة الكود', rank: 'Gold', arRank: 'جولد' },
      { name: 'Refactor Assistant', arName: 'مساعد الصياغة', rank: 'Platinum', arRank: 'بلاتينيوم' }
    ]
  },
  {
    id: 'network_engineer',
    label: 'Network Engineer',
    arLabel: 'مهندس شبكات',
    icon: Globe,
    desc: 'Infrastructure, routing, and security.',
    arDesc: 'البنية التحتية والتوجيه والحماية.',
    skills: [
      { name: 'Fix Errors', arName: 'تعديل الأخطاء', rank: 'Silver', arRank: 'سيلفر' },
      { name: 'Log Analyzer', arName: 'محلل السجلات', rank: 'Gold', arRank: 'جولد' },
      { name: 'Packet Troubleshooter', arName: 'مستكشف الحزم', rank: 'Platinum', arRank: 'بلاتينيوم' }
    ]
  },
  {
    id: 'accountant',
    label: 'Accountant',
    arLabel: 'محاسب',
    icon: Calculator,
    desc: 'Financial planning, books, and analysis.',
    arDesc: 'التخطيط المالي والدفاتر والتحليل.',
    skills: [
      { name: 'Formula Builder', arName: 'صانع المعادلات', rank: 'Silver', arRank: 'سيلفر' },
      { name: 'Financial Analyzer', arName: 'المحلل المالي', rank: 'Gold', arRank: 'جولد' },
      { name: 'Audit Assistant', arName: 'مساعد التدقيق', rank: 'Platinum', arRank: 'بلاتينيوم' }
    ]
  },
  {
    id: 'learner',
    label: 'Learner',
    arLabel: 'متعلم عام',
    icon: GraduationCap,
    desc: 'General study, skills, and growth.',
    arDesc: 'الدراسة العامة والمهارات والنمو الشخصي.',
    skills: [
      { name: 'Concept Simplifier', arName: 'مبسط المفاهيم', rank: 'Silver', arRank: 'سيلفر' },
      { name: 'Study Assistant', arName: 'مساعد الدراسة', rank: 'Gold', arRank: 'جولد' },
      { name: 'Deep Explainer', arName: 'الشرح العميق', rank: 'Platinum', arRank: 'بلاتينيوم' }
    ]
  }
]

interface Props {
  onClose: () => void
  onSaved?: (url: string) => void
}

export default function AvatarSelector({ onClose, onSaved }: Props) {
  const { profile, setProfile, currentTheme, isRTL } = useGrowth()
  const { showToast } = useToast()
  const [chosenClass, setChosenClass] = useState<string | null>(profile?.champion_class || null)
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  const handleSave = async () => {
    if (!profile?.id || !chosenClass) return
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          champion_class: chosenClass,
          onboarded: true
        })
        .eq('id', profile.id)

      if (error) throw error

      const updatedProfile = {
        ...profile,
        champion_class: chosenClass as any,
        onboarded: true
      }
      setProfile(updatedProfile)

      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('cached_profile')
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            parsed.champion_class = chosenClass
            parsed.onboarded = true
            localStorage.setItem('cached_profile', JSON.stringify(parsed))
          } catch (e) {}
        } else {
          localStorage.setItem('cached_profile', JSON.stringify(updatedProfile))
        }
      }

      showToast(isRTL ? 'تم تحديث التخصص بنجاح!' : 'Class updated successfully!', 'success')
      onSaved?.(profile.avatar_url || '')
      onClose()
    } catch (err) {
      console.error('Save class error:', err)
      showToast(isRTL ? 'فشل تحديث التخصص، يرجى المحاولة مرة أخرى' : 'Update failed', 'warning')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="absolute inset-0 bg-white/60 dark:bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div
          className="relative z-10 w-full max-w-4xl rounded-3xl overflow-hidden bg-white/80 dark:bg-[#0c0c14]/90 backdrop-blur-2xl border border-zinc-200/50 dark:border-white/10 shadow-2xl flex flex-col max-h-[90vh]"
          style={{
            boxShadow: `0 0 60px ${currentTheme.color}33, inset 0 0 30px ${currentTheme.color}15`,
          }}
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
        >
          <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, transparent, ${currentTheme.color}, transparent)` }} />

          <div className="p-6 md:p-8 flex-1 overflow-y-auto scrollbar-thin space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  <p className="text-[10px] font-space tracking-[0.4em] uppercase font-black" style={{ color: currentTheme.color }}>
                    {isRTL ? 'إعداد التخصص المهني // Class Selection' : 'Identity Setup // Class Selection'}
                  </p>
                </div>
                <h2 className="text-xl md:text-2xl font-space font-black text-zinc-900 dark:text-white uppercase tracking-wider">
                  {isRTL ? 'اختر تخصصك المهني (Class)' : 'Choose Your Class'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center text-zinc-600 dark:text-white/60 hover:text-zinc-900 dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
              >
                <X className="text-xl font-bold w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CLASSES.map((cls) => {
                const ClassIcon = cls.icon
                const isSelected = chosenClass === cls.id
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => setChosenClass(cls.id)}
                    className={cn(
                      "relative flex flex-col items-start p-5 rounded-2xl border transition-all duration-300 group cursor-pointer bg-white/60 dark:bg-black/40 backdrop-blur-md text-left w-full",
                      isSelected 
                        ? "border-emerald-500/50 bg-emerald-950/10 ring-2 ring-emerald-500/20" 
                        : "border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/15"
                    )}
                    style={isSelected ? { borderColor: currentTheme.color } : {}}
                  >
                    <div className="flex items-center gap-3 mb-2 w-full">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center border transition-colors shrink-0"
                        style={{ 
                          borderColor: isSelected ? currentTheme.color : 'rgba(150,150,150,0.1)',
                          backgroundColor: isSelected ? `${currentTheme.color}15` : 'transparent'
                        }}
                      >
                        <ClassIcon className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" style={isSelected ? { color: currentTheme.color } : {}} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-space font-black tracking-wider uppercase text-zinc-900 dark:text-white block">
                          {isRTL ? cls.arLabel : cls.label}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-space leading-relaxed mb-4">
                      {isRTL ? cls.arDesc : cls.desc}
                    </p>

                    <div className="w-full border-t border-zinc-200 dark:border-white/5 pt-3 space-y-2">
                      <span className="text-[9px] font-mono tracking-widest text-zinc-400 dark:text-zinc-500 uppercase block mb-1">
                        {isRTL ? 'المهارات التكتيكية المتاحة:' : 'Tactical Skills:'}
                      </span>
                      <div className="grid grid-cols-1 gap-1.5 w-full">
                        {cls.skills.map((s, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[10px] font-space text-zinc-500 dark:text-zinc-400 bg-black/10 dark:bg-black/20 px-2.5 py-1 rounded-lg border border-white/5">
                            <span className="font-bold">{isRTL ? s.arName : s.name}</span>
                            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                              {isRTL ? s.arRank : s.rank}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="absolute top-4 right-4 w-5 h-5 rounded-full flex items-center justify-center shadow-lg border border-black/20" style={{ backgroundColor: currentTheme.color }}>
                        <Check className="text-black text-xs font-bold w-3 h-3" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="pt-4 border-t border-zinc-200 dark:border-white/10">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !chosenClass}
                className="w-full py-3.5 rounded-xl font-space font-black text-xs tracking-[0.2em] uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.01] active:scale-[0.99] cursor-pointer border border-white/20 hover:border-white/40"
                style={{
                  background: chosenClass ? currentTheme.color : '#71717a',
                  color: '#000000',
                  boxShadow: chosenClass ? `0 4px 30px ${currentTheme.color}66` : 'none',
                }}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span className="font-bold">{isRTL ? 'جارٍ الحفظ والمزامنة...' : 'Saving and Syncing...'}</span>
                  </>
                ) : (
                  <>
                    <Save className="text-lg font-bold w-4 h-4" />
                    <span className="font-bold">{isRTL ? 'تأكيد وحفظ التخصيص' : 'Confirm Class Selection'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
