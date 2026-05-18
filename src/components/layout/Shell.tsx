'use client'

import Sidebar from './Sidebar'
import { useGrowth } from '@/context/GrowthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useState, useEffect, useMemo } from 'react'
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
import LevelUpModal from '@/components/ui/LevelUpModal'
import GlitchOverlay from '@/components/ui/GlitchOverlay'

interface ShellProps {
  children: React.ReactNode
  syncedMissions?: any[]
  onMissionsRefresh?: () => void
}

export default function Shell({ children, syncedMissions = [], onMissionsRefresh }: ShellProps) {
  // 1. ALL HOOKS AT THE TOP
  const { isRTL, profile, calculateAccountability, lastAiMessage, t, currentTheme, isRankUpModalOpen } = useGrowth()
  const pathname = usePathname()
  const router = useRouter()
  const { playNeuralLink, playBlip } = useSound()
  const [aiOpen, setAiOpen] = useState(false)
  const [coachPanelOpen, setCoachPanelOpen] = useState(false)
  const [inboxOpen, setInboxOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [streak, setStreak] = useState(0)

  const [mounted, setMounted] = useState(false)
  const [shellIsRTL, setShellIsRTL] = useState(false)

  useEffect(() => {
    setMounted(true)
    const lang = localStorage.getItem('language') || 'en'
    const rtl = lang === 'ar'
    setShellIsRTL(rtl)
    document.documentElement.dir = rtl ? 'rtl' : 'ltr'
    document.documentElement.lang = rtl ? 'ar' : 'en'
  }, [])

  useEffect(() => {
    setShellIsRTL(isRTL)
  }, [isRTL])

  useEffect(() => {
    if (!mounted) return
    document.documentElement.dir = shellIsRTL ? 'rtl' : 'ltr'
  }, [shellIsRTL, mounted])

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

  // Show bubble when lastAiMessage changes
  useEffect(() => {
    if (lastAiMessage && lastAiMessage !== 'SYSTEM_ONLINE // STANDING_BY') {
      setAiOpen(true)
    }
  }, [lastAiMessage])

  const personality = useMemo(() => {
    const rank = profile?.rank || 'SILVER'
    if (rank === 'CONQUEROR') return 'SAVAGE'
    if (rank === 'ACE' || rank === 'CROWN') return 'DIRECT'
    return 'SUPPORTIVE'
  }, [profile?.rank])

  return (
    <div
      className={cn(
        'min-h-screen bg-transparent text-foreground flex relative transition-colors duration-500'
      )}
      style={{ 
        ['--selection-bg' as any]: `${currentTheme.color}33`, 
        ['--selection-text' as any]: currentTheme.color 
      }}
      dir={mounted ? (shellIsRTL ? 'rtl' : 'ltr') : 'ltr'}
    >
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none z-[100] scanlines opacity-[0.02]" />
      <div className="fixed inset-0 pointer-events-none z-0 cyber-grid opacity-[0.05]" />

      <Sidebar isRTL={isRTL} />

      <main className={cn(
        'flex-1 min-h-screen pb-20 lg:pb-0 transition-all duration-500 relative z-10 w-full max-w-full overflow-x-hidden',
        'lg:ps-72 lg:max-w-none'
      )}>
        {/* Top Navigation */}
        <header className="w-full px-4 md:px-8 h-16 flex justify-between items-center border-b border-[var(--card-border)] bg-[var(--sidebar-bg)]/95 backdrop-blur-2xl z-[150] sticky top-0 transition-colors duration-500">
          <div className="absolute -bottom-[1px] inset-inline-start-12 w-48 h-[1px] shadow-[0_0_15px_currentcolor]" style={{ backgroundColor: currentTheme.color, color: currentTheme.color }} />

          {/* LEFT: GROWTH_HUB Brand + Streak */}
          <div className="flex items-center gap-2 md:gap-3 max-w-[35%] truncate">
            {/* Breathing bolt */}
            <motion.span
              className="material-symbols-outlined text-lg md:text-xl shrink-0"
              style={{ color: currentTheme.color, filter: `drop-shadow(0 0 6px ${currentTheme.color})` }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              bolt
            </motion.span>

            {/* Streak Indicator */}
            <div className="hidden sm:flex items-center gap-1 border-l border-[var(--card-border)] pl-3" title={isRTL ? 'سلسلة الأيام' : 'Streak'}>
              <span
                className={cn('material-symbols-outlined text-sm transition-all duration-500', streak > 0 ? 'scale-110 animate-pulse' : 'opacity-20')}
                style={{
                  color: streak > 0 ? (personality === 'SAVAGE' ? '#FF0055' : '#FF5F00') : undefined,
                  filter: streak > 0 ? `drop-shadow(0 0 6px ${personality === 'SAVAGE' ? '#FF0055' : '#FF5F00'})` : 'none'
                }}
              >
                local_fire_department
              </span>
              <span
                className="text-[10px] font-space tracking-tight font-black uppercase"
                style={{ color: streak > 0 ? (personality === 'SAVAGE' ? '#FF0055' : '#FF5F00') : undefined, opacity: streak > 0 ? 1 : 0.2 }}
              >
                {streak}{streak > 0 && <span className="hidden md:inline"> {isRTL ? (streak === 1 ? 'يوم' : 'أيام') : (streak === 1 ? 'DAY' : 'DAYS')}</span>}
              </span>
            </div>
          </div>

          {/* CENTER: AI Coach */}
          <div className="flex items-center justify-center flex-1 relative">
            <button
              onClick={() => {
                setCoachPanelOpen(true);
                playNeuralLink();
              }}
              className={cn(
                "flex items-center gap-2 px-3 md:px-5 py-1.5 md:py-2 rounded-full transition-all duration-300 border shadow-lg group relative",
                coachPanelOpen
                  ? personality === 'SAVAGE'
                    ? 'bg-[#FF0055] border-[#FF0055] text-white shadow-[0_0_20px_rgba(255,0,85,0.4)]'
                    : 'bg-[#00E5FF] border-[#00E5FF] text-black shadow-[0_0_20px_rgba(0,229,255,0.4)]'
                  : 'bg-[var(--input-bg)] border-[var(--card-border)] text-[var(--text-secondary)] hover:border-cyan-400/50 hover:text-cyan-400'
              )}
            >
              <div className="absolute inset-0 rounded-full animate-pulse opacity-20" style={{ backgroundColor: personality === 'SAVAGE' ? '#FF0055' : '#00E5FF' }}></div>
              <motion.span 
                animate={{ opacity: [1, 1, 0.2, 1, 1], x: [0, 0, -2, 2, 0] }}
                transition={{ duration: 12, repeat: Infinity, ease: 'linear', times: [0, 0.9, 0.92, 0.95, 1] }}
                className="material-symbols-outlined text-[16px] md:text-[18px] relative z-10 group-hover:animate-spin-slow"
              >
                {personality === 'SAVAGE' ? 'whatshot' : 'cognition'}
              </motion.span>
              <span className="text-[9px] md:text-[11px] font-space tracking-widest uppercase font-black relative z-10 hidden sm:block">
                {profile?.ai_name || (isRTL ? 'المدرب' : 'COACH')}: {personality === 'SAVAGE' ? (isRTL ? 'شرس' : 'SAVAGE') : personality === 'DIRECT' ? (isRTL ? 'مباشر' : 'DIRECT') : (isRTL ? 'داعم' : 'SUPPORTIVE')}
              </span>
            </button>

            {/* INBOX BUTTON */}
            <div className="relative ml-2">
              <button
                onClick={() => {
                  setInboxOpen(!inboxOpen)
                  setAiOpen(false)
                  playBlip()
                }}
                className={cn(
                  "flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full transition-all border relative",
                  inboxOpen 
                    ? "bg-[var(--input-bg)] border-[var(--card-border)] text-[var(--text-primary)] shadow-[0_0_15px_rgba(255,255,255,0.2)]" 
                    : "bg-[var(--input-bg)] border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[var(--card-border)] hover:text-[var(--text-primary)]"
                )}
              >
                <span className="material-symbols-outlined text-[18px] md:text-[20px]">notifications</span>
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

            {/* AI Coach Dropdown */}
            <AnimatePresence>
              {aiOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className={cn(
                    "absolute top-full mt-4 left-1/2 -translate-x-1/2 w-[90vw] max-w-[320px] md:max-w-[400px] glass-panel p-5 md:p-6 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] space-y-4 z-[200]",
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
                    <button onClick={() => setAiOpen(false)} className="text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white transition-all">
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
          </div>

          {/* RIGHT: Old Theme Toggle & Settings */}
          <div className="flex items-center gap-1 md:gap-3 justify-end max-w-[25%]">
            <button
              onClick={() => {
                playBlip()
                const isDark = document.documentElement.classList.toggle('dark')
                localStorage.setItem('theme', isDark ? 'dark' : 'light')
              }}
              className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-sm bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--card-border)] transition-all group relative"
              title={isRTL ? 'الوضع الليلي/النهاري' : 'Toggle Theme'}
            >
              <div className="absolute inset-0 bg-black/5 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="material-symbols-outlined text-[16px] md:text-[20px]">contrast</span>
            </button>
            
            <div className="md:hidden">
              <button
                onClick={() => { playBlip(); router.push('/settings') }}
                className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-sm bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--card-border)] transition-all group relative"
                title={isRTL ? 'الإعدادات' : 'Settings'}
              >
                <div className="absolute inset-0 bg-black/5 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <motion.span 
                  animate={pathname === '/settings' ? { rotate: 360 } : {}}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  className="material-symbols-outlined text-[16px] md:text-[20px] group-hover:animate-spin-slow"
                >
                  settings
                </motion.span>
              </button>
            </div>
          </div>
        </header>

        <div className="relative">
          {children}
        </div>
      </main>

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
    </div>
  )
}
