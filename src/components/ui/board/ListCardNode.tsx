'use client'

import React, { useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { List, Plus, Trash2, X } from 'lucide-react'

export default function ListCardNode({ data }: { data: any }) {
  const { task, cardId, onUpdateTask, onDeleteCard } = data
  const bulletItems: string[] = task?.metadata?.bullet_list || []
  const [newItem, setNewItem] = useState('')

  const handleAddItem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!newItem.trim()) return
    const updated = [...bulletItems, newItem.trim()]
    await onUpdateTask(task.id, { metadata: { ...task.metadata, bullet_list: updated } })
    setNewItem('')
  }

  const handleDeleteItem = async (index: number) => {
    const updated = bulletItems.filter((_, i) => i !== index)
    await onUpdateTask(task.id, { metadata: { ...task.metadata, bullet_list: updated } })
  }

  return (
    <div className="relative group bg-zinc-900/90 border border-purple-500/30 rounded-xl p-4 min-w-[240px] max-w-[300px] shadow-xl backdrop-blur-md">
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-purple-500 border-2 border-zinc-900" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-purple-500 border-2 border-zinc-900" />

      {/* Card Header */}
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2 text-purple-400 font-space font-medium text-xs">
          <List size={14} />
          <span>List Card</span>
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

      {/* Bullet Items */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 mb-2 nodrag">
        {bulletItems.length === 0 ? (
          <p className="text-[11px] text-zinc-500 italic">No bullet points yet.</p>
        ) : (
          bulletItems.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between gap-2 text-xs group/item nodrag">
              <span className="text-purple-400 font-bold">•</span>
              <span className="flex-1 text-xs text-zinc-200 truncate">{item}</span>
              <button
                type="button"
                onClick={() => handleDeleteItem(idx)}
                className="opacity-0 group-hover/item:opacity-100 text-zinc-500 hover:text-red-400 cursor-pointer p-0.5 nodrag"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Bullet Item */}
      <form onSubmit={handleAddItem} className="pt-2 border-t border-white/5 flex gap-2 items-center nodrag">
        <input
          type="text"
          placeholder="Add bullet point..."
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 font-space nodrag"
        />
        <button
          type="submit"
          className="text-purple-400 hover:text-purple-300 p-1 cursor-pointer nodrag"
        >
          <Plus size={16} />
        </button>
      </form>
    </div>
  )
}
