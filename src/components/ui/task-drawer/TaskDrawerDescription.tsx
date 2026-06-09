'use client'

import React from 'react'

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
  return (
    <div className="space-y-2">
      <h3 className="text-[10px] font-medium text-zinc-500 mb-3 opacity-60">
        {isRTL ? 'وصف المهمة' : 'Task Description'}
      </h3>
      {!canEdit ? (
        <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed font-space min-h-[40px] select-text">
          {description || (isRTL ? 'لا يوجد وصف للمهمة.' : 'No description provided.')}
        </div>
      ) : (
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => {
            if (description !== task.description) {
              updateTask(task.id, { description })
            }
          }}
          className="w-full min-h-[100px] bg-transparent border-none p-0 font-space text-sm text-zinc-300 dark:text-zinc-300 outline-none focus:outline-none focus:ring-0 placeholder-white/20 resize-none"
          placeholder={isRTL ? "أضف وصفاً..." : "Add a description..."}
        />
      )}
    </div>
  )
}
