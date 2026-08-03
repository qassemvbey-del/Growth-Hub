'use client'

import React, { useState, useEffect } from 'react'
import { Handle, Position } from '@xyflow/react'
import { StickyNote, X } from 'lucide-react'

export default function NoteCardNode({ data }: { data: any }) {
  const { task, cardId, onUpdateTask, onDeleteCard } = data
  const [text, setText] = useState(task?.description || '')

  useEffect(() => {
    setText(task?.description || '')
  }, [task?.description])

  const handleChange = (newVal: string) => {
    setText(newVal)
    onUpdateTask(task.id, { description: newVal })
  }

  return (
    <div className="relative group bg-zinc-900/90 border border-amber-500/30 rounded-xl p-4 min-w-[240px] max-w-[300px] shadow-xl backdrop-blur-md">
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-amber-500 border-2 border-zinc-900" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-amber-500 border-2 border-zinc-900" />

      {/* Card Header */}
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2 text-amber-400 font-space font-medium text-xs">
          <StickyNote size={14} />
          <span>Note Card</span>
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

      {/* Note Textarea */}
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Type task notes or description here..."
        className="w-full h-28 bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-space resize-none nodrag"
      />
    </div>
  )
}
