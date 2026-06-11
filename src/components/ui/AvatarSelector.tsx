'use client'

import { Check, HelpCircle, RefreshCw, Save, User, X, Laptop, GraduationCap, Briefcase, Rocket, Video, TrendingUp, Code, Globe, Calculator, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { useGrowth } from '@/context/GrowthContext'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

const CUSTOM_SVGS = [
  { id: 'omar', label: 'Omar', arLabel: 'عمر', gender: 'male', sub: 'Programmer', arSub: 'مبرمج', icon: 'laptop_mac' },
  { id: 'maya', label: 'Maya', arLabel: 'مايا', gender: 'female', sub: 'Learner', arSub: 'متعلم', icon: 'school' },
  { id: 'ismail', label: 'Ismail', arLabel: 'إسماعيل', gender: 'male', sub: 'Freelancer', arSub: 'مستقل', icon: 'work' },
  { id: 'zain', label: 'Zain', arLabel: 'زين', gender: 'male', sub: 'Startup', arSub: 'رائد أعمال', icon: 'rocket_launch' },
  { id: 'menna', label: 'Menna', arLabel: 'منة', gender: 'female', sub: 'Content Creator', arSub: 'صانعة محتوى', icon: 'videocam' },
  { id: 'nour', label: 'Nour', arLabel: 'نور', gender: 'female', sub: 'Professional', arSub: 'موظف', icon: 'trending_up' },
]

const CLASSES = [
  { id: 'programmer', label: 'Programmer', arLabel: 'مبرمج', icon: Laptop, desc: 'Software, web, and systems development.', arDesc: 'تطوير البرمجيات والمواقع والأنظمة.' },
  { id: 'network_engineer', label: 'Network Engineer', arLabel: 'Network Engineer', arLabelAlt: 'مهندس شبكات', icon: Globe, desc: 'Infrastructure, routing, and security.', arDesc: 'البنية التحتية والتوجيه والحماية.' },
  { id: 'accountant', label: 'Accountant', arLabel: 'محاسب', icon: Calculator, desc: 'Financial planning, books, and analysis.', arDesc: 'التخطيط المالي والدفاتر والتحليل.' },
  { id: 'general_learner', label: 'General Learner', arLabel: 'متعلم عام', icon: GraduationCap, desc: 'General study, skills, and growth.', arDesc: 'الدراسة العامة والمهارات والنمو الشخصي.' }
]

interface Props {
  onClose: () => void
  onSaved?: (url: string) => void
}

export default function AvatarSelector({ onClose, onSaved }: Props) {
  const { profile, setProfile, currentTheme, isRTL } = useGrowth()
  const { showToast } = useToast()
  const [step, setStep] = useState<1 | 2>(1)
  const [chosenRole, setChosenRole] = useState<string | null>(profile?.role || null)
  const [selected, setSelected] = useState<string | null>(profile?.custom_avatar || null)
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  const handleSave = async () => {
    if (!profile?.id || !chosenRole) return
    setIsSaving(true)
    try {
      const { error: authError } = await supabase.auth.updateUser({
        data: { custom_avatar: selected, role: chosenRole }
      })

      if (authError) {
        console.error('Auth updateUser error:', authError)
        showToast(isRTL ? 'فشل تحديث الشخصية، يرجى المحاولة مرة أخرى' : 'Update failed', 'warning')
        setIsSaving(false)
        return
      }

      const defaultAvatar = (profile?.gender === 'female' || profile?.gender === 'أنثى' || profile?.gender === 'Female') ? '/avatars/menna.svg' : '/avatars/omar.svg'
      const targetAvatarUrl = selected || profile.google_avatar_url || defaultAvatar
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: targetAvatarUrl, 
          custom_avatar: selected,
          role: chosenRole,
          onboarded: true
        })
        .eq('id', profile.id)

      if (error) {
        throw error
      }

      const updatedProfile = {
        ...profile,
        custom_avatar: selected,
        avatar_url: targetAvatarUrl,
        role: chosenRole,
        onboarded: true
      }
      setProfile(updatedProfile)

      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('cached_profile')
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            parsed.custom_avatar = selected
            parsed.avatar_url = targetAvatarUrl
            parsed.role = chosenRole
            parsed.onboarded = true
            localStorage.setItem('cached_profile', JSON.stringify(parsed))
          } catch (e) {}
        } else {
          localStorage.setItem('cached_profile', JSON.stringify(updatedProfile))
        }
      }

      showToast(isRTL ? 'تم تحديث الشخصية بنجاح!' : 'Profile updated successfully!', 'success')
      onSaved?.(targetAvatarUrl)
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
          className="relative z-10 w-full max-w-2xl rounded-3xl overflow-hidden bg-white/80 dark:bg-black/80 backdrop-blur-2xl border border-zinc-200/50 dark:border-white/10 shadow-2xl flex flex-col max-h-[90vh]"
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
                    {isRTL ? `خطوة ${step} من ٢ // إعداد الهوية` : `Step ${step} of 2 // Customize Identity`}
                  </p>
                </div>
                <h2 className="text-xl md:text-2xl font-space font-black text-zinc-900 dark:text-white uppercase tracking-wider">
                  {step === 1 
                    ? (isRTL ? 'اختر تخصصك المهني (Class)' : 'Choose Your Class') 
                    : (isRTL ? 'اختر الشخصية البصرية الخاصة بك' : 'Choose Your Avatar')}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center text-zinc-600 dark:text-white/60 hover:text-zinc-900 dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
              >
                <X className="text-xl font-bold w-5 h-5" />
              </button>
            </div>

            {step === 1 ? (
              /* Step 1: Class Selection */
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {CLASSES.map((cls) => {
                    const ClassIcon = cls.icon
                    const isSelected = chosenRole === cls.id
                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => setChosenRole(cls.id)}
                        className={cn(
                          "relative flex flex-col items-start p-5 rounded-2xl border transition-all duration-300 group cursor-pointer bg-white/60 dark:bg-black/60 backdrop-blur-md text-left w-full",
                          isSelected 
                            ? "ring-2 ring-orange-500 ring-offset-2 ring-offset-zinc-100 dark:ring-offset-black" 
                            : "border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20"
                        )}
                        style={isSelected ? { borderColor: currentTheme.color } : {}}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center border transition-colors"
                            style={{ 
                              borderColor: isSelected ? currentTheme.color : 'rgba(150,150,150,0.2)',
                              backgroundColor: isSelected ? `${currentTheme.color}15` : 'transparent'
                            }}
                          >
                            <ClassIcon className="w-5 h-5" style={{ color: isSelected ? currentTheme.color : 'inherit' }} />
                          </div>
                          <span className="text-sm font-space font-black tracking-wider uppercase text-zinc-900 dark:text-white block">
                            {isRTL ? cls.arLabel : cls.label}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-space leading-relaxed">
                          {isRTL ? cls.arDesc : cls.desc}
                        </p>

                        {isSelected && (
                          <div className="absolute top-4 right-4 w-5 h-5 rounded-full flex items-center justify-center shadow-lg border border-black/20" style={{ backgroundColor: currentTheme.color }}>
                            <Check className="text-black text-xs font-bold w-3 h-3" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>

                <div className="pt-4 border-t border-zinc-200 dark:border-white/10 flex justify-end">
                  <button
                    type="button"
                    disabled={!chosenRole}
                    onClick={() => setStep(2)}
                    className="px-6 py-3 rounded-xl font-space font-black text-xs tracking-[0.2em] uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-2xl hover:scale-[1.01] active:scale-[0.99] cursor-pointer border border-white/20 hover:border-white/40"
                    style={{
                      background: chosenRole ? currentTheme.color : '#71717a',
                      color: '#000000',
                      boxShadow: chosenRole ? `0 4px 30px ${currentTheme.color}66` : 'none',
                    }}
                  >
                    <span className="font-bold">{isRTL ? 'التالي' : 'Next'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* Step 2: Avatar Selection */
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Google Profile */}
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className={cn(
                      "relative flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-300 group cursor-pointer bg-white/60 dark:bg-black/60 backdrop-blur-md aspect-square text-center w-full",
                      selected === null 
                        ? "ring-2 ring-orange-500 ring-offset-2 ring-offset-zinc-100 dark:ring-offset-black" 
                        : "border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20"
                    )}
                    style={selected === null ? { borderColor: currentTheme.color } : {}}
                  >
                    <div className="relative w-16 h-16 rounded-full flex items-center justify-center p-1 transition-transform duration-500 group-hover:scale-105 mb-2">
                      <div className="w-full h-full rounded-full overflow-hidden border border-zinc-300 dark:border-white/20 bg-zinc-100/80 dark:bg-white/10 flex items-center justify-center">
                        {profile?.google_avatar_url ? (
                          <img src={profile.google_avatar_url} alt="Google Auth" className="w-[90%] h-[90%] mx-auto object-contain p-1 rounded-full" />
                        ) : (
                          <User className="text-zinc-400 dark:text-white/40 w-8 h-8" />
                        )}
                      </div>
                    </div>

                    <span className="text-xs font-space font-black tracking-wider uppercase text-zinc-900 dark:text-white block truncate w-full">
                      {isRTL ? 'حساب جوجل' : 'Google Profile'}
                    </span>
                  </button>

                  {/* Custom SVG Avatars */}
                  {CUSTOM_SVGS.map((avatar) => {
                    const avatarUrl = `/avatars/${avatar.id}.svg`
                    const isActive = selected === avatarUrl
                    return (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => setSelected(avatarUrl)}
                        className={cn(
                          "relative flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-300 group cursor-pointer bg-white/60 dark:bg-black/60 backdrop-blur-md aspect-square text-center w-full",
                          isActive 
                            ? "ring-2 ring-orange-500 ring-offset-2 ring-offset-zinc-100 dark:ring-offset-black" 
                            : "border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20"
                        )}
                        style={isActive ? { borderColor: currentTheme.color } : {}}
                      >
                        <div className="relative w-16 h-16 rounded-full flex items-center justify-center p-1 transition-transform duration-500 group-hover:scale-105 mb-2">
                          <div className="w-full h-full rounded-full overflow-hidden border border-zinc-300 dark:border-white/20 bg-zinc-100/80 dark:bg-white/10 flex items-center justify-center">
                            <img src={avatarUrl} alt={avatar.label} className="w-[90%] h-[90%] mx-auto object-contain p-1" />
                          </div>
                        </div>

                        <span className="text-xs font-space font-black tracking-wider uppercase text-zinc-900 dark:text-white block truncate w-full">
                          {isRTL ? avatar.arLabel : avatar.label}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div className="pt-4 border-t border-zinc-200 dark:border-white/10 flex justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-6 py-3 rounded-xl font-space font-black text-xs tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2 border border-zinc-300 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-zinc-700 dark:text-white"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="font-bold">{isRTL ? 'السابق' : 'Back'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 py-3 rounded-xl font-space font-black text-xs tracking-[0.2em] uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.01] active:scale-[0.99] cursor-pointer border border-white/20 hover:border-white/40"
                    style={{
                      background: currentTheme.color,
                      color: '#000000',
                      boxShadow: `0 4px 30px ${currentTheme.color}66`,
                    }}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                        <span className="font-bold">{isRTL ? 'جارٍ الحفظ...' : 'Saving...'}</span>
                      </>
                    ) : (
                      <>
                        <Save className="text-lg font-bold w-4 h-4" />
                        <span className="font-bold">{isRTL ? 'تأكيد وحفظ التعديلات' : 'Confirm Selection'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/*
PREVIOUS_ACTIVE_AVATAR_SELECTOR_CODE:
interface LegacyProps {
  onClose: () => void
  onSaved?: (url: string) => void
}
function LegacyAvatarSelector({ onClose, onSaved }: LegacyProps) {
  // original active code left here commented out for safety rules reference
}
*/

/*
ORIGINAL_UNTOUCHED_CODE_FOR_REFERENCE:
'use client'

import { Check, HelpCircle, RefreshCw, Save, User, X, Laptop, GraduationCap, Briefcase, Rocket, Video, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { useGrowth } from '@/context/GrowthContext'
import { useToast } from '@/components/ui/Toast'

const CUSTOM_SVGS = [
  { id: 'omar', label: 'Omar', arLabel: 'عمر', gender: 'male', sub: 'Programmer', arSub: 'مبرمج', icon: 'laptop_mac' },
  { id: 'maya', label: 'Maya', arLabel: 'مايا', gender: 'female', sub: 'Learner', arSub: 'متعلم', icon: 'school' },
  { id: 'ismail', label: 'Ismail', arLabel: 'إسماعيل', gender: 'male', sub: 'Freelancer', arSub: 'مستقل', icon: 'work' },
  { id: 'zain', label: 'Zain', arLabel: 'زين', gender: 'male', sub: 'Startup', arSub: 'رائد أعمال', icon: 'rocket_launch' },
  { id: 'menna', label: 'Menna', arLabel: 'منة', gender: 'female', sub: 'Content Creator', arSub: 'صانعة محتوى', icon: 'videocam' },
  { id: 'nour', label: 'Nour', arLabel: 'نور', gender: 'female', sub: 'Professional', arSub: 'موظف', icon: 'trending_up' },
]

const IconMap: Record<string, React.ComponentType<any>> = {
  laptop_mac: Laptop,
  school: GraduationCap,
  work: Briefcase,
  rocket_launch: Rocket,
  videocam: Video,
  trending_up: TrendingUp
}

interface Props {
  onClose: () => void
  onSaved?: (url: string) => void
}

export default function AvatarSelector({ onClose, onSaved }: Props) {
  const { profile, setProfile, currentTheme, isRTL } = useGrowth()
  const { showToast } = useToast()
  // selected === null means Option 1 (Google Profile). Otherwise holds the custom avatar URL.
  const [selected, setSelected] = useState<string | null>(profile?.custom_avatar || null)
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  const handleSave = async () => {
    if (!profile?.id) return
    setIsSaving(true)
    try {
      // 1. Update user_metadata in Supabase auth (reliable persistence)
      const { error: authError } = await supabase.auth.updateUser({
        data: { custom_avatar: selected }
      })

      if (authError) {
        console.error('Auth updateUser error:', authError)
        // Commented out per safety rules:
        // showToast(isRTL ? 'فشل تحديث الشخصية، يرجى المحاولة مرة أخرى' : 'UPDATE_FAILED', 'warning')
        showToast(isRTL ? 'فشل تحديث الشخصية، يرجى المحاولة مرة أخرى' : 'Update failed', 'warning')
        setIsSaving(false)
        return
      }

      // 2. Attempt to update avatar_url in profiles table (non-blocking fallback)
      const defaultAvatar = (profile?.gender === 'female' || profile?.gender === 'أنثى' || profile?.gender === 'Female') ? '/avatars/menna.svg' : '/avatars/omar.svg'
      const targetAvatarUrl = selected || profile.google_avatar_url || defaultAvatar
      await supabase
        .from('profiles')
        .update({ avatar_url: targetAvatarUrl, custom_avatar: selected })
        .eq('id', profile.id)

      // 3. Update React context immediately & close modal
      const updatedProfile = {
        ...profile,
        custom_avatar: selected,
        avatar_url: targetAvatarUrl
      }
      setProfile(updatedProfile)

      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('cached_profile')
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            parsed.custom_avatar = selected
            parsed.avatar_url = targetAvatarUrl
            localStorage.setItem('cached_profile', JSON.stringify(parsed))
          } catch (e) {}
        } else {
          localStorage.setItem('cached_profile', JSON.stringify(updatedProfile))
        }
      }

      showToast(isRTL ? 'تم تحديث الشخصية بنجاح!' : 'Profile updated successfully!', 'success')
      onSaved?.(targetAvatarUrl)
      onClose()
    } catch (err) {
      console.error('Save avatar error:', err)
      // Commented out per safety rules:
      // showToast(isRTL ? 'فشل تحديث الشخصية، يرجى المحاولة مرة أخرى' : 'UPDATE_FAILED', 'warning')
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
        {/ * Backdrop * /}
        <motion.div
          className="absolute inset-0 bg-white/60 dark:bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />

        {/ * Panel * /}
        <motion.div
          className="relative z-10 w-full max-w-4xl rounded-3xl overflow-hidden bg-white/80 dark:bg-black/80 backdrop-blur-2xl border border-zinc-200/50 dark:border-white/10 shadow-2xl flex flex-col max-h-[90vh]"
          style={{
            boxShadow: `0 0 60px ${currentTheme.color}33, inset 0 0 30px ${currentTheme.color}15`,
          }}
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
        >
          {/ * Top Cyber Accent Bar * /}
          <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, transparent, ${currentTheme.color}, transparent)` }} />

          <div className="p-6 md:p-8 flex-1 overflow-y-auto scrollbar-thin space-y-8">
            {/ * Header * /}
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <HelpCircle />
                  <p className="text-[10px] font-space tracking-[0.4em] uppercase font-black" style={{ color: currentTheme.color }}>
                    {isRTL ? 'تخصيص الملف الشخصي والهوية' : 'Customize Profile'}
                  </p>
                </div>
                <h2 className="text-2xl md:text-3xl font-space font-black text-zinc-900 dark:text-white uppercase tracking-wider">
                  {isRTL ? 'اختر الشخصية المهنية الخاصة بك' : 'Select Active User Persona'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-11 h-11 rounded-full bg-black/5 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center text-zinc-600 dark:text-white/60 hover:text-zinc-900 dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
              >
                <X className="text-xl font-bold w-5 h-5" />
              </button>
            </div>

            {/ * Avatar Grid (7 Options) * /}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/ * Option 1: Google Profile * /}
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="relative flex flex-col items-center gap-4 p-6 rounded-3xl border transition-all duration-300 group overflow-hidden text-start cursor-pointer bg-white/60 dark:bg-black/60 backdrop-blur-md"
                style={{
                  borderColor: selected === null ? currentTheme.color : 'rgba(150,150,150,0.2)',
                  boxShadow: selected === null ? `0 0 35px ${currentTheme.color}44, inset 0 0 15px ${currentTheme.color}22` : '0 10px 30px rgba(0,0,0,0.1)',
                }}
              >
                {/ * Holographic Scanline Overlay * /}
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:100%_4px] opacity-20 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                {/ * Top Badge * /}
                <div className="w-full flex items-center justify-start z-10">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 border border-zinc-200 dark:border-white/10 backdrop-blur-md">
                    <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: currentTheme.color }} />
                    <span className="text-[9px] font-space font-black tracking-widest uppercase text-zinc-800 dark:text-white/80">
                      {isRTL ? 'حساب جوجل' : 'Google Account'}
                    </span>
                  </div>
                </div>

                {/ * Avatar Display Container * /}
                <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center p-1 transition-transform duration-500 group-hover:scale-105 z-10 shadow-2xl">
                  {/ * Rotating Outer Cyber Ring * /}
                  <div 
                    className="absolute inset-0 rounded-full border-2 border-dashed transition-colors duration-300 animate-spin-slow pointer-events-none"
                    style={{ borderColor: selected === null ? currentTheme.color : 'rgba(150,150,150,0.3)' }}
                  />
                  {/ * Inner Avatar * /}
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-zinc-300 dark:border-white/20 bg-zinc-100/80 dark:bg-white/10 flex items-center justify-center shadow-inner backdrop-blur-md">
                    {profile?.google_avatar_url ? (
                      <img src={profile.google_avatar_url} alt="Google Auth" className="w-[90%] h-[90%] mx-auto object-contain p-1 rounded-full" />
                    ) : (
                      <User className="text-zinc-400 dark:text-white/40 text-5xl font-light w-12 h-12" />
                    )}
                  </div>
                  {/ * Visual Role Icon Overlay Badge at bottom-right * /}
                  <div 
                    className="absolute bottom-0 right-0 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center border-2 border-white dark:border-black shadow-lg z-20 backdrop-blur-md"
                    style={{ 
                      backgroundColor: selected === null ? currentTheme.color : '#71717a', 
                      color: selected === null ? '#000000' : '#ffffff',
                      boxShadow: selected === null ? `0 0 15px ${currentTheme.color}` : undefined
                    }}
                  >
                    <RefreshCw className="text-xs md:text-sm font-black w-3 h-3" />
                  </div>
                </div>

                {/ * Title & Subtitle * /}
                <div className="space-y-1 text-center z-10 w-full">
                  <span className="text-sm font-space font-black tracking-wider uppercase text-zinc-900 dark:text-white block truncate">
                    {isRTL ? 'صورة حساب جوجل' : 'Google Profile'}
                  </span>
                  <span className="text-[10px] font-space text-zinc-500 dark:text-white/50 uppercase block tracking-[0.2em] truncate">
                    {isRTL ? 'مزامنة تلقائية مع حسابك' : 'Automatic OAuth Sync'}
                  </span>
                </div>

                {/ * Active Checkmark Badge * /}
                {selected === null && (
                  <motion.div
                    className="absolute top-6 right-6 w-7 h-7 rounded-full flex items-center justify-center shadow-lg z-20 border border-black/20"
                    style={{ backgroundColor: currentTheme.color }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    <Check className="text-black text-sm font-black w-3.5 h-3.5" />
                  </motion.div>
                )}
              </button>

              {/ * Options 2-7: Custom SVGs * /}
              {CUSTOM_SVGS.map((avatar) => {
                const avatarUrl = `/avatars/${avatar.id}.svg`
                const isActive = selected === avatarUrl
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setSelected(avatarUrl)}
                    className="relative flex flex-col items-center gap-4 p-6 rounded-3xl border transition-all duration-300 group overflow-hidden text-start cursor-pointer bg-white/60 dark:bg-black/60 backdrop-blur-md"
                    style={{
                      borderColor: isActive ? currentTheme.color : 'rgba(150,150,150,0.2)',
                      boxShadow: isActive ? `0 0 35px ${currentTheme.color}44, inset 0 0 15px ${currentTheme.color}22` : '0 10px 30px rgba(0,0,0,0.1)',
                    }}
                  >
                    {/ * Holographic Scanline Overlay * /}
                    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:100%_4px] opacity-20 pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    {/ * Top Badge * /}
                    <div className="w-full flex items-center justify-start z-10">
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 border border-zinc-200 dark:border-white/10 backdrop-blur-md">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: avatar.gender === 'male' ? '#00E5FF' : '#E91E63' }} />
                        <span className="text-[9px] font-space font-black tracking-widest uppercase text-zinc-800 dark:text-white/80">
                          {isRTL ? 'شخصية مهنية' : 'Persona'}
                        </span>
                      </div>
                    </div>

                    {/ * Avatar Display Container * /}
                    <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center p-1 transition-transform duration-500 group-hover:scale-105 z-10 shadow-2xl">
                      {/ * Rotating Outer Cyber Ring * /}
                      <div 
                        className="absolute inset-0 rounded-full border-2 border-dashed transition-colors duration-300 animate-spin-slow pointer-events-none"
                        style={{ borderColor: isActive ? currentTheme.color : 'rgba(150,150,150,0.3)' }}
                      />
                      {/ * Inner Avatar * /}
                      <div className="w-full h-full rounded-full overflow-hidden border-2 border-zinc-300 dark:border-white/20 bg-zinc-100/80 dark:bg-white/10 flex items-center justify-center shadow-inner backdrop-blur-md p-1">
                        <img src={avatarUrl} alt={avatar.label} className="w-[90%] h-[90%] mx-auto object-contain p-1 group-hover:scale-105 transition-transform duration-500" />
                      </div>
                      {/ * Visual Role Icon Overlay Badge at bottom-right * /}
                      <div 
                        className="absolute bottom-0 right-0 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center border-2 border-white dark:border-black shadow-lg z-20 backdrop-blur-md transition-colors"
                        style={{ 
                          backgroundColor: isActive ? currentTheme.color : '#71717a', 
                          color: isActive ? '#000000' : '#ffffff',
                          boxShadow: isActive ? `0 0 15px ${currentTheme.color}` : undefined
                        }}
                      >
                        {(() => {
                          const IconComponent = IconMap[avatar.icon] || User
                          return <IconComponent className="w-3.5 h-3.5" />
                        })()}
                      </div>
                    </div>

                    {/ * Title & Subtitle * /}
                    <div className="space-y-1 text-center z-10 w-full">
                      <span className="text-sm font-space font-black tracking-wider uppercase text-zinc-900 dark:text-white block truncate">
                        {isRTL ? avatar.arLabel : avatar.label}
                      </span>
                      <span className="text-[10px] font-space text-zinc-500 dark:text-white/50 uppercase block tracking-[0.2em] truncate" style={{ color: isActive ? currentTheme.color : undefined }}>
                        {isRTL ? avatar.arSub : avatar.sub}
                      </span>
                    </div>

                    {/ * Active Checkmark Badge * /}
                    {isActive && (
                      <motion.div
                        className="absolute top-6 right-6 w-7 h-7 rounded-full flex items-center justify-center shadow-lg z-20 border border-black/20"
                        style={{ backgroundColor: currentTheme.color }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        <Check className="text-black text-sm font-black w-3.5 h-3.5" />
                      </motion.div>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="pt-6 border-t border-zinc-200 dark:border-white/10">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-4.5 rounded-2xl font-space font-black text-xs tracking-[0.2em] uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.01] active:scale-[0.99] cursor-pointer border border-white/20 hover:border-white/40"
                style={{
                  background: currentTheme.color,
                  color: '#000000',
                  boxShadow: `0 4px 30px ${currentTheme.color}66`,
                }}
              >
                {isSaving ? (
                  <>
                    <HelpCircle />
                    <span className="font-bold">{isRTL ? 'جارٍ الحفظ والمزامنة التكتيكية...' : 'Saving and Syncing...'}</span>
                  </>
                ) : (
                  <>
                    <Save className="text-lg font-bold w-[18px] h-[18px]" />
                    <span className="font-bold">{isRTL ? 'حفظ الشخصية وتفعيل المزامنة' : 'Confirm Avatar Selection'}</span>
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
*/
