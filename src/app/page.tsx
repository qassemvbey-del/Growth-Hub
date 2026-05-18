'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Shell from '@/components/layout/Shell'
import EnergyCell from '@/components/ui/EnergyCell'
import { createClient } from '@/lib/supabase'
import { useGrowth } from '@/context/GrowthContext'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import React from 'react'

const SLOT_COLORS = ['#39FF14', '#00F0FF', '#b600f8'] as const

// DB stores 'sm' | 'md' | 'lg' — cover all aliases too
const SIZE_MAP: Record<string, 'sm' | 'md' | 'lg'> = {
  // Direct DB values (primary)
  sm: 'sm', md: 'md', lg: 'lg',
  // Aliases
  S: 'sm', SMALL: 'sm', small: 'sm',
  M: 'md', MEDIUM: 'md', medium: 'md',
  L: 'lg', LARGE: 'lg', large: 'lg',
}

function WeatherWidget({ isRTL }: { isRTL: boolean }) {
  const [weather, setWeather] = useState<{ temp: number; emoji: string; messageAr: string; messageEn: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function fetchWeather() {
      try {
        let lat = '31.2001'
        let lon = '29.9187'
        if (navigator.geolocation) {
          await new Promise<void>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                lat = pos.coords.latitude.toString()
                lon = pos.coords.longitude.toString()
                resolve()
              },
              () => resolve(),
              { timeout: 5000 }
            )
          })
        }
        const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`)
        if (!res.ok) throw new Error('API request failed')
        const data = await res.json()
        if (active) {
          setWeather(data)
          setLoading(false)
        }
      } catch (err) {
        console.error('Weather error:', err)
        if (active) {
          setWeather({
            temp: 24,
            emoji: '☀️',
            messageAr: 'الجو حلو النهاردة، فرصة ممتازة تخلص اللي وراك!',
            messageEn: 'Nice weather today—perfect time to get things done!'
          })
          setLoading(false)
        }
      }
    }
    fetchWeather()
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 backdrop-blur-md mb-4 flex items-center justify-between animate-pulse w-full max-w-lg mx-auto">
        <div className="h-5 w-16 bg-white/10 rounded-sm" />
        <div className="h-4 w-48 bg-white/10 rounded-sm" />
      </div>
    )
  }

  if (!weather) return null

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 backdrop-blur-md mb-4 flex items-center justify-between w-full max-w-lg mx-auto">
      <div className="text-sm font-medium text-white/90 flex items-center gap-1.5 font-space">
        <span>{weather.emoji}</span>
        <span>{weather.temp}°C</span>
      </div>
      <div className="text-xs text-white/50 font-normal text-right max-w-[60%] leading-relaxed font-space">
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
  const supabase = createClient()

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
    
    if (data) setMissions(data)
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

  if (!mounted) return null

  return (
    <Shell syncedMissions={missions} onMissionsRefresh={fetchDashboardMissions}>

      <div className="w-full min-h-[calc(100vh-64px)] flex flex-col py-6 md:py-16 px-4 md:px-12 space-y-8 md:space-y-24">

        {/* ── CENTERED TITLE ── */}
        <div className="flex flex-col items-center text-center space-y-4 md:space-y-6">
          <div className="flex items-center gap-6">
            <div className="h-[1px] w-24 md:w-32 bg-gradient-to-r from-transparent" style={{ background: `linear-gradient(to right, transparent, ${currentTheme.color}40)` }} />
            {/* ONE breathing lightning bolt */}
            <motion.span
              className="material-symbols-outlined text-lg md:text-2xl"
              style={{ color: currentTheme.color, filter: `drop-shadow(0 0 8px ${currentTheme.color})` }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              bolt
            </motion.span>
            <div className="h-[1px] w-24 md:w-32" style={{ background: `linear-gradient(to left, transparent, ${currentTheme.color}40)` }} />
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-8xl lg:text-9xl font-black font-space italic tracking-tighter uppercase leading-none text-black dark:text-white break-words"
          >
            {isRTL ? 'مركز' : 'GROWTH'}<span style={{ color: currentTheme.color }}>{isRTL ? ' النمو' : '_HUB'}</span>
          </motion.h1>

          <p className="text-[10px] md:text-xs font-space text-black/40 dark:text-white/40 tracking-[0.6em] uppercase font-black">
            {isRTL ? 'لوحة الأهداف' : 'GOAL CANVAS'} // {profile?.full_name?.toUpperCase() || (isRTL ? 'المستخدم' : 'OPERATOR')}
          </p>

          {/* Sleek, low-profile weekly time floating sub-badge */}
          <div className="font-space font-black text-white/50 text-xs tracking-wider uppercase flex items-center gap-1.5 justify-center mt-2">
            <span>⏱ THIS WEEK: {Math.floor(weeklyMinutes / 60)}h {weeklyMinutes % 60}m invested</span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════ */}
        {/* ██  FOCUS CAPACITY — BOLD, GLOWING, text-3xl/4xl ██ */}
        {/* ═══════════════════════════════════════════════════ */}
        <WeatherWidget isRTL={isRTL} />

        {(() => {
          const SIZE_SLOTS: Record<string, number> = { sm: 1, md: 1.5, lg: 3, s: 1, m: 1.5, l: 3 }
          const usedSlots = missions.reduce((acc: number, m: any) => acc + (SIZE_SLOTS[m.size?.toLowerCase()] ?? 1), 0)
          const pct = Math.min(100, (usedSlots / 9) * 100)
          const isFull = usedSlots >= 9
          return (
            <div className="w-full max-w-lg mx-auto space-y-4">
              {/* FOCUS CAPACITY — HERO LABEL */}
              <div className="flex justify-between items-end">
                <span
                  className={cn(
                    "font-space font-black tracking-tight uppercase",
                    isRTL ? "text-[20px] text-[#FF0055]" : "text-3xl md:text-4xl"
                  )}
                  style={{
                    color: isRTL ? '#FF0055' : (isFull ? '#FF0055' : currentTheme.color),
                    textShadow: `0 0 20px ${isFull || isRTL ? '#FF005588' : currentTheme.color + '88'}, 0 0 40px ${isFull || isRTL ? '#FF005544' : currentTheme.color + '44'}`,
                  }}
                >
                  {isRTL ? 'سعة التركيز' : 'FOCUS_CAPACITY'}
                </span>
                <span
                  className="text-2xl md:text-3xl font-space font-black tracking-tight"
                  style={{
                    color: isFull ? '#FF0055' : currentTheme.color,
                    textShadow: `0 0 12px ${isFull ? '#FF005566' : currentTheme.color + '66'}`,
                  }}
                >
                  {usedSlots.toFixed(1).replace('.0', '')}/9
                </span>
              </div>
              {/* Segmented 9-slot bar - Dynamic Theme Energy Tank */}
              <div 
                className="flex gap-[4px] h-[16px] p-[2px] rounded-sm border bg-[#050505] overflow-hidden"
                style={{
                  borderColor: `${currentTheme.color}40`,
                  boxShadow: `0 0 15px ${currentTheme.color}26, inset 0 0 10px ${currentTheme.color}0d`,
                }}
              >
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-[1px] transition-all duration-700"
                    style={{
                      backgroundColor: i < usedSlots
                        ? currentTheme.color
                        : `${currentTheme.color}0d`,
                      boxShadow: i < usedSlots 
                        ? `0 0 10px ${currentTheme.color}, inset 0 0 5px rgba(255,255,255,0.5)`
                        : 'none',
                    }}
                  />
                ))}
              </div>
              
              {/* Weekly Time Logged Stat */}
              <div className="flex justify-between items-center text-[10px] font-space text-[var(--text-secondary)] uppercase tracking-wider pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[12px]" style={{ color: currentTheme.color }}>timer</span>
                  {isRTL ? 'الاستثمار هذا الأسبوع:' : 'INVESTED THIS WEEK:'}
                </span>
                <span className="font-black italic text-xs" style={{ color: currentTheme.color }}>
                  {Math.floor(weeklyMinutes / 60)}h {weeklyMinutes % 60}m
                </span>
              </div>
            </div>
          )
        })()}

        {/* ═══════════════════════════════════════════════════ */}
        {/* ██  MISSION CARDS GRID — STRICT 3-COL + LAYOUT  ██ */}
        {/* ═══════════════════════════════════════════════════ */}
        <section className="w-full grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 cells-target">
          {missions.map((mission, idx) => {
            const { progress, isInRedZone } = calculateAccountability(mission)
            const roundedProgress = Math.round(progress)
            const customColor = mission.color || currentTheme.color;
            const fallbackColor = SLOT_COLORS[idx % SLOT_COLORS.length]
            const topBorderColor = isInRedZone ? '#ef4444' : (customColor || fallbackColor);

            return (
              <React.Fragment key={mission.id}>
                {/* Derive canonical size */}
                {(() => {
                  const kasaSize: 'sm' | 'md' | 'lg' = SIZE_MAP[mission.size?.toUpperCase?.()] ?? SIZE_MAP[mission.size] ?? 'sm'
                  // For dashboard cards: cap kasa display to sm/md to fit card
                  const cardKasaSize = kasaSize === 'lg' ? 'md' : kasaSize

                  // Format dates
                  const fmtDate = (d: string | null) => {
                    if (!d) return null
                    try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) } catch { return null }
                  }
                  const startStr = fmtDate(mission.start_date)
                  const endStr = fmtDate(mission.end_date)

                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => router.push(`/missions/${mission.id}`)}
                      className={cn(
                        'group relative cursor-pointer rounded-sm border transition-all duration-300 overflow-hidden',
                        'bg-[var(--card-bg)] border-[var(--card-border)] backdrop-blur-md w-full',
                        'min-h-[240px] max-h-[360px]',
                        'p-5 md:p-6 flex flex-col',
                        isInRedZone
                          ? 'border-red-500/30 hover:border-red-500/60 shadow-[0_0_30px_rgba(255,0,0,0.06)]'
                          : 'hover:border-[var(--card-border)]/50'
                      )}
                      style={{ borderColor: isInRedZone ? undefined : `${topBorderColor}22` }}
                    >
                      {/* Top neon accent line */}
                      <div className="absolute top-0 inset-x-0 h-[2.5px]" style={{
                        background: `linear-gradient(to right, ${topBorderColor}, ${topBorderColor}66, transparent)`
                      }} />

                      {/* === TOP: Label + Title === */}
                      <div className="w-full text-center space-y-1 mb-auto">
                        <p
                          className={cn(
                            'font-space font-black tracking-[0.4em] uppercase',
                            isRTL ? 'text-[14px] text-[var(--text-primary)]' : 'text-[8px] text-[var(--text-secondary)]',
                            isInRedZone ? 'text-red-500' : ''
                          )}
                          style={(!isInRedZone && !isRTL && customColor) ? { color: `${customColor}99` } : {}}
                        >
                          {isInRedZone ? (isRTL ? 'تنبيه خطير' : '⚠ RED_ZONE') : (isRTL ? 'هدف نشط' : 'ACTIVE')}
                        </p>
                        <h2 className="text-sm md:text-base font-space font-black text-[var(--text-primary)] uppercase tracking-wide truncate leading-tight italic">
                          {mission.title}
                        </h2>
                      </div>

                      {/* === CENTER: Crystal Trophy Kasa === */}
                      <div className="flex justify-center items-center py-3 group-hover:scale-105 transition-transform duration-500">
                        <EnergyCell
                          percentage={roundedProgress}
                          color={isInRedZone ? '#FF0055' : (customColor || fallbackColor)}
                          size={cardKasaSize}
                          isInRedZone={isInRedZone}
                        />
                      </div>

                      {/* === BOTTOM: Progress + dates === */}
                      <div className="w-full mt-auto space-y-2">
                        <div className="flex justify-between text-[9px] font-space font-black tracking-widest uppercase text-[var(--text-secondary)]">
                          <span>{isRTL ? 'التقدم' : 'PROGRESS'}</span>
                          <span
                            className={cn('text-sm font-bold', isInRedZone ? 'text-red-500' : 'text-[var(--text-primary)]')}
                            style={(!isInRedZone && customColor) ? { color: customColor } : {}}
                          >
                            {roundedProgress}%
                          </span>
                        </div>
                        <div className="w-full h-[3px] bg-[var(--input-bg)] overflow-hidden rounded-full">
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
                        {/* Dates row */}
                        {(startStr || endStr) && (
                          <p className="text-[7px] font-space text-[var(--text-secondary)]/50 uppercase tracking-wider text-center">
                            {startStr || '—'} → {endStr || '—'}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )
                })()}

                {/* Section Divider after every 3 missions (Desktop) */}
                {(idx + 1) % 3 === 0 && (
                   <div className="col-span-full w-full h-[1px] border-t border-black/5 dark:border-white/10 my-6 hidden lg:block" />
                )}
              </React.Fragment>
            )
          })}

          {missions.length === 0 && !loading && (
            <div className="col-span-full py-24">
              <p className="text-white/30 text-sm text-center">No active goals synced. Use the action panel above to initiate.</p>
            </div>
          )}
        </section>
      </div>
    </Shell>
  )
}
