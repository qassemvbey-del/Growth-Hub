'use client'

import { Check, X, Code, Globe, Calculator, GraduationCap, Loader2 } from 'lucide-react'
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
    arDesc: 'تطوير البرمجيات، المواقع، وبناء الأنظمة والحلول الذكية.',
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
    arDesc: 'إدارة البنية التحتية، الشبكات، وتأمين السيرفرات.',
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
    arDesc: 'التخطيط المالي، إدارة الأصول، وتحليل الحسابات.',
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
    arDesc: 'الدراسة العامة، تطوير المهارات، وتتبع النمو الشخصي.',
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
          className="absolute inset-0 bg-black/60 dark:bg-black/90 backdrop-blur-xl"
          onClick={onClose}
        />

        <motion.div
          className="relative z-10 w-full max-w-3xl rounded-3xl overflow-hidden bg-white/95 dark:bg-[#0c0c14]/95 border border-zinc-200/50 dark:border-white/10 shadow-2xl flex flex-col max-h-[85vh] p-6 md:p-8"
          style={{
            boxShadow: `0 0 60px ${currentTheme.color}25, inset 0 0 30px ${currentTheme.color}08`,
          }}
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-200/50 dark:border-white/5">
            <div className="space-y-1">
              <h2 className="text-xl md:text-2xl font-space font-black text-zinc-900 dark:text-white tracking-tight">
                {isRTL ? 'اختر تخصصك' : 'Choose Your Class'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {isRTL ? 'اختر الهوية المناسبة لمجال عملك اليومي.' : 'Select the specialization that matches your workflow.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6 overflow-y-auto pr-1 flex-1 scrollbar-thin">
            {CLASSES.map((cls) => {
              const ClassIcon = cls.icon
              const isSelected = chosenClass === cls.id
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => setChosenClass(cls.id)}
                  className={cn(
                    "relative flex flex-col items-start p-5 rounded-2xl border transition-all duration-300 group cursor-pointer bg-zinc-50/50 dark:bg-white/[0.01] text-left w-full",
                    isSelected 
                      ? "bg-zinc-100/80 dark:bg-white/[0.04] border-emerald-500/50 ring-1 ring-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                      : "border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10 hover:bg-zinc-100/20 dark:hover:bg-white/[0.02]"
                  )}
                  style={isSelected ? { borderColor: currentTheme.color, boxShadow: `0 0 15px ${currentTheme.color}18` } : {}}
                >
                  {/* Icon & Title */}
                  <div className="flex items-center gap-3 mb-3 w-full">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center border transition-all shrink-0 bg-black/5 dark:bg-white/5"
                      style={isSelected ? { 
                        borderColor: currentTheme.color,
                        backgroundColor: `${currentTheme.color}15`
                      } : {}}
                    >
                      <ClassIcon 
                        className={cn(
                          "w-5 h-5 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-transform duration-300 shrink-0",
                          isSelected && "scale-105"
                        )} 
                        style={isSelected ? { color: currentTheme.color } : {}} 
                      />
                    </div>
                    <span className="text-sm font-space font-black tracking-wide text-zinc-800 dark:text-zinc-200 block">
                      {isRTL ? cls.arLabel : cls.label}
                    </span>
                  </div>

                  {/* Arabic description (Fixed layout/translation) */}
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-space leading-relaxed mb-4" dir="rtl">
                    {cls.arDesc}
                  </p>

                  {/* Vertically Stacked Pills for Skills */}
                  <div className="w-full space-y-1.5 pt-3 border-t border-zinc-200/50 dark:border-white/5">
                    {cls.skills.map((s, idx) => (
                      <div 
                        key={idx} 
                        className="flex justify-between items-center text-[10px] font-space text-zinc-600 dark:text-zinc-400 bg-zinc-200/40 dark:bg-white/[0.02] px-3 py-1.5 rounded-lg border-none w-full"
                      >
                        <span className="font-semibold">{isRTL ? s.arName : s.name}</span>
                        <span 
                          className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-zinc-300/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                          style={isSelected ? { color: currentTheme.color } : {}}
                        >
                          {isRTL ? s.arRank : s.rank}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Selected checkmark */}
                  {isSelected && (
                    <div className="absolute top-4 right-4 w-5 h-5 rounded-full flex items-center justify-center shadow-lg border border-black/10" style={{ backgroundColor: currentTheme.color }}>
                      <Check className="text-black text-xs font-bold w-3 h-3" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Footer CTA */}
          <div className="pt-4 border-t border-zinc-200/50 dark:border-white/5">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !chosenClass}
              className="w-full py-3.5 rounded-xl font-space font-black text-xs tracking-wider transition-all disabled:opacity-50 flex items-center justify-center shadow-2xl hover:scale-[1.01] active:scale-[0.99] cursor-pointer border border-white/20 hover:border-white/40"
              style={{
                background: chosenClass ? currentTheme.color : '#71717a',
                color: '#000000',
                boxShadow: chosenClass ? `0 4px 30px ${currentTheme.color}35` : 'none',
              }}
            >
              {isSaving ? (
                <span>{isRTL ? 'جاري الحفظ...' : 'Saving...'}</span>
              ) : (
                <span>{isRTL ? 'تأكيد الاختيار' : 'Confirm Selection'}</span>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
