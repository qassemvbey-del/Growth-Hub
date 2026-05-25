'use client'

import { ArrowLeft, HelpCircle, XCircle, X, Loader2, Sparkles, Plus } from 'lucide-react'
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { extractTasksFromText } from '@/app/actions/ai-magic'
import { useGrowth } from '@/context/GrowthContext'

interface Props {
  isOpen: boolean
  onClose: () => void
  missionId: string
  themeColor: string
  onTasksAdded: (tasks: any[]) => void
}

type Phase = 'INPUT' | 'PREVIEW'

export default function SmartImportModal({ isOpen, onClose, missionId, themeColor, onTasksAdded }: Props) {
  const { isRTL } = useGrowth()
  const [phase, setPhase] = useState<Phase>('INPUT')
  const [pastedText, setPastedText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [extractedTasks, setExtractedTasks] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const errorMessages: Record<string, string> = {
    EMPTY_INPUT: isRTL ? 'يرجى لصق المحتوى أولاً' : 'Please paste some content first',
    NO_TASKS_FOUND: isRTL ? 'لم يتم العثور على مهام في هذا النص' : 'No tasks could be extracted from this content',
    ANALYSIS_FAILED: isRTL ? 'فشل التحليل، يرجى المحاولة مرة أخرى' : 'Analysis failed, please try again',
    'PROTOCOL_FAILURE: NO_API_KEY': isRTL ? 'خطأ في إعدادات النظام' : 'System configuration error',
  }

  const handleAnalyze = async () => {
    if (!pastedText.trim()) {
      setError('EMPTY_INPUT')
      return
    }
    setError(null)
    setAnalyzing(true)
    try {
      const result = await extractTasksFromText(pastedText)
      if (!result.success || !result.tasks) {
        setError(result.error || 'ANALYSIS_FAILED')
      } else {
        setExtractedTasks(result.tasks)
        setPhase('PREVIEW')
      }
    } catch {
      setError('ANALYSIS_FAILED')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleDeploy = async () => {
    setDeploying(true)
    const { data: { user } } = await supabase.auth.getUser()
    const isLocal = typeof missionId === 'string' && missionId.startsWith('local_')

    if (!user && !isLocal) {
      setError(isRTL ? 'يرجى تسجيل الدخول للمتابعة' : 'AUTH_REQUIRED')
      setDeploying(false)
      return
    }

    const now = Date.now()
    const payload = extractedTasks.map((title, index) => ({
      cup_id: missionId,
      title,
      weight: 3,
      is_completed: false,
      type: 'standard',
      created_at: new Date(now + index * 10).toISOString()
    }))

    if (isLocal) {
      const generatedTasks = payload.map(p => ({
        ...p,
        id: 'task_' + Math.random().toString(36).substring(2, 9)
      }))

      // Save to localStorage under guest_goals
      const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
      const updatedGoals = guestGoals.map((g: any) => {
        if (g.id === missionId) {
          return {
            ...g,
            tasks: [...(g.tasks || []), ...generatedTasks]
          }
        }
        return g
      })
      localStorage.setItem('guest_goals', JSON.stringify(updatedGoals))

      onTasksAdded(generatedTasks)
      handleClose()
      return
    }

    const { data, error: insertError } = await supabase.from('tasks').insert(payload).select()

    if (insertError) {
      setError(`DATABASE_ERROR // ${insertError.message.toUpperCase()}`)
      setDeploying(false)
    } else {
      onTasksAdded(data || [])
      handleClose()
    }
  }

  const handleClose = () => {
    setPhase('INPUT')
    setPastedText('')
    setExtractedTasks([])
    setError(null)
    setAnalyzing(false)
    setDeploying(false)
    onClose()
  }

  const handleBack = () => {
    setPhase('INPUT')
    setError(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-white/60 dark:bg-black/90 backdrop-blur-md" onClick={handleClose} dir={isRTL ? 'rtl' : 'ltr'}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[95vw] md:max-w-2xl bg-[var(--card-bg)]/90 backdrop-blur-xl border rounded-2xl overflow-y-auto flex flex-col shadow-2xl p-4 md:p-6"
        style={{ borderColor: `${themeColor}44`, boxShadow: `0 0 60px ${themeColor}15`, maxHeight: '90vh', margin: 'auto' }}
      >
        {/* ── HEADER ── */}
        <div
          className="pb-4 border-b flex justify-between items-center"
          style={{ borderColor: `${themeColor}22` }}
        >
          <div className="flex items-center gap-3">
            {/* Glowing accent bar */}
            <div className="w-1 h-6 rounded-full" style={{ backgroundColor: themeColor, boxShadow: `0 0 10px ${themeColor}` }} />
            <HelpCircle />
            <h2
              className="font-space font-black uppercase tracking-widest text-sm"
              style={{ color: themeColor }}
            >
              {isRTL ? 'الاستيراد الذكي' : 'SMART_IMPORT'}
            </h2>
            {phase === 'PREVIEW' && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-[9px] font-space font-black tracking-widest uppercase px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${themeColor}22`, color: themeColor }}
              >
                {isRTL ? 'معاينة' : 'PREVIEW'}
              </motion.span>
            )}
          </div>
          <button
            onClick={handleClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── BODY ── */}
        <div className="py-4 space-y-5">
          <AnimatePresence mode="wait">

            {/* Phase: INPUT */}
            {phase === 'INPUT' && (
              <motion.div
                key="input"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <p className="text-[11px] font-space text-[var(--text-secondary)] tracking-wide leading-relaxed">
                  {isRTL
                    ? 'يرجى لصق النص المطلوب هنا: منهج دراسي، فهرس كتاب، قائمة دروس، أو أي محتوى آخر...'
                    : 'Paste your course curriculum, chapter list, table of contents, or any structured content below:'}
                </p>

                <div className="relative">
                  <textarea
                    value={pastedText}
                    onChange={e => { setPastedText(e.target.value); setError(null) }}
                    placeholder={isRTL
                      ? 'يرجى لصق المحتوى هنا...'
                      : 'Paste your course curriculum, chapter list, or any content here...'}
                    rows={10}
                    dir="auto"
                    className="w-full bg-[var(--input-bg)] border py-2.5 px-4 font-space text-xs text-[var(--text-primary)] outline-none resize-none placeholder:text-[var(--text-secondary)]/50 transition-all focus:border-opacity-80 rounded-xl"
                    style={{
                      borderColor: error ? '#FF0055' : `${themeColor}30`,
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = `${themeColor}70` }}
                    onBlur={e => { e.currentTarget.style.borderColor = error ? '#FF0055' : `${themeColor}30` }}
                  />
                  {pastedText.length > 0 && (
                    <span className="absolute bottom-2 right-3 text-[9px] font-space text-[var(--text-secondary)]/40 font-black tracking-widest">
                      {pastedText.length.toLocaleString()} {isRTL ? 'حرف' : 'CHARS'}
                    </span>
                  )}
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-[10px] font-space font-black text-[#FF0055] tracking-widest flex items-center gap-2"
                    >
                      <XCircle className="text-sm w-3.5 h-3.5" />
                      {errorMessages[error] || error}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Analyze Button */}
                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing || !pastedText.trim()}
                    className="flex items-center gap-3 py-2.5 px-6 font-space font-black text-[11px] uppercase tracking-[0.2em] transition-all disabled:opacity-30 rounded-xl cursor-pointer"
                    style={{
                      backgroundColor: themeColor,
                      color: '#000',
                      boxShadow: analyzing ? `0 0 25px ${themeColor}66` : `0 0 15px ${themeColor}44`,
                    }}
                  >
                    {analyzing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {analyzing
                      ? (isRTL ? 'جاري التحليل...' : 'ANALYZING...')
                      : (isRTL ? 'استخراج المهام ←' : 'FIND TASKS →')}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Phase: PREVIEW */}
            {phase === 'PREVIEW' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                {/* Found banner */}
                <div
                  className="flex items-center gap-3 px-4 py-3 border rounded-sm"
                  style={{ backgroundColor: `${themeColor}12`, borderColor: `${themeColor}33` }}
                >
                  <HelpCircle />
                  <div>
                    <p className="text-[13px] font-space font-black uppercase tracking-widest" style={{ color: themeColor }}>
                      {isRTL ? `تم استخراج ${extractedTasks.length} مهمة بنجاح` : `✓ FOUND ${extractedTasks.length} TASKS`}
                    </p>
                    <p className="text-[9px] font-space text-[var(--text-secondary)] tracking-widest uppercase">
                      {isRTL ? 'يرجى مراجعة القائمة وتأكيد الإضافة' : 'REVIEW AND CONFIRM TO ADD'}
                    </p>
                  </div>
                </div>

                {/* Task list */}
                <div className="max-h-[320px] overflow-y-auto space-y-1.5 pr-1">
                  {extractedTasks.map((task, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="flex items-center gap-3 py-2.5 px-4 border border-[var(--card-border)] bg-[var(--input-bg)] rounded-xl"
                    >
                      <span
                        className="text-[9px] font-space font-black shrink-0 w-6 text-right"
                        style={{ color: `${themeColor}80` }}
                      >
                        {i + 1}
                      </span>
                      <div className="w-px h-4 shrink-0" style={{ backgroundColor: `${themeColor}30` }} />
                      <p
                        className="font-space text-[11px] font-bold text-[var(--text-primary)] uppercase"
                        dir="auto"
                      >
                        {task}
                      </p>
                    </motion.div>
                  ))}
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-[10px] font-space font-black text-[#FF0055] tracking-widest flex items-center gap-2"
                    >
                      <XCircle className="text-sm w-3.5 h-3.5" />
                      {errorMessages[error] || error}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Footer actions */}
                <div className="flex justify-between items-center pt-3 border-t border-[var(--card-border)]">
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-[10px] font-space font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="text-sm w-3.5 h-3.5" />
                    {isRTL ? 'رجوع' : 'BACK'}
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleClose}
                      className="py-2.5 px-4 font-space font-black text-[10px] uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded-xl cursor-pointer"
                    >
                      {isRTL ? 'إلغاء' : 'CANCEL'}
                    </button>
                    <button
                      onClick={handleDeploy}
                      disabled={deploying}
                      className="flex items-center gap-2 py-2.5 px-6 font-space font-black text-[11px] uppercase tracking-[0.2em] transition-all disabled:opacity-40 rounded-xl cursor-pointer"
                      style={{
                        backgroundColor: themeColor,
                        color: '#000',
                        boxShadow: `0 0 20px ${themeColor}44`,
                      }}
                    >
                      {deploying ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      {deploying
                        ? (isRTL ? 'جاري الإضافة...' : 'ADDING...')
                        : (isRTL ? 'إضافة المهام ✓' : 'ADD TASKS ✓')}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
