'use client'

import React from 'react'
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
  report: Report | null
  onClose: () => void
  themeColor: string
  isRTL: boolean
}

export default function ReportModal({ report, onClose, themeColor, isRTL }: Props) {
  if (!report) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-white/60 dark:bg-black/80 backdrop-blur-md" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={e => e.stopPropagation()}
          className="w-[calc(100%-2rem)] mx-auto md:max-w-lg bg-white/95 dark:bg-[#050505]/90 backdrop-blur-xl border relative overflow-hidden rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.2)] dark:shadow-[0_0_50px_rgba(0,0,0,0.8)] my-auto max-h-[90vh] flex flex-col"
          style={{ borderColor: `${themeColor}40` }}
        >
          {/* Top Neon Header */}
          <div className="px-6 py-5 border-b flex justify-between items-center border-zinc-200 dark:border-white/10" style={{ borderColor: `${themeColor}20` }}>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined" style={{ color: themeColor }}>description</span>
              <h2 className="font-space font-black uppercase italic tracking-widest text-sm" style={{ color: themeColor }}>
                {report.title}
              </h2>
            </div>
            <button onClick={onClose} className="text-zinc-400 dark:text-white/20 hover:text-zinc-900 dark:hover:text-white transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="p-5 md:p-8 space-y-6 md:space-y-8 font-space overflow-y-auto flex-1 scrollbar-thin">
            {/* Header / Meta */}
            <div className="flex justify-between items-end border-b border-zinc-200 dark:border-white/5 pb-4">
              <div>
                <p className="text-[10px] text-zinc-500 dark:text-white/30 uppercase tracking-[0.3em] font-black">DOCUMENT_TYPE</p>
                <p className="text-xs font-black uppercase italic" style={{ color: themeColor }}>{report.type.replace('_', ' // ')}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-zinc-500 dark:text-white/30 uppercase tracking-[0.3em] font-black">TIMESTAMP</p>
                <p className="text-xs font-black text-zinc-800 dark:text-white/80">{new Date(report.created_at).toLocaleString()}</p>
              </div>
            </div>

            {/* Content Body */}
            <div className="space-y-6">
              {report.content.text && (
                <div className="py-2.5 px-4 bg-black/5 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl">
                  <p className="text-sm font-bold text-zinc-900 dark:text-white/90 whitespace-pre-wrap leading-relaxed" dir="auto">
                    {report.content.text}
                  </p>
                </div>
              )}

              {report.type === 'daily_brief' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="py-2.5 px-4 bg-black/5 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl">
                      <p className="text-[9px] font-black tracking-widest uppercase opacity-40 mb-1">TOTAL_XP</p>
                      <p className="text-2xl font-black italic" style={{ color: themeColor }}>{report.content.total_xp}</p>
                    </div>
                    <div className="py-2.5 px-4 bg-black/5 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl">
                      <p className="text-[9px] font-black tracking-widest uppercase opacity-40 mb-1">PROGRESS</p>
                      <p className="text-2xl font-black italic text-cyan-400">{report.content.overall_progress}%</p>
                    </div>
                  </div>
                </div>
              )}

              {report.type === 'deadline_alert' && (
                <div className="space-y-6">
                  <div className="flex flex-col items-center justify-center py-4 border-2 border-dashed border-[#FF0055]/30 bg-[#FF0055]/5 rounded-xl">
                    <span className="material-symbols-outlined text-4xl text-[#FF0055] animate-pulse">timer</span>
                    <p className="mt-2 text-xs font-black text-[#FF0055] uppercase tracking-widest">CRITICAL_DEADLINE</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="py-2.5 px-4 bg-black/5 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl">
                      <p className="text-[9px] font-black tracking-widest uppercase opacity-40 mb-1">REQUIRED_DAILY</p>
                      <p className="text-2xl font-black text-[#FF0055]">{report.content.tasks_per_day} <span className="text-[10px]">TASKS</span></p>
                    </div>
                    <div className="py-2.5 px-4 bg-black/5 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl">
                      <p className="text-[9px] font-black tracking-widest uppercase opacity-40 mb-1">PROGRESS</p>
                      <p className="text-2xl font-black text-zinc-900 dark:text-white">{report.content.progress}%</p>
                    </div>
                  </div>
                </div>
              )}

              {report.type === 'mission_complete' && (
                <div className="space-y-6">
                   <div className="flex flex-col items-center justify-center py-6 bg-neon-green/10 border border-neon-green/30 rounded-xl" style={{ backgroundColor: `${themeColor}10`, borderColor: `${themeColor}30` }}>
                    <span className="material-symbols-outlined text-5xl mb-2" style={{ color: themeColor }}>workspace_premium</span>
                    <p className="text-sm font-black uppercase tracking-[0.4em] italic" style={{ color: themeColor }}>GOAL_ACCOMPLISHED</p>
                  </div>
                  <div className="py-2.5 px-4 bg-black/5 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl text-center w-full">
                     <p className="text-[9px] font-black tracking-widest uppercase opacity-40 mb-1">XP_REWARD_COLLECTED</p>
                     <p className="text-3xl font-black" style={{ color: themeColor }}>+{report.content.xp_earned || 500}</p>
                  </div>
                  <div className="pt-4 border-t border-zinc-200 dark:border-white/5 text-center">
                    <p className="text-[10px] text-zinc-500 dark:text-white/30 uppercase tracking-widest">STATUS: ARCHIVED_TO_WINS_VAULT</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-6 border-t border-zinc-200 dark:border-white/10 flex justify-between items-center opacity-40">
              <p className="text-[8px] tracking-[0.5em] font-black uppercase italic">GROWTH HUB // ONLINE</p>
              <p className="text-[8px] font-black uppercase">REF: {report.id.slice(0, 8)}</p>
            </div>
          </div>

          {/* Side Glitch Bar */}
          <div className="absolute right-0 top-0 bottom-0 w-1 opacity-20" style={{ backgroundColor: themeColor }} />
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
