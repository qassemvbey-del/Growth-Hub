'use client'

import React from 'react'

interface TaskDrawerDescriptionProps {
  task: any
  description: string
  setDescription: (val: string) => void
  isRTL: boolean
  updateTask: (taskId: string, updates: any) => Promise<void> | void
}

export default function TaskDrawerDescription({
  task,
  description,
  setDescription,
  isRTL,
  updateTask
}: TaskDrawerDescriptionProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-[10px] font-medium text-zinc-500 mb-3 opacity-60">
        {isRTL ? 'وصف المهمة' : 'Task Description'}
      </h3>
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
    </div>
  )
}
