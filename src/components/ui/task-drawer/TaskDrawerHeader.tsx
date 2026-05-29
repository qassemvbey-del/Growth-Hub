'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Link as LinkIcon, Play, RefreshCw, Circle, X } from 'lucide-react'
import { NeonIcon } from '../NeonIcon'

interface TaskDrawerHeaderProps {
  task: any
  taskTitle: string
  setTaskTitle: (title: string) => void
  themeColor: string
  onComplete: () => void
  onClose: () => void
  startFocus: (title: string, id: string, cupId?: string) => void
  cupId?: string
  currentUserId: string | null
  profile: any
  isRTL: boolean
  t: (key: any) => string
  sendNotification: (targetUserId: string, type: 'mention' | 'reaction', title: string, contentText: string) => Promise<void> | void
  updateTask: (taskId: string, updates: any) => Promise<void> | void
  handleCopyLink: () => void
}

export default function TaskDrawerHeader({
  task,
  taskTitle,
  setTaskTitle,
  themeColor,
  onComplete,
  onClose,
  startFocus,
  cupId,
  currentUserId,
  profile,
  isRTL,
  t,
  sendNotification,
  updateTask,
  handleCopyLink
}: TaskDrawerHeaderProps) {
  return (
    <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.01] shrink-0">
      <div className="flex-1 min-w-0">
        {/* <div className="flex items-center gap-2">
          <span 
            className="text-[10px] uppercase font-mono tracking-widest font-black"
            style={{ color: themeColor }}
          >
            TASK ID: #{task.id?.substring(0, 8) || 'LOCAL'}
          </span>
          <button
            onClick={handleCopyLink}
            className="p-1 hover:text-white transition-colors cursor-pointer"
            title="COPY LINK"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </button>
        </div> */}
        {/* Legacy input commented out to allow for wrapping title */}
        {/* <input
          type="text"
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          onBlur={() => {
            if (taskTitle.trim() && taskTitle !== task.title) {
              updateTask(task.id, { title: taskTitle.trim() })
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur()
            }
          }}
          className="text-xl font-bold font-space text-[#FFFFFF] tracking-tight uppercase bg-transparent w-full border-none focus:outline-none focus:ring-0 p-0 mt-1"
          placeholder={isRTL ? "اسم المهمة..." : "Task Name..."}
        /> */}
        <textarea
          rows={1}
          value={taskTitle}
          onChange={(e) => {
            setTaskTitle(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = `${e.target.scrollHeight}px`
          }}
          onBlur={() => {
            if (taskTitle.trim() && taskTitle !== task.title) {
              updateTask(task.id, { title: taskTitle.trim() })
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              e.currentTarget.blur()
            }
          }}
          className="text-lg/snug font-bold font-space text-[#FFFFFF] tracking-tight uppercase bg-transparent w-full border-none focus:outline-none focus:ring-0 p-0 mt-1 resize-none overflow-hidden break-words whitespace-normal"
          placeholder={isRTL ? "اسم المهمة..." : "Task Name..."}
        />
      </div>
      
      <div className="flex items-center gap-3 ml-4 shrink-0">
        {/* Focus and Complete buttons moved to Sticky Thumb-Zone Footer in TaskDrawer.tsx */}
        {/* Legacy header action buttons commented out to prevent squishing */}
        {/*
        {!task.is_completed && (
          <button
            type="button"
            onClick={() => {
              startFocus(task.title, task.id, cupId)
              onClose()
            }}
            className="px-3.5 py-2 rounded-lg text-[9px] font-space font-black tracking-widest cursor-pointer transition-all border flex items-center gap-1.5 hover:scale-105 bg-orange-500/10 border-orange-500/30 text-orange-500 hover:bg-orange-500/20"
            title="START FOCUS"
          >
            <Play className="w-3 h-3 fill-current" />
            <span className="hidden sm:inline">{isRTL ? 'تركيز' : 'FOCUS'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            onComplete()
            const assigneeId = task.assigned_to
            if (assigneeId && assigneeId !== currentUserId) {
              const senderName = profile?.full_name || 'Operator'
              const nextStatusEn = task.is_completed ? "set your task to incomplete" : "completed your task"
              const nextStatusAr = task.is_completed ? "تغيير مهمتك لغير مكتملة" : "أكمل مهمتك المعينة"
              
              const notifTitle = isRTL
                ? `✅ ${senderName} قام بـ ${nextStatusAr}`
                : `✅ ${senderName} ${nextStatusEn}`
              const notifContent = isRTL
                ? `${senderName} قام بـ ${nextStatusAr} في مهمتك المعينة "${task.title}"`
                : `${senderName} ${nextStatusEn} "${task.title}"`
                
              sendNotification(assigneeId, 'reaction', notifTitle, notifContent)
            }
            onClose()
          }}
          className="px-3.5 py-2 rounded-lg text-[9px] font-space font-black tracking-widest cursor-pointer transition-all border flex items-center gap-1.5 hover:scale-105"
          style={{
            backgroundColor: task.is_completed ? 'transparent' : themeColor,
            borderColor: themeColor,
            color: task.is_completed ? themeColor : '#000000',
            boxShadow: task.is_completed ? 'none' : `0 0 10px ${themeColor}40`
          }}
        >
          {task.is_completed ? <NeonIcon icon={RefreshCw} className="w-3 h-3 animate-spin" /> : <NeonIcon icon={Circle} className="w-3 h-3 opacity-50" />}
          <span className="hidden sm:inline">{task.is_completed ? t('markIncomplete') : t('markCompleted')}</span>
        </button>
        */}

        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center border border-white/10 hover:border-white/20 bg-white/[0.02] text-[var(--text-secondary)] hover:text-white transition-all cursor-pointer"
          title="CLOSE"
        >
          <X className="w-4.5 h-4.5" />
        </button>
      </div>
    </div>
  )
}
