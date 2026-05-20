'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Shell from '@/components/layout/Shell'
import EnergyCell from '@/components/ui/EnergyCell'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { useGrowth } from '@/context/GrowthContext'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { useSound } from '@/context/SoundContext'
import PlaylistImportModal from '@/components/ui/PlaylistImportModal'
import { usePomodoro } from '@/context/PomodoroContext'
import { cleanPlaylistTitles } from '@/app/actions/ai-magic'
import MissionAttachmentsModal from '@/components/ui/MissionAttachmentsModal'
import SmartImportModal from '@/components/ui/SmartImportModal'
import { validateContent } from '@/lib/profanityFilter'
import { aiProfanityCheck } from '@/app/actions/profanityCheck'

// --- HELPER COMPONENT: CYBERPUNK WEIGHT BARS ---
const WeightVisualizer = ({ weight, color, isCompleted = false, onSelect }: { weight: number, color: string, isCompleted?: boolean, onSelect?: (w: number) => void }) => {
  const bars = [1, 2, 3, 4, 5, 6]
  return (
    <div className="flex gap-1 md:gap-[5px]">
      {bars.map(i => (
        <div 
          key={i}
          onClick={() => onSelect?.(i)}
          className={cn(
            "relative flex items-center justify-center py-1",
            onSelect ? "cursor-pointer group" : ""
          )}
        >
          {/* Increased hit area for easier clicking */}
          {onSelect && <div className="absolute inset-[-4px] z-10" />}
          
          <div
            className={cn(
              "w-[8px] h-[18px] transition-all duration-300 rounded-[2px]",
              onSelect ? "group-hover:opacity-80 group-hover:scale-110" : "",
              i <= weight 
                ? "opacity-100" 
                : "bg-black/10 dark:bg-white/10"
            )}
            style={i <= weight ? { 
              backgroundColor: isCompleted ? 'var(--text-secondary)' : color,
              boxShadow: isCompleted ? 'none' : `0 0 12px ${color}88`
            } : {}}
          />
        </div>
      ))}
    </div>
  )
}

