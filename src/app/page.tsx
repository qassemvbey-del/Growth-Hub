'use client'

import { Activity, AlertTriangle, BarChart3, Lightbulb, Target, Zap } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Shell from '@/components/layout/Shell'
import EnergyCell from '@/components/ui/EnergyCell'
import SmartImportModal from '@/components/ui/SmartImportModal'
import { createClient } from '@/lib/supabase'
import { useGrowth } from '@/context/GrowthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import React from 'react'
import InlineGuideTip from '@/components/ui/InlineGuideTip'

const SLOT_COLORS = ['#39FF14', '#00F0FF', '#b600f8'] as const

// DB stores 'sm' | 'md' | 'lg' — cover all aliases too
const SIZE_MAP: Record<string, 'sm' | 'md' | 'lg'> = {
  sm: 'sm', md: 'md', lg: 'lg',
  S: 'sm', SMALL: 'sm', small: 'sm',
  M: 'md', MEDIUM: 'md', medium: 'md',
  L: 'lg', LARGE: 'lg', large: 'lg',
}

function WeatherWidget({ isRTL }: { isRTL: boolean }) {
  const [weather, setWeather] = useState<{ temp: number; emoji: string; messageAr: string; messageEn: string }>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('cached_weather')
      if (cached) {
        try {
          return JSON.parse(cached)
        } catch {}
      }
    }
    return {
      temp: 24,
      emoji: '☀️',
      messageAr: 'الجو حلو النهاردة، فرصة ممتازة تخلص اللي وراك!',
      messageEn: 'Nice weather today—perfect time to get things done!'
    }
  })

  useEffect(() => {
    let active = true
    async function fetchWeather() {
      try {
        let lat = '31.2001'
        let lon = '29.9187'
        
        if (typeof window !== 'undefined') {
          const cachedLat = localStorage.getItem('cached_lat')
          const cachedLon = localStorage.getItem('cached_lon')
          if (cachedLat && cachedLon) {
            lat = cachedLat
            lon = cachedLon
          }
        }

        const fetchAndStore = async (xLat: string, xLon: string) => {
          try {
            const res = await fetch(`/api/weather?lat=${xLat}&lon=${xLon}`)
            if (!res.ok) return
            const data = await res.json()
            if (active && data) {
              setWeather(data)
              if (typeof window !== 'undefined') {
                localStorage.setItem('cached_weather', JSON.stringify(data))
              }
            }
          } catch (e) {
            console.error('Weather background fetch error:', e)
          }
        }

        fetchAndStore(lat, lon)

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const freshLat = pos.coords.latitude.toString()
              const freshLon = pos.coords.longitude.toString()
              if (typeof window !== 'undefined') {
                localStorage.setItem('cached_lat', freshLat)
                localStorage.setItem('cached_lon', freshLon)
              }
              if (freshLat !== lat || freshLon !== lon) {
                fetchAndStore(freshLat, freshLon)
              }
            },
            () => {},
            { timeout: 5000 }
          )
        }
      } catch (err) {
        console.error('Weather effect error:', err)
      }
    }
    fetchWeather()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 md:p-5 backdrop-blur-md mb-6 flex items-center justify-between w-full max-w-5xl mx-auto shadow-md relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-1" style={{ background: `linear-gradient(to right, var(--theme-color), var(--theme-color), transparent)` }} />
      <div className="text-base md:text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2.5 font-space shrink-0">
        <span className="text-xl md:text-2xl">{weather.emoji}</span>
        <span className="font-black tracking-tight">{weather.temp}°C</span>
      </div>
      <div className="text-sm md:text-base text-zinc-800 dark:text-white/90 font-medium text-right max-w-[75%] leading-relaxed font-space">
        {isRTL ? weather.messageAr : weather.messageEn}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { profile, calculateAccountability, mounted, t, isRTL, currentTheme } = useGrowth()
  const router = useRouter()
  const [missions, setMissions] = useState<any[]>([])
  const [weeklyMinutes, setWeeklyMinutes] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [selectedImportMissionId, setSelectedImportMissionId] = useState<string>('')

  const supabase = createClient()

  // Global Escape key listener to close active modals in Dashboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setImportModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (mounted) {
      fetchDashboardMissions()
      fetchWeeklyTimeLogs()
    }
  }, [mounted])

  async function fetchDashboardMissions() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('cups')
      .select('*, tasks(*)')
      .eq('user_id', user.id)
      .eq('sync_to_dashboard', true)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
    
    if (data) {
      setMissions(data)
      if (data.length > 0 && !selectedImportMissionId) {
        setSelectedImportMissionId(data[0].id)
      }
    }
    setLoading(false)
  }

  async function fetchWeeklyTimeLogs() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(now.setDate(diff))
    monday.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('time_logs')
      .select('duration_minutes')
      .eq('user_id', user.id)
      .gte('started_at', monday.toISOString())

    if (error) {
      console.error("ERROR FETCHING WEEKLY TIME LOGS:", error)
      return
    }

    if (data) {
      const total = data.reduce((acc: number, log: any) => acc + (log.duration_minutes || 0), 0)
      setWeeklyMinutes(total)
    }
  }

  const allTasks = useMemo(() => {
    const list: any[] = []
    missions.forEach(m => {
      if (m.tasks) {
        m.tasks.forEach((t: any) => {
          list.push({ ...t, missionTitle: m.title, missionColor: m.color || currentTheme.color })
        })
      }
    })
    // Keep original insertion order — no resorting on completion
    return list
  }, [missions, currentTheme.color])

  const completedTasksCount = useMemo(() => allTasks.filter(t => t.is_completed).length, [allTasks])
  const pendingTasksCount = useMemo(() => allTasks.filter(t => !t.is_completed).length, [allTasks])

  const coachTip = useMemo(() => {
    const redZoneMission = missions.find(m => calculateAccountability(m).isInRedZone)
    if (redZoneMission) {
      return isRTL
        ? `لديك أهداف في المنطقة الحمراء! ركّز جهودك اليوم على "${redZoneMission.title}" لتفادي خسارة النقاط.`
        : `You have goals in the Red Zone! Direct your energy to "${redZoneMission.title}" today to avoid XP penalties.`
    }

    if (weeklyMinutes === 0 && completedTasksCount === 0) {
      return isRTL
        ? `أسبوعك يبدأ الآن. رتّب أولوياتك، ضع خطتك، وانطلق بكامل طاقتك لتفوز بالأسبوع!`
        : `Your week begins now. Prioritize, map your tasks, and start executing to win the week!`
    }

    if (pendingTasksCount > 4) {
      return isRTL
        ? `لديك ${pendingTasksCount} مهام معلّقة. قسّمها لمهام أصغر وأنجز الأهم أولاً.`
        : `You have ${pendingTasksCount} pending tasks. Break them down and tackle the highest leverage item first.`
    }

    if (weeklyMinutes >= 1200) {
      return isRTL
        ? `عمل رائع! لقد تجاوزت هدف الـ 20 ساعة لهذا الأسبوع. استمر في هذا الأداء المتميز.`
        : `Elite effort! You've crossed the 20-hour focus target for this week. Keep up the momentum.`
    }

    return isRTL
      ? `التزم بفترات العمل العميقة (Deep Work). ركّز على مهمة واحدة في كل مرة لتصل لأقصى إنتاجية.`
      : `Protect your focus blocks. Multi-tasking dilutes energy; execute single tasks with deep concentration.`
  }, [missions, weeklyMinutes, completedTasksCount, pendingTasksCount, isRTL, calculateAccountability])

  if (!mounted) return null

  return (
    <Shell syncedMissions={missions} onMissionsRefresh={fetchDashboardMissions}>
      <div className="w-full min-h-[calc(100vh-64px)] flex flex-col py-8 md:py-12 px-4 md:px-12 space-y-8 max-w-7xl mx-auto">
        
        {/* ── HEADER & WEATHER ── */}
        <div className="w-full flex flex-col items-center text-center space-y-4">
          <div className="flex items-center gap-6">
            <div className="h-[1px] w-20 md:w-32" style={{ background: `linear-gradient(to right, transparent, ${currentTheme.color}40)` }} />
            <motion.span
              style={{ color: currentTheme.color, filter: `drop-shadow(0 0 8px ${currentTheme.color})` }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Zap className="w-5 h-5 md:w-6 md:h-6" />
            </motion.span>
            <div className="h-[1px] w-20 md:w-32" style={{ background: `linear-gradient(to left, transparent, ${currentTheme.color}40)` }} />
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-4xl lg:text-5xl font-black font-space tracking-tight uppercase leading-none text-zinc-900 dark:text-white"
          >
            {isRTL ? 'مساحة' : 'WORK'}<span style={{ color: currentTheme.color }}>{isRTL ? ' العمل' : '_SPACE'}</span>
          </motion.h1>

          <p className="text-xs font-space text-zinc-500 dark:text-white/40 tracking-[0.5em] uppercase font-black">
            {isRTL ? 'لوحة التحكم' : 'DASHBOARD'} // {profile?.rank || 'MEMBER'}
          </p>
        </div>

        <WeatherWidget isRTL={isRTL} />

        <InlineGuideTip hasTasks={allTasks.length > 0} />

        {/* ═══════════════════════════════════════════════════ */}
        {/* ██  FOCUS CAPACITY — BOLD, GLOWING 9-SLOT TANK   ██ */}
        {/* ═══════════════════════════════════════════════════ */}
        {(() => {
          const SIZE_SLOTS: Record<string, number> = { sm: 1, md: 1.5, lg: 3, s: 1, m: 1.5, l: 3 }
          const usedSlots = missions.reduce((acc: number, m: any) => acc + (SIZE_SLOTS[m.size?.toLowerCase()] ?? 1), 0)
          const isFull = usedSlots >= 9
          const isOverCap = usedSlots > 9

          return (
            <div className="w-full max-w-5xl mx-auto bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1" style={{ background: `linear-gradient(to right, ${isOverCap ? '#FF0055' : currentTheme.color}, ${isOverCap ? '#FF0055' : currentTheme.color}88, transparent)` }} />
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="text-sm w-3.5 h-3.5" style={{ color: isOverCap ? '#FF0055' : currentTheme.color }} />
                    <h2 className="text-xs md:text-sm font-space text-[var(--text-secondary)] uppercase tracking-wider font-bold">
                      {isRTL ? 'سعة التركيز' : 'FOCUS CAPACITY'}
                    </h2>
                    {isOverCap && (
                      <span className="px-2 py-0.5 rounded-sm bg-[#FF0055]/20 border border-[#FF0055] text-[#FF0055] text-[10px] font-space font-black uppercase animate-pulse ml-2">
                        {isRTL ? 'تجاوز الحد الأقصى!' : 'OVERCAPACITY'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-space text-zinc-500 dark:text-zinc-400 mt-1">
                    {isRTL ? 'الحد الأقصى 9 خانات لضمان أعلى جودة تركيز.' : 'Constrained to 9 slots maximum to ensure elite execution focus.'}
                  </p>
                </div>

                <div className="flex items-baseline gap-1 bg-[var(--input-bg)] px-6 py-4 rounded-xl border border-[var(--card-border)] shadow-inner">
                  <span className="text-5xl md:text-6xl font-space font-black tracking-tighter" style={{ color: isOverCap ? '#FF0055' : currentTheme.color }}>
                    {usedSlots.toFixed(1).replace('.0', '')}
                  </span>
                  <span className="text-xl font-space font-bold text-zinc-400 dark:text-zinc-600">/9</span>
                </div>
              </div>

              {/* Segmented 9-slot bar */}
              <div 
                className="flex gap-1.5 h-6 p-1 rounded-xl border bg-zinc-100 dark:bg-[#050505] overflow-hidden shadow-inner"
                style={{ borderColor: `${currentTheme.color}40` }}
              >
                {Array.from({ length: 9 }).map((_, i) => {
                  const isActive = i < usedSlots
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-lg transition-all duration-500 relative overflow-hidden"
                      style={{
                        backgroundColor: isActive
                          ? (isOverCap ? '#FF0055' : currentTheme.color)
                          : `${currentTheme.color}10`,
                        boxShadow: isActive 
                          ? `0 0 15px ${isOverCap ? '#FF0055' : currentTheme.color}`
                          : 'none',
                      }}
                    >
                      {isActive && (
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                      )}
                    </div>
                  )
                })}
              </div>

              {isOverCap && (
                <div className="p-4 rounded-xl bg-[#FF0055]/10 border border-[#FF0055]/30 flex items-center gap-3 text-[#FF0055] text-xs font-space font-bold">
                  <AlertTriangle className="text-lg shrink-0 animate-bounce w-[18px] h-[18px]" />
                  <p>
                    {isRTL 
                      ? 'تحذير: لقد تجاوزت سعة التركيز القصوى (9 خانات). يوصى بأرشفة أو إنهاء بعض الأهداف لتجنب تشتت الجهد.' 
                      : 'WARNING: You have exceeded the elite focus constraint (9 slots). Archiving or completing active goals is strongly recommended.'}
                  </p>
                </div>
              )}
            </div>
          )
        })()}

        {/* ═══════════════════════════════════════════════════ */}
        {/* ██  ACTIVE MISSIONS GRID (CRYSTALS UNDER FOCUS)  ██ */}
        {/* ═══════════════════════════════════════════════════ */}
        <div className="w-full max-w-7xl mx-auto space-y-6 pt-4">
          <div className="flex items-center gap-3 px-2">
            <Target className="text-2xl w-6 h-6" style={{ color: currentTheme.color }} />
            <h2 className="text-xl font-space font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
              {isRTL ? 'الأهداف النشطة' : 'ACTIVE GOALS'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 cells-target">
            {missions.map((mission, idx) => {
              const { progress, isInRedZone } = calculateAccountability(mission)
              const roundedProgress = Math.round(progress)
              const customColor = mission.color || currentTheme.color
              const fallbackColor = SLOT_COLORS[idx % SLOT_COLORS.length]
              const topBorderColor = isInRedZone ? '#ef4444' : (customColor || fallbackColor)

              const kasaSize: 'sm' | 'md' | 'lg' = SIZE_MAP[mission.size?.toUpperCase?.()] ?? SIZE_MAP[mission.size] ?? 'sm'
              const cardKasaSize = kasaSize === 'lg' ? 'md' : kasaSize

              const fmtDate = (d: string | null) => {
                if (!d) return null
                try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) } catch { return null }
              }
              const startStr = fmtDate(mission.start_date)
              const endStr = fmtDate(mission.end_date)

              return (
                <motion.div
                  key={mission.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => router.push(`/missions/${mission.id}`)}
                  className={cn(
                    'group relative cursor-pointer rounded-2xl border transition-all duration-300 overflow-hidden',
                    'bg-[var(--card-bg)] border-[var(--card-border)] backdrop-blur-md w-full shadow-lg hover:shadow-xl',
                    'min-h-[260px] p-6 flex flex-col',
                    isInRedZone
                      ? 'border-red-500/40 hover:border-red-500 shadow-[0_0_30px_rgba(255,0,0,0.15)]'
                      : 'hover:border-zinc-400 dark:hover:border-white/30'
                  )}
                  style={{ borderColor: isInRedZone ? undefined : `${topBorderColor}33` }}
                >
                  <div className="absolute top-0 inset-x-0 h-1" style={{
                    background: `linear-gradient(to right, ${topBorderColor}, ${topBorderColor}88, transparent)`
                  }} />

                  {/* Top Label + Title */}
                  <div className="w-full text-center space-y-1.5 mb-auto">
                    <p
                      className={cn(
                        'font-space font-black tracking-[0.3em] uppercase text-[10px]',
                        isInRedZone ? 'text-red-500 animate-pulse' : 'text-[var(--text-secondary)]'
                      )}
                      style={(!isInRedZone && customColor) ? { color: customColor } : {}}
                    >
                      {isInRedZone ? (isRTL ? 'تنبيه خطير' : '⚠ RED_ZONE') : (isRTL ? 'هدف نشط' : 'ACTIVE GOAL')}
                    </p>
                    <h3 className="text-base font-space font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wide truncate leading-tight">
                      {mission.title}
                    </h3>
                  </div>

                  {/* Crystal Trophy Kasa */}
                  <div className="flex justify-center items-center py-4 group-hover:scale-105 transition-transform duration-500">
                    <EnergyCell
                      percentage={roundedProgress}
                      color={isInRedZone ? '#FF0055' : (customColor || fallbackColor)}
                      size={cardKasaSize}
                      isInRedZone={isInRedZone}
                    />
                  </div>

                  {/* Bottom Progress */}
                  <div className="w-full mt-auto space-y-2.5 pt-2">
                    <div className="flex justify-between items-center text-xs font-space font-black tracking-widest uppercase">
                      <span className="text-[var(--text-secondary)]">{isRTL ? 'التقدم' : 'PROGRESS'}</span>
                      <span
                        className={cn('text-sm font-bold', isInRedZone ? 'text-red-500' : 'text-zinc-900 dark:text-zinc-100')}
                        style={(!isInRedZone && customColor) ? { color: customColor } : {}}
                      >
                        {roundedProgress}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[var(--input-bg)] overflow-hidden rounded-full border border-[var(--card-border)] shadow-inner">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${roundedProgress}%` }}
                        transition={{ duration: 1.5, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: topBorderColor,
                          boxShadow: `0 0 12px ${topBorderColor}`
                        }}
                      />
                    </div>
                    {(startStr || endStr) && (
                      <p className="text-[9px] font-space text-[var(--text-secondary)] uppercase tracking-wider text-center pt-1">
                        {startStr || '—'} → {endStr || '—'}
                      </p>
                    )}
                  </div>
                </motion.div>
              )
            })}

            {missions.length === 0 && !loading && (
              <div className="col-span-full py-16 text-center bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-8">
                <p className="text-zinc-500 dark:text-white/40 text-sm font-space">
                  {isRTL ? 'لا توجد أهداف نشطة حالياً. ابدأ بإنشاء هدف جديد!' : 'No active goals synced. Initiate a new goal to begin execution.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ██                BOTTOM GRID: WEEKLY STATS & COACH          ██ */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 pt-12 border-t border-[var(--card-border)] mt-12 items-start pb-8">
          
          {/* Weekly Stats Section ("This Week") */}
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden h-full">
            <div className="absolute top-0 inset-x-0 h-1" style={{ background: `linear-gradient(to right, ${currentTheme.color}, ${currentTheme.color}88, transparent)` }} />
            <div className="flex items-center gap-2 mb-4">
              <Activity className="text-sm w-3.5 h-3.5" style={{ color: currentTheme.color }} />
              <h2 className="text-xs md:text-sm font-space text-[var(--text-secondary)] uppercase tracking-wider font-bold">
                {isRTL ? 'أسبوعي' : 'This Week'}
              </h2>
            </div>

            {weeklyMinutes === 0 && completedTasksCount === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-8 space-y-5">
                <BarChart3 className="text-5xl text-zinc-300 dark:text-zinc-600 animate-pulse w-12 h-12" />
                <p className="text-sm font-space text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed">
                  {isRTL ? 'ابدأ أول task وهنبدأ نتتبع أسبوعك' : 'Complete your first task to start tracking your week'}
                </p>
                <button
                  onClick={() => router.push('/missions')}
                  className="px-5 py-2.5 border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 rounded-xl text-xs font-space font-black uppercase tracking-wider transition-all bg-transparent text-zinc-800 dark:text-zinc-200 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  {isRTL ? 'تصفح الأهداف' : 'View Goals'}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="text-4xl md:text-5xl font-space font-black tracking-tighter" style={{ color: currentTheme.color }}>
                      {Math.floor(weeklyMinutes / 60)}h {weeklyMinutes % 60}m
                    </div>
                    <span className="text-[10px] md:text-xs font-space text-[var(--text-secondary)] uppercase tracking-wider block">
                      {isRTL ? 'الوقت المستثمر' : 'TIME INVESTED'}
                    </span>
                  </div>

                  <div className="w-full h-2 bg-[var(--input-bg)] rounded-full overflow-hidden border border-[var(--card-border)] shadow-inner mt-4">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (weeklyMinutes / 1200) * 100)}%` }} // 20 hours target
                      transition={{ duration: 1 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: currentTheme.color, boxShadow: `0 0 10px ${currentTheme.color}` }}
                    />
                  </div>
                  <p className="text-[10px] font-space text-zinc-400 dark:text-zinc-500 uppercase tracking-wider text-right">
                    {isRTL ? 'الهدف الأسبوعي: 20 ساعة' : 'WEEKLY TARGET: 20 HOURS'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--card-border)]">
                  <div className="bg-[var(--input-bg)] p-4 rounded-xl border border-[var(--card-border)] text-center space-y-1">
                    <span className="text-3xl font-space font-black text-zinc-900 dark:text-zinc-100 block">
                      {completedTasksCount}
                    </span>
                    <span className="text-[10px] md:text-xs font-space text-[var(--text-secondary)] uppercase tracking-wider block">
                      {isRTL ? 'مهام منجزة' : 'COMPLETED'}
                    </span>
                  </div>
                  <div className="bg-[var(--input-bg)] p-4 rounded-xl border border-[var(--card-border)] text-center space-y-1">
                    <span className="text-3xl font-space font-black text-zinc-900 dark:text-zinc-100 block">
                      {pendingTasksCount}
                    </span>
                    <span className="text-[10px] md:text-xs font-space text-[var(--text-secondary)] uppercase tracking-wider block">
                      {isRTL ? 'مهام قيد الانتظار' : 'PENDING'}
                    </span>
                  </div>
                </div>


              </div>
            )}
          </div>

          {/* Coach Tip Section */}
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 md:p-8 space-y-4 shadow-xl relative overflow-hidden h-full flex flex-col justify-between">
            <div className="absolute top-0 inset-x-0 h-1" style={{ background: `linear-gradient(to right, ${currentTheme.color}, ${currentTheme.color}88, transparent)` }} />
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="text-sm text-amber-500 w-3.5 h-3.5" />
                <h2 className="text-xs md:text-sm font-space text-[var(--text-secondary)] uppercase tracking-wider font-bold">
                  {isRTL ? 'نصيحة المدرب' : 'Coach Tip'}
                </h2>
              </div>
              <p className="text-xl md:text-2xl font-space text-zinc-900 dark:text-zinc-100 leading-relaxed font-bold">
                "{coachTip}"
              </p>
            </div>
            
            <div className="text-[9px] font-space text-zinc-400 dark:text-zinc-600 uppercase tracking-widest pt-6">
              GROWTH HUB // PERSONALIZED COACHING MESH
            </div>
          </div>

        </div>
      </div>
    </Shell>
  )
}
