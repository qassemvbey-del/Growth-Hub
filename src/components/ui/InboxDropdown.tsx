'use client'

import { Inbox, X } from 'lucide-react'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useGrowth } from '@/context/GrowthContext'

interface Report {
  id: string
  type: 'daily_brief' | 'deadline_alert' | 'mission_complete' | 'weekly_review' | 'squad_join_request' | 'squad_join_approved' | 'squad_join_rejected'
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
  themeColor: string
}

export default function InboxDropdown({ isOpen, reports, onClose, onRead, themeColor }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const { isRTL } = useGrowth()

  if (!isOpen) return null

  const filteredReports = reports.filter(r => {
    if (filter === 'unread') return !r.is_read
    if (filter === 'read') return r.is_read
    return true
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className={cn(
        "fixed inset-0 w-full h-full max-w-full bg-white/95 dark:bg-[#050505]/95 backdrop-blur-2xl z-[250] flex flex-col overflow-hidden md:absolute md:inset-auto md:top-full md:mt-4 md:w-[90vw] md:max-w-[360px] md:h-auto md:rounded-sm border border-black/10 dark:border-white/10 shadow-[0_15px_50px_rgba(0,0,0,0.5)]",
        isRTL ? "md:left-0 md:right-auto" : "md:right-0 md:left-auto"
      )}
      style={{ 
        boxShadow: `0 0 30px ${themeColor}15, 0 15px 50px rgba(0,0,0,0.5)`
      }}
    >
      {/* Corner accents */}
      <div className="absolute top-0 right-0 w-1 h-1" style={{ backgroundColor: themeColor }} />
      <div className="absolute bottom-0 left-0 w-1 h-1" style={{ backgroundColor: themeColor }} />

      <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Inbox className="text-sm w-3.5 h-3.5" style={{ color: themeColor }} />
            <span className="text-[10px] font-space font-black tracking-[0.2em] uppercase opacity-50">
              {isRTL ? 'صندوق الوارد // الإشعارات' : 'NOTIFICATION INBOX'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-space font-black bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full shrink-0" style={{ color: themeColor }}>
              {reports.filter(r => !r.is_read).length} {isRTL ? 'غير مقروء' : 'UNREAD'}
            </span>
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
                "px-3 py-1 rounded-full text-[8px] md:text-[9px] font-space font-black uppercase tracking-widest border transition-all hover:scale-[1.03] active:scale-[0.97]",
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

      <div className="flex-1 md:max-h-[350px] overflow-y-auto scrollbar-thin divide-y divide-black/5 dark:divide-white/5">
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
            filteredReports.map(report => (
              <motion.button
                key={report.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onClick={() => onRead(report)}
                className={cn(
                  "w-full px-5 py-4 flex flex-col gap-1 transition-all",
                  isRTL ? "text-right" : "text-left",
                  !report.is_read 
                    ? "bg-black/[0.02] dark:bg-white/5 hover:bg-black/[0.04] dark:hover:bg-white/10" 
                    : "hover:bg-black/[0.02] dark:hover:bg-white/5"
                )}
              >
                <div className="flex justify-between items-center gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {!report.is_read && (
                      <div 
                        className="w-1.5 h-1.5 rounded-full shrink-0 shadow-[0_0_8px_currentcolor]" 
                        style={{ backgroundColor: themeColor, color: themeColor }} 
                      />
                    )}
                    <span 
                      className="text-[11px] font-space font-bold uppercase tracking-tight truncate max-w-[200px]" 
                      style={{ color: !report.is_read ? themeColor : 'inherit' }}
                    >
                      {report.title}
                    </span>
                  </div>
                  <span className="text-[8px] font-space text-black/30 dark:text-white/20 shrink-0">
                    {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[11px] font-space text-black/60 dark:text-white/50 truncate w-full mt-0.5">
                  {report.type === 'daily_brief' ? (
                    isRTL 
                      ? `المهام المكتملة اليوم: ${report.content.completed_count}` 
                      : `Tasks completed today: ${report.content.completed_count}`
                  ) : report.type === 'deadline_alert' ? (
                    isRTL 
                      ? `اقتراب الموعد النهائي: ${report.content.mission_title}` 
                      : `Deadline approaching: ${report.content.mission_title}`
                  ) : report.type === 'weekly_review' ? (
                    isRTL 
                      ? `الحصاد الأسبوعي // نقاط الخبرة: +${report.content.gained_xp || report.content.total_xp || 0}` 
                      : `Weekly review // XP: +${report.content.gained_xp || report.content.total_xp || 0}`
                  ) : report.type === 'squad_join_request' ? (
                    isRTL 
                      ? `طلب انضمام من ${report.content.requester_name} لـ ${report.content.goal_title}` 
                      : `Join request from ${report.content.requester_name} for ${report.content.goal_title}`
                  ) : report.type === 'squad_join_approved' ? (
                    isRTL 
                      ? `تمت الموافقة على انضمامك لـ ${report.content.goal_title}` 
                      : `Approved: your request to join ${report.content.goal_title}`
                  ) : report.type === 'squad_join_rejected' ? (
                    isRTL 
                      ? `تم رفض انضمامك لـ ${report.content.goal_title}` 
                      : `Rejected: your request to join ${report.content.goal_title}`
                  ) : (
                    isRTL 
                      ? `اكتملت المهمة: ${report.content.mission_title || report.content.mission_name}` 
                      : `Goal completed: ${report.content.mission_title || report.content.mission_name}`
                  )}
                </p>
              </motion.button>
            ))
          )}
        </AnimatePresence>
      </div>

      <div className="px-5 py-3 border-t border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] flex justify-center">
        <button 
          onClick={() => {
            router.push('/achievements')
            onClose()
          }} 
          className="text-[9px] font-space font-black uppercase tracking-widest text-black/30 dark:text-white/20 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
        >
          {isRTL ? 'عرض جميع الإشعارات والتقارير' : 'VIEW ALL NOTIFICATIONS & REPORTS'}
        </button>
      </div>
    </motion.div>
  )
}
