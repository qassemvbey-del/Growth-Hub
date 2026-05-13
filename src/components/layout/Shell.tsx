'use client'

import Sidebar from './Sidebar'
import { useGrowth } from '@/context/GrowthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { usePathname, useRouter } from 'next/navigation'

interface ShellProps {
  children: React.ReactNode
  syncedMissions?: any[]
  onMissionsRefresh?: () => void
}

export default function Shell({ children, syncedMissions = [], onMissionsRefresh }: ShellProps) {
  // 1. ALL HOOKS AT THE TOP
  const { isRTL, profile, calculateAccountability, getAiMessage, t, currentTheme } = useGrowth()
  const pathname = usePathname()
  const router = useRouter()
  const [aiOpen, setAiOpen] = useState(false)
  const [streak, setStreak] = useState(0)

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
    if (hasRedZoneMission && !aiOpen) {
      setAiOpen(true)
    }
  }, [hasRedZoneMission])

  const systemProgress = useMemo(() => {
    if (!syncedMissions || syncedMissions.length === 0) return 0
    let totalPct = 0
    syncedMissions.forEach(m => {
      totalPct += calculateAccountability(m).progress
    })
    return Math.round(totalPct / syncedMissions.length)
  }, [syncedMissions, calculateAccountability])

  const aiMessage = useMemo(() => {
    const redMission = (syncedMissions || []).find(m => calculateAccountability(m).isInRedZone)
    if (redMission) return getAiMessage('RED', redMission.title)

    const aheadMission = (syncedMissions || []).find(m => calculateAccountability(m).isAheadOfSchedule)
    if (aheadMission) return getAiMessage('AHEAD', aheadMission.title)

    return getAiMessage('DEFAULT')
  }, [syncedMissions, calculateAccountability, getAiMessage])

  return (
    <div
      className={cn(
        'min-h-screen bg-[#F0F2F5] dark:bg-[#050505] text-black dark:text-white flex relative transition-colors duration-500'
      )}
      style={{ 
        ['--selection-bg' as any]: `${currentTheme.color}33`, 
        ['--selection-text' as any]: currentTheme.color 
      }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none z-[100] scanlines opacity-[0.02]" />
      <div className="fixed inset-0 pointer-events-none z-0 cyber-grid opacity-[0.05]" />

      <Sidebar isRTL={isRTL} />

      <main className={cn(
        'flex-grow min-h-screen transition-all duration-500 relative z-10',
        'md:ps-72'
      )}>
        {/* Top Navigation */}
        <header className="w-full px-6 md:px-12 h-16 flex justify-between items-center border-b border-black/5 dark:border-white/5 bg-[#F0F2F5]/80 dark:bg-[#050505]/95 backdrop-blur-2xl z-[150] sticky top-0 transition-colors duration-500">
          <div className="absolute -bottom-[1px] inset-inline-start-12 w-48 h-[1px] shadow-[0_0_15px_currentcolor]" style={{ backgroundColor: currentTheme.color, color: currentTheme.color }} />

          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: currentTheme.color }} />
              <span className="text-[9px] font-space text-black/60 dark:text-white/40 tracking-[0.4em] uppercase font-bold">
                {t('dashboard')}
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-1.5 bg-cyan-600/10 dark:bg-cyan-400/5 border border-cyan-600/30 dark:border-cyan-400/20 rounded-full">
              <span className="material-symbols-outlined text-[12px] text-cyan-700 dark:text-cyan-400 animate-spin-slow">cognition</span>
              <span className="text-[8px] font-space text-cyan-700 dark:text-cyan-400 tracking-widest uppercase font-black">
                {profile?.ai_name || (isRTL ? 'المدرب' : 'COACH')}: {profile?.ai_personality === 'SAVAGE' ? (isRTL ? '🔥 شرس' : '🔥 SAVAGE') : (isRTL ? '💚 هادئ' : '💚 GENTLE')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-10">
            <button
              onClick={() => {
                const isDark = document.documentElement.classList.toggle('dark')
                localStorage.setItem('theme', isDark ? 'dark' : 'light')
              }}
              className="p-2 text-black/40 hover:text-black dark:text-white/20 dark:hover:text-white/40 transition-all rounded-full"
            >
              <span className="material-symbols-outlined text-xl">contrast</span>
            </button>

            <div className="flex flex-col items-end gap-1.5">
              <div className="flex justify-between w-56 text-[11px] font-space text-black dark:text-white tracking-widest uppercase font-black">
                <span>{isRTL ? 'الحمل اليومي' : "TODAY'S LOAD"}</span>
                <span style={{ color: currentTheme.color }}>{systemProgress}%</span>
              </div>
              <div className="w-56 h-[4px] bg-black/10 dark:bg-white/10 overflow-hidden rounded-full">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${systemProgress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  style={{ backgroundColor: currentTheme.color, boxShadow: `0 0 8px ${currentTheme.color}` }}
                />
              </div>
            </div>

            <div className="h-6 w-[1px] bg-black/5 dark:bg-white/5" />

            <div className="flex flex-col items-end">
              <span className="text-[9px] font-space text-black/50 dark:text-white/30 uppercase tracking-[0.3em] font-black leading-none mb-1">
                {t('streak')}
              </span>
              <div className="flex items-center gap-2">
                <span 
                  className={cn("material-symbols-outlined text-base transition-all duration-500", streak > 0 ? "scale-110" : "opacity-20")} 
                  style={{ color: streak > 0 ? '#FF5F00' : undefined, filter: streak > 0 ? 'drop-shadow(0 0 8px #FF5F00)' : 'none' }}
                >
                  local_fire_department
                </span>
                <span className={cn("text-[11px] font-space tracking-tighter font-black uppercase transition-colors")} style={{ color: streak > 0 ? (isRTL ? '#FF5F00' : '#FF5F00') : undefined, opacity: streak > 0 ? 1 : 0.2 }}>
                  {streak} {isRTL ? (streak === 1 ? 'يوم' : 'أيام') : (streak === 1 ? 'DAY' : 'DAYS')}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="relative">
          {children}
        </div>
      </main>

      <div className={cn(
        "fixed top-0 bottom-0 w-[1px] bg-black/5 dark:bg-white/5 z-20 hidden md:block",
        "inset-inline-start-72"
      )} />

      <div className={cn(
        "fixed bottom-8 z-50 flex flex-col gap-3",
        "inset-inline-end-8 items-end"
      )}>
        <AnimatePresence>
          {aiOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={cn(
                "w-full max-w-[300px] glass-panel p-5 backdrop-blur-md shadow-[0_0_40px_rgba(57,255,20,0.12)] space-y-3",
                profile?.ai_personality === 'SAVAGE'
                  ? "border-[#FF0055]/30 bg-white/95 dark:bg-[#FF0055]/5"
                  : "border-cyan-400/30 bg-white/95 dark:bg-[#050505]/90"
              )}
            >
              <div className="flex justify-between items-center">
                <span className={cn(
                  "text-[9px] font-space tracking-[0.3em] font-black uppercase",
                  profile?.ai_personality === 'SAVAGE' ? "text-[#FF0055]" : "text-cyan-700 dark:text-cyan-400"
                )}>
                  {profile?.ai_name || (isRTL ? 'المدرب' : 'COACH')} // {profile?.ai_personality === 'SAVAGE' ? (isRTL ? 'نمط شرس' : 'SAVAGE_MODE') : (isRTL ? 'متصل' : 'ONLINE')}
                </span>
                <button onClick={() => setAiOpen(false)} className="text-black/20 dark:text-white/20 hover:text-black dark:hover:text-white transition-all">
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>
              <p className="text-[12px] font-space font-bold text-black/80 dark:text-white/80 leading-relaxed" dir="auto">
                "{aiMessage}"
              </p>
              <p className="text-[8px] font-space text-black/20 dark:text-white/20 tracking-widest uppercase">AUTO_CLOSE // 8S</p>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setAiOpen(o => !o)}
          className={cn(
            'w-12 h-12 rounded-full border flex items-center justify-center transition-all shadow-lg',
            aiOpen
              ? profile?.ai_personality === 'SAVAGE'
                ? 'bg-[#FF0055] border-[#FF0055] text-white shadow-[0_0_20px_rgba(255,0,85,0.4)]'
                : 'bg-[#00E5FF] border-[#00E5FF] text-black shadow-[0_0_20px_rgba(0,229,255,0.4)]'
              : 'bg-[#050505] border-white/10 text-white/40 hover:border-cyan-400 hover:text-cyan-400'
          )}
        >
          <span className="material-symbols-outlined text-xl">
            {profile?.ai_personality === 'SAVAGE' ? 'whatshot' : 'cognition'}
          </span>
        </button>
      </div>
    </div>
  )
}
