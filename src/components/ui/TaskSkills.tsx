'use client'

import React, { useState } from 'react'
import { ListChecks, BookOpen, MessageSquare, Terminal, RefreshCw, Eye, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import { useGrowth } from '@/context/GrowthContext'

interface TaskSkillsProps {
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

export default function TaskSkills({
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
}: TaskSkillsProps) {
  const { refreshProfile, isRTL } = useGrowth()
  const [activePanel, setActivePanel] = useState<string | null>(null)
  const [loadingSkill, setLoadingSkill] = useState<string | null>(null)
  const [customQuery, setCustomQuery] = useState('')
  const [skillResponse, setSkillResponse] = useState('')
  const [skillError, setSkillError] = useState('')

  // Clean raw AI response markdown characters
  const cleanText = (text: string) => text ? text.replace(/[*#`+\-~]/g, '').trim() : ''

  // 1. Skill: AI Checklist
  const handleChecklistSkill = async () => {
    if (loadingSkill || !canEdit) return
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
          setSkillResponse(isRTL ? 'تم إنشاء قائمة المهام الذكية بنجاح!' : 'Smart Checklist generated successfully!')
        }
      }
    } catch (err) {
      setSkillError(isRTL ? 'حدث خطأ في الاتصال بالخادم' : 'Server communication error')
    } finally {
      setLoadingSkill(null)
    }
  }

  // 2. Skill: Explain Topic
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

  // 3. Custom Query Submission (Ask AI & Specializations)
  const handleCustomQuery = async (skillId: string) => {
    if (loadingSkill || !customQuery.trim() || !canEdit) return
    setLoadingSkill(skillId)
    setSkillError('')
    setSkillResponse('')

    let promptQuery = customQuery.trim()
    let isSpecialized = false
    let roleName = 'programmer'

    // Formulate prompts depending on the selected skill
    if (skillId === 'debugger') {
      promptQuery = `[Code Debugger Mode] Please find syntax, runtime, or logical errors in the following code, explain the bug, and provide a fixed version:\n\n${customQuery}`
      isSpecialized = true
      roleName = 'programmer'
    } else if (skillId === 'refactor') {
      promptQuery = `[Refactor Assistant Mode] Suggest clean code improvements, modern syntax updates, and performance optimizations for this code:\n\n${customQuery}`
      isSpecialized = true
      roleName = 'programmer'
    } else if (skillId === 'architecture') {
      promptQuery = `[Architecture Review Mode] Analyze the system components, scaling properties, and design patterns for the following architecture overview:\n\n${customQuery}`
      isSpecialized = true
      roleName = 'programmer'
    } else if (skillId === 'net_debugger') {
      promptQuery = `[Fix Errors Debugger Mode] Diagnose this network routing, firewall, or device connection issue:\n\n${customQuery}`
      isSpecialized = true
      roleName = 'network_engineer'
    } else if (skillId === 'cisco_analyzer') {
      promptQuery = `[Cisco Log Analyzer Mode] Parse and review these Cisco CLI command outputs/syslogs to find anomalies or configuration issues:\n\n${customQuery}`
      isSpecialized = true
      roleName = 'network_engineer'
    } else if (skillId === 'packet_troubleshooter') {
      promptQuery = `[Packet Troubleshooter Mode] Investigate these packet tracer details, latency symptoms, or packet capture details:\n\n${customQuery}`
      isSpecialized = true
      roleName = 'network_engineer'
    }

    try {
      const payload = isSpecialized
        ? {
            query: promptQuery,
            role: roleName,
            type: 'tactical_tool'
          }
        : {
            query: promptQuery,
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

  // Row 1: Core Utilities configuration
  const coreSkills = [
    {
      id: 'checklist',
      label: isRTL ? 'منهج ذكي' : 'AI Checklist',
      icon: ListChecks,
      action: handleChecklistSkill
    },
    {
      id: 'explain',
      label: isRTL ? 'شرح الموضوع' : 'Explain Topic',
      icon: BookOpen,
      action: handleExplainSkill
    },
    {
      id: 'ask',
      label: isRTL ? 'اسأل المساعد' : 'Ask AI',
      icon: MessageSquare,
      action: () => {
        setSkillResponse('')
        setSkillError('')
        setActivePanel(activePanel === 'ask' ? null : 'ask')
      }
    }
  ]

  // Row 2: Specialization Skills configuration
  const programmerSkills = [
    {
      id: 'debugger',
      label: isRTL ? 'مصحح الأخطاء' : 'Code Debugger',
      icon: Terminal,
      placeholder: isRTL ? 'ألصق الكود البرمجي المكسور أو رسائل الخطأ هنا...' : 'Paste console traceback or broken code here...',
      labelPrompt: isRTL ? 'الكود البرمجي المراد تصحيحه:' : 'Enter code to debug:'
    },
    {
      id: 'refactor',
      label: isRTL ? 'مساعد إعادة الصياغة' : 'Refactor Assistant',
      icon: RefreshCw,
      placeholder: isRTL ? 'ألصق الكود البرمجي الذي تريد تحسين صياغته هنا...' : 'Paste code you wish to refactor here...',
      labelPrompt: isRTL ? 'الكود البرمجي المطلوب تحسينه:' : 'Enter code to refactor:'
    },
    {
      id: 'architecture',
      label: isRTL ? 'مراجعة المعمارية' : 'Architecture Review',
      icon: Eye,
      placeholder: isRTL ? 'صف معمارية نظامك أو المكونات المطلوبة للمراجعة...' : 'Describe system components or patterns for architecture review...',
      labelPrompt: isRTL ? 'تفاصيل المعمارية المقترحة:' : 'Enter system architecture details:'
    }
  ]

  const networkSkills = [
    {
      id: 'net_debugger',
      label: isRTL ? 'مصحح أخطاء الشبكة' : 'Fix Errors Debugger',
      icon: Terminal,
      placeholder: isRTL ? 'صف مشكلة الاتصال أو رسالة الخطأ هنا...' : 'Describe connection drops, interface errors or routing issue here...',
      labelPrompt: isRTL ? 'وصف مشكلة الاتصال:' : 'Enter network connection symptoms:'
    },
    {
      id: 'cisco_analyzer',
      label: isRTL ? 'محلل سجلات سيسكو' : 'Cisco Log Analyzer',
      icon: RefreshCw,
      placeholder: isRTL ? 'ألصق مخرجات show run أو سجلات سيسكو CLI...' : 'Paste show run outputs or Cisco CLI logs here...',
      labelPrompt: isRTL ? 'سجلات وأوامر CLI للتحليل:' : 'Paste Cisco CLI configuration/logs:'
    },
    {
      id: 'packet_troubleshooter',
      label: isRTL ? 'مستكشف الحزم' : 'Packet Troubleshooter',
      icon: Eye,
      placeholder: isRTL ? 'ألصق تفاصيل تتبع الحزم (Packet Tracer) أو اختبار ping/traceroute...' : 'Paste traceroute hops, ping packets or wireshark symptoms here...',
      labelPrompt: isRTL ? 'بيانات تتبع الحزم أو المسار:' : 'Enter packet trace details:'
    }
  ]

  const isProgrammer = profile?.champion_class === 'programmer'
  const isNetworkEngineer = profile?.champion_class === 'network_engineer'
  const specializationSkills = isProgrammer ? programmerSkills : (isNetworkEngineer ? networkSkills : [])

  const currentActiveSkill = [...coreSkills, ...specializationSkills].find(s => s.id === activePanel)

  return (
    <div className="bg-zinc-950/40 border border-white/5 shadow-2xl rounded-2xl p-5 relative overflow-hidden space-y-4">
      {/* Decorative top gradient lines */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="flex items-center justify-between mb-1 pl-1">
        <h4 className="text-[10px] font-mono tracking-widest uppercase text-white/50">
          {isRTL ? 'مهام المساعد الذكي' : 'Task Skills'}
        </h4>
        <span className="text-[9px] font-mono text-white/30">
          Class: {profile?.champion_class === 'network_engineer' ? 'Network Engineer' : 'Programmer'}
        </span>
      </div>

      {/* Row 1: Core Utilities (Fixed 3-Column horizontal grid) */}
      <div className="grid grid-cols-3 gap-3">
        {coreSkills.map(skill => {
          const Icon = skill.icon
          const isCurrentLoading = loadingSkill === skill.id
          const isAnyLoading = loadingSkill !== null

          return (
            <button
              key={skill.id}
              type="button"
              onClick={skill.action}
              disabled={isAnyLoading || !canEdit}
              className={cn(
                "flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-all duration-300 border relative overflow-hidden bg-white/[0.02] text-zinc-400 hover:text-white border-white/5 hover:border-white/10 hover:bg-white/[0.04] opacity-100",
                isCurrentLoading && "border-cyan-500/50 bg-cyan-950/10 animate-pulse cursor-wait",
                activePanel === skill.id && "border-emerald-500/50 bg-emerald-950/10 text-white"
              )}
            >
              {isCurrentLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-cyan-400 mb-1.5" />
              ) : (
                <Icon className="w-5 h-5 mb-1.5 transition-transform duration-300 group-hover:scale-110" />
              )}
              <span className="text-[10px] font-bold tracking-tight text-center block whitespace-nowrap">
                {skill.label}
              </span>

              {isCurrentLoading && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-950">
                  <div className="bg-cyan-400 h-full animate-[loading-bar_1.5s_infinite]" style={{ width: '40%' }} />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Row 2: Specialization Skills (Conditional horizontal grid) */}
      {specializationSkills.length > 0 && (
        <div className="grid grid-cols-3 gap-3 border-t border-white/5 pt-3">
          {specializationSkills.map(skill => {
            const Icon = skill.icon
            const isCurrentLoading = loadingSkill === skill.id
            const isAnyLoading = loadingSkill !== null

            return (
              <button
                key={skill.id}
                type="button"
                onClick={() => {
                  setSkillResponse('')
                  setSkillError('')
                  setActivePanel(activePanel === skill.id ? null : skill.id)
                }}
                disabled={isAnyLoading || !canEdit}
                className={cn(
                  "flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-all duration-300 border relative overflow-hidden bg-white/[0.02] text-zinc-400 hover:text-white border-white/5 hover:border-white/10 hover:bg-white/[0.04] opacity-100",
                  isCurrentLoading && "border-cyan-500/50 bg-cyan-950/10 animate-pulse cursor-wait",
                  activePanel === skill.id && "border-emerald-500/50 bg-emerald-950/10 text-white"
                )}
              >
                {isCurrentLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-400 mb-1.5" />
                ) : (
                  <Icon className="w-5 h-5 mb-1.5 transition-transform duration-300 group-hover:scale-110" />
                )}
                <span className="text-[10px] font-bold tracking-tight text-center block whitespace-nowrap">
                  {skill.label}
                </span>

                {isCurrentLoading && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-950">
                    <div className="bg-cyan-400 h-full animate-[loading-bar_1.5s_infinite]" style={{ width: '40%' }} />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Skill Response Area */}
      {skillResponse && (
        <div className="bg-zinc-950/50 border border-white/5 rounded-xl p-3 text-[11px] font-mono text-emerald-400 whitespace-pre-wrap max-h-[220px] overflow-y-auto scrollbar-thin select-text">
          <div className="text-[8px] uppercase tracking-widest text-zinc-500 mb-2 border-b border-white/5 pb-1">
            {isRTL ? 'نتائج المهارة' : 'Skills Output'}
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

      {/* Embedded Terminal Custom Input Panel */}
      {activePanel && activePanel !== 'checklist' && activePanel !== 'explain' && !loadingSkill && (
        <div className="border-t border-white/5 pt-3 mt-1 space-y-2">
          <label className="text-[9px] font-mono tracking-wider text-zinc-500 block uppercase">
            {activePanel === 'ask' 
              ? (isRTL ? 'اكتب استفسارك عن المهمة هنا:' : 'Enter query on the system core:') 
              : (currentActiveSkill as any)?.labelPrompt || 'Enter input:'}
          </label>
          <div className="flex gap-2">
            <textarea
              value={customQuery}
              onChange={e => setCustomQuery(e.target.value)}
              placeholder={activePanel === 'ask' 
                ? (isRTL ? 'مثال: كيف أنجز هذه الخطوة بأمان؟' : 'e.g., How can I do this step safely?') 
                : (currentActiveSkill as any)?.placeholder || 'Type here...'}
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
              {isRTL ? 'إرسال' : 'Cast'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