export default function MissionDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { calculateAccountability, t, isRTL, mounted, addXp, currentTheme } = useGrowth()
  const { showToast } = useToast()
  const { playSuccess, playError, playBlip } = useSound()
  const [mission, setMission] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskWeight, setNewTaskWeight] = useState(3)
  const [linkedNotes, setLinkedNotes] = useState<any[]>([])
  const [showIntelModal, setShowIntelModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [isGeneratingCard, setIsGeneratingCard] = useState(false)
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const [showSmartImportModal, setShowSmartImportModal] = useState(false)
  const [timeStatsMap, setTimeStatsMap] = useState<Record<string, number>>({})
  const [totalTimeInvested, setTotalTimeInvested] = useState<number>(0)
  
  // --- ATTACHMENTS STATE ---
  const [attachmentMissionId, setAttachmentMissionId] = useState<string | null>(null)
  const [attachmentCount, setAttachmentCount] = useState(0)
  const [activeAttachments, setActiveAttachments] = useState<any[]>([])
  const [modalLoading, setModalLoading] = useState(false)

  // --- CLEAN TITLES STATE ---
  const [isCleaning, setIsCleaning] = useState(false)
  const [isCleaned, setIsCleaned] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`cleaned_${id}`) === 'true'
    }
    return false
  })

  const handleShare = () => {
    playBlip()
    setShowShareModal(true)
  }

  const generateLocalCardBlob = async (): Promise<Blob | null> => {
    try {
      const response = await fetch(`${window.location.origin}/api/missions/${id}/og?t=${Date.now()}`)
      if (!response.ok) throw new Error('Failed to fetch OG image')
      return await response.blob()
    } catch (err) {
      console.error('OG fetch failed:', err)
      return null
    }
  }

  const copyCardImageToClipboard = async () => {
    playBlip()
    setIsGeneratingCard(true)
    try {
      const blob = await generateLocalCardBlob()
      if (!blob) throw new Error('Blob generation failed')
      const item = new ClipboardItem({ 'image/png': blob })
      await navigator.clipboard.write([item])
      showToast(isRTL ? 'تم نسخ صورة البطاقة بنجاح!' : 'CARD IMAGE COPIED TO CLIPBOARD', 'success')
      playSuccess()
      setShowShareModal(false)
    } catch (err) {
      console.error('Failed to copy image blob:', err)
      showToast(isRTL ? 'خطأ في نسخ الصورة' : 'IMAGE_COPY_ERROR', 'warning')
      playError()
    } finally {
      setIsGeneratingCard(false)
    }
  }

  const downloadCardImage = async () => {
    playBlip()
    setIsGeneratingCard(true)
    try {
      const blob = await generateLocalCardBlob()
      if (!blob) throw new Error('Blob generation failed')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mission-${id}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast(isRTL ? 'تم تحميل الكارت بنجاح!' : 'MISSION CARD DOWNLOADED SUCCESSFULLY', 'success')
      playSuccess()
      setShowShareModal(false)
    } catch (err) {
      console.error('Failed to download image blob:', err)
      showToast(isRTL ? 'خطأ في تحميل الكارت' : 'DOWNLOAD_ERROR', 'warning')
      playError()
    } finally {
      setIsGeneratingCard(false)
    }
  }

  const supabase = createClient()
  const { startFocus } = usePomodoro()

  const fetchTimeStats = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('time_logs')
      .select('duration_minutes, task_id')
      .eq('cup_id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error("ERROR FETCHING TIME STATS:", error)
      return
    }

    if (data) {
      const aggregation: Record<string, number> = {}
      let grandTotal = 0
      data.forEach((row: any) => {
        const taskId = row.task_id
        const mins = row.duration_minutes || 0
        aggregation[taskId] = (aggregation[taskId] || 0) + mins
        grandTotal += mins
      })

      setTimeStatsMap(aggregation)
      setTotalTimeInvested(grandTotal)
    }
  }, [id, supabase])

  useEffect(() => {
    if (mounted) {
      fetchMission()
      fetchAttachmentCount()
      fetchTimeStats()
    }
  }, [id, mounted])

  // Close all modals event listener from global Shell ESC matrix
  useEffect(() => {
    const handleCloseAll = () => {
      setShowIntelModal(false)
      setShowShareModal(false)
      setShowPlaylistModal(false)
      setShowSmartImportModal(false)
      setAttachmentMissionId(null)
      setActiveAttachments([])
    }
    window.addEventListener('close-all-modals', handleCloseAll)
    return () => window.removeEventListener('close-all-modals', handleCloseAll)
  }, [])

  useEffect(() => {
    const handleTimeLogSaved = (e: any) => {
      console.log("Time log saved event received, updating inline timers...")
      fetchTimeStats()
    }
    window.addEventListener('time-log-saved', handleTimeLogSaved)
    return () => {
      window.removeEventListener('time-log-saved', handleTimeLogSaved)
    }
  }, [fetchTimeStats])

  async function fetchAttachmentCount() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { count } = await supabase
      .from('mission_attachments')
      .select('*', { count: 'exact', head: true })
      .eq('mission_id', id)
      .eq('user_id', user.id)
    if (count !== null) setAttachmentCount(count)
  }

  const openAttachments = async () => {
    playBlip()
    setModalLoading(true)
    const { data } = await supabase
      .from('mission_attachments')
      .select('*')
      .eq('mission_id', id)
      .order('created_at', { ascending: false })
    if (data) {
      setActiveAttachments(data)
      setAttachmentCount(data.length)
    }
    setAttachmentMissionId(id as string)
    setModalLoading(false)
  }

  const handleCleanTitles = async () => {
    if (!mission?.tasks?.length) return
    setIsCleaning(true)
    try {
      const originalTitles = mission.tasks.map((t: any) => t.original_title || t.title)
      const cleanedTitles = await cleanPlaylistTitles(originalTitles)
      const isLocal = typeof id === 'string' && id.startsWith('local_')
      
      if (isLocal) {
        setMission((prev: any) => {
          const next = {
            ...prev,
            tasks: prev.tasks.map((t: any, idx: number) => ({ ...t, title: cleanedTitles[idx] }))
          }
          const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
          const updatedGoals = guestGoals.map((g: any) => g.id === id ? next : g)
          localStorage.setItem('guest_goals', JSON.stringify(updatedGoals))
          return next
        })
      } else {
        for (let i = 0; i < mission.tasks.length; i++) {
          if (mission.tasks[i].title !== cleanedTitles[i]) {
            await supabase
              .from('tasks')
              .update({ title: cleanedTitles[i] })
              .eq('id', mission.tasks[i].id)
          }
        }
        
        setMission((prev: any) => ({
          ...prev,
          tasks: prev.tasks.map((t: any, idx: number) => ({ ...t, title: cleanedTitles[idx] }))
        }))
      }
      
      localStorage.setItem(`cleaned_${id}`, 'true')
      setIsCleaned(true)
      showToast(isRTL ? 'تم تنظيف العناوين بنجاح' : 'TITLES_CLEANED // OPTIMIZED', 'success')
      playSuccess()
    } catch (err) {
      console.error(err)
      showToast(isRTL ? 'فشل تنظيف العناوين' : 'CLEAN_ERROR', 'warning')
    } finally {
      setIsCleaning(false)
    }
  }

  useEffect(() => {
    if (id) fetchLinkedNotes()
  }, [id])

  async function fetchMission() {
    if (typeof id === 'string' && id.startsWith('local_')) {
      const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
      const goal = guestGoals.find((g: any) => g.id === id)
      if (goal) {
        goal.tasks = (goal.tasks || []).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        setMission(goal)
      } else {
        router.push('/missions')
      }
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('cups')
      .select('*, tasks(*)')
      .eq('id', id)
      .single()

    if (data) {
      data.tasks = (data.tasks || []).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      setMission(data)
    } else {
      router.push('/missions')
    }
    setLoading(false)
  }

  async function fetchLinkedNotes() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('mission_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setLinkedNotes(data)
  }

  // MISSION PERSISTENCE ENGINE
  useEffect(() => {
    if (!mission || !mission.tasks || mission.tasks.length === 0) return

    const checkCompletionStatus = async () => {
      const { progress } = calculateAccountability(mission)
      const roundedProgress = Math.round(progress)

      if (roundedProgress === 100 && !mission.is_archived) {
        const { error } = await supabase
          .from('cups')
          .update({ is_archived: true, status: 'completed', color: currentTheme.color })
          .eq('id', id)
        
        if (!error) {
          setMission((prev: any) => ({ ...prev, is_archived: true, status: 'completed' }))
          showToast(isRTL ? 'تم اكتمال المهمة! نقلت إلى الخزنة' : 'GOAL ACHIEVED! MOVED TO WINS', 'success')
          playSuccess()
        }
      } else if (roundedProgress < 100 && mission.is_archived) {
        const { error } = await supabase
          .from('cups')
          .update({ is_archived: false, status: 'active' })
          .eq('id', id)
        
        if (!error) {
          setMission((prev: any) => ({ ...prev, is_archived: false, status: 'active' }))
        }
      }
    }

    checkCompletionStatus()
  }, [mission?.tasks])

  const toggleTask = async (taskId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus
    const isLocal = typeof id === 'string' && id.startsWith('local_')

    if (isLocal) {
      setMission((prev: any) => {
        const next = {
          ...prev,
          tasks: prev.tasks.map((t: any) => t.id === taskId ? { ...t, is_completed: nextStatus } : t)
        }
        const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
        const updatedGoals = guestGoals.map((g: any) => g.id === id ? next : g)
        localStorage.setItem('guest_goals', JSON.stringify(updatedGoals))
        return next
      })
      if (nextStatus) playSuccess()
      else playBlip()
      return
    }

    const { error } = await supabase
      .from('tasks')
      .update({ is_completed: nextStatus })
      .eq('id', taskId)

    if (!error) {
      setMission((prev: any) => ({
        ...prev,
        tasks: prev.tasks.map((t: any) =>
          t.id === taskId ? { ...t, is_completed: nextStatus } : t
        )
      }))

      if (nextStatus) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('task_completion_log').insert({
            user_id: user.id,
            completed_at: new Date().toISOString()
          })
          const taskIndex = mission.tasks.findIndex((t: any) => t.id === taskId)
          const task = mission.tasks[taskIndex]
          if (task) {
            const sizeStr = mission.size?.toLowerCase() || 'md'
            let xpCeiling = 8
            if (sizeStr === 'sm' || sizeStr === 's' || sizeStr === 'small') xpCeiling = 4
            else if (sizeStr === 'lg' || sizeStr === 'l' || sizeStr === 'large') xpCeiling = 20

            if (taskIndex < xpCeiling) {
              await addXp(task.weight * 10)
            } else {
              // Soft cap reached: 0 XP
            }
            playSuccess()
          }
        }
      } else {
        playBlip()
      }
    }
  }

  const addTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const rawTitle = newTaskTitle.trim()
    if (!rawTitle) return
    
    // Profanity checks
    const { isValid } = validateContent(rawTitle)
    if (!isValid) {
      showToast(isRTL ? 'برجاء الالتزام بلغة لائقة في النظام' : 'Please maintain professional language', 'warning')
      playError()
      return
    }

    const isAiValid = await aiProfanityCheck(rawTitle)
    if (!isAiValid) {
      showToast(isRTL ? 'برجاء الالتزام بلغة لائقة في النظام' : 'Please maintain professional language', 'warning')
      playError()
      return
    }

    const payload = {
      cup_id: id,
      title: rawTitle,
      original_title: rawTitle,
      weight: newTaskWeight,
      is_completed: false,
      type: 'standard',
      created_at: new Date().toISOString()
    }

    const isLocal = typeof id === 'string' && id.startsWith('local_')
    if (isLocal) {
      const fakeId = 'task_' + Math.random().toString(36).substring(2, 9)
      const data = { ...payload, id: fakeId }
      setMission((prev: any) => {
        const next = { ...prev, tasks: [...prev.tasks, data] }
        const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
        const updatedGoals = guestGoals.map((g: any) => g.id === id ? next : g)
        localStorage.setItem('guest_goals', JSON.stringify(updatedGoals))
        return next
      })
      setNewTaskTitle('')
      showToast(isRTL ? 'تم إضافة الهدف محلياً' : 'TASK_SAVED', 'success')
      return
    }

    const { data } = await supabase.from('tasks').insert(payload).select().single()

    if (data) {
      setMission((prev: any) => ({ ...prev, tasks: [...prev.tasks, data] }))
      setNewTaskTitle('')
      showToast(isRTL ? 'تم إضافة الهدف' : 'TASK_SAVED', 'success')
    }
  }

  const deleteTask = async (taskId: string) => {
    const isLocal = typeof id === 'string' && id.startsWith('local_')
    if (isLocal) {
      setMission((prev: any) => {
        const next = { ...prev, tasks: prev.tasks.filter((t: any) => t.id !== taskId) }
        const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
        const updatedGoals = guestGoals.map((g: any) => g.id === id ? next : g)
        localStorage.setItem('guest_goals', JSON.stringify(updatedGoals))
        return next
      })
      return
    }

    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (!error) {
      setMission((prev: any) => ({
        ...prev,
        tasks: prev.tasks.filter((t: any) => t.id !== taskId)
      }))
    }
  }

  // ── HUD CAPACITY LOGIC ──
  const SIZE_SLOTS: Record<string, number> = { sm: 1, md: 1.5, lg: 3, s: 1, m: 1.5, l: 3, small: 1, medium: 1.5, large: 3 }

  const updateMission = async (updates: any) => {
    const isLocal = typeof id === 'string' && id.startsWith('local_')

    if (isLocal) {
      setMission((prev: any) => {
        const next = { ...prev, ...updates }
        const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
        const updatedGoals = guestGoals.map((g: any) => g.id === id ? next : g)
        localStorage.setItem('guest_goals', JSON.stringify(updatedGoals))
        return next
      })
      showToast(isRTL ? 'تم التحديث' : 'GOAL UPDATED', 'success')
      return
    }

    if (updates.sync_to_dashboard === true) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: synced } = await supabase
          .from('cups')
          .select('id, size')
          .eq('user_id', user.id)
          .eq('sync_to_dashboard', true)
          .eq('is_archived', false)
          .neq('id', id)

        const usedSlots = (synced || []).reduce((acc: number, m: any) => {
          return acc + (SIZE_SLOTS[m.size?.toLowerCase()] ?? 1)
        }, 0)
        const thisMissionSlots = SIZE_SLOTS[mission.size?.toLowerCase()] ?? 1
        const totalAfter = usedSlots + thisMissionSlots

        if (totalAfter > 9) {
          const remaining = Math.max(0, 9 - usedSlots).toFixed(1).replace('.0', '')
          showToast(
            isRTL
              ? `سعة المحطة ممتلئة (${usedSlots.toFixed(1).replace('.0','')}/9 فتحات) - أتمم أو أزل مهمات موجودة.`
              : `FOCUS CAPACITY FULL (${usedSlots.toFixed(1).replace('.0','')}/9 SLOTS) — Complete or un-equip existing missions.`,
            'warning'
          )
          playError()
          return
        }
      }
    }

    const { error } = await supabase.from('cups').update(updates).eq('id', id)
    if (!error) {
      setMission((prev: any) => ({ ...prev, ...updates }))
      showToast(isRTL ? 'تم التحديث' : 'GOAL UPDATED', 'success')
    }
  }

  const deleteMission = async () => {
    if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذه المهمة؟' : 'CONFIRM MISSION TERMINATION?')) return
    const isLocal = typeof id === 'string' && id.startsWith('local_')

    if (isLocal) {
      const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
      const updatedGoals = guestGoals.filter((g: any) => g.id !== id)
      localStorage.setItem('guest_goals', JSON.stringify(updatedGoals))
      showToast(isRTL ? 'تم حذف المهمة' : 'GOAL DELETED', 'success')
      router.push('/missions')
      return
    }

    const { error } = await supabase.from('cups').delete().eq('id', id)
    if (!error) {
      showToast(isRTL ? 'تم حذف المهمة' : 'GOAL DELETED', 'success')
      router.push('/missions')
    }
  }

  const { progress, isInRedZone } = useMemo(() => {
    if (!mission) return { progress: 0, isInRedZone: false, status: 'ON_TRACK' }
    return calculateAccountability(mission)
  }, [mission])

  const roundedProgress = Math.round(progress)

  if (loading || !mounted) return (
    <Shell>
      <div className="p-16 font-space animate-pulse tracking-widest text-sm uppercase" style={{ color: currentTheme.color }}>
        {isRTL ? 'جاري التحميل...' : 'LOADING WORKSPACE...'}
      </div>
    </Shell>
  )

  const missionColor = currentTheme.color
  const completedCount = mission.tasks?.filter((t: any) => t.is_completed).length || 0
  const totalCount = mission.tasks?.length || 0

  return (
    <Shell>
      <div className="max-w-4xl mx-auto p-4 md:p-12 space-y-8 md:space-y-12">
        
        {/* Mission Header Overview */}
        <section className="bg-[var(--card-bg)] border border-[var(--card-border)] p-6 md:p-12 rounded-sm space-y-6 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2.5px]" style={{ background: missionColor }} />
            
            <div className="flex justify-between items-start gap-4">
               <div className="space-y-1 flex-1 min-w-0">
                  <h1 className="text-2xl md:text-5xl font-black font-space tracking-tighter uppercase italic text-[var(--text-primary)] leading-none break-words">
                     {mission.title}
                  </h1>
               </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                   <div className="flex items-center gap-2 md:gap-4">
                      <button 
                         onClick={deleteMission}
                         className="p-2 text-black/20 dark:text-white/10 hover:text-red-500 hover:bg-red-500/10 transition-all rounded-full"
                         title={isRTL ? 'حذف المهمة' : 'DELETE_MISSION'}
                      >
                         <span className="material-symbols-outlined text-xl">delete_forever</span>
                      </button>
                      <span className="text-3xl md:text-6xl font-black font-space italic" style={{ color: missionColor }}>{roundedProgress}%</span>
                   </div>
                   <p className="text-[9px] font-space text-[var(--text-secondary)] tracking-[0.4em] uppercase font-black">{isRTL ? 'مكتمل' : 'Complete'}</p>
                </div>
            </div>

            {/* Horizontal Stats Row */}
            <div className="flex flex-wrap items-center pt-4 border-t border-white/5 gap-y-2">
               <div className="inline-flex items-center text-xs font-mono text-white/50 border-r border-white/10 pr-3 mr-3 last:border-0">
                  <span className="material-symbols-outlined text-sm mr-1.5" style={{ color: missionColor }}>schedule</span>
                  <span>{isRTL ? 'إجمالي التركيز:' : 'Total Focus:'} <strong className="text-white font-black ml-1">{Math.floor(totalTimeInvested / 60)}h {totalTimeInvested % 60}m</strong></span>
               </div>
               <div className="inline-flex items-center text-xs font-mono text-white/50 border-r border-white/10 pr-3 mr-3 last:border-0">
                  <span className="material-symbols-outlined text-sm mr-1.5" style={{ color: missionColor }}>radar</span>
                  <span>{isRTL ? 'مكتمل:' : 'Done:'} <strong className="text-white font-black ml-1">{completedCount}</strong></span>
               </div>
               <div className="inline-flex items-center text-xs font-mono text-white/50 border-r border-white/10 pr-3 mr-3 last:border-0">
                  <span className="material-symbols-outlined text-sm mr-1.5" style={{ color: missionColor }}>checklist</span>
                  <span>{isRTL ? 'المهام الإجمالية:' : 'Total Tasks:'} <strong className="text-white font-black ml-1">{totalCount}</strong></span>
               </div>
            </div>

            <div className="w-full h-[1.5px] bg-[var(--input-bg)] relative">
               <motion.div
                 initial={{ width: 0 }}
                 animate={{ width: `${roundedProgress}%` }}
                 className="h-full absolute top-0 start-0"
                 style={{ backgroundColor: missionColor, boxShadow: `0 0 15px ${missionColor}` }}
               />
            </div>
         </section>

         {/* Mission Configuration */}
         <div className="space-y-4">
           {/* Row 1: Main Tabs */}
           <div className="flex flex-wrap gap-4 items-center">
             <button 
                onClick={() => updateMission({ sync_to_dashboard: !mission.sync_to_dashboard })}
                className={cn(
                   "px-4 md:px-6 py-3 border font-space text-[10px] font-black tracking-[0.2em] transition-all rounded-sm uppercase flex items-center gap-3",
                   mission.sync_to_dashboard 
                      ? "bg-white/10 border-white text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]" 
                      : "border-[var(--card-border)] text-[var(--text-secondary)] hover:opacity-85"
                )}
                style={mission.sync_to_dashboard ? { 
                   borderColor: missionColor, color: missionColor,
                   backgroundColor: `${missionColor}11`,
                   boxShadow: `0 0 20px ${missionColor}22`
                } : {}}
             >
                <span className="material-symbols-outlined text-base">
                   {mission.sync_to_dashboard ? 'grid_view' : 'visibility_off'}
                </span>
                {mission.sync_to_dashboard ? (isRTL ? 'في الواجهة' : 'PINNED TO DASHBOARD') : (isRTL ? 'مخفي' : 'UNPINNED')}
             </button>
             
             {/* PLAYLIST_IMPORT button */}
             <button
                onClick={() => { playBlip(); setShowPlaylistModal(true); }}
                className="px-4 md:px-6 py-3 border font-space text-[10px] font-black tracking-[0.2em] transition-all rounded-sm uppercase flex items-center gap-3 border-[var(--card-border)] text-[var(--text-secondary)] hover:opacity-85"
             >
                <span className="material-symbols-outlined text-base">playlist_add</span>
                {isRTL ? 'استيراد قائمة تشغيل' : 'IMPORT PLAYLIST'}
             </button>

             {/* SMART_IMPORT button */}
             <button
                onClick={() => { playBlip(); setShowSmartImportModal(true); }}
                className="px-4 md:px-6 py-3 border font-space text-[10px] font-black tracking-[0.2em] transition-all rounded-sm uppercase flex items-center gap-3 hover:opacity-85"
                style={{
                  borderColor: `${missionColor}55`,
                  color: missionColor,
                  backgroundColor: `${missionColor}10`,
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${missionColor}20` }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = `${missionColor}10` }}
             >
                <span className="material-symbols-outlined text-base">content_paste</span>
                {isRTL ? 'استيراد ذكي' : 'SMART IMPORT'}
             </button>

             {/* INTEL button */}
             <button
               onClick={() => { playBlip(); setShowIntelModal(true); }}
               className="px-4 md:px-6 py-3 border font-space text-[10px] font-black tracking-[0.2em] transition-all rounded-sm uppercase flex items-center gap-3 relative border-[var(--card-border)] text-[var(--text-secondary)] hover:opacity-85"
             >
               <span className="material-symbols-outlined text-base">notes</span>
               {isRTL ? 'الملاحظات' : 'NOTES'}
               {linkedNotes.length > 0 && (
                 <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center text-black" style={{ backgroundColor: missionColor }}>
                   {linkedNotes.length}
                 </span>
               )}
             </button>
           </div>

           {/* Row 2: Secondary Action Icons (Right Aligned) */}
           <div className="flex justify-end items-center gap-3">
             <button
                onClick={() => {
                  const { progress } = calculateAccountability(mission);
                  const percentage = Math.round(progress);
                  const completed = mission.tasks?.filter((t: any) => t.is_completed).length || 0;
                  const total = mission.tasks?.length || 0;
                  
                  const formatDate = (dateStr: string | null, fallbackDate?: Date) => {
                    const d = dateStr ? new Date(dateStr) : (fallbackDate || new Date());
                    return d.toISOString().split('T')[0].replace(/-/g, '');
                  };

                  const dtStart = formatDate(mission.start_date);
                  let dtEnd;
                  if (mission.end_date) {
                    dtEnd = formatDate(mission.end_date);
                  } else {
                    const d = mission.start_date ? new Date(mission.start_date) : new Date();
                    d.setDate(d.getDate() + 30);
                    dtEnd = d.toISOString().split('T')[0].replace(/-/g, '');
                  }

                  const details = encodeURIComponent(`Growth Hub Mission | Progress: ${percentage}% | Tasks: ${completed}/${total}`);
                  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(mission.title)}&dates=${dtStart}/${dtEnd}&details=${details}&location=Growth_Hub`;
                  
                  window.open(googleUrl, '_blank');
                  playBlip();
                }}
                className="w-10 h-10 border border-[var(--card-border)] flex items-center justify-center rounded-sm transition-all"
                style={{ color: `${currentTheme.color}99` }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = currentTheme.color;
                  e.currentTarget.style.borderColor = `${currentTheme.color}60`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = `${currentTheme.color}99`;
                  e.currentTarget.style.borderColor = '';
                }}
                title="ADD_TO_GOOGLE_CALENDAR"
             >
                <span className="material-symbols-outlined text-xl">calendar_month</span>
             </button>

             <button
                onClick={openAttachments}
                className="w-10 h-10 border border-[var(--card-border)] text-[var(--text-secondary)] hover:opacity-85 flex items-center justify-center rounded-sm relative transition-all"
                title="MISSION_ATTACHMENTS"
             >
                <span className="material-symbols-outlined text-xl">attach_file</span>
                {attachmentCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center text-black" style={{ backgroundColor: missionColor }}>
                    {attachmentCount}
                  </span>
                )}
             </button>

             <button
                onClick={handleShare}
                className="w-10 h-10 border border-[var(--card-border)] text-[var(--text-secondary)] bg-white/5 backdrop-blur-md hover:bg-white/10 hover:text-white flex items-center justify-center rounded-xl transition-all animate-[pulse_3s_infinite]"
                style={{
                  boxShadow: `0 0 10px ${missionColor}22`,
                  borderColor: `${missionColor}33`
                }}
                title={isRTL ? 'مشاركة المهمة' : 'SHARE_MISSION'}
             >
                <span className="material-symbols-outlined text-xl" style={{ color: missionColor }}>share</span>
             </button>
           </div>
         </div>

        {/* Task Management Section */}
        <section className="space-y-8">
           <div className="flex justify-between items-center border-b border-[var(--card-border)] pb-4">
              <div className="flex items-center gap-4">
                <h2 className="text-[10px] font-black font-space text-[var(--text-secondary)] tracking-[0.5em] uppercase">{isRTL ? 'قائمة المهام' : 'TASKS'}</h2>
              </div>
              
           </div>

           {/* Task List */}
           <div className="space-y-4">
              <AnimatePresence mode='popLayout'>
                 {(mission.tasks || []).map((task: any) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={cn(
                        "group flex items-center justify-between py-4 border-b border-[var(--card-border)] transition-all",
                        task.is_completed ? "opacity-40" : "opacity-100"
                      )}
                    >
                       <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0">
                          <button 
                            onClick={() => toggleTask(task.id, task.is_completed)}
                            className={cn(
                              "shrink-0 w-7 h-7 flex items-center justify-center transition-all border-2",
                               task.is_completed 
                                 ? "shadow-[0_0_15px_rgba(57,255,20,0.4)]" 
                                 : "border-black/20 dark:border-white/20"
                             )}
                             style={{ 
                               backgroundColor: task.is_completed ? missionColor : 'transparent',
                               borderColor: task.is_completed ? missionColor : undefined 
                             }}
                          >
                             {task.is_completed && <span className="material-symbols-outlined text-black font-black text-lg">check</span>}
                          </button>
                          
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                             <span className={cn(
                                "text-base md:text-xl font-space font-bold tracking-tight transition-all uppercase truncate max-w-full",
                                task.is_completed ? "text-[var(--text-secondary)] opacity-55 line-through" : "text-[var(--text-primary)]"
                             )}>
                                {task.title}
                             </span>
                             {(() => {
                               const taskMinutes = timeStatsMap[task.id] || 0;
                               if (taskMinutes === 0) return null;
                               const timeFormatted = taskMinutes >= 60 
                                 ? `${Math.floor(taskMinutes / 60)}h ${taskMinutes % 60}m` 
                                 : `${taskMinutes}m`;
                               return (
                                 <span className="ml-2 font-mono text-[11px] text-white/40 bg-white/[0.03] border border-white/5 px-2 py-0.5 rounded-md tracking-wider inline-flex items-center gap-1 shrink-0">
                                   <span className="material-symbols-outlined text-[10px]" style={{ color: currentTheme.color }}>schedule</span>
                                   {timeFormatted}
                                 </span>
                               );
                             })()}
                           </div>
                       </div>

                       <div className="flex items-center gap-2 md:gap-4 shrink-0">
                          <WeightVisualizer weight={task.weight} color={missionColor} isCompleted={task.is_completed} />
                          
                          {/* POMODORO BUTTON */}
                          <button
                            onClick={() => startFocus(task.title, task.id, id as string)}
                            className="opacity-0 group-hover:opacity-100 text-[var(--text-secondary)] transition-all p-2"
                            onMouseEnter={e => e.currentTarget.style.color = currentTheme.color}
                            onMouseLeave={e => e.currentTarget.style.color = ''}
                            title="START_FOCUS_SESSION"
                          >
                             <span className="material-symbols-outlined text-lg md:text-xl">timer</span>
                          </button>

                          <button
                            onClick={() => deleteTask(task.id)}
                            className="opacity-0 group-hover:opacity-100 text-[var(--text-secondary)] hover:text-red-500 transition-all p-2"
                          >
                             <span className="material-symbols-outlined text-xl">delete_sweep</span>
                          </button>
                       </div>
                    </motion.div>
                 ))}
              </AnimatePresence>
           </div>

           {/* Add Task Input */}
           <div className="relative mt-8 md:mt-12 flex flex-col gap-3">
             <form onSubmit={addTask} className="relative flex flex-col md:flex-row gap-4 md:gap-6">
                <div className="relative flex-1">
                   <input
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      placeholder={isRTL ? 'إضافة مهمة... (ENTER)' : 'ADD_TASK... (PRESS ENTER)'}
                      className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] p-4 md:p-6 font-space text-sm font-black text-[var(--text-primary)] outline-none transition-all italic"
                      style={{ borderColor: `${currentTheme.color}20` }}
                   />
                   <button 
                      type="submit"
                      className="absolute end-4 top-1/2 -translate-y-1/2 px-4 md:px-6 py-2 font-space text-[10px] font-black uppercase tracking-widest transition-all"
                      style={{ backgroundColor: `${currentTheme.color}11`, color: currentTheme.color, borderColor: `${currentTheme.color}33` }}
                   >
                      + {isRTL ? 'إضافة' : 'ADD'}
                   </button>
                </div>

                <div className="flex flex-col gap-2 justify-center px-4 md:px-6 py-3 md:py-0 border border-[var(--card-border)] bg-[var(--input-bg)]">
                   <div className="flex items-center gap-2">
                     <span className="text-[8px] font-space text-[var(--text-secondary)] uppercase tracking-widest font-black">SET_POWER</span>
                     <div className="group relative flex items-center cursor-help">
                       <span className="material-symbols-outlined text-[12px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">help</span>
                       <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded bg-[var(--card-bg)] border border-[var(--card-border)] p-2 text-[10px] md:text-xs text-[var(--text-primary)] shadow-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-[300] text-center">
                         {isRTL 
                           ? "هذه الأشرطة تحدد وزن أو حجم المهمة. المهمة الأكبر تمنحك نقاط خبرة أكثر وتأخذ وقتاً أطول."
                           : "These bars set the task weight/power. A heavier task grants more XP and takes more effort."}
                       </div>
                     </div>
                   </div>
                   <WeightVisualizer 
                     weight={newTaskWeight} 
                     color={missionColor} 
                     onSelect={(w) => setNewTaskWeight(w)} 
                   />
                </div>
             </form>

             {/* Dynamic Bilingual Alert */}
             {(() => {
               const sizeStr = mission.size?.toLowerCase() || 'md'
               const tCount = mission.tasks?.length || 0
               if (sizeStr === 'sm' || sizeStr === 's' || sizeStr === 'small') {
                 if (tCount > 4) {
                   return (
                     <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-xs text-yellow-500/80 italic font-space px-2">
                       {isRTL ? "واضح إن الهدف ده فيه مهام كتير! إيه رأيك تكبر حجمه لـ Medium عشان يعكس مجهودك الحقيقي وتكسب نقاط XP أكتر؟" : "Looks like this goal has a lot of tasks! How about upgrading it to Medium to reflect your true effort and earn more XP?"}
                     </motion.div>
                   )
                 }
               } else if (sizeStr === 'md' || sizeStr === 'm' || sizeStr === 'medium') {
                 if (tCount > 8) {
                   return (
                     <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-xs text-yellow-500/80 italic font-space px-2">
                       {isRTL ? "المهام بدأت تزيد هنا! إيه رأيك تخليه Large؟ الحجم الأكبر هيديك مساحة أفضل وسقف XP أعلى يناسب تعبك." : "Tasks are piling up! Consider upgrading to Large to give yourself more space and unlock a higher XP ceiling."}
                     </motion.div>
                   )
                 }
               } else if (sizeStr === 'lg' || sizeStr === 'l' || sizeStr === 'large') {
                 if (tCount > 20) {
                   return (
                     <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-xs text-[var(--text-secondary)] italic font-space px-2 opacity-70">
                       {isRTL ? "عاش يا بطل، دخلت في الغويط! تقدر تضيف مهام براحتك لتنظيم كورس أو مشروعك، بس خلي بالك إن نقاط الـ XP ليها سقف هنا لحماية توازن السيستم." : "Awesome dedication! Feel free to add as many tasks as you need to organize your project, but keep in mind that XP rewards have a ceiling here to keep the system balanced."}
                     </motion.div>
                   )
                 }
               }
               return null
             })()}
           </div>
        </section>
      </div>

      {/* ── INTEL MODAL: Notes linked to this mission ── */}
      <AnimatePresence>
        {showIntelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-8 bg-white/80 dark:bg-black/80 backdrop-blur-md"
            onClick={() => setShowIntelModal(false)}
          >
            <motion.div
              initial={{ scale: 0.93, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.93, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-[calc(100%-2rem)] mx-auto md:max-w-2xl max-h-[85vh] overflow-y-auto relative border border-[var(--card-border)] bg-[var(--card-bg)] rounded-2xl my-auto"
              style={{ borderColor: `${missionColor}30` }}
            >
              {/* Top neon bar */}
              <div className="absolute top-0 inset-x-0 h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${missionColor}, transparent)` }} />

              <div className="p-6 md:p-10 space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl md:text-2xl font-black font-space uppercase italic" style={{ color: missionColor }}>
                      {isRTL ? 'الملاحظات' : 'NOTES'}
                    </h2>
                    <p className="text-[12px] font-space text-[var(--text-secondary)] tracking-widest uppercase font-black mt-1">
                      {linkedNotes.length} {isRTL ? 'سجل مرتبط' : 'RECORDS LINKED TO THIS MISSION'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowIntelModal(false)}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                  >
                    <span className="material-symbols-outlined text-2xl">close</span>
                  </button>
                </div>

                {linkedNotes.length === 0 ? (
                  <div className="py-16 text-center space-y-4">
                    <span className="material-symbols-outlined text-4xl text-[var(--text-secondary)]/20">notes</span>
                    <p className="text-[11px] font-space text-[var(--text-secondary)] tracking-[0.4em] uppercase font-black">
                      {isRTL ? 'لا توجد سجلات مرتبطة' : 'NO_INTEL_LINKED'}
                    </p>
                    <p className="text-[14px] font-space text-[var(--text-primary)] tracking-wider">
                      {isRTL ? 'اذهب إلى العقل وأنشئ ملاحظة مرتبطة بهذه المهمة' : 'Go to NOTES → NEW_LOG and link it to this mission'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {linkedNotes.map((note, idx) => (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-5 border rounded-xl relative"
                        style={{ borderColor: `${missionColor}20`, backgroundColor: `${missionColor}05` }}
                      >
                        <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: `linear-gradient(90deg, ${missionColor}60, transparent)` }} />
                        <p className={cn(
                          'text-sm leading-relaxed text-[var(--text-primary)]',
                          note.font_settings?.family === 'tajawal' ? 'font-tajawal' : 'font-space',
                          note.font_settings?.style === 'italic' ? 'italic' : ''
                        )}>
                          {note.content}
                        </p>
                        <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center">
                          <span className="text-[8px] font-space text-[var(--text-secondary)] tracking-widest uppercase">
                            {new Date(note.created_at).toLocaleDateString()}
                          </span>
                          {note.is_locked && (
                            <span className="material-symbols-outlined text-xs" style={{ color: missionColor }}>push_pin</span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Playlist Import Modal */}
      <PlaylistImportModal 
        isOpen={showPlaylistModal}
        onClose={() => setShowPlaylistModal(false)}
        missionId={id as string}
        themeColor={missionColor}
        onTasksAdded={(newTasks) => {
          setMission((prev: any) => ({
            ...prev,
            tasks: [...(prev.tasks || []), ...newTasks]
          }))
          showToast(isRTL ? 'تم استيراد قائمة التشغيل بنجاح' : 'PLAYLIST_IMPORTED // TASKS_DEPLOYED', 'success')
          playSuccess()
        }}
      />

      {/* Smart Import Modal */}
      <SmartImportModal
        isOpen={showSmartImportModal}
        onClose={() => setShowSmartImportModal(false)}
        missionId={id as string}
        themeColor={missionColor}
        onTasksAdded={(newTasks) => {
          setMission((prev: any) => ({
            ...prev,
            tasks: [...(prev.tasks || []), ...newTasks]
          }))
          showToast(
            isRTL
              ? `تم إضافة ${newTasks.length} مهمة بنجاح`
              : `SMART_IMPORT // ${newTasks.length} TASKS_DEPLOYED`,
            'success'
          )
          playSuccess()
        }}
      />

      {/* Attachments Modal */}
      {attachmentMissionId && (
        <MissionAttachmentsModal
          missionId={attachmentMissionId}
          missionTitle={mission?.title ?? ''}
          themeColor={missionColor}
          isOpen={!!attachmentMissionId}
          attachments={activeAttachments}
          setAttachments={setActiveAttachments}
          loading={modalLoading}
          onClose={() => {
            setAttachmentMissionId(null)
            setActiveAttachments([])
          }}
          onCountChange={count => setAttachmentCount(count)}
        />
      )}

      {/* Premium Centered Glassmorphic Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 dark:bg-black/80 backdrop-blur-md"
            onClick={() => { playBlip(); setShowShareModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white/95 dark:bg-zinc-950/70 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-2xl p-6 max-w-sm w-full relative overflow-hidden shadow-2xl space-y-6"
              style={{
                boxShadow: `0 0 40px ${missionColor}15`
              }}
            >
              {/* Header */}
              <div className="flex justify-between items-center pb-3 border-b border-zinc-200 dark:border-white/5">
                <div>
                  <h3 className="font-space text-[12px] font-black tracking-[0.2em] uppercase" style={{ color: missionColor }}>
                    {isRTL ? 'مشاركة المهمة' : 'SHARE MISSION'}
                  </h3>
                  <p className="text-[9px] text-[var(--text-secondary)] font-space tracking-wider uppercase mt-0.5">
                    {isRTL ? 'خيارات مشاركة المهمة' : 'MISSION SHARE OPTIONS'}
                  </p>
                </div>
                <button
                  onClick={() => { playBlip(); setShowShareModal(false); }}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              {/* Premium Cyberpunk Micro-Preview Card */}
              <div
                className="border bg-black/60 rounded-xl p-4 relative overflow-hidden flex flex-col justify-between h-36"
                style={{
                  borderColor: `${missionColor}33`,
                  boxShadow: `inset 0 0 15px ${missionColor}05`
                }}
              >
                <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: missionColor }} />
                
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[7px] font-space font-bold tracking-widest opacity-40 uppercase block text-white">
                      المهمة // MISSION
                    </span>
                    <h4 className="text-white text-xs font-bold truncate max-w-[160px] uppercase font-space tracking-wide mt-1">
                      {mission?.title || 'Mission'}
                    </h4>
                    <span className="text-[8px] text-zinc-400 font-space tracking-wider uppercase block mt-0.5">
                      {(mission?.size || 'md').toUpperCase()} GOAL
                    </span>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xl font-black font-space tracking-tighter" style={{ color: missionColor }}>
                      {Math.round(calculateAccountability(mission).progress)}%
                    </div>
                    <span className="text-[7px] text-white/30 font-space font-black tracking-widest uppercase">
                      {isRTL ? 'مكتمل' : 'COMPLETE'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mt-auto">
                  <div className="flex justify-between items-center text-[7px] font-space tracking-wider text-white/40">
                    <span>PROGRESS</span>
                    <span style={{ color: missionColor }}>{Math.round(calculateAccountability(mission).progress)}%</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${calculateAccountability(mission).progress}%`,
                        backgroundColor: missionColor,
                        boxShadow: `0 0 8px ${missionColor}`
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Exact 3 Row Buttons */}
              <div className="space-y-3 relative">
                {/* Generating Overlay */}
                {isGeneratingCard && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/90 dark:bg-black/70 backdrop-blur-sm rounded-xl">
                    <div className="relative w-12 h-12">
                      <div className="absolute inset-0 rounded-full border-t-2 border-l-2 border-transparent animate-spin" style={{ borderTopColor: missionColor, borderLeftColor: missionColor, filter: `drop-shadow(0 0 6px ${missionColor})` }} />
                      <div className="absolute inset-2 rounded-full border-b-2 border-r-2 border-transparent animate-spin" style={{ borderBottomColor: missionColor, borderRightColor: missionColor, opacity: 0.5, animationDirection: 'reverse' }} />
                    </div>
                    <span className="font-space text-[8px] tracking-[0.3em] uppercase animate-pulse" style={{ color: missionColor }}>
                      {isRTL ? 'جارٍ توليد الكارت...' : 'GENERATING CARD...'}
                    </span>
                  </div>
                )}

                {/* Option 1: Copy Link */}
                <button
                  onClick={() => {
                    playBlip()
                    navigator.clipboard.writeText(window.location.href)
                    showToast(isRTL ? 'تم نسخ رابط المهمة!' : 'MISSION LINK COPIED TO CLIPBOARD', 'success')
                    playSuccess()
                    setShowShareModal(false)
                  }}
                  className="w-full flex items-center justify-between p-3 border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-white/[0.02] hover:bg-zinc-100 dark:hover:bg-white/5 hover:border-zinc-300 dark:hover:border-white/10 rounded-xl transition-all group text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-lg transition-transform group-hover:scale-110" style={{ color: missionColor }}>link</span>
                    <div>
                      <span className="block font-space text-[10px] font-bold text-zinc-900 dark:text-white leading-none">
                        {isRTL ? 'نسخ رابط المهمة' : 'Copy Link'}
                      </span>
                      <span className="block text-[7px] text-zinc-600 dark:text-zinc-400 font-space tracking-widest uppercase mt-1">
                        {isRTL ? 'رابط الصفحة المباشر' : 'DIRECT PAGE URL'}
                      </span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-sm opacity-30 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5">chevron_right</span>
                </button>

                {/* Option 2: Download Story Card */}
                <button
                  onClick={downloadCardImage}
                  disabled={isGeneratingCard}
                  className="w-full flex items-center justify-between p-3 border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-white/[0.02] hover:bg-zinc-100 dark:hover:bg-white/5 hover:border-zinc-300 dark:hover:border-white/10 rounded-xl transition-all group text-left disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-lg transition-transform group-hover:scale-110" style={{ color: missionColor }}>download</span>
                    <div>
                      <span className="block font-space text-[10px] font-bold text-zinc-900 dark:text-white leading-none">
                        {isRTL ? 'تحميل كارت الاستوري (PNG)' : 'Download Story Card'}
                      </span>
                      <span className="block text-[7px] text-zinc-600 dark:text-zinc-400 font-space tracking-widest uppercase mt-1">
                        {isRTL ? 'حفظ الصورة بالجهاز' : 'SAVE PNG LOCAL FILE'}
                      </span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-sm opacity-30 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5">chevron_right</span>
                </button>

                {/* Option 3: Copy Card to Clipboard */}
                <button
                  onClick={copyCardImageToClipboard}
                  disabled={isGeneratingCard}
                  className="w-full flex items-center justify-between p-3 border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-white/[0.02] hover:bg-zinc-100 dark:hover:bg-white/5 hover:border-zinc-300 dark:hover:border-white/10 rounded-xl transition-all group text-left disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-lg transition-transform group-hover:scale-110" style={{ color: missionColor }}>content_copy</span>
                    <div>
                      <span className="block font-space text-[10px] font-bold text-zinc-900 dark:text-white leading-none">
                        {isRTL ? 'نسخ الكارت كصورة' : 'Copy Card to Clipboard'}
                      </span>
                      <span className="block text-[7px] text-zinc-600 dark:text-zinc-400 font-space tracking-widest uppercase mt-1">
                        {isRTL ? 'نسخ الحافظة للمشاركة السريعة' : 'COPY MEMORY TO CLIPBOARD'}
                      </span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-sm opacity-30 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5">chevron_right</span>
                </button>
              </div>

              {/* Status Footer */}
              <div className="p-3 bg-zinc-50 dark:bg-white/[0.02] rounded-lg border border-zinc-200 dark:border-white/5 text-center flex items-center justify-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: missionColor }}></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: missionColor }}></span>
                </span>
                <span className="font-space text-[8px] tracking-[0.25em] text-zinc-600 dark:text-zinc-400 uppercase">
                  {isRTL ? 'جاهز للمشاركة' : 'READY TO SHARE'}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Shell>
  )
}
