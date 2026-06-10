'use client'

import { X, Zap, BarChart2, Calendar, AlertTriangle, Target, Flame, ChevronLeft, ChevronRight } from 'lucide-react'
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { chatWithCoach } from '@/app/actions/ai-magic'
import { useGrowth } from '@/context/GrowthContext'
import { useSound } from '@/context/SoundContext'
import { useTrack } from '@/hooks/useTrack'

interface CoachPanelProps {
  isOpen: boolean
  onClose: () => void
  missions: any[]
}

const IconMap: Record<string, React.ComponentType<any>> = {
  analytics: BarChart2,
  event_note: Calendar,
  warning: AlertTriangle,
  target: Target,
  local_fire_department: Flame,
  bolt: Zap
}

export default function CoachPanel({ isOpen, onClose, missions }: CoachPanelProps) {
  const { profile, setLastAiMessage, currentTheme, tasksCompletedToday, isRTL } = useGrowth()
  const { playNeuralLink, playBlip } = useSound()
  const { track } = useTrack()
  const [response, setResponse] = useState(profile?.language === 'ar' ? 'جاهز، إيه اللي تحب تعمله؟' : 'What do you need help with?')
  const [isLoading, setIsLoading] = useState(false)
  const [energy, setEnergy] = useState<number>(3)

  // Energy System Logic (Point 1)
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const checkEnergy = () => {
      const d = new Date()
      const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const lastScanDate = localStorage.getItem('last_scan_date')
      let currentEnergy = 3

      if (lastScanDate !== todayStr) {
        localStorage.setItem('last_scan_date', todayStr)
        localStorage.setItem('coach_energy', '3')
        setEnergy(3)
      } else {
        const storedEnergy = localStorage.getItem('coach_energy')
        currentEnergy = storedEnergy ? parseInt(storedEnergy, 10) : 3
        if (isNaN(currentEnergy) || storedEnergy === null) {
          currentEnergy = 3
          localStorage.setItem('coach_energy', '3')
        }
        setEnergy(currentEnergy)
      }
    }

    if (isOpen) checkEnergy()
  }, [isOpen])

  React.useEffect(() => {
    if (isOpen) {
      track('coach_opened')
    }
  }, [isOpen, track])

  const isArabic = /[\u0600-\u06FF]/.test(response)

  const personality = React.useMemo(() => {
    const rank = profile?.rank || 'SILVER'
    if (rank === 'CONQUEROR') return 'SAVAGE'
    if (rank === 'ACE' || rank === 'CROWN') return 'DIRECT'
    return 'SUPPORTIVE'
  }, [profile?.rank])

  const coachColor = currentTheme?.color || '#00E5FF'

  const activeMissions = missions.filter(m => !m.is_archived && m.sync_to_dashboard)
  
  const handleAction = async (actionType: string) => {
    if (isLoading || energy <= 0) return
    setIsLoading(true)
    playNeuralLink()
    track('coach_action', { action: actionType })

    // Visual loading prompt (Point 4)
    setResponse(profile?.language === 'ar' ? 'جاري فحص وتحليل خلايا البيانات الحية...' : 'ANALYZING_USER_DATA...')

    const nextEnergy = energy - 1
    setEnergy(nextEnergy)
    localStorage.setItem('coach_energy', String(nextEnergy))

    let prompt = ''
    switch (actionType) {
      case 'REALITY_CHECK':
        prompt = 'REALITY_CHECK: Rant aggressively about my overdue and ignored tasks. Mention them by name, shame my lack of discipline, and command immediate action.'
        break
      case 'TOP_3_FOCUS':
        prompt = 'TOP_3_FOCUS: Analyze my active tasks and goals. Filter them down and return ONLY a strict, numbered list of the top 3 absolute priorities for today. Keep it brief, high-pressure, and highly actionable.'
        break
      case 'QUICK_WIN':
        prompt = 'QUICK_WIN: Scan all my incomplete tasks. Find the absolute easiest, smallest 5-minute task I can start with right now. Order me to complete it immediately to build momentum. No fluff.'
        break
    }

    const nowTime = new Date().getTime()
    const overdueMissions = activeMissions.filter(m => {
      if (!m.end_date || m.end_date === 'NO_DEADLINE') return false
      const isPastDue = new Date(m.end_date).getTime() < nowTime
      const isCompleted = m.tasks && m.tasks.length > 0 && m.tasks.every((t: any) => t.is_completed)
      return isPastDue && !isCompleted
    })

    const userData = {
      username: profile?.full_name || 'MEMBER',
      rank: profile?.rank || 'RECRUIT',
      xp: profile?.xp || 0,
      capacity_used: activeMissions.length,
      completed_tasks_today: tasksCompletedToday || 0,
      missions: activeMissions.map(m => ({
        title: m.title,
        progress: m.progress || 0,
        end_date: m.end_date || 'NO_DEADLINE',
        tasks_completed: m.tasks?.filter((t: any) => t.is_completed).length || 0,
        tasks_total: m.tasks?.length || 0,
        next_task: m.tasks?.find((t: any) => !t.is_completed)?.title || 'DONE'
      })),
      critical_missions: activeMissions.filter(m => {
        if (!m.end_date) return false
        const days = Math.ceil((new Date(m.end_date).getTime() - nowTime) / (1000 * 3600 * 24))
        return days > 0 && days <= 3
      }).map(m => ({
        title: m.title,
        progress: m.progress || 0,
        end_date: m.end_date || 'NO_DEADLINE',
        tasks_completed: m.tasks?.filter((t: any) => t.is_completed).length || 0,
        tasks_total: m.tasks?.length || 0,
        next_task: m.tasks?.find((t: any) => !t.is_completed)?.title || 'DONE'
      })),
      overdue_missions: overdueMissions.map(m => ({
        title: m.title,
        end_date: m.end_date,
        tasks_completed: m.tasks?.filter((t: any) => t.is_completed).length || 0,
        tasks_total: m.tasks?.length || 0,
        next_task: m.tasks?.find((t: any) => !t.is_completed)?.title || 'DONE'
      }))
    }

    try {
      const apiResponse = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: prompt,
          userData,
          language: profile?.language || 'en'
        })
      })
      const data = await apiResponse.json()
      if (data && data.response) {
        setResponse(data.response)
        setLastAiMessage(data.response)
      } else {
        throw new Error(data.error || 'API call failed')
      }
    } catch (err: any) {
      console.error(err)
      setResponse(profile?.language === 'ar' ? 'مش قادرين نوصل للمدرب دلوقتي. جرب تاني كمان شوية.' : 'Could not connect to the AI Coach. Please try again later.')
    } finally {
      setIsLoading(false)
      playBlip()
    }
  }

  const coachName = profile?.ai_name || personality;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-sm z-[250]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-screen w-full max-w-[420px] bg-[var(--card-bg)] border-l border-[var(--card-border)] z-[300] shadow-[-20px_0_50px_rgba(0,0,0,0.1)] dark:shadow-[-20px_0_50px_rgba(0,0,0,0.5)] flex flex-col font-space"
            style={{ borderColor: `${coachColor}44` }}
          >
            {/* Header */}
            <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: `${coachColor}22` }}>
              <div className="flex items-center gap-3">
                <Zap className="animate-pulse" style={{ color: coachColor }} />
                <span className="text-sm font-black tracking-[0.2em] uppercase whitespace-nowrap overflow-hidden" style={{ color: coachColor }}>
                  {/* COACH: {coachName} // ONLINE */}
                  {isRTL ? `المدرب: ${coachName}` : `Coach Mode: ${coachName}`}
                </span>
              </div>
              <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                <X className="" />
              </button>
            </div>

            {/* Premium i18n Cyberpunk Energy Bar (Point 1) */}
            <div className="px-6 py-2 bg-black/10 border-b flex items-center justify-between text-[9px] font-monospace tracking-widest uppercase" style={{ borderColor: `${coachColor}11`, color: coachColor }}>
              <span>{isArabic ? `فاضل ${energy}/3 مرات تقدر تسأل فيهم` : `${energy} scans left today`}</span>
              <div className="flex gap-1.5 items-center">
                {[1, 2, 3].map(i => (
                  <div 
                    key={i} 
                    className="w-4 h-1.5 transition-all duration-300 rounded-[1px]"
                    style={{ 
                      backgroundColor: i <= energy ? coachColor : 'rgba(255,255,255,0.05)',
                      boxShadow: i <= energy ? `0 0 8px ${coachColor}` : 'none'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Response Area — Cyberpunk Terminal */}
            <div className="p-6">
              <div className="relative group">
                <div className="absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition duration-1000" style={{ backgroundColor: `${coachColor}22` }}></div>
                <div 
                  className="relative p-5 bg-zinc-950 border overflow-y-auto scrollbar-thin rounded-xl" 
                  style={{ 
                    borderColor: `${coachColor}30`,
                    boxShadow: `inset 0 0 20px ${coachColor}15, 0 0 15px ${coachColor}08`,
                    minHeight: '250px',
                    maxHeight: '40vh',
                    direction: isArabic ? 'rtl' : 'ltr',
                    textAlign: isArabic ? 'right' : 'left'
                  }}
                >
                  {/* CRT Scanline Overlay */}
                  <div 
                    className="pointer-events-none absolute inset-0 z-10 opacity-30 rounded-xl"
                    style={{ background: 'linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.25) 50%), linear-gradient(90deg, rgba(255,0,0,0.06), rgba(0,255,0,0.02), rgba(0,0,255,0.06))', backgroundSize: '100% 4px, 3px 100%' }}
                  />

                  {/* Terminal Header Label */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3 font-mono text-[10px] tracking-widest text-emerald-500/70">
                    {/* <span>&gt; COACH_CORE_TERMINAL // ACTIVE</span>
                    <span className="animate-pulse">● ONLINE</span> */}
                    <span>&gt; AI Coach — Online</span>
                  </div>

                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-4 py-10">
                       <span className="text-xs font-mono font-black tracking-widest animate-pulse uppercase text-emerald-400">
                         {profile?.language === 'ar' ? `${coachName} بيفكر...` : `${coachName} is processing...`}
                       </span>
                       <div className="flex gap-2">
                          {[0, 1, 2].map(i => (
                            <motion.div
                              key={i}
                              animate={{ opacity: [0.2, 1, 0.2] }}
                              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                              className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                            />
                          ))}
                       </div>
                    </div>
                  ) : (
                    <p className="font-mono text-sm leading-relaxed text-emerald-400 antialiased whitespace-pre-wrap relative z-20">
                      {response}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4 scrollbar-thin">
              <span className="text-[10px] font-black tracking-[0.4em] uppercase" style={{ color: coachColor }}>
                {energy === 0 
                  ? (profile?.language === 'ar' ? 'خلصت الـ scans النهارده، رجّع بكره 💪' : '⚠️ Recharging until midnight')
                  : 'Choose an action'}
              </span>
              
              <div className="grid grid-cols-1 gap-4">
                <ActionButton 
                  icon="warning" 
                  title={profile?.language === 'ar' ? 'كشف حساب' : 'Reality Check'} 
                  subtitle={profile?.language === 'ar' ? 'شوف إنت فين بالظبط من Tasks المتأخرة' : 'Brutal check on overdue & ignored tasks'} 
                  onClick={() => handleAction('REALITY_CHECK')}
                  disabled={isLoading || energy === 0}
                  color={coachColor}
                  lang={profile?.language}
                  className="py-5 px-5"
                />
                <ActionButton 
                  icon="target" 
                  title={profile?.language === 'ar' ? 'أهم 3 حاجات' : 'Top 3 Focus'} 
                  subtitle={profile?.language === 'ar' ? 'إيه أهم 3 حاجات تعملها النهارده' : 'Extract the top 3 absolute priorities for today'} 
                  onClick={() => handleAction('TOP_3_FOCUS')}
                  disabled={isLoading || energy === 0}
                  color={coachColor}
                  lang={profile?.language}
                  className="py-5 px-5"
                />
                <ActionButton 
                  icon="bolt" 
                  title={profile?.language === 'ar' ? 'انتصار سريع' : 'Quick Win'} 
                  subtitle={profile?.language === 'ar' ? 'لاقيلك task سهلة تبدأ بيها دلوقتي' : 'Find the easiest 5-minute task to start with'} 
                  onClick={() => handleAction('QUICK_WIN')}
                  disabled={isLoading || energy === 0}
                  color={coachColor}
                  lang={profile?.language}
                  className="py-5 px-5"
                />
              </div>
            </div>

            {/* Footer Decorative */}
            <div className="p-4 border-t" style={{ borderColor: `${coachColor}22` }}>
                <div className="flex justify-end items-center opacity-40">
                  <div className="flex gap-1">
                     <div className="w-8 h-1" style={{ backgroundColor: coachColor }}></div>
                     <div className="w-2 h-1" style={{ backgroundColor: coachColor }}></div>
                  </div>
               </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function ActionButton({ icon, title, subtitle, onClick, disabled, color, lang, className }: any) {
  const isRTL = lang === 'ar'
  const IconComponent = IconMap[icon] || Zap
  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight
  const { playBlip } = useSound()

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full p-5 bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 transition-all duration-300 group flex items-start gap-4 text-start relative overflow-hidden rounded-xl cursor-pointer hover:scale-[1.02]",
        disabled && "opacity-50 cursor-not-allowed hover:scale-100",
        className
      )}
      onMouseEnter={e => {
        if (!disabled) {
          playBlip()
          e.currentTarget.style.borderColor = `${color}88`
          e.currentTarget.style.backgroundColor = `${color}15`
          e.currentTarget.style.boxShadow = `0 0 15px -3px ${color}33`
        }
      }}
      onMouseLeave={e => {
        if (!disabled) {
          e.currentTarget.style.borderColor = ''
          e.currentTarget.style.backgroundColor = ''
          e.currentTarget.style.boxShadow = ''
        }
      }}
    >
      <div className="absolute top-0 right-0 w-16 h-16 opacity-5 blur-2xl group-hover:opacity-20 transition-colors" style={{ backgroundColor: color }}></div>
      <div 
        className="p-2 bg-white/5 border border-white/5 rounded-lg text-[var(--text-secondary)] group-hover:text-white transition-colors duration-300 shrink-0"
        style={{ color: 'var(--text-secondary)' }}
      >
        <IconComponent className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" style={{ color }} />
      </div>
      <div className="flex flex-col flex-1">
        <span className="text-[11px] font-black tracking-widest text-[var(--text-primary)] transition-colors">
          {title}
        </span>
        <span className="text-[10px] font-bold text-[var(--text-secondary)] mt-1" dir={isRTL ? "rtl" : "ltr"}>
          {subtitle}
        </span>
      </div>
      <div className="text-[var(--text-secondary)]/30 group-hover:text-white/85 transition-colors mt-2">
        <ChevronIcon className="w-4 h-4" />
      </div>
    </button>
  )
}

/* Comment out obsolete CyclingLoadingText component to keep file pristine and follow safety rules
function CyclingLoadingText({ coachName, userName, lang, color }: { coachName: string; userName: string; lang?: string; color: string }) {
  const isAr = lang === 'ar'
  const messages = React.useMemo(() => isAr ? [
    'بيحلل بياناتك... 🔍',
    'بيشوف تقدمك... ⚡',
    `${userName} بيفكر... 🧠`,
    'بيرتب الكلام... 📂',
  ] : [
    'Analyzing metadata... 🔍',
    'Syncing progress... ⚡',
    `${userName} is processing... 🧠`,
    'Organizing your content... 📂',
  ], [isAr, userName])

  const [index, setIndex] = React.useState(0)

  React.useEffect(() => {
    const interval = setInterval(() => {
      setIndex(prev => (prev + 1) % messages.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [messages.length])

  return (
    <span className="text-xs font-black tracking-widest animate-pulse uppercase" style={{ color }}>
      {messages[index]}
    </span>
  )
}
*/
