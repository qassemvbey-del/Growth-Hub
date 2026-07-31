'use client'

import { Activity, AlertTriangle, BarChart3, Lightbulb, Target, Zap, Crosshair, Calendar, Users, Swords, Crown, Trophy, Plus, UserPlus } from 'lucide-react'
import { NeonIcon } from '@/components/ui/NeonIcon'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
// import Shell from '@/components/layout/Shell'
import EnergyCell from '@/components/ui/EnergyCell'
import DiamondProgress from '@/components/ui/DiamondProgress'
import GoalCard from '@/components/ui/GoalCard'
import Avatar from '@/components/ui/Avatar'
import TaskDrawer from '@/components/ui/TaskDrawer'
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

export default function Dashboard() {
  const { profile, calculateAccountability, mounted, t, isRTL, currentTheme, tasksCompletedToday, addXp } = useGrowth()
  const router = useRouter()
  const [missions, setMissions] = useState<any[]>([])
  const [weeklyMinutes, setWeeklyMinutes] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  // Rivalry Tracker States
  const [squadsList, setSquadsList] = useState<any[]>([])
  const [selectedSquadId, setSelectedSquadId] = useState<string>('')
  const [squadMembersMap, setSquadMembersMap] = useState<Record<string, any[]>>({})
  const [isDark, setIsDark] = useState(true)
  const [selectedTaskForDrawer, setSelectedTaskForDrawer] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsDark(document.documentElement.classList.contains('dark'))
      const observer = new MutationObserver(() => {
        setIsDark(document.documentElement.classList.contains('dark'))
      })
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
      return () => observer.disconnect()
    }
  }, [])

  const supabase = createClient()

  useEffect(() => {
    if (mounted) {
      const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        
        // Auto-redirect if there's a pending goal to join
        const pending = localStorage.getItem('pendingJoinGoal')
        if (pending && user) {
          localStorage.removeItem('pendingJoinGoal')
          localStorage.removeItem('pendingJoinMessage')
          router.push(`/goals/public/${pending}?autojoin=true`)
          return
        }

        const entryPathSelected = localStorage.getItem('entry_path_selected') === 'true'
        if (!user && !entryPathSelected) {
          router.push('/auth/login')
          return
        }
        fetchDashboardMissions()
        fetchWeeklyTimeLogs()
      }
      checkAuth()
    }
  }, [mounted])

  useEffect(() => {
    const handleRefresh = () => {
      fetchDashboardMissions()
    }
    window.addEventListener('refresh-goals', handleRefresh)
    window.addEventListener('goal-created', handleRefresh)
    return () => {
      window.removeEventListener('refresh-goals', handleRefresh)
      window.removeEventListener('goal-created', handleRefresh)
    }
  }, [])

  const playBlip = () => {
    if (typeof window !== 'undefined') {
      const audio = new Audio('/sounds/blip.mp3')
      audio.volume = 0.2
      audio.play().catch(() => {})
    }
  }

  async function fetchDashboardMissions() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      if (typeof window !== 'undefined') {
        const guestGoalsStr = localStorage.getItem('guest_goals')
        const guestGoals = guestGoalsStr ? JSON.parse(guestGoalsStr) : []
        setMissions(guestGoals)
      }
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('goals')
      .select('*, tasks(*)')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
    
    if (data) {
      setMissions(data)
      
      const squads = data.filter((m: any) => m.metadata?.type === 'squad')
      setSquadsList(squads)

      if (squads.length > 0) {
        const squadGoalIds = squads.map((m: any) => m.id)
        
        // Fetch squad members and map them (exclude blocked)
        const { data: members } = await supabase
          .from('goal_members')
          .select('*, profiles(*)')
          .in('goal_id', squadGoalIds)

        if (members) {
          const map: Record<string, any[]> = {}
          members.forEach((m: any) => {
            if (!map[m.goal_id]) map[m.goal_id] = []
            map[m.goal_id].push(m)
          })
          setSquadMembersMap(map)

          // Auto-select based on smallest XP gap
          let bestSquadId = squads[0].id
          let smallestGap = Infinity
          const myXp = profile?.xp || 0

          squads.forEach((sq: any) => {
            const sqMembers = map[sq.id] || []
            const uniqueMembersMap: Record<string, any> = {}
            sqMembers.forEach((m: any) => {
              if (m.profiles && m.profiles.id !== user.id && !m.profiles.blocked) {
                uniqueMembersMap[m.profiles.id] = m.profiles
              }
            })
            const otherMembers = Object.values(uniqueMembersMap).sort((a: any, b: any) => b.xp - a.xp)
            if (otherMembers.length > 0) {
              const topMember: any = otherMembers[0]
              const gap = Math.abs(topMember.xp - myXp)
              if (gap < smallestGap) {
                smallestGap = gap
                bestSquadId = sq.id
              }
            }
          })
          
          setSelectedSquadId(bestSquadId)
        }
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
    return list
  }, [missions, currentTheme.color])

  const actionInboxTasks = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return allTasks.filter((task: any) => {
      if (task.is_completed) return false
      const dateStr = task.metadata?.endDate || task.metadata?.dueDate
      if (!dateStr) return false
      
      const taskDate = new Date(dateStr)
      taskDate.setHours(0, 0, 0, 0)
      
      return taskDate <= today
    })
  }, [allTasks])

  const { totalTasksDueToday, completedTasksToday } = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    let total = 0
    let completed = 0

    allTasks.forEach((task: any) => {
      const dateStr = task.metadata?.endDate || task.metadata?.dueDate
      if (dateStr) {
        try {
          const taskDateStr = new Date(dateStr).toISOString().split('T')[0]
          if (taskDateStr === todayStr) {
            total++
            if (task.is_completed) {
              completed++
            }
          }
        } catch {
          if (dateStr.includes(todayStr)) {
            total++
            if (task.is_completed) {
              completed++
            }
          }
        }
      }
    })

    return { totalTasksDueToday: total, completedTasksToday: completed }
  }, [allTasks])

  const completedTasksCount = useMemo(() => allTasks.filter(t => t.is_completed).length, [allTasks])
  const pendingTasksCount = useMemo(() => allTasks.filter(t => !t.is_completed).length, [allTasks])

  // Pinned Goals Filter (Backwards compatible with sync_to_dashboard)
  const pinnedGoals = useMemo(() => {
    return missions.filter((m: any) => m.isPinned || m.sync_to_dashboard)
  }, [missions])

  // Combined squad leaderboard across all squads the user belongs to, deduplicating members
  const combinedSquadLeaderboard = useMemo(() => {
    const map: Record<string, any> = {}

    if (profile?.id) {
      map[profile.id] = {
        id: profile.id,
        full_name: profile.full_name || 'You',
        avatar_url: profile.avatar_url || null,
        xp: profile.xp || 0,
        rank: profile.rank || 'ROOKIE'
      }
    }

    Object.values(squadMembersMap).forEach((membersList) => {
      membersList.forEach((m: any) => {
        if (m.profiles && !m.profiles.blocked) {
          const p = m.profiles
          if (!map[p.id] || (p.xp && p.xp > (map[p.id].xp || 0))) {
            map[p.id] = {
              id: p.id,
              full_name: p.full_name || 'Member',
              avatar_url: p.avatar_url || null,
              xp: p.xp || 0,
              rank: p.rank || 'ROOKIE'
            }
          }
        }
      })
    })

    return Object.values(map).sort((a, b) => b.xp - a.xp)
  }, [squadMembersMap, profile])

  // Group Action Inbox tasks by due date
  const actionInboxGrouped = useMemo(() => {
    const groups: { dateKey: string; dateLabel: string; isOverdue: boolean; tasks: any[] }[] = []
    const map: Record<string, { dateKey: string; dateLabel: string; isOverdue: boolean; tasks: any[] }> = {}
    const todayStr = new Date().toISOString().split('T')[0]

    actionInboxTasks.forEach((task: any) => {
      const rawDate = task.metadata?.endDate || task.metadata?.dueDate || ''
      let key = 'No Date'
      let label = 'No Date'
      let isOverdue = false

      if (rawDate) {
        try {
          const d = new Date(rawDate)
          const dateISO = d.toISOString().split('T')[0]
          key = dateISO
          isOverdue = dateISO < todayStr

          if (dateISO === todayStr) {
            label = isRTL ? 'اليوم' : 'Today'
          } else {
            label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            if (isOverdue) {
              label = `${isRTL ? 'متأخر' : 'Overdue'} • ${label}`
            }
          }
        } catch {
          key = rawDate
          label = rawDate
        }
      }

      if (!map[key]) {
        map[key] = { dateKey: key, dateLabel: label, isOverdue, tasks: [] }
        groups.push(map[key])
      }
      map[key].tasks.push(task)
    })

    return groups
  }, [actionInboxTasks, isRTL])
  const computedRivalryText = useMemo(() => {
    /*
    if (!selectedSquadId || !squadMembersMap[selectedSquadId]) {
      return isRTL ? 'انضم إلى فريق لتتبع منافسيك.' : 'Join a squad to track your rivals.'
    }
    
    const members = squadMembersMap[selectedSquadId] || []
    const myId = profile?.id
    if (!myId) return isRTL ? 'سجل الدخول للمقارنة' : 'Log in to track rivals.'

    const uniqueMembersMap: Record<string, any> = {}
    members.forEach((m: any) => {
      if (m.profiles && m.profiles.id !== myId && !m.profiles.blocked) {
        uniqueMembersMap[m.profiles.id] = m.profiles
      }
    })
    const otherMembers = Object.values(uniqueMembersMap).sort((a: any, b: any) => b.xp - a.xp)
    
    if (otherMembers.length > 0) {
      const topMember: any = otherMembers[0]
      const myXp = profile?.xp || 0
      
      if (myXp >= topMember.xp) {
        const diff = myXp - topMember.xp
        return isRTL 
          ? `أنت في الصدارة! يليك ${topMember.full_name || 'منافسك'} بفارق ${diff} XP.` 
          : `You are leading! ${topMember.full_name || 'Rival'} is ${diff} XP behind you.`
      } else {
        const diff = topMember.xp - myXp
        return isRTL 
          ? `أنت متأخر بـ ${diff} XP عن ${topMember.full_name || 'المتصدر'}.` 
          : `You are ${diff} XP behind ${topMember.full_name || 'Leader'}.`
      }
    }
    return isRTL ? 'لا يوجد منافسين في هذا الفريق.' : 'No other active rivals in this squad.'
    */
    /*
    return isRTL 
      ? 'ترتيبك في الفريق: شوف مركزك بين زمايلك.' 
      : 'Squad Leaderboard: See your rank among teammates.'
    */
    return isRTL 
      ? 'ترتيبك في الـ Squad: شوف مركزك بين زمايلك.' 
      : 'Squad Leaderboard: See your rank among teammates.'
  }, [isRTL])

  async function toggleTask(task: any) {
    const updatedStatus = !task.is_completed
    setMissions(prev => prev.map(m => ({
      ...m,
      tasks: m.tasks?.map((t: any) => t.id === task.id ? { ...t, is_completed: updatedStatus } : t)
    })))

    // Support guest goals locally
    // if (task.cup_id?.startsWith('local_')) {
    if (task.goal_id?.startsWith('local_')) {
      const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
      const updatedGoals = guestGoals.map((m: any) => {
        // if (m.id === task.cup_id) {
        if (m.id === task.goal_id) {
          return {
            ...m,
            tasks: m.tasks?.map((t: any) => t.id === task.id ? { ...t, is_completed: updatedStatus } : t)
          }
        }
        return m
      })
      localStorage.setItem('guest_goals', JSON.stringify(updatedGoals))
      return
    }

    const { error } = await supabase.from('tasks').update({ is_completed: updatedStatus }).eq('id', task.id)
    if (error) {
      fetchDashboardMissions()
    } else {
      // const mission = missions.find(m => m.id === task.cup_id)
      const mission = missions.find(m => m.id === task.goal_id)
      if (mission && mission.tasks) {
        const taskIndex = mission.tasks.findIndex((t: any) => t.id === task.id)
        if (taskIndex !== -1) {
          const sizeStr = mission.size?.toLowerCase() || 'md'
          let xpCeiling = 8
          if (sizeStr === 'sm' || sizeStr === 's' || sizeStr === 'small') xpCeiling = 4
          else if (sizeStr === 'lg' || sizeStr === 'l' || sizeStr === 'large') xpCeiling = 20

          if (taskIndex < xpCeiling) {
            await addXp(updatedStatus ? ((Number(task.weight) || 3) * 10) : -((Number(task.weight) || 3) * 10), updatedStatus ? task.title : undefined, updatedStatus ? task.id : undefined)
          }
        }
      }

      if (updatedStatus) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('task_completion_log').insert([{
            user_id: user.id,
            task_id: task.id,
            // cup_id: task.cup_id,
            completed_at: new Date().toISOString()
          }])
        }
      }
    }
  }

  return (
    <>
      {/* Shell is now in layout.tsx */}
      {/* <Shell> */}
      {/* <Shell syncedMissions={missions} onMissionsRefresh={fetchDashboardMissions}> */}
      {/* Commented out per rule "Never delete code, only comment it out"
      <div 
        className="w-full min-h-[calc(100dvh-64px)] font-space relative animate-page-fade-in"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${currentTheme.color}45 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, ${currentTheme.color}30 0%, transparent 45%)` }}
      >
      */}
      <div 
        className="w-full min-h-[calc(100dvh-64px)] font-space relative animate-page-fade-in bg-gradient-to-b from-[#E8EFF2] to-[#F2F6F8] dark:bg-transparent"
        style={isDark ? { background: `radial-gradient(ellipse at 50% 0%, ${currentTheme.color}45 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, ${currentTheme.color}30 0%, transparent 45%)` } : {}}
      >
        <div className="w-full flex flex-col py-4 sm:py-8 md:py-12 px-2 sm:px-6 md:px-12 space-y-4 sm:space-y-6 md:space-y-8 bg-transparent border-l-0 border-r-0">
        
        {/* ── COMMAND CENTER TITLE ── */}
        <div className="w-full flex flex-col items-center text-center space-y-2 sm:space-y-3">
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="h-[1px] w-12 sm:w-20 md:w-32" style={{ background: `linear-gradient(to right, transparent, ${currentTheme.color}40)` }} />
            <div className="h-[1px] w-12 sm:w-20 md:w-32" style={{ background: `linear-gradient(to left, transparent, ${currentTheme.color}40)` }} />
          </div>

          {/* Commented out per rule "Never delete code, only comment it out"
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "font-black tracking-tight leading-none text-zinc-900 dark:text-white",
              isRTL ? "text-xl md:text-4xl" : "text-2xl md:text-5xl"
            )}
          >
            {isRTL ? 'لوحة' : 'Focus'} <span style={{ color: currentTheme.color }}>{isRTL ? 'التركيز' : 'Hub'}</span>
          </motion.h1>

          <p className={cn(
            "font-medium truncate max-w-[90vw]",
            isRTL ? "text-[11px] text-zinc-500 dark:text-zinc-400" : "text-[13px] text-zinc-500 dark:text-zinc-400"
          )}>
            {isRTL ? 'لوحة المتابعة والتحكم بالأداء' : 'Your performance metrics and focus pipeline'}
          </p>
          */}

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "font-black tracking-tight leading-none text-[var(--text-primary)] dark:text-white",
              isRTL ? "text-xl md:text-4xl" : "text-2xl md:text-5xl"
            )}
          >
            {isRTL ? 'لوحة' : 'Focus'} <span style={{ color: currentTheme.color }}>{isRTL ? 'التركيز' : 'Hub'}</span>
          </motion.h1>

          <p className={cn(
            "font-medium truncate max-w-[90vw]",
            isRTL ? "text-[11px] text-[var(--text-secondary)] dark:text-zinc-400" : "text-[13px] text-[var(--text-secondary)] dark:text-zinc-400"
          )}>
            {isRTL ? 'لوحة المتابعة والتحكم بالأداء' : 'Your performance metrics and focus pipeline'}
          </p>
        </div>

        {/* ── THE FOCUS PIPELINE (Top Section - Full Width - Commented out for Mobile Optimization) ──
        <div className="w-full bg-white/60 dark:bg-black/40 backdrop-blur-3xl border border-black/5 dark:border-white/5 rounded-2xl p-6 md:p-8 space-y-4 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1" style={{ background: `linear-gradient(to right, ${currentTheme.color}, transparent)` }} />
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <NeonIcon icon={Zap} className="w-4 h-4 shrink-0" style={{ color: currentTheme.color }} />
              <span className="text-xs font-black tracking-widest text-[var(--text-secondary)] uppercase">
                {isRTL ? 'معدل التركيز اليومي' : 'DAILY FOCUS STATS'}
              </span>
            </div>
            <div className="text-lg font-black tracking-tight">
              <span style={{ color: currentTheme.color }}>{completedTasksToday}</span>
              <span className="text-zinc-500"> / {totalTasksDueToday}</span>
            </div>
          </div>

          <div 
            className="flex gap-2 h-7 p-1 rounded-xl border bg-zinc-100 dark:bg-[#050505] overflow-hidden shadow-inner w-full"
            style={{ borderColor: `${currentTheme.color}30` }}
          >
            {totalTasksDueToday === 0 ? (
              <div className="flex-1 rounded border border-zinc-200 dark:border-white/5 bg-zinc-200/50 dark:bg-white/[0.02]" />
            ) : (
              Array.from({ length: totalTasksDueToday }).map((_, i) => {
                const isActive = i < completedTasksToday
                return (
                  <div
                    key={i}
                    className="flex-1 rounded transition-all duration-500 relative overflow-hidden"
                    style={{
                      backgroundColor: isActive ? currentTheme.color : 'transparent',
                      border: isActive ? 'none' : '1px solid rgba(255, 255, 255, 0.05)',
                      boxShadow: isActive ? `0 0 15px ${currentTheme.color}` : 'none',
                    }}
                  >
                    {isActive && (
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
        ── */}

        {/* ── TOP STATS GRID (Daily Focus Stats & Squad Leaderboard Side-by-Side) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 w-full items-stretch font-space">
          
          {/* 1. Daily Focus Stats */}
          <div 
            className="bg-white/60 dark:bg-black/40 backdrop-blur-3xl border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-3 shadow-none relative overflow-hidden flex flex-col justify-between transition-all duration-150"
          >
            <div className="absolute top-0 inset-x-0 h-[2px]" style={{ backgroundColor: currentTheme.color }} />
            
            <div className="flex justify-between items-center gap-1.5">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <Zap className="w-4 h-4 shrink-0 text-amber-400" />
                <span className={cn(
                  "font-semibold text-[var(--text-secondary)] dark:text-zinc-300 truncate",
                  isRTL ? "text-[10px] sm:text-xs" : "text-xs sm:text-sm"
                )}>
                  {isRTL ? 'تركيزك اليومي' : 'Daily Focus'}
                </span>
              </div>
              <div className="text-xs sm:text-lg font-black tracking-tight shrink-0">
                <span style={{ color: currentTheme.color }}>{completedTasksToday}</span>
                <span className="text-zinc-500 text-xs sm:text-sm">/{totalTasksDueToday}</span>
              </div>
            </div>

            {/* Segmented Progress Bar (FLAT DESIGN — NO GLOW) */}
            <div 
              className="flex gap-1 h-5 sm:h-6 p-0.5 rounded-lg border bg-zinc-100 dark:bg-[#050505] overflow-hidden w-full mt-1.5"
              style={{ borderColor: `${currentTheme.color}30` }}
            >
              {totalTasksDueToday === 0 ? (
                <div className="flex-1 rounded-sm border border-zinc-200 dark:border-white/5 bg-zinc-200/50 dark:bg-white/[0.02]" />
              ) : (
                Array.from({ length: totalTasksDueToday }).map((_, i) => {
                  const isActive = i < completedTasksToday
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-sm transition-colors duration-300 relative"
                      style={{
                        backgroundColor: isActive ? currentTheme.color : 'transparent',
                        border: isActive ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
                        boxShadow: 'none'
                      }}
                    />
                  )
                })
              )}
            </div>
          </div>

          {/* 2. Squad Leaderboard Mini-Card */}
          <div 
            className="bg-white/60 dark:bg-black/40 backdrop-blur-3xl border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-3 shadow-none relative overflow-hidden flex flex-col justify-between"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] dark:text-zinc-100 truncate">
                  {isRTL ? 'ترتيب الفريق' : 'Squad Leaderboard'}
                </span>
              </div>
            </div>

            {combinedSquadLeaderboard.length < 3 ? (
              /* Simple empty state inviting user to join or create a squad goal */
              <div className="py-3 flex flex-col items-center justify-center text-center space-y-2 my-auto">
                <p className="text-xs text-[var(--text-secondary)] dark:text-zinc-400">
                  {isRTL ? 'انضم أو أنشئ هدف فريق لمشاهدة الترتيب' : 'Join or create a squad goal to see leaderboard'}
                </p>
                <button
                  onClick={() => router.push('/goals/squad')}
                  className="px-3 py-1.5 rounded-lg border border-teal-500/30 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {isRTL ? 'فرق العمل' : 'Squad Goals'}
                </button>
              </div>
            ) : (
              <div className="space-y-1.5 my-auto">
                {/* Top 3 members */}
                {combinedSquadLeaderboard.slice(0, 3).map((member, idx) => {
                  const rank = idx + 1
                  const isRank1 = rank === 1
                  const isCurrentUser = member.id === profile?.id

                  return (
                    <div
                      key={member.id}
                      className={cn(
                        "flex items-center justify-between p-1.5 rounded-lg transition-colors text-xs",
                        isCurrentUser ? "bg-white/10 dark:bg-zinc-800/50 font-medium" : "hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Rank number / crown badge */}
                        <div className="w-5 h-5 flex items-center justify-center shrink-0">
                          {isRank1 ? (
                            <span className="text-amber-500 font-bold text-xs flex items-center gap-0.5" title="Rank 1">
                              👑 <span className="text-[10px]">1</span>
                            </span>
                          ) : (
                            <span className="text-[11px] font-mono text-zinc-400 font-semibold">{rank}</span>
                          )}
                        </div>

                        {/* Avatar component */}
                        <Avatar
                          avatarUrl={member.avatar_url}
                          name={member.full_name}
                          size={22}
                        />

                        {/* Name */}
                        <span className="truncate text-zinc-900 dark:text-zinc-100 font-medium text-xs">
                          {member.full_name} {isCurrentUser && <span className="text-[10px] text-teal-400">(You)</span>}
                        </span>
                      </div>

                      {/* XP value */}
                      <span className="font-mono text-xs font-semibold text-zinc-400 shrink-0 ml-2">
                        {member.xp || 0} XP
                      </span>
                    </div>
                  )
                })}

                {/* 4th row for current user if user is not in top 3 */}
                {(() => {
                  const userIdx = combinedSquadLeaderboard.findIndex(m => m.id === profile?.id)
                  if (userIdx < 3) return null
                  const userMember = combinedSquadLeaderboard[userIdx]
                  if (!userMember) return null

                  return (
                    <>
                      <div className="border-t border-white/10 my-1" />
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/10 dark:bg-zinc-800/50 text-xs font-medium">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-5 h-5 flex items-center justify-center shrink-0">
                            <span className="text-[11px] font-mono text-teal-400 font-semibold">{userIdx + 1}</span>
                          </div>

                          <Avatar
                            avatarUrl={userMember.avatar_url}
                            name={userMember.full_name}
                            size={22}
                          />

                          <span className="truncate text-zinc-900 dark:text-zinc-100 font-medium text-xs">
                            {userMember.full_name} <span className="text-[10px] text-teal-400">(You)</span>
                          </span>
                        </div>

                        <span className="font-mono text-xs font-semibold text-teal-400 shrink-0 ml-2">
                          {userMember.xp || 0} XP
                        </span>
                      </div>
                    </>
                  )
                })()}
              </div>
            )}
          </div>

        </div>

        <InlineGuideTip hasTasks={allTasks.length > 0} />

        {/* ── MIDDLE GRID (Action Inbox - Date Grouped & Direct TaskDrawer Navigation) ── */}
        <div className="w-full font-space">
          
          {/* Action Inbox */}
          <div 
            className="w-full bg-white dark:bg-black/40 border border-[var(--border)] dark:border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-6 md:p-8 space-y-4 sm:space-y-6 shadow-none relative overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r to-transparent" style={{ backgroundImage: `linear-gradient(to right, ${currentTheme.color}, transparent)` }} />
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className={cn(
                  "font-semibold text-[var(--text-secondary)]",
                  isRTL ? "text-[10px] sm:text-xs" : "text-xs sm:text-sm"
                )}>
                  {isRTL ? 'المهام العاجلة' : 'Action Inbox'}
                </h2>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium border shrink-0 transition-colors duration-200" style={{ color: currentTheme.color, borderColor: `${currentTheme.color}30`, backgroundColor: `${currentTheme.color}15` }}>
                {actionInboxTasks.length} {isRTL ? 'مهمة' : 'tasks'}
              </span>
            </div>

            <div className="space-y-4 max-h-[380px] sm:max-h-[440px] overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {actionInboxGrouped.map((group) => (
                <div key={group.dateKey} className="space-y-2">
                  {/* Lightweight Date Group Header */}
                  <div className="flex items-center gap-2 pt-1 pb-0.5 border-b border-white/5 dark:border-white/10">
                    <span className={cn(
                      "text-[10px] font-mono uppercase font-bold tracking-wider inline-flex items-center gap-1.5",
                      group.isOverdue ? "text-red-400" : "text-[var(--text-secondary)] dark:text-zinc-400"
                    )}>
                      <Calendar className="w-3 h-3 shrink-0" />
                      <span>{group.dateLabel}</span>
                    </span>
                    <div className="flex-1 h-[1px] bg-white/5 dark:bg-white/10" />
                    <span className="text-[9px] font-mono text-zinc-500">
                      {group.tasks.length}
                    </span>
                  </div>

                  {/* Tasks under this date group */}
                  <div className="space-y-2">
                    {group.tasks.map((task: any) => (
                      <motion.div
                        key={task.id}
                        layout
                        onClick={() => setSelectedTaskForDrawer(task)}
                        className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl border border-[var(--border)] dark:border-white/5 bg-white dark:bg-zinc-950/20 hover:bg-[var(--card-hover)] dark:hover:bg-white/5 transition-all gap-2.5 sm:gap-4 font-space cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 sm:gap-3.5 min-w-0 flex-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTask(task);
                            }}
                            className="w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full border flex items-center justify-center bg-transparent hover:bg-white/5 transition-all shrink-0 cursor-pointer group/btn"
                            style={{ borderColor: task.missionColor || currentTheme.color }}
                          >
                            <NeonIcon 
                              icon={Crosshair} 
                              interactive 
                              className="w-3 sm:w-3.5 sm:h-3.5 opacity-0 group-hover/btn:opacity-100 transition-opacity" 
                              style={{ color: task.missionColor || currentTheme.color }} 
                            />
                          </button>

                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] dark:text-white/95 truncate leading-tight group-hover:text-teal-400 transition-colors">
                              {task.title}
                            </span>
                            <span className="text-[8px] sm:text-[9px] text-[var(--text-secondary)] dark:text-zinc-500 font-medium tracking-wide mt-0.5 truncate">
                              {task.missionTitle}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                          <span className="text-[8px] sm:text-[10px] font-mono text-[var(--text-muted)] dark:text-zinc-500 tracking-wider">
                            +{task.weight * 10}XP
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}

              {actionInboxTasks.length === 0 && (
                <div className="py-12 sm:py-16 text-center space-y-2 border border-dashed border-[var(--border)] dark:border-white/5 rounded-xl">
                  <p className="text-[9px] sm:text-xs text-[var(--text-muted)] dark:text-white/30 uppercase tracking-widest">
                    {isRTL ? 'عاش! مفيش أي مهام متأخرة عليك دلوقتي.' : "You're all caught up! Overdue tasks will appear here."}
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ── PINNED GOALS (Bottom Section - Shared GoalCard Grid) ── */}
        <div className="w-full space-y-4 pt-6 border-t border-white/10 font-space">
          <div className="flex items-center gap-3">
            <h2 className={cn(
              "font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight",
              isRTL ? "text-xs" : "text-sm"
            )}>
              {isRTL ? 'الأهداف المثبّتة' : 'Pinned Goals'}
            </h2>
          </div>

          <div
            className="w-full"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px'
            }}
          >
            {pinnedGoals.map((mission, idx) => {
              const { progress } = calculateAccountability(mission)
              const roundedProgress = Math.round(progress)
              const completedTasks = mission.tasks?.filter((t: any) => t.is_completed).length || 0
              const totalTasks = mission.tasks?.length || 0
              const members = squadMembersMap[mission.id] || []

              let userRole = 'SOLO'
              if (mission.metadata?.type === 'squad') {
                userRole = mission.user_id === profile?.id ? 'ADMIN' : 'MEMBER'
              }

              return (
                <GoalCard
                  key={mission.id}
                  idx={idx}
                  title={mission.title}
                  completedTasks={completedTasks}
                  totalTasks={totalTasks}
                  dueDate={mission.end_date || mission.start_date}
                  percentage={roundedProgress}
                  color={mission.color || currentTheme.color}
                  isActive={Boolean(mission.sync_to_dashboard)}
                  role={userRole}
                  members={members}
                  typeFilter={mission.metadata?.type || 'solo'}
                  onClick={() => router.push(mission.metadata?.type === 'public' ? `/goals/public/${mission.id}` : `/goals/squad/${mission.id}`)}
                />
              )
            })}

            {pinnedGoals.length === 0 && (
              <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-xl">
                <p className="text-xs text-zinc-500 font-medium">
                  {isRTL ? 'لا توجد أهداف مثبتة. افتح هدفاً وثبّته في لوحة التحكم.' : 'No goals pinned yet. Open a goal and pin it to your dashboard.'}
                </p>
              </div>
            )}
          </div>
        </div>

        </div>
      </div>

      {/* Task Drawer modal when clicking task from Action Inbox */}
      {selectedTaskForDrawer && (
        <TaskDrawer
          task={selectedTaskForDrawer}
          onClose={() => setSelectedTaskForDrawer(null)}
          isGuest={!profile?.id}
          themeColor={currentTheme.color}
          onComplete={() => {
            toggleTask(selectedTaskForDrawer)
            setSelectedTaskForDrawer(null)
          }}
          onUpdateTask={async (taskId, updates) => {
            setMissions(prev => prev.map(m => ({
              ...m,
              tasks: m.tasks?.map((t: any) => t.id === taskId ? { ...t, ...updates } : t)
            })))
            await supabase.from('tasks').update(updates).eq('id', taskId)
          }}
          goalId={selectedTaskForDrawer.goal_id}
        />
      )}
    </>
  )
}
