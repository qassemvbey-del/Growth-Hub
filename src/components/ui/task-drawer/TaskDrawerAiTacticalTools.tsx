'use client'

import React, { useState } from 'react'
import { Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
// import { BookOpen, ListTodo } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getFeatureUsage, incrementFeatureUsage } from '@/lib/quota'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface TaskDrawerAiTacticalToolsProps {
  task: any
  role?: string | null
  isRTL: boolean
  themeColor: string
  updateTask: (taskId: string, updates: any) => Promise<void> | void
  canEdit: boolean
  goals: any[]
  goalId?: string
  resolvedDuration: number
  finalVideoUrl: string
  isGuest: boolean
}

export default function TaskDrawerAiTacticalTools({
  task,
  role,
  isRTL,
  themeColor,
  updateTask,
  canEdit,
  goals,
  goalId,
  resolvedDuration,
  finalVideoUrl,
  isGuest
}: TaskDrawerAiTacticalToolsProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [response, setResponse] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const [quotaExhausted, setQuotaExhausted] = useState(false)

  // Quota locks evaluation
  const fixErrorsUsage = getFeatureUsage('fix_errors')
  const fixErrorsLocked = fixErrorsUsage.used >= fixErrorsUsage.limit

  // Commented out unused quota checks
  // const explainTopicUsage = getFeatureUsage('explain_topic')
  // const explainTopicLocked = explainTopicUsage.used >= explainTopicUsage.limit
  // const generateChecklistUsage = getFeatureUsage('generate_checklist')
  // const generateChecklistLocked = generateChecklistUsage.used >= generateChecklistUsage.limit

  // Placeholders for Fix Errors dynamic field
  let fixErrorsPlaceholder = isRTL ? 'اسأل المساعد الذكي عن أي شيء هنا...' : 'Ask the smart assistant anything here...'
  if (role === 'programmer') {
    fixErrorsPlaceholder = isRTL
      ? 'ارمي الكود البايظ أو الـ Error اللي طلعلك في الـ Console هنا...'
      : 'Paste your broken code or console error here...'
  } else if (role === 'network') {
    fixErrorsPlaceholder = isRTL
      ? 'ارمي الـ CLI logs أو أوامر سيسكو هنا...'
      : 'Paste your Cisco CLI commands or router logs here...'
  } else if (role === 'accountant') {
    fixErrorsPlaceholder = isRTL
      ? 'ارمي القيد المحاسبي المكسور أو معادلة إكسيل البايظة هنا...'
      : 'Paste your broken journal entry or Excel formula here...'
  } else if (role === 'general_learner') {
    fixErrorsPlaceholder = isRTL
      ? 'ارمي المفهوم الصعب أو العقبة التقنية اللي واقفة معاك هنا...'
      : 'Paste the complex concept or technical block here...'
  }

  if (fixErrorsLocked) {
    fixErrorsPlaceholder = isRTL 
      ? '🔒 تم استهلاك حد مصحح الأخطاء. اضغط للاشتراك أو مراجعة الحدود.' 
      : '🔒 Fix Errors quota consumed. Click to view limits.'
  }

  const handleFixErrors = async () => {
    if (!query.trim()) return
    const usage = getFeatureUsage('fix_errors')
    if (usage.used >= usage.limit) {
      const remainingMs = Math.max(0, usage.nextResetMs - Date.now())
      const hrs = Math.floor(remainingMs / (3600 * 1000))
      const mins = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000))
      setError(isRTL 
        ? `تجاوزت الحد المسموح اليومي. يفتح مجدداً خلال ${hrs}س ${mins}د.` 
        : `Fix Errors limit exceeded. Resets in ${hrs}h ${mins}m.`)
      return
    }

    setLoading(true)
    setError('')
    setResponse('')
    setQuotaExhausted(false)
    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query.trim(),
          role: role || 'general_learner',
          type: 'tactical_tool'
        })
      })

      if (res.status === 429) {
        setError(isRTL 
          ? 'لقد استهلكت رصيد الـ AI المتاح لخطتك الحالية. يمكنك انتظار التجديد الدوري أو ترقية اشتراكك للمتابعة فوراً.'
          : 'You have reached the AI credit limit for your current plan. Please wait for the periodic reset or upgrade to continue immediately.')
        return
      }
      if (res.status === 503) {
        setError(isRTL
          ? 'خوادم الذكاء الاصطناعي تشهد ضغطاً مرتفعاً حالياً. يرجى إعادة المحاولة خلال دقيقة. (رصيدك لم يتأثر)'
          : 'The AI servers are experiencing temporary high demand. Please try again in a moment. (Your credits are safe)')
        return
      }
      if (res.status === 403) {
        setQuotaExhausted(true)
        setLoading(false)
        return
      }

      if (!res.ok) throw new Error('AI request failed')

      const data = await res.json()
      if (data.error === 'quota_exhausted') {
        setError(isRTL 
          ? 'لقد استهلكت رصيد الـ AI المتاح لخطتك الحالية. يمكنك انتظار التجديد الدوري أو ترقية اشتراكك للمتابعة فوراً.'
          : 'You have reached the AI credit limit for your current plan. Please wait for the periodic reset or upgrade to continue immediately.')
        return
      }
      if (data.error === 'ai_server_overloaded') {
        setError(isRTL
          ? 'خوادم الذكاء الاصطناعي تشهد ضغطاً مرتفعاً حالياً. يرجى إعادة المحاولة خلال دقيقة. (رصيدك لم يتأثر)'
          : 'The AI servers are experiencing temporary high demand. Please try again in a moment. (Your credits are safe)')
        return
      }

      if (data.text) {
        incrementFeatureUsage('fix_errors')
        setResponse(data.text)
        setCollapsed(false)
      } else {
        throw new Error('No diagnosis returned')
      }
    } catch (err: any) {
      if (err.message === 'ai_server_overloaded') {
        setError(isRTL
          ? 'خوادم الذكاء الاصطناعي تشهد ضغطاً مرتفعاً حالياً. يرجى إعادة المحاولة خلال دقيقة. (رصيدك لم يتأثر)'
          : 'The AI servers are experiencing temporary high demand. Please try again in a moment. (Your credits are safe)')
      } else if (err.message === 'quota_exhausted') {
        setError(isRTL 
          ? 'لقد استهلكت رصيد الـ AI المتاح لخطتك الحالية. يمكنك انتظار التجديد الدوري أو ترقية اشتراكك للمتابعة فوراً.'
          : 'You have reached the AI credit limit for your current plan. Please wait for the periodic reset or upgrade to continue immediately.')
      } else {
        setError(isRTL ? 'فشلت معالجة الاستعلام الذكي.' : 'Failed to process AI request.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Commented out unused handlers:
  /*
  const handleExplainTopic = async () => {
    const usage = getFeatureUsage('explain_topic')
    if (usage.used >= usage.limit) {
      const remainingMs = Math.max(0, usage.nextResetMs - Date.now())
      const hrs = Math.floor(remainingMs / (3600 * 1000))
      const mins = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000))
      setError(isRTL 
        ? `تجاوزت الحد المسموح. يفتح مجدداً خلال ${hrs}س ${mins}د.` 
        : `Explain Topic limit exceeded. Resets in ${hrs}h ${mins}m.`)
      return
    }

    setLoading(true)
    setError('')
    setResponse('')
    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          query: isRTL ? `اشرح موضوع المهمة بالتفصيل: ${task.title}` : `Explain task topic in detail: ${task.title}`,
          type: 'general_ask'
        })
      })
      if (!res.ok) throw new Error('API Error')
      const data = await res.json()
      if (data.text) {
        incrementFeatureUsage('explain_topic')
        const appended = task.description ? `${task.description}\n\n${data.text}` : data.text
        await updateTask(task.id, { description: appended })
        setResponse(data.text)
        setCollapsed(false)
      } else {
        throw new Error('No description returned')
      }
    } catch (err) {
      setError(isRTL ? 'خطأ أثناء توليد الشرح.' : 'Error generating explanation.')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateChecklist = async () => {
    const subtasks = task.metadata?.subtasks || []
    const hasAiChecklist = subtasks.some((s: any) => s.id?.startsWith('sub_ai_') || s.id?.startsWith('ai-'))
    if (hasAiChecklist) {
      setError(isRTL ? 'تم إنشاء المنهج الذكي بالفعل' : 'Smart Checklist already generated')
      return
    }
    if (!finalVideoUrl) {
      setError(isRTL ? 'يجب ربط فيديو أولاً لإنشاء المهام الذكية.' : 'Attach a video first to generate tasks.')
      return
    }

    const usage = getFeatureUsage('generate_checklist')
    if (usage.used >= usage.limit) {
      const remainingMs = Math.max(0, usage.nextResetMs - Date.now())
      const hrs = Math.floor(remainingMs / (3600 * 1000))
      const mins = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000))
      setError(isRTL 
        ? `تجاوزت الحد المسموح. يفتح مجدداً خلال ${hrs}س ${mins}د.` 
        : `Generate Checklist limit exceeded. Resets in ${hrs}h ${mins}m.`)
      return
    }

    setLoading(true)
    setError('')
    setResponse('')

    const currentGoal = goals.find((g: any) => g.id === goalId || g.id === task.goal_id)
    const goalTitleText = currentGoal?.title || 'Specialized Curriculum'

    try {
      const res = await fetch('/api/tasks/ai-checklist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskId: task.id,
          youtubeUrl: finalVideoUrl,
          taskTitle: task.title,
          goalTitle: goalTitleText,
          language: isRTL ? 'ar' : 'en'
        })
      })

      if (res.status === 429) {
        setError(isRTL 
          ? 'لقد استهلكت رصيد الـ AI المتاح لخطتك الحالية. يمكنك انتظار التجديد الدوري أو ترقية اشتراكك للمتابعة فوراً.'
          : 'You have reached the AI credit limit for your current plan. Please wait for the periodic reset or upgrade to continue immediately.')
        return
      }
      if (res.status === 503) {
        setError(isRTL
          ? 'خوادم الذكاء الاصطناعي تشهد ضغطاً مرتفعاً حالياً. يرجى إعادة المحاولة خلال دقيقة. (رصيدك لم يتأثر)'
          : 'The AI servers are experiencing temporary high demand. Please try again in a moment. (Your credits are safe)')
        return
      }

      const data = await res.json()
      if (data.error === 'quota_exhausted') {
        setError(isRTL 
          ? 'لقد استهلكت رصيد الـ AI المتاح لخطتك الحالية. يمكنك انتظار التجديد الدوري أو ترقية اشتراكك للمتابعة فوراً.'
          : 'You have reached the AI credit limit for your current plan. Please wait for the periodic reset or upgrade to continue immediately.')
        return
      }
      if (data.error === 'ai_server_overloaded') {
        setError(isRTL
          ? 'خوادم الذكاء الاصطناعي تشهد ضغطاً مرتفعاً حالياً. يرجى إعادة المحاولة خلال دقيقة. (رصيدك لم يتأثر)'
          : 'The AI servers are experiencing temporary high demand. Please try again in a moment. (Your credits are safe)')
        return
      }

      if (!res.ok) {
        setError(data.error || 'Failed to generate checklist')
      } else {
        incrementFeatureUsage('generate_checklist')
        const supabase = createClient()
        const { data: updatedTask } = await supabase
          .from('tasks')
          .select('metadata')
          .eq('id', task.id)
          .single()
        
        if (updatedTask) {
          await updateTask(task.id, { metadata: updatedTask.metadata })
          setResponse(isRTL ? 'تم إنشاء قائمة المهام الذكية بنجاح!' : 'Smart Checklist generated successfully!')
          setCollapsed(false)
        }
      }
    } catch (err: any) {
      if (err.message === 'ai_server_overloaded') {
        setError(isRTL
          ? 'خوادم الذكاء الاصطناعي تشهد ضغطاً مرتفعاً حالياً. يرجى إعادة المحاولة خلال دقيقة. (رصيدك لم يتأثر)'
          : 'The AI servers are experiencing temporary high demand. Please try again in a moment. (Your credits are safe)')
      } else if (err.message === 'quota_exhausted') {
        setError(isRTL 
          ? 'لقد استهلكت رصيد الـ AI المتاح لخطتك الحالية. يمكنك انتظار التجديد الدوري أو ترقية اشتراكك للمتابعة فوراً.'
          : 'You have reached the AI credit limit for your current plan. Please wait for the periodic reset or upgrade to continue immediately.')
      } else {
        setError(isRTL ? 'حدث خطأ في الاتصال بالخادم' : 'Server communication error')
      }
    } finally {
      setLoading(false)
    }
  }
  */

  const cleanText = (text: string) => text ? text.replace(/[*#`+\-~]/g, '').trim() : '';

  return (
    <div className="bg-black/20 backdrop-blur-xl border border-white/10 shadow-[0_12px_40px_0_rgba(0,0,0,0.5)] rounded-2xl p-4 transition-colors relative overflow-hidden space-y-4">
      {/* Side Color bar indicator */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: themeColor }} />

      {/* Header */}
      <div className="flex items-center justify-between pl-1">
        <h4 className="text-[10px] font-space font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          {isRTL ? 'مساعد الأخطاء الذكي' : 'Fix Errors Debugger'}
        </h4>
        {response && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* 1. Top Element: Fix Errors */}
      <div className="space-y-2">
        <label className="text-[9px] font-space font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block pl-1">
          {isRTL ? 'مصحح الأخطاء' : 'Fix Errors'}
        </label>
        <div className="flex gap-2">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
            readOnly={fixErrorsLocked}
            onClick={() => {
              if (fixErrorsLocked) {
                router.push('/settings?focus=usage-limits')
              }
            }}
            placeholder={fixErrorsPlaceholder}
            className={cn(
              "w-full bg-zinc-100/50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-800 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-white/20 focus:outline-none focus:border-zinc-300 dark:focus:border-white/10 transition-all font-space min-h-[60px] resize-none",
              fixErrorsLocked && "opacity-50 cursor-not-allowed grayscale"
            )}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (fixErrorsLocked) {
                  router.push('/settings?focus=usage-limits')
                } else {
                  handleFixErrors()
                }
              }
            }}
          />
          <button
            onClick={() => {
              if (fixErrorsLocked) {
                router.push('/settings?focus=usage-limits')
              } else {
                handleFixErrors()
              }
            }}
            disabled={loading || (!query.trim() && !fixErrorsLocked) || !canEdit}
            className={cn(
              "px-4 py-2 bg-transparent rounded-xl text-[10px] font-space font-black tracking-wider uppercase transition-all shrink-0 flex items-center justify-center min-w-[70px] cursor-pointer border hover:shadow-[0_0_12px_rgba(20,184,166,0.2)]",
              fixErrorsLocked ? "opacity-50 cursor-not-allowed grayscale border-zinc-700 text-zinc-500" : "hover:brightness-110"
            )}
            style={fixErrorsLocked ? {} : {
              color: themeColor,
              borderColor: `${themeColor}60`,
              boxShadow: query.trim() && !loading ? `0 0 10px ${themeColor}20` : 'none'
            }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : fixErrorsLocked ? '🔒 LIMIT' : (isRTL ? 'تشغيل' : 'RUN')}
          </button>
        </div>
      </div>

      {/* Commented out bottom button row:
      {canEdit && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200/50 dark:border-white/5">
          <button
            type="button"
            onClick={() => {
              if (explainTopicLocked) {
                router.push('/settings?focus=usage-limits')
              } else {
                handleExplainTopic()
              }
            }}
            disabled={loading}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-200/50 dark:bg-white/5 hover:bg-zinc-300/60 dark:hover:bg-white/10 text-[10px] font-bold text-zinc-800 dark:text-zinc-300 transition-colors cursor-pointer border border-zinc-200/50 dark:border-white/5",
              explainTopicLocked && "opacity-50 cursor-not-allowed grayscale"
            )}
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>{explainTopicLocked ? '🔒 ' : ''}{isRTL ? 'شرح الموضوع' : 'Explain Topic'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (generateChecklistLocked) {
                router.push('/settings?focus=usage-limits')
              } else {
                handleGenerateChecklist()
              }
            }}
            disabled={loading}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-200/50 dark:bg-white/5 hover:bg-zinc-300/60 dark:hover:bg-white/10 text-[10px] font-bold text-zinc-800 dark:text-zinc-300 transition-colors cursor-pointer border border-zinc-200/50 dark:border-white/5",
              generateChecklistLocked && "opacity-50 cursor-not-allowed grayscale"
            )}
          >
            <ListTodo className="w-3.5 h-3.5 text-cyan-400" />
            <span>{generateChecklistLocked ? '🔒 ' : ''}{isRTL ? 'إنشاء المهام' : 'Generate Checklist'}</span>
          </button>
        </div>
      )}
      */}

      {error && (
        <span className="text-[9px] font-space font-bold text-red-500/80 block mt-1">
          {error}
        </span>
      )}

      {quotaExhausted && (
        <div className="mt-3 bg-red-950/20 dark:bg-red-950/30 border border-red-500/30 dark:border-red-500/20 rounded-xl p-4 text-center space-y-3 shadow-[0_0_15px_rgba(239,68,68,0.1)] transition-all">
          <div className="text-red-500 text-xs font-bold font-space">
            تم استهلاك رصيد الذكاء الاصطناعي للمحاولات الحالية.
          </div>
          <button
            onClick={() => router.push('/settings')}
            className="w-full py-2 px-4 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-lg text-[10px] font-space font-black tracking-wider uppercase transition-all shadow-[0_0_10px_rgba(239,68,68,0.2)] hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] cursor-pointer"
          >
            ترقية الخطة / الإعدادات
          </button>
        </div>
      )}

      {response && !collapsed && (
        <div className="mt-3 bg-zinc-200/50 dark:bg-black/40 border border-zinc-300/50 dark:border-white/5 rounded-xl p-3 text-xs text-zinc-800 dark:text-zinc-300 font-space whitespace-pre-wrap leading-relaxed select-text transition-all max-h-[200px] overflow-y-auto scrollbar-thin">
          <div className="text-[8px] uppercase tracking-widest text-zinc-500/60 dark:text-white/20 font-bold mb-2 pb-1 border-b border-zinc-300 dark:border-white/5">
            {isRTL ? 'التحليل والحلول المقترحة' : 'AI Diagnostic Resolution'}
          </div>
          {cleanText(response)}
        </div>
      )}
    </div>
  )
}
