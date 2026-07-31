'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import DiamondProgress from './DiamondProgress'
import Avatar from './Avatar'

export type GoalRole = 'OWNER' | 'ADMIN' | 'CO-ADMIN' | 'MEMBER' | 'SOLO'

export const ROLE_BADGE_CONFIG: Record<GoalRole, { label: string; className: string }> = {
  OWNER: {
    label: '👑 Admin',
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  },
  ADMIN: {
    label: '👑 Admin',
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  },
  'CO-ADMIN': {
    label: 'Co-Admin',
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
  },
  MEMBER: {
    label: 'Member',
    className: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20',
  },
  SOLO: {
    label: 'Solo',
    className: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20',
  },
}

export interface GoalMember {
  id: string
  full_name?: string | null
  avatar_url?: string | null
  rank?: string | null
  role?: string | null
}

export interface GoalCardProps {
  id?: string
  title?: string
  completedTasks?: number
  totalTasks?: number
  dueDate?: string | null
  percentage?: number
  color?: string
  isActive?: boolean
  role?: GoalRole | string
  members?: GoalMember[]
  typeFilter?: 'solo' | 'squad'
  onClick?: () => void
  idx?: number
  // Dashed "New goal" card mode
  isDashed?: boolean
  dashedLabel?: string
  onDashedClick?: () => void
}

export default function GoalCard({
  title = '',
  completedTasks = 0,
  totalTasks = 0,
  dueDate = null,
  percentage = 0,
  color,
  isActive = true,
  role = 'SOLO',
  members = [],
  typeFilter = 'squad',
  onClick,
  idx = 0,
  isDashed = false,
  dashedLabel = 'New goal',
  onDashedClick,
}: GoalCardProps) {
  // Dashed Empty / Add New Goal Card
  if (isDashed) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={onDashedClick}
        className={cn(
          "group relative flex flex-col items-center justify-center gap-2 p-4 cursor-pointer overflow-hidden rounded-[12px] min-h-[220px]",
          "border-2 border-dashed border-white/20 dark:border-white/20 light:border-black/20 hover:border-orange-500/40 dark:hover:border-orange-500/50 bg-white/[0.02] dark:bg-white/[0.01] hover:bg-white/[0.05] transition-all duration-150 shadow-none text-center"
        )}
      >
        <div className="w-10 h-10 rounded-full border border-white/20 dark:border-white/20 flex items-center justify-center text-zinc-400 group-hover:text-orange-400 group-hover:border-orange-500/40 transition-colors">
          <Plus className="w-5 h-5" />
        </div>
        <span className="text-sm font-heading font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
          {dashedLabel}
        </span>
      </motion.div>
    )
  }

  // Standard Goal Card
  const normalizedRoleKey: GoalRole =
    typeFilter === 'solo'
      ? 'SOLO'
      : (role?.toString().toUpperCase() as GoalRole) in ROLE_BADGE_CONFIG
      ? (role?.toString().toUpperCase() as GoalRole)
      : 'MEMBER'

  const roleConfig = ROLE_BADGE_CONFIG[normalizedRoleKey] || ROLE_BADGE_CONFIG.MEMBER

  const fmtDate = (d: string | null) => {
    if (!d) return null
    try {
      return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch {
      return null
    }
  }

  const formattedDueDate = fmtDate(dueDate)
  const metaText = `${completedTasks}/${totalTasks} tasks${formattedDueDate ? ` • ${formattedDueDate}` : ''}`

  const maxVisibleAvatars = 3
  const visibleMembers = members.slice(0, maxVisibleAvatars)
  const extraCount = Math.max(0, members.length - maxVisibleAvatars)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: idx * 0.04 }}
      onClick={onClick}
      className={cn(
        "group relative flex flex-col justify-between cursor-pointer overflow-hidden p-4 rounded-[12px]",
        "bg-[var(--card)] border border-white/10 dark:border-white/10 light:border-black/10 hover:-translate-y-0.5 hover:border-orange-500/30 transition-all duration-150 shadow-none text-start min-h-[220px]"
      )}
      style={color ? { borderTop: `3px solid ${color}` } : undefined}
    >
      {/* Card Content Top to Middle */}
      <div className="flex flex-col w-full">
        {/* Top Row: Status Dot + Label (left), Role Badge (right) */}
        <div className="flex items-center justify-between w-full gap-2">
          {/* Status Dot + Label */}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors duration-200",
              isActive
                ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400"
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full inline-block",
                isActive ? "bg-teal-500" : "bg-zinc-400"
              )}
            />
            {isActive ? 'Active' : 'Standby'}
          </span>

          {/* Role Badge */}
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors duration-200",
              roleConfig.className
            )}
          >
            {roleConfig.label}
          </span>
        </div>

        {/* Centered Diamond Progress Indicator */}
        <div className="my-3 flex justify-center w-full">
          <DiamondProgress percentage={percentage} color={color} size="md" />
        </div>

        {/* Goal Title (bold, 15px) */}
        <h3 className="text-[15px] font-heading font-bold text-[var(--text-primary)] truncate w-full text-center">
          {title}
        </h3>

        {/* Meta Line: "X/Y tasks - due date" */}
        <p className="text-xs font-body text-[var(--text-secondary)] text-center mt-1 truncate">
          {metaText}
        </p>

        {/* Thin Linear Progress Bar (4px height) */}
        <div className="w-full h-[4px] bg-zinc-200 dark:bg-zinc-800 rounded-full relative mt-3 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            className="h-full rounded-full absolute top-0 start-0"
            style={{
              backgroundColor: color || (percentage === 100 ? '#14b8a6' : '#f97316'),
            }}
          />
        </div>
      </div>

      {/* Bottom Row: Separated by thin top border */}
      <div className="border-t border-white/10 dark:border-white/10 light:border-black/10 pt-2.5 mt-3 flex items-center justify-between w-full">
        {/* Left: Overlapping Member Avatars */}
        <div className="flex items-center -space-x-1.5">
          {typeFilter === 'solo' || members.length === 0 ? (
            <Avatar name="Solo" size={22} borderClass="border border-zinc-700" />
          ) : (
            <>
              {visibleMembers.map((member) => (
                <Avatar
                  key={member.id}
                  name={member.full_name}
                  avatarUrl={member.avatar_url}
                  size={22}
                  borderClass="border border-zinc-700"
                  title={`${member.full_name || 'Member'}`}
                />
              ))}

              {extraCount > 0 && (
                <div className="w-[22px] h-[22px] rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[8px] font-body font-medium text-teal-400 shrink-0">
                  +{extraCount}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: Member Count Text */}
        <span className="text-[11px] font-body font-medium text-[var(--text-secondary)]">
          {typeFilter === 'solo'
            ? 'Solo Goal'
            : `${members.length} ${members.length === 1 ? 'Member' : 'Members'}`}
        </span>
      </div>
    </motion.div>
  )
}
