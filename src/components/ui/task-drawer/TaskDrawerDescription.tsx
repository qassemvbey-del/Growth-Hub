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
    <div className="space-y-3">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">
        {isRTL ? 'وصف المهمة' : 'TASK DESCRIPTION'}
      </h3>
      <div className="border border-white/5 rounded-xl overflow-hidden bg-zinc-950/40">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => {
            if (description !== task.description) {
              updateTask(task.id, { description })
            }
          }}
          className="w-full min-h-[120px] bg-transparent border-none p-4 font-space text-sm text-white outline-none focus:ring-0 placeholder-white/20 resize-y"
          placeholder={isRTL ? "أضف وصفاً..." : "Add a description..."}
        />
      </div>
    </div>
  )
}
