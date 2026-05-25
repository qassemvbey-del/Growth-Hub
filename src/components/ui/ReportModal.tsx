'use client'

import { Award, Check, CheckCircle2, FileText, Lock, Timer, X, XCircle, Zap } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import { useSound } from '@/context/SoundContext'
import { useRouter } from 'next/navigation'

interface Report {
  id: string
  type: 'daily_brief' | 'deadline_alert' | 'mission_complete' | 'weekly_review' | 'squad_join_request' | 'squad_join_approved' | 'squad_join_rejected'
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
  const [actionStatus, setActionStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const { playDeploy, playError, playBlip } = useSound()
  const router = useRouter()

  useEffect(() => {
    if (report) {
      setActionStatus(report.content?.status || null)
    } else {
      setActionStatus(null)
    }
  }, [report])

  if (!report) return null

  const handleReviewRequest = async (action: 'approve' | 'reject') => {
    if (loading) return
    setLoading(true)
    playBlip()

    try {
      const { data, error } = await supabase.rpc('review_squad_join_request', {
        p_request_id: report.content.request_id,
        p_action: action
      })

      if (error) {
        alert(error.message)
        playError()
        setLoading(false)
        return
      }

      const result = typeof data === 'string' ? JSON.parse(data) : data
      if (result && result.success) {
        setActionStatus(result.status)
        if (action === 'approve') {
          playDeploy()
        } else {
          playError()
        }
      } else {
        alert(result?.error || 'Failed to process request')
        playError()
      }
    } catch (err) {
      playError()
    } finally {
      setLoading(false)
    }
  }

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
              <FileText className="" style={{ color: themeColor }} />
              <h2 className="font-space font-black uppercase tracking-widest text-sm" style={{ color: themeColor }}>
                {report.title}
              </h2>
            </div>
            <button onClick={onClose} className="text-zinc-400 dark:text-white/20 hover:text-zinc-900 dark:hover:text-white transition-colors">
              <X className="" />
            </button>
          </div>

          <div className="p-5 md:p-8 space-y-6 md:space-y-8 font-space overflow-y-auto flex-1 scrollbar-thin">
            {/* Header / Meta */}
            <div className="flex justify-between items-end border-b border-zinc-200 dark:border-white/5 pb-4">
              <div>
                <p className="text-[10px] text-zinc-500 dark:text-white/30 uppercase tracking-[0.3em] font-black">DOCUMENT_TYPE</p>
                <p className="text-xs font-black uppercase" style={{ color: themeColor }}>{report.type.replace(/_/g, ' // ')}</p>
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
                      <p className="text-2xl font-black" style={{ color: themeColor }}>{report.content.total_xp}</p>
                    </div>
                    <div className="py-2.5 px-4 bg-black/5 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl">
                      <p className="text-[9px] font-black tracking-widest uppercase opacity-40 mb-1">PROGRESS</p>
                      <p className="text-2xl font-black text-cyan-400">{report.content.overall_progress}%</p>
                    </div>
                  </div>
                </div>
              )}

              {report.type === 'deadline_alert' && (
                <div className="space-y-6">
                  <div className="flex flex-col items-center justify-center py-4 border-2 border-dashed border-[#FF0055]/30 bg-[#FF0055]/5 rounded-xl">
                    <Timer className="text-4xl text-[#FF0055] animate-pulse w-10 h-10" />
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
                    <Award className="text-5xl mb-2 w-12 h-12" style={{ color: themeColor }} />
                    <p className="text-sm font-black uppercase tracking-[0.4em]" style={{ color: themeColor }}>GOAL_ACCOMPLISHED</p>
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

              {/* PART C - Squad Join Request Details */}
              {report.type === 'squad_join_request' && (
                <div className="space-y-6">
                  <div className="flex flex-col items-center justify-center p-5 bg-black/5 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl relative overflow-hidden">
                    <div className="flex items-center gap-4 w-full">
                      <img
                        src={report.content.requester_avatar || "/avatars/omar.svg"}
                        alt="avatar"
                        className="w-14 h-14 rounded-xl border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)] bg-[#050505]"
                      />
                      <div className="space-y-1 text-left flex-1 min-w-0">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">OPERATOR_IDENTITY</p>
                        <p className="text-sm font-black text-zinc-900 dark:text-white truncate font-space">
                          {report.content.requester_name}
                        </p>
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[8px] font-space font-black tracking-widest uppercase">
                          {isRTL ? 'قيد المراجعة' : 'PENDING REVIEW'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {actionStatus === 'pending' ? (
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => handleReviewRequest('reject')}
                          disabled={loading}
                          className="h-11 border border-red-500/30 hover:border-red-500/80 bg-red-950/15 hover:bg-red-500/10 text-red-400 font-space font-black text-xs uppercase tracking-widest transition-all duration-300 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                        >
                          <X className="text-base w-4 h-4" />
                          {isRTL ? '[ ✗ رفض ]' : '[ ✗ REJECT ]'}
                        </button>
                        <button
                          onClick={() => handleReviewRequest('approve')}
                          disabled={loading}
                          className="h-11 bg-teal-500 hover:bg-teal-400 text-black hover:shadow-[0_0_20px_rgba(20,184,166,0.4)] font-space font-black text-xs uppercase tracking-widest transition-all duration-300 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                        >
                          <Check className="text-base w-4 h-4" />
                          {isRTL ? '[ ✓ قبول ]' : '[ ✓ APPROVE ]'}
                        </button>
                      </div>
                    ) : actionStatus === 'approved' ? (
                      <div className="py-4 bg-teal-500/10 border border-teal-500/30 rounded-xl flex items-center justify-center gap-2">
                        <CheckCircle2 className="text-teal-400" />
                        <p className="text-xs font-space font-black text-teal-400 uppercase tracking-widest">
                          {isRTL ? 'APPROVED // تم قبول العضو للفريق' : 'APPROVED // MEMBER ADDED'}
                        </p>
                      </div>
                    ) : (
                      <div className="py-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-center gap-2">
                        <XCircle className="text-red-400" />
                        <p className="text-xs font-space font-black text-red-400 uppercase tracking-widest">
                          {isRTL ? 'REJECTED // تم رفض طلب الوصول' : 'REJECTED // ACCESS CLASSIFIED'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PART C - Squad Join Approved Congratulations Portal */}
              {report.type === 'squad_join_approved' && (
                <div className="space-y-6">
                  <div className="flex flex-col items-center justify-center py-6 bg-teal-500/10 border border-teal-500/30 rounded-xl text-center">
                    <Award className="text-5xl text-teal-400 mb-2 animate-bounce w-12 h-12" />
                    <p className="text-sm font-black uppercase tracking-[0.4em] text-teal-400">
                      {isRTL ? 'تم منح الإذن // الفريق جاهز' : 'ACCESS GRANTED // SQUAD READY'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      router.push(`/missions/${report.content.goal_id}`);
                    }}
                    className="w-full h-12 bg-teal-500 hover:bg-teal-400 text-black font-space font-black text-xs uppercase tracking-widest transition-all duration-300 rounded-xl shadow-[0_0_20px_rgba(20,184,166,0.3)] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="text-base w-4 h-4" />
                    {isRTL ? '[ ⚡ دخول لوحة الفريق ]' : '[ ⚡ ENTER SQUAD CANVAS ]'}
                  </button>
                </div>
              )}

              {/* PART C - Squad Join Rejected Classified Screen */}
              {report.type === 'squad_join_rejected' && (
                <div className="space-y-6">
                  <div className="flex flex-col items-center justify-center py-6 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
                    <Lock className="text-5xl text-red-500 mb-2 w-12 h-12" />
                    <p className="text-sm font-black uppercase tracking-[0.4em] text-red-500">
                      {isRTL ? 'الوصول مرفوض // هدف مصنف' : 'ACCESS DENIED // CLASSIFIED'}
                    </p>
                  </div>
                  <p className="text-xs text-center text-zinc-500 dark:text-zinc-400 font-space tracking-wide">
                    {isRTL 
                      ? 'تم رفض طلبك للانضمام إلى هذا الفريق من قبل القائد.' 
                      : 'Your request to join this squad goal was rejected by the owner.'}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-6 border-t border-zinc-200 dark:border-white/10 flex justify-between items-center opacity-40">
              <p className="text-[8px] tracking-[0.5em] font-black uppercase">GROWTH HUB // ONLINE</p>
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
