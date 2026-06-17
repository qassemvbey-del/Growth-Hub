'use client'

import React, { useState, useEffect } from 'react'
import { ListChecks, BookOpen, MessageSquare, Terminal, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import { useGrowth } from '@/context/GrowthContext'

interface ChampionSkillsBarProps {
  task: any
  profile: any
  onUpdateTask: (taskId: string, updates: any) => Promise<void> | void
  canEdit: boolean
  goals: any[]
  goalId?: string
  resolvedDuration?: number
  finalVideoUrl?: string
  isGuest?: boolean
  themeColor?: string
}

const RANKS = ['RECRUIT', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'CROWN', 'ACE', 'CONQUEROR']

export default function ChampionSkillsBar({
  task,
  profile,
  onUpdateTask,
  canEdit,
  goals,
  goalId,
  resolvedDuration = 0,
  finalVideoUrl = '',
  isGuest = false,
  themeColor = '#ff6a00'
}: ChampionSkillsBarProps) {
  const { refreshProfile, isRTL } = useGrowth()

  // Skill active sub-panels
  const [activePanel, setActivePanel] = useState<'ask' | 'specialized' | null>(null)

  // Skill loading states
  const [loadingSkill, setLoadingSkill] = useState<'checklist' | 'explain' | 'ask' | 'specialized' | null>(null)
  
  // Custom query state for Ask AI & Debugger
  const [customQuery, setCustomQuery] = useState('')
  const [skillResponse, setSkillResponse] = useState('')
  const [skillError, setSkillError] = useState('')

  // Checklist specific cooldown
  const [cooldownRemaining, setCooldownRemaining] = useState(0)

  // Cooldown tracker on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const storedCooldown = localStorage.getItem(`ai_cooldown_${task.id}`)
    if (storedCooldown) {
      const remaining = Math.max(0, Math.ceil((parseInt(storedCooldown, 10) - Date.now()) / 1000))
      if (remaining > 0) {
        setCooldownRemaining(remaining)
      }
    }
  }, [task.id])

  // Cooldown decrement loop
  useEffect(() => {
    if (cooldownRemaining <= 0) return
    const interval = setInterval(() => {
      setCooldownRemaining(prev => {
        const next = prev - 1
        if (next <= 0) {
          clearInterval(interval)
          return 0
        }
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [cooldownRemaining])

  const formatCooldownTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // Helper to verify rank permissions
  const getRankIndex = (rankName: string) => {
    const idx = RANKS.indexOf(rankName?.toUpperCase())
    return idx === -1 ? 0 : idx
  }

  const userRankIndex = getRankIndex(profile?.rank || 'RECRUIT')

  // Define skills configuration
  const skills = [
    {
      id: 'checklist' as const,
      label: isRTL ? 'منهج ذكي' : 'AI Checklist',
      desc: isRTL ? 'استخراج المهام من الفيديو' : 'Generate structured tasks',
      icon: ListChecks,
      requiredRank: 'RECRUIT',
      locked: false
    },
    {
      id: 'explain' as const,
      label: isRTL ? 'شرح الموضوع' : 'Explain Topic',
      desc: isRTL ? 'تفصيل موضوع المهمة' : 'Detailed topic breakdown',
      icon: BookOpen,
      requiredRank: 'GOLD',
      locked: userRankIndex < getRankIndex('GOLD')
    },
    {
      id: 'ask' as const,
      label: isRTL ? 'اسأل المساعد' : 'Ask AI',
      desc: isRTL ? 'استفسار مخصص عن المهمة' : 'Custom contextual query',
      icon: MessageSquare,
      requiredRank: 'PLATINUM',
      locked: userRankIndex < getRankIndex('PLATINUM')
    },
    {
      id: 'specialized' as const,
      label: profile?.champion_class === 'network_engineer' 
        ? (isRTL ? 'محلل الشبكة' : 'Net Analyzer') 
        : (isRTL ? 'مصحح الأخطاء' : 'Code Debugger'),
      desc: profile?.champion_class === 'network_engineer'
        ? (isRTL ? 'تحليل أوامر CLI' : 'Cisco CLI & log audit')
        : (isRTL ? 'كشف أخطاء الكود' : 'Analyze code console errors'),
      icon: Terminal,
      requiredRank: 'RECRUIT',
      locked: userRankIndex < getRankIndex('RECRUIT')
    }
  ]

  // Clean raw AI response markdown characters
  const cleanText = (text: string) => text ? text.replace(/[*#`+\-~]/g, '').trim() : ''

  // 1. Skill 1: Checklist Generation
  const handleChecklistSkill = async () => {
    if (loadingSkill || cooldownRemaining > 0 || !canEdit) return
    const subtasks = task.metadata?.subtasks || []
    const hasAiChecklist = subtasks.some((s: any) => s.id?.startsWith('sub_ai_') || s.id?.startsWith('ai-'))
    if (hasAiChecklist && !confirm(isRTL ? 'هل تريد إعادة توليد المهام الذكية؟' : 'Re-generate smart checklist?')) {
      return
    }

    setLoadingSkill('checklist')
    setSkillError('')
    setSkillResponse('')

    const currentGoal = goals.find((g: any) => g.id === goalId || g.id === task.goal_id)
    const goalTitleText = currentGoal?.title || 'Specialized Curriculum'

    try {
      const res = await fetch('/api/tasks/ai-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          youtubeUrl: finalVideoUrl || task.video_url || '',
          taskTitle: task.title,
          goalTitle: goalTitleText,
          language: isRTL ? 'ar' : 'en'
        })
      })

      if (res.status === 429) {
        setSkillError(isRTL 
          ? 'لقد استهلكت رصيد الـ AI المتاح لخطتك الحالية. يمكنك انتظار التجديد الدوري أو ترقية اشتراكك للمتابعة فوراً.'
          : 'You have reached the AI credit limit for your current plan. Please wait for the periodic reset or upgrade to continue immediately.')
        return
      }
      if (res.status === 503) {
        setSkillError(isRTL
          ? 'خوادم الذكاء الاصطناعي تشهد ضغطاً مرتفعاً حالياً. يرجى إعادة المحاولة خلال دقيقة. (رصيدك لم يتأثر)'
          : 'The AI servers are experiencing temporary high demand. Please try again in a moment. (Your credits are safe)')
        return
      }

      const data = await res.json()
      if (data.error === 'quota_exhausted') {
        setSkillError(isRTL 
          ? 'لقد استهلكت رصيد الـ AI المتاح لخطتك الحالية. يمكنك انتظار التجديد الدوري أو ترقية اشتراكك للمتابعة فوراً.'
          : 'You have reached the AI credit limit for your current plan. Please wait for the periodic reset or upgrade to continue immediately.')
        return
      }
      if (data.error === 'ai_server_overloaded') {
        setSkillError(isRTL
          ? 'خوادم الذكاء الاصطناعي تشهد ضغطاً مرتفعاً حالياً. يرجى إعادة المحاولة خلال دقيقة. (رصيدك لم يتأثر)'
          : 'The AI servers are experiencing temporary high demand. Please try again in a moment. (Your credits are safe)')
        return
      }

      if (!res.ok) {
        setSkillError(data.error || 'Failed to generate checklist')
      } else {
        const supabase = createClient()
        const { data: updatedTask } = await supabase
          .from('tasks')
          .select('metadata')
          .eq('id', task.id)
          .single()
        
        if (updatedTask) {
          await onUpdateTask(task.id, { metadata: updatedTask.metadata })
          try {
            await refreshProfile()
          } catch (profileErr) {}
          const seconds = 15 * 60
          setCooldownRemaining(seconds)
          if (typeof window !== 'undefined') {
            localStorage.setItem(`ai_cooldown_${task.id}`, String(Date.now() + seconds * 1000))
          }
          setSkillResponse(isRTL ? 'تم إنشاء قائمة المهام الذكية بنجاح!' : 'Smart Checklist generated successfully!')
        }
      }
    } catch (err) {
      setSkillError(isRTL ? 'حدث خطأ في الاتصال بالخادم' : 'Server communication error')
    } finally {
      setLoadingSkill(null)
    }
  }

  // 2. Skill 2: Explain Topic
  const handleExplainSkill = async () => {
    if (loadingSkill || !canEdit) return
    setLoadingSkill('explain')
    setSkillError('')
    setSkillResponse('')

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: isRTL ? `اشرح موضوع المهمة بالتفصيل: ${task.title}` : `Explain task topic in detail: ${task.title}`,
          type: 'general_ask'
        })
      })

      if (res.status === 429) {
        setSkillError(isRTL 
          ? 'لقد استهلكت رصيد الـ AI المتاح لخطتك الحالية. يمكنك انتظار التجديد الدوري أو ترقية اشتراكك للمتابعة فوراً.'
          : 'You have reached the AI credit limit for your current plan. Please wait for the periodic reset or upgrade to continue immediately.')
        return
      }
      if (res.status === 503) {
        setSkillError(isRTL
          ? 'خوادم الذكاء الاصطناعي تشهد ضغطاً مرتفعاً حالياً. يرجى إعادة المحاولة خلال دقيقة. (رصيدك لم يتأثر)'
          : 'The AI servers are experiencing temporary high demand. Please try again in a moment. (Your credits are safe)')
        return
      }

      const data = await res.json()
      if (data.error === 'quota_exhausted') {
        setSkillError(isRTL 
          ? 'لقد استهلكت رصيد الـ AI المتاح لخطتك الحالية. يمكنك انتظار التجديد الدوري أو ترقية اشتراكك للمتابعة فوراً.'
          : 'You have reached the AI credit limit for your current plan. Please wait for the periodic reset or upgrade to continue immediately.')
        return
      }
      if (data.error === 'ai_server_overloaded') {
        setSkillError(isRTL
          ? 'خوادم الذكاء الاصطناعي تشهد ضغطاً مرتفعاً حالياً. يرجى إعادة المحاولة خلال دقيقة. (رصيدك لم يتأثر)'
          : 'The AI servers are experiencing temporary high demand. Please try again in a moment. (Your credits are safe)')
        return
      }

      if (!res.ok) throw new Error('API Error')

      if (data.text) {
        const appended = task.description ? `${task.description}\n\n${data.text}` : data.text
        await onUpdateTask(task.id, { description: appended })
        setSkillResponse(data.text)
        try {
          await refreshProfile()
        } catch (profileErr) {}
      } else {
        throw new Error('No explanation returned')
      }
    } catch (err) {
      setSkillError(isRTL ? 'خطأ أثناء توليد الشرح.' : 'Error generating explanation.')
    } finally {
      setLoadingSkill(null)
    }
  }

  // 3. Skill 3 & 4 Submissions (Ask AI & Debugger)
  const handleCustomQuery = async (skillType: 'ask' | 'specialized') => {
    if (loadingSkill || !customQuery.trim() || !canEdit) return
    setLoadingSkill(skillType)
    setSkillError('')
    setSkillResponse('')

    try {
      const isSpecialized = skillType === 'specialized'
      const payload = isSpecialized
        ? {
            query: customQuery.trim(),
            role: profile?.champion_class || 'programmer',
            type: 'tactical_tool'
          }
        : {
            query: customQuery.trim(),
            type: 'general_ask'
          }

      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.status === 429) {
        setSkillError(isRTL 
          ? 'لقد استهلكت رصيد الـ AI المتاح لخطتك الحالية. يمكنك انتظار التجديد الدوري أو ترقية اشتراكك للمتابعة فوراً.'
          : 'You have reached the AI credit limit for your current plan. Please wait for the periodic reset or upgrade to continue immediately.')
        return
      }
      if (res.status === 503) {
        setSkillError(isRTL
          ? 'خوادم الذكاء الاصطناعي تشهد ضغطاً مرتفعاً حالياً. يرجى إعادة المحاولة خلال دقيقة. (رصيدك لم يتأثر)'
          : 'The AI servers are experiencing temporary high demand. Please try again in a moment. (Your credits are safe)')
        return
      }

      const data = await res.json()
      if (data.error === 'quota_exhausted') {
        setSkillError(isRTL 
          ? 'لقد استهلكت رصيد الـ AI المتاح لخطتك الحالية. يمكنك انتظار التجديد الدوري أو ترقية اشتراكك للمتابعة فوراً.'
          : 'You have reached the AI credit limit for your current plan. Please wait for the periodic reset or upgrade to continue immediately.')
        return
      }
      if (data.error === 'ai_server_overloaded') {
        setSkillError(isRTL
          ? 'خوادم الذكاء الاصطناعي تشهد ضغطاً مرتفعاً حالياً. يرجى إعادة المحاولة خلال دقيقة. (رصيدك لم يتأثر)'
          : 'The AI servers are experiencing temporary high demand. Please try again in a moment. (Your credits are safe)')
        return
      }

      if (!res.ok) throw new Error('API Error')

      if (data.text) {
        setSkillResponse(data.text)
        setCustomQuery('')
        try {
          await refreshProfile()
        } catch (profileErr) {}
      } else {
        throw new Error('No response returned')
      }
    } catch (err) {
      setSkillError(isRTL ? 'فشل إرسال الاستفسار.' : 'Failed to process AI query.')
    } finally {
      setLoadingSkill(null)
    }
  }

  return (
    <div className="bg-zinc-950/40 border border-white/5 shadow-2xl rounded-2xl p-5 relative overflow-hidden space-y-4">
      {/* Decorative top grid lines */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="flex items-center justify-between mb-1 pl-1">
        <h4 className="text-[10px] font-mono tracking-widest uppercase text-white/50">
          {isRTL ? 'لوحة تحكم البطل' : 'Champion Tactical Hub'}
        </h4>
        <span className="text-[9px] font-mono text-white/30">
          CLASS: {(profile?.champion_class || 'programmer').toUpperCase()}
        </span>
      </div>

      {/* Skills 4-Column Grid */}
      <div className="grid grid-cols-4 gap-3">
        {skills.map(skill => {
          const Icon = skill.icon
          const isCurrentLoading = loadingSkill === skill.id
          const isAnyLoading = loadingSkill !== null
          const isChecklistCooldown = skill.id === 'checklist' && cooldownRemaining > 0
          
          let btnAction = () => {}
          if (!skill.locked && !isAnyLoading) {
            if (skill.id === 'checklist') btnAction = handleChecklistSkill
            else if (skill.id === 'explain') btnAction = handleExplainSkill
            else {
              btnAction = () => {
                setSkillResponse('')
                setSkillError('')
                setActivePanel(activePanel === skill.id ? null : skill.id)
              }
            }
          }

          return (
            <div key={skill.id} className="relative group">
              <button
                type="button"
                onClick={btnAction}
                disabled={skill.locked || isAnyLoading || isChecklistCooldown || !canEdit}
                className={cn(
                  "w-full flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-all duration-300 border relative overflow-hidden bg-white/[0.02]",
                  skill.locked 
                    ? "opacity-30 grayscale pointer-events-none cursor-not-allowed border-white/5" 
                    : isCurrentLoading
                      ? "border-cyan-500/50 bg-cyan-950/10 animate-pulse cursor-wait"
                      : activePanel === skill.id
                        ? "border-emerald-500/50 bg-emerald-950/10 text-white"
                        : "border-white/5 hover:border-white/10 hover:bg-white/[0.04] text-zinc-400 hover:text-white"
                )}
                style={(!skill.locked && !isAnyLoading && activePanel !== skill.id) ? {
                  boxShadow: `inset 0 0 12px rgba(255,255,255,0.01)`
                } : {}}
              >
                {isCurrentLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-400 mb-1.5" />
                ) : (
                  <Icon className={cn("w-5 h-5 mb-1.5 transition-transform duration-300", !skill.locked && "group-hover:scale-110")} style={!skill.locked && skill.id === 'checklist' && isChecklistCooldown ? { color: '#ef4444' } : {}} />
                )}
                <span className="text-[10px] font-bold tracking-tight text-center block whitespace-nowrap">
                  {skill.id === 'checklist' && isChecklistCooldown 
                    ? formatCooldownTime(cooldownRemaining)
                    : skill.label}
                </span>

                {/* Casting Progress line under active skill block */}
                {isCurrentLoading && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-950">
                    <div className="bg-cyan-400 h-full animate-[loading-bar_1.5s_infinite]" style={{ width: '40%' }} />
                  </div>
                )}
              </button>

              {/* Hover Rank Lock Tooltip */}
              {skill.locked && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-950 text-white text-[9px] font-mono rounded border border-white/5 whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                  {isRTL ? `يتطلب رتبة: ${skill.requiredRank}` : `Requires ${skill.requiredRank} Rank`}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Skill Response Area */}
      {skillResponse && (
        <div className="bg-zinc-950/50 border border-white/5 rounded-xl p-3 text-[11px] font-mono text-emerald-400 whitespace-pre-wrap max-h-[160px] overflow-y-auto scrollbar-thin select-text">
          <div className="text-[8px] uppercase tracking-widest text-zinc-500 mb-2 border-b border-white/5 pb-1">
            {isRTL ? 'النتيجة الفنية' : 'Tactical Output'}
          </div>
          {cleanText(skillResponse)}
        </div>
      )}

      {/* Skill Error Display */}
      {skillError && (
        <span className="text-[10px] font-mono text-red-500/80 block mt-1">
          {skillError}
        </span>
      )}

      {/* Skill Sub-panels for inputs */}
      {activePanel && !loadingSkill && (
        <div className="border-t border-white/5 pt-3 mt-1 space-y-2">
          <label className="text-[9px] font-mono tracking-wider text-zinc-500 block">
            {activePanel === 'ask' 
              ? (isRTL ? 'اكتب استفسارك عن المهمة هنا:' : 'ENTER QUERY ON THE SYSTEM CORE:') 
              : profile?.champion_class === 'network_engineer'
                ? (isRTL ? 'ألصق سجلات سيسكو CLI هنا:' : 'PASTE CISCO CLI COMMAND DETAILS:')
                : (isRTL ? 'ألصق كود الخطأ البرمجي هنا:' : 'PASTE BROKEN SYSTEM CODE:')}
          </label>
          <div className="flex gap-2">
            <textarea
              value={customQuery}
              onChange={e => setCustomQuery(e.target.value)}
              placeholder={activePanel === 'ask' 
                ? (isRTL ? 'مثال: كيف أنجز هذه الخطوة بأمان؟' : 'e.g., How can I do this step safely?') 
                : profile?.champion_class === 'network_engineer'
                  ? (isRTL ? 'ألصق مخرجات show run أو السجلات...' : 'Paste show run outputs or network CLI logs...')
                  : (isRTL ? 'ألصق الكود البرمجي المكسور أو رسائل الخطأ...' : 'Paste console traceback or broken logic...')}
              className="w-full bg-black/40 border border-white/5 hover:border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-white/10 transition-all font-mono min-h-[50px] resize-none"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleCustomQuery(activePanel)
                }
              }}
            />
            <button
              onClick={() => handleCustomQuery(activePanel)}
              disabled={!customQuery.trim()}
              className="px-4 py-2 border border-white/10 rounded-xl text-[10px] font-mono tracking-wider text-white hover:bg-white/[0.02] active:scale-95 transition-all shrink-0 flex items-center justify-center min-w-[65px]"
            >
              {isRTL ? 'إرسال' : 'CAST'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
