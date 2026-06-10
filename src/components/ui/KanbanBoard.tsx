'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { usePomodoro } from '@/context/PomodoroContext'
import { Play, Clock, FolderOpen, Circle, CheckCircle2 } from 'lucide-react'
import { NeonIcon } from './NeonIcon'

interface KanbanBoardProps {
  tasks: any[]
  onMoveTask: (taskId: string, newColumnId: string) => Promise<void> | void
  themeColor: string
  isRTL: boolean
  currentTheme: any
  toggleTask: (taskId: string, currentStatus: boolean) => Promise<void> | void
  setSelectedTask: (task: any | null) => void
  selectedTask: any | null
  timeStatsMap: Record<string, number>
  // cupId?: string
  goalId?: string
  onlineUsers?: any[]
  currentUserId?: string
}

// --- LOCAL HELPER COMPONENT: CYBERPUNK WEIGHT BARS ---
const WeightVisualizer = ({ weight, color, isCompleted = false }: { weight: number, color: string, isCompleted?: boolean }) => {
  const bars = [1, 2, 3, 4, 5, 6]
  return (
    <div className="flex gap-[3px]">
      {bars.map(i => (
        <div
          key={i}
          className={cn(
            "w-[6px] h-[12px] transition-all duration-300 rounded-[1px]",
            i <= weight 
              ? "opacity-100" 
              : "bg-black/10 dark:bg-white/10"
          )}
          style={i <= weight ? { 
            backgroundColor: isCompleted ? 'var(--text-secondary)' : color,
            boxShadow: isCompleted ? 'none' : `0 0 8px ${color}66`
          } : {}}
        />
      ))}
    </div>
  )
}

// --- LOCAL HELPER COMPONENT: COMPLEXITY DASHES ---
const ComplexityDashes = ({ weight, color }: { weight: number; color: string }) => {
  const activeCount = Math.min(5, Math.max(1, weight))
  return (
    <div className="flex gap-[2px] items-center">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`w-2.5 h-[1.5px] rounded-sm transition-all duration-300 ${i < activeCount ? '' : 'bg-white/10'}`}
          style={i < activeCount ? { backgroundColor: color, boxShadow: `0 0 4px ${color}` } : {}}
        />
      ))}
    </div>
  )
}

