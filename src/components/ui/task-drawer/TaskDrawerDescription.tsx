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
      if (res.status === 429) {
        setAiError(isRTL 
          ? 'لقد استهلكت رصيد الـ AI المتاح لخطتك الحالية. يمكنك انتظار التجديد الدوري أو ترقية اشتراكك للمتابعة فوراً.'
          : 'You have reached the AI credit limit for your current plan. Please wait for the periodic reset or upgrade to continue immediately.')
        return
      }
      if (res.status === 503) {
        setAiError(isRTL
          ? 'خوادم الذكاء الاصطناعي تشهد ضغطاً مرتفعاً حالياً. يرجى إعادة المحاولة خلال دقيقة. (رصيدك لم يتأثر)'
          : 'The AI servers are experiencing temporary high demand. Please try again in a moment. (Your credits are safe)')
        return
      }
      if (res.status === 403) {
        setQuotaExhausted(true)
        setLoading(false)
        return
      }
      if (!res.ok) throw new Error('API Error')
      const data = await res.json()
      if (data.error === 'quota_exhausted') {
        setAiError(isRTL 
          ? 'لقد استهلكت رصيد الـ AI المتاح لخطتك الحالية. يمكنك انتظار التجديد الدوري أو ترقية اشتراكك للمتابعة فوراً.'
          : 'You have reached the AI credit limit for your current plan. Please wait for the periodic reset or upgrade to continue immediately.')
        return
      }
      if (data.error === 'ai_server_overloaded') {
        setAiError(isRTL
          ? 'خوادم الذكاء الاصطناعي تشهد ضغطاً مرتفعاً حالياً. يرجى إعادة المحاولة خلال دقيقة. (رصيدك لم يتأثر)'
          : 'The AI servers are experiencing temporary high demand. Please try again in a moment. (Your credits are safe)')
        return
      }
      if (data.text) {
        incrementFeatureUsage('explain_topic')
        const appended = description ? `${description}\n\n${data.text}` : data.text
        setDescription(appended)
        await updateTask(task.id, { description: appended })
        setAiQuery('')
      } else {
        throw new Error('No description returned')
      }
    } catch (err: any) {
      if (err.message === 'ai_server_overloaded') {
        setAiError(isRTL
          ? 'خوادم الذكاء الاصطناعي تشهد ضغطاً مرتفعاً حالياً. يرجى إعادة المحاولة خلال دقيقة. (رصيدك لم يتأثر)'
          : 'The AI servers are experiencing temporary high demand. Please try again in a moment. (Your credits are safe)')
      } else if (err.message === 'quota_exhausted') {
        setAiError(isRTL 
          ? 'لقد استهلكت رصيد الـ AI المتاح لخطتك الحالية. يمكنك انتظار التجديد الدوري أو ترقية اشتراكك للمتابعة فوراً.'
          : 'You have reached the AI credit limit for your current plan. Please wait for the periodic reset or upgrade to continue immediately.')
      } else {
        setAiError(isRTL ? 'خطأ أثناء توليد الشرح.' : 'Error generating explanation.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 border-t border-zinc-850 pt-4 dark:border-white/5 pb-2">
      <div className="flex justify-between items-center">
        <h3 className="text-[10px] font-medium text-zinc-500 opacity-60 flex items-center gap-2">
          <span>{isRTL ? 'وصف المهمة' : 'Task Description'}</span>
        </h3>
      </div>

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
        </div>
      )}
    </div>
  )
}
