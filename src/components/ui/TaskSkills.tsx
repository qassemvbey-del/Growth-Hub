'use client'

import React, { useState } from 'react'
import { ListChecks, BookOpen, MessageSquare, Terminal, RefreshCw, Eye, Lock, Calculator, HelpCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import { useGrowth, getRankIndex } from '@/context/GrowthContext'

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

    // Formulate queries matching user class
    if (skillId === 'programmer_silver') {
      promptQuery = `[Fix Errors Mode] Diagnose errors in this code and provide a clean fix:\n\n${customQuery}`
      isSpecialized = true
      roleName = 'programmer'
    } else if (skillId === 'programmer_gold') {
      promptQuery = `[Code Review Mode] Provide a detailed architectural review and find bottlenecks in this code:\n\n${customQuery}`
      isSpecialized = true
      roleName = 'programmer'
    } else if (skillId === 'programmer_platinum') {
      promptQuery = `[Refactor Assistant Mode] Refactor this code to follow clean, optimized design patterns:\n\n${customQuery}`
      isSpecialized = true
      roleName = 'programmer'
    } else if (skillId === 'network_silver') {
      promptQuery = `[Fix Errors Mode] Diagnose this connection drop or network anomaly:\n\n${customQuery}`
      isSpecialized = true
      roleName = 'network_engineer'
    } else if (skillId === 'network_gold') {
      promptQuery = `[Log Analyzer Mode] Audit these Cisco syslogs or show run outputs to find config issues:\n\n${customQuery}`
      isSpecialized = true
      roleName = 'network_engineer'
    } else if (skillId === 'network_platinum') {
      promptQuery = `[Packet Troubleshooter Mode] Diagnose routing anomalies or traceroute hops:\n\n${customQuery}`
      isSpecialized = true
      roleName = 'network_engineer'
    } else if (skillId === 'accountant_silver') {
      promptQuery = `[Formula Builder Mode] Construct a precise spreadsheet formula (Excel/Sheets) based on this description:\n\n${customQuery}`
      isSpecialized = true
      roleName = 'accountant'
    } else if (skillId === 'accountant_gold') {
      promptQuery = `[Financial Analyzer Mode] Provide a high-level review of this financial balance sheet or ledger summary:\n\n${customQuery}`
      isSpecialized = true
      roleName = 'accountant'
    } else if (skillId === 'accountant_platinum') {
      promptQuery = `[Audit Assistant Mode] Check this transactional log or expense statement for security anomalies and reporting mistakes:\n\n${customQuery}`
      isSpecialized = true
      roleName = 'accountant'
    } else if (skillId === 'learner_silver') {
      promptQuery = `[Concept Simplifier Mode] Explain this technical concept using simple words, analogies, and no jargon:\n\n${customQuery}`
      isSpecialized = true
      roleName = 'learner'
    } else if (skillId === 'learner_gold') {
      promptQuery = `[Study Assistant Mode] Convert this topic into a study plan with sample flashcards and self-check questions:\n\n${customQuery}`
      isSpecialized = true
      roleName = 'learner'
    } else if (skillId === 'learner_platinum') {
      promptQuery = `[Deep Explainer Mode] Provide an exhaustive, granular breakdown of the mathematical or logical foundations of this topic:\n\n${customQuery}`
      isSpecialized = true
      roleName = 'learner'
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

  // Row 1: Core Utilities
  const coreSkills = [
    {
      id: 'checklist',
      label: isRTL ? 'منهج ذكي' : 'AI Checklist',
      icon: ListChecks,
      requiredRank: 'SILVER',
      action: handleChecklistSkill
    },
    {
      id: 'explain',
      label: isRTL ? 'شرح الموضوع' : 'Explain Topic',
      icon: BookOpen,
      requiredRank: 'SILVER',
      action: handleExplainSkill
    },
    {
      id: 'ask',
      label: isRTL ? 'اسأل المساعد' : 'Ask AI',
      icon: MessageSquare,
      requiredRank: 'SILVER',
      action: () => {
        setSkillResponse('')
        setSkillError('')
        setActivePanel(activePanel === 'ask' ? null : 'ask')
      }
    }
  ]

  // Row 2 Matrices mapping
  const matrices = {
    programmer: [
      { id: 'programmer_silver', label: isRTL ? 'تعديل الأخطاء' : 'Fix Errors', icon: Terminal, requiredRank: 'SILVER', placeholder: isRTL ? 'أدخل الكود ورسالة الخطأ لمعالجتها...' : 'Paste broken code or traceback here...', labelPrompt: isRTL ? 'أدخل الكود المطلوب تصحيحه:' : 'Enter code to debug:' },
      { id: 'programmer_gold', label: isRTL ? 'مراجعة الكود' : 'Code Review', icon: Eye, requiredRank: 'GOLD', placeholder: isRTL ? 'أدخل الكود لمراجعته معمارياً...' : 'Paste code to check design patterns & bugs...', labelPrompt: isRTL ? 'الكود للمراجعة:' : 'Enter code for review:' },
      { id: 'programmer_platinum', label: isRTL ? 'مساعد الصياغة' : 'Refactor Assistant', icon: RefreshCw, requiredRank: 'PLATINUM', placeholder: isRTL ? 'أدخل الكود لتحسين وتحديث صياغته...' : 'Paste code to refactor...', labelPrompt: isRTL ? 'الكود لإعادة الصياغة:' : 'Enter code to refactor:' }
    ],
    network_engineer: [
      { id: 'network_silver', label: isRTL ? 'تعديل الأخطاء' : 'Fix Errors', icon: Terminal, requiredRank: 'SILVER', placeholder: isRTL ? 'صف أعراض انقطاع الشبكة أو أخطاء التوجيه...' : 'Describe route drops or interface symptoms...', labelPrompt: isRTL ? 'وصف مشكلة الاتصال:' : 'Enter network connection symptoms:' },
      { id: 'network_gold', label: isRTL ? 'محلل السجلات' : 'Log Analyzer', icon: Eye, requiredRank: 'GOLD', placeholder: isRTL ? 'أدخل سجلات CLI أو show run الخاصة بـ Cisco...' : 'Paste Cisco CLI configuration/logs...', labelPrompt: isRTL ? 'سجلات CLI للتحليل:' : 'Paste Cisco CLI configs/syslogs:' },
      { id: 'network_platinum', label: isRTL ? 'مستكشف الحزم' : 'Packet Troubleshooter', icon: RefreshCw, requiredRank: 'PLATINUM', placeholder: isRTL ? 'أدخل مسارات traceroute أو حزم ping لفحصها...' : 'Paste packet tracer details or latency symptoms...', labelPrompt: isRTL ? 'بيانات تتبع الحزم:' : 'Enter packet trace details:' }
    ],
    accountant: [
      { id: 'accountant_silver', label: isRTL ? 'صانع المعادلات' : 'Formula Builder', icon: Calculator, requiredRank: 'SILVER', placeholder: isRTL ? 'صف المعادلة الحسابية المطلوبة لـ Excel...' : 'Describe the Excel spreadsheet calculation you need...', labelPrompt: isRTL ? 'وصف المعادلة:' : 'Describe spreadsheet formula goal:' },
      { id: 'accountant_gold', label: isRTL ? 'المحلل المالي' : 'Financial Analyzer', icon: Eye, requiredRank: 'GOLD', placeholder: isRTL ? 'أدخل تفاصيل الأرقام أو الميزانية العمومية للتحليل...' : 'Paste balance sheet details or account ledger summary...', labelPrompt: isRTL ? 'تفاصيل الميزانية:' : 'Enter financial data to analyze:' },
      { id: 'accountant_platinum', label: isRTL ? 'مساعد التدقيق' : 'Audit Assistant', icon: RefreshCw, requiredRank: 'PLATINUM', placeholder: isRTL ? 'أدخل كشف المعاملات أو المصاريف للتدقيق...' : 'Paste transaction logs or statements to audit...', labelPrompt: isRTL ? 'بيانات المعاملات للتدقيق:' : 'Paste transactions to audit:' }
    ],
    learner: [
      { id: 'learner_silver', label: isRTL ? 'مبسط المفاهيم' : 'Concept Simplifier', icon: HelpCircle, requiredRank: 'SILVER', placeholder: isRTL ? 'أدخل المفهوم المعقد لتبسيطه...' : 'Enter technical concept to simplify...', labelPrompt: isRTL ? 'المفهوم المراد تبسيطه:' : 'Enter concept to simplify:' },
      { id: 'learner_gold', label: isRTL ? 'مساعد الدراسة' : 'Study Assistant', icon: Eye, requiredRank: 'GOLD', placeholder: isRTL ? 'أدخل الموضوع لصياغة أسئلة وبطاقات مراجعة...' : 'Enter study topic to generate review cards...', labelPrompt: isRTL ? 'موضوع الدراسة:' : 'Enter study topic:' },
      { id: 'learner_platinum', label: isRTL ? 'الشرح العميق' : 'Deep Explainer', icon: RefreshCw, requiredRank: 'PLATINUM', placeholder: isRTL ? 'أدخل الموضوع للشرح المفصل...' : 'Enter topic for granular, foundational breakdown...', labelPrompt: isRTL ? 'موضوع الشرح العميق:' : 'Enter topic for deep explanation:' }
    ]
  }

  const championClass = profile?.champion_class || 'learner'
  const championSkills = matrices[championClass as keyof typeof matrices] || matrices['learner']

  const activeUserRankIndex = getRankIndex(profile?.rank || 'SILVER')
  const currentActiveSkill = [...coreSkills, ...championSkills].find(s => s.id === activePanel)

  return (
    <div className="bg-transparent p-0 relative overflow-hidden space-y-5">
      {/* Row 1: Core Skills */}
      <div className="space-y-2.5">
        <h4 className="text-[10px] font-mono tracking-widest text-zinc-500">
          {isRTL ? 'المهارات الأساسية' : 'Core Skills'}
        </h4>
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
                  "flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-all duration-300 border relative overflow-hidden bg-zinc-50/50 dark:bg-white/[0.01] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10 hover:bg-zinc-100/50 dark:hover:bg-white/[0.02]",
                  isCurrentLoading && "border-cyan-500/30 bg-cyan-950/5 animate-pulse cursor-wait",
                  activePanel === skill.id && "border-emerald-500/30 bg-emerald-950/5 text-emerald-600 dark:text-emerald-400"
                )}
              >
                {isCurrentLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-500 mb-1" />
                ) : (
                  <Icon className="w-4 h-4 mb-1" />
                )}
                <span className="text-[10px] font-bold tracking-tight text-center block whitespace-nowrap">
                  {skill.label}
                </span>

                {isCurrentLoading && (
                  <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-cyan-950">
                    <div className="bg-cyan-500 h-full animate-[loading-bar_1.5s_infinite]" style={{ width: '40%' }} />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Row 2: Champion Skills (RPG Lock Progression) */}
      <div className="space-y-2.5 border-t border-zinc-200/50 dark:border-white/5 pt-4">
        <h4 className="text-[10px] font-mono tracking-widest text-zinc-500">
          {isRTL ? 'مهارات البطل' : 'Champion Skills'}
        </h4>
        <div className="grid grid-cols-3 gap-3">
          {championSkills.map(skill => {
            const Icon = skill.icon
            const isCurrentLoading = loadingSkill === skill.id
            const isAnyLoading = loadingSkill !== null

            const requiredRankIdx = getRankIndex(skill.requiredRank)
            const isLocked = activeUserRankIndex < requiredRankIdx

            return (
              <div key={skill.id} className="relative group w-full">
                {/* Custom hover tooltip trigger container */}
                {isLocked && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-zinc-950/90 text-white text-[9px] font-space rounded border border-white/10 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 whitespace-nowrap shadow-xl">
                    {isRTL 
                      ? `قم بالوصول لرتبة ${skill.requiredRank} لفتح هذه المهارة.`
                      : `Unlock this skill by reaching ${skill.requiredRank} Rank.`}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (isLocked) return
                    setSkillResponse('')
                    setSkillError('')
                    setActivePanel(activePanel === skill.id ? null : skill.id)
                  }}
                  disabled={isLocked || isAnyLoading || !canEdit}
                  className={cn(
                    "w-full flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-all duration-300 border relative overflow-hidden",
                    isLocked 
                      ? "opacity-35 grayscale border-zinc-200 dark:border-white/5 bg-zinc-100/30 dark:bg-white/[0.005] text-zinc-400 dark:text-zinc-600 cursor-not-allowed" 
                      : isCurrentLoading
                        ? "border-cyan-500/30 bg-cyan-950/5 animate-pulse cursor-wait"
                        : activePanel === skill.id
                          ? "border-emerald-500/30 bg-emerald-950/5 text-emerald-600 dark:text-emerald-400"
                          : "border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10 hover:bg-zinc-100/50 dark:hover:bg-white/[0.02] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  {isCurrentLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-500 mb-1" />
                  ) : isLocked ? (
                    <Lock className="w-4 h-4 mb-1 text-zinc-400 dark:text-zinc-600" />
                  ) : (
                    <Icon className="w-4 h-4 mb-1" />
                  )}
                  <span className="text-[10px] font-bold tracking-tight text-center block whitespace-nowrap">
                    {skill.label}
                  </span>

                  {isLocked && (
                    <span className="text-[8px] mt-0.5 text-zinc-400 dark:text-zinc-500 font-mono block">
                      {skill.requiredRank}
                    </span>
                  )}

                  {isCurrentLoading && (
                    <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-cyan-950">
                      <div className="bg-cyan-500 h-full animate-[loading-bar_1.5s_infinite]" style={{ width: '40%' }} />
                    </div>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Expandable Custom Query Panel for specialized text output */}
      {activePanel && activePanel !== 'checklist' && activePanel !== 'explain' && !loadingSkill && (
        <div className="border-t border-zinc-200/50 dark:border-white/5 pt-4 mt-1 space-y-3">
          <label className="text-[9px] font-mono tracking-wider text-zinc-400 block">
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
              className="w-full bg-zinc-100/50 dark:bg-white/[0.01] border border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-800 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-white/20 focus:outline-none focus:border-zinc-300 dark:focus:border-white/10 transition-all font-mono min-h-[60px] resize-none"
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
              className="px-4 py-2 border border-zinc-300 dark:border-white/10 rounded-xl text-[10px] font-mono tracking-wider text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/80 dark:hover:bg-white/[0.02] active:scale-95 transition-all shrink-0 flex items-center justify-center min-w-[65px]"
            >
              {isRTL ? 'إرسال' : 'Cast'}
            </button>
          </div>
        </div>
      )}

      {/* Skills Output Area */}
      {skillResponse && (
        <div className="bg-zinc-100/50 dark:bg-white/[0.01] border border-zinc-200/50 dark:border-white/5 rounded-xl p-4 text-xs font-space text-zinc-750 dark:text-zinc-300 whitespace-pre-wrap max-h-[300px] overflow-y-auto scrollbar-thin select-text space-y-2 leading-relaxed shadow-inner">
          <div className="text-[9px] font-mono tracking-widest text-zinc-400 border-b border-zinc-200/50 dark:border-white/5 pb-1">
            {isRTL ? 'نتائج المهارة' : 'Skills Output'}
          </div>
          <div className="pt-1 select-text">
            {cleanText(skillResponse)}
          </div>
        </div>
      )}

      {/* Error Output */}
      {skillError && (
        <span className="text-[10px] font-mono text-red-500/80 block mt-1">
          {skillError}
        </span>
      )}
    </div>
  )
}
