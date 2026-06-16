import React, { useState, useEffect, useRef } from 'react'
import { Sparkles, Loader2, BookOpen } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getFeatureUsage, incrementFeatureUsage } from '@/lib/quota'

interface TaskDrawerDescriptionProps {
  task: any
  description: string
  setDescription: (val: string) => void
  isRTL: boolean
  updateTask: (taskId: string, updates: any) => Promise<void> | void
  canEdit?: boolean
}

export default function TaskDrawerDescription({
  task,
  description,
  setDescription,
  isRTL,
  updateTask,
  canEdit = true
}: TaskDrawerDescriptionProps) {
  const router = useRouter()
  const [aiQuery, setAiQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [quotaExhausted, setQuotaExhausted] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Quota check
  const explainTopicUsage = getFeatureUsage('explain_topic')
  const explainTopicLocked = explainTopicUsage.used >= explainTopicUsage.limit

  // Auto-resize the description textarea dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [description])

  const askAi = async (promptText: string) => {
    if (!promptText.trim()) return
    const usage = getFeatureUsage('explain_topic')
    if (usage.used >= usage.limit) {
      const remainingMs = Math.max(0, usage.nextResetMs - Date.now())
      const hrs = Math.floor(remainingMs / (3600 * 1000))
      const mins = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000))
      setAiError(isRTL 
        ? `تجاوزت الحد المسموح. يفتح مجدداً خلال ${hrs}س ${mins}د.` 
        : `Explain Topic limit exceeded. Resets in ${hrs}h ${mins}m.`)
      return
    }

    setLoading(true)
    setAiError('')
    setQuotaExhausted(false)
    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          query: promptText.trim(),
          type: 'general_ask'
        })
      })
      if (res.status === 403) {
        setQuotaExhausted(true)
        setLoading(false)
        return
      }
      if (!res.ok) throw new Error('API Error')
      const data = await res.json()
      if (data.text) {
        incrementFeatureUsage('explain_topic')
        const appended = description ? `${description}\n\n${data.text}` : data.text
        setDescription(appended)
        await updateTask(task.id, { description: appended })
        setAiQuery('')
      } else {
        throw new Error('No description returned')
      }
    } catch (err) {
      setAiError(isRTL ? 'خطأ أثناء توليد الشرح.' : 'Error generating explanation.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 border-t border-zinc-850 pt-4 dark:border-white/5 pb-2">
      <div className="flex justify-between items-center">
        <h3 className="text-[10px] font-medium text-zinc-500 opacity-60 flex items-center gap-2">
          <span>{isRTL ? 'وصف المهمة' : 'Task Description'}</span>
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                if (explainTopicLocked) {
                  router.push('/settings?focus=usage-limits')
                } else {
                  askAi(isRTL ? `اشرح موضوع المهمة بالتفصيل: ${task.title}` : `Explain task topic in detail: ${task.title}`)
                }
              }}
              disabled={loading}
              className={`inline-flex items-center gap-1.5 p-1 rounded hover:bg-zinc-200 dark:hover:bg-white/5 text-[9px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50 cursor-pointer ${explainTopicLocked ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
              title={explainTopicLocked 
                ? (isRTL ? '🔒 تم استهلاك حد شرح الموضوع. اضغط للاشتراك أو مراجعة الحدود.' : '🔒 Explain Topic quota consumed. Click to view limits.')
                : (isRTL ? 'اشرح موضوع المهمة بالذكاء الاصطناعي' : 'Explain task topic with AI')}
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookOpen className="w-3 h-3" />}
              <span>{explainTopicLocked ? '🔒 ' : ''}{isRTL ? 'شرح الموضوع' : 'Explain Topic'}</span>
            </button>
          )}
        </h3>
      </div>

      {/* Commented out temporary button:
      {canEdit && (
        <button
          type="button"
          onClick={() => askAi(isRTL ? `اشرح موضوع المهمة بالتفصيل: ${task.title}` : `Explain task topic in detail: ${task.title}`)}
          disabled={loading}
          className="inline-flex items-center gap-1 p-1 rounded hover:bg-zinc-200 dark:hover:bg-white/5 text-[9px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50 cursor-pointer"
          title={isRTL ? 'اشرح موضوع المهمة بالذكاء الاصطناعي' : 'Explain task topic with AI'}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          <span>{isRTL ? 'شرح ذكي' : 'AI Explain'}</span>
        </button>
      )}
      */}

      {!canEdit ? (
        <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed font-space min-h-[40px] select-text">
          {description || (isRTL ? 'لا يوجد وصف للمهمة.' : 'No description provided.')}
        </div>
      ) : (
        <div className="space-y-3">
          <textarea
            ref={textareaRef}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => {
              if (description !== task.description) {
                updateTask(task.id, { description })
              }
            }}
            className="w-full h-auto min-h-[100px] bg-transparent border-none p-0 font-space text-sm text-zinc-300 dark:text-zinc-300 outline-none focus:outline-none focus:ring-0 placeholder:text-white/20 resize-none overflow-hidden"
            placeholder={isRTL ? "أضف وصفاً..." : "Add a description..."}
          />

          <div className="pt-2 border-t border-zinc-200/50 dark:border-white/5">
            <div className="flex items-center gap-2 relative">
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (explainTopicLocked) {
                      router.push('/settings?focus=usage-limits')
                    } else {
                      askAi(aiQuery)
                    }
                  }
                }}
                onClick={() => {
                  if (explainTopicLocked) {
                    router.push('/settings?focus=usage-limits')
                  }
                }}
                disabled={loading}
                readOnly={explainTopicLocked}
                placeholder={loading ? (isRTL ? 'جاري الاستعلام...' : 'Inquiring AI...') : explainTopicLocked ? (isRTL ? '🔒 تم استهلاك حد الاستفسار. اضغط لمراجعة الحدود.' : '🔒 AI query quota consumed. Click to view limits.') : 'Ask AI about this step...'}
                className={`w-full bg-zinc-100/50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10 rounded-md px-3 py-1.5 text-xs text-zinc-800 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-white/20 focus:outline-none focus:border-zinc-300 dark:focus:border-white/10 transition-all font-space ${explainTopicLocked ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
              />
              {loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                </div>
              )}
            </div>
            {quotaExhausted && (
              <div className="mt-3 bg-red-950/20 dark:bg-red-950/30 border border-red-500/30 dark:border-red-500/20 rounded-xl p-4 text-center space-y-3 shadow-[0_0_15px_rgba(239,68,68,0.1)] transition-all">
                <div className="text-red-500 text-xs font-bold font-space">
                  تم استهلاك رصيد الذكاء الاصطناعي للمحاولات الحالية.
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/settings')}
                  className="w-full py-2 px-4 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-lg text-[10px] font-space font-black tracking-wider uppercase transition-all shadow-[0_0_10px_rgba(239,68,68,0.2)] hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] cursor-pointer"
                >
                  ترقية الخطة / الإعدادات
                </button>
              </div>
            )}
            {aiError && (
              <span className="text-[9px] font-space font-bold text-red-500/80 mt-1 block">
                {aiError}
              </span>
            )}
          </div>

          {/* Commented out per layout refactor rules
          <div className="pt-2 border-t border-zinc-200/50 dark:border-white/5">
            <div className="flex items-center gap-2 relative">
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    askAi(aiQuery)
                  }
                }}
                disabled={loading}
                placeholder={loading ? (isRTL ? 'جاري الاستعلام...' : 'Inquiring AI...') : (isRTL ? 'اسأل الذكاء الاصطناعي عن هذه الخطوة...' : 'Ask AI about this step...')}
                className="w-full bg-zinc-100/50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10 rounded-md px-3 py-1.5 text-xs text-zinc-800 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-white/20 focus:outline-none focus:border-zinc-300 dark:focus:border-white/10 transition-all font-space"
              />
              {loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                </div>
              )}
            </div>
            {aiError && (
              <span className="text-[9px] font-space font-bold text-red-500/80 mt-1 block">
                {aiError}
              </span>
            )}
          </div>
          */}
        </div>
      )}
    </div>
  )
}
