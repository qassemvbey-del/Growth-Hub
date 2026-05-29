'use client'

import React from 'react'
import { Circle } from 'lucide-react'
import { NeonIcon } from '../NeonIcon'

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
  sendNotification
}: TaskDrawerMetadataProps) {
  return (
    <>
      {/* A. STATUS, WEIGHT, XP & TIMELINE PANEL (LEGACY GRID COMMENTED OUT TO RECLAIM VERTICAL SPACE) */}
      {/*
      <div className="p-5 border border-white/5 bg-zinc-900/40 rounded-xl space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">
          {isRTL ? 'بيانات المهمة // METADATA' : 'TASK METADATA // PROFILE'}
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
        {/* Status Pill */}
        <span 
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-space font-bold border"
          style={{
            borderColor: task.is_completed ? '#10B98130' : `${themeColor}30`,
            backgroundColor: task.is_completed ? '#10B98105' : `${themeColor}05`,
            color: task.is_completed ? '#10B981' : themeColor
          }}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${task.is_completed ? 'bg-emerald-500 shadow-[0_0_6px_#10B981]' : 'bg-amber-500'}`} style={!task.is_completed ? { backgroundColor: themeColor, boxShadow: `0 0 6px ${themeColor}` } : {}} />
          {task.is_completed ? t('completed') : t('inProgress')}
        </span>

        {/* Difficulty Weight Pill */}
        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-mono font-bold border border-white/5 bg-white/[0.02] text-white/80">
          ⚡ {task.weight || 1} / 6
        </span>

        {/* XP Reward Pill */}
        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-mono font-bold border border-teal-500/20 bg-teal-500/5 text-teal-400">
          +{(task.weight || 1) * 10} XP
        </span>

        {/* Deadline Pill */}
        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-mono font-bold border border-white/5 bg-white/[0.02] text-white/70">
          📅 {endDate || (isRTL ? 'غير محدد' : 'NOT SET')}
        </span>
      </div>

      {/* B. ASSIGNEE SECTION (Squad Goals Only) */}
      {isSquad && squadMembers && squadMembers.length > 0 && (
        <div className="p-5 border border-white/5 bg-zinc-900/40 rounded-xl space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">
            {isRTL ? 'المسؤول' : 'ASSIGNED TO'}
          </h3>
          
          <div className="space-y-4">
            {task.assignee ? (
              <div className="flex items-center gap-3 bg-white/[0.02] border border-white/10 p-3 rounded-xl w-full justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {task.assignee.avatar_url ? (
                    <img src={task.assignee.avatar_url} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-bold text-white">
                      {task.assignee.full_name?.charAt(0) || '?'}
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-white truncate">{task.assignee.full_name}</span>
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-wider">{task.assignee.rank || 'ROOKIE'}</span>
                  </div>
                </div>
                
                {/* Only owner can unassign */}
                {(currentUserId === missionOwnerId) && (
                <button
                  type="button"
                  onClick={() => updateTask(task.id, { assigned_to: null, assignee: null })}
                  className="px-3 py-1.5 border border-red-500/30 hover:border-red-500 hover:bg-red-500/10 text-red-400 hover:text-red-300 font-black tracking-widest text-[9px] uppercase rounded-lg transition-colors cursor-pointer"
                >
                  {isRTL ? 'إلغاء التعيين' : 'UNASSIGN'}
                </button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between bg-white/[0.01] border border-dashed border-white/10 p-4 rounded-xl w-full text-center text-white/40 text-xs font-space">
                <span>{isRTL ? 'المهمة غير معينة لأي عضو' : 'No one assigned yet'}</span>
              </div>
            )}
            
            {/* Only owner can assign */}
            {(currentUserId === missionOwnerId) && (
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest font-mono text-zinc-500">
                {isRTL ? 'تعيين عضو:' : 'Assign to:'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
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
                        
                        // Send custom assignee notification
                        if (member.id !== currentUserId) {
                          const senderName = profile?.full_name || 'Operator'
                          const notifTitle = isRTL
                            ? `👤 تم تعيين مهمة جديدة لك`
                            : `👤 New task assigned to you`
                          const notifContent = isRTL
                            ? `${senderName} قام بتعيين مهمة "${task.title}" لك`
                            : `${senderName} assigned you to the task "${task.title}"`
                          sendNotification(member.id, 'reaction', notifTitle, notifContent)
                        }
                      }}
                      className={`flex items-center gap-3 p-2.5 border rounded-xl text-left transition-all duration-300 cursor-pointer min-w-0 w-full ${
                        isAssigned
                          ? "bg-teal-500/10 border-teal-500/50 text-[#14b8a6]"
                          : "bg-white/[0.01] border-white/5 hover:border-white/15 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {member.avatar_url ? (
                        <img src={member.avatar_url} className="w-6 h-6 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] font-bold shrink-0 text-white">
                          {member.full_name?.charAt(0) || '?'}
                        </div>
                      )}
                      <span className="text-xs font-bold truncate flex-1">{member.full_name}</span>
                      {isAssigned && (
                        <NeonIcon icon={Circle} className="shrink-0 w-3.5 h-3.5" style={{ color: '#14b8a6', opacity: 0.7 }} />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
