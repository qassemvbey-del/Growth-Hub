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

export default function Dashboard() {
  const { profile, calculateAccountability, mounted, t, isRTL, currentTheme } = useGrowth()
  const router = useRouter()
  const [missions, setMissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (mounted) fetchDashboardMissions()
  }, [mounted])


  async function fetchDashboardMissions() {
    const { data } = await supabase
      .from('cups')
      .select('*, tasks(*)')
      .eq('sync_to_dashboard', true)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
    
    if (data) setMissions(data)
    setLoading(false)
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
            {isRTL ? 'المحطة مفعلة' : 'LIVE MISSIONS'} // {profile?.full_name?.toUpperCase() || (isRTL ? 'المستخدم' : 'OPERATOR')}
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════ */}
        {/* ██  FOCUS CAPACITY — BOLD, GLOWING, text-3xl/4xl ██ */}
        {/* ═══════════════════════════════════════════════════ */}
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
                  className="text-3xl md:text-4xl font-space font-black tracking-tight uppercase"
                  style={{
                    color: isFull ? '#FF0055' : currentTheme.color,
                    textShadow: `0 0 20px ${isFull ? '#FF005588' : currentTheme.color + '88'}, 0 0 40px ${isFull ? '#FF005544' : currentTheme.color + '44'}`,
                  }}
                >
                  {isRTL ? 'سعة المحطة' : 'FOCUS_CAPACITY'}
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
              {/* Segmented 9-slot bar */}
              <div className="flex gap-[3px] h-[6px]">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-full transition-all duration-700"
                    style={{
                      backgroundColor: i < usedSlots
                        ? (isFull ? '#FF0055' : currentTheme.color)
                        : `${currentTheme.color}18`,
                      boxShadow: i < usedSlots && !isFull
                        ? `0 0 8px ${currentTheme.color}`
                        : i < usedSlots && isFull
                          ? '0 0 8px #FF0055'
                          : 'none',
                    }}
                  />
                ))}
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
                        'bg-white dark:bg-[#090909] w-full',
                        'min-h-[240px] max-h-[360px]',
                        'p-5 md:p-6 flex flex-col',
                        isInRedZone
                          ? 'border-red-500/30 hover:border-red-500/60 shadow-[0_0_30px_rgba(255,0,0,0.06)]'
                          : 'border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20'
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
                            'text-[8px] font-space font-black tracking-[0.4em] uppercase',
                            isInRedZone ? 'text-red-500' : 'text-black/30 dark:text-white/20'
                          )}
                          style={(!isInRedZone && customColor) ? { color: `${customColor}99` } : {}}
                        >
                          {isInRedZone ? '⚠ RED_ZONE' : 'ACTIVE_GOAL'}
                        </p>
                        <h2 className="text-sm md:text-base font-space font-black text-black dark:text-white uppercase tracking-wide truncate leading-tight italic">
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
                        <div className="flex justify-between text-[9px] font-space font-black tracking-widest uppercase text-black/30 dark:text-white/20">
                          <span>{isRTL ? 'التقدم' : 'PROGRESS'}</span>
                          <span
                            className={cn('text-sm font-bold', isInRedZone ? 'text-red-500' : 'text-black dark:text-white')}
                            style={(!isInRedZone && customColor) ? { color: customColor } : {}}
                          >
                            {roundedProgress}%
                          </span>
                        </div>
                        <div className="w-full h-[3px] bg-black/5 dark:bg-white/5 overflow-hidden rounded-full">
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
                          <p className="text-[7px] font-space text-black/20 dark:text-white/15 uppercase tracking-wider text-center">
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

          {/* Empty State */}
          {missions.length === 0 && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full flex flex-col items-center justify-center gap-6 p-8 md:p-24 border border-dashed border-black/10 dark:border-white/10 rounded-sm cursor-pointer transition-all group text-center"
              style={{ borderColor: `${currentTheme.color}33` }}
              onClick={() => router.push('/missions')}
            >
              <span className="material-symbols-outlined text-4xl md:text-6xl text-black/10 dark:text-white/10 transition-colors" style={{ color: currentTheme.color }}>add_circle</span>
              <p className="text-xs md:text-sm font-space text-black/30 dark:text-white/20 tracking-[0.4em] uppercase font-black max-w-xs">
                {isRTL ? 'لا توجد مهام مفعلة - أنشئ مهمتك الأولى' : 'NO_SYNCED_MISSIONS'}
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); router.push('/missions') }}
                className="mt-2 px-6 py-3 text-[11px] font-space font-black tracking-widest uppercase border rounded-sm transition-all hover:scale-105 active:scale-95"
                style={{ borderColor: currentTheme.color, color: currentTheme.color }}
              >
                {isRTL ? 'إنشاء مهمة' : 'CREATE_MISSION'}
              </button>
            </motion.div>
          )}
        </section>
      </div>
    </Shell>
  )
}
