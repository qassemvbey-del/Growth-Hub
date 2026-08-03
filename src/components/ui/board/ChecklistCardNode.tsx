'use client'

import React, { useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { ListTodo, Check, PlusSquare, Trash2, X } from 'lucide-react'

export default function ChecklistCardNode({ data }: { data: any }) {
  const { task, cardId, onUpdateTask, onDeleteCard } = data
  const subtasks: any[] = task?.metadata?.subtasks || []
  const [newText, setNewText] = useState('')

  const handleToggle = async (subId: string, currentStatus: boolean) => {
    const updatedSubtasks = subtasks.map(s => s.id === subId ? { ...s, is_completed: !currentStatus } : s)
    await onUpdateTask(task.id, { metadata: { ...task.metadata, subtasks: updatedSubtasks } })
  }

  const handleAddItem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!newText.trim()) return
    const newItem = {
      id: `sub_${Date.now()}`,
      title: newText.trim(),
      is_completed: false
    }
    const updatedSubtasks = [...subtasks, newItem]
    await onUpdateTask(task.id, { metadata: { ...task.metadata, subtasks: updatedSubtasks } })
    setNewText('')
  }

  const handleDeleteItem = async (subId: string) => {
    const updatedSubtasks = subtasks.filter(s => s.id !== subId)
    await onUpdateTask(task.id, { metadata: { ...task.metadata, subtasks: updatedSubtasks } })
  }

  return (
    <div className="relative group bg-zinc-900/90 border border-teal-500/30 rounded-xl p-4 min-w-[240px] max-w-[300px] shadow-xl backdrop-blur-md">
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-teal-500 border-2 border-zinc-900" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-teal-500 border-2 border-zinc-900" />

      {/* Card Title Header */}
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2 text-teal-400 font-space font-medium text-xs">
          <ListTodo size={14} />
          <span>Checklist Card</span>
        </div>
        {onDeleteCard && (
          <button
            type="button"
            onClick={() => onDeleteCard(cardId)}
            className="text-zinc-500 hover:text-red-400 p-1 cursor-pointer transition-colors nodrag"
            title="Delete Card"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Subtask list */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 nodrag">
        {subtasks.length === 0 ? (
          <p className="text-[11px] text-zinc-500 italic">No checklist items yet.</p>
        ) : (
          subtasks.map((sub: any) => (
            <div key={sub.id} className="flex items-center justify-between gap-2 text-xs group/item nodrag">
              <button
                type="button"
                onClick={() => handleToggle(sub.id, sub.is_completed)}
                className="w-4 h-4 rounded border flex items-center justify-center shrink-0 cursor-pointer transition-colors nodrag"
                style={{
                  borderColor: sub.is_completed ? '#10B981' : 'rgba(255,255,255,0.2)',
                  backgroundColor: sub.is_completed ? '#10B981' : 'transparent'
                }}
              >
                {sub.is_completed && <Check size={10} className="text-black stroke-[3]" />}
              </button>
              <span className={`flex-1 text-xs truncate ${sub.is_completed ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                {sub.title}
              </span>
              <button
                type="button"
                onClick={() => handleDeleteItem(sub.id)}
                className="opacity-0 group-hover/item:opacity-100 text-zinc-500 hover:text-red-400 cursor-pointer p-0.5 nodrag"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add New Item */}
      <form onSubmit={handleAddItem} className="mt-3 pt-2 border-t border-white/5 flex gap-2 items-center nodrag">
        <input
          type="text"
          placeholder="Add item..."
          value={newText}
          onChange={e => setNewText(e.target.value)}
          className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-teal-500 font-space nodrag"
        />
        <button
          type="submit"
          className="text-teal-400 hover:text-teal-300 p-1 cursor-pointer nodrag"
        >
          <PlusSquare size={16} />
        </button>
      </form>
    </div>
  )
}
