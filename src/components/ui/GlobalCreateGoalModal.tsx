'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, RefreshCw, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { useGrowth } from '@/context/GrowthContext'
import { useToast } from '@/components/ui/Toast'
import { useSound } from '@/context/SoundContext'
import { createClient } from '@/lib/supabase'
import { validateContent } from '@/lib/profanityFilter'
import { aiProfanityCheck } from '@/app/actions/profanityCheck'
import { useRouter } from 'next/navigation'
import { useTrack } from '@/hooks/useTrack'
import { cn } from '@/lib/utils'

/**
 * GlobalCreateGoalModal
 *
 * Rendered once at the Shell (layout) level so it can be triggered from *any*
 * page without navigating away. State is managed via GrowthContext:
 *   openCreateGoalModal({ prefillTitle?, goalType? })  ← trigger from anywhere
 *   closeCreateGoalModal()                             ← close from anywhere
 */
export default function GlobalCreateGoalModal() {
  /* Commented out per rule "Never delete code, only comment it out"
  const {
    profile,
    isRTL,
    currentTheme,
    isCreateGoalModalOpen,
    closeCreateGoalModal,
    createGoalModalOpts,
    setShowAuthModal,
    addXp,
    calculateAccountability,
  } = useGrowth()
  */
  const {
    profile,
    isRTL,
    currentTheme,
    isCreateGoalModalOpen,
    closeCreateGoalModal,
    createGoalModalOpts,
    setShowAuthModal,
    addXp,
    calculateAccountability,
    isGoalLimitReached,
  } = useGrowth()

  const { showToast } = useToast()
  const { playDeploy, playBlip, playError, playClick } = useSound()
  const router = useRouter()
  const supabase = createClient()
  const { track } = useTrack()

  // ── Local form state ──────────────────────────────────────────────────────
  const [newTitle, setNewTitle] = useState('')
  const [newSize, setNewSize] = useState('md')
  const [syncOnCreate, setSyncOnCreate] = useState(true)
  const [endDate, setEndDate] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [viewDate, setViewDate] = useState(new Date())

  // Helper for generating days of a month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const totalDays = new Date(year, month + 1, 0).getDate()
    
    const days = []
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i))
    }
    return days
  }
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Sync prefill whenever modal is opened with opts
  useEffect(() => {
    if (isCreateGoalModalOpen) {
      setNewTitle(createGoalModalOpts.prefillTitle || '')
      setNewSize('md')
      setSyncOnCreate(true)
      setEndDate('')
      setIsSubmitting(false)
      setShowDatePicker(false)
      setViewDate(new Date())
    }
  }, [isCreateGoalModalOpen, createGoalModalOpts.prefillTitle])

  // ── Close on global close-all-modals event ────────────────────────────────
  useEffect(() => {
    const handler = () => closeCreateGoalModal()
    window.addEventListener('close-all-modals', handler)
    return () => window.removeEventListener('close-all-modals', handler)
  }, [closeCreateGoalModal])

  // ── Goal type from opts (default: solo) ───────────────────────────────────
  const goalType = createGoalModalOpts.goalType || 'solo'

  // ── Slot sizes ────────────────────────────────────────────────────────────
  const SIZE_SLOTS: Record<string, number> = { sm: 1, md: 1.5, lg: 3 }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const titleToCheck = newTitle.trim()
      if (!titleToCheck) {
        showToast(
          isRTL ? 'لازم تكتب اسم للـ Goal' : 'Goal title is required',
          'warning'
        )
        playError()
        return
      }

      const { isValid } = validateContent(titleToCheck)
      if (!isValid) {
        showToast(
          isRTL ? 'من فضلك التزم بلغة محترمة' : 'Please maintain professional language',
          'warning'
        )
        playError()
        return
      }

      const isAiValid = await aiProfanityCheck(titleToCheck)
      if (!isAiValid) {
        showToast(
          isRTL ? 'من فضلك التزم بلغة محترمة' : 'Please maintain professional language',
          'warning'
        )
        playError()
        return
      }

      const { data: { user } } = await supabase.auth.getUser()

      // ── Guest flow ──────────────────────────────────────────────────────
      if (!user) {
        const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
        // if (guestGoals.length >= 1) {
        if (guestGoals.length >= 5) {
          setShowAuthModal(true)
          playError()
          return
        }
        const fakeId = 'local_' + Math.random().toString(36).substring(2, 9)
        const newLocalGoal = {
          id: fakeId,
          user_id: 'guest',
          title: titleToCheck,
          status: 'active',
          size: newSize,
          is_archived: false,
          sync_to_dashboard: syncOnCreate,
          end_date: endDate || null,
          created_at: new Date().toISOString(),
          tasks: [],
          metadata: { type: goalType },
        }
        const updated = [newLocalGoal, ...guestGoals]
        localStorage.setItem('guest_goals', JSON.stringify(updated))
        closeCreateGoalModal()
        showToast(isRTL ? 'اتحفظ الـ Goal محلياً' : 'Goal saved locally!', 'success')
        playDeploy()
        // Dispatch event so any mounted page can refresh its list
        window.dispatchEvent(new CustomEvent('goal-created', { detail: newLocalGoal }))
        // router.push(`/missions/${fakeId}`)
        // router.push(`/goals/${fakeId}`)
        router.push(`/goals/solo`)
        return
      }

      // ── Authenticated flow ──────────────────────────────────────────────
      // Check dashboard capacity
      if (syncOnCreate) {
        const { data: synced } = await supabase
          // .from('cups')
          .from('goals')
          .select('id, size')
          .eq('user_id', user.id)
          .eq('sync_to_dashboard', true)
          .eq('is_archived', false)

        const usedSlots = (synced || []).reduce((acc: number, m: any) => {
          return acc + (SIZE_SLOTS[m.size?.toLowerCase()] ?? 1)
        }, 0)

        const newSlots = SIZE_SLOTS[newSize] ?? 1
        // if (usedSlots + newSlots > 9) {
        //   showToast(
        //     isRTL
        //       ? `سعة الـ Dashboard ممتلية (${usedSlots.toFixed(1).replace('.0', '')}/9) — خلص أو شيل Goals موجودة.`
        //       : `FOCUS CAPACITY FULL (${usedSlots.toFixed(1).replace('.0', '')}/9 SLOTS) — Complete or un-equip existing goals.`,
        //     'warning'
        //   )
        //   playError()
        //   return
        // }
      }

      const metadataPayload: any = { type: goalType }
      if (goalType === 'squad') {
        metadataPayload.invite_code = Math.random().toString(36).substring(2, 8).toUpperCase()
        metadataPayload.rules = {
          no_date_changes: false,
          xp_multiplier: false,
          no_delete: false,
        }
      }

      const insertData: any = {
        user_id: user.id,
        title: titleToCheck,
        status: 'active',
        size: newSize,
        is_archived: false,
        sync_to_dashboard: syncOnCreate,
        metadata: metadataPayload,
      }
      if (endDate) insertData.end_date = endDate

      // const { data, error } = await supabase.from('cups').insert(insertData).select().single()
      const { data, error } = await supabase.from('goals').insert(insertData).select().single()

      if (data) {
        track('goal_created', { goal_id: data.id, title: data.title, type: data.metadata?.type || 'solo' })
        if (goalType === 'squad') {
          await supabase.from('goal_members').insert({
            goal_id: data.id,
            user_id: user.id,
            role: 'owner',
          })
        }

        closeCreateGoalModal()
        showToast(isRTL ? 'تم إنشاء الـ Goal!' : 'Goal activated!', 'success')
        playDeploy()

        // Notify any page that listens for new goals
        window.dispatchEvent(new CustomEvent('goal-created', { detail: data }))

        // Navigate into the new goal
        // router.push(`/missions/${data.id}`)
        // const targetPath = goalType === 'squad' ? `/goals/squad/${data.id}` : `/goals/${data.id}`
        const targetPath = goalType === 'squad' ? `/goals/squad/${data.id}` : `/goals/solo`
        router.push(targetPath)
      } else {
        showToast(isRTL ? 'مش اشتغل — جرب تاني' : 'Creation failed — try again', 'warning')
        playError()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isCreateGoalModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9000] flex items-center justify-center bg-white/90 dark:bg-black/90 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={closeCreateGoalModal}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9 }}
            className="w-full max-w-[400px] bg-white/60 dark:bg-black/40 backdrop-blur-3xl border border-black/5 dark:border-white/5 p-6 space-y-5 rounded-md shadow-2xl my-auto relative"
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeCreateGoalModal}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>

            {isGoalLimitReached ? (
              /* Upgrade Required Panel */
              <div className="flex flex-col items-center text-center space-y-6 py-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.15)] animate-pulse">
                    <span className="text-3xl">⚠️</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-black text-white tracking-wide uppercase font-space">
                    {isRTL ? 'اكتمل الحد الأقصى للأهداف' : 'Goal limit reached'}
                  </h3>
                  <p className="text-xs text-zinc-400 font-body leading-relaxed max-w-[280px]">
                    {isRTL 
                      ? 'لقد وصلت إلى الحد الأقصى (5 أهداف نشطة) على الخطة المجانية. قم بالترقية الآن لفتح عدد غير محدود من الأهداف والميزات المتقدمة.'
                      : "You've reached the maximum limit of 5 active goals on your Free tier. Upgrade to Pro to unlock unlimited goals and advanced AI features."}
                  </p>
                </div>

                <div className="flex flex-col gap-3 w-full pt-2">
                  <button
                    onClick={() => {
                      playClick()
                      closeCreateGoalModal()
                      router.push('/pricing')
                    }}
                    className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 text-black font-space font-black text-xs tracking-widest rounded-md transition-all shadow-md cursor-pointer uppercase flex items-center justify-center gap-2"
                    style={{ minHeight: '44px' }}
                  >
                    <span>⚡ {isRTL ? 'الترقية إلى Pro' : 'Upgrade to Pro'}</span>
                  </button>
                  <button
                    onClick={() => { playClick(); closeCreateGoalModal() }}
                    className="w-full py-2.5 bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] text-zinc-400 hover:text-white font-space font-bold text-xs tracking-widest rounded-md transition-all cursor-pointer"
                    style={{ minHeight: '44px' }}
                  >
                    {isRTL ? 'إغلاق' : 'Close'}
                  </button>
                </div>
              </div>
            ) : (
              /* Original Form elements (preserved in comment below) */
              /* Commented out per rule "Never delete code, only comment it out"
              // [Original Form content commented out here]
              */
              <>
                {/* Header */}
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-black text-white tracking-wider">
                    {goalType === 'squad'
                      ? (isRTL ? 'عمل Goal فريق' : 'Create Squad Goal')
                      : (isRTL ? 'عمل Goal جديد' : 'Create New Goal')}
                  </h2>
                  {/* Neon accent underline */}
                  <div className="h-[2px] w-16 rounded-full" style={{ backgroundColor: currentTheme.color }} />
                </div>

                {/* Title Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black tracking-widest text-zinc-400">
                    {isRTL ? 'العنوان' : 'Goal Title'}
                  </label>
                  <input
                    autoFocus
                    value={newTitle}
                    placeholder={isRTL ? 'عايز تحقق إيه؟...' : 'What do you want to achieve?...'}
                    onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
                    className="w-full bg-white/[0.03] border border-white/10 focus:border-[var(--theme-color)] py-3 px-4 rounded-md text-base font-bold text-white outline-none transition-all placeholder:text-zinc-600 shadow-inner"
                    style={{ borderColor: 'rgba(255,255,255,0.08)', ['--theme-color' as any]: currentTheme.color }}
                  />
                </div>

                {/* Deadline */}
                <div className="space-y-1.5 relative">
                  <label className="text-[10px] font-black tracking-widest text-zinc-400">
                    {isRTL ? 'الموعد النهائي (اختياري)' : 'Deadline (Optional)'}
                  </label>
                  <div className="relative w-full">
                    {/* Styled Trigger Box */}
                    <button
                      type="button"
                      onClick={() => { playBlip(); setShowDatePicker(!showDatePicker); }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-sm text-white hover:bg-white/[0.05] transition-colors cursor-pointer w-full text-left"
                    >
                      <Calendar className="w-4 h-4 shrink-0" style={{ color: currentTheme.color }} />
                      <span className="truncate">
                        {endDate ? endDate : (isRTL ? 'اختر تاريخ الانتهاء' : 'Select deadline')}
                      </span>
                    </button>
                  </div>

                  {/* Custom Interactive Calendar Popover */}
                  <AnimatePresence>
                    {showDatePicker && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-[9999] top-full mt-2 left-0 right-0 p-4 bg-zinc-950/95 border border-white/10 rounded-xl shadow-2xl backdrop-blur-xl space-y-3"
                      >
                        {/* Calendar Header */}
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              playBlip()
                              setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
                            }}
                            className="p-1 hover:bg-white/5 rounded text-zinc-400 hover:text-white transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-xs font-bold text-white uppercase tracking-wider font-space">
                            {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              playBlip()
                              setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
                            }}
                            className="p-1 hover:bg-white/5 rounded text-zinc-400 hover:text-white transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Weekdays */}
                        <div className="grid grid-cols-7 gap-1 text-center">
                          {(isRTL ? ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'] : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']).map((day) => (
                            <span key={day} className="text-[9px] font-bold text-zinc-600 uppercase font-space">
                              {day}
                            </span>
                          ))}
                        </div>

                        {/* Days */}
                        <div className="grid grid-cols-7 gap-1">
                          {(() => {
                            const days = getDaysInMonth(viewDate)
                            return days.map((day, idx) => {
                              if (!day) return <div key={`empty-${idx}`} />
                              const dateString = day.toISOString().split('T')[0]
                              const isSelected = endDate === dateString
                              const isToday = new Date().toISOString().split('T')[0] === dateString
                              return (
                                <button
                                  key={dateString}
                                  type="button"
                                  onClick={() => {
                                    playClick()
                                    setEndDate(dateString)
                                    setShowDatePicker(false)
                                  }}
                                  className={cn(
                                    "h-7 w-full rounded text-[10px] font-bold font-mono transition-all flex items-center justify-center cursor-pointer",
                                    isSelected
                                      ? "text-black"
                                      : isToday
                                        ? "bg-white/5 border border-white/20 text-white"
                                        : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                  )}
                                  style={isSelected ? { backgroundColor: currentTheme.color } : {}}
                                >
                                  {day.getDate()}
                                </button>
                              )
                            })
                          })()}
                        </div>

                        {/* Clear Button */}
                        {endDate && (
                          <div className="pt-2 border-t border-white/5 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                playBlip()
                                setEndDate('')
                                setShowDatePicker(false)
                              }}
                              className="text-[9px] font-bold uppercase tracking-wider text-red-500 hover:text-red-400 transition-colors"
                            >
                              {isRTL ? 'إلغاء الموعد' : 'Clear Deadline'}
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Pin to Dashboard */}
                <div className="flex items-center justify-between py-2 border-t border-b border-white/[0.05]">
                  <span className="text-[10px] font-black tracking-widest text-zinc-400">
                    {isRTL ? 'ثبّته في الـ Dashboard' : 'Pin to Dashboard'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={syncOnCreate}
                      onChange={() => { playBlip(); setSyncOnCreate(!syncOnCreate) }}
                      className="sr-only peer"
                    />
                    <div
                      className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-zinc-400 peer-checked:after:bg-black after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--theme-color)]"
                      style={{ ['--theme-color' as any]: currentTheme.color }}
                    />
                  </label>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => { playClick(); closeCreateGoalModal() }}
                    className="px-4 py-2.5 rounded-md text-xs tracking-widest text-zinc-400 hover:text-white transition-all font-black cursor-pointer"
                  >
                    {isRTL ? 'اتركها' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 font-space font-black text-xs tracking-widest rounded-md flex items-center justify-center gap-2 cursor-pointer text-black hover:brightness-110 transition-all shadow-md disabled:opacity-60"
                    style={{ backgroundColor: currentTheme.color }}
                  >
                    {isSubmitting && <RefreshCw className="animate-spin w-3 h-3" />}
                    {isRTL ? 'عمل Goal' : 'Create Goal'}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
