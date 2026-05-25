'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { usePomodoro } from '@/context/PomodoroContext'
import { Check, Play, Clock, FolderOpen } from 'lucide-react'

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
  cupId?: string
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
  cupId,
  onlineUsers = [],
  currentUserId
}: KanbanBoardProps) {
  const { startFocus } = usePomodoro()
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null)

  const columns = [
    { id: 'to-do', name: isRTL ? 'المعلقة' : 'TO-DO', color: '#06B6D4', glowClass: 'shadow-[0_0_15px_rgba(6,182,212,0.15)] border-cyan-500/20 bg-cyan-950/10 text-cyan-400' },
    { id: 'in-progress', name: isRTL ? 'قيد التنفيذ' : 'IN PROGRESS', color: '#F59E0B', glowClass: 'shadow-[0_0_15px_rgba(245,158,11,0.15)] border-amber-500/20 bg-amber-950/10 text-amber-400' },
    { id: 'review', name: isRTL ? 'المراجعة' : 'REVIEW', color: '#D946EF', glowClass: 'shadow-[0_0_15px_rgba(217,70,239,0.15)] border-fuchsia-500/20 bg-fuchsia-950/10 text-fuchsia-400' },
    { id: 'done', name: isRTL ? 'المكتملة' : 'DONE', color: '#10B981', glowClass: 'shadow-[0_0_15px_rgba(16,185,129,0.15)] border-emerald-500/20 bg-emerald-950/10 text-emerald-400' }
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full pt-4 select-none">
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
              "flex flex-col gap-4 p-4 rounded-2xl min-h-[550px] transition-all duration-300 bg-zinc-950/40 border border-white/5 backdrop-blur-md relative overflow-hidden",
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

            {/* Column Header Banner */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5 shrink-0">
              <span 
                className={cn(
                  "text-[10px] font-space font-black px-3 py-1 rounded-md border tracking-widest uppercase",
                  col.glowClass
                )}
              >
                {col.name}
              </span>
              <span className="font-mono text-xs text-white/30 px-2 py-0.5 rounded-full bg-white/[0.02]">
                {colTasks.length}
              </span>
            </div>

            {/* Tasks Container */}
            <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1 max-h-[600px] scrollbar-thin [&::-webkit-scrollbar]:hidden">
              <AnimatePresence mode='popLayout'>
                {colTasks.map((task) => {
                  const isDragging = draggingTaskId === task.id
                  const taskMinutes = timeStatsMap[task.id] || 0
                  const timeFormatted = taskMinutes >= 60
                    ? `${Math.floor(taskMinutes / 60)}h ${taskMinutes % 60}m`
                    : taskMinutes > 0 ? `${taskMinutes}m` : null

                  const storedProgress = typeof window !== 'undefined' ? parseFloat(localStorage.getItem(`growth_hub_video_progress_${task.id}`) || '0') : 0
                  const storedDuration = typeof window !== 'undefined' ? parseFloat(localStorage.getItem(`growth_hub_video_duration_${task.id}`) || '0') : 0
                  const videoProgress = task.video_progress ?? storedProgress
                  const videoDuration = task.video_duration ?? storedDuration
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
                          "p-4 rounded-xl border cursor-grab active:cursor-grabbing hover:bg-white/5 transition-all shadow-sm flex flex-col gap-3 relative overflow-hidden select-none bg-zinc-900/40 border-white/5",
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

                        {/* Header row: Checkbox + Title + Presence avatars */}
                        <div className="flex items-start justify-between gap-2.5 min-w-0">
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleTask(task.id, task.is_completed)
                              }}
                              className="shrink-0 w-5.5 h-5.5 rounded-full flex items-center justify-center transition-all border-2 mt-0.5 cursor-pointer"
                              style={{
                                backgroundColor: task.is_completed ? themeColor : 'transparent',
                                borderColor: task.is_completed ? themeColor : 'rgba(255,255,255,0.2)',
                                boxShadow: task.is_completed ? `0 0 8px ${themeColor}40` : undefined
                              }}
                            >
                              {task.is_completed && (
                                <Check className="w-3 h-3 text-black stroke-[3px]" />
                              )}
                            </button>
                            
                            <p 
                              className={cn(
                                "text-sm font-space font-bold text-white/90 leading-tight uppercase truncate",
                                task.is_completed && "text-[var(--text-secondary)] opacity-50 line-through"
                              )}
                            >
                              {task.title}
                            </p>
                          </div>

                          {/* Task Viewers Overlapping Avatar Pile */}
                          {taskViewers.length > 0 && (
                            <div className="flex items-center -space-x-1.5 shrink-0 select-none">
                              {taskViewers.map((viewer: any) => (
                                <div
                                  key={viewer.user_id}
                                  className="w-5 h-5 rounded-full border bg-zinc-950 flex items-center justify-center text-[7px] font-space font-black uppercase text-white shadow-md relative overflow-hidden shrink-0 animate-pulse"
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
                                  <span 
                                    className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full border border-black" 
                                    style={{ backgroundColor: viewer.session_color || 'cyan' }} 
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                         {/* Footer Row: Power, Timer or complexity metrics */}
                         <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-2.5">
                           <div className="flex items-center gap-3">
                             {!task.is_completed && (
                               <button
                                 onClick={(e) => {
                                   e.stopPropagation()
                                   startFocus(task.title, task.id, cupId)
                                 }}
                                 className="w-6 h-6 rounded-full bg-orange-500/10 hover:bg-orange-500/25 border border-orange-500/30 text-orange-500 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer z-10 shrink-0"
                                 title={isRTL ? "بدء جلسة التركيز" : "START FOCUS SESSION"}
                               >
                                 <Play className="w-3 h-3 text-orange-500 fill-current" />
                               </button>
                             )}
                             
                             {timeFormatted && (
                               <div className="flex items-center gap-1 text-[10px] font-mono text-white/45">
                                 <Clock className="w-3 h-3" style={{ color: themeColor }} />
                                 {timeFormatted}
                               </div>
                             )}
                           </div>

                           <div className="flex items-center gap-1.5">
                             <ComplexityDashes weight={task.weight} color={themeColor} />
                             <div className="h-2.5 w-[1px] bg-white/10 shrink-0" />
                             <span className="text-[9px] font-mono text-white/40">⚡{task.weight || 3}</span>
                           </div>
                         </div>
                      </div>
                    </motion.div>
                  )
                })}

                {colTasks.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-12 flex flex-col items-center justify-center text-center border border-dashed border-white/5 rounded-xl bg-white/[0.01] text-white/20 select-none"
                  >
                    <FolderOpen className="w-5 h-5 mb-1 opacity-45" />
                    <span className="text-[10px] font-space tracking-widest uppercase">EMPTY</span>
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
