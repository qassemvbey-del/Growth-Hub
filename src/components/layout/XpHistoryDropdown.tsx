'use client'

import React, { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Zap, X, ShieldAlert, Clock, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface XpLogEntry {
  id: string
  amount: number
  base_amount: number
  reason: string
  reason_code: string
  created_at: string
  task_id?: string | null
}

interface XpHistoryDropdownProps {
  isOpen: boolean
  onClose: () => void
  themeColor: string
  totalXp: number
  isRTL: boolean
}

export function XpHistoryDropdown({
  isOpen,
  onClose,
  themeColor,
  totalXp,
  isRTL
}: XpHistoryDropdownProps) {
  const [logs, setLogs] = useState<XpLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch XP logs on open
  useEffect(() => {
    if (!isOpen) return

    const fetchLogs = async () => {
      setIsLoading(true)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
          .from('xp_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(30)

        if (!error && data) {
          setLogs(data as XpLogEntry[])
        }
      } catch (err) {
        console.error('Failed to fetch XP logs:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLogs()
  }, [isOpen])

  // Handle Outside Click & Escape Key
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const formatRelativeTime = (isoString: string) => {
    const now = new Date().getTime()
    const past = new Date(isoString).getTime()
    const diffSecs = Math.floor((now - past) / 1000)

    if (diffSecs < 60) return isRTL ? 'الآن' : 'Just now'
    const diffMins = Math.floor(diffSecs / 60)
    if (diffMins < 60) return isRTL ? `منذ ${diffMins} د` : `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return isRTL ? `منذ ${diffHours} س` : `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return isRTL ? 'أمس' : 'Yesterday'
    if (diffDays < 7) return isRTL ? `منذ ${diffDays} أ` : `${diffDays}d ago`
    return new Date(isoString).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })
  }

  const getReasonBadge = (code: string) => {
    switch (code) {
      case 'overdue_decay_50':
        return {
          label: isRTL ? 'متأخرة (-50%)' : 'Late (-50%)',
          className: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          icon: Clock
        }
      case 'overdue_decay_25':
        return {
          label: isRTL ? 'متأخرة (-75%)' : 'Late (-75%)',
          className: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
          icon: Clock
        }
      case 'spam_blocked':
        return {
          label: isRTL ? 'تم حظر السبام' : 'Spam Blocked',
          className: 'bg-zinc-800 text-zinc-400 border-zinc-700',
          icon: ShieldAlert
        }
      case 'task_uncompleted':
        return {
          label: isRTL ? 'ملغاة' : 'Undone',
          className: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          icon: RotateCcw
        }
      case 'task_completed':
      default:
        return {
          label: isRTL ? 'مكتملة' : 'Completed',
          className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          icon: CheckCircle2
        }
    }
  }

  return (
    <div
      ref={dropdownRef}
      className={cn(
        "absolute top-full mt-2 w-80 sm:w-96 bg-[var(--card)] dark:bg-zinc-950/95 border border-[var(--border)] dark:border-zinc-800 rounded-xl shadow-2xl backdrop-blur-xl z-[160] overflow-hidden font-space transition-all animate-in fade-in zoom-in-95 duration-150",
        isRTL ? "left-0 sm:left-auto right-0 sm:right-auto" : "right-0"
      )}
    >
      {/* Panel Header */}
      <div className="p-4 border-b border-[var(--border)] dark:border-zinc-800/80 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Zap className="w-4 h-4" style={{ color: themeColor }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] dark:text-white uppercase tracking-wider">
              {isRTL ? 'سجل نقاط الخبرة' : 'XP History'}
            </h3>
            <p className="text-[10px] text-[var(--text-secondary)] dark:text-zinc-400 font-mono">
              {isRTL ? 'إجمالي النقاط المسجلة' : 'Recorded total XP transactions'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-mono font-bold text-white">
            <span className="text-[10px] text-zinc-400 uppercase mr-1">Total:</span>
            <span style={{ color: themeColor }}>{totalXp}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-white/5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Logs List */}
      <div className="max-h-80 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="py-8 text-center text-xs text-zinc-500 animate-pulse font-mono">
            {isRTL ? 'جاري تحميل السجل...' : 'Loading history...'}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-8 px-4 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
              <Zap className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-zinc-400 max-w-[220px] mx-auto">
              {isRTL
                ? 'أكمل أول مهمة لك لبدء كسب نقاط الخبرة'
                : 'Complete your first task to start earning XP'}
            </p>
          </div>
        ) : (
          logs.map((log) => {
            const badge = getReasonBadge(log.reason_code)
            const BadgeIcon = badge.icon
            const isPositive = log.amount > 0
            const isZero = log.amount === 0

            return (
              <div
                key={log.id}
                className="p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 transition-colors flex items-center justify-between gap-3 text-start"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--text-primary)] dark:text-zinc-100 truncate block">
                      {log.reason}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-mono border inline-flex items-center gap-1", badge.className)}>
                      <BadgeIcon className="w-2.5 h-2.5" />
                      {badge.label}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {formatRelativeTime(log.created_at)}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={cn(
                      "text-xs font-mono font-black tracking-wider block",
                      isPositive ? "text-emerald-400" : isZero ? "text-zinc-500" : "text-rose-400"
                    )}
                  >
                    {isPositive ? `+${log.amount}` : log.amount} XP
                  </span>
                  {log.base_amount > 0 && log.amount !== log.base_amount && log.amount > 0 && (
                    <span className="text-[9px] font-mono text-zinc-500 line-through block">
                      +{log.base_amount}
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
