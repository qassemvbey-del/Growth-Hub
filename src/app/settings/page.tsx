'use client'

import { AlertTriangle, CheckCircle2, FileText, HelpCircle, Lock, LogOut, Star, User, Brain, Settings as SettingsIcon, Moon, Sun, Trophy, Volume2, ChevronRight, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGrowth } from '@/context/GrowthContext'
import { createClient } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { useSound } from '@/context/SoundContext'
import CustomSelect from '@/components/ui/CustomSelect'
import { deleteOwnAccount } from '@/app/actions/adminActions'
import AvatarSelector from '@/components/ui/AvatarSelector'
import EnergyCell from '@/components/ui/EnergyCell'

interface RankData {
  id: string
  name: string
  threshold: number
  themeId: string
  color: string
  neonClass: string
  perk: string
  unlocks: string
  vessel: string
}

const RANKS_DATA: RankData[] = [
  {
    id: 'SILVER',
    name: 'SILVER',
    threshold: 0,
    themeId: 'SILVER',
    color: '#94a3b8',
    neonClass: 'neon-silver',
    perk: 'Standard Features Unlocked',
    unlocks: 'Access to Notes and Settings pages',
    vessel: 'Cylinder'
  },
  {
    id: 'GOLD',
    name: 'GOLD',
    threshold: 400,
    themeId: 'GOLD',
    color: '#FACC15',
    neonClass: 'neon-gold',
    perk: 'Exclusive Title Badge',
    unlocks: 'Special title showing below username',
    vessel: 'Cylinder'
  },
  {
    id: 'PLATINUM',
    name: 'PLATINUM',
    threshold: 1000,
    themeId: 'PLATINUM',
    color: '#38bdf8',
    neonClass: 'neon-platinum',
    perk: 'Premium Avatar Border',
    unlocks: 'Glow border framing profile picture',
    vessel: 'Hex'
  },
  {
    id: 'DIAMOND',
    name: 'DIAMOND',
    threshold: 2000,
    themeId: 'DIAMOND',
    color: '#d500f9',
    neonClass: 'neon-diamond',
    perk: 'Exclusive Chat Emojis',
    unlocks: 'Special reactive emojis in squad threads',
    vessel: 'Crystal'
  },
  {
    id: 'CROWN',
    name: 'CROWN',
    threshold: 4000,
    themeId: 'CROWN',
    color: '#F97316',
    neonClass: 'neon-crown',
    perk: 'Name Neon Glow effect',
    unlocks: 'Vibrant custom neon glow around username',
    vessel: 'Crystal'
  },
  {
    id: 'ACE',
    name: 'ACE',
    threshold: 7000,
    themeId: 'ACE',
    color: '#EF4444',
    neonClass: 'neon-ace',
    perk: 'Player Calling Card',
    unlocks: 'Interactive profile card on user hover',
    vessel: 'Shard'
  },
  {
    id: 'CONQUEROR',
    name: 'CONQUEROR',
    threshold: 12000,
    themeId: 'CONQUEROR',
    color: '#FACC15',
    neonClass: 'neon-conqueror',
    perk: 'Top #1 Champion Dominance',
    unlocks: 'Exclusive animated dynamic gradient badge (Top XP Leader)',
    vessel: 'Sphere'
  }
]

