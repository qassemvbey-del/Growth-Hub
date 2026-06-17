'use client'

import { Check, HelpCircle, Save, User, X, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { useGrowth } from '@/context/GrowthContext'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

interface Props {
  onClose: () => void
  onSaved?: (url: string) => void
}

export default function AvatarSelector({ onClose, onSaved }: Props) {
  const { profile, setProfile, currentTheme, isRTL } = useGrowth()
  const { showToast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  // Single-step state: currently selected preset ID
  // Resolved default: if no champion class is chosen, fall back to 'google'
  const initialPreset = profile?.champion_class === 'programmer' 
    ? 'omar' 
    : profile?.champion_class === 'network_engineer' 
      ? 'zain' 
      : 'google'

  const [selectedPreset, setSelectedPreset] = useState<'google' | 'omar' | 'zain'>(initialPreset)

  const presets = [
    {
      id: 'google' as const,
      label: isRTL ? 'حساب جوجل (الافتراضي)' : 'Google Profile (Default)',
      sub: isRTL ? 'ملف شخصي أساسي' : 'Standard Profile',
      desc: isRTL ? 'ملف شخصي قياسي نظيف بدون تخصص إضافي.' : 'Clean, unassigned standard profile.',
      avatarUrl: profile?.google_avatar_url || '/avatars/nour.svg',
      championClass: undefined,
      role: 'learner',
      skills: [
        isRTL ? 'منهج ذكي' : 'AI Checklist',
        isRTL ? 'شرح الموضوع' : 'Explain Topic',
        isRTL ? 'اسأل المساعد' : 'Ask AI'
      ]
    },
    {
      id: 'omar' as const,
      label: isRTL ? 'عمر (مبرمج)' : 'Omar (Programmer)',
      sub: isRTL ? 'مطور برمجيات وأنظمة' : 'Software Developer',
      desc: isRTL ? 'متخصص في تطوير المواقع والأنظمة وتصحيح الأخطاء البرمجية.' : 'Software, web, and systems development specialist.',
      avatarUrl: '/avatars/omar.svg',
      championClass: 'programmer' as const,
      role: 'programmer',
      skills: [
        isRTL ? 'منهج ذكي' : 'AI Checklist',
        isRTL ? 'شرح الموضوع' : 'Explain Topic',
        isRTL ? 'اسأل المساعد' : 'Ask AI',
        isRTL ? 'مصحح الأخطاء' : 'Code Debugger',
        isRTL ? 'مساعد إعادة الصياغة' : 'Refactor Assistant',
        isRTL ? 'مراجعة المعمارية' : 'Architecture Review'
      ]
    },
    {
      id: 'zain' as const,
      label: isRTL ? 'زين (مهندس شبكات)' : 'Zain (Network Engineer)',
      sub: isRTL ? 'متخصص بنية تحتية وأمن' : 'Infrastructure Specialist',
      desc: isRTL ? 'متخصص في الشبكات والتحكم في الخوادم وفحص سجلات سيسكو.' : 'Infrastructure, routing, and security automation specialist.',
      avatarUrl: '/avatars/zain.svg',
      championClass: 'network_engineer' as const,
      role: 'network_engineer',
      skills: [
        isRTL ? 'منهج ذكي' : 'AI Checklist',
        isRTL ? 'شرح الموضوع' : 'Explain Topic',
        isRTL ? 'اسأل المساعد' : 'Ask AI',
        isRTL ? 'مصحح أخطاء الشبكة' : 'Fix Errors Debugger',
        isRTL ? 'محلل سجلات سيسكو' : 'Cisco Log Analyzer',
        isRTL ? 'مستكشف الحزم' : 'Packet Troubleshooter'
      ]
    }
  ]

  const handleSave = async () => {
    if (!profile?.id) return
    setIsSaving(true)

    const preset = presets.find(p => p.id === selectedPreset)
    if (!preset) return

    try {
      // 1. Update user_metadata in Supabase auth for reliable persistence
      const { error: authError } = await supabase.auth.updateUser({
        data: { 
          custom_avatar: preset.id === 'google' ? null : preset.avatarUrl,
          role: preset.role,
          champion_class: preset.championClass
        }
      })

      if (authError) {
        console.error('Auth updateUser error:', authError)
        showToast(isRTL ? 'فشل تحديث الشخصية، يرجى المحاولة مرة أخرى' : 'Update failed', 'warning')
        setIsSaving(false)
        return
      }

      // Determine final avatar url
      const finalAvatarUrl = preset.id === 'google' 
        ? (profile.google_avatar_url || '/avatars/nour.svg') 
        : preset.avatarUrl

      // Determine fallback rank (Always Silver or above, no Recruit)
      const finalRank = profile.rank && profile.rank !== 'RECRUIT' ? profile.rank : 'SILVER'

      // 2. Update profiles table in database
      const { error } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: finalAvatarUrl, 
          custom_avatar: preset.id === 'google' ? null : preset.avatarUrl,
          role: preset.role,
          champion_class: preset.championClass,
          rank: finalRank,
          onboarded: true
        })
        .eq('id', profile.id)

      if (error) throw error

      // 3. Update React context immediately
      const updatedProfile = {
        ...profile,
        avatar_url: finalAvatarUrl,
        custom_avatar: preset.id === 'google' ? null : preset.avatarUrl,
        role: preset.role,
        champion_class: preset.championClass,
        rank: finalRank,
        onboarded: true
      }
      setProfile(updatedProfile)

      // 4. Cache updated profile locally
      if (typeof window !== 'undefined') {
        localStorage.setItem('cached_profile', JSON.stringify(updatedProfile))
      }

      showToast(isRTL ? 'تم تحديث الشخصية بنجاح!' : 'Profile updated successfully!', 'success')
      onSaved?.(finalAvatarUrl)
      onClose()
    } catch (err) {
      console.error('Save avatar error:', err)
      showToast(isRTL ? 'فشل تحديث الشخصية، يرجى المحاولة مرة أخرى' : 'Update failed', 'warning')
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
          className="relative z-10 w-full max-w-5xl rounded-3xl overflow-hidden bg-white/80 dark:bg-[#090910]/90 backdrop-blur-2xl border border-zinc-200/50 dark:border-white/10 shadow-2xl flex flex-col max-h-[90vh]"
          style={{
            boxShadow: `0 0 60px ${currentTheme.color}33, inset 0 0 30px ${currentTheme.color}15`,
          }}
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
        >
          <div className="h-1.5 w-full shrink-0" style={{ background: `linear-gradient(90deg, transparent, ${currentTheme.color}, transparent)` }} />

          <div className="p-6 md:p-8 flex-1 overflow-y-auto scrollbar-thin space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  <p className="text-[10px] font-space tracking-[0.4em] uppercase font-black" style={{ color: currentTheme.color }}>
                    {isRTL ? `اختيار الهوية المهنية` : `Choose Professional Identity`}
                  </p>
                </div>
                <h2 className="text-xl md:text-2xl font-space font-black text-zinc-900 dark:text-white uppercase tracking-wider">
                  {isRTL ? 'حدد شخصيتك المهنية والمزامنة الذكية' : 'Select User Persona'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center text-zinc-600 dark:text-white/60 hover:text-zinc-900 dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
              >
                <X className="text-xl font-bold w-5 h-5" />
              </button>
            </div>

            {/* Persona Grid (3 columns) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {presets.map((preset) => {
                const isSelected = selectedPreset === preset.id
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPreset(preset.id)}
                    className={cn(
                      "relative flex flex-col items-stretch p-5 rounded-2xl border transition-all duration-300 group cursor-pointer text-left w-full h-full justify-between bg-zinc-950/40 backdrop-blur-md",
                      isSelected 
                        ? "ring-2 ring-orange-500 ring-offset-2 ring-offset-zinc-100 dark:ring-offset-black" 
                        : "border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20"
                    )}
                    style={isSelected ? { borderColor: currentTheme.color } : {}}
                  >
                    <div className="space-y-4">
                      {/* Portrait Header Graphic */}
                      <div className="w-full h-36 rounded-xl overflow-hidden relative border border-white/5 bg-gradient-to-br from-zinc-900 via-black to-zinc-900 flex items-center justify-center">
                        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_4px] opacity-30" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
                        
                        {/* Portrait Image Representation */}
                        {preset.id === 'google' && !profile?.google_avatar_url ? (
                          <User className="w-12 h-12 text-zinc-600 dark:text-zinc-500" />
                        ) : (
                          <img 
                            src={preset.avatarUrl} 
                            alt={preset.label} 
                            className="w-16 h-16 rounded-full border border-white/10 p-1 shadow-2xl relative z-10 transition-transform duration-500 group-hover:scale-110" 
                          />
                        )}
                        
                        <div className="absolute bottom-3 left-3 z-10">
                          <span className="text-[9px] font-space tracking-widest text-zinc-400 uppercase font-black block">
                            {preset.sub}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-sm font-space font-black tracking-wider uppercase text-zinc-900 dark:text-white block">
                          {preset.label}
                        </span>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-space leading-relaxed min-h-[32px]">
                          {preset.desc}
                        </p>
                      </div>

                      {/* Included Skills List */}
                      <div className="border-t border-white/5 pt-3 space-y-2">
                        <span className="text-[9px] font-mono tracking-widest uppercase text-zinc-500 block">
                          {isRTL ? 'القدرات المدرجة:' : 'Included Skills:'}
                        </span>
                        <div className="space-y-1.5 pl-0.5">
                          {preset.skills.map((skill, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span className="text-[10px] font-space text-zinc-400 dark:text-zinc-300 font-medium">
                                {skill}
                              </span>
                            </div>
                          ))}
                        </div>
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

            {/* Confirm Button */}
            <div className="pt-4 border-t border-zinc-200 dark:border-white/10 flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="w-full md:w-auto px-8 py-3.5 rounded-xl font-space font-black text-xs tracking-[0.2em] uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.01] active:scale-[0.99] cursor-pointer border border-white/20 hover:border-white/40"
                style={{
                  background: currentTheme.color,
                  color: '#000000',
                  boxShadow: `0 4px 30px ${currentTheme.color}66`,
                }}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span className="font-bold">{isRTL ? 'جارٍ الحفظ والمزامنة...' : 'Saving...'}</span>
                  </>
                ) : (
                  <>
                    <span className="font-bold">{isRTL ? 'تأكيد وحفظ التعديلات' : 'Confirm Selection'}</span>
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
