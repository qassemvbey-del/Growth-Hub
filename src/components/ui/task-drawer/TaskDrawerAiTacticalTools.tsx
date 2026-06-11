'use client'

import React, { useState } from 'react'
import { Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskDrawerAiTacticalToolsProps {
  role?: string | null
  isRTL: boolean
  themeColor: string
}

export default function TaskDrawerAiTacticalTools({
  role,
  isRTL,
  themeColor
}: TaskDrawerAiTacticalToolsProps) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [response, setResponse] = useState('')
  const [collapsed, setCollapsed] = useState(false)

  // Configuration mapping based on user role
  let title = isRTL ? '🧠 أدوات الذكاء الاصطناعي التكتيكية' : '🧠 AI Tactical Tools'
  let placeholder = isRTL ? 'اسأل المساعد الذكي عن أي شيء هنا...' : 'Ask the smart assistant anything here...'

  if (role === 'programmer') {
    title = isRTL ? '⚡ مصحح الأكواد بالذكاء الاصطناعي' : '⚡ AI Code Debugger'
    placeholder = isRTL
      ? 'ارمي الكود البايظ أو الـ Error اللي طلعلك في الـ Console هنا...'
      : 'Paste your broken code or console error here...'
  } else if (role === 'network_engineer') {
    title = isRTL ? '🌐 مصلح الشبكات بالذكاء الاصطناعي' : '🌐 AI CLI Fixer'
    placeholder = isRTL
      ? 'ارمي الـ Cisco CLI commands أو الـ Router error logs هنا...'
      : 'Paste your Cisco CLI commands or router logs here...'
  } else if (role === 'accountant') {
    title = isRTL ? '📊 مراجع القيود الحسابية' : '📊 AI Balance Sheet Auditor'
    placeholder = isRTL
      ? 'ارمي القيد المحاسبي المكسور أو معادلة إكسيل البايظة هنا...'
      : 'Paste your broken journal entry or Excel formula here...'
  } else if (role === 'general_learner') {
    title = isRTL ? '🧠 تبسيط المفاهيم الصعبة' : '🧠 AI Concept Breaker'
    placeholder = isRTL
      ? 'ارمي المفهوم الصعب أو العقبة التقنية اللي واقفة معاك هنا...'
      : 'Paste the complex concept or technical block here...'
  }

  const handleExecute = async () => {
    if (!query.trim()) return
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
          query: query.trim(),
          role: role || 'general_learner'
        })
      })

      if (!res.ok) {
        throw new Error('AI execution failed')
      }

      const data = await res.json()
      if (data.text) {
        setResponse(data.text)
        setCollapsed(false)
      } else {
        throw new Error('No diagnostic returned')
      }
    } catch (err) {
      setError(isRTL ? 'فشلت معالجة الاستعلام الذكي.' : 'Failed to process AI request.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-6 border border-zinc-200/50 dark:border-white/5 bg-zinc-100/30 dark:bg-[#0c0c14]/30 backdrop-blur-md rounded-2xl p-4 hover:border-zinc-300 dark:hover:border-white/10 transition-colors relative overflow-hidden">
      {/* Decorative vertical border highlight */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl" style={{ backgroundColor: themeColor }} />

      <div className="flex items-center justify-between mb-3 pl-1">
        <h4 className="text-xs font-space font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          {title}
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

      <div className="space-y-3">
        <div className="flex gap-2 relative">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
            placeholder={placeholder}
            className="w-full bg-zinc-100/50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-800 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-white/20 focus:outline-none focus:border-zinc-300 dark:focus:border-white/10 transition-all font-space min-h-[64px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleExecute()
              }
            }}
          />
          <button
            onClick={handleExecute}
            disabled={loading || !query.trim()}
            className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-850 dark:hover:bg-zinc-200 rounded-xl text-[10px] font-space font-black tracking-wider uppercase transition-colors shrink-0 flex items-center justify-center min-w-[70px] disabled:opacity-40 cursor-pointer h-auto"
            style={{
              boxShadow: query.trim() && !loading ? `0 4px 15px ${themeColor}22` : 'none'
            }}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              isRTL ? 'تشغيل' : 'RUN'
            )}
          </button>
        </div>

        {error && (
          <span className="text-[9px] font-space font-bold text-red-500/80 block mt-1">
            {error}
          </span>
        )}

        {response && !collapsed && (
          <div className="mt-3 bg-zinc-200/50 dark:bg-black/40 border border-zinc-300/50 dark:border-white/5 rounded-xl p-3 text-xs text-zinc-800 dark:text-zinc-300 font-space whitespace-pre-wrap leading-relaxed select-text transition-all max-h-[300px] overflow-y-auto scrollbar-thin">
            <div className="text-[8px] uppercase tracking-widest text-zinc-500/60 dark:text-white/20 font-bold mb-2 pb-1 border-b border-zinc-300 dark:border-white/5">
              {isRTL ? 'التحليل والحلول المقترحة' : 'AI Diagnostic Resolution'}
            </div>
            {response}
          </div>
        )}
      </div>
    </div>
  )
}