export default function SettingsPage() {
  const { profile, setProfile, isLoading, refreshProfile, mounted, t, isRTL, currentTheme, restartTour } = useGrowth()
  const { showToast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const { volume, setVolume, isMuted, setIsMuted, playBlip } = useSound()

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
  const [isRanksRoadmapOpen, setIsRanksRoadmapOpen] = useState(false)
  const [surveyBothered, setSurveyBothered] = useState<string>('')
  const [surveyRating, setSurveyRating] = useState<number>(0)
  const [surveyAlternative, setSurveyAlternative] = useState<string>('')
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true)
  const [isPwaInstalled, setIsPwaInstalled] = useState<boolean>(false)
  const [pwaPromptAvailable, setPwaPromptAvailable] = useState<boolean>(false)

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'))
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsPwaInstalled(
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true
      )
      setPwaPromptAvailable(!!(window as any).deferredPWAInstallPrompt)
    }

    const handlePwaPrompt = () => setPwaPromptAvailable(true)
    const handleAppInstalled = () => {
      setIsPwaInstalled(true)
      setPwaPromptAvailable(false)
    }

    window.addEventListener('pwa-prompt-available', handlePwaPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('pwa-prompt-available', handlePwaPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

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
      setIsRanksRoadmapOpen(false)
    }
    window.addEventListener('close-all-modals', handleCloseAll)
    return () => window.removeEventListener('close-all-modals', handleCloseAll)
  }, [])

  const handleSaveDirectly = async (updatedData: typeof formData, customDarkMode?: boolean) => {
    setSaving(true)

    // Apply theme on save
    const activeDarkMode = customDarkMode !== undefined ? customDarkMode : isDarkMode
    const themeKey = activeDarkMode ? 'dark' : 'light'
    document.documentElement.classList.toggle('dark', activeDarkMode)
    localStorage.setItem('theme', themeKey)

    const { data: { user } } = await supabase.auth.getUser()
    
    // ── GUEST MODE INTERCEPT ──
    if (!user || profile?.id === 'guest') {
      if (profile) {
        const optimistic = {
          ...profile,
          full_name: updatedData.full_name || profile.full_name,
          ai_name: updatedData.ai_name || null,
          language: updatedData.language as any,
          gender: updatedData.gender || profile.gender,
          age: updatedData.age ? parseInt(updatedData.age) : profile.age,
        }
        setProfile(optimistic)
        if (typeof window !== 'undefined') {
          localStorage.setItem('cached_profile', JSON.stringify(optimistic))
          localStorage.setItem('language', updatedData.language)
          localStorage.setItem('cached_name', updatedData.full_name)
        }
      }
      setSaving(false)
      return
    }

    // ── OPTIMISTIC UPDATE: immediately push changes to context
    if (profile) {
      const optimistic = {
        ...profile,
        full_name: updatedData.full_name || profile.full_name,
        ai_name: updatedData.ai_name || null,
        language: updatedData.language as any,
        gender: updatedData.gender || profile.gender,
        age: updatedData.age ? parseInt(updatedData.age) : profile.age,
      }
      setProfile(optimistic)
      if (typeof window !== 'undefined') {
        localStorage.setItem('cached_profile', JSON.stringify(optimistic))
        localStorage.setItem('language', updatedData.language)
        localStorage.setItem('cached_name', updatedData.full_name)
      }
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: updatedData.full_name,
        age: updatedData.age ? parseInt(updatedData.age) : null,
        language: updatedData.language,
        ai_name: updatedData.ai_name || null,
        gender: updatedData.gender || null,
        xp: profile?.xp || 0,
        onboarded: profile?.onboarded ?? true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (!error) {
      localStorage.setItem('language', updatedData.language)
      localStorage.setItem('cached_name', updatedData.full_name)
      refreshProfile()
    } else {
      showToast(updatedData.language === 'ar' ? 'فشل حفظ الإعدادات ⚠️' : 'Failed to update settings ⚠️', 'warning')
      console.error('Save failed:', error)
    }
    setSaving(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const handleDecrementVolume = () => {
    const newVol = Math.max(0, volume - 0.05)
    setVolume(newVol)
    playBlip()
  }

  const handleIncrementVolume = () => {
    const newVol = Math.min(1, volume + 0.05)
    setVolume(newVol)
    playBlip()
  }

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
    <div className="p-16 font-space animate-pulse tracking-widest text-sm md:text-base text-center" style={{ color: currentTheme.color }}>
      {isRTL ? 'جاري التحميل...' : 'LOADING USER DATA...'}
    </div>
  )

  const currentRankId = profile?.rank?.toUpperCase() || 'SILVER'
  const currentXp = profile?.xp || 0
  const activeRank = RANKS_DATA.find(r => r.id === currentRankId) || RANKS_DATA[0]
  const nextRank = RANKS_DATA[RANKS_DATA.indexOf(activeRank) + 1] || activeRank
  const progressPercent = nextRank !== activeRank 
    ? Math.min(100, Math.max(0, (currentXp - activeRank.threshold) / (nextRank.threshold - activeRank.threshold) * 100))
    : 100

  return (
    <div className="min-h-[calc(100dvh-64px)] p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl mx-auto space-y-6">
        
        {/* Settings Header */}
        <header className="space-y-1 text-start">
          <h1 className="text-2xl md:text-4xl font-black font-heading tracking-tight text-black dark:text-white leading-none">
            {t('settings')}
          </h1>
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400 font-medium">
            {isRTL ? 'إعدادات الحساب وتفضيلات النظام' : 'Manage your account configurations and system rules'}
          </p>
        </header>

        {/* 1. ACCOUNT BLOCK */}
        <div>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest px-3 block mb-1.5 font-space font-black text-start">
            {isRTL ? 'الحساب الشخصي' : 'Account'}
          </span>
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 shadow-xl space-y-4">
            
            {/* Avatar Row */}
            <div className="flex items-center gap-4 pb-4 border-b border-white/5">
              <button
                type="button"
                onClick={() => { setIsAvatarSelectorOpen(true); playBlip(); }}
                className="relative w-14 h-14 rounded-full border border-white/20 flex items-center justify-center bg-zinc-100/80 dark:bg-white/10 overflow-hidden shadow-md group cursor-pointer"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <User className="text-white/40 w-8 h-8" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <FileText className="text-white w-4 h-4" />
                </div>
              </button>
              <div className="flex-1 min-w-0 text-start">
                <h4 className="font-medium text-sm text-white truncate">
                  {profile?.full_name || (isRTL ? 'عضو' : 'Member')}
                </h4>
                <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                  {userEmail || (isRTL ? 'حساب محلي مؤقت' : 'Temporary Local Account')}
                </p>
              </div>
            </div>

            {/* Inputs (Name, Age) */}
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <span className="text-xs font-space font-black uppercase tracking-wider text-[var(--text-secondary)]">{t('fullName')}</span>
              <input
                value={formData.full_name}
                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                onBlur={() => handleSaveDirectly({ ...formData, full_name: formData.full_name })}
                className="bg-transparent border-none text-end font-space text-sm font-bold text-[var(--text-primary)] outline-none w-48 focus:ring-0 px-0"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-b-0">
              <span className="text-xs font-space font-black uppercase tracking-wider text-[var(--text-secondary)]">{t('age')}</span>
              <input
                type="number"
                min={10}
                max={99}
                value={formData.age}
                onChange={e => {
                  const raw = e.target.value
                  if (raw === '') {
                    setFormData({ ...formData, age: '' })
                  } else {
                    const val = parseInt(raw, 10)
                    if (!isNaN(val) && val >= 0 && val <= 99) {
                      setFormData({ ...formData, age: String(val) })
                    }
                  }
                }}
                onBlur={() => handleSaveDirectly(formData)}
                className="bg-transparent border-none text-end font-space text-sm font-bold text-[var(--text-primary)] outline-none w-20 focus:ring-0 px-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            
            {/* Connected User Email Security / Guest Link Fallback */}
            {!userEmail && (
              <div className="pt-2">
                <div className="border border-amber-500/30 bg-amber-500/[0.02] rounded-xl p-3 flex flex-col gap-2">
                  <p className="text-[10px] font-space text-amber-500/80 leading-relaxed text-start">
                    {isRTL 
                      ? 'حسابك الحالي مؤقت ومخزن محلياً. اضغط لتأمين بياناتك ومزامنتها على السيرفر.' 
                      : 'Your current account is temporary and stored locally. Click to secure and sync with server.'}
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      playBlip()
                      sessionStorage.setItem('auth_redirect_url', window.location.href)
                      const { error } = await supabase.auth.signInWithOAuth({
                        provider: 'google',
                        options: { redirectTo: `${window.location.origin}/` },
                      })
                      if (error) alert(error.message)
                    }}
                    className="w-full h-8 rounded-lg flex items-center justify-center gap-2 font-space font-black tracking-widest transition-all duration-300 bg-white text-black hover:bg-zinc-200 uppercase text-[10px] shadow-md cursor-pointer"
                  >
                    <svg width="12" height="12" viewBox="0 0 18 18">
                      <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.25h2.9c1.69-1.55 2.69-3.85 2.69-6.58z"/>
                      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.22l-2.9-2.25c-.8.54-1.83.87-3.06.87-2.35 0-4.35-1.59-5.06-3.73H.95v2.3C2.43 15.89 5.47 18 9 18z"/>
                      <path fill="#FBBC05" d="M3.94 10.67A5.4 5.4 0 0 1 3.6 9c0-.58.1-1.14.28-1.67V5.03H.95A8.99 8.99 0 0 0 0 9c0 1.45.35 2.82.95 4.03l2.99-2.36z"/>
                      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2A8.99 8.99 0 0 0 0 9l2.99 2.36C3.7 5.17 5.7 3.58 9 3.58z"/>
                    </svg>
                    <span>{isRTL ? 'ربط الحساب بمزود جوجل' : 'LINK ACCOUNT WITH GOOGLE'}</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* 2. RANKS BLOCK */}
        <div>
          <div className="flex items-center justify-between px-3 mb-1.5">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-space font-black text-start">
              {isRTL ? 'الرتبة والترقية' : 'Rank'}
            </span>
            <button
              type="button"
              onClick={() => { setIsRanksRoadmapOpen(true); playBlip(); }}
              className="text-[10px] uppercase font-space font-black tracking-wider flex items-center gap-1 cursor-pointer transition-colors hover:text-white"
              style={{ color: currentTheme.color }}
            >
              <span>{isRTL ? 'عرض الرتب' : 'View All Ranks'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 shadow-xl">
            <div className="flex flex-col gap-3 text-start">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border flex items-center justify-center bg-zinc-100/80 dark:bg-white/10 shrink-0" style={{ borderColor: `${activeRank.color}40` }}>
                  <Trophy className="w-6 h-6" style={{ color: activeRank.color }} />
                </div>
                <div>
                  <h4 className="font-medium text-sm text-white">
                    {activeRank.name}
                  </h4>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    {currentXp.toLocaleString()} / {nextRank.threshold.toLocaleString()} XP
                  </p>
                </div>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${progressPercent}%`, backgroundColor: activeRank.color, boxShadow: `0 0 8px ${activeRank.color}` }} />
              </div>
            </div>
          </div>
        </div>

        {/* 3. AI SYSTEM BLOCK */}
        <div>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest px-3 block mb-1.5 font-space font-black text-start">
            {isRTL ? 'المساعد الذكي' : 'AI Assistant'}
          </span>
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 shadow-xl space-y-3">
            
            {/* Custom AI Name */}
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <div className="flex items-center gap-3">
                <Brain className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-space font-black uppercase tracking-wider text-[var(--text-primary)]">
                  {t('aiName')}
                </span>
              </div>
              <input
                value={formData.ai_name}
                onChange={e => setFormData({ ...formData, ai_name: e.target.value })}
                onBlur={() => handleSaveDirectly({ ...formData, ai_name: formData.ai_name })}
                className="bg-transparent border-none text-end font-space text-sm font-bold text-[var(--text-primary)] outline-none w-40 focus:ring-0 px-0"
              />
            </div>

            {/* Auto rank sync status row */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3">
                <SettingsIcon className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-space font-black uppercase tracking-wider text-[var(--text-primary)]">
                  {isRTL ? 'المزامنة التلقائية للرتبة' : 'Rank tone sync'}
                </span>
              </div>
              <div 
                className="px-2.5 py-0.5 border text-[9px] font-space font-black rounded-md uppercase tracking-wider shrink-0"
                style={{
                  color: currentTheme.color,
                  borderColor: `${currentTheme.color}40`,
                  backgroundColor: `${currentTheme.color}15`,
                }}
              >
                {isRTL ? 'مفعّلة' : 'Active'}
              </div>
            </div>

          </div>
        </div>

        {/* 4. SYSTEM PREFERENCES BLOCK */}
        <div>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest px-3 block mb-1.5 font-space font-black text-start">
            {isRTL ? 'تفضيلات النظام' : 'System Preferences'}
          </span>
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 shadow-xl space-y-3">
            
            {/* Language */}
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-space font-black uppercase tracking-wider text-[var(--text-primary)]">
                  {isRTL ? 'لغة الواجهة' : 'Language'}
                </span>
              </div>
              <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-white/5 shrink-0">
                {[
                  { key: 'en', label: 'EN' },
                  { key: 'ar', label: 'AR' }
                ].map(l => (
                  <button
                    key={l.key}
                    type="button"
                    onClick={async () => {
                      playBlip()
                      const updated = { ...formData, language: l.key as any }
                      setFormData(updated)
                      await handleSaveDirectly(updated)
                    }}
                    className={cn(
                      'px-3 py-1 font-space text-[10px] font-black transition-all rounded-md uppercase tracking-wider cursor-pointer',
                      formData.language === l.key 
                        ? 'text-black font-black' 
                        : 'text-[var(--text-secondary)] hover:text-white'
                    )}
                    style={formData.language === l.key ? { backgroundColor: currentTheme.color } : {}}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Appearance */}
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <div className="flex items-center gap-3">
                <Moon className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-space font-black uppercase tracking-wider text-[var(--text-primary)]">
                  {isRTL ? 'المظهر' : 'Appearance'}
                </span>
              </div>
              <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-white/5 shrink-0">
                {[
                  { key: 'dark', label: isRTL ? 'ليلي' : 'Dark' },
                  { key: 'light', label: isRTL ? 'نهاري' : 'Light' }
                ].map(theme => {
                  const isActive = (theme.key === 'dark' && isDarkMode) || (theme.key === 'light' && !isDarkMode)
                  return (
                    <button
                      key={theme.key}
                      type="button"
                      onClick={async () => {
                        playBlip()
                        const setDark = theme.key === 'dark'
                        setIsDarkMode(setDark)
                        await handleSaveDirectly(formData, setDark)
                      }}
                      className={cn(
                        'px-3 py-1 flex items-center gap-1 font-space text-[10px] font-black transition-all rounded-md uppercase tracking-wider cursor-pointer',
                        isActive
                          ? 'text-black font-black' 
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      )}
                      style={isActive ? { backgroundColor: currentTheme.color } : {}}
                    >
                      {theme.key === 'dark' ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                      <span>{theme.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Volume Control */}
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <div className="flex items-center gap-3">
                <Volume2 className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-space font-black uppercase tracking-wider text-[var(--text-primary)]">
                  {isRTL ? 'مستوى الصوت' : 'Volume'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDecrementVolume}
                  disabled={isMuted || volume <= 0}
                  className="w-6 h-6 rounded-md flex items-center justify-center border font-bold text-xs transition-all duration-300 hover:bg-white/5 text-white/80 disabled:opacity-30 cursor-pointer"
                  style={{ borderColor: `${currentTheme.color}40`, color: currentTheme.color }}
                >
                  &minus;
                </button>
                <span className="text-xs font-space font-black w-8 text-center" style={{ color: currentTheme.color }}>
                  {Math.round(volume * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleIncrementVolume}
                  disabled={isMuted || volume >= 1}
                  className="w-6 h-6 rounded-md flex items-center justify-center border font-bold text-xs transition-all duration-300 hover:bg-white/5 text-white/80 disabled:opacity-30 cursor-pointer"
                  style={{ borderColor: `${currentTheme.color}40`, color: currentTheme.color }}
                >
                  &#43;
                </button>
              </div>
            </div>

            {/* Mute toggle */}
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <div className="flex items-center gap-3">
                <Volume2 className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-space font-black uppercase tracking-wider text-[var(--text-primary)]">
                  {isRTL ? 'أصوات النظام' : 'System Sounds'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextMute = !isMuted
                  setIsMuted(nextMute)
                  if (!nextMute) {
                    setTimeout(() => playBlip(), 50)
                  }
                }}
                className={cn(
                  "w-10 h-5 rounded-full transition-all relative border flex items-center px-0.5 cursor-pointer shrink-0",
                  !isMuted 
                    ? "justify-end" 
                    : "justify-start bg-white/[0.02] border-white/10"
                )}
                style={!isMuted ? { backgroundColor: `${currentTheme.color}20`, borderColor: `${currentTheme.color}50` } : {}}
              >
                <motion.div 
                  layout
                  className="w-3.5 h-3.5 rounded-full shadow-lg"
                  style={!isMuted ? { backgroundColor: currentTheme.color } : { backgroundColor: 'rgba(255,255,255,0.2)' }}
                />
              </button>
            </div>

            {/* Install native app */}
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <div className="flex items-center gap-3">
                <SettingsIcon className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-space font-black uppercase tracking-wider text-[var(--text-primary)]">
                  {isRTL ? 'تطبيق النظام' : 'Native App'}
                </span>
              </div>
              {isPwaInstalled ? (
                <span className="text-[10px] font-space font-black text-zinc-500 uppercase tracking-wider">
                  {isRTL ? 'مثبّت' : 'Installed'}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    playBlip()
                    window.dispatchEvent(new CustomEvent('open-pwa-install-modal'))
                  }}
                  className="px-3 py-1.5 border border-teal-500/50 text-teal-400 text-[10px] font-space font-black rounded-lg uppercase tracking-wider hover:bg-teal-500/10 transition-all cursor-pointer"
                >
                  {isRTL ? 'تثبيت' : 'Install'}
                </button>
              )}
            </div>

            {/* Restart Tour */}
            <div className="flex items-center justify-between py-2 last:border-b-0">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-space font-black uppercase tracking-wider text-[var(--text-primary)]">
                  {isRTL ? 'إعادة تشغيل الجولة' : 'Interactive Tour'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  playBlip()
                  restartTour()
                }}
                className="px-3 py-1.5 border border-white/20 text-white/80 text-[10px] font-space font-black rounded-lg uppercase tracking-wider hover:bg-white/5 transition-all cursor-pointer"
              >
                {isRTL ? 'بدء الجولة' : 'Restart'}
              </button>
            </div>

          </div>
        </div>

        {/* 5. DESTRUCTIVE / FOOTER ACTIONS */}
        <div className="pt-6 border-t border-zinc-800/50 flex flex-col gap-4 text-center pb-24">
          <button
            type="button"
            onClick={() => {
              setIsLogoutModalOpen(true)
              playBlip()
            }}
            className="text-xs font-space font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            {t('logout')}
          </button>
          
          <button
            type="button"
            onClick={() => {
              setIsDeleteModalOpen(true)
              playBlip()
            }}
            className="text-[10px] font-space font-black uppercase tracking-widest text-red-500/60 hover:text-red-500 transition-all cursor-pointer"
          >
            {isRTL ? 'حذف الحساب نهائياً' : 'DELETE ACCOUNT'}
          </button>
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
                  <LogOut className="text-3xl font-bold w-8 h-8" style={{ color: currentTheme.color }} />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-xl text-white leading-none">
                  {isRTL ? 'تسجيل الخروج' : 'Log out?'}
                </h3>
                <p className="text-[9px] font-medium" style={{ color: currentTheme.color }}>
                  {isRTL ? 'تأكيد الخروج من الجلسة' : 'Confirm logout'}
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
                  className="w-full bg-transparent border border-white/10 hover:bg-white/5 text-white/60 hover:text-white py-3 font-medium text-sm rounded-xl transition-all duration-150 cursor-pointer active:scale-[0.97]"
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
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
                  <AlertTriangle className="text-red-500 text-2xl font-bold w-6 h-6" />
                </div>
                <div className="text-start">
                  <h3 className="font-semibold text-lg text-red-500 leading-tight">
                    {isRTL ? 'تأكيد حذف الحساب' : 'Delete account?'}
                  </h3>
                  <p className="text-[10px] text-red-500/60 mt-0.5">
                    {isRTL ? 'هذا الإجراء دائم ولا يمكن التراجع عنه' : 'This action is permanent and cannot be undone.'}
                  </p>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto pe-1 space-y-6 py-2 scrollbar-thin text-start">
                
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
                  <label className="text-[10px] md:text-xs text-white/50 block font-medium">
                    {isRTL ? '1. ما هو سبب حذف الحساب؟' : '1. What made you leave?'}
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
                          "w-full p-4 border rounded-xl text-xs font-medium text-start transition-all duration-150 flex items-center justify-between cursor-pointer active:scale-[0.97]",
                          surveyBothered === opt.key
                            ? "bg-red-500/10 border-red-500/50 text-white"
                            : "bg-white/[0.02] border-white/5 text-white/50 hover:text-white hover:border-white/10"
                        )}
                      >
                        <span>{isRTL ? opt.ar : opt.en}</span>
                        {surveyBothered === opt.key && (
                          <CheckCircle2 className="text-sm text-red-500 w-3.5 h-3.5" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question 2: Star rating */}
                <div className="space-y-3">
                  <label className="text-[10px] md:text-xs text-white/50 font-medium block">
                    {isRTL ? '2. كيف تقيم تجربتك من 5؟' : '2. How would you rate your experience out of 5?'}
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
                          className="p-2 transition-transform duration-200 active:scale-90 cursor-pointer"
                        >
                          <Star className={cn(" text-3xl font-black transition-all",
                              isActive ? "fill-1 text-red-500 scale-110 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "text-white/20 hover:text-white/40")} />
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Question 3: Better alternative? */}
                <div className="space-y-3">
                  <label className="text-[10px] md:text-xs text-white/50 font-medium block">
                    {isRTL ? '3. هل وجدت بديلاً أفضل؟ (اختياري)' : '3. Did you find a better alternative? (optional)'}
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
                  className="w-full bg-red-600 hover:bg-red-500 text-white py-3.5 font-semibold text-sm rounded-xl transition-all duration-150 shadow-lg shadow-red-600/10 cursor-pointer active:scale-[0.97]"
                >
                  {isRTL ? 'تأكيد الحذف النهائي' : 'Yes, delete my account'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false)
                    playBlip()
                  }}
                  className="w-full bg-transparent border border-white/10 hover:bg-white/5 text-white/60 hover:text-white py-3 font-medium text-sm rounded-xl transition-all duration-150 cursor-pointer active:scale-[0.97]"
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
              </div>

            </motion.div>

          </div>
        )}
      </AnimatePresence>

      {/* RANKS ROADMAP MODAL */}
      <AnimatePresence>
        {isRanksRoadmapOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-[#0c0c0c] border border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden"
              style={{ boxShadow: `0 0 40px ${currentTheme.color}15` }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                <div className="text-start">
                  <h3 className="font-space font-black text-lg text-white uppercase tracking-widest leading-none">
                    {isRTL ? 'خريطة الرتب' : 'RANKS ROADMAP'}
                  </h3>
                  <p className="text-[8px] font-space tracking-[0.2em] uppercase font-black mt-1" style={{ color: currentTheme.color }}>
                    {isRTL ? 'مسار التقدم ورتب النظام' : 'SYSTEM_PROGRESSION_TIERS'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setIsRanksRoadmapOpen(false); playBlip(); }}
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable list of ranks */}
              <div className="flex-1 overflow-y-auto pe-1 space-y-4 scrollbar-thin text-start">
                {RANKS_DATA.map((rank) => {
                  const isCurrent = activeRank.id === rank.id
                  const isUnlocked = currentXp >= rank.threshold && !isCurrent
                  const isLocked = currentXp < rank.threshold

                  return (
                    <div
                      key={rank.id}
                      className={cn(
                        "p-4 rounded-2xl border flex items-center justify-between transition-all relative overflow-hidden backdrop-blur-md bg-black/40",
                        isCurrent 
                          ? "border-[var(--card-border)] ring-1 ring-white/15 scale-[1.02]"
                          : isUnlocked
                            ? "border-white/5 opacity-80" 
                            : "border-white/5 opacity-50"
                      )}
                      style={isCurrent ? { 
                        borderColor: rank.color,
                        boxShadow: `0 0 25px ${rank.color}25, inset 0 0 12px ${rank.color}10`
                      } : {}}
                    >
                      {/* Left Side: Crystal & Info */}
                      <div className="flex items-center gap-4">
                        {/* Crystal Container */}
                        <div className="relative shrink-0 w-16 h-20 flex items-center justify-center">
                          {isLocked ? (
                            <div className="grayscale opacity-40 relative flex items-center justify-center w-full h-full">
                              <EnergyCell percentage={0} color={rank.color} size="sm" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Lock className="w-4 h-4 text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]" />
                              </div>
                            </div>
                          ) : isCurrent ? (
                            <EnergyCell percentage={Math.round(progressPercent)} color={rank.color} size="sm" />
                          ) : (
                            <EnergyCell percentage={100} color={rank.color} size="sm" />
                          )}
                        </div>

                        {/* Title and XP */}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 
                              className="font-space font-black text-sm uppercase tracking-wider"
                              style={{ color: rank.color }}
                            >
                              {isRTL ? (
                                rank.id === 'SILVER' ? 'سيلفر' :
                                rank.id === 'GOLD' ? 'جولد' :
                                rank.id === 'PLATINUM' ? 'بلاتينوم' :
                                rank.id === 'DIAMOND' ? 'دايموند' :
                                rank.id === 'CROWN' ? 'كراون' :
                                rank.id === 'ACE' ? 'ايس' : 'كونكر'
                              ) : rank.name}
                            </h4>
                            {isCurrent && (
                              <span 
                                className="text-[9px] font-space font-black px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse"
                                style={{ 
                                  backgroundColor: `${rank.color}20`,
                                  color: rank.color,
                                  border: `1px solid ${rank.color}40`
                                }}
                              >
                                {isRTL ? 'الرتبة الحالية' : 'Current Rank'}
                              </span>
                            )}
                            {isUnlocked && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" />
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                            {rank.id === 'CONQUEROR' ? (
                              isRTL ? 'المتصدر #1' : 'TOP #1 LEAD'
                            ) : (
                              `${rank.threshold.toLocaleString()} XP`
                            )}
                          </p>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 max-w-[240px]">
                            {isRTL ? (
                              rank.id === 'SILVER' ? 'الميزات القياسية مفتوحة' :
                              rank.id === 'GOLD' ? 'لقب تحت الاسم (hasTitle)' :
                              rank.id === 'PLATINUM' ? 'إطار حول الصورة (hasAvatarBorder)' :
                              rank.id === 'DIAMOND' ? 'تفاعلات شات حصرية (hasExclusiveEmojis)' :
                              rank.id === 'CROWN' ? 'توهج الاسم بالكامل (hasNameGlow)' :
                              rank.id === 'ACE' ? 'بطاقة هوية بالهوفر (hasCallingCard)' : 'اللقب المتصدر الأول + كافة الميزات الحصرية'
                            ) : rank.perk}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AVATAR SELECTOR MODAL */}
      {isAvatarSelectorOpen && (
        <AvatarSelector onClose={() => setIsAvatarSelectorOpen(false)} />
      )}

    </div>
  )
}

/*
ORIGINAL_UNTOUCHED_CODE_FOR_REFERENCE:
'use client'

import { AlertTriangle, CheckCircle2, FileText, HelpCircle, Lock, LogOut, Star, User, Brain, Settings as SettingsIcon, Moon, Sun, Trophy, Volume2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGrowth } from '@/context/GrowthContext'
import { createClient } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { useSound } from '@/context/SoundContext'
import CustomSelect from '@/components/ui/CustomSelect'
import { deleteOwnAccount } from '@/app/actions/adminActions'
import AvatarSelector from '@/components/ui/AvatarSelector'

interface RankData {
  id: string
  name: string
  threshold: number
  themeId: string
  color: string
  neonClass: string
  perk: string
  unlocks: string
  vessel: string
}

const RANKS_DATA: RankData[] = [
  {
    id: 'SILVER',
    name: 'SILVER',
    threshold: 0,
    themeId: 'SILVER',
    color: '#94a3b8',
    neonClass: 'neon-silver',
    perk: 'Standard Features Unlocked',
    unlocks: 'Access to Notes and Settings pages',
    vessel: 'Cylinder'
  },
  {
    id: 'GOLD',
    name: 'GOLD',
    threshold: 400,
    themeId: 'GOLD',
    color: '#FACC15',
    neonClass: 'neon-gold',
    perk: 'Exclusive Title Badge',
    unlocks: 'Special title showing below username',
    vessel: 'Cylinder'
  },
  {
    id: 'PLATINUM',
    name: 'PLATINUM',
    threshold: 1000,
    themeId: 'PLATINUM',
    color: '#38bdf8',
    neonClass: 'neon-platinum',
    perk: 'Premium Avatar Border',
    unlocks: 'Glow border framing profile picture',
    vessel: 'Hex'
  },
  {
    id: 'DIAMOND',
    name: 'DIAMOND',
    threshold: 2000,
    themeId: 'DIAMOND',
    color: '#d500f9',
    neonClass: 'neon-diamond',
    perk: 'Exclusive Chat Emojis',
    unlocks: 'Special reactive emojis in squad threads',
    vessel: 'Crystal'
  },
  {
    id: 'CROWN',
    name: 'CROWN',
    threshold: 4000,
    themeId: 'CROWN',
    color: '#F97316',
    neonClass: 'neon-crown',
    perk: 'Name Neon Glow effect',
    unlocks: 'Vibrant custom neon glow around username',
    vessel: 'Crystal'
  },
  {
    id: 'ACE',
    name: 'ACE',
    threshold: 7000,
    themeId: 'ACE',
    color: '#EF4444',
    neonClass: 'neon-ace',
    perk: 'Player Calling Card',
    unlocks: 'Interactive profile card on user hover',
    vessel: 'Shard'
  },
  {
    id: 'CONQUEROR',
    name: 'CONQUEROR',
    threshold: 12000,
    themeId: 'CONQUEROR',
    color: '#FACC15',
    neonClass: 'neon-conqueror',
    perk: 'Top #1 Champion Dominance',
    unlocks: 'Exclusive animated dynamic gradient badge (Top XP Leader)',
    vessel: 'Sphere'
  }
]

export default function SettingsPage() {
  const { profile, setProfile, isLoading, refreshProfile, mounted, t, isRTL, currentTheme, restartTour } = useGrowth()
  const { showToast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const { volume, setVolume, isMuted, setIsMuted, playBlip } = useSound()

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
  const [isPwaInstalled, setIsPwaInstalled] = useState<boolean>(false)
  const [pwaPromptAvailable, setPwaPromptAvailable] = useState<boolean>(false)

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'))
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsPwaInstalled(
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true
      )
      setPwaPromptAvailable(!!(window as any).deferredPWAInstallPrompt)
    }

    const handlePwaPrompt = () => setPwaPromptAvailable(true)
    const handleAppInstalled = () => {
      setIsPwaInstalled(true)
      setPwaPromptAvailable(false)
    }

    window.addEventListener('pwa-prompt-available', handlePwaPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('pwa-prompt-available', handlePwaPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Dynamic AI Name Header calculation (No hardcoded "COACH" word)
  const aiNameHeader = profile?.ai_name 
    ? profile.ai_name 
    : (isRTL ? 'المنظومة الذكية' : 'AI Coach')

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

  const handleSaveDirectly = async (updatedData: typeof formData, customDarkMode?: boolean) => {
    setSaving(true)

    // Apply theme on save
    const activeDarkMode = customDarkMode !== undefined ? customDarkMode : isDarkMode
    const themeKey = activeDarkMode ? 'dark' : 'light'
    document.documentElement.classList.toggle('dark', activeDarkMode)
    localStorage.setItem('theme', themeKey)

    const { data: { user } } = await supabase.auth.getUser()
    
    // ── GUEST MODE INTERCEPT ──
    if (!user || profile?.id === 'guest') {
      if (profile) {
        const optimistic = {
          ...profile,
          full_name: updatedData.full_name || profile.full_name,
          ai_name: updatedData.ai_name || null,
          language: updatedData.language as any,
          gender: updatedData.gender || profile.gender,
          age: updatedData.age ? parseInt(updatedData.age) : profile.age,
        }
        setProfile(optimistic)
        if (typeof window !== 'undefined') {
          localStorage.setItem('cached_profile', JSON.stringify(optimistic))
          localStorage.setItem('language', updatedData.language)
          localStorage.setItem('cached_name', updatedData.full_name)
        }
      }
      // showToast(updatedData.language === 'ar' ? 'تم الحفظ ✓' : 'Saved ✓', 'success')
      setSaving(false)
      return
    }

    // ── OPTIMISTIC UPDATE: immediately push changes to context
    if (profile) {
      const optimistic = {
        ...profile,
        full_name: updatedData.full_name || profile.full_name,
        ai_name: updatedData.ai_name || null,
        language: updatedData.language as any,
        gender: updatedData.gender || profile.gender,
        age: updatedData.age ? parseInt(updatedData.age) : profile.age,
      }
      setProfile(optimistic)
      if (typeof window !== 'undefined') {
        localStorage.setItem('cached_profile', JSON.stringify(optimistic))
        localStorage.setItem('language', updatedData.language)
        localStorage.setItem('cached_name', updatedData.full_name)
      }
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: updatedData.full_name,
        age: updatedData.age ? parseInt(updatedData.age) : null,
        language: updatedData.language,
        ai_name: updatedData.ai_name || null,
        gender: updatedData.gender || null,
        xp: profile?.xp || 0,
        onboarded: profile?.onboarded ?? true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (!error) {
      localStorage.setItem('language', updatedData.language)
      localStorage.setItem('cached_name', updatedData.full_name)
      refreshProfile()
      // showToast(updatedData.language === 'ar' ? 'تم الحفظ ✓' : 'Saved ✓', 'success')
    } else {
      showToast(updatedData.language === 'ar' ? 'فشل حفظ الإعدادات ⚠️' : 'Failed to update settings ⚠️', 'warning')
      console.error('Save failed:', error)
    }
    setSaving(false)
  }

  const handleSave = () => handleSaveDirectly(formData)

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

  const handleDecrementVolume = () => {
    const newVol = Math.max(0, volume - 0.05)
    setVolume(newVol)
    playBlip()
  }

  const handleIncrementVolume = () => {
    const newVol = Math.min(1, volume + 0.05)
    setVolume(newVol)
    playBlip()
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
    <>
      <div className="p-16 font-space animate-pulse tracking-widest text-sm md:text-base text-center" style={{ color: currentTheme.color }}>
        {isRTL ? 'جاري التحميل...' : 'LOADING USER DATA...'}
      </div>
    </>
  )

  const currentRankId = profile?.rank?.toUpperCase() || 'SILVER'
  const currentXp = profile?.xp || 0
  const activeRank = RANKS_DATA.find(r => r.id === currentRankId) || RANKS_DATA[0]
  const nextRank = RANKS_DATA[RANKS_DATA.indexOf(activeRank) + 1] || activeRank
  const progressPercent = nextRank !== activeRank 
    ? Math.min(100, Math.max(0, (currentXp - activeRank.threshold) / (nextRank.threshold - activeRank.threshold) * 100))
    : 100

  return (
    <div className="min-h-[calc(100dvh-64px)] p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-6">
        
        {... rest of original return ...}

      </div>
    </div>
  )
}
*/