export default function KanbanBoard({
  tasks,
  onMoveTask,
  themeColor,
  isRTL,
  currentTheme,
  toggleTask,
  setSelectedTask,
  selectedTask,
  timeStatsMap,
  // cupId,
  goalId,
  onlineUsers = [],
  currentUserId
}: KanbanBoardProps) {
  const { startFocus } = usePomodoro()
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null)

  const columns = [
    // { id: 'to-do', name: isRTL ? 'المعلقة' : 'TO-DO', color: '#06B6D4', glowClass: 'shadow-[0_0_15px_rgba(6,182,212,0.15)] border-cyan-500/20 bg-cyan-950/10 text-cyan-400' },
    // { id: 'in-progress', name: isRTL ? 'قيد التنفيذ' : 'IN PROGRESS', color: '#F59E0B', glowClass: 'shadow-[0_0_15px_rgba(245,158,11,0.15)] border-amber-500/20 bg-amber-950/10 text-amber-400' },
    // { id: 'done', name: isRTL ? 'المكتملة' : 'DONE', color: '#10B981', glowClass: 'shadow-[0_0_15px_rgba(16,185,129,0.15)] border-emerald-500/20 bg-emerald-950/10 text-emerald-400' }
    { id: 'to-do', name: isRTL ? 'المعلقة' : 'To Do', color: '#06B6D4', glowClass: 'shadow-[0_0_15px_rgba(6,182,212,0.15)] border-cyan-500/20 bg-cyan-950/10 text-cyan-400' },
    { id: 'in-progress', name: isRTL ? 'قيد التنفيذ' : 'In Progress', color: '#F59E0B', glowClass: 'shadow-[0_0_15px_rgba(245,158,11,0.15)] border-amber-500/20 bg-amber-950/10 text-amber-400' },
    { id: 'done', name: isRTL ? 'المكتملة' : 'Done', color: '#10B981', glowClass: 'shadow-[0_0_15px_rgba(16,185,129,0.15)] border-emerald-500/20 bg-emerald-950/10 text-emerald-400' }
  ]

  const getTaskColumn = (task: any) => {
    if (task.is_completed) return 'done'
    const storedStatus = task.metadata?.status
    // If completed is false but metadata status says done, push back to to-do
    if (storedStatus === 'done') return 'to-do'
    return storedStatus || 'to-do'
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggingTaskId(taskId)
    e.dataTransfer.setData('text/plain', taskId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggingTaskId(null)
    setDragOverColumnId(null)
  }

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    if (dragOverColumnId !== columnId) {
      setDragOverColumnId(columnId)
    }
  }

  const handleDragLeave = () => {
    // We only clear if drag leaves the column container area
  }

  const handleDrop = async (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/plain')
    setDragOverColumnId(null)
    setDraggingTaskId(null)
    if (!taskId) return
    await onMoveTask(taskId, columnId)
  }

  const formatVideoTime = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = Math.floor(secs % 60)
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${m}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="flex md:grid md:grid-cols-3 overflow-x-auto snap-x snap-mandatory gap-4 w-full pb-4 custom-scrollbar items-start">
      {columns.map((col) => {
        const colTasks = tasks.filter(t => getTaskColumn(t) === col.id)
        const isOver = dragOverColumnId === col.id

        return (
          <div
            key={col.id}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.id)}
            className={cn(
              "w-[85vw] md:w-full max-w-[310px] md:max-w-none shrink-0 snap-center flex flex-col h-auto min-h-[52px] max-h-[75vh] rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-[var(--border)] p-2 transition-all overflow-hidden relative",
              isOver ? "border-dashed" : ""
            )}
            style={isOver ? { borderColor: col.color, boxShadow: `0 0 20px ${col.color}22` } : {}}
          >
            {/* Glowing Accent Top Bar for Drag Over Column */}
            {isOver && (
              <div 
                className="absolute top-0 left-0 right-0 h-[2px] transition-all"
                style={{ backgroundColor: col.color, boxShadow: `0 0 10px ${col.color}` }}
              />
            )}

            {/* Column Header Banner (Sticky with Dot Indicator) */}
            <div className="sticky top-0 bg-[var(--background-secondary)]/95 dark:bg-[#09090f]/95 backdrop-blur-md flex items-center justify-between pb-3 border-b border-[var(--border)] dark:border-white/5 shrink-0 z-10 pt-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentcolor]" style={{ backgroundColor: col.color, color: col.color }} />
                <span className="text-[10px] font-space font-bold tracking-widest uppercase text-[var(--text-secondary)] dark:text-zinc-300">
                  {col.name}
                </span>
              </div>
              <span className="font-mono text-xs text-[var(--text-muted)] dark:text-white/30 px-2 py-0.5 rounded-full bg-zinc-200/50 dark:bg-white/[0.02]">
                {colTasks.length}
              </span>
            </div>

            {/* Tasks Container */}
            <div 
              className="flex-1 flex flex-col gap-3 overflow-y-auto scrollbar-thin pr-1"
            >
              <AnimatePresence mode='popLayout'>
                {colTasks.map((task) => {
                  const isDragging = draggingTaskId === task.id
                  const hasVideo = !!(task.video_id || task.video_url)
                  const taskViewers = onlineUsers?.filter((u: any) => u.cursor_task_id === task.id && u.user_id !== currentUserId) || []

                  return (
                    <motion.div
                      key={task.id}
                      layout
                    >
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setSelectedTask(task)}
                        className={cn(
                          "p-3 rounded-lg border cursor-grab active:cursor-grabbing hover:bg-zinc-50 dark:hover:bg-white/5 transition-all shadow-sm flex items-center justify-between gap-2.5 relative overflow-hidden select-none bg-white dark:bg-zinc-900/40 border-[var(--border)] text-[var(--text-primary)] dark:border-white/5 dark:text-zinc-200",
                          isDragging ? "opacity-20 scale-95 border-dashed border-white/20" : "opacity-100",
                          task.is_completed ? "opacity-50" : ""
                        )}
                        style={!isDragging && selectedTask?.id === task.id ? { borderColor: themeColor, boxShadow: `0 0 10px ${themeColor}22` } : {}}
                      >
                        {/* Drag Handle Accent Bar */}
                        <div 
                          className="absolute top-0 bottom-0 left-0 w-[3px]"
                          style={{ backgroundColor: task.is_completed ? 'var(--text-secondary)' : col.color }}
                        />

                        {/* Checkbox + Title */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 pl-1">
                          <span 
                            className={cn(
                              "text-sm font-medium text-[var(--text-primary)] dark:text-zinc-200 truncate",
                              task.is_completed && "text-zinc-500 line-through opacity-55"
                            )}
                          >
                            {task.title}
                          </span>
                        </div>

                        {/* Play icon if video task */}
                        {hasVideo && !task.is_completed && (
                          <Play className="w-3.5 h-3.5 text-zinc-500 shrink-0 mr-1" />
                        )}

                        {/* Task Viewers Overlapping Avatar Pile (Absolute Positioning in Top-Right) */}
                        {taskViewers.length > 0 && (
                          <div className="absolute -top-2 -right-2 flex items-center -space-x-1 shrink-0 select-none z-20">
                            {taskViewers.map((viewer: any) => (
                              <div
                                key={viewer.user_id}
                                className="w-6 h-6 rounded-full border bg-zinc-950 flex items-center justify-center text-[7px] font-space font-black uppercase text-white shadow-md relative overflow-hidden shrink-0 ring-2 ring-cyan-500 animate-pulse z-10"
                                style={{ borderColor: viewer.session_color || 'cyan', boxShadow: `0 0 8px ${viewer.session_color || 'cyan'}55` }}
                                title={`${viewer.full_name || 'CO-OPERATIVE'} is viewing this task`}
                              >
                                {viewer.avatar_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={viewer.avatar_url}
                                    alt={viewer.full_name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span>{viewer.full_name?.substring(0, 2) || 'OP'}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}

                {colTasks.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-2 flex flex-col items-center justify-center text-center border border-dashed border-[var(--border)] dark:border-white/5 rounded-xl bg-zinc-50/50 dark:bg-white/[0.01] text-[var(--text-muted)] dark:text-white/20 select-none"
                  >
                    <FolderOpen className="w-4 h-4 mb-0.5 opacity-45" />
                    <span className="text-[9px] font-space tracking-widest uppercase text-[var(--text-muted)] dark:text-white/20">Empty</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )
      })}
    </div>
  )
}
