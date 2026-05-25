'use client'

import { X, Zap } from 'lucide-react'
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { chatWithCoach } from '@/app/actions/ai-magic'
import { useGrowth } from '@/context/GrowthContext'
import { useSound } from '@/context/SoundContext'

interface CoachPanelProps {
  isOpen: boolean
  onClose: () => void
  missions: any[]
}

export default function CoachPanel({ isOpen, onClose, missions }: CoachPanelProps) {
  const { profile, setLastAiMessage, currentTheme } = useGrowth()
  const { playNeuralLink, playBlip } = useSound()
  const [response, setResponse] = useState(profile?.language === 'ar' ? 'في انتظار الأوامر // اختر إجراء من الأسفل' : 'AWAITING_ORDERS // SELECT_ACTION_BELOW')
  const [isLoading, setIsLoading] = useState(false)

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
    if (isLoading) return
    setIsLoading(true)
    playNeuralLink()

    let prompt = ''
    switch (actionType) {
      case 'scan_status':
        prompt = 'Give me a full tactical status report of all my missions and overall performance'
        break
      case 'daily_plan':
        prompt = 'Based on my missions and deadlines, what exactly should I focus on today? Give me a priority order.'
        break
      case 'critical_alert':
        prompt = 'Which of my missions are in danger? What do I need to do immediately?'
        break
      case 'brief_mission':
        prompt = 'Brief me on my most critical mission. Give me a tactical breakdown of what I need to do next.'
        break
      case 'motivate_me':
        prompt = 'Give me a harsh, high-energy motivational speech based on my current progress. Make me want to work right now.'
        break
      case 'how_to_start':
        prompt = 'I feel stuck. What is the smallest, easiest task I can do right now to build momentum?'
        break
    }

    const userData = {
      username: profile?.full_name || 'MEMBER',
      rank: profile?.rank || 'RECRUIT',
      xp: profile?.xp || 0,
      capacity_used: activeMissions.length,
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
        const days = Math.ceil((new Date(m.end_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
        return days > 0 && days <= 3
      }).map(m => ({
        title: m.title,
        progress: m.progress || 0,
        end_date: m.end_date || 'NO_DEADLINE',
        tasks_completed: m.tasks?.filter((t: any) => t.is_completed).length || 0,
        tasks_total: m.tasks?.length || 0,
        next_task: m.tasks?.find((t: any) => !t.is_completed)?.title || 'DONE'
      }))
    }

    const res = await chatWithCoach(prompt, userData, profile?.language || 'en')
    setResponse(res)
    setLastAiMessage(res)
    setIsLoading(false)
    playBlip()
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
                  COACH: {coachName} // ONLINE
                </span>
              </div>
              <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                <X className="" />
              </button>
            </div>

            {/* Response Area */}
            <div className="p-6">
              <div className="relative group">
                <div className="absolute -inset-0.5 rounded opacity-0 group-hover:opacity-100 transition duration-1000" style={{ backgroundColor: `${coachColor}22` }}></div>
                <div 
                  className="relative p-6 bg-white/40 dark:bg-[rgba(0,0,0,0.2)] border overflow-y-auto scrollbar-thin rounded-sm shadow-inner" 
                  style={{ 
                    borderColor: `${coachColor}44`,
                    backgroundColor: `${coachColor}0A`,
                    minHeight: '250px',
                    maxHeight: '40vh',
                    direction: isArabic ? 'rtl' : 'ltr',
                    textAlign: isArabic ? 'right' : 'left'
                  }}
                >
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-4 py-10">
                       <span className="text-xs font-black tracking-widest animate-pulse uppercase" style={{ color: coachColor }}>
                         {profile?.language === 'ar' ? `${coachName} بيفكر...` : `${coachName}_PROCESSING...`}
                       </span>
                       <div className="flex gap-2">
                          {[0, 1, 2].map(i => (
                            <motion.div
                              key={i}
                              animate={{ opacity: [0.2, 1, 0.2] }}
                              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: coachColor }}
                            />
                          ))}
                       </div>
                    </div>
                  ) : (
                    <p className="text-[var(--text-primary)] text-sm md:text-base font-bold leading-relaxed whitespace-pre-wrap">
                      {response}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4 scrollbar-thin">
              <span className="text-[10px] font-black tracking-[0.4em] uppercase" style={{ color: coachColor }}>SELECT_ACTION:</span>
              
              <div className="grid grid-cols-1 gap-3">
                <ActionButton 
                  icon="analytics" 
                  title="SCAN_STATUS" 
                  subtitle={profile?.language === 'ar' ? 'تحليل وضعي الحالي' : 'Complete status analysis'} 
                  onClick={() => handleAction('scan_status')}
                  disabled={isLoading}
                  color={coachColor}
                  lang={profile?.language}
                />
                <ActionButton 
                  icon="event_note" 
                  title="DAILY_PLAN" 
                  subtitle={profile?.language === 'ar' ? 'خطة النهارده' : 'What to focus on today'} 
                  onClick={() => handleAction('daily_plan')}
                  disabled={isLoading}
                  color={coachColor}
                  lang={profile?.language}
                />
                <ActionButton 
                  icon="warning" 
                  title="CRITICAL_ALERT" 
                  subtitle={profile?.language === 'ar' ? 'تنبيهات خطيرة' : 'Goals in danger'} 
                  onClick={() => handleAction('critical_alert')}
                  disabled={isLoading}
                  color={coachColor}
                  lang={profile?.language}
                />
                <ActionButton 
                  icon="target" 
                  title="BRIEF_GOAL" 
                  subtitle={profile?.language === 'ar' ? 'بريف عن أهم هدف' : 'Tactical goal breakdown'} 
                  onClick={() => handleAction('brief_mission')}
                  disabled={isLoading}
                  color={coachColor}
                  lang={profile?.language}
                />
                <ActionButton 
                  icon="local_fire_department" 
                  title="MOTIVATE_ME" 
                  subtitle={profile?.language === 'ar' ? 'شجعني واضغط عليا' : 'Give me a harsh motivational speech'} 
                  onClick={() => handleAction('motivate_me')}
                  disabled={isLoading}
                  color={coachColor}
                  lang={profile?.language}
                />
                <ActionButton 
                  icon="bolt" 
                  title="HOW_TO_START" 
                  subtitle={profile?.language === 'ar' ? 'أبدأ بإيه دلوقتي؟' : 'What is the easiest task to start with?'} 
                  onClick={() => handleAction('how_to_start')}
                  disabled={isLoading}
                  color={coachColor}
                  lang={profile?.language}
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

function ActionButton({ icon, title, subtitle, onClick, disabled, color, lang }: any) {
  const isRTL = lang === 'ar'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full p-3 px-4 bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 transition-all duration-300 group flex items-start gap-4 text-start relative overflow-hidden",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      style={{
        ':hover': {
          borderColor: `${color}66`,
          backgroundColor: `${color}11`
        }
      } as any}
      onMouseEnter={e => {
        if (!disabled) {
          e.currentTarget.style.borderColor = `${color}66`
          e.currentTarget.style.backgroundColor = `${color}11`
        }
      }}
      onMouseLeave={e => {
        if (!disabled) {
          e.currentTarget.style.borderColor = ''
          e.currentTarget.style.backgroundColor = ''
        }
      }}
    >
      <div className="absolute top-0 right-0 w-16 h-16 opacity-5 blur-2xl group-hover:opacity-20 transition-colors" style={{ backgroundColor: color }}></div>
      <span className="material-symbols-outlined text-[var(--text-secondary)] transition-colors mt-1" style={{ color: 'var(--text-secondary)' }} onMouseEnter={e => { if(!disabled) e.currentTarget.style.color = color }} onMouseLeave={e => { if(!disabled) e.currentTarget.style.color = 'var(--text-secondary)' }}>
        {icon}
      </span>
      <div className="flex flex-col flex-1">
        <span className="text-[11px] font-black tracking-widest text-[var(--text-primary)] transition-colors">
          {title}
        </span>
        <span className="text-[10px] font-bold text-[var(--text-secondary)] mt-1" dir={isRTL ? "rtl" : "ltr"}>
          {subtitle}
        </span>
      </div>
      <span className="material-symbols-outlined text-xs text-[var(--text-secondary)]/30 mt-1 transition-colors">
        {isRTL ? 'arrow_back_ios_new' : 'arrow_forward_ios'}
      </span>
    </button>
  )
}
