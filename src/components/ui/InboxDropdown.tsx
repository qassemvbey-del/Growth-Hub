'use client'

import { Inbox, X, ArrowRight, CheckCheck, AlertCircle, UserPlus, CheckCircle2, Trophy, Bell } from 'lucide-react'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useGrowth } from '@/context/GrowthContext'

interface Report {
  id: string
  type: 'daily_brief' | 'deadline_alert' | 'mission_complete' | 'weekly_review' | 'squad_join_request' | 'squad_join_approved' | 'squad_join_rejected' | 'overdue_task' | 'squad_member_completed_task' | 'rank_up'
  title: string
  content: any
  is_read: boolean
  created_at: string
}

interface Props {
  isOpen: boolean
  reports: Report[]
  onClose: () => void
  onRead: (report: Report) => void
  onMarkAllRead?: () => void
  themeColor: string
}

const stripEmojis = (str?: string | null) => str ? str.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim() : '';

export default function InboxDropdown({ isOpen, reports, onClose, onRead, onMarkAllRead, themeColor }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const { isRTL } = useGrowth()

  if (!isOpen) return null

  // Limit to only 5 most recent notifications
  const filteredReports = reports.filter(r => {
    if (filter === 'unread') return !r.is_read
    if (filter === 'read') return r.is_read
    return true
  }).slice(0, 5)

  const handleNotificationClick = (report: Report) => {
    onRead(report)
    const targetGoalId = report.content?.goal_id || report.content?.cup_id || report.content?.mission_id
    if (targetGoalId) {
      const isSquad = report.type === 'squad_join_request' || report.type === 'squad_member_completed_task' || report.content?.isSquad || report.content?.squadId
      if (isSquad) {
        router.push(`/goals/squad/${targetGoalId}`)
      } else {
        router.push(`/goals/${targetGoalId}`)
      }
    } else {
      router.push('/notifications')
    }
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className={cn(
        "fixed inset-0 w-full h-full max-w-full bg-white/95 dark:bg-[#050505]/95 backdrop-blur-2xl z-[250] flex flex-col overflow-hidden md:absolute md:inset-auto md:top-full md:mt-4 md:w-[90vw] md:max-w-[360px] md:h-auto md:rounded-2xl border border-black/10 dark:border-white/10 shadow-[0_15px_50px_rgba(0,0,0,0.5)]",
        isRTL ? "md:left-0 md:right-auto" : "md:right-0 md:left-auto"
      )}
      style={{ 
        boxShadow: `0 0 30px ${themeColor}15, 0 15px 50px rgba(0,0,0,0.5)`
      }}
    >
      <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Inbox className="text-sm w-3.5 h-3.5" style={{ color: themeColor }} />
            <span className="text-[10px] font-space font-black tracking-[0.2em] uppercase opacity-50">
              {isRTL ? 'الإشعارات' : 'Notifications'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-space font-black bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full shrink-0" style={{ color: themeColor }}>
              {reports.filter(r => !r.is_read).length} {isRTL ? 'غير مقروء' : 'UNREAD'}
            </span>
            {onMarkAllRead && reports.some(r => !r.is_read) && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onMarkAllRead()
                }}
                className="flex items-center gap-1 text-[8px] font-space font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer"
                style={{ color: themeColor }}
                title={isRTL ? 'تحديد الكل كمقروء' : 'Read All'}
              >
                <CheckCheck className="w-3 h-3" />
                {isRTL ? 'قراءة الكل' : 'Read All'}
              </button>
            )}
            <button onClick={onClose} className="p-1 -mr-1 text-black/40 dark:text-white/30 hover:text-black dark:hover:text-white transition-colors cursor-pointer" title={isRTL ? 'إغلاق' : 'Close'}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'all', label: isRTL ? 'الكل' : 'ALL' },
            { id: 'unread', label: isRTL ? 'غير المقروء' : 'UNREAD' },
            { id: 'read', label: isRTL ? 'المقروء' : 'READ' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={cn(
                "px-3 py-1 rounded-full text-[8px] md:text-[9px] font-space font-black uppercase tracking-widest border transition-all hover:scale-[1.03] active:scale-[0.97] cursor-pointer",
                filter === tab.id 
                   ? "bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/20 font-bold" 
                   : "border-transparent text-black/40 dark:text-white/20 hover:text-black/60 dark:hover:text-white/40"
              )}
              style={filter === tab.id ? { color: themeColor, borderColor: `${themeColor}44` } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invisible scrollable container with max-h-96 */}
      <div 
        className="flex-1 md:max-h-96 overflow-y-auto divide-y divide-black/5 dark:divide-white/5"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`
          /* Hide scrollbar for Chrome, Safari and Opera */
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <AnimatePresence initial={false}>
          {filteredReports.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-12 flex flex-col items-center justify-center gap-3 opacity-20"
            >
              <Inbox className="text-4xl w-10 h-10" />
              <p className="text-[10px] font-space font-black uppercase tracking-widest text-center px-4">
                {isRTL 
                  ? `لا يوجد إشعارات في قسم ${filter === 'all' ? 'الكل' : filter === 'unread' ? 'غير المقروء' : 'المقروء'}` 
                  : `NO REPORTS IN ${filter.toUpperCase()}`}
              </p>
            </motion.div>
          ) : (
            filteredReports.map(report => {
              const bodyText = report.content?.text || (typeof report.content === 'string' ? report.content : '')
              const cleanBody = bodyText.replace(/\[(.*?)\]/g, '$1') // Strip brackets

              const getIcon = () => {
                switch (report.type) {
                  case 'deadline_alert':
                  case 'overdue_task':
                    return <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  case 'squad_join_request':
                    return <UserPlus className="w-5 h-5 text-blue-500 shrink-0" />
                  case 'squad_member_completed_task':
                    return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  case 'rank_up':
                    return <Trophy className="w-5 h-5 text-orange-500 shrink-0" />
                  default:
                    return <Bell className="w-5 h-5 text-zinc-500 shrink-0" />
                }
              }

              return (
                <motion.button
                  key={report.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onClick={() => handleNotificationClick(report)}
                  className={cn(
                    "w-full flex gap-3 p-3 hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 last:border-0",
                    isRTL ? "text-right flex-row-reverse" : "text-left flex-row",
                    !report.is_read && "border-l-2 border-orange-500 bg-orange-500/5"
                  )}
                >
                  {getIcon()}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-sm font-bold text-zinc-100 uppercase truncate">
                        {stripEmojis(report.title)}
                      </span>
                      <span className="text-xs text-zinc-500 whitespace-nowrap">
                        {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm text-zinc-400">
                      {stripEmojis(cleanBody || report.title)}
                    </p>
                  </div>
                </motion.button>
              )
            })
          )}
        </AnimatePresence>
      </div>

      <div className="px-5 py-3.5 border-t border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] flex justify-center">
        <button 
          onClick={() => {
            router.push('/notifications')
            onClose()
          }} 
          className="w-full flex items-center justify-center gap-2 py-2 border border-black/10 dark:border-white/10 rounded-xl text-[10px] font-space font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 hover:bg-white/5 transition-all cursor-pointer"
        >
          {isRTL ? 'عرض كل الإشعارات' : 'View All Notifications'}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  )
}
