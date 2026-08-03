'use client'

import React, { useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Plus, ListTodo, StickyNote, List, ExternalLink, Check } from 'lucide-react'
import { DifficultyVisualizer } from '../DifficultyVisualizer'
import { cn } from '@/lib/utils'

export default function TaskCardNode({ data }: { data: any }) {
  const { task, themeColor = '#10B981', isRTL = false, onInsertCard, onOpenDrawer, onToggleTask } = data
  const [showMenu, setShowMenu] = useState(false)

  const weight = task?.weight || 1
  const isCompleted = task?.is_completed || false

  return (
    <div className="relative group bg-zinc-900/90 border border-white/10 rounded-xl p-4 min-w-[240px] max-w-[300px] shadow-xl backdrop-blur-md transition-all hover:border-teal-500/50">
      {/* Handles for connections */}
      <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-teal-500 border-2 border-zinc-900" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-teal-500 border-2 border-zinc-900" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-teal-500 border-2 border-zinc-900" />

      {/* Task Card Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Completion Checkbox */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleTask?.(task.id)
            }}
            className={cn(
              "w-4 h-4 rounded border flex items-center justify-center shrink-0 cursor-pointer transition-all hover:scale-110 nodrag",
              isCompleted 
                ? "bg-emerald-500 border-emerald-500 text-black font-bold" 
                : "border-white/30 hover:border-teal-400 bg-black/20"
            )}
            title={isCompleted ? (isRTL ? "تحديد كغير مكتمل" : "Mark as Incomplete") : (isRTL ? "تحديد كمكتمل" : "Mark as Done")}
          >
            {isCompleted && <Check size={11} className="stroke-[3]" />}
          </button>

          <h4 
            className={cn(
              "font-space font-semibold text-sm truncate cursor-pointer hover:text-teal-400 nodrag",
              isCompleted ? "line-through text-zinc-400" : "text-white"
            )} 
            onClick={() => onOpenDrawer?.(task)}
          >
            {task?.title || 'Untitled Task'}
          </h4>
        </div>
        <button
          type="button"
          onClick={() => onOpenDrawer?.(task)}
          className="text-zinc-500 hover:text-white transition-colors p-1 cursor-pointer nodrag"
          title="Open Task Drawer"
        >
          <ExternalLink size={14} />
        </button>
      </div>

      {/* Difficulty & XP */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5 text-xs font-mono nodrag">
        <DifficultyVisualizer
          weight={weight}
          color={themeColor}
          interactive={false}
          isCompleted={isCompleted}
          isRTL={isRTL}
          showLabel={true}
          showXp={true}
        />
      </div>

      {/* Edge Hover + Insert Button */}
      <div className="absolute -right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-20 nodrag">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(!showMenu)
          }}
          className="bg-teal-500 text-black hover:bg-teal-400 font-bold px-2 py-1 rounded-full text-[11px] shadow-lg flex items-center gap-1 cursor-pointer transition-all hover:scale-105 nodrag"
        >
          <Plus size={12} />
          <span>Insert</span>
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <div 
            className="absolute left-full top-0 ml-2 w-44 bg-zinc-900 border border-white/10 rounded-lg shadow-2xl p-1 z-50 text-xs font-space nodrag"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                onInsertCard?.(task.id, 'checklist')
                setShowMenu(false)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-zinc-300 hover:text-white hover:bg-white/10 rounded-md transition-colors text-left cursor-pointer nodrag"
            >
              <ListTodo size={14} className="text-teal-400" />
              <span>Checklist Card</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onInsertCard?.(task.id, 'note')
                setShowMenu(false)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-zinc-300 hover:text-white hover:bg-white/10 rounded-md transition-colors text-left cursor-pointer nodrag"
            >
              <StickyNote size={14} className="text-amber-400" />
              <span>Note Card</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onInsertCard?.(task.id, 'list')
                setShowMenu(false)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-zinc-300 hover:text-white hover:bg-white/10 rounded-md transition-colors text-left cursor-pointer nodrag"
            >
              <List size={14} className="text-purple-400" />
              <span>List Card</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
