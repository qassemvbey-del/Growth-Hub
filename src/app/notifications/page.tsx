'use client'

import React, { useState, useMemo } from 'react'
import Shell from '@/components/layout/Shell'
import { useInbox, Report } from '@/hooks/useInbox'
import { useGrowth } from '@/context/GrowthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Check, Inbox, Trash2, ArrowLeft, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function NotificationsPage() {
  const { reports, loading, markAsRead, fetchReports } = useInbox()
  const { isRTL, currentTheme } = useGrowth()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const router = useRouter()

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (filter === 'unread') return !r.is_read
      return true
    })
  }, [reports, filter])

  const handleMarkAllRead = async () => {
    const unread = reports.filter(r => !r.is_read)
    for (const r of unread) {
      await markAsRead(r.id)
    }
    fetchReports()
  }

  // Determine standard title icons based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'deadline_alert':
        return '📅'
      case 'mission_complete':
        return '✅'
      case 'weekly_review':
        return '📊'
      default:
        return '✉️'
    }
  }

  return (
    <Shell>
      <div className="w-full min-h-[calc(100vh-64px)] py-8 md:py-12 px-4 md:px-12 max-w-4xl mx-auto font-space space-y-8">
        
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
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/[0.02] hover:bg-white/5 border border-white/10 text-white/70 font-space font-black uppercase tracking-widest hover:text-white transition-all text-[10px] rounded-xl shrink-0 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                {isRTL ? 'تحديد الكل كمقروء' : 'Mark all as read'}
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex gap-2">
          {[
            { id: 'all', label: isRTL ? 'الكل' : 'ALL' },
            { id: 'unread', label: isRTL ? 'غير المقروء' : 'UNREAD' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-space font-black uppercase tracking-widest border transition-all hover:scale-[1.03] active:scale-[0.97] cursor-pointer",
                filter === tab.id 
                  ? "bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/20 font-bold" 
                  : "border-transparent text-black/40 dark:text-white/40 hover:text-black/60 dark:hover:text-white/60"
              )}
              style={filter === tab.id ? { color: currentTheme.color, borderColor: `${currentTheme.color}44` } : {}}
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
                  ? `لا توجد تنبيهات في قسم ${filter === 'all' ? 'الكل' : 'غير المقروء'}` 
                  : `No notifications in ${filter.toUpperCase()}`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-black/5 dark:divide-white/5 border border-black/5 dark:border-white/5 rounded-2xl overflow-hidden bg-white/[0.01] dark:bg-black/[0.01] backdrop-blur-md">
              <AnimatePresence initial={false}>
                {filteredReports.map((report) => {
                  const bodyText = report.content?.text || (typeof report.content === 'string' ? report.content : '')
                  const formattedBody = bodyText.replace(/\[(.*?)\]/g, '$1') // Strip brackets

                  return (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={cn(
                        "p-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 transition-all hover:bg-black/[0.01] dark:hover:bg-white/[0.01]",
                        !report.is_read && "bg-black/[0.01] dark:bg-white/[0.02]"
                      )}
                    >
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {!report.is_read && (
                            <span 
                              className="w-2 h-2 rounded-full shrink-0 shadow-[0_0_8px_currentcolor]" 
                              style={{ backgroundColor: currentTheme.color, color: currentTheme.color }} 
                            />
                          )}
                          <span className="text-base shrink-0">{getNotificationIcon(report.type)}</span>
                          <h3 
                            className="text-sm font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 truncate"
                            style={!report.is_read ? { color: currentTheme.color } : {}}
                          >
                            {report.title}
                          </h3>
                          <span className="text-[9px] font-mono text-zinc-500 uppercase">
                            {new Date(report.created_at).toLocaleDateString()} at {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-white/60 whitespace-pre-line leading-relaxed">
                          {formattedBody}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
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
                        {(report.content?.cup_id || report.content?.mission_id) && (
                          <button
                            onClick={() => {
                              router.push(`/missions/${report.content.cup_id || report.content.mission_id}`)
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
