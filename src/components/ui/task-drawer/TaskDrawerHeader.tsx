'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Link as LinkIcon, Play, RefreshCw, Circle, X, CheckCircle2, Pencil, ListTodo, Maximize2, Minimize2 } from 'lucide-react'
import { NeonIcon } from '../NeonIcon'
import CustomSelect from '../CustomSelect'
import { cn } from '@/lib/utils'

interface TaskDrawerHeaderProps {
  task: any
  taskTitle: string
  setTaskTitle: (title: string) => void
  themeColor: string
  onComplete: () => void
  onClose: () => void
  // startFocus: (title: string, id: string, cupId?: string) => void
  startFocus: (title: string, id: string, goalId?: string) => void
  // cupId?: string
  goalId?: string
  currentUserId: string | null
  profile: any
  isRTL: boolean
  t: (key: any) => string
  sendNotification: (targetUserId: string, type: 'mention' | 'reaction', title: string, contentText: string) => Promise<void> | void
  updateTask: (taskId: string, updates: any) => Promise<void> | void
  handleCopyLink: () => void
  goals: any[]
  canEdit?: boolean
  isExpanded?: boolean
  onToggleExpand?: () => void
}

export default function TaskDrawerHeader({
  task,
  taskTitle,
  setTaskTitle,
  themeColor,
  onComplete,
  onClose,
  startFocus,
  // cupId,
  goalId,
  currentUserId,
  profile,
  isRTL,
  t,
  sendNotification,
  updateTask,
  handleCopyLink,
  goals,
  canEdit = true,
  isExpanded = false,
  onToggleExpand
}: TaskDrawerHeaderProps) {
  const [isEditingGoal, setIsEditingGoal] = useState(false)
  const currentGoal = goals.find(g => g.id === (task.goal_id || goalId))
  const goalLabel = currentGoal ? currentGoal.title : (isRTL ? '— بدون ربط —' : '— No Link —')

  return (
    <div className="sticky top-0 bg-[#09090b]/90 backdrop-blur-md border-b border-white/5 z-[60] p-4 md:p-6 flex flex-col gap-3 shrink-0">
      <div className="flex items-center justify-between gap-3 w-full">
        {/* Goal Selector */}
        <div className="flex items-center gap-1.5 max-w-xs sm:max-w-md w-full sm:w-auto">
          {goals && goals.length > 0 && (
            isEditingGoal && canEdit ? (
              <CustomSelect
                minimal
                value={task.goal_id || goalId || ''}
                onChange={async (val) => {
                  await updateTask(task.id, { goal_id: val || null })
                  setIsEditingGoal(false)
                }}
                options={[
                  { value: '', label: isRTL ? '— بدون ربط —' : '— No Link —' },
                  ...goals.map(g => ({ value: g.id, label: g.title }))
                ]}
                className="w-full sm:w-auto min-w-[200px]"
              />
            ) : (
              <div 
                className="group flex items-center gap-1.5"
              >
                <span className="text-[12px] font-semibold text-orange-500 select-none">
                  {goalLabel}
                </span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setIsEditingGoal(true)}
                    className="p-1 hover:bg-white/5 rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-white shrink-0"
                    title={isRTL ? 'تعديل الهدف' : 'Edit Goal'}
                  >
                    <Pencil className="w-3 h-3 text-zinc-500 hover:text-white" />
                  </button>
                )}
              </div>
            )
          )}
        </div>

        {/* Status Toggle Pill, Expand Button and Close Button */}
        <div className="flex items-center gap-2">
          {/* Status Toggle Pill */}
          {canEdit && (
            <button
              onClick={onComplete}
              className="status-pill border border-orange-500/50 text-orange-500 rounded-full px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
            >
              {task.is_completed ? <ListTodo className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
              <span>{task.is_completed ? t('completed') : t('inProgress')}</span>
            </button>
          )}

          {/* Expand/Collapse Button */}
          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="w-8 h-8 rounded-full flex items-center justify-center border border-white/10 hover:border-white/20 bg-white/[0.02] text-[var(--text-secondary)] hover:text-white transition-all cursor-pointer"
              title={isExpanded ? (isRTL ? 'تصغير' : 'Collapse') : (isRTL ? 'توسيع' : 'Expand')}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center border border-white/10 hover:border-white/20 bg-white/[0.02] text-[var(--text-secondary)] hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Task Title input/textarea */}
      <div className="w-full flex items-start gap-2 group">
        <textarea
          rows={1}
          value={taskTitle}
          readOnly={!canEdit}
          onChange={(e) => {
            if (!canEdit) return
            setTaskTitle(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = `${e.target.scrollHeight}px`
          }}
          onBlur={() => {
            if (!canEdit) return
            if (taskTitle.trim() && taskTitle !== task.title) {
              updateTask(task.id, { title: taskTitle.trim() })
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              e.currentTarget.blur()
            }
          }}
          className={cn(
            "text-lg/snug font-medium font-space text-[#FFFFFF] tracking-tight bg-transparent w-full border-none focus:outline-none focus:ring-0 p-0 resize-none overflow-hidden break-words whitespace-normal flex-1",
            !canEdit && "cursor-default select-text"
          )}
          placeholder={isRTL ? "اسم المهمة..." : "Task Name..."}
        />
        {canEdit && (
          <Pencil className="w-4 h-4 text-zinc-500 hover:text-white transition-colors cursor-pointer shrink-0 mt-1 opacity-0 group-hover:opacity-100" />
        )}
      </div>
    </div>
  )
}
