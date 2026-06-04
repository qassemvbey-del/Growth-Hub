'use client'

import React, { useState, useMemo } from 'react'
import Shell from '@/components/layout/Shell'
import { useInbox } from '@/hooks/useInbox'
import { useGrowth } from '@/context/GrowthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Inbox, ArrowLeft, ExternalLink, AlertCircle, UserPlus, CheckCircle2, Trophy, Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function NotificationsPage() {
  const { reports, loading, markAsRead, fetchReports } = useInbox()
  const { isRTL } = useGrowth()
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'ALERTS' | 'SQUAD'>('ALL')
  const router = useRouter()

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (filter === 'UNREAD') return !r.is_read
      if (filter === 'ALERTS') return r.type === 'deadline_alert' || r.type === 'overdue_task'
      if (filter === 'SQUAD') return r.type === 'squad_join_request' || r.type === 'squad_member_completed_task'
      return true
    })
  }, [reports, filter])

  const handleMarkAllRead = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    const unread = reports.filter(r => !r.is_read)
    for (const r of unread) {
      await markAsRead(r.id)
    }
    fetchReports()
  }

  return (
    <Shell>
      <div className="w-full min-h-[calc(100vh-64px)] py-8 md:py-12 px-4 max-w-3xl mx-auto font-space space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-black/5 dark:border-white/5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => router.back()} 
                className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h1 className="text-2xl md:text-3xl font-black tracking-wider uppercase text-zinc-900 dark:text-white">
                {isRTL ? 'الإشعارات' : 'NOTIFICATIONS'}
              </h1>
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-white/40 tracking-[0.3em] uppercase font-black">
              {isRTL ? 'إدارة التنبيهات والتقارير اليومية' : 'Manage your notifications and daily briefs'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {reports.some(r => !r.is_read) && (
              <button
                onClick={(e) => handleMarkAllRead(e)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/[0.02] hover:bg-white/5 border border-white/10 text-white/70 font-space font-black uppercase tracking-widest hover:text-white transition-all text-[10px] rounded-xl shrink-0 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                {isRTL ? 'تحديد الكل كمقروء' : 'Mark all as read'}
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`
            .no-scrollbar::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {[
            { id: 'ALL', label: isRTL ? 'الكل' : 'ALL' },
            { id: 'UNREAD', label: isRTL ? 'غير المقروء' : 'UNREAD' },
            { id: 'ALERTS', label: isRTL ? 'التنبيهات' : 'ALERTS' },
            { id: 'SQUAD', label: isRTL ? 'الفريق' : 'SQUAD' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap",
                filter === tab.id 
                  ? "bg-orange-500 text-white" 
                  : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {loading ? (
            <div className="py-24 text-center text-zinc-500 animate-pulse uppercase tracking-widest text-xs font-bold">
              {isRTL ? 'جاري التحميل...' : 'Loading notifications...'}
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 border border-dashed border-zinc-200 dark:border-white/5 rounded-2xl opacity-40">
              <Inbox className="w-10 h-10 stroke-[1.5]" />
              <p className="text-[10px] font-space font-black uppercase tracking-widest text-center px-4">
                {isRTL 
                  ? `لا توجد تنبيهات في قسم ${filter === 'ALL' ? 'الكل' : filter === 'UNREAD' ? 'غير المقروء' : filter}` 
                  : `No notifications in ${filter}`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {filteredReports.map((report) => {
                  const bodyText = report.content?.text || (typeof report.content === 'string' ? report.content : '')
                  const formattedBody = bodyText.replace(/\[(.*?)\]/g, '$1') // Strip brackets

                  const getIcon = () => {
                    switch (report.type) {
                      case 'deadline_alert':
                      case 'overdue_task':
                        return <AlertCircle className="text-red-500 w-5 h-5 shrink-0" />
                      case 'squad_join_request':
                        return <UserPlus className="text-blue-500 w-5 h-5 shrink-0" />
                      case 'squad_member_completed_task':
                        return <CheckCircle2 className="text-emerald-500 w-5 h-5 shrink-0" />
                      case 'rank_up':
                        return <Trophy className="text-orange-500 w-5 h-5 shrink-0" />
                      default:
                        return <Bell className="text-zinc-500 w-5 h-5 shrink-0" />
                    }
                  }

                  return (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={cn(
                        "bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 flex gap-4 relative",
                        !report.is_read && "border-orange-500/30 bg-orange-500/[0.02]"
                      )}
                    >
                      {getIcon()}
                      
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {!report.is_read && (
                            <span 
                              className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 shadow-[0_0_8px_#f97316]" 
                            />
                          )}
                          <h3 className="text-sm font-bold text-zinc-100 uppercase truncate">
                            {report.title}
                          </h3>
                          <span className="text-[10px] text-zinc-500 uppercase font-mono ml-auto">
                            {new Date(report.created_at).toLocaleDateString()} {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        
                        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                          {formattedBody}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-start">
                        {!report.is_read && (
                          <button
                            onClick={async () => {
                              await markAsRead(report.id)
                              fetchReports()
                            }}
                            className="px-3 py-1 bg-white/[0.02] hover:bg-white/5 border border-white/10 text-white/50 hover:text-white font-space font-black uppercase tracking-widest text-[9px] rounded-lg cursor-pointer"
                          >
                            {isRTL ? 'مقروء' : 'Mark Read'}
                          </button>
                        )}
                        {(report.content?.goal_id || report.content?.cup_id || report.content?.mission_id) && (
                          <button
                            onClick={() => {
                              const targetGoalId = report.content.goal_id || report.content.cup_id || report.content.mission_id
                              router.push(`/goals/${targetGoalId}`)
                            }}
                            className="p-1.5 bg-white/[0.02] hover:bg-white/5 border border-white/10 text-white/50 hover:text-white rounded-lg transition-all cursor-pointer"
                            title={isRTL ? 'الانتقال للهدف' : 'View Goal'}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

      </div>
    </Shell>
  )
}
