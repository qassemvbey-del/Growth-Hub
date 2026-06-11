import React, { useState, useEffect, useRef } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'

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
  const [aiQuery, setAiQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize the description textarea dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [description])

  const askAi = async (promptText: string) => {
    if (!promptText.trim()) return
    setLoading(true)
    setAiError('')
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
      if (!res.ok) throw new Error('API Error')
      const data = await res.json()
      if (data.text) {
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
    <div className="space-y-4 border-t border-zinc-850 pt-4 dark:border-white/5">
      <div className="flex justify-between items-center">
        <h3 className="text-[10px] font-medium text-zinc-500 opacity-60">
          {isRTL ? 'وصف المهمة' : 'Task Description'}
        </h3>
        
        {/* Commented out per layout refactor rules
        {canEdit && (
          <button
            type="button"
            onClick={() => askAi(isRTL ? `اشرح موضوع المهمة بالتفصيل: ${task.title}` : `Explain task topic in detail: ${task.title}`)}
            disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-[10px] font-bold text-zinc-800 dark:text-zinc-300 transition-colors disabled:opacity-50 cursor-pointer border border-zinc-200/50 dark:border-white/5"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3 text-cyan-400" />
            )}
            {isRTL ? 'اشرح موضوع المهمة' : 'Explain Task Topic'}
          </button>
        )}
        */}
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
