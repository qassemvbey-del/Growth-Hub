'use client'

import React, { useState, useEffect } from 'react'
import { Check, ClipboardList, CheckSquare, Square, Sparkles, Loader2, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface VideoAnalysisResponse {
  isIntroOnly: boolean
  summary: string
  keyTakeaways: string[]
  checklist: string[]
  additionalNotes: string
}

interface VideoAnalysisViewerProps {
  analysis: VideoAnalysisResponse
  isRTL: boolean
  themeColor: string
  goalId: string
  taskId: string
  metadata: any
  onUpdateTask: (taskId: string, updates: any) => Promise<void> | void
}

const cleanText = (text: string) => text ? text.replace(/[*#`+\-~]/g, '').trim() : '';

export default function VideoAnalysisViewer({
  analysis,
  isRTL,
  themeColor,
  goalId,
  taskId,
  metadata,
  onUpdateTask
}: VideoAnalysisViewerProps) {
  const router = useRouter()
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [added, setAdded] = useState(metadata?.analysisTasksAdded || false)

  if (typeof analysis === 'string' || !analysis || typeof analysis !== 'object') {
    return (
      <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-xs text-red-500 font-space select-text" dir={isRTL ? 'rtl' : 'ltr'}>
        {isRTL
          ? '⚠️ خطأ: بيانات تحليل الفيديو قديمة أو غير صالحة.'
          : '⚠️ Error: Legacy or invalid video analysis data structure.'}
      </div>
    )
  }

  useEffect(() => {
    if (analysis.checklist) {
      const initialChecked: Record<number, boolean> = {}
      analysis.checklist.forEach((_, idx) => {
        initialChecked[idx] = true
      })
      setCheckedItems(initialChecked)
    }
  }, [analysis.checklist])

  const toggleCheck = (idx: number) => {
    setCheckedItems(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }))
  }

  const handleAddTasksToGoal = async () => {
    const selectedChecklist = analysis.checklist.filter((_, idx) => checkedItems[idx])
    if (selectedChecklist.length === 0) {
      alert(isRTL ? 'يرجى تحديد مهمة واحدة على الأقل.' : 'Please select at least one task.')
      return
    }

    setIsAdding(true)
    try {
      const supabase = createClient()
      const now = Date.now()
      
      const payload = selectedChecklist.map((title, index) => ({
        goal_id: goalId,
        title: cleanText(title),
        is_completed: false,
        type: 'standard',
        created_at: new Date(now + index * 10).toISOString(),
        metadata: {
          generatedFromVideo: true,
          parentTaskId: taskId
        }
      }))

      const { error } = await supabase.from('tasks').insert(payload)
      if (error) throw error

      // Update parent task metadata to persist the added state
      const updatedMetadata = {
        ...metadata,
        analysisTasksAdded: true
      }
      await onUpdateTask(taskId, { metadata: updatedMetadata })
      setAdded(true)
      
      router.refresh()
    } catch (err) {
      console.error('Failed to add tasks from analysis:', err)
      alert(isRTL ? 'فشل إضافة المهام إلى الهدف.' : 'Failed to add tasks to the Goal.')
    } finally {
      setIsAdding(false)
    }
  }

  const hasChecklist = !analysis.isIntroOnly && analysis.checklist && analysis.checklist.length > 0

  return (
    <div className="bg-black/20 backdrop-blur-xl border border-white/10 shadow-[0_12px_40px_0_rgba(0,0,0,0.5)] rounded-2xl p-4 transition-colors relative overflow-hidden space-y-4 text-left" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Accent glow line */}
      <div className="absolute left-0 right-0 top-0 h-[2px]" style={{ backgroundColor: themeColor }} />

      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-white/5">
        <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
        <h4 className="text-[11px] font-space font-black uppercase tracking-wider text-zinc-900 dark:text-white">
          {isRTL ? 'تحليل الفيديو الذكي' : 'Smart Video Analysis'}
        </h4>
      </div>

      {/* Summary Panel */}
      <div className="bg-gradient-to-r from-cyan-950/20 to-purple-950/20 border border-cyan-500/10 p-3.5 rounded-xl text-xs relative overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
        <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: themeColor }} />
        <div className={cn("space-y-1", isRTL ? "pr-1.5" : "pl-1.5")}>
          <span className="text-[9px] font-space font-black uppercase text-cyan-400 tracking-wider block">
            {isRTL ? 'الملخص التنفيذي' : 'Executive Summary'}
          </span>
          <p className="text-zinc-300 font-sans leading-relaxed select-text">
            {cleanText(analysis.summary)}
          </p>
        </div>
      </div>

      {/* Key Takeaways */}
      {analysis.keyTakeaways && analysis.keyTakeaways.length > 0 && (
        <div className="space-y-2">
          <span className="text-[9px] font-space font-black uppercase text-zinc-500 tracking-wider block pl-1">
            {isRTL ? 'النقاط المستفادة' : 'Key Takeaways'}
          </span>
          <ul className="space-y-1.5 list-none pl-0">
            {analysis.keyTakeaways.map((takeaway, idx) => (
              <li key={idx} className="text-xs text-zinc-400 flex items-start gap-2 select-text font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0" style={{ backgroundColor: themeColor }} />
                <span>{cleanText(takeaway)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Checklist / Actionable Tasks */}
      <div className="space-y-3 pt-2 border-t border-white/5">
        <div className="flex items-center gap-2 justify-between">
          <span className="text-[9px] font-space font-black uppercase text-zinc-500 tracking-wider">
            {isRTL ? 'الخطوات العملية المستخرجة' : 'Actionable Checklist'}
          </span>
          {hasChecklist && !added && (
            <span className="text-[8px] font-mono text-zinc-600 dark:text-zinc-500">
              {Object.values(checkedItems).filter(Boolean).length} / {analysis.checklist.length} {isRTL ? 'محدد' : 'selected'}
            </span>
          )}
        </div>

        {!hasChecklist ? (
          <div className="flex items-start gap-2.5 bg-yellow-500/5 border border-yellow-500/10 p-3.5 rounded-xl">
            <Info className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-500/80 leading-relaxed font-sans select-text">
              {isRTL
                ? "هذا الفيديو عبارة عن مقدمة عامة أو محتوى نظري ولا يحتوي على خطوات عملية يمكن تحويلها لمهام."
                : "This video is a general intro and contains no actionable steps."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1 scrollbar-thin">
              {analysis.checklist.map((item, idx) => {
                const isChecked = !!checkedItems[idx]
                return (
                  <div
                    key={idx}
                    onClick={() => !added && toggleCheck(idx)}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-lg border transition-all select-text font-sans text-xs",
                      added 
                        ? "bg-zinc-800/10 border-white/5 opacity-65 cursor-default text-zinc-500" 
                        : isChecked
                          ? "bg-white/[0.02] border-white/10 hover:border-white/20 text-white cursor-pointer"
                          : "bg-transparent border-white/5 hover:border-white/10 text-zinc-500 cursor-pointer"
                    )}
                  >
                    {!added && (
                      <button type="button" className="shrink-0 transition-colors">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-cyan-400" style={{ color: themeColor }} />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-600" />
                        )}
                      </button>
                    )}
                    {added && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
                    <span className={cn("flex-1", isChecked ? "" : "line-through opacity-50")}>
                      {cleanText(item)}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Action Button */}
            {!added ? (
              <button
                type="button"
                onClick={handleAddTasksToGoal}
                disabled={isAdding}
                className="w-full flex items-center justify-center gap-2 py-2 px-3.5 rounded-xl font-space font-black text-[10px] tracking-wider uppercase transition-all shrink-0 cursor-pointer hover:brightness-110 border"
                style={{
                  color: '#000',
                  backgroundColor: themeColor,
                  borderColor: themeColor,
                  boxShadow: `0 0 10px ${themeColor}30`
                }}
              >
                {isAdding ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <ClipboardList className="w-3.5 h-3.5 text-black" />
                    <span>{isRTL ? 'إضافة المهام المحددة للهدف' : 'Add Selected Tasks to Goal'}</span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 py-2 px-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-space font-black text-[10px] tracking-wider uppercase">
                <Check className="w-3.5 h-3.5" />
                <span>{isRTL ? 'تم إضافة المهام المحددة للهدف' : 'Tasks Added to Goal'}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Additional Notes Panel */}
      {analysis.additionalNotes && (
        <div className="bg-zinc-900/40 border border-white/5 p-3 rounded-xl text-xs space-y-1 font-sans select-text text-zinc-400 leading-relaxed">
          <span className="text-[8px] font-space font-black uppercase text-zinc-600 tracking-wider block">
            {isRTL ? 'ملاحظات إضافية' : 'Additional Notes'}
          </span>
          <p>{cleanText(analysis.additionalNotes)}</p>
        </div>
      )}
    </div>
  )
}
