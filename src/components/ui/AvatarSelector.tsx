'use client'

import { Check, X, Code2, Network, BarChartBig, GraduationCap, Loader2 } from 'lucide-react'
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
    image: "/champions/programmer.png",
    themeColor: "#0ea5e9",
    WatermarkIcon: Code2,
    arDesc: 'تطوير البرمجيات، المواقع، وبناء الأنظمة والحلول الذكية.',
    enDesc: 'Software development, websites, and building systems and smart solutions.',
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
    image: "/champions/network.png",
    themeColor: "#22c55e",
    WatermarkIcon: Network,
    arDesc: 'إدارة البنية التحتية، الشبكات، وتأمين السيرفرات.',
    enDesc: 'Infrastructure management, networks, and securing servers.',
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
    image: "/champions/accountant.png",
    themeColor: "#eab308",
    WatermarkIcon: BarChartBig,
    arDesc: 'التخطيط المالي، إدارة الأصول، وتحليل الحسابات.',
    enDesc: 'Financial planning, asset management, and analyzing accounts.',
    skills: [
      { name: 'Formula Builder', arName: 'صانع المعادلات', rank: 'Silver', arRank: 'سيلفر' },
      { name: 'Financial Analyzer', arName: 'المحلل المالي', rank: 'Gold', arRank: 'جولد' },
      { name: 'Audit Assistant', arName: 'مساعد التدقيق', rank: 'Platinum', arRank: 'بلاتينيوم' }
    ]
  },
  {
    id: 'learner',
    label: 'General Learner',
    arLabel: 'متعلم عام',
    image: "/champions/learner.png",
    themeColor: "#a855f7",
    WatermarkIcon: GraduationCap,
    arDesc: 'الدراسة العامة، تطوير المهارات، وتتبع النمو الشخصي.',
    enDesc: 'General studying, skill development, and tracking personal growth.',
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
  const [chosenClass, setChosenClass] = useState<string>(profile?.champion_class || CLASSES[0].id)
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

  const selectedClassObj = CLASSES.find(c => c.id === chosenClass) || CLASSES[0]

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="absolute inset-0 bg-black/80 backdrop-blur-xl"
          onClick={onClose}
        />

        <motion.div
          className="relative z-10 w-full max-w-[1000px] max-h-[90vh] overflow-y-auto overflow-x-hidden bg-[#0a0a0f] border border-white/10 rounded-2xl shadow-2xl flex flex-col p-6 md:p-8 select-none"
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
            <div className="space-y-1">
              <h2 className="text-xl md:text-2xl font-space font-black text-white tracking-tight">
                {isRTL ? 'اختر تخصصك' : 'Choose Your Class'}
              </h2>
              <p className="text-xs text-zinc-400">
                {isRTL ? 'اختر الهوية المناسبة لمجال عملك اليومي.' : 'Select the specialization that matches your workflow.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Master-Detail Split Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full flex-1">
            
            {/* Left Column: Roster Grid */}
            <div className="col-span-1 md:col-span-4">
              <div className="grid grid-cols-4 md:grid-cols-2 gap-3">
                {CLASSES.map((cls) => {
                  const isSelected = chosenClass === cls.id
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => setChosenClass(cls.id)}
                      className={cn(
                        "aspect-square w-full relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300",
                        isSelected 
                          ? "scale-[1.02] opacity-100 ring-2" 
                          : "grayscale opacity-60 hover:opacity-80 hover:scale-[1.01]"
                      )}
                      style={isSelected ? { 
                        borderColor: cls.themeColor, 
                        boxShadow: `0 0 20px ${cls.themeColor}` 
                      } : {}}
                    >
                      <img 
                        src={cls.image} 
                        alt={cls.label} 
                        className="w-full h-full object-cover" 
                      />
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center shadow-lg border border-black/10" style={{ backgroundColor: cls.themeColor }}>
                          <Check className="text-black text-xs font-bold w-3 h-3" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Right Column: Dynamic Details Panel */}
            <div className="col-span-1 md:col-span-8">
              <div 
                className="relative rounded-xl p-6 md:p-8 bg-black/40 overflow-hidden border border-white/5 flex flex-col justify-between h-full min-h-[340px]"
                style={{
                  background: `radial-gradient(circle at top right, ${selectedClassObj.themeColor}12, transparent 60%)`
                }}
              >
                {/* Massive Watermark Icon */}
                <selectedClassObj.WatermarkIcon 
                  className="text-white/5 opacity-10 absolute -bottom-10 -left-10 pointer-events-none" 
                  size={250} 
                />

                <div className="space-y-6 relative z-10">
                  {/* Title and Description */}
                  <div className="space-y-2">
                    <h3 className="text-2xl md:text-3xl font-space font-black text-white">
                      {isRTL ? selectedClassObj.arLabel : selectedClassObj.label}
                    </h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      {isRTL ? selectedClassObj.arDesc : selectedClassObj.enDesc}
                    </p>
                  </div>

                  {/* Abilities List */}
                  <div className="flex flex-col gap-3 mt-6">
                    {selectedClassObj.skills.map((skill, index) => {
                      const isGold = skill.rank === 'Gold'
                      const isPlatinum = skill.rank === 'Platinum'
                      const badgeColor = isGold 
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
                        : isPlatinum 
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'bg-slate-400/20 text-slate-300 border border-slate-400/30'
                      
                      return (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                        >
                          <span className="text-sm font-medium text-white">
                            {isRTL ? skill.arName : skill.name}
                          </span>
                          <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded", badgeColor)}>
                            {isRTL ? skill.arRank : skill.rank}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Pulsing Lock-in Button */}
                <div className="mt-8 relative z-10">
                  <motion.button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full py-4 rounded-xl font-space font-black text-sm tracking-wider transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer text-black hover:brightness-110 active:scale-[0.99]"
                    style={{
                      backgroundColor: selectedClassObj.themeColor,
                      boxShadow: `0 4px 25px ${selectedClassObj.themeColor}40`,
                    }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    {isSaving ? (
                      <span>{isRTL ? 'جاري حفظ اختيار البطل...' : 'Locking in...'}</span>
                    ) : (
                      <span>{isRTL ? 'تأكيد اختيار البطل' : 'Confirm Champion Selection'}</span>
                    )}
                  </motion.button>
                </div>

              </div>
            </div>

          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
