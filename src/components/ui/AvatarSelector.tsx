'use client'

import { Check, HelpCircle, RefreshCw, Save, User, X } from 'lucide-react'
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
        showToast(isRTL ? 'فشل تحديث الشخصية، يرجى المحاولة مرة أخرى' : 'UPDATE_FAILED', 'warning')
        setIsSaving(false)
        return
      }

      // 2. Attempt to update avatar_url in profiles table (non-blocking fallback)
      const targetAvatarUrl = selected || profile.google_avatar_url || '/avatars/omar.svg'
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
      showToast(isRTL ? 'فشل تحديث الشخصية، يرجى المحاولة مرة أخرى' : 'UPDATE_FAILED', 'warning')
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
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-white/60 dark:bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Panel */}
        <motion.div
          className="relative z-10 w-full max-w-4xl rounded-3xl overflow-hidden bg-white/80 dark:bg-black/80 backdrop-blur-2xl border border-zinc-200/50 dark:border-white/10 shadow-2xl flex flex-col max-h-[90vh]"
          style={{
            boxShadow: `0 0 60px ${currentTheme.color}33, inset 0 0 30px ${currentTheme.color}15`,
          }}
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
        >
          {/* Top Cyber Accent Bar */}
          <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, transparent, ${currentTheme.color}, transparent)` }} />

          <div className="p-6 md:p-8 flex-1 overflow-y-auto scrollbar-thin space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <HelpCircle />
                  <p className="text-[10px] font-space tracking-[0.4em] uppercase font-black" style={{ color: currentTheme.color }}>
                    {isRTL ? 'تخصيص الملف الشخصي والهوية' : 'USER_PROFILE // PERSONA SELECTION'}
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

            {/* Avatar Grid (7 Options) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Option 1: Google Profile */}
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="relative flex flex-col items-center gap-4 p-6 rounded-3xl border transition-all duration-300 group overflow-hidden text-start cursor-pointer bg-white/60 dark:bg-black/60 backdrop-blur-md"
                style={{
                  borderColor: selected === null ? currentTheme.color : 'rgba(150,150,150,0.2)',
                  boxShadow: selected === null ? `0 0 35px ${currentTheme.color}44, inset 0 0 15px ${currentTheme.color}22` : '0 10px 30px rgba(0,0,0,0.1)',
                }}
              >
                {/* Holographic Scanline Overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:100%_4px] opacity-20 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                {/* Top Badge */}
                <div className="w-full flex items-center justify-start z-10">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 border border-zinc-200 dark:border-white/10 backdrop-blur-md">
                    <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: currentTheme.color }} />
                    <span className="text-[9px] font-space font-black tracking-widest uppercase text-zinc-800 dark:text-white/80">
                      {isRTL ? 'حساب جوجل' : 'GOOGLE AUTH'}
                    </span>
                  </div>
                </div>

                {/* Avatar Display Container */}
                <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center p-1 transition-transform duration-500 group-hover:scale-105 z-10 shadow-2xl">
                  {/* Rotating Outer Cyber Ring */}
                  <div 
                    className="absolute inset-0 rounded-full border-2 border-dashed transition-colors duration-300 animate-spin-slow pointer-events-none"
                    style={{ borderColor: selected === null ? currentTheme.color : 'rgba(150,150,150,0.3)' }}
                  />
                  {/* Inner Avatar */}
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-zinc-300 dark:border-white/20 bg-zinc-100/80 dark:bg-white/10 flex items-center justify-center shadow-inner backdrop-blur-md">
                    {profile?.google_avatar_url ? (
                      <img src={profile.google_avatar_url} alt="Google Auth" className="w-[90%] h-[90%] mx-auto object-contain p-1 rounded-full" />
                    ) : (
                      <User className="text-zinc-400 dark:text-white/40 text-5xl font-light w-12 h-12" />
                    )}
                  </div>
                  {/* Visual Role Icon Overlay Badge at bottom-right */}
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

                {/* Title & Subtitle */}
                <div className="space-y-1 text-center z-10 w-full">
                  <span className="text-sm font-space font-black tracking-wider uppercase text-zinc-900 dark:text-white block truncate">
                    {isRTL ? 'صورة حساب جوجل' : 'Google Profile'}
                  </span>
                  <span className="text-[10px] font-space text-zinc-500 dark:text-white/50 uppercase block tracking-[0.2em] truncate">
                    {isRTL ? 'مزامنة تلقائية مع حسابك' : 'Automatic OAuth Sync'}
                  </span>
                </div>

                {/* Active Checkmark Badge */}
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

              {/* Options 2-7: Custom SVGs */}
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
                    {/* Holographic Scanline Overlay */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:100%_4px] opacity-20 pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    {/* Top Badge */}
                    <div className="w-full flex items-center justify-start z-10">
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 border border-zinc-200 dark:border-white/10 backdrop-blur-md">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: avatar.gender === 'male' ? '#00E5FF' : '#E91E63' }} />
                        <span className="text-[9px] font-space font-black tracking-widest uppercase text-zinc-800 dark:text-white/80">
                          {isRTL ? 'شخصية مهنية' : 'PERSONA'}
                        </span>
                      </div>
                    </div>

                    {/* Avatar Display Container */}
                    <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center p-1 transition-transform duration-500 group-hover:scale-105 z-10 shadow-2xl">
                      {/* Rotating Outer Cyber Ring */}
                      <div 
                        className="absolute inset-0 rounded-full border-2 border-dashed transition-colors duration-300 animate-spin-slow pointer-events-none"
                        style={{ borderColor: isActive ? currentTheme.color : 'rgba(150,150,150,0.3)' }}
                      />
                      {/* Inner Avatar */}
                      <div className="w-full h-full rounded-full overflow-hidden border-2 border-zinc-300 dark:border-white/20 bg-zinc-100/80 dark:bg-white/10 flex items-center justify-center shadow-inner backdrop-blur-md p-1">
                        <img src={avatarUrl} alt={avatar.label} className="w-[90%] h-[90%] mx-auto object-contain p-1 group-hover:scale-105 transition-transform duration-500" />
                      </div>
                      {/* Visual Role Icon Overlay Badge at bottom-right */}
                      <div 
                        className="absolute bottom-0 right-0 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center border-2 border-white dark:border-black shadow-lg z-20 backdrop-blur-md transition-colors"
                        style={{ 
                          backgroundColor: isActive ? currentTheme.color : '#71717a', 
                          color: isActive ? '#000000' : '#ffffff',
                          boxShadow: isActive ? `0 0 15px ${currentTheme.color}` : undefined
                        }}
                      >
                        <span className="material-symbols-outlined text-xs md:text-sm font-black">
                          {avatar.icon}
                        </span>
                      </div>
                    </div>

                    {/* Title & Subtitle */}
                    <div className="space-y-1 text-center z-10 w-full">
                      <span className="text-sm font-space font-black tracking-wider uppercase text-zinc-900 dark:text-white block truncate">
                        {isRTL ? avatar.arLabel : avatar.label}
                      </span>
                      <span className="text-[10px] font-space text-zinc-500 dark:text-white/50 uppercase block tracking-[0.2em] truncate" style={{ color: isActive ? currentTheme.color : undefined }}>
                        {isRTL ? avatar.arSub : avatar.sub}
                      </span>
                    </div>

                    {/* Active Checkmark Badge */}
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

            {/* Save Button */}
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
                    <span className="font-bold">{isRTL ? 'جارٍ الحفظ والمزامنة التكتيكية...' : 'SAVING & SYNCING CALIBRATION...'}</span>
                  </>
                ) : (
                  <>
                    <Save className="text-lg font-bold w-[18px] h-[18px]" />
                    <span className="font-bold">{isRTL ? 'حفظ الشخصية وتفعيل المزامنة' : 'CONFIRM AVATAR SELECTION'}</span>
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
