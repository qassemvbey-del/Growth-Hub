'use client'

import Sidebar from './Sidebar'
import AnimatedLogo from '@/components/ui/AnimatedLogo'
import { useGrowth } from '@/context/GrowthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { usePathname, useRouter } from 'next/navigation'
import { useSound } from '@/context/SoundContext'


import { useInbox } from '@/hooks/useInbox'
import InboxDropdown from '@/components/ui/InboxDropdown'
import ReportModal from '@/components/ui/ReportModal'
import PomodoroHUD from '@/components/ui/PomodoroHUD'
import CoachPanel from '@/components/ui/CoachPanel'
import OperatorGuide from '@/components/ui/OperatorGuide'
import GlobalActionMenu from '@/components/ui/GlobalActionMenu'
import AuthModal from '@/components/auth/AuthModal'
import EntryGateModal from '@/components/auth/EntryGateModal'
import LevelUpModal from '@/components/ui/LevelUpModal'
import GlitchOverlay from '@/components/ui/GlitchOverlay'
import OnboardingOverlay from '@/components/ui/OnboardingOverlay'

interface ShellProps {
  children: React.ReactNode
  syncedMissions?: any[]
  onMissionsRefresh?: () => void
}

export default function Shell({ children, syncedMissions = [], onMissionsRefresh }: ShellProps) {
  // 1. ALL HOOKS AT THE TOP
  const { isRTL, profile, calculateAccountability, lastAiMessage, t, currentTheme, isRankUpModalOpen, setIsRankUpModalOpen, isLoading } = useGrowth()
  const pathname = usePathname()
  const router = useRouter()
  const { playNeuralLink, playBlip } = useSound()
  const [aiOpen, setAiOpen] = useState(false)
  const [coachPanelOpen, setCoachPanelOpen] = useState(false)
  const [inboxOpen, setInboxOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [streak, setStreak] = useState(0)

  const desktopInboxRef = useRef<HTMLDivElement>(null)
  const mobileInboxRef = useRef<HTMLDivElement>(null)

  // Real-time Network Radar States
  const [networkStatus, setNetworkStatus] = useState<'ONLINE' | 'OFFLINE' | 'LAG'>('ONLINE')
  const [showSyncSuccess, setShowSyncSuccess] = useState(false)
  const [prevStatus, setPrevStatus] = useState<'ONLINE' | 'OFFLINE' | 'LAG'>('ONLINE')

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!navigator.onLine) {
      setNetworkStatus('OFFLINE')
    }

    const handleOnline = () => {
      setNetworkStatus('ONLINE')
    }

    const handleOffline = () => {
      setNetworkStatus('OFFLINE')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const checkLatency = async () => {
      if (!navigator.onLine) {
        setNetworkStatus('OFFLINE')
        return
      }

      const conn = (navigator as any).connection
      if (conn && (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g')) {
        setNetworkStatus('LAG')
        return
      }

      const start = performance.now()
      try {
        await fetch('/api/weather?ping=' + Date.now(), { method: 'HEAD', cache: 'no-store' })
        const latency = performance.now() - start
        if (latency > 800) {
          setNetworkStatus('LAG')
        } else {
          setNetworkStatus('ONLINE')
        }
      } catch (err) {
        // network issue or timeout
      }
    }

    const interval = setInterval(checkLatency, 15000)
    checkLatency()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (networkStatus === 'ONLINE' && (prevStatus === 'OFFLINE' || prevStatus === 'LAG')) {
      setShowSyncSuccess(true)
      const timer = setTimeout(() => setShowSyncSuccess(false), 4000)
      setPrevStatus('ONLINE')
      return () => clearTimeout(timer)
    }
    if (networkStatus !== prevStatus) {
      setPrevStatus(networkStatus)
    }
  }, [networkStatus, prevStatus])

  const renderNetworkPill = (isMobile: boolean) => {
    if (networkStatus === 'OFFLINE') {
      return (
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1 bg-black/85 border border-red-500/30 rounded-lg backdrop-blur-md shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.15)]", 
          isMobile ? "max-w-[160px] md:max-w-none truncate" : ""
        )}>
          <span className="text-[9px] md:text-xs font-space font-black tracking-wider text-red-500 uppercase animate-pulse">
            [ ⚠️ CONNECTION ERROR // OFFLINE MODE ]
          </span>
        </div>
      )
    }
    if (networkStatus === 'LAG') {
      return (
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1 bg-black/85 border border-amber-500/30 rounded-lg backdrop-blur-md shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.15)]", 
          isMobile ? "max-w-[170px] md:max-w-none truncate" : ""
        )}>
          <span className="text-[9px] md:text-xs font-space font-black tracking-wider text-amber-500 uppercase">
            [ ⏳ NETWORK LAG // OPTIMISTIC SYNC ACTIVE ]
          </span>
        </div>
      )
    }
    if (showSyncSuccess) {
      return (
        <div 
          className={cn(
            "flex items-center gap-1.5 px-3 py-1 bg-black/85 border rounded-lg backdrop-blur-md transition-opacity duration-500 shrink-0", 
            isMobile ? "max-w-[155px] md:max-w-none truncate" : ""
          )}
          style={{ 
            borderColor: `${currentTheme.color}30`,
            boxShadow: `0 0 15px ${currentTheme.color}15`
          }}
        >
          <span className="text-[9px] md:text-xs font-space font-black tracking-wider uppercase animate-[pulse_2s_infinite]" style={{ color: currentTheme.color }}>
            [ ⚡ WORKSPACE SYNCED ]
          </span>
        </div>
      )
    }
    return null
  }

  const [mounted, setMounted] = useState(false)
  const [onboardingComplete, setOnboardingComplete] = useState(() => {
    // Read synchronously on init to prevent flash for existing users
    if (typeof window !== 'undefined') {
      return localStorage.getItem('onboarding_complete') === 'true'
    }
    return true // default to true on SSR (no overlay shown)
  })
  const [shellIsRTL, setShellIsRTL] = useState(false)

  useEffect(() => {
    setMounted(true)
    const lang = localStorage.getItem('language') || 'en'
    const rtl = lang === 'ar'
    setShellIsRTL(rtl)
    setOnboardingComplete(localStorage.getItem('onboarding_complete') === 'true')
    if (typeof document !== 'undefined') {
      document.documentElement.dir = rtl ? 'rtl' : 'ltr'
      document.documentElement.lang = rtl ? 'ar' : 'en'
    }
  }, [])

  useEffect(() => {
    setShellIsRTL(isRTL)
  }, [isRTL])

  const handleOnboardingComplete = async () => {
    localStorage.setItem('onboarding_complete', 'true')
    setOnboardingComplete(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ onboarded: true }).eq('id', user.id)
    }
  }

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = shellIsRTL ? 'rtl' : 'ltr'
    }
  }, [shellIsRTL])

  const getRoleIcon = (url?: string | null) => {
    if (!url) return 'account_circle'
    if (url.includes('omar')) return 'laptop_mac'
    if (url.includes('maya')) return 'school'
    if (url.includes('ismail')) return 'work'
    if (url.includes('zain')) return 'rocket_launch'
    if (url.includes('menna')) return 'videocam'
    if (url.includes('nour')) return 'trending_up'
    return 'cloud_sync'
  }

  const { reports, markAsRead } = useInbox()
  const unreadCount = useMemo(() => reports.filter(r => !r.is_read).length, [reports])

  useEffect(() => {
    async function calculateStreak() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('task_completion_log')
        .select('completed_at')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })

      if (!data || data.length === 0) return

      const days = [...new Set(data.map(r =>
        new Date(r.completed_at).toISOString().split('T')[0]
      ))].sort((a, b) => b.localeCompare(a))

      let count = 0
      const today = new Date().toISOString().split('T')[0]
      let cursor = new Date(today)

      for (const day of days) {
        const cursorStr = cursor.toISOString().split('T')[0]
        if (day === cursorStr) {
          count++
          cursor.setDate(cursor.getDate() - 1)
        } else {
          break
        }
      }
      setStreak(count)
    }
    calculateStreak()
  }, [])

  useEffect(() => {
    if (!aiOpen) return
    const timer = setTimeout(() => setAiOpen(false), 8000)
    return () => clearTimeout(timer)
  }, [aiOpen])

  // Global Escape key listener to close active overlays/panels/modals in Shell
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return

      // Input Protection Guardrail:
      // If focused inside input/textarea/contenteditable, blur and stop.
      const activeEl = document.activeElement
      if (
        activeEl && (
          activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true' ||
          (activeEl as HTMLElement).isContentEditable
        )
      ) {
        (activeEl as HTMLElement).blur()
        e.stopPropagation()
        e.preventDefault()
        return
      }

      // CONDITION 1 (Active Modals):
      // Check if any popup modal is open.
      const isModalOpenInDOM = typeof document !== 'undefined' && (
        !!document.querySelector('.fixed.inset-0.backdrop-blur-md') ||
        !!document.querySelector('.fixed.inset-0.backdrop-blur-sm') ||
        !!document.querySelector('.fixed.inset-0.bg-black\\/80') ||
        !!document.querySelector('.fixed.inset-0.bg-white\\/90') ||
        !!document.querySelector('.fixed.inset-0.bg-white\\/60')
      )
      
      const isModalOpen = isRankUpModalOpen || !!selectedReport || isModalOpenInDOM

      if (isModalOpen) {
        // Close global modals managed by Shell/Context:
        if (isRankUpModalOpen) {
          setIsRankUpModalOpen(false)
        }
        if (selectedReport) {
          setSelectedReport(null)
        }
        // Dispatch custom window event to notify child pages to close their local modals
        window.dispatchEvent(new CustomEvent('close-all-modals'))
        e.stopPropagation()
        e.preventDefault()
        return
      }

      // CONDITION 2 (Active Dropdowns/Inbox/Panels):
      if (inboxOpen || coachPanelOpen || aiOpen) {
        setInboxOpen(false)
        setCoachPanelOpen(false)
        setAiOpen(false)
        e.stopPropagation()
        e.preventDefault()
        return
      }

      // CONDITION 3 (Page Navigation):
      router.back()
      e.stopPropagation()
      e.preventDefault()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isRankUpModalOpen, selectedReport, inboxOpen, coachPanelOpen, aiOpen, router, setIsRankUpModalOpen])

  // Click outside to dismiss notifications
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (inboxOpen) {
        const clickedInsideDesktop = desktopInboxRef.current?.contains(target)
        const clickedInsideMobile = mobileInboxRef.current?.contains(target)
        if (!clickedInsideDesktop && !clickedInsideMobile) {
          setInboxOpen(false)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [inboxOpen])

  const hasRedZoneMission = useMemo(() => {
    return (syncedMissions || []).some(m => calculateAccountability(m).isInRedZone)
  }, [syncedMissions, calculateAccountability])

  useEffect(() => {
    const hasShown = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('redZoneShown') : null;
    if (hasRedZoneMission && !hasShown && !aiOpen) {
      setAiOpen(true)
      playNeuralLink()
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('redZoneShown', 'true')
    }
  }, [hasRedZoneMission, aiOpen])

  const systemProgress = useMemo(() => {
    if (!syncedMissions || syncedMissions.length === 0) return 0
    let totalPct = 0
    syncedMissions.forEach(m => {
      totalPct += calculateAccountability(m).progress
    })
    return Math.round(totalPct / syncedMissions.length)
  }, [syncedMissions, calculateAccountability])

  // AI message bubble auto-open removed per user request

  const personality = useMemo(() => {
    const rank = profile?.rank || 'SILVER'
    if (rank === 'CONQUEROR') return 'SAVAGE'
    if (rank === 'ACE' || rank === 'CROWN') return 'DIRECT'
    return 'SUPPORTIVE'
  }, [profile?.rank])

  if (isLoading || !mounted) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-black z-[9999]">
        <div className="flex flex-col items-center gap-6">
          {/* Glassmorphic Cyber Spinner */}
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 rounded-full border-t-4 border-l-4 border-transparent border-t-[var(--theme-color)] border-l-[var(--theme-color)] animate-spin" style={{ opacity: 0.8, filter: 'drop-shadow(0 0 10px var(--theme-color))' }} />
            <div className="absolute inset-2 rounded-full border-b-4 border-r-4 border-transparent border-b-[var(--theme-color)] border-r-[var(--theme-color)] animate-spin-reverse" style={{ opacity: 0.5 }} />
            <div className="absolute inset-4 rounded-full bg-[var(--theme-color)]/10 backdrop-blur-md flex items-center justify-center animate-pulse">
              <span className="material-symbols-outlined text-[var(--theme-color)] text-3xl">token</span>
            </div>
          </div>
          <p className="font-monospace text-[var(--theme-color)] tracking-[0.3em] text-sm animate-pulse">
            {shellIsRTL ? 'جاري تحميل مساحة العمل...' : 'LOADING WORKSPACE...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'min-h-screen bg-transparent text-foreground flex relative transition-colors duration-500',
        networkStatus === 'OFFLINE' && 'connection-offline'
      )}
      style={{ 
        ['--selection-bg' as any]: `${currentTheme.color}33`, 
        ['--selection-text' as any]: currentTheme.color 
      }}
      dir={shellIsRTL ? 'rtl' : 'ltr'}
    >
      {networkStatus === 'OFFLINE' && (
        <style>{`
          .connection-offline button:not(.nav-btn):not(.close-btn):not(.tab-btn):not(.inbox-btn):not(.sidebar-toggle):not(.sound-toggle):not(.pomodoro-btn) {
            filter: blur(1.5px) !important;
            pointer-events: none !important;
            opacity: 0.4 !important;
            cursor: not-allowed !important;
          }
        `}</style>
      )}
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none z-[100] scanlines opacity-[0.02]" />
      <div className="fixed inset-0 pointer-events-none z-0 cyber-grid opacity-[0.05]" />

      <Sidebar isRTL={isRTL} onOpenCoach={() => { setCoachPanelOpen(true); playNeuralLink(); }} />

      <main className={cn(
        'flex-1 min-h-screen pb-20 lg:pb-0 transition-all duration-500 relative z-10 w-full max-w-full overflow-x-hidden',
        'lg:ps-72 lg:max-w-none'
      )}>
        {/* ── DESKTOP TOP BAR (TRANSIENT TELEMETRY ONLY) ── */}
        <header className="hidden lg:flex w-full px-8 h-16 justify-end items-center border-b border-[var(--card-border)] bg-[var(--sidebar-bg)]/95 backdrop-blur-2xl z-[150] sticky top-0 transition-colors duration-500 relative">
          <div className="absolute -bottom-[1px] inset-inline-start-12 w-48 h-[1px] shadow-[0_0_15px_currentcolor]" style={{ backgroundColor: currentTheme.color, color: currentTheme.color }} />

          {/* CENTER: Core Brand Text */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center" dir="ltr">
            <AnimatedLogo className="text-xl md:text-2xl tracking-[0.25em]" />
          </div>

          <div className="flex items-center gap-6">
            {/* Real-time Network Radar */}
            {renderNetworkPill(false)}

            {/* ⚡ XP: {xp_value} */}
            <div className="flex items-center gap-2 border-e border-[var(--card-border)] pe-6 shrink-0" title={isRTL ? 'نقاط الخبرة' : 'XP Readout'}>
              <motion.span
                className="material-symbols-outlined text-xl shrink-0"
                style={{ color: currentTheme.color, filter: `drop-shadow(0 0 6px ${currentTheme.color})` }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                bolt
              </motion.span>
              <span className="text-sm md:text-base font-space font-black tracking-widest uppercase text-zinc-900 dark:text-zinc-100">
                XP: <span style={{ color: currentTheme.color }}>{profile?.xp || 0}</span>
              </span>
            </div>

            {/* 🔥 {streak_days}d */}
            <div className="flex items-center gap-2 border-e border-[var(--card-border)] pe-6 shrink-0" title={isRTL ? 'سلسلة الأيام' : 'Streak'}>
              <span
                className={cn('material-symbols-outlined text-lg md:text-xl transition-all duration-500', streak > 0 ? 'scale-110 animate-pulse' : 'opacity-20')}
                style={{
                  color: streak > 0 ? (personality === 'SAVAGE' ? '#FF0055' : '#FF5F00') : undefined,
                  filter: streak > 0 ? `drop-shadow(0 0 6px ${personality === 'SAVAGE' ? '#FF0055' : '#FF5F00'})` : 'none'
                }}
              >
                local_fire_department
              </span>
              <span
                className="text-sm md:text-base font-space tracking-wider font-black uppercase text-zinc-900 dark:text-zinc-100 flex items-center gap-1"
                style={{ opacity: streak > 0 ? 1 : 0.4 }}
              >
                <span>{streak}</span>
                <span className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 font-bold">d</span>
              </span>
            </div>

            {/* 🔔 Inbox Dropdown */}
            <div className="relative shrink-0" ref={desktopInboxRef}>
              <button
                onClick={() => {
                  setInboxOpen(!inboxOpen)
                  setAiOpen(false)
                  playBlip()
                }}
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full transition-all border relative cursor-pointer inbox-btn",
                  inboxOpen 
                    ? "bg-[var(--input-bg)] border-[var(--card-border)] text-[var(--text-primary)] shadow-[0_0_15px_rgba(255,255,255,0.2)]" 
                    : "bg-[var(--input-bg)] border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[var(--card-border)] hover:text-[var(--text-primary)]"
                )}
                title={isRTL ? 'الإشعارات' : 'Notifications'}
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                {unreadCount > 0 && (
                  <span 
                    className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF0055] text-white text-[8px] font-black flex items-center justify-center rounded-full shadow-[0_0_10px_#FF0055]"
                  >
                    {unreadCount}
                  </span>
                )}
              </button>

              <InboxDropdown 
                isOpen={inboxOpen}
                reports={reports}
                onClose={() => setInboxOpen(false)}
                onRead={(report) => {
                  markAsRead(report.id)
                  setSelectedReport(report)
                  setInboxOpen(false)
                }}
                themeColor={currentTheme.color}
              />
            </div>
          </div>
        </header>

        {/* ── MOBILE TOP BAR ── */}
        <header className="flex lg:hidden w-full px-4 h-16 justify-between items-center border-b border-[var(--card-border)] bg-[var(--sidebar-bg)]/95 backdrop-blur-2xl z-[150] sticky top-0 transition-colors duration-500 relative">
          {/* LEFT: User Avatar Image */}
          <div 
            onClick={() => router.push('/settings')}
            className="relative w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr flex items-center justify-center cursor-pointer shadow-md shrink-0 active:scale-95 transition-transform"
            style={{ 
              backgroundImage: `linear-gradient(to top right, ${currentTheme.color}, ${currentTheme.color}88, transparent, ${currentTheme.color})`,
              boxShadow: `0 0 15px ${currentTheme.color}33`
            }}
            title={isRTL ? 'الملف الشخصي' : 'User Profile'}
          >
            <div className="w-full h-full rounded-full overflow-hidden bg-zinc-100/80 dark:bg-white/15 backdrop-blur-md p-0.5 flex items-center justify-center border border-black/20 dark:border-white/10">
              {mounted && profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="User" className="w-[90%] h-[90%] mx-auto object-contain p-1 rounded-full" />
              ) : (
                <span className="material-symbols-outlined text-[var(--text-secondary)] text-lg">person</span>
              )}
            </div>
            {/* Visual Role Icon Overlay Badge at bottom-right */}
            {mounted && profile?.avatar_url && (
              <div 
                className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full flex items-center justify-center border border-[var(--sidebar-bg)] shadow-md z-20 backdrop-blur-md"
                style={{ 
                  backgroundColor: currentTheme.color, 
                  color: '#000000',
                  boxShadow: `0 0 8px ${currentTheme.color}` 
                }}
              >
                <span className="material-symbols-outlined text-[9px] font-black">
                  {getRoleIcon(profile.avatar_url)}
                </span>
              </div>
            )}
          </div>

          {/* CENTER: Core Brand Text */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center" dir="ltr">
            <AnimatedLogo className="text-lg md:text-xl tracking-[0.2em]" />
          </div>

          {/* RIGHT: Exactly two action icons: 🔔 (Notifications) and 🤖 (Instant AI Coach Chat) */}
          <div className="flex items-center gap-3">
            {/* Real-time Network Radar */}
            {renderNetworkPill(true)}

            {/* 🔔 Notifications */}
            <div className="relative" ref={mobileInboxRef}>
              <button
                onClick={() => {
                  setInboxOpen(!inboxOpen)
                  setAiOpen(false)
                  playBlip()
                }}
                className={cn(
                  "flex items-center justify-center w-9 h-9 rounded-full transition-all border relative cursor-pointer inbox-btn",
                  inboxOpen 
                    ? "bg-[var(--input-bg)] border-[var(--card-border)] text-[var(--text-primary)] shadow-[0_0_15px_rgba(255,255,255,0.2)]" 
                    : "bg-[var(--input-bg)] border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[var(--card-border)] hover:text-[var(--text-primary)]"
                )}
                title={isRTL ? 'الإشعارات' : 'Notifications'}
              >
                <span className="material-symbols-outlined text-[18px]">notifications</span>
                {unreadCount > 0 && (
                  <span 
                    className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF0055] text-white text-[8px] font-black flex items-center justify-center rounded-full shadow-[0_0_10px_#FF0055]"
                  >
                    {unreadCount}
                  </span>
                )}
              </button>

              <InboxDropdown 
                isOpen={inboxOpen}
                reports={reports}
                onClose={() => setInboxOpen(false)}
                onRead={(report) => {
                  markAsRead(report.id)
                  setSelectedReport(report)
                  setInboxOpen(false)
                }}
                themeColor={currentTheme.color}
              />
            </div>

            {/* 🤖 Instant AI Coach Chat trigger */}
            <button
              onClick={() => {
                setCoachPanelOpen(true)
                playNeuralLink()
              }}
              className={cn(
                "flex items-center justify-center w-9 h-9 rounded-full transition-all border relative cursor-pointer shadow-md group nav-btn",
                coachPanelOpen
                  ? personality === 'SAVAGE'
                    ? 'bg-[#FF0055] border-[#FF0055] text-white shadow-[0_0_15px_rgba(255,0,85,0.4)]'
                    : 'bg-[#00E5FF] border-[#00E5FF] text-black shadow-[0_0_15px_rgba(0,229,255,0.4)]'
                  : 'bg-[var(--input-bg)] border-[var(--card-border)] text-[var(--text-secondary)] hover:border-cyan-400/50 hover:text-cyan-400'
              )}
              title={isRTL ? 'المدرب الذكي' : 'AI Coach'}
            >
              <div className="absolute inset-0 rounded-full animate-pulse opacity-20" style={{ backgroundColor: personality === 'SAVAGE' ? '#FF0055' : '#00E5FF' }}></div>
              <motion.span 
                animate={{ opacity: [1, 1, 0.2, 1, 1], rotate: [0, -5, 5, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                className="material-symbols-outlined text-[18px] relative z-10"
              >
                {personality === 'SAVAGE' ? 'whatshot' : 'smart_toy'}
              </motion.span>
            </button>
          </div>
        </header>

        {/* ── AI COACH FLOATING MESSAGE DROPDOWN ── */}
        <AnimatePresence>
          {aiOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={cn(
                "absolute top-20 left-1/2 -translate-x-1/2 w-[90vw] max-w-[320px] md:max-w-[400px] glass-panel p-5 md:p-6 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] space-y-4 z-[200]",
                profile?.ai_personality === 'SAVAGE'
                  ? "border-[#FF0055]/40 bg-white/95 dark:bg-[#050505]/95"
                  : "border-cyan-400/40 bg-white/95 dark:bg-[#050505]/95"
              )}
            >
              <div className="flex justify-between items-center border-b border-black/10 dark:border-white/10 pb-3">
                <span className={cn(
                  "text-[10px] md:text-[11px] font-space tracking-[0.3em] font-black uppercase",
                  profile?.ai_personality === 'SAVAGE' ? "text-[#FF0055]" : "text-cyan-600 dark:text-cyan-400"
                )}>
                  {profile?.ai_name || (isRTL ? 'المدرب' : 'COACH')} // {profile?.ai_personality === 'SAVAGE' ? (isRTL ? 'نمط شرس' : 'SAVAGE_MODE') : (isRTL ? 'متصل' : 'ONLINE')}
                </span>
                <button onClick={() => setAiOpen(false)} className="text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white transition-all close-btn">
                  <span className="material-symbols-outlined text-lg md:text-xl">close</span>
                </button>
              </div>
              <p className="text-[13px] md:text-[15px] font-space font-bold text-black/90 dark:text-white/90 leading-relaxed" dir="auto">
                "{lastAiMessage}"
              </p>
              <p className="text-[9px] font-space text-black/30 dark:text-white/30 tracking-widest uppercase">AUTO_CLOSE // 8S</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative">
          {children}
        </div>
      </main>

      {/* ── MOBILE BOTTOM NAVIGATION ── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-[var(--sidebar-bg)] border-t border-[var(--card-border)] z-[200] flex items-center justify-around px-2 backdrop-blur-2xl">
        {[
          { label: isRTL ? 'الرئيسية' : 'Home', icon: 'home', href: '/' },
          { label: isRTL ? 'الأهداف' : 'Goals', icon: 'flag', href: '/missions' },
          { label: isRTL ? 'الملاحظات' : 'Notes', icon: 'notes', href: '/notes' },
          { label: isRTL ? 'الإنجازات' : 'Wins', icon: 'trophy', href: '/achievements' },
        ].map(item => {
          const isActive = pathname === item.href
          return (
            <button
              key={item.href}
              onClick={() => { playBlip(); router.push(item.href) }}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all relative cursor-pointer",
                isActive ? "text-[var(--text-primary)] scale-105" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <span className="material-symbols-outlined text-xl" style={{ color: isActive ? currentTheme.color : undefined }}>
                {item.icon}
              </span>
              <span className="text-[9px] font-space font-bold tracking-wider uppercase">
                {item.label}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="mobileNavIndicator"
                  className="absolute top-0 inset-x-4 h-[2px]"
                  style={{ backgroundColor: currentTheme.color, boxShadow: `0 0 10px ${currentTheme.color}` }}
                />
              )}
            </button>
          )
        })}
      </nav>

      <ReportModal 
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
        themeColor={currentTheme.color}
        isRTL={isRTL}
      />

      <PomodoroHUD />

      <CoachPanel 
        isOpen={coachPanelOpen}
        onClose={() => setCoachPanelOpen(false)}
        missions={syncedMissions}
      />

      <div className={cn(
        "fixed top-0 bottom-0 w-[1px] bg-black/5 dark:bg-white/5 z-20 hidden md:block",
        "inset-inline-start-72"
      )} />

      <OperatorGuide />
      <GlobalActionMenu />

      <LevelUpModal />
      <GlitchOverlay active={isRankUpModalOpen} />

      {/* Overlays */}
      {mounted && !onboardingComplete && profile?.id !== 'guest' && (
        <OnboardingOverlay 
          language={profile?.language || 'en'}
          onComplete={() => {
            setOnboardingComplete(true)
            if (typeof window !== 'undefined') localStorage.setItem('onboarding_complete', 'true')
          }} 
        />
      )}
      <AuthModal />
      <EntryGateModal />
    </div>
  )
}
