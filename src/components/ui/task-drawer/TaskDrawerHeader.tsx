'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Link as LinkIcon, Play, RefreshCw, Circle, X, CheckCircle2, Edit2 } from 'lucide-react'
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
  goals
}: TaskDrawerHeaderProps) {
  const [isEditingGoal, setIsEditingGoal] = useState(false)
  const currentGoal = goals.find(g => g.id === (task.goal_id || goalId))
  const goalLabel = currentGoal ? currentGoal.title : (isRTL ? '— بدون ربط —' : '— NO LINK —')

  return (
    <div className="sticky top-0 bg-[#09090b]/90 backdrop-blur-md border-b border-white/5 z-[60] p-4 md:p-6 flex flex-col gap-3 shrink-0">
      <div className="flex items-center justify-between gap-3 w-full">
        {/* Goal Selector */}
        <div className="flex items-center gap-1.5 max-w-xs sm:max-w-md w-full sm:w-auto">
          {goals && goals.length > 0 && (
            isEditingGoal ? (
              <CustomSelect
                minimal
                value={task.goal_id || goalId || ''}
                onChange={async (val) => {
                  await updateTask(task.id, { goal_id: val || null })
                  setIsEditingGoal(false)
                }}
                options={[
                  { value: '', label: isRTL ? '— بدون ربط —' : '— NO LINK —' },
                  ...goals.map(g => ({ value: g.id, label: g.title.toUpperCase() }))
                ]}
                className="w-full sm:w-auto min-w-[200px]"
              />
            ) : (
              <div 
                className="group flex items-center gap-1.5"
              >
                <span className="text-[12px] font-semibold text-orange-500 uppercase select-none">
                  {goalLabel}
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingGoal(true)}
                  className="p-1 hover:bg-white/5 rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-white shrink-0"
                  title={isRTL ? 'تعديل الهدف' : 'Edit Goal'}
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )
          )}
        </div>

        {/* Status Toggle Pill and Close Button */}
        <div className="flex items-center gap-2">
          {/* Status Toggle Pill */}
          <button
            onClick={onComplete}
            className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-space font-black tracking-wider uppercase transition-all duration-200 border flex items-center gap-1 cursor-pointer",
              task.is_completed
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-amber-500/10 border-amber-500/30 text-amber-400"
            )}
          >
            {task.is_completed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5 font-bold" />}
            <span>{task.is_completed ? t('completed') : t('inProgress')}</span>
          </button>

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
      <div className="w-full">
        <textarea
          rows={1}
          value={taskTitle}
          onChange={(e) => {
            setTaskTitle(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = `${e.target.scrollHeight}px`
          }}
          onBlur={() => {
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
          className="text-lg/snug font-medium font-space text-[#FFFFFF] tracking-tight uppercase bg-transparent w-full border-none focus:outline-none focus:ring-0 p-0 resize-none overflow-hidden break-words whitespace-normal"
          placeholder={isRTL ? "اسم المهمة..." : "Task Name..."}
        />
      </div>
    </div>
  )
}
