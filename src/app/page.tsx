'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Shell from '@/components/layout/Shell'
import EnergyCell from '@/components/ui/EnergyCell'
import Tutorial from '@/components/ui/Tutorial'
import { createClient } from '@/lib/supabase'
import { useGrowth } from '@/context/GrowthContext'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import React from 'react'

const SLOT_COLORS = ['#39FF14', '#00F0FF', '#b600f8'] as const

const SIZE_MAP: Record<string, 'sm' | 'md' | 'lg'> = {
  S: 'sm',
  SMALL: 'sm',
  M: 'md',
  MEDIUM: 'md',
  L: 'lg',
  LARGE: 'lg',
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
      <Tutorial />

      <div className="w-full min-h-[calc(100vh-64px)] flex flex-col py-16 px-6 md:px-12 space-y-16 md:space-y-24">

        {/* ── CENTERED TITLE ── */}
        <div className="flex flex-col items-center text-center space-y-4 md:space-y-6">
          <div className="flex items-center gap-6 opacity-20">
            <div className="h-[1px] w-32 bg-gradient-to-r from-transparent to-black dark:to-white" />
            <span className="material-symbols-outlined text-neon-green text-sm">bolt</span>
            <span className="material-symbols-outlined text-sm" style={{ color: currentTheme.color }}>bolt</span>
            <div className="h-[1px] w-32 bg-gradient-to-l from-transparent to-black dark:to-white" />
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-9xl font-black font-space italic tracking-tighter uppercase leading-none text-black dark:text-white"
          >
            {isRTL ? 'لوحة' : 'MISSION'}<span style={{ color: currentTheme.color }}>{isRTL ? ' المهام' : '_HUB'}</span>
          </motion.h1>

          <p className="text-[10px] md:text-xs font-space text-black/40 dark:text-white/40 tracking-[0.6em] uppercase font-black">
            {isRTL ? 'المحطة مفعلة' : 'LIVE MISSIONS'} // {profile?.full_name?.toUpperCase() || (isRTL ? 'المستخدم' : 'OPERATOR')}
          </p>
        </div>

        {/* ── MISSION CARDS GRID (PRECISION ARCHITECTURE) ── */}
        <section className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 cells-target">
          {missions.map((mission, idx) => {
            const { progress, isInRedZone } = calculateAccountability(mission)
            const roundedProgress = Math.round(progress)
            const customColor = mission.color || currentTheme.color;
            const fallbackColor = SLOT_COLORS[idx % SLOT_COLORS.length]
            const topBorderColor = isInRedZone ? '#ef4444' : (customColor || fallbackColor);

            return (
              <React.Fragment key={mission.id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => router.push(`/missions/${mission.id}`)}
                  className={cn(
                    'group relative cursor-pointer rounded-sm border p-8 flex flex-col items-center gap-8 transition-all duration-300 overflow-hidden',
                    'bg-white dark:bg-black/40 backdrop-blur-md min-h-[320px] justify-center',
                    'aspect-video lg:aspect-auto', // Force aspect consistency
                    isInRedZone
                      ? 'border-red-500/30 hover:border-red-500/60 shadow-[0_0_30px_rgba(255,0,0,0.06)]'
                      : 'border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20'
                  )}
                >
                  {/* Top accent line */}
                  <div className="absolute top-0 inset-x-0 h-[3px]" style={{ background: `linear-gradient(to right, ${topBorderColor}, transparent)` }} />

                  {/* Mission Title Section */}
                  <div className="w-full text-center space-y-2">
                    <p 
                      className={cn(
                        'text-[9px] md:text-[11px] font-space font-black tracking-[0.5em] uppercase transition-opacity',
                        isInRedZone ? 'text-red-500' : 'text-black/40 dark:text-white/30'
                      )}
                      style={(!isInRedZone && customColor) ? { color: customColor } : {}}
                    >
                      {isInRedZone ? (isRTL ? '⚠ وضع حرج' : '⚠ RED_ZONE') : (isRTL ? 'هدف نشط' : 'ACTIVE GOAL')}
                    </p>
                    <h2 className="text-base md:text-xl font-space font-black text-black dark:text-white uppercase tracking-wider truncate leading-tight italic">
                      {mission.title}
                    </h2>
                  </div>

                  {/* Energy Cup Trophy */}
                  <div className="relative py-2 group-hover:scale-110 transition-transform duration-500">
                    <EnergyCell
                      percentage={roundedProgress}
                      subLabel={mission.title}
                      color={isInRedZone ? 'red' : (customColor || fallbackColor)}
                      size={(mission.size || 'md') as 'sm' | 'md' | 'lg'}
                      isInRedZone={isInRedZone}
                      cupStyle={currentTheme.cupStyle as any}
                    />
                    <div className="absolute inset-0 blur-3xl rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: `${topBorderColor}1a` }} />
                  </div>

                  {/* Progress Tracking Bar */}
                  <div className="w-full space-y-3">
                    <div className="flex justify-between text-[9px] md:text-[11px] font-space font-black tracking-widest uppercase text-black/40 dark:text-white/20">
                      <span>{isRTL ? 'التقدم' : 'PROGRESS'}</span>
                      <span 
                        className={cn("font-bold text-sm", isInRedZone ? 'text-red-500' : 'text-black dark:text-white')}
                        style={(!isInRedZone && customColor) ? { color: customColor } : {}}
                      >
                        {roundedProgress}%
                      </span>
                    </div>
                    <div className="w-full h-[4px] bg-black/5 dark:bg-white/5 overflow-hidden rounded-full">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${roundedProgress}%` }}
                        transition={{ duration: 1.5, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ 
                          backgroundColor: topBorderColor, 
                          boxShadow: `0 0 15px ${topBorderColor}` 
                        }}
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Section Divider after every 3 missions (Desktop) */}
                {(idx + 1) % 3 === 0 && (
                   <div className="col-span-full w-full h-[1px] border-t border-black/5 dark:border-white/10 shadow-[0_1px_10px_rgba(255,255,255,0.05)] my-8 hidden lg:block" />
                )}
                {/* Responsive divider for Tablet (MD) */}
                {(idx + 1) % 2 === 0 && (
                   <div className="col-span-full w-full h-[1px] border-t border-black/5 dark:border-white/10 shadow-[0_1px_10px_rgba(255,255,255,0.05)] my-8 hidden md:block lg:hidden" />
                )}
              </React.Fragment>
            )
          })}

          {/* Empty State */}
          {missions.length === 0 && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full flex flex-col items-center justify-center gap-6 p-24 border border-dashed border-black/10 dark:border-white/10 rounded-sm cursor-pointer transition-all group"
              style={{ borderColor: `${currentTheme.color}33` }}
              onClick={() => router.push('/missions')}
            >
              <span className="material-symbols-outlined text-6xl text-black/10 dark:text-white/10 transition-colors" style={{ color: currentTheme.color }}>add_circle</span>
              <p className="text-xs md:text-sm font-space text-black/30 dark:text-white/20 tracking-[0.4em] uppercase font-black">
                {isRTL ? 'لا توجد مهام مفعلة - أنشئ مهمتك الأولى' : 'NO_SYNCED_MISSIONS - CREATE_FIRST'}
              </p>
            </motion.div>
          )}
        </section>
      </div>
    </Shell>
  )
}
