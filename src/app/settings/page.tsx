'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Shell from '@/components/layout/Shell'
import { useGrowth } from '@/context/GrowthContext'
import { createClient } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { useSound } from '@/context/SoundContext'
import CustomSelect from '@/components/ui/CustomSelect'
import { deleteOwnAccount } from '@/app/actions/adminActions'
import AvatarSelector from '@/components/ui/AvatarSelector'

export default function SettingsPage() {
  const { profile, setProfile, isLoading, refreshProfile, mounted, t, isRTL, currentTheme } = useGrowth()
  const { showToast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const { volume, setVolume, isMuted, setIsMuted, playBlip } = useSound()

  const [activeTab, setActiveTab] = useState<'ACCOUNT' | 'AI_COACH' | 'SYSTEM'>('ACCOUNT')
  const [formData, setFormData] = useState({
    full_name: '',
    age: '18',
    language: 'en',
    ai_name: '',
    gender: ''
  })
  
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isAvatarSelectorOpen, setIsAvatarSelectorOpen] = useState(false)
  const [surveyBothered, setSurveyBothered] = useState<string>('')
  const [surveyRating, setSurveyRating] = useState<number>(0)
  const [surveyAlternative, setSurveyAlternative] = useState<string>('')
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true)

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'))
  }, [])

  // Dynamic AI Name Header calculation (No hardcoded "COACH" word)
  const aiNameHeader = profile?.ai_name 
    ? profile.ai_name.toUpperCase() 
    : (isRTL ? 'المنظومة الذكية' : 'AI SYSTEM')

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserEmail(user.email || null)
    }
    getUser()
  }, [])

  useEffect(() => {
    if (!profile) return
    setFormData({
      full_name: profile.full_name || '',
      age: profile.age?.toString() || '18',
      language: profile.language || 'en',
      ai_name: profile.ai_name || '',
      gender: profile.gender || ''
    })
  }, [profile])

  // Close all modals event listener from global Shell ESC matrix
  useEffect(() => {
    const handleCloseAll = () => {
      setIsAvatarSelectorOpen(false)
      setIsLogoutModalOpen(false)
      setIsDeleteModalOpen(false)
    }
    window.addEventListener('close-all-modals', handleCloseAll)
    return () => window.removeEventListener('close-all-modals', handleCloseAll)
  }, [])

  const handleSave = async () => {
    setSaving(true)

    // Apply theme on save
    const themeKey = isDarkMode ? 'dark' : 'light'
    document.documentElement.classList.toggle('dark', isDarkMode)
    localStorage.setItem('theme', themeKey)

    const { data: { user } } = await supabase.auth.getUser()
    
    // ── GUEST MODE INTERCEPT ──
    if (!user || profile?.id === 'guest') {
      if (profile) {
        const optimistic = {
          ...profile,
          full_name: formData.full_name || profile.full_name,
          ai_name: formData.ai_name || null,
          language: formData.language as any,
          gender: formData.gender || profile.gender,
          age: formData.age ? parseInt(formData.age) : profile.age,
        }
        setProfile(optimistic)
        if (typeof window !== 'undefined') {
          localStorage.setItem('cached_profile', JSON.stringify(optimistic))
          localStorage.setItem('language', formData.language)
          localStorage.setItem('cached_name', formData.full_name)
        }
      }
      showToast(isRTL ? 'تم حفظ التغييرات محلياً' : 'LOCAL SETTINGS UPDATED', 'success')
      setSaving(false)
      return
    }

    // ── OPTIMISTIC UPDATE: immediately push changes to context so all
    //    components (CoachPanel, Shell header, Sidebar) see the new name
    //    before the DB round-trip completes.
    if (profile) {
      const optimistic = {
        ...profile,
        full_name: formData.full_name || profile.full_name,
        ai_name: formData.ai_name || null,
        language: formData.language as any,
        gender: formData.gender || profile.gender,
        age: formData.age ? parseInt(formData.age) : profile.age,
      }
      setProfile(optimistic)
      if (typeof window !== 'undefined') {
        localStorage.setItem('cached_profile', JSON.stringify(optimistic))
        localStorage.setItem('language', formData.language)
        localStorage.setItem('cached_name', formData.full_name)
      }
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: formData.full_name,
        age: formData.age ? parseInt(formData.age) : null,
        language: formData.language,
        ai_name: formData.ai_name || null,
        gender: formData.gender || null,
        xp: profile?.xp || 0,
        onboarded: profile?.onboarded ?? true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (!error) {
      localStorage.setItem('language', formData.language)
      localStorage.setItem('cached_name', formData.full_name)
      // Background DB sync — don't await to keep UI snappy
      refreshProfile()
      showToast(isRTL ? 'تم حفظ التغييرات بنجاح' : 'SETTINGS_UPDATED_SUCCESSFULLY', 'success')
    } else {
      showToast('UPDATE_ERROR', 'warning')
      alert('SAVE_FAILED: ' + error.message)
    }
    setSaving(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  // Counter Widget Increments/Decrements
  const handleDecrementAge = () => {
    const currentAge = parseInt(formData.age) || 18
    if (currentAge > 13) {
      setFormData(prev => ({ ...prev, age: (currentAge - 1).toString() }))
      playBlip()
    }
  }

  const handleIncrementAge = () => {
    const currentAge = parseInt(formData.age) || 18
    if (currentAge < 120) {
      setFormData(prev => ({ ...prev, age: (currentAge + 1).toString() }))
      playBlip()
    }
  }

  // Catastrophic Delete Action
  const handlePermanentlyDeleteAccount = async () => {
    if (!profile) return
    playBlip()
    try {
      const res = await deleteOwnAccount()
      if (res?.success) {
        await supabase.auth.signOut()
        localStorage.clear()
        showToast(isRTL ? 'تم حذف حسابك نهائياً بنجاح' : 'ACCOUNT_WIPED_SUCCESSFULLY', 'success')
        router.push('/auth/login')
      } else {
        throw new Error('Deletion was not successful')
      }
    } catch (err: any) {
      console.error('Delete own account error:', err)
      showToast('DELETE_FAILED', 'warning')
      alert('Account deletion failed: ' + (err.message || 'Unknown error'))
    }
    setIsDeleteModalOpen(false)
  }

  if (isLoading || !mounted) return (
    <Shell>
      <div className="p-16 font-space animate-pulse tracking-widest text-sm md:text-base" style={{ color: currentTheme.color }}>
        {isRTL ? 'جاري التحميل...' : 'LOADING USER DATA...'}
      </div>
    </Shell>
  )

  const tabOptions = [
    { id: 'ACCOUNT', label: isRTL ? 'الحساب' : 'ACCOUNT', icon: 'person' },
    { id: 'AI_COACH', label: aiNameHeader, icon: 'psychology' },
    { id: 'SYSTEM', label: isRTL ? 'النظام' : 'SYSTEM', icon: 'settings_system_daydream' }
  ] as const

  return (
    <Shell>
      <div className="min-h-[calc(100vh-64px)] p-6 md:p-12 flex flex-col items-center">
        <div className="w-full max-w-4xl space-y-10">
          
          {/* Symmetrical Settings Header */}
          <header className="space-y-3">
            <h1 className="text-4xl md:text-6xl font-black font-space tracking-wider uppercase not-italic text-black dark:text-white leading-none">
              {t('settings')}
            </h1>
            <p className="text-[10px] md:text-xs font-space tracking-[0.5em] uppercase font-black opacity-50" style={{ color: currentTheme.color }}>
              {isRTL ? 'تخصيص النظام' : 'SYSTEM CONFIGURATION'}
            </p>
          </header>

          {/* Symmetrical layout split (1/4 vertical left tab sidebar, 3/4 content tab cards) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
            
            {/* Mobile Swipe selector pills */}
            <div className="flex md:hidden flex-row gap-2 overflow-x-auto pb-4 justify-between w-full scrollbar-none">
              {tabOptions.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                    playBlip()
                  }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-xl font-space font-black text-xs uppercase border tracking-wider transition-all duration-300 flex-1 whitespace-nowrap justify-center",
                    activeTab === tab.id
                      ? "text-black font-bold shadow-lg"
                      : "bg-black/20 border-white/5 text-white/60 hover:text-white"
                  )}
                  style={activeTab === tab.id ? {
                    backgroundColor: currentTheme.color,
                    borderColor: currentTheme.color,
                    boxShadow: `0 0 15px ${currentTheme.color}33`
                  } : {}}
                >
                  <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Desktop Left Sidebar Tab Card */}
            <div className="hidden md:flex flex-col col-span-1 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl space-y-2">
              <div className="px-3 py-2 text-[9px] font-space tracking-[0.3em] font-black text-white/30 uppercase">
                {isRTL ? 'الفئات' : 'CATEGORIES'}
              </div>
              {tabOptions.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                    playBlip()
                  }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3.5 rounded-xl font-space font-black text-xs uppercase border tracking-widest transition-all duration-300 w-full text-left relative overflow-hidden group",
                    activeTab === tab.id
                      ? "text-black border-transparent shadow-lg"
                      : "bg-transparent border-transparent text-white/50 hover:text-white hover:bg-white/5 hover:border-white/5"
                  )}
                  style={activeTab === tab.id ? {
                    backgroundColor: currentTheme.color,
                    boxShadow: `0 0 20px ${currentTheme.color}26`
                  } : {}}
                >
                  {activeTab === tab.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-white" />
                  )}
                  <span className={cn(
                    "material-symbols-outlined text-lg transition-transform duration-300 group-hover:scale-110",
                    activeTab === tab.id ? "text-black" : "text-white/40"
                  )}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Right Panel Content Card */}
            <div className="col-span-1 md:col-span-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl min-h-[460px] flex flex-col justify-between relative overflow-hidden">
              
              {/* Decorative dynamic corner frames */}
              <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-white/5 pointer-events-none rounded-tr-2xl" />
              <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-white/5 pointer-events-none rounded-bl-2xl" />

              {/* Dynamic Content Switching with motion triggers */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-8"
                >
                  
                  {/* ACCOUNT SECTION VIEW */}
                  {activeTab === 'ACCOUNT' && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                        <span className="material-symbols-outlined text-2xl" style={{ color: currentTheme.color }}>person</span>
                        <h3 className="font-space font-black tracking-widest text-sm uppercase text-white">
                          {isRTL ? 'إعدادات الحساب الشخصي' : 'ACCOUNT CONFIGURATION'}
                        </h3>
                      </div>

                      <div className="space-y-6">
                        {/* Avatar Display Section */}
                        <div className="border border-white/10 bg-white/[0.02] rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
                          <div className="flex items-center gap-6">
                            <div className="relative w-20 h-20 rounded-full border border-white/20 p-1 flex items-center justify-center bg-zinc-100/80 dark:bg-white/10 backdrop-blur-md overflow-hidden shadow-2xl group">
                              {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                              ) : (
                                <span className="material-symbols-outlined text-white/40 text-4xl">person</span>
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                <span className="material-symbols-outlined text-white text-xl">edit</span>
                              </div>
                            </div>
                            <div className="space-y-1 text-center sm:text-start">
                              <h4 className="font-space font-black text-lg text-white tracking-wider uppercase">
                                {profile?.full_name || 'MEMBER'}
                              </h4>
                              <p className="text-[10px] font-space tracking-[0.3em] uppercase font-black" style={{ color: currentTheme.color }}>
                                {profile?.rank || 'RECRUIT'} // {profile?.custom_avatar ? 'CUSTOM_SVG' : 'GOOGLE_PROFILE'}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setIsAvatarSelectorOpen(true)
                              playBlip()
                            }}
                            className="px-6 py-3.5 rounded-xl font-space font-black text-xs uppercase tracking-widest transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer border border-white/20 hover:border-white/40 text-black font-bold"
                            style={{ backgroundColor: currentTheme.color, boxShadow: `0 0 20px ${currentTheme.color}33` }}
                          >
                            {isRTL ? 'تغيير الشخصية' : 'CHANGE AVATAR'}
                          </button>
                        </div>

                        {/* Full Name */}
                        <div className="space-y-2">
                          <label className="font-space tracking-widest uppercase font-black text-xs text-[var(--text-secondary)]">
                            {t('fullName')}
                          </label>
                          <input
                            value={formData.full_name}
                            onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                            className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3.5 font-space text-sm font-bold text-[var(--text-primary)] outline-none focus:ring-2 focus:border-transparent transition-all"
                            style={{ ['--tw-ring-color' as any]: `${currentTheme.color}55` }}
                          />
                        </div>

                        {/* Counter Widget and Gender Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          
                          {/* CUSTOM AGE COUNTER (No Spinner arrows) */}
                          <div className="space-y-2">
                            <label className="font-space tracking-widest uppercase font-black text-xs text-[var(--text-secondary)]">
                              {t('age')}
                            </label>
                            
                            <div className="flex items-center bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl p-1 h-12 w-full justify-between">
                              <button
                                type="button"
                                onClick={handleDecrementAge}
                                className="w-10 h-10 rounded-lg flex items-center justify-center border font-bold text-lg transition-all duration-300 hover:bg-white/5 active:scale-95 text-white/80"
                                style={{ borderColor: `${currentTheme.color}40`, color: currentTheme.color }}
                              >
                                &minus;
                              </button>

                              <span className="font-space font-black text-lg text-white tracking-widest px-4">
                                {formData.age}
                              </span>

                              <button
                                type="button"
                                onClick={handleIncrementAge}
                                className="w-10 h-10 rounded-lg flex items-center justify-center border font-bold text-lg transition-all duration-300 hover:bg-white/5 active:scale-95 text-white/80"
                                style={{ borderColor: `${currentTheme.color}40`, color: currentTheme.color }}
                              >
                                &#43;
                              </button>
                            </div>
                          </div>

                          {/* Gender CustomSelect */}
                          <div className="space-y-2">
                            <label className="font-space tracking-widest uppercase font-black text-xs text-[var(--text-secondary)]">
                              {t('gender')}
                            </label>
                            <CustomSelect
                              value={formData.gender || ''}
                              onChange={val => setFormData({ ...formData, gender: val })}
                              options={[
                                { value: 'Male', label: t('male') },
                                { value: 'Female', label: t('female') }
                              ]}
                              placeholder={isRTL ? 'اختر' : 'SELECT'}
                              className="h-12 flex items-center"
                            />
                          </div>

                        </div>



                        {/* Connected User Email Security / Guest Link Fallback */}
                        <div className="space-y-2 pt-2">
                          <label className="text-[10px] font-space text-[var(--text-secondary)] tracking-widest uppercase font-black flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-xs">lock</span>
                            {isRTL ? 'البريد الإلكتروني المتصل' : 'CONNECTED SECURITY EMAIL'}
                          </label>
                          {userEmail ? (
                            <div className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3.5 font-space text-xs text-white/40 tracking-wider">
                              {userEmail}
                            </div>
                          ) : (
                            <div className="border border-amber-500/30 bg-amber-500/[0.02] rounded-xl p-4 flex flex-col gap-3">
                              <p className="text-[10px] font-space text-amber-500/80 tracking-wider leading-relaxed">
                                {isRTL 
                                  ? 'حسابك الحالي مؤقت ومخزن محلياً. اضغط هنا لتأمين بياناتك ومزامنتها على السيرفر.' 
                                  : 'Your current account is temporary and stored locally. Click here to secure your data and sync it with the server.'}
                              </p>
                              <button
                                type="button"
                                onClick={async () => {
                                  playBlip()
                                  const { error } = await supabase.auth.signInWithOAuth({
                                    provider: 'google',
                                    options: { redirectTo: `${window.location.origin}/onboarding` },
                                  })
                                  if (error) {
                                    alert(error.message)
                                  }
                                }}
                                className="w-full h-10 rounded-lg flex items-center justify-center gap-2 font-space font-black tracking-widest transition-all duration-300 bg-white text-black hover:bg-zinc-200 uppercase text-xs shadow-lg"
                              >
                                <svg width="14" height="14" viewBox="0 0 18 18">
                                  <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.25h2.9c1.69-1.55 2.69-3.85 2.69-6.58z"/>
                                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.22l-2.9-2.25c-.8.54-1.83.87-3.06.87-2.35 0-4.35-1.59-5.06-3.73H.95v2.3C2.43 15.89 5.47 18 9 18z"/>
                                  <path fill="#FBBC05" d="M3.94 10.67A5.4 5.4 0 0 1 3.6 9c0-.58.1-1.14.28-1.67V5.03H.95A8.99 8.99 0 0 0 0 9c0 1.45.35 2.82.95 4.03l2.99-2.36z"/>
                                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2A8.99 8.99 0 0 0 0 9l2.99 2.36C3.7 5.17 5.7 3.58 9 3.58z"/>
                                </svg>
                                <span>{isRTL ? 'ربط الحساب بمزود جوجل' : 'LINK ACCOUNT WITH GOOGLE'}</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Account Delete Alert Row */}
                        <div className="border border-red-500/20 bg-red-500/[0.02] p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-8">
                          <div className="space-y-1">
                            <h4 className="font-space font-black text-xs text-red-500 uppercase tracking-widest">
                              {isRTL ? 'حذف الحساب بشكل نهائي' : 'PERMANENT DELETION'}
                            </h4>
                            <p className="text-[10px] font-space text-white/40 tracking-wider">
                              {isRTL 
                                ? 'سيتم مسح جميع البيانات الخاصة بك نهائياً.' 
                                : 'Irrevocably wipe your profile, milestones, notes, and ranks.'}
                            </p>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setIsDeleteModalOpen(true)
                              playBlip()
                            }}
                            className="px-4 py-2 border border-red-500/30 text-red-500 text-xs font-black font-space rounded-xl hover:bg-red-500/10 transition-all uppercase tracking-wider whitespace-nowrap w-full sm:w-auto text-center"
                          >
                            {isRTL ? 'حذف الحساب' : 'DELETE ACCOUNT'}
                          </button>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* DYNAMIC AI NAME SECTION VIEW (AI COACH PURGED AND INTENSITY FREE) */}
                  {activeTab === 'AI_COACH' && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                        <span className="material-symbols-outlined text-2xl" style={{ color: currentTheme.color }}>psychology</span>
                        <h3 className="font-space font-black tracking-widest text-sm uppercase text-white">
                          {aiNameHeader}
                        </h3>
                      </div>

                      <div className="space-y-8">
                        {/* Dynamic custom AI Name input field */}
                        <div className="space-y-2">
                          <label className="font-space tracking-widest uppercase font-black text-xs text-[var(--text-secondary)]">
                            {t('aiName')}
                          </label>
                          <input
                            value={formData.ai_name}
                            onChange={e => setFormData({ ...formData, ai_name: e.target.value })}
                            className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3.5 font-space text-sm font-bold text-[var(--text-primary)] outline-none focus:ring-2 focus:border-transparent transition-all"
                            style={{ ['--tw-ring-color' as any]: `${currentTheme.color}55` }}
                          />
                        </div>

                        {/* Dynamic read-only status badge showing the current automated state synced directly to rank color */}
                        <div className="space-y-2">
                          <label className="font-space tracking-widest uppercase font-black text-xs text-[var(--text-secondary)]">
                            {isRTL ? 'الحالة الآلية للمنظومة' : 'AUTOMATED SYSTEM SYNC'}
                          </label>
                          
                          <div 
                            className="border rounded-xl p-4 flex items-center justify-between transition-all duration-300"
                            style={{ 
                              borderColor: `${currentTheme.color}30`, 
                              backgroundColor: `${currentTheme.color}05`,
                              boxShadow: `inset 0 0 15px ${currentTheme.color}08`
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: currentTheme.color }}></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: currentTheme.color }}></span>
                              </span>
                              <div className="space-y-0.5">
                                <p className="font-space font-black text-xs text-white uppercase tracking-wider">
                                  {isRTL ? 'المزامنة مع الرتبة النشطة' : 'RANK-ALIGNED DIRECTIVE'}
                                </p>
                                <p className="text-[10px] font-space text-white/40 tracking-wider">
                                  {isRTL 
                                    ? 'يتم ضبط وتيرة التوجيهات وأسلوب المساعد الذكي تلقائياً بناءً على مستوى تقدمك الحالي.' 
                                    : 'System tone algorithms and accountability frequency auto-calibrate based on your active rank tier.'}
                                </p>
                              </div>
                            </div>
                            
                            <div 
                              className="px-3 py-1 border text-[9px] font-space font-black rounded-lg uppercase tracking-widest"
                              style={{
                                color: currentTheme.color,
                                borderColor: `${currentTheme.color}40`,
                                backgroundColor: `${currentTheme.color}15`,
                                textShadow: `0 0 8px ${currentTheme.color}40`
                              }}
                            >
                              {isRTL ? 'متزامن نشط' : 'SYNCHRONIZED'}
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* SYSTEM SECTION VIEW */}
                  {activeTab === 'SYSTEM' && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                        <span className="material-symbols-outlined text-2xl" style={{ color: currentTheme.color }}>settings_system_daydream</span>
                        <h3 className="font-space font-black tracking-widest text-sm uppercase text-white">
                          {isRTL ? 'إعدادات النظام والصوت' : 'SYSTEM & AUDIO CALIBRATION'}
                        </h3>
                      </div>

                      <div className="space-y-8">
                        {/* Language switch */}
                        <div className="space-y-4 border-b border-white/10 pb-8">
                          <label className="text-xs font-space text-[var(--text-secondary)] tracking-widest uppercase font-black">
                            {isRTL ? 'لغة واجهة النظام' : 'INTERFACE LANGUAGE'}
                          </label>
                          <div className="grid grid-cols-2 gap-4">
                            {[
                              { key: 'en', label: 'EN' },
                              { key: 'ar', label: 'AR' }
                            ].map(l => (
                              <button
                                key={l.key}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, language: l.key as any })
                                  playBlip()
                                }}
                                className={cn(
                                  'py-3.5 border font-space text-xs font-black transition-all rounded-xl uppercase tracking-widest',
                                  formData.language === l.key 
                                    ? 'text-black border-transparent shadow-lg font-black' 
                                    : 'bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-white'
                                )}
                                style={formData.language === l.key ? { backgroundColor: currentTheme.color, borderColor: currentTheme.color, boxShadow: `0 0 15px ${currentTheme.color}33` } : {}}
                              >
                                {l.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* Theme switch */}
                        <div className="space-y-4 border-b border-white/10 pb-8 mt-8">
                          <label className="text-xs font-space text-[var(--text-secondary)] tracking-widest uppercase font-black">
                            {isRTL ? 'المظهر' : 'APPEARANCE'}
                          </label>
                          <div className="grid grid-cols-2 gap-4">
                            {[
                              { key: 'dark', label: isRTL ? 'ليلي' : 'DARK', icon: 'dark_mode' },
                              { key: 'light', label: isRTL ? 'نهاري' : 'LIGHT', icon: 'light_mode' }
                            ].map(theme => {
                              const isActive = (theme.key === 'dark' && isDarkMode) || (theme.key === 'light' && !isDarkMode)
                              return (
                                <button
                                  key={theme.key}
                                  type="button"
                                  onClick={() => {
                                    playBlip()
                                    const setDark = theme.key === 'dark'
                                    setIsDarkMode(setDark)
                                  }}
                                  className={cn(
                                    'py-3.5 flex items-center justify-center gap-2 border font-space text-xs font-black transition-all rounded-xl uppercase tracking-widest',
                                    isActive
                                      ? 'text-black border-transparent shadow-lg font-black' 
                                      : 'bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-border)]'
                                  )}
                                  style={isActive ? { backgroundColor: currentTheme.color, borderColor: currentTheme.color, boxShadow: `0 0 15px ${currentTheme.color}33` } : {}}
                                >
                                  <span className="material-symbols-outlined text-sm">{theme.icon}</span>
                                  {theme.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Master range volume slider */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-space text-[var(--text-secondary)] tracking-widest uppercase font-black">
                              {isRTL ? 'مستوى الصوت العام' : 'MASTER SYSTEM VOLUME'}
                            </label>
                            <span className="text-sm font-space font-black" style={{ color: currentTheme.color }}>
                              {Math.round(volume * 100)}%
                            </span>
                          </div>
                          <input 
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={volume}
                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                            onMouseUp={playBlip}
                            onTouchEnd={playBlip}
                            disabled={isMuted}
                            className={cn(
                              "w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer transition-all",
                              isMuted && "opacity-30 grayscale"
                            )}
                            style={{ accentColor: currentTheme.color }}
                          />
                        </div>

                        {/* Sliding custom mute toggle */}
                        <div className="flex items-center justify-between border-t border-white/10 pt-6">
                          <div className="space-y-1">
                            <p className="text-xs font-space text-white tracking-widest uppercase font-black">
                              {isRTL ? 'كتم جميع الأصوات' : 'MUTE MASTER SFX'}
                            </p>
                            <p className="text-[10px] font-space text-white/40 tracking-wider">
                              {isRTL ? 'تعطيل المؤثرات الصوتية بالكامل' : 'SILENCE ALL HIGH-FIDELITY SYSTEM AUDIO FEEDBACK'}
                            </p>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setIsMuted(!isMuted)
                              if (isMuted) playBlip()
                            }}
                            className={cn(
                              "w-14 h-7 rounded-full transition-all relative border flex items-center px-1.5 cursor-pointer",
                              isMuted 
                                ? "bg-red-500/20 border-red-500/50 justify-end" 
                                : "justify-start bg-white/[0.02] border-white/10"
                            )}
                            style={!isMuted ? { backgroundColor: `${currentTheme.color}20`, borderColor: `${currentTheme.color}50` } : {}}
                          >
                            <motion.div 
                              layout
                              className={cn(
                                "w-4 h-4 rounded-full shadow-lg transition-colors",
                                isMuted ? "bg-red-500" : ""
                              )}
                              style={!isMuted ? { backgroundColor: currentTheme.color } : {}}
                            />
                          </button>
                        </div>

                        {/* Dynamic Sound Spatializer test button */}
                        <div className="border border-white/5 bg-white/[0.01] p-4 rounded-xl flex items-center justify-between gap-4">
                          <p className="text-[10px] font-space text-white/40 tracking-wider">
                            {isRTL 
                              ? 'اختبار حزمة الصوت والتوليف التفاعلي الحالي.' 
                              : 'Test audio response speed and dynamic sound spatializers.'}
                          </p>
                          <button
                            type="button"
                            onClick={playBlip}
                            disabled={isMuted}
                            className="px-4 py-2 border border-white/10 text-xs font-space font-black rounded-xl hover:bg-white/5 transition-all uppercase tracking-wider disabled:opacity-30 whitespace-nowrap"
                            style={!isMuted ? { color: currentTheme.color, borderColor: `${currentTheme.color}40` } : {}}
                          >
                            {isRTL ? 'اختبار الصوت' : 'TEST SFX ENGINE'}
                          </button>
                        </div>

                      </div>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>

              {/* Symmetrical Settings panel action footer */}
              <div className="pt-8 mt-8 border-t border-white/10 flex flex-col sm:flex-row gap-4 w-full">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 text-black py-4 font-space font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 rounded-xl cursor-pointer text-center font-bold"
                  style={{ backgroundColor: currentTheme.color, boxShadow: `0 4px 20px ${currentTheme.color}20` }}
                >
                  {saving ? (isRTL ? 'جاري الحفظ...' : 'SAVING...') : t('save')}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsLogoutModalOpen(true)
                    playBlip()
                  }}
                  className="py-4 px-6 border border-white/10 hover:bg-white/5 text-white/60 hover:text-white transition-all font-space font-black text-xs uppercase tracking-widest rounded-xl text-center cursor-pointer"
                >
                  {t('logout')}
                </button>
              </div>

            </div>
          </div>

          {/* Admin Calibration Section */}
          {userEmail === 'm@gmail.com' && (
            <section className="w-full pt-12 border-t border-red-500/10 space-y-6">
              <header className="space-y-1">
                <h2 className="text-xl font-space font-black tracking-tight text-red-500 uppercase italic">
                  ADMIN<span className="text-white">_CALIBRATION</span>
                </h2>
                <p className="text-[9px] font-space text-red-500/40 tracking-[0.4em] uppercase font-black">
                  DEVELOPER_OVERRIDE // CRITICAL_SYSTEM_ACCESS
                </p>
              </header>

              <div className="bg-black/40 backdrop-blur-xl border border-red-500/20 rounded-2xl p-6 bg-red-500/[0.01] space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] font-space text-red-500/60 tracking-widest uppercase font-black">XP_CALIBRATION_SLIDER</label>
                    <span className="text-lg font-space font-black text-red-500 italic">{profile?.xp || 0} XP</span>
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max="10000"
                    step="50"
                    value={profile?.xp || 0}
                    onChange={async (e) => {
                      const newXp = parseInt(e.target.value)
                      setProfile({ ...profile, xp: newXp } as any)
                      const { data: { user } } = await supabase.auth.getUser()
                      if (user) {
                        await supabase.from('profiles').update({ xp: newXp }).eq('id', user.id)
                      }
                    }}
                    className="w-full h-1 bg-red-500/20 rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                </div>

                <div className="p-4 bg-red-500/5 border border-red-500/10 flex gap-4 items-center rounded-xl">
                  <span className="material-symbols-outlined text-red-500 text-sm">warning</span>
                  <p className="text-[9px] font-space text-red-500/60 leading-relaxed uppercase tracking-wider">
                    WARNING: MANUAL_XP_OVERRIDE WILL TRIGGER IMMEDIATE RANK_RECALCULATION. USE ONLY FOR DEVELOPMENT_TESTING.
                  </p>
                </div>
              </div>
            </section>
          )}

        </div>
      </div>

      {/* BEAUTIFUL LOGOUT CONFIRMATION MODAL */}
      <AnimatePresence>
        {isLogoutModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-[#0c0c0c] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl relative space-y-6 text-center"
              style={{ boxShadow: `0 0 40px ${currentTheme.color}15` }}
            >
              <div className="flex justify-center">
                <div className="w-14 h-14 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl font-bold" style={{ color: currentTheme.color }}>logout</span>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-space font-black text-xl text-white uppercase tracking-widest leading-none">
                  {isRTL ? 'تسجيل الخروج' : 'CONFIRM LOGOUT'}
                </h3>
                <p className="text-[9px] font-space tracking-[0.25em] uppercase font-black" style={{ color: currentTheme.color }}>
                  {isRTL ? 'تأكيد الخروج من النظام' : 'DISCONNECT_SESSION'}
                </p>
              </div>

              <p className="text-sm font-space text-white/60 leading-relaxed">
                {isRTL 
                  ? 'هل أنت متأكد من رغبتك في تسجيل الخروج؟ نتمنى رؤيتك مجدداً في أقرب وقت.'
                  : 'Are you sure you want to log out? We hope to see you back soon, Member!'}
              </p>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-black py-3.5 font-space font-black text-xs uppercase tracking-widest rounded-xl transition-all duration-300 shadow-lg cursor-pointer active:scale-98 font-bold"
                  style={{ backgroundColor: currentTheme.color, boxShadow: `0 4px 15px ${currentTheme.color}20` }}
                >
                  {isRTL ? 'نعم، تسجيل الخروج' : 'YES, LOGOUT'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsLogoutModalOpen(false)
                    playBlip()
                  }}
                  className="w-full bg-transparent border border-white/10 hover:bg-white/5 text-white/60 hover:text-white py-3 font-space font-black text-xs uppercase tracking-widest rounded-xl transition-all duration-300 cursor-pointer"
                >
                  {isRTL ? 'إلغاء' : 'CANCEL'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CATASTROPHIC DATA WIPE & SURVEY MODAL */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
            
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="bg-[#0c0c0c] border border-red-500/20 rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative space-y-6 flex flex-col max-h-[90vh] overflow-hidden"
              style={{ boxShadow: '0 0 50px rgba(239, 68, 68, 0.15)' }}
            >
              
              {/* Header */}
              <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-red-500 text-2xl font-bold">warning</span>
                </div>
                <div className="text-start">
                  <h3 className="font-space font-black text-lg text-red-500 uppercase tracking-widest leading-tight">
                    {isRTL ? 'تأكيد مسح الحساب والتقييم' : 'DELETE ACCOUNT & SURVEY'}
                  </h3>
                  <p className="text-[8px] md:text-[9px] font-space text-red-500/60 tracking-[0.2em] uppercase font-black">
                    WARNING // PERMANENT_ACCOUNT_DESTRUCTION
                  </p>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-6 py-2 scrollbar-thin text-start">
                
                {/* Warning message */}
                <div className="p-4 bg-red-500/[0.03] border border-red-500/10 rounded-xl space-y-2">
                  <p className="font-space text-xs text-red-400 font-bold tracking-wide">
                    {isRTL 
                      ? 'تحذير: هذا الإجراء دائم ولا يمكن التراجع عنه. سيتم مسح جميع التقدم والبيانات بالكامل وبشكل نهائي.' 
                      : 'Warning: This action is permanent and irreversible. All progress, metrics, and accounts will be wiped permanently.'}
                  </p>
                </div>

                {/* Question 1: What bothered you? */}
                <div className="space-y-3">
                  <label className="text-[10px] md:text-xs font-space text-white/50 tracking-widest uppercase font-black">
                    {isRTL ? '1. ما هو السبب الرئيسي لإلغاء الحساب؟' : '1. IS THERE SOMETHING SPECIFIC THAT BOTHERED YOU?'}
                  </label>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { key: 'COMPLICATED', ar: 'صعوبة الاستخدام أو تعقيد الواجهة', en: 'Too complicated/hard to use' },
                      { key: 'LATENCY', ar: 'بطء في استجابة النظام', en: 'AI coach response latency' },
                      { key: 'CLUTTER', ar: 'تكدس بصري في التصميم', en: 'Too much visual clutter' },
                      { key: 'FEATURES', ar: 'عدم وجود الميزات التي أحتاجها', en: 'Missing features I need' },
                      { key: 'OTHER', ar: 'سبب آخر', en: 'Other reason' }
                    ].map(opt => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          setSurveyBothered(opt.key)
                          playBlip()
                        }}
                        className={cn(
                          "w-full p-4 border rounded-xl text-xs font-bold font-space text-start transition-all uppercase tracking-wider flex items-center justify-between",
                          surveyBothered === opt.key
                            ? "bg-red-500/10 border-red-500/50 text-white"
                            : "bg-white/[0.02] border-white/5 text-white/50 hover:text-white hover:border-white/10"
                        )}
                      >
                        <span>{isRTL ? opt.ar : opt.en}</span>
                        {surveyBothered === opt.key && (
                          <span className="material-symbols-outlined text-sm text-red-500">check_circle</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question 2: Star rating */}
                <div className="space-y-3">
                  <label className="text-[10px] md:text-xs font-space text-white/50 tracking-widest uppercase font-black block">
                    {isRTL ? '2. كيف تقيم تجربتك الإجمالية من 5؟' : '2. HOW WOULD YOU RATE THE HUB OUT OF 5?'}
                  </label>
                  
                  <div className="flex items-center gap-3 justify-center py-2 bg-white/[0.02] border border-white/5 rounded-xl">
                    {[1, 2, 3, 4, 5].map(star => {
                      const isActive = surveyRating >= star
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => {
                            setSurveyRating(star)
                            playBlip()
                          }}
                          className="p-2 transition-transform duration-200 active:scale-90"
                        >
                          <span 
                            className={cn(
                              "material-symbols-outlined text-3xl font-black transition-all",
                              isActive ? "fill-1 text-red-500 scale-110 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "text-white/20 hover:text-white/40"
                            )}
                          >
                            star
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Question 3: Better alternative? */}
                <div className="space-y-3">
                  <label className="text-[10px] md:text-xs font-space text-white/50 tracking-widest uppercase font-black block">
                    {isRTL ? '3. هل وجدت بديلاً أفضل؟ (اختياري)' : '3. DID YOU FIND A BETTER ALTERNATIVE?'}
                  </label>
                  
                  <textarea
                    value={surveyAlternative}
                    onChange={e => setSurveyAlternative(e.target.value)}
                    rows={3}
                    placeholder={isRTL ? "مثال: نعم، انتقلت لاستخدام أداة أخرى..." : "e.g. Yes, switched to another solution..."}
                    className="w-full bg-white/[0.02] border border-white/5 rounded-xl p-4 font-space text-xs text-white outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/30 transition-all placeholder:text-white/20"
                  />
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={handlePermanentlyDeleteAccount}
                  className="w-full bg-red-600 hover:bg-red-500 text-white py-3.5 font-space font-black text-xs uppercase tracking-widest rounded-xl transition-all duration-300 shadow-lg shadow-red-600/10 cursor-pointer active:scale-98"
                >
                  {isRTL ? 'تأكيد الحذف النهائي' : 'CONFIRM PERMANENT WIPE'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false)
                    playBlip()
                  }}
                  className="w-full bg-transparent border border-white/10 hover:bg-white/5 text-white/60 hover:text-white py-3 font-space font-black text-xs uppercase tracking-widest rounded-xl transition-all duration-300 cursor-pointer"
                >
                  {isRTL ? 'إلغاء' : 'CANCEL'}
                </button>
              </div>

            </motion.div>

          </div>
        )}
      </AnimatePresence>

      {/* AVATAR SELECTOR MODAL */}
      {isAvatarSelectorOpen && (
        <AvatarSelector onClose={() => setIsAvatarSelectorOpen(false)} />
      )}

    </Shell>
  )
}
