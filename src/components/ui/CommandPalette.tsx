'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Command } from 'cmdk'
import { motion, AnimatePresence } from 'framer-motion'
import { useGrowth } from '@/context/GrowthContext'
import { useToast } from '@/components/ui/Toast'
import { useSound } from '@/context/SoundContext'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { Plus, Users, LayoutGrid, Trophy, Bot, Sun, Moon, CornerDownLeft, Sparkles, History, Search, Swords, PlusSquare, RefreshCw } from 'lucide-react'
import { NeonIcon } from './NeonIcon'
import { createClient } from '@/lib/supabase'
import { getFeatureUsage } from '@/lib/quota'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onOpenCoach?: () => void
  missions?: any[]
}

export default function CommandPalette({ isOpen, onClose, onOpenCoach, missions = [] }: CommandPaletteProps) {
  const { currentTheme, isRTL, openCreateGoalModal, profile, setProfile } = useGrowth()
  const { showToast } = useToast()
  const { playBlip, playSuccess, playClick, playError, playDeploy } = useSound()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [recentItems, setRecentItems] = useState<any[]>([])
  const [recentTasks, setRecentTasks] = useState<any[]>([])

  // Sub-view forms state
  const [subView, setSubView] = useState<'create-task' | 'create-solo-goal' | 'create-team-goal' | null>(null)
  
  // Create Task Form State
  const [selectedGoalId, setSelectedGoalId] = useState('')
  const [taskName, setTaskName] = useState('')
  const [taskWeight, setTaskWeight] = useState(3)
  const [isSubmittingTask, setIsSubmittingTask] = useState(false)

  // Create Goal Form State
  const [goalTitle, setGoalTitle] = useState('')
  const [goalDeadline, setGoalDeadline] = useState('')
  const [goalPinned, setGoalPinned] = useState(true)
  const [isSubmittingGoal, setIsSubmittingGoal] = useState(false)

  // AI Quota Info
  const quotaBadge = useMemo(() => {
    if (typeof window === 'undefined') return { text: 'AI: Available', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' }
    const fixInfo = getFeatureUsage('fix_errors')
    const explainInfo = getFeatureUsage('explain_topic')
    const checklistInfo = getFeatureUsage('generate_checklist')

    const allConsumed = fixInfo.used >= fixInfo.limit && explainInfo.used >= explainInfo.limit && checklistInfo.used >= checklistInfo.limit
    const anyConsumed = fixInfo.used >= fixInfo.limit || explainInfo.used >= explainInfo.limit || checklistInfo.used >= checklistInfo.limit
    const anyLow = (fixInfo.used / fixInfo.limit >= 0.8) || (explainInfo.used / explainInfo.limit >= 0.8) || (checklistInfo.used / checklistInfo.limit >= 0.8)

    if (allConsumed) {
      return { text: isRTL ? 'الذكاء الاصطناعي: مغلق' : 'AI: Locked', color: 'text-red-400 border-red-500/30 bg-red-500/10' }
    } else if (anyConsumed) {
      return { text: isRTL ? 'الذكاء الاصطناعي: محدود' : 'AI: Consumed', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' }
    } else if (anyLow) {
      return { text: isRTL ? 'الذكاء الاصطناعي: منخفض' : 'AI: Low Quota', color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' }
    }
    return { text: isRTL ? 'الذكاء الاصطناعي: متاح' : 'AI: Available', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' }
  }, [isOpen, isRTL])

  // Toggle Dark/Light Mode logic
  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
    showToast(
      isRTL 
        ? `تم تفعيل المظهر ${isDark ? 'الداكن' : 'المضيء'}` 
        : `Switched to ${isDark ? 'Dark' : 'Light'} Mode`, 
      'success'
    )
    playSuccess()
    onClose()
  }

  // Toggle Zen Mode (Deep Work)
  const toggleZenMode = () => {
    const isZen = document.documentElement.classList.toggle('zen-mode')
    showToast(
      isRTL
        ? (isZen ? 'تم تفعيل وضع الزن (التركيز الكامل)' : 'تم إلغاء تفعيل وضع الزن')
        : (isZen ? 'Zen Mode Active - Deep Work Started' : 'Zen Mode Deactivated'),
      isZen ? 'success' : 'warning'
    )
    playSuccess()
    onClose()
  }

  // Toggle Language (EN/AR)
  const toggleLanguage = async () => {
    const currentLang = profile?.language || 'en'
    const newLang = currentLang === 'ar' ? 'en' : 'ar'
    if (profile?.id) {
      const supabase = createClient()
      await supabase.from('profiles').update({ language: newLang }).eq('id', profile.id)
    }
    if (setProfile) {
      setProfile(profile ? { ...profile, language: newLang } : { language: newLang } as any)
    }
    localStorage.setItem('language', newLang)
    showToast(
      newLang === 'ar' ? 'تم تغيير اللغة إلى العربية' : 'Language changed to English',
      'success'
    )
    playSuccess()
    onClose()
  }

  // Read recently accessed items & tasks from localStorage
  useEffect(() => {
    if (isOpen) {
      setSearch('')
      setSubView(null)
      setGoalTitle('')
      setGoalDeadline('')
      setGoalPinned(true)
      setTaskName('')
      setTaskWeight(3)
      setSelectedGoalId('')
      try {
        const raw = localStorage.getItem('growth_hub_recent_commands')
        if (raw) setRecentItems(JSON.parse(raw))
        
        const rawTasks = localStorage.getItem('growth_hub_recent_tasks')
        if (rawTasks) setRecentTasks(JSON.parse(rawTasks))
      } catch (e) {
        console.error(e)
      }
    }
  }, [isOpen])

  // Track clicked items in history
  const addToHistory = (item: { id: string; type: string; title: string; url: string }) => {
    try {
      const raw = localStorage.getItem('growth_hub_recent_commands')
      let list = raw ? JSON.parse(raw) : []
      list = list.filter((i: any) => i.id !== item.id)
      list.unshift(item)
      list = list.slice(0, 3)
      localStorage.setItem('growth_hub_recent_commands', JSON.stringify(list))
      setRecentItems(list)
    } catch (e) {
      console.error(e)
    }
  }

  // Universal Search filtering goals & tasks
  const searchResults = useMemo(() => {
    if (!search.trim()) return []
    const query = search.toLowerCase()
    const results: any[] = []

    missions.forEach((m: any) => {
      const isSquad = m.metadata?.type === 'squad'
      const goalUrl = isSquad ? `/goals/squad/${m.id}` : `/goals/${m.id}`

      if (m.title?.toLowerCase().includes(query)) {
        results.push({
          type: 'goal',
          id: `goal-${m.id}`,
          title: m.title,
          subtitle: isSquad ? 'Team Goal' : 'Personal Goal',
          url: goalUrl,
          rawItem: { id: m.id, type: 'goal', title: m.title, url: goalUrl }
        })
      }

      if (m.tasks) {
        m.tasks.forEach((t: any) => {
          if (t.title?.toLowerCase().includes(query)) {
            results.push({
              type: 'task',
              id: `task-${t.id}`,
              title: t.title,
              subtitle: `Task in "${m.title}"`,
              url: `${goalUrl}?task=${t.id}`,
              rawItem: { id: t.id, type: 'task', title: t.title, url: `${goalUrl}?task=${t.id}` }
            })
          }
        })
      }
    })

    return results
  }, [search, missions])

  const showQuickCreate = useMemo(() => {
    if (!search.trim()) return false
    const searchLower = search.trim().toLowerCase()
    const staticCommands = [
      'create new goal',
      'create team workspace',
      'go to dashboard',
      'go to vault ranks',
      'go to coach',
      'toggle dark light mode',
      'toggle zen mode deep work'
    ]
    return !staticCommands.includes(searchLower)
  }, [search])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const runCommand = (action: () => void, historyItem?: { id: string; type: string; title: string; url: string }) => {
    playBlip()
    if (historyItem) addToHistory(historyItem)
    action()
  }

  // Submit task creation
  const submitCreateTask = async () => {
    if (isSubmittingTask) return
    const rawTitle = taskName.trim()
    if (!rawTitle) {
      showToast(isRTL ? 'اسم المهمة مطلوب' : 'Task title is required', 'warning')
      return
    }
    if (!selectedGoalId) {
      showToast(isRTL ? 'برجاء اختيار الهدف أولاً' : 'Please select a goal first', 'warning')
      return
    }

    setIsSubmittingTask(true)
    try {
      const isLocal = selectedGoalId.startsWith('local_') || !profile?.id
      const payload = {
        goal_id: selectedGoalId,
        title: rawTitle,
        original_title: rawTitle,
        weight: taskWeight,
        is_completed: false,
        type: 'standard',
        created_at: new Date().toISOString()
      }

      if (isLocal) {
        const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
        const idx = guestGoals.findIndex((g: any) => g.id === selectedGoalId)
        if (idx > -1) {
          const fakeId = 'task_' + Math.random().toString(36).substring(2, 9)
          const newTask = { ...payload, id: fakeId }
          guestGoals[idx].tasks = [...(guestGoals[idx].tasks || []), newTask]
          localStorage.setItem('guest_goals', JSON.stringify(guestGoals))
          showToast(isRTL ? 'تم إضافة المهمة محلياً' : 'Task created locally!', 'success')
          playDeploy()
          window.dispatchEvent(new CustomEvent('goal-created', { detail: guestGoals[idx] }))
          onClose()
        } else {
          showToast(isRTL ? 'الهدف غير موجود' : 'Goal not found', 'warning')
        }
      } else {
        const supabase = createClient()
        const { data, error } = await supabase.from('tasks').insert(payload).select().single()
        if (error) {
          showToast(isRTL ? 'فشل إنشاء المهمة' : 'Failed to create task', 'warning')
          playError()
        } else {
          showToast(isRTL ? 'تم إنشاء المهمة بنجاح!' : 'Task created successfully!', 'success')
          playDeploy()
          window.dispatchEvent(new CustomEvent('goal-created', { detail: data }))
          onClose()
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmittingTask(false)
    }
  }

  // Submit goal creation
  const submitCreateGoal = async (type: 'solo' | 'squad') => {
    if (isSubmittingGoal) return
    const titleToCheck = goalTitle.trim()
    if (!titleToCheck) {
      showToast(isRTL ? 'اسم الهدف مطلوب' : 'Goal title is required', 'warning')
      playError()
      return
    }

    setIsSubmittingGoal(true)
    try {
      const supabase = createClient()
      const isLocal = !profile?.id

      if (isLocal) {
        const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
        if (guestGoals.length >= 5) {
          showToast(isRTL ? 'الحد الأقصى للأهداف المحلية هو 5' : 'Maximum 5 local goals allowed', 'warning')
          playError()
          return
        }
        const fakeId = 'local_' + Math.random().toString(36).substring(2, 9)
        const newLocalGoal = {
          id: fakeId,
          user_id: 'guest',
          title: titleToCheck,
          status: 'active',
          size: 'md',
          is_archived: false,
          sync_to_dashboard: goalPinned,
          end_date: goalDeadline || null,
          created_at: new Date().toISOString(),
          tasks: [],
          metadata: { type }
        }
        const updated = [newLocalGoal, ...guestGoals]
        localStorage.setItem('guest_goals', JSON.stringify(updated))
        showToast(isRTL ? 'تم حفظ الهدف محلياً' : 'Goal saved locally!', 'success')
        playDeploy()
        window.dispatchEvent(new CustomEvent('goal-created', { detail: newLocalGoal }))
        onClose()
      } else {
        const metadataPayload: any = { type }
        if (type === 'squad') {
          metadataPayload.invite_code = Math.random().toString(36).substring(2, 8).toUpperCase()
          metadataPayload.rules = {
            no_date_changes: false,
            xp_multiplier: false,
            no_delete: false
          }
        }
        const insertData: any = {
          user_id: profile.id,
          title: titleToCheck,
          status: 'active',
          size: 'md',
          is_archived: false,
          sync_to_dashboard: goalPinned,
          metadata: metadataPayload
        }
        if (goalDeadline) insertData.end_date = goalDeadline

        const { data, error } = await supabase.from('goals').insert(insertData).select().single()
        if (data) {
          if (type === 'squad') {
            await supabase.from('goal_members').insert({
              goal_id: data.id,
              user_id: profile.id,
              role: 'owner'
            })
          }
          showToast(isRTL ? 'تم إنشاء الهدف!' : 'Goal activated!', 'success')
          playDeploy()
          window.dispatchEvent(new CustomEvent('goal-created', { detail: data }))
          onClose()
        } else {
          showToast(isRTL ? 'فشل إنشاء الهدف' : 'Goal creation failed', 'warning')
          playError()
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmittingGoal(false)
    }
  }

  // Group goals for selector
  const individualGoals = useMemo(() => (missions || []).filter((m: any) => m.metadata?.type !== 'squad'), [missions])
  const teamGoals = useMemo(() => (missions || []).filter((m: any) => m.metadata?.type === 'squad'), [missions])

  return (
    <>
      {/* Dynamic Style Injection for CMDK selected elements */}
      <style jsx global>{`
        [data-selected="true"] {
          border-left: 2px solid var(--selected-border-color) !important;
          background-color: var(--background-secondary) !important;
          color: var(--text-primary) !important;
        }
      `}</style>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ scale: 0.95, y: -20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: -20, opacity: 0 }}
              className={cn(
                "w-full max-w-2xl bg-black/30 backdrop-blur-2xl border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.6)] rounded-2xl overflow-hidden relative z-[101]",
                isRTL ? "text-right" : "text-left"
              )}
              style={{ 
                boxShadow: `0 24px 60px rgba(0,0,0,0.6), 0 0 30px ${currentTheme.color}15`
              }}
            >
              {/* Glowing accent top line */}
              <div 
                className="absolute top-0 inset-x-0 h-[2px]" 
                style={{ backgroundColor: currentTheme.color, filter: 'blur(1px)' }} 
              />

              <Command 
                label="Cyberpunk Command Palette" 
                className="flex flex-col h-full text-[var(--text-primary)] dark:text-white font-space"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') onClose()
                }}
              >
                {/* Input wrapper */}
                <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--border)] dark:border-white/[0.08]">
                  <NeonIcon icon={Sparkles} className="w-5 h-5 shrink-0 animate-pulse" style={{ color: currentTheme.color }} />
                  <Command.Input
                    value={search}
                    onValueChange={setSearch}
                    placeholder={isRTL ? "ابحث عن أمر، هدف، أو مهمة..." : "Type a command, goal, or task..."}
                    className="flex-1 bg-transparent border-none text-[var(--text-primary)] dark:text-[#FFFFFF] placeholder-[var(--text-secondary)]/40 dark:placeholder-[#FFFFFF]/30 outline-none font-space font-medium text-lg"
                    autoFocus
                  />
                  {/* AI Quota Badge */}
                  <div className={cn("px-2.5 py-0.5 rounded-full border text-[10px] font-mono tracking-wider font-semibold shadow-[0_2px_10px_rgba(0,0,0,0.2)] shrink-0", quotaBadge.color)}>
                    {quotaBadge.text}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono tracking-widest border border-zinc-800 rounded px-1.5 py-0.5 bg-black/40 uppercase shrink-0">
                    ESC
                  </div>
                </div>

                {/* Sub-view Forms or Command List */}
                {subView === 'create-task' ? (
                  <div className="p-6 space-y-4 font-space text-zinc-300">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <h3 className="text-sm font-bold text-white tracking-wider">
                        {isRTL ? 'إضافة مهمة جديدة' : 'Add New Task'}
                      </h3>
                      <button
                        onClick={() => { playBlip(); setSubView(null) }}
                        className="text-xs text-zinc-500 hover:text-white transition-colors"
                      >
                        {isRTL ? '← رجوع' : '← Back'}
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black tracking-widest text-zinc-400">
                          {isRTL ? 'الهدف المربوط' : 'Linked Goal'}
                        </label>
                        <select
                          value={selectedGoalId}
                          onChange={(e) => setSelectedGoalId(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500/50 [color-scheme:dark]"
                        >
                          <option value="" disabled className="bg-zinc-950">{isRTL ? "اختر الهدف..." : "Select goal..."}</option>
                          {individualGoals.length > 0 && (
                            <optgroup label={isRTL ? "الأهداف الشخصية" : "Individual Goals"} className="bg-zinc-950 text-zinc-400">
                              {individualGoals.map((g: any) => (
                                <option key={g.id} value={g.id} className="text-white bg-zinc-950">{g.title}</option>
                              ))}
                            </optgroup>
                          )}
                          {teamGoals.length > 0 && (
                            <optgroup label={isRTL ? "أهداف الفريق" : "Team Goals"} className="bg-zinc-950 text-zinc-400">
                              {teamGoals.map((g: any) => (
                                <option key={g.id} value={g.id} className="text-white bg-zinc-950">{g.title}</option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black tracking-widest text-zinc-400">
                          {isRTL ? 'اسم المهمة' : 'Task Name'}
                        </label>
                        <input
                          type="text"
                          value={taskName}
                          onChange={(e) => setTaskName(e.target.value)}
                          placeholder={isRTL ? "ماذا تريد أن تنجز؟..." : "What needs to be done?..."}
                          className="w-full bg-black/40 border border-white/10 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500/50 placeholder:text-zinc-600"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') submitCreateTask()
                          }}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black tracking-widest text-zinc-400 block mb-1">
                          {isRTL ? 'الوزن / الأهمية (1-6 ⚡)' : 'Weight / Importance (1-6 ⚡)'}
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-black/30 p-1.5 rounded-lg border border-white/5">
                            {[1, 2, 3, 4, 5, 6].map((w) => (
                              <button
                                key={w}
                                type="button"
                                onClick={() => { playClick(); setTaskWeight(w) }}
                                className={cn(
                                  "p-1 rounded transition-all text-base focus:outline-none hover:scale-110",
                                  taskWeight >= w ? "text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]" : "text-zinc-600"
                                )}
                              >
                                ⚡
                              </button>
                            ))}
                          </div>
                          <span className="text-xs font-mono font-bold text-amber-400">{taskWeight}/6</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        onClick={() => { playBlip(); setSubView(null) }}
                        className="px-4 py-2 rounded-lg text-xs font-black tracking-widest text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {isRTL ? 'إلغاء' : 'Cancel'}
                      </button>
                      <button
                        onClick={submitCreateTask}
                        disabled={isSubmittingTask}
                        className="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-space font-black text-xs tracking-widest rounded-lg transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                      >
                        {isSubmittingTask && <RefreshCw className="animate-spin w-3 h-3" />}
                        {isRTL ? 'إنشاء المهمة' : 'Create Task'}
                      </button>
                    </div>
                  </div>
                ) : subView === 'create-solo-goal' || subView === 'create-team-goal' ? (
                  <div className="p-6 space-y-4 font-space text-zinc-300">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <h3 className="text-sm font-bold text-white tracking-wider">
                        {subView === 'create-team-goal'
                          ? (isRTL ? 'إنشاء هدف فريق جديد' : 'Create New Team Goal')
                          : (isRTL ? 'إنشاء هدف شخصي جديد' : 'Create New Personal Goal')}
                      </h3>
                      <button
                        onClick={() => { playBlip(); setSubView(null) }}
                        className="text-xs text-zinc-500 hover:text-white transition-colors"
                      >
                        {isRTL ? '← رجوع' : '← Back'}
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black tracking-widest text-zinc-400">
                          {isRTL ? 'عنوان الهدف' : 'Goal Title'}
                        </label>
                        <input
                          type="text"
                          value={goalTitle}
                          onChange={(e) => setGoalTitle(e.target.value)}
                          placeholder={isRTL ? "ماذا تريد أن تحقق؟..." : "What do you want to achieve?..."}
                          className="w-full bg-black/40 border border-white/10 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500/50 placeholder:text-zinc-600"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') submitCreateGoal(subView === 'create-team-goal' ? 'squad' : 'solo')
                          }}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black tracking-widest text-zinc-400">
                          {isRTL ? 'الموعد النهائي (اختياري)' : 'Deadline (Optional)'}
                        </label>
                        <input
                          type="date"
                          value={goalDeadline}
                          onChange={(e) => setGoalDeadline(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500/50 [color-scheme:dark]"
                        />
                      </div>

                      <div className="flex items-center justify-between py-2 border-t border-b border-white/5 mt-2">
                        <span className="text-[10px] font-black tracking-widest text-zinc-400">
                          {isRTL ? 'تثبيت في لوحة التحكم' : 'Pin to Dashboard'}
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={goalPinned}
                            onChange={() => { playBlip(); setGoalPinned(!goalPinned) }}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-zinc-400 peer-checked:after:bg-black after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500" />
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        onClick={() => { playBlip(); setSubView(null) }}
                        className="px-4 py-2 rounded-lg text-xs font-black tracking-widest text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {isRTL ? 'إلغاء' : 'Cancel'}
                      </button>
                      <button
                        onClick={() => submitCreateGoal(subView === 'create-team-goal' ? 'squad' : 'solo')}
                        disabled={isSubmittingGoal}
                        className="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-space font-black text-xs tracking-widest rounded-lg transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                      >
                        {isSubmittingGoal && <RefreshCw className="animate-spin w-3 h-3" />}
                        {isRTL ? 'إنشاء الهدف' : 'Create Goal'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <Command.List className="max-h-[380px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-zinc-850">
                    
                    {/* Smart Quick Create */}
                    {showQuickCreate && (
                      <Command.Group heading={isRTL ? "إنشاء سريع ذكي" : "Smart Quick Create"}>
                        <Command.Item
                          value={`create task ${search}`}
                          onSelect={() => runCommand(() => { openCreateGoalModal({ goalType: 'solo', prefillTitle: search }); onClose(); })}
                          className="flex items-center justify-between px-3 py-3 rounded-lg text-sm text-[var(--text-secondary)] dark:text-zinc-300 hover:text-[var(--text-primary)] dark:hover:text-white cursor-pointer transition-all gap-3"
                          style={{ '--selected-border-color': currentTheme.color } as React.CSSProperties}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded">
                              <NeonIcon icon={PlusSquare} intent="primary" className="w-4 h-4" />
                            </div>
                            <span className="font-semibold tracking-wide text-cyan-500 dark:text-cyan-400">{isRTL ? `إنشاء هدف فرعي: "${search}"` : `Create Goal: "${search}"`}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-cyan-500/60 font-mono">
                            <span>QUICK</span>
                            <CornerDownLeft className="w-3 h-3" />
                          </div>
                        </Command.Item>
                      </Command.Group>
                    )}

                    {/* Empty View */}
                    <Command.Empty className="py-6 text-center text-sm text-zinc-500 font-space tracking-wider uppercase">
                      {isRTL ? "لا توجد نتائج مطابقة" : "No active modules matched"}
                    </Command.Empty>

                    {/* Universal Search Results */}
                    {search.trim().length > 0 && searchResults.length > 0 && (
                      <Command.Group heading={isRTL ? "نتائج البحث الشامل" : "Search Results"}>
                        {searchResults.map((res: any) => (
                          <Command.Item
                            key={res.id}
                            value={res.title}
                            onSelect={() => runCommand(() => { router.push(res.url); onClose(); }, res.rawItem)}
                            className="flex items-center justify-between px-3 py-3 rounded-lg text-sm text-[var(--text-secondary)] dark:text-zinc-300 hover:text-[var(--text-primary)] dark:hover:text-white cursor-pointer transition-all gap-3 mt-1"
                            style={{ '--selected-border-color': currentTheme.color } as React.CSSProperties}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="p-1.5 bg-white/[0.03] border border-white/10 rounded shrink-0">
                                <NeonIcon icon={Search} className="w-4 h-4" style={{ color: currentTheme.color }} />
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="font-semibold tracking-wide text-[var(--text-primary)] dark:text-[#FFFFFF] truncate uppercase">{res.title}</span>
                                <span className="text-[9px] text-zinc-500 tracking-wider uppercase font-medium">{res.subtitle}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono shrink-0">
                              <span>{res.type === 'goal' ? (isRTL ? 'هدف' : 'GOAL') : (isRTL ? 'مهمة' : 'TASK')}</span>
                              <CornerDownLeft className="w-3 h-3" />
                            </div>
                          </Command.Item>
                        ))}
                      </Command.Group>
                    )}

                    {/* Recently Accessed Commands */}
                    {!search.trim() && recentItems.length > 0 && (
                      <Command.Group heading={isRTL ? "المستخدم مؤخراً" : "Recently Accessed"}>
                        {recentItems.map((item: any) => (
                          <Command.Item
                            key={item.id}
                            value={item.title}
                            onSelect={() => runCommand(() => { router.push(item.url); onClose(); })}
                            className="flex items-center justify-between px-3 py-3 rounded-lg text-sm text-[var(--text-secondary)] dark:text-zinc-300 hover:text-[var(--text-primary)] dark:hover:text-white cursor-pointer transition-all gap-3 mt-1"
                            style={{ '--selected-border-color': currentTheme.color } as React.CSSProperties}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="p-1.5 bg-white/[0.03] border border-white/10 rounded shrink-0">
                                <NeonIcon icon={History} className="w-4 h-4 text-zinc-400" />
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="font-semibold tracking-wide text-[var(--text-primary)] dark:text-[#FFFFFF] truncate uppercase">{item.title}</span>
                                <span className="text-[9px] text-zinc-500 tracking-wider uppercase font-medium">
                                  {item.type === 'goal' ? (isRTL ? 'هدف' : 'Goal') : item.type === 'task' ? (isRTL ? 'مهمة فرعية' : 'Task') : (isRTL ? 'رابط' : 'Navigation')}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono shrink-0">
                              <span>{isRTL ? 'فتح' : 'Open'}</span>
                              <CornerDownLeft className="w-3 h-3" />
                            </div>
                          </Command.Item>
                        ))}
                      </Command.Group>
                    )}

                    {/* Recently Accessed Tasks */}
                    {!search.trim() && recentTasks.length > 0 && (
                      <Command.Group heading={isRTL ? "المهام الأخيرة" : "Recent Tasks"}>
                        {recentTasks.map((task: any) => (
                          <Command.Item
                            key={task.id}
                            value={task.title}
                            onSelect={() => runCommand(() => { router.push(task.url); onClose(); })}
                            className="flex items-center justify-between px-3 py-3 rounded-lg text-sm text-[var(--text-secondary)] dark:text-zinc-300 hover:text-[var(--text-primary)] dark:hover:text-white cursor-pointer transition-all gap-3 mt-1"
                            style={{ '--selected-border-color': currentTheme.color } as React.CSSProperties}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="p-1.5 bg-white/[0.03] border border-white/10 rounded shrink-0">
                                <NeonIcon icon={History} className="w-4 h-4 text-zinc-400" />
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="font-semibold tracking-wide text-[var(--text-primary)] dark:text-[#FFFFFF] truncate uppercase">{task.title}</span>
                                <span className="text-[9px] text-zinc-500 tracking-wider uppercase font-medium">
                                  {isRTL ? 'مهمة' : 'Task'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono shrink-0">
                              <span>{isRTL ? 'فتح' : 'Open'}</span>
                              <CornerDownLeft className="w-3 h-3" />
                            </div>
                          </Command.Item>
                        ))}
                      </Command.Group>
                    )}

                    {/* Actions Group */}
                    <Command.Group 
                      heading={isRTL ? "الإجراءات البرمجية" : "Actions"}
                      className="px-2 py-1.5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] font-space"
                    >
                      {/* Create Task Inline Form */}
                      <Command.Item
                        value="create new task inline"
                        onSelect={() => runCommand(() => { setSubView('create-task') })}
                        className="flex items-center justify-between px-3 py-3 rounded-lg text-sm text-[var(--text-secondary)] dark:text-zinc-300 hover:text-[var(--text-primary)] dark:hover:text-white cursor-pointer transition-all gap-3"
                        style={{ '--selected-border-color': currentTheme.color } as React.CSSProperties}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-white/[0.03] border border-white/10 rounded">
                            <NeonIcon icon={Plus} className="w-4 h-4" style={{ color: currentTheme.color }} />
                          </div>
                          <span className="font-semibold tracking-wide">{isRTL ? "إنشاء مهمة فرعية جديدة" : "Create New Task"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                          <span>{isRTL ? "إجراء" : "ACTION"}</span>
                          <CornerDownLeft className="w-3 h-3" />
                        </div>
                      </Command.Item>

                      <Command.Item
                        value="create new goal"
                        onSelect={() => runCommand(() => { setSubView('create-solo-goal') })}
                        className="flex items-center justify-between px-3 py-3 rounded-lg text-sm text-[var(--text-secondary)] dark:text-zinc-300 hover:text-[var(--text-primary)] dark:hover:text-white cursor-pointer transition-all gap-3 mt-1"
                        style={{ '--selected-border-color': currentTheme.color } as React.CSSProperties}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-white/[0.03] border border-white/10 rounded">
                            <NeonIcon icon={Swords} className="w-4 h-4" style={{ color: currentTheme.color }} />
                          </div>
                          <span className="font-semibold tracking-wide">{isRTL ? "إنشاء هدف جديد" : "Create New Goal"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                          <span>{isRTL ? "إجراء" : "ACTION"}</span>
                          <CornerDownLeft className="w-3 h-3" />
                        </div>
                      </Command.Item>

                      <Command.Item
                        value="create team workspace"
                        onSelect={() => runCommand(() => { setSubView('create-team-goal') })}
                        className="flex items-center justify-between px-3 py-3 rounded-lg text-sm text-[var(--text-secondary)] dark:text-zinc-300 hover:text-[var(--text-primary)] dark:hover:text-white cursor-pointer transition-all gap-3 mt-1"
                        style={{ '--selected-border-color': currentTheme.color } as React.CSSProperties}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-white/[0.03] border border-white/10 rounded">
                            <NeonIcon icon={Users} className="w-4 h-4" style={{ color: currentTheme.color }} />
                          </div>
                          <span className="font-semibold tracking-wide">{isRTL ? "إنشاء مساحة عمل جماعية" : "Create Team Workspace"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                          <span>{isRTL ? "إجراء" : "ACTION"}</span>
                          <CornerDownLeft className="w-3 h-3" />
                        </div>
                      </Command.Item>
                    </Command.Group>

                    <div className="h-[1px] bg-white/[0.04] my-2 mx-2" />

                    {/* Navigation Group */}
                    <Command.Group 
                      heading={isRTL ? "الملاحة والتوجيه" : "Navigation"}
                      className="px-2 py-1.5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] font-space"
                    >
                      <Command.Item
                        value="go to dashboard"
                        onSelect={() => runCommand(() => { router.push('/'); onClose(); }, { id: 'nav-dashboard', type: 'nav', title: 'Dashboard', url: '/' })}
                        className="flex items-center justify-between px-3 py-3 rounded-lg text-sm text-[var(--text-secondary)] dark:text-zinc-300 hover:text-[var(--text-primary)] dark:hover:text-white cursor-pointer transition-all gap-3 mt-1"
                        style={{ '--selected-border-color': currentTheme.color } as React.CSSProperties}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-white/[0.03] border border-white/10 rounded">
                            <NeonIcon icon={LayoutGrid} className="w-4 h-4" style={{ color: currentTheme.color }} />
                          </div>
                          <span className="font-semibold tracking-wide">{isRTL ? "الذهاب للوحة التحكم" : "Go to Dashboard"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                          <span>{isRTL ? "ملاحة" : "NAV"}</span>
                          <CornerDownLeft className="w-3 h-3" />
                        </div>
                      </Command.Item>

                      <Command.Item
                        value="go to coach"
                        onSelect={() => runCommand(() => { if (onOpenCoach) onOpenCoach(); onClose(); })}
                        className="flex items-center justify-between px-3 py-3 rounded-lg text-sm text-[var(--text-secondary)] dark:text-zinc-300 hover:text-[var(--text-primary)] dark:hover:text-white cursor-pointer transition-all gap-3 mt-1"
                        style={{ '--selected-border-color': currentTheme.color } as React.CSSProperties}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-white/[0.03] border border-white/10 rounded">
                            <NeonIcon icon={Bot} className="w-4 h-4" style={{ color: currentTheme.color }} />
                          </div>
                          <span className="font-semibold tracking-wide">{isRTL ? "الذهاب إلى المدرب الشخصي" : "Go to Coach"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                          <span>{isRTL ? "ملاحة" : "NAV"}</span>
                          <CornerDownLeft className="w-3 h-3" />
                        </div>
                      </Command.Item>

                      <Command.Item
                        value="go to notes"
                        onSelect={() => runCommand(() => { router.push('/notes'); onClose(); }, { id: 'nav-notes', type: 'nav', title: 'Notes', url: '/notes' })}
                        className="flex items-center justify-between px-3 py-3 rounded-lg text-sm text-[var(--text-secondary)] dark:text-zinc-300 hover:text-[var(--text-primary)] dark:hover:text-white cursor-pointer transition-all gap-3 mt-1"
                        style={{ '--selected-border-color': currentTheme.color } as React.CSSProperties}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-white/[0.03] border border-white/10 rounded">
                            <NeonIcon icon={History} className="w-4 h-4" style={{ color: currentTheme.color }} />
                          </div>
                          <span className="font-semibold tracking-wide">{isRTL ? "الذهاب للملاحظات" : "Go to Notes"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                          <span>{isRTL ? "ملاحة" : "NAV"}</span>
                          <CornerDownLeft className="w-3 h-3" />
                        </div>
                      </Command.Item>

                      <Command.Item
                        value="go to settings"
                        onSelect={() => runCommand(() => { router.push('/settings'); onClose(); }, { id: 'nav-settings', type: 'nav', title: 'Settings', url: '/settings' })}
                        className="flex items-center justify-between px-3 py-3 rounded-lg text-sm text-[var(--text-secondary)] dark:text-zinc-300 hover:text-[var(--text-primary)] dark:hover:text-white cursor-pointer transition-all gap-3 mt-1"
                        style={{ '--selected-border-color': currentTheme.color } as React.CSSProperties}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-white/[0.03] border border-white/10 rounded">
                            <NeonIcon icon={PlusSquare} className="w-4 h-4" style={{ color: currentTheme.color }} />
                          </div>
                          <span className="font-semibold tracking-wide">{isRTL ? "الذهاب للإعدادات" : "Go to Settings"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                          <span>{isRTL ? "ملاحة" : "NAV"}</span>
                          <CornerDownLeft className="w-3 h-3" />
                        </div>
                      </Command.Item>

                      <Command.Item
                        value="open ranks roadmap modal overlay"
                        onSelect={() => runCommand(() => { window.dispatchEvent(new CustomEvent('open-ranks-roadmap')); onClose(); })}
                        className="flex items-center justify-between px-3 py-3 rounded-lg text-sm text-[var(--text-secondary)] dark:text-zinc-300 hover:text-[var(--text-primary)] dark:hover:text-white cursor-pointer transition-all gap-3 mt-1"
                        style={{ '--selected-border-color': currentTheme.color } as React.CSSProperties}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-white/[0.03] border border-white/10 rounded">
                            <NeonIcon icon={Trophy} className="w-4 h-4" style={{ color: currentTheme.color }} />
                          </div>
                          <span className="font-semibold tracking-wide">{isRTL ? "خريطة طريق الرتب" : "Ranks Roadmap"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                          <span>{isRTL ? "ملاحة" : "NAV"}</span>
                          <CornerDownLeft className="w-3 h-3" />
                        </div>
                      </Command.Item>
                    </Command.Group>

                    <div className="h-[1px] bg-white/[0.04] my-2 mx-2" />

                    {/* Theme & System Group */}
                    <Command.Group 
                      heading={isRTL ? "إعدادات المنظومة" : "System"}
                      className="px-2 py-1.5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] font-space"
                    >
                      <Command.Item
                        value="toggle dark light mode"
                        onSelect={() => runCommand(toggleTheme)}
                        className="flex items-center justify-between px-3 py-3 rounded-lg text-sm text-[var(--text-secondary)] dark:text-zinc-300 hover:text-[var(--text-primary)] dark:hover:text-white cursor-pointer transition-all gap-3 mt-1"
                        style={{ '--selected-border-color': currentTheme.color } as React.CSSProperties}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-white/[0.03] border border-white/10 rounded flex items-center justify-center">
                            <NeonIcon icon={Sun} className="w-4.5 h-4.5 text-amber-400 dark:hidden" />
                            <NeonIcon icon={Moon} className="w-4.5 h-4.5 text-cyan-400 hidden dark:block" />
                          </div>
                          <span className="font-semibold tracking-wide">{isRTL ? "تبديل المظهر الداكن / المضيء" : "Toggle Dark/Light Mode"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                          <span>{isRTL ? "إعداد" : "SYS"}</span>
                          <CornerDownLeft className="w-3 h-3" />
                        </div>
                      </Command.Item>

                      <Command.Item
                        value="toggle zen mode deep work"
                        onSelect={() => runCommand(toggleZenMode)}
                        className="flex items-center justify-between px-3 py-3 rounded-lg text-sm text-[var(--text-secondary)] dark:text-zinc-300 hover:text-[var(--text-primary)] dark:hover:text-white cursor-pointer transition-all gap-3 mt-1"
                        style={{ '--selected-border-color': currentTheme.color } as React.CSSProperties}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-white/[0.03] border border-white/10 rounded flex items-center justify-center">
                            <Sparkles className="w-4.5 h-4.5 text-purple-400" />
                          </div>
                          <span className="font-semibold tracking-wide">{isRTL ? "تفعيل وضع الزن (التركيز الكامل)" : "Toggle Zen Mode (Deep Work)"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                          <span>{isRTL ? "إعداد" : "SYS"}</span>
                          <CornerDownLeft className="w-3 h-3" />
                        </div>
                      </Command.Item>

                      <Command.Item
                        value="toggle language english arabic"
                        onSelect={() => runCommand(toggleLanguage)}
                        className="flex items-center justify-between px-3 py-3 rounded-lg text-sm text-[var(--text-secondary)] dark:text-zinc-300 hover:text-[var(--text-primary)] dark:hover:text-white cursor-pointer transition-all gap-3 mt-1"
                        style={{ '--selected-border-color': currentTheme.color } as React.CSSProperties}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 bg-white/[0.03] border border-white/10 rounded flex items-center justify-center text-xs font-bold text-cyan-400">
                            {isRTL ? 'EN' : 'AR'}
                          </div>
                          <span className="font-semibold tracking-wide">{isRTL ? "تغيير لغة المنظومة إلى الإنجليزية" : "Switch Language to Arabic"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                          <span>{isRTL ? "إعداد" : "SYS"}</span>
                          <CornerDownLeft className="w-3 h-3" />
                        </div>
                      </Command.Item>
                    </Command.Group>
                  </Command.List>
                )}

                {/* Footer details */}
                <div className="px-4 py-3 border-t border-white/[0.08] bg-black/5 dark:bg-black/60 flex items-center justify-between text-[10px] font-space text-zinc-500 select-none">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-600 font-black">◆</span>
                    <span>{isRTL ? "لوحة التوجيه السيبرانية" : "Growth Hub Navigation"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <kbd className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-zinc-400">↑↓</kbd>
                      <span>{isRTL ? "للتنقل" : "Navigate"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <kbd className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-zinc-400">ENTER</kbd>
                      <span>{isRTL ? "للتأكيد" : "Select"}</span>
                    </div>
                  </div>
                </div>
              </Command>

              {/* 
                Commented-out old elements for compliance:
                // old ranks view navigation, raw create goal modal bindings, and original layout styling.
                // onSelect={() => runCommand(() => { router.push('/vault'); onClose(); }, { id: 'nav-vault', type: 'nav', title: 'Vault', url: '/vault' })}
              */}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
