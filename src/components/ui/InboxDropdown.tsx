'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Report {
  id: string
  type: 'daily_brief' | 'deadline_alert' | 'mission_complete'
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
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')

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
      className="absolute top-full mt-4 right-0 w-[90vw] max-w-[360px] bg-white/95 dark:bg-[#050505]/95 backdrop-blur-2xl border border-black/10 dark:border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-[250] rounded-sm flex flex-col overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm" style={{ color: themeColor }}>inbox</span>
            <span className="text-[10px] font-space font-black tracking-[0.3em] uppercase opacity-40">COMM_UPLINK // INBOX</span>
          </div>
          <span className="text-[9px] font-space font-black bg-white/10 px-2 py-0.5 rounded-full" style={{ color: themeColor }}>
            {reports.filter(r => !r.is_read).length} UNREAD
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {['all', 'unread', 'read'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={cn(
                "px-3 py-1 rounded-full text-[8px] font-space font-black uppercase tracking-widest border transition-all",
                filter === f 
                  ? "bg-white/10 border-white/20" 
                  : "border-transparent text-white/20 hover:text-white/40"
              )}
              style={filter === f ? { color: themeColor, borderColor: `${themeColor}44` } : {}}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
        {filteredReports.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 opacity-20">
            <span className="material-symbols-outlined text-4xl">inbox_customize</span>
            <p className="text-[10px] font-space font-black uppercase tracking-widest">NO_REPORTS_IN_{filter.toUpperCase()}</p>
          </div>
        ) : (
          filteredReports.map(report => (
            <button
              key={report.id}
              onClick={() => onRead(report)}
              className={cn(
                "w-full px-5 py-4 flex flex-col gap-1 border-b border-black/5 dark:border-white/5 transition-all text-left",
                !report.is_read ? "bg-white/5 dark:bg-white/5" : "hover:bg-white/5 dark:hover:bg-white/5"
              )}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {!report.is_read && (
                    <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentcolor]" style={{ backgroundColor: themeColor, color: themeColor }} />
                  )}
                  <span className="text-[10px] font-space font-black uppercase tracking-tight truncate max-w-[180px]" style={{ color: !report.is_read ? themeColor : 'inherit' }}>
                    {report.title}
                  </span>
                </div>
                <span className="text-[8px] font-space text-black/30 dark:text-white/20 uppercase">
                  {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-[11px] font-space text-black/60 dark:text-white/50 truncate w-full">
                {report.type === 'daily_brief' ? `Tasks completed today: ${report.content.completed_count}` : 
                 report.type === 'deadline_alert' ? `DEADLINE_APPROACHING: ${report.content.mission_title}` :
                 `MISSION_COMPLETE: ${report.content.mission_title}`}
              </p>
            </button>
          ))
        )}
      </div>

      <div className="px-5 py-3 border-t border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] flex justify-center">
        <button onClick={onClose} className="text-[9px] font-space font-black uppercase tracking-widest text-black/30 dark:text-white/20 hover:text-black dark:hover:text-white transition-colors">
          CLOSE_FEED
        </button>
      </div>
    </motion.div>
  )
}
