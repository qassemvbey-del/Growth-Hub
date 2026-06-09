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
  handleUpdateSubtask: (subId: string, newTitle: string) => Promise<void> | void
  isRTL: boolean
  themeColor: string
  canEdit?: boolean
}

export default function TaskDrawerChecklist({
  task,
  subtasks,
  newSubtaskText,
  setNewSubtaskText,
  handleAddSubtask,
  handleToggleSubtask,
  handleDeleteSubtask,
  handleUpdateSubtask,
  isRTL,
  themeColor,
  canEdit = true
}: TaskDrawerChecklistProps) {
  const [editingSubtaskId, setEditingSubtaskId] = React.useState<string | null>(null)
  const [editingText, setEditingText] = React.useState<string>('')

  const handleStartEdit = (subId: string, currentTitle: string) => {
    setEditingSubtaskId(subId)
    setEditingText(currentTitle)
  }

  const handleSaveEdit = async (subId: string) => {
    if (editingText.trim() && editingText.trim() !== subtasks.find(s => s.id === subId)?.title) {
      await handleUpdateSubtask(subId, editingText.trim())
    }
    setEditingSubtaskId(null)
  }

  return (
    <div className="space-y-2">
      <h3 className="text-[10px] font-medium text-zinc-500 mb-3 opacity-60">
        {/* {isRTL ? 'المهام الفرعية // SUBTASKS' : 'CHECKLIST // SUBTASKS'} */}
        {isRTL ? 'المهام الفرعية - Checklist' : 'Checklist'}
      </h3>
      
      {canEdit && (
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
      )}
 
      <div className="space-y-0.5 mt-2">
        {subtasks.map((sub: any) => (
          <div
            key={sub.id}
            className="flex items-center justify-between gap-1 py-0.5 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => canEdit && handleToggleSubtask(sub.id, sub.is_completed)}
                className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                  canEdit ? 'cursor-pointer hover:border-emerald-500' : 'cursor-default opacity-60'
                }`}
                style={{
                  borderColor: sub.is_completed ? '#10B981' : 'rgba(255,255,255,0.2)',
                  backgroundColor: sub.is_completed ? '#10B981' : 'transparent'
                }}
              >
                {sub.is_completed && <NeonIcon icon={Check} className="w-2.5 h-2.5 text-black" />}
              </button>
              {editingSubtaskId === sub.id ? (
                <input
                  type="text"
                  value={editingText}
                  onChange={e => setEditingText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSaveEdit(sub.id)
                    } else if (e.key === 'Escape') {
                      setEditingSubtaskId(null)
                    }
                  }}
                  onBlur={() => handleSaveEdit(sub.id)}
                  autoFocus
                  className="bg-transparent border-b border-teal-500 focus:outline-none text-xs text-white w-full py-0.5 px-0 font-space"
                />
              ) : (
                <span
                  onDoubleClick={() => canEdit && handleStartEdit(sub.id, sub.title)}
                  className={`text-xs font-space flex-1 min-w-0 break-words whitespace-pre-wrap cursor-text select-text ${
                    sub.is_completed ? 'line-through text-white/30' : 'text-white/80'
                  }`}
                >
                  {sub.title}
                </span>
              )}
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => handleDeleteSubtask(sub.id)}
                className="p-1 text-zinc-500 hover:text-red-500 transition-colors shrink-0 cursor-pointer"
                title="Remove item"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
