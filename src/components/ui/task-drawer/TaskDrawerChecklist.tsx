'use client'

import React from 'react'
import { PlusSquare, Check, Trash2 } from 'lucide-react'
import { NeonIcon } from '../NeonIcon'

interface TaskDrawerChecklistProps {
  task: any
  subtasks: any[]
  newSubtaskText: string
  setNewSubtaskText: (val: string) => void
  handleAddSubtask: (e?: React.FormEvent) => Promise<void> | void
  handleToggleSubtask: (subId: string, currentStatus: boolean) => Promise<void> | void
  handleDeleteSubtask: (subId: string) => Promise<void> | void
  isRTL: boolean
  themeColor: string
}

export default function TaskDrawerChecklist({
  task,
  subtasks,
  newSubtaskText,
  setNewSubtaskText,
  handleAddSubtask,
  handleToggleSubtask,
  handleDeleteSubtask,
  isRTL,
  themeColor
}: TaskDrawerChecklistProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 opacity-60">
        {/* {isRTL ? 'المهام الفرعية // SUBTASKS' : 'CHECKLIST // SUBTASKS'} */}
        {isRTL ? 'المهام الفرعية - Checklist' : 'Checklist'}
      </h3>
      
      <form onSubmit={handleAddSubtask} className="flex gap-2 items-center">
        <input
          type="text"
          placeholder={isRTL ? 'مهمة فرعية جديدة...' : 'Add checklist item...'}
          value={newSubtaskText}
          onChange={e => setNewSubtaskText(e.target.value)}
          className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none p-0 font-space text-xs text-white placeholder-white/20"
        />
        <button
          type="submit"
          className="p-1 text-teal-400 hover:text-teal-300 transition-all cursor-pointer flex items-center justify-center shrink-0"
        >
          <NeonIcon icon={PlusSquare} className="w-4 h-4" />
        </button>
      </form>
 
      <div className="space-y-0.5 mt-2">
        {subtasks.map((sub: any) => (
          <div
            key={sub.id}
            className="flex items-center justify-between gap-1 py-0.5 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => handleToggleSubtask(sub.id, sub.is_completed)}
                className="w-3.5 h-3.5 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0"
                style={{
                  borderColor: sub.is_completed ? '#10B981' : 'rgba(255,255,255,0.2)',
                  backgroundColor: sub.is_completed ? '#10B981' : 'transparent'
                }}
              >
                {sub.is_completed && <NeonIcon icon={Check} className="w-2.5 h-2.5 text-black" />}
              </button>
              <span
                className={`text-xs font-space truncate ${
                  sub.is_completed ? 'line-through text-white/30' : 'text-white/80'
                }`}
              >
                {sub.title}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleDeleteSubtask(sub.id)}
              className="p-1 text-zinc-500 hover:text-red-500 transition-colors shrink-0 cursor-pointer"
              title="DELETE ITEM"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
