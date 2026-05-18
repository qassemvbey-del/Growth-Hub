'use client'

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
    EMPTY_INPUT: isRTL ? 'من فضلك الصق محتوى أولاً' : 'Please paste some content first',
    NO_TASKS_FOUND: isRTL ? 'لم يتم العثور على مهام في هذا النص' : 'No tasks could be extracted from this content',
    ANALYSIS_FAILED: isRTL ? 'فشل التحليل، حاول مرة أخرى' : 'Analysis failed, please try again',
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
    if (!user) {
      setError(isRTL ? 'يجب تسجيل الدخول' : 'AUTH_REQUIRED')
      setDeploying(false)
      return
    }

    const payload = extractedTasks.map(title => ({
      cup_id: missionId,
      title,
      weight: 3,
      is_completed: false,
      type: 'standard',
    }))

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
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-2xl bg-[var(--card-bg)] border rounded-sm overflow-hidden flex flex-col shadow-2xl"
        style={{ borderColor: `${themeColor}44`, boxShadow: `0 0 60px ${themeColor}15` }}
      >
        {/* ── HEADER ── */}
        <div
          className="px-6 py-4 border-b flex justify-between items-center"
          style={{ borderColor: `${themeColor}22` }}
        >
          <div className="flex items-center gap-3">
            {/* Glowing accent bar */}
            <div className="w-1 h-6 rounded-full" style={{ backgroundColor: themeColor, boxShadow: `0 0 10px ${themeColor}` }} />
            <span className="material-symbols-outlined text-xl" style={{ color: themeColor }}>
              content_paste
            </span>
            <h2
              className="font-space font-black uppercase italic tracking-widest text-sm"
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
            className="material-symbols-outlined text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            close
          </button>
        </div>

        {/* ── BODY ── */}
        <div className="p-6 space-y-5">
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
                    ? 'الصق أي نص: منهج دراسي، فهرس كتاب، قائمة دروس، أو أي محتوى منظم...'
                    : 'Paste your course curriculum, chapter list, table of contents, or any structured content below:'}
                </p>

                <div className="relative">
                  <textarea
                    value={pastedText}
                    onChange={e => { setPastedText(e.target.value); setError(null) }}
                    placeholder={isRTL
                      ? 'الصق المحتوى هنا...'
                      : 'Paste your course curriculum, chapter list, or any content here...'}
                    rows={10}
                    dir="auto"
                    className="w-full bg-[var(--input-bg)] border p-4 font-space text-xs text-[var(--text-primary)] outline-none resize-none placeholder:text-[var(--text-secondary)]/50 transition-all focus:border-opacity-80"
                    style={{
                      borderColor: error ? '#FF0055' : `${themeColor}30`,
                      borderRadius: '2px',
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
                      <span className="material-symbols-outlined text-sm">error</span>
                      {errorMessages[error] || error}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Analyze Button */}
                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing || !pastedText.trim()}
                    className="flex items-center gap-3 px-8 py-3 font-space font-black text-[11px] uppercase tracking-[0.2em] transition-all disabled:opacity-30"
                    style={{
                      backgroundColor: themeColor,
                      color: '#000',
                      boxShadow: analyzing ? `0 0 25px ${themeColor}66` : `0 0 15px ${themeColor}44`,
                    }}
                  >
                    <span className={`material-symbols-outlined text-sm ${analyzing ? 'animate-spin' : ''}`}>
                      {analyzing ? 'sync' : 'manage_search'}
                    </span>
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
                  <span className="material-symbols-outlined text-xl" style={{ color: themeColor }}>
                    task_alt
                  </span>
                  <div>
                    <p className="text-[13px] font-space font-black uppercase tracking-widest" style={{ color: themeColor }}>
                      {isRTL ? `تم استخراج ${extractedTasks.length} مهمة` : `✓ FOUND ${extractedTasks.length} TASKS`}
                    </p>
                    <p className="text-[9px] font-space text-[var(--text-secondary)] tracking-widest uppercase">
                      {isRTL ? 'راجع القائمة وأضفها' : 'REVIEW AND CONFIRM TO ADD'}
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
                      className="flex items-center gap-3 p-3 border border-[var(--card-border)] bg-[var(--input-bg)]"
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
                      <span className="material-symbols-outlined text-sm">error</span>
                      {errorMessages[error] || error}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Footer actions */}
                <div className="flex justify-between items-center pt-3 border-t border-[var(--card-border)]">
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-[10px] font-space font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    {isRTL ? 'رجوع' : 'BACK'}
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleClose}
                      className="px-5 py-2.5 font-space font-black text-[10px] uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {isRTL ? 'إلغاء' : 'CANCEL'}
                    </button>
                    <button
                      onClick={handleDeploy}
                      disabled={deploying}
                      className="flex items-center gap-2 px-8 py-2.5 font-space font-black text-[11px] uppercase tracking-[0.2em] transition-all disabled:opacity-40"
                      style={{
                        backgroundColor: themeColor,
                        color: '#000',
                        boxShadow: `0 0 20px ${themeColor}44`,
                      }}
                    >
                      <span className={`material-symbols-outlined text-sm ${deploying ? 'animate-spin' : ''}`}>
                        {deploying ? 'sync' : 'add_task'}
                      </span>
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
