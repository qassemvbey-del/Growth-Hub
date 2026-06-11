'use client'

import React, { useState } from 'react'
import { Circle, Calendar, CalendarPlus } from 'lucide-react'
import { NeonIcon } from '../NeonIcon'
import { cn } from '@/lib/utils'

const formatDeadline = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return `DUE: ${dateStr.toUpperCase()}`;
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `DUE: ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  } catch (e) {
    return `DUE: ${dateStr.toUpperCase()}`;
  }
}

interface TaskDrawerMetadataProps {
  task: any
  themeColor: string
  isRTL: boolean
  t: (key: any) => string
  endDate: string
  isSquad: boolean
  squadMembers: any[]
  currentUserId: string | null
  missionOwnerId: string | null
  profile: any
  updateTask: (taskId: string, updates: any) => Promise<void> | void
  sendNotification: (targetUserId: string, type: 'mention' | 'reaction', title: string, contentText: string) => Promise<void> | void
  canEdit?: boolean
}

export default function TaskDrawerMetadata({
  task,
  themeColor,
  isRTL,
  t,
  endDate,
  isSquad,
  squadMembers,
  currentUserId,
  missionOwnerId,
  profile,
  updateTask,
  sendNotification,
  canEdit = true
}: TaskDrawerMetadataProps) {
  const [showAssignDropdown, setShowAssignDropdown] = useState(false)
  return (
    <>
      {/* A. STATUS, WEIGHT, XP & TIMELINE PANEL (LEGACY GRID COMMENTED OUT TO RECLAIM VERTICAL SPACE) */}
      {/*
      <div className="p-5 border border-white/5 bg-zinc-900/40 rounded-xl space-y-4">
        <h3 className="text-[10px] font-medium text-zinc-500 font-mono">
          {isRTL ? 'بيانات المهمة - Metadata' : 'Task Metadata'}
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex flex-col space-y-1">
            <span className="text-[10px] text-white/40 uppercase font-mono">{t('currentStatus')}</span>
            <span className="text-sm font-bold font-space flex items-center gap-1.5" style={{ color: task.is_completed ? '#10B981' : themeColor }}>
              <span className={`w-2 h-2 rounded-full ${task.is_completed ? 'bg-emerald-500' : 'bg-amber-500'}`} style={!task.is_completed ? { backgroundColor: themeColor } : {}} />
              {task.is_completed ? t('completed') : t('inProgress')}
            </span>
          </div>
          
          <div className="flex flex-col space-y-1">
            <span className="text-[10px] text-white/40 uppercase font-mono">{t('taskWeight')}</span>
            <span className="text-sm font-mono font-bold" style={{ color: themeColor }}>
              ⚡ {task.weight || 1} / 6
            </span>
          </div>

          <div className="flex flex-col space-y-1">
            <span className="text-[10px] text-white/40 uppercase font-mono">{isRTL ? 'المكافأة' : 'XP REWARD'}</span>
            <span className="text-sm font-mono font-bold text-teal-400">
              +{ (task.weight || 1) * 10 } XP
            </span>
          </div>

          <div className="flex flex-col space-y-1">
            <span className="text-[10px] text-white/40 uppercase font-mono">{isRTL ? 'الموعد' : 'DEADLINE'}</span>
            <span className="text-xs font-mono font-bold text-white/80">
              {endDate || (isRTL ? 'غير محدد' : 'NOT SET')}
            </span>
          </div>
        </div>
      </div>
      */}

      {/* Redesigned Compact Inline Metadata Pills */}
      <div className="flex flex-wrap gap-2 text-xs">


        {/* Difficulty Weight Pill */}
        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md font-mono font-bold border border-white/5 bg-white/[0.02] text-white/80">
          ⚡ {task.weight || 1} / 6
        </span>

        {/* XP Reward Pill */}
        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md font-mono font-bold border border-teal-500/20 bg-teal-500/5 text-teal-400">
          +{(task.weight || 1) * 10} XP
        </span>

        {/* Deadline Pill */}
        {/* <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md font-mono font-bold border border-white/5 bg-white/[0.02] text-white/70">
          📅 {endDate || (isRTL ? 'غير محدد' : 'NOT SET')}
        </span> */}
        {(() => {
          // const hasDate = !!endDate
          // const isOverdue = (() => {
          //   if (!endDate || task.is_completed) return false
          //   const tDate = new Date(endDate)
          //   tDate.setHours(0,0,0,0)
          //   const todayDate = new Date()
          //   todayDate.setHours(0,0,0,0)
          //   return tDate < todayDate
          // })()
          // const displayVal = hasDate ? formatDeadline(endDate) : (isRTL ? 'تحديد موعد' : 'SET DEADLINE')
          const taskDeadline = endDate || task.metadata?.endDate || task.metadata?.dueDate || task.deadline || task.metadata?.deadline
          const hasDate = !!taskDeadline && taskDeadline !== "NOT SET" && taskDeadline !== "SET DEADLINE" && taskDeadline !== "غير محدد" && taskDeadline !== "تحديد موعد"
          const isOverdue = (() => {
            if (!hasDate || task.is_completed) return false
            const tDate = new Date(taskDeadline)
            tDate.setHours(0,0,0,0)
            const todayDate = new Date()
            todayDate.setHours(0,0,0,0)
            return tDate < todayDate
          })()
          const displayVal = hasDate ? formatDeadline(taskDeadline) : (isRTL ? 'تحديد موعد' : 'SET DEADLINE')

          return (
            <div className="flex items-center gap-2 relative z-[9999]">
              <label 
                className={cn(
                  "relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono font-bold border transition-all shrink-0 select-none",
                  isOverdue
                    ? "bg-red-500/10 border-red-500 text-red-500 font-bold"
                    : "border-white/5 bg-white/[0.02] text-white/70",
                  canEdit && "hover:bg-white/[0.05] hover:text-white cursor-pointer"
                )}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{displayVal}</span>
                {canEdit && (
                  <input
                    type="date"
                    disabled={!canEdit}
                    value={taskDeadline ? String(taskDeadline).substring(0, 10) : ''}
                    onChange={async (e) => {
                      const selectedDate = e.target.value
                      const updatedMetadata = { ...task.metadata, endDate: selectedDate }
                      await updateTask(task.id, { metadata: updatedMetadata })
                    }}
                    className="absolute inset-0 z-10 w-full h-full opacity-0 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (typeof e.currentTarget.showPicker === 'function') {
                        try {
                          e.currentTarget.showPicker()
                        } catch (err) {}
                      }
                    }}
                  />
                )}
              </label>

              {hasDate && (
                <button
                  type="button"
                  onClick={() => {
                    const cleanDate = String(taskDeadline).replace(/-/g, '').substring(0, 8)
                    const dates = `${cleanDate}T230000/${cleanDate}T235900`
                    const title = encodeURIComponent(`[Growth Hub] ${task.title}`)
                    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://playgrowthhub.com'
                    const details = encodeURIComponent(`You have a task due today. Click here to open: ${appUrl}/goals/squad/${task.goal_id}`)
                    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=Growth_Hub`
                    window.open(googleUrl, '_blank')
                  }}
                  className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Export deadline to Google Calendar"
                >
                  <CalendarPlus size={14} />
                </button>
              )}
            </div>
          )
        })()}
      </div>

      {/* B. ASSIGNEE SECTION (Squad Goals Only) */}
      {isSquad && squadMembers && squadMembers.length > 0 && (
        /*
        OLD BULKY LAYOUT (PRESERVED):
        <div className="p-5 border border-white/5 bg-transparent dark:bg-white/5 rounded-md space-y-4">
          <h3 className="text-[10px] font-medium text-zinc-500 font-mono">
            {isRTL ? 'المسؤول' : 'Assigned To'}
          </h3>
          ...
        </div>
        */
        <div className="p-3 border border-white/5 bg-transparent dark:bg-white/5 rounded-md flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-zinc-500 font-mono">
              {isRTL ? 'المسؤول:' : 'Assigned To:'}
            </span>
            {task.assignee ? (
              <div className="flex items-center gap-2">
                {task.assignee.avatar_url ? (
                  <img src={task.assignee.avatar_url} className="w-5 h-5 rounded-full object-cover border border-white/10" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[9px] font-bold text-white">
                    {task.assignee.full_name?.charAt(0) || '?'}
                  </div>
                )}
                <span className="text-xs font-bold text-white truncate max-w-[120px]">{task.assignee.full_name}</span>
                {(currentUserId === missionOwnerId) && (
                  <button
                    type="button"
                    onClick={async () => {
                      const prevAssigneeId = task.assigned_to
                      await updateTask(task.id, { assigned_to: null, assignee: null })
                      if (prevAssigneeId && prevAssigneeId !== currentUserId) {
                        const senderName = profile?.full_name || 'Operator'
                        const notifTitle = isRTL ? `👤 تم إلغاء تعيين المهمة` : `👤 Task unassigned`
                        const notifContent = isRTL
                          ? `${senderName} ألغى تعيينك من المهمة "${task.title}"`
                          : `${senderName} unassigned you from the task "${task.title}"`
                        await sendNotification(prevAssigneeId, 'reaction', notifTitle, notifContent)
                      }
                    }}
                    className="text-[9px] text-red-400 hover:text-red-300 font-bold ml-1 cursor-pointer"
                  >
                    {isRTL ? 'إلغاء' : 'Remove'}
                  </button>
                )}
              </div>
            ) : (
              <span className="text-xs text-white/40">{isRTL ? 'غير معينة' : 'Unassigned'}</span>
            )}
          </div>
          
          {(currentUserId === missionOwnerId) && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                className="w-full flex items-center justify-between px-2 py-1 border border-white/10 hover:border-white/20 bg-white/[0.02] text-[10px] font-bold text-zinc-400 hover:text-white rounded-md cursor-pointer transition-all"
              >
                <span>{isRTL ? '⚙️ تعيين مسؤول' : '⚙️ Assign Operator'}</span>
                <span className="text-[8px] opacity-60">{showAssignDropdown ? '▲' : '▼'}</span>
              </button>
              
              {showAssignDropdown && (
                <div className="flex flex-wrap gap-1 pt-1 max-h-24 overflow-y-auto">
                  {squadMembers.map((member: any) => {
                    const isAssigned = task.assigned_to === member.id
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => {
                          if (isAssigned) return
                          updateTask(task.id, {
                            assigned_to: member.id,
                            assignee: {
                              id: member.id,
                              full_name: member.full_name,
                              avatar_url: member.avatar_url,
                              rank: member.rank
                            }
                          })
                          if (member.id !== currentUserId) {
                            const senderName = profile?.full_name || 'Operator'
                            const notifTitle = isRTL ? `👤 تم تعيين مهمة جديدة لك` : `👤 New task assigned to you`
                            const notifContent = isRTL
                              ? `${senderName} قام بتعيين مهمة "${task.title}" لك`
                              : `${senderName} assigned you to the task "${task.title}"`
                            sendNotification(member.id, 'reaction', notifTitle, notifContent)
                          }
                        }}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1 border rounded text-[10px] transition-all cursor-pointer min-w-0",
                          isAssigned
                            ? "bg-teal-500/10 border-teal-500/50 text-[#14b8a6]"
                            : "bg-white/[0.01] border-white/5 hover:border-white/15 text-zinc-400 hover:text-white"
                        )}
                      >
                        {member.avatar_url ? (
                          <img src={member.avatar_url} className="w-3.5 h-3.5 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full bg-white/10 flex items-center justify-center text-[7px] font-bold text-white shrink-0">
                            {member.full_name?.charAt(0) || '?'}
                          </div>
                        )}
                        <span className="truncate max-w-[80px]">{member.full_name}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}
