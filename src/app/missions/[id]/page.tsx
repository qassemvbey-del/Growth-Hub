'use client'

import { Calendar, Check, CheckCircle2, CheckSquare, Download, Eye, HelpCircle, Link, ListPlus, Lock, Medal, Paperclip, Pin, Share2, Shield, Timer, Trash2, Users2, X, ChevronDown, Clipboard as ClipboardIcon, Play, Tv, Zap, Crosshair } from 'lucide-react'
import { NeonIcon } from '@/components/ui/NeonIcon'
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
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
import TaskDrawer from '@/components/ui/TaskDrawer'
import InlineGuideTip from '@/components/ui/InlineGuideTip'
import KanbanBoard from '@/components/ui/KanbanBoard'

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

// --- HELPER COMPONENT: COMPLEXITY DASHES ---
const ComplexityDashes = ({ weight, color }: { weight: number; color: string }) => {
  const activeCount = Math.min(5, Math.max(1, weight))
  return (
    <div className="flex gap-[3px] items-center">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`w-3 h-[2px] rounded-sm transition-all duration-300 ${i < activeCount ? '' : 'bg-white/10'}`}
          style={i < activeCount ? { backgroundColor: color, boxShadow: `0 0 5px ${color}` } : {}}
        />
      ))}
    </div>
  )
}

export default function MissionDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { calculateAccountability, t, isRTL, mounted, addXp, currentTheme, profile } = useGrowth()
  const { showToast } = useToast()
  const { playSuccess, playError, playBlip } = useSound()
  const [mission, setMission] = useState<any>(null)
  const [squadMembers, setSquadMembers] = useState<any[]>([])
  const [showSquadPanel, setShowSquadPanel] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [isReviewing, setIsReviewing] = useState<string | null>(null)
  const [activeAssignPopover, setActiveAssignPopover] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'list' | 'board'>('list')
  const [activeViewInitialized, setActiveViewInitialized] = useState(false)
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'WEEK' | 'OVERDUE'>('ALL')
  const [selectedTaskState, setSelectedTaskState] = useState<any | null>(null)
  const selectedTask = useMemo(() => {
    if (!selectedTaskState) return null
    return mission?.tasks?.find((t: any) => t.id === selectedTaskState.id) || selectedTaskState
  }, [mission?.tasks, selectedTaskState])

  const [onlineUsers, setOnlineUsers] = useState<any[]>([])
  const [mySessionColor, setMySessionColor] = useState<string | null>(null)
  const presenceChannelRef = useRef<any>(null)

  const setSelectedTask = (task: any | null) => {
    setSelectedTaskState(task)
  }

  const filteredTasks = useMemo(() => {
    if (!mission?.tasks) return []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(today.getDate() + 7)
    sevenDaysFromNow.setHours(23, 59, 59, 999)

    return mission.tasks.filter((task: any) => {
      const isCompleted = task.is_completed || task.metadata?.status === 'done'
      const dateStr = task.metadata?.endDate || task.metadata?.dueDate
      
      if (timeFilter === 'ALL') return true

      if (!dateStr) return false

      const taskDate = new Date(dateStr)
      taskDate.setHours(0, 0, 0, 0)

      if (timeFilter === 'WEEK') {
        return !isCompleted && taskDate >= today && taskDate <= sevenDaysFromNow
      }
      if (timeFilter === 'OVERDUE') {
        return !isCompleted && taskDate < today
      }
      return true
    })
  }, [mission?.tasks, timeFilter])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskWeight, setNewTaskWeight] = useState(1)
  const [linkedNotes, setLinkedNotes] = useState<any[]>([])
  const [showIntelModal, setShowIntelModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showImportDropdown, setShowImportDropdown] = useState(false)
  const [copiedRow, setCopiedRow] = useState<'invite' | 'public' | null>(null)
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

  // --- SQUAD HELPERS & EVENT HANDLERS ---
  const getRankRingClass = (rank: string) => {
    const r = rank?.toUpperCase()
    if (r === 'CONQUEROR') return 'border-2 border-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]'
    if (r === 'ACE') return 'border-2 border-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)] font-bold'
    return 'border border-zinc-500'
  }

  const canToggleTask = (task: any) => {
    if (mission?.metadata?.type !== 'squad') return true
    
    const currentUserMember = squadMembers.find(m => m.id === profile?.id)
    const currentUserRole = currentUserMember?.role
    const isOwner = mission?.user_id === profile?.id || currentUserRole === 'owner'
    const isCoAdmin = currentUserRole === 'co-admin'
    const isPrivileged = isOwner || isCoAdmin
    
    if (!task.assigned_to) {
      return isPrivileged
    } else {
      return task.assigned_to === profile?.id || isPrivileged
    }
  }

  const handleAssignClick = async (e: React.MouseEvent, task: any) => {
    e.stopPropagation()
    if (mission?.metadata?.type !== 'squad') return
    
    const currentUserMember = squadMembers.find(m => m.id === profile?.id)
    const currentUserRole = currentUserMember?.role
    const isOwner = mission?.user_id === profile?.id || currentUserRole === 'owner'
    const isCoAdmin = currentUserRole === 'co-admin'
    const isPrivileged = isOwner || isCoAdmin
    
    if (isPrivileged) {
      setActiveAssignPopover(activeAssignPopover === task.id ? null : task.id)
    } else {
      if (!task.assigned_to) {
        const { error } = await supabase
          .from('tasks')
          .update({ assigned_to: profile?.id })
          .eq('id', task.id)
        if (!error) {
          const userProfile = {
            id: profile?.id,
            full_name: profile?.full_name || 'Unknown Operator',
            avatar_url: profile?.avatar_url || null,
            rank: profile?.rank || 'ROOKIE'
          }
          setMission((prev: any) => ({
            ...prev,
            tasks: prev.tasks.map((t: any) => t.id === task.id ? { ...t, assigned_to: profile?.id, assignee: userProfile } : t)
          }))
          showToast(isRTL ? "تم تعيين المهمة لك" : "TASK ASSIGNED TO YOU", "success")
          playSuccess()
        }
      } else if (task.assigned_to === profile?.id) {
        const { error } = await supabase
          .from('tasks')
          .update({ assigned_to: null })
          .eq('id', task.id)
        if (!error) {
          setMission((prev: any) => ({
            ...prev,
            tasks: prev.tasks.map((t: any) => t.id === task.id ? { ...t, assigned_to: null, assignee: null } : t)
          }))
          showToast(isRTL ? "تم إلغاء التعيين" : "TASK UNASSIGNED", "success")
          playSuccess()
        }
      } else {
        showToast(isRTL ? "هذه المهمة معينة بالفعل لشخص آخر" : "TASK ALREADY ASSIGNED TO ANOTHER MEMBER", "warning")
        playError()
      }
    }
  }

  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveAssignPopover(null)
    }
    window.addEventListener('click', handleGlobalClick)
    return () => window.removeEventListener('click', handleGlobalClick)
  }, [])

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
      showToast(isRTL ? 'الكارت غير متوفر حالياً // يعمل في البيئة الإنتاجية' : 'CARD_UNAVAILABLE // Works on production', 'warning')
      playError()
      setShowShareModal(false)
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
      showToast(isRTL ? 'تم تحميل الكارت بنجاح!' : 'GOAL CARD DOWNLOADED SUCCESSFULLY', 'success')
      playSuccess()
      setShowShareModal(false)
    } catch (err) {
      console.error('Failed to download image blob:', err)
      showToast(isRTL ? 'الكارت غير متوفر حالياً // يعمل في البيئة الإنتاجية' : 'CARD_UNAVAILABLE // Works on production', 'warning')
      playError()
      setShowShareModal(false)
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

  const fetchPendingRequests = useCallback(async () => {
    if (!id || !profile?.id || !mission) return
    const isOwner = mission.user_id === profile.id
    if (!isOwner || mission.metadata?.type !== 'squad') return

    const { data, error } = await supabase
      .from('squad_join_requests')
      .select('*, profiles(*)')
      .eq('goal_id', id)
      .eq('status', 'pending')

    if (error) {
      console.error("ERROR FETCHING PENDING REQUESTS:", error)
      return
    }

    if (data) {
      setPendingRequests(data)
    }
  }, [id, profile?.id, mission, supabase])

  useEffect(() => {
    if (mounted) {
      fetchMission()
      fetchAttachmentCount()
      fetchTimeStats()
    }
  }, [id, mounted])

  useEffect(() => {
    if (mounted && mission?.id && profile?.id) {
      fetchPendingRequests()
    }
  }, [mounted, mission?.id, profile?.id, fetchPendingRequests])

  useEffect(() => {
    setActiveViewInitialized(false)
  }, [id])

  useEffect(() => {
    if (mission && !activeViewInitialized) {
      const defaultView = mission.metadata?.defaultView || 'list'
      setActiveView(defaultView)
      setActiveViewInitialized(true)
    }
  }, [mission, activeViewInitialized])

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

  useEffect(() => {
    if (mission?.tasks && mission.tasks.length > 0) {
      const params = new URLSearchParams(window.location.search)
      const taskId = params.get('task')
      if (taskId) {
        const found = mission.tasks.find((t: any) => t.id === taskId)
        if (found) {
          setSelectedTask(found)
        }
      }
    }
  }, [mission?.tasks])

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
        goal.tasks = (goal.tasks || []).sort((a: any, b: any) => {
          const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          if (diff !== 0) return diff
          return a.id.localeCompare(b.id)
        })
        setMission(goal)
      } else {
        router.push('/missions')
      }
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('cups')
      .select('*, tasks(*, assignee:profiles!assigned_to(*))')
      .eq('id', id)
      .single()

    if (data) {
      data.tasks = (data.tasks || []).sort((a: any, b: any) => {
        const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        if (diff !== 0) return diff
        return a.id.localeCompare(b.id)
      })
      setMission(data)

      // Fetch squad members if goal type is squad
      if (data.metadata?.type === 'squad') {
        const { data: members } = await supabase
          .from('goal_members')
          .select('*, profiles(*)')
          .eq('goal_id', id)
        
        if (members) {
          setSquadMembers(
            members.map((m: any) => ({
              id: m.profiles?.id || m.user_id,
              member_row_id: m.id,
              full_name: m.profiles?.full_name || 'Unknown Operator',
              avatar_url: m.profiles?.avatar_url || null,
              rank: m.profiles?.rank || 'ROOKIE',
              role: m.role,
              last_seen: m.profiles?.last_seen || null
            }))
          )
        }
      }
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

  // --- REAL-TIME CHANNEL SYNCHRONIZATION (squad goals only) ---
  useEffect(() => {
    if (!id || typeof id !== 'string' || id.startsWith('local_')) return
    if (!mission || mission.metadata?.type !== 'squad') return

    // Targeted squad members refetch (avoids full mission reload)
    const refetchSquadMembers = async () => {
      const { data: members } = await supabase
        .from('goal_members')
        .select('*, profiles(*)')
        .eq('goal_id', id)
      if (members) {
        setSquadMembers(
          members.map((m: any) => ({
            id: m.profiles?.id || m.user_id,
            member_row_id: m.id,
            full_name: m.profiles?.full_name || 'Unknown Operator',
            avatar_url: m.profiles?.avatar_url || null,
            rank: m.profiles?.rank || 'ROOKIE',
            role: m.role,
            last_seen: m.profiles?.last_seen || null,
          }))
        )
      }
    }

    const channel = supabase
      .channel(`squad-tasks:${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        async (payload: any) => {
          console.log('REALTIME MISSION TASKS PAYLOAD:', payload)
          // Re-query database clean state to trigger a full clean React state update and UI re-render
          await fetchMission()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'goal_members' },
        async (payload: any) => {
          console.log('REALTIME MISSION GOAL MEMBERS PAYLOAD:', payload)
          refetchSquadMembers()
          fetchPendingRequests()
          await fetchMission()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'squad_join_requests' },
        async (payload: any) => {
          console.log('REALTIME MISSION JOIN REQUESTS PAYLOAD:', payload)
          fetchPendingRequests()
          await fetchMission()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, mission?.metadata?.type, fetchPendingRequests, supabase])

  // --- REAL-TIME PRESENCE ---
  useEffect(() => {
    if (!id || typeof id !== 'string' || id.startsWith('local_')) return
    if (mission?.metadata?.type !== 'squad' || !profile?.id) return

    const PALETTE = ['#1D9E75', '#BA7517', '#7F77DD', '#D85A30', '#378ADD']

    const channel = supabase.channel('workspace', {
      config: {
        presence: {
          key: profile.id,
        },
      },
    })

    presenceChannelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const users = Object.values(state).flatMap((presences: any) => presences[0] || [])
        setOnlineUsers(users)

        // Color assignment logic
        setMySessionColor((prevColor) => {
          if (prevColor) return prevColor

          // Extract colors taken by other users
          const otherColors = users
            .filter((u: any) => u.user_id !== profile.id)
            .map((u: any) => u.session_color)

          // Assign first unused color from the palette
          const assigned = PALETTE.find((c) => !otherColors.includes(c)) || PALETTE[0]
          
          // Track presence with assigned color
          channel.track({
            user_id: profile.id,
            full_name: profile.full_name || 'Anonymous',
            rank: profile.rank || 'ROOKIE',
            avatar_url: profile.avatar_url,
            session_color: assigned,
            cursor_task_id: selectedTaskRef.current || null
          })

          return assigned
        })
      })
      .subscribe()

    return () => {
      if (presenceChannelRef.current) {
        presenceChannelRef.current.untrack()
        supabase.removeChannel(presenceChannelRef.current)
        presenceChannelRef.current = null
      }
    }
  }, [id, mission?.metadata?.type, profile, supabase])

  // Track cursor_task_id when selectedTask changes
  const selectedTaskRef = useRef<string | null>(null)
  useEffect(() => {
    selectedTaskRef.current = selectedTask?.id || null
    if (presenceChannelRef.current && mySessionColor && profile?.id) {
      presenceChannelRef.current.track({
        user_id: profile.id,
        full_name: profile.full_name || 'Anonymous',
        rank: profile.rank || 'ROOKIE',
        avatar_url: profile.avatar_url,
        session_color: mySessionColor,
        cursor_task_id: selectedTask?.id || null
      })
    }
  }, [selectedTask?.id, mySessionColor, profile])

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

  const updateTaskProgress = useCallback((taskId: string, progress: number, duration: number) => {
    setMission((prev: any) => {
      if (!prev || !prev.tasks) return prev
      const nextTasks = prev.tasks.map((t: any) =>
        t.id === taskId ? { ...t, video_progress: progress, video_duration: duration } : t
      )
      const next = { ...prev, tasks: nextTasks }
      const isLocal = typeof id === 'string' && id.startsWith('local_')
      if (isLocal) {
        const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
        const updatedGoals = guestGoals.map((g: any) => g.id === id ? next : g)
        localStorage.setItem('guest_goals', JSON.stringify(updatedGoals))
      }
      return next
    })
  }, [id])

  const onUpdateTask = async (taskId: string, updates: any) => {
    const isLocal = typeof id === 'string' && id.startsWith('local_')

    if (isLocal) {
      setMission((prev: any) => {
        if (!prev || !prev.tasks) return prev
        const nextTasks = prev.tasks.map((t: any) =>
          t.id === taskId ? { ...t, ...updates } : t
        )
        const next = { ...prev, tasks: nextTasks }
        const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
        const updatedGoals = guestGoals.map((g: any) => g.id === id ? next : g)
        localStorage.setItem('guest_goals', JSON.stringify(updatedGoals))
        return next
      })
      return
    }

    // Separate relational fields from database columns
    const { assignee, ...dbUpdates } = updates

    const { error } = await supabase
      .from('tasks')
      .update(dbUpdates)
      .eq('id', taskId)

    if (!error) {
      setMission((prev: any) => {
        if (!prev || !prev.tasks) return prev
        const nextTasks = prev.tasks.map((t: any) =>
          t.id === taskId ? { ...t, ...updates } : t
        )
        return { ...prev, tasks: nextTasks }
      })
    } else {
      console.error("Error updating task backend:", error)
      showToast(isRTL ? 'فشل تحديث البيانات في قاعدة البيانات' : 'DATABASE_UPDATE_ERROR', 'warning')
      playError()
    }
  }

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
              await addXp(task.weight * 10, task.title)
            } else {
              // Soft cap reached: 0 XP
            }
            playSuccess()
          }
        }
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const taskIndex = mission.tasks.findIndex((t: any) => t.id === taskId)
          const task = mission.tasks[taskIndex]
          if (task) {
            const sizeStr = mission.size?.toLowerCase() || 'md'
            let xpCeiling = 8
            if (sizeStr === 'sm' || sizeStr === 's' || sizeStr === 'small') xpCeiling = 4
            else if (sizeStr === 'lg' || sizeStr === 'l' || sizeStr === 'large') xpCeiling = 20

            if (taskIndex < xpCeiling) {
              await addXp(-(task.weight * 10))
            }
          }
        }
        playBlip()
      }
    }
  }

  const onMoveTask = async (taskId: string, newColumnId: string) => {
    const isLocal = typeof id === 'string' && id.startsWith('local_')
    const nextCompleted = newColumnId === 'done'
    
    // Find target task to check if its completion state changed
    const taskIndex = mission?.tasks?.findIndex((t: any) => t.id === taskId)
    if (taskIndex === -1 || taskIndex === undefined) return
    const task = mission.tasks[taskIndex]
    const wasCompleted = task.is_completed

    const updates = {
      is_completed: nextCompleted,
      metadata: {
        ...(task.metadata || {}),
        status: newColumnId
      }
    }

    if (isLocal) {
      setMission((prev: any) => {
        const next = {
          ...prev,
          tasks: prev.tasks.map((t: any) => t.id === taskId ? { ...t, ...updates } : t)
        }
        const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
        const updatedGoals = guestGoals.map((g: any) => g.id === id ? next : g)
        localStorage.setItem('guest_goals', JSON.stringify(updatedGoals))
        return next
      })

      if (wasCompleted !== nextCompleted) {
        if (nextCompleted) playSuccess()
        else playBlip()
      }
      return
    }

    // Supabase mode
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)

    if (!error) {
      setMission((prev: any) => ({
        ...prev,
        tasks: prev.tasks.map((t: any) =>
          t.id === taskId ? { ...t, ...updates } : t
        )
      }))

      if (wasCompleted !== nextCompleted) {
        if (nextCompleted) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            await supabase.from('task_completion_log').insert({
              user_id: user.id,
              completed_at: new Date().toISOString()
            })
            const sizeStr = mission.size?.toLowerCase() || 'md'
            let xpCeiling = 8
            if (sizeStr === 'sm' || sizeStr === 's' || sizeStr === 'small') xpCeiling = 4
            else if (sizeStr === 'lg' || sizeStr === 'l' || sizeStr === 'large') xpCeiling = 20

            if (taskIndex < xpCeiling) {
              await addXp(task.weight * 10, task.title)
            }
            playSuccess()
          }
        } else {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const sizeStr = mission.size?.toLowerCase() || 'md'
            let xpCeiling = 8
            if (sizeStr === 'sm' || sizeStr === 's' || sizeStr === 'small') xpCeiling = 4
            else if (sizeStr === 'lg' || sizeStr === 'l' || sizeStr === 'large') xpCeiling = 20

            if (taskIndex < xpCeiling) {
              await addXp(-(task.weight * 10))
            }
          }
          playBlip()
        }
      }
    } else {
      console.error("Error moving task:", error)
      showToast(isRTL ? 'فشل نقل المهمة' : 'TASK_MOVE_ERROR', 'warning')
      playError()
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
              : `FOCUS CAPACITY FULL (${usedSlots.toFixed(1).replace('.0','')}/9 SLOTS) — Complete or un-equip existing goals.`,
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
    if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذه المهمة؟' : 'CONFIRM GOAL TERMINATION?')) return
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
    if (error) {
      console.error('Delete cup error:', error)
      showToast(isRTL ? `فشل الحذف: ${error.message}` : `DELETE FAILED: ${error.message}`, 'warning')
    } else {
      showToast(isRTL ? 'تم حذف المهمة' : 'GOAL DELETED', 'success')
      router.push('/missions')
    }
  }

    const toggleSquadRule = async (targetMission: any, ruleKey: string) => {
    playBlip()
    const currentRules = targetMission.metadata?.rules || {}
    const newRules = { ...currentRules, [ruleKey]: !currentRules[ruleKey] }
    const newMetadata = {
      ...targetMission.metadata,
      rules: newRules
    }
    
    // Update local state
    setMission((prev: any) => {
      if (!prev) return prev
      return { ...prev, metadata: newMetadata }
    })
    
    // Update Supabase
    const { error } = await supabase
      .from('cups')
      .update({ metadata: newMetadata })
      .eq('id', id)
    
    if (error) {
      showToast(isRTL ? "فشل تحديث القواعد" : "FAILED TO UPDATE SQUAD RULES", "warning")
      playError()
    } else {
      showToast(isRTL ? "تم تحديث قواعد الفريق!" : "SQUAD RULES UPDATED", "success")
      playSuccess()
    }
  }

  const leaveSquad = async () => {
    if (confirm(isRTL ? 'هل أنت متأكد من مغادرة الفريق؟' : 'Are you sure you want to leave the squad?')) {
      playBlip()
      const { error } = await supabase
        .from('goal_members')
        .delete()
        .eq('goal_id', id)
        .eq('user_id', profile?.id)
      
      if (error) {
        showToast(isRTL ? 'فشل مغادرة الفريق' : 'FAILED TO LEAVE SQUAD', 'warning')
        playError()
      } else {
        showToast(isRTL ? 'لقد غادرت الفريق بنجاح' : 'YOU HAVE LEFT THE SQUAD', 'success')
        playSuccess()
        setShowSquadPanel(false)
        router.push('/missions')
      }
    }
  }

const { progress, isInRedZone } = useMemo(() => {
    if (!mission) return { progress: 0, isInRedZone: false, status: 'ON_TRACK' }
    return calculateAccountability(mission)
  }, [mission])

  const roundedProgress = Math.round(progress)

  const activeTodayCount = useMemo(() => {
    return squadMembers.filter(m => {
      if (!m.last_seen) return false
      const diff = Date.now() - new Date(m.last_seen).getTime()
      return diff < 24 * 60 * 60 * 1000
    }).length
  }, [squadMembers])

  if (loading || !mounted) return (
    <Shell>
      <div className="p-16 font-space animate-pulse tracking-widest text-sm uppercase" style={{ color: currentTheme.color }}>
        {isRTL ? 'جاري التحميل...' : 'LOADING WORKSPACE...'}
      </div>
    </Shell>
  )

  if (!mission) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center font-space">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-lg bg-black/60 border border-[#FF0055]/30 backdrop-blur-xl p-8 md:p-12 rounded-2xl shadow-[0_0_50px_rgba(255,0,85,0.15)] relative overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-[#FF0055]" />

            <div className="flex flex-col items-center gap-6">
              <Lock className="text-5xl text-[#FF0055] animate-pulse w-12 h-12" />
              <div className="space-y-2">
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-[#FF0055]">
                  CLASSIFIED_GOAL // ACCESS DENIED
                </h2>
                <p className="text-xs md:text-sm font-bold text-zinc-400 max-w-sm leading-relaxed">
                  This is a Squad goal. Join with an invite code to access.
                </p>
              </div>

              <button
                onClick={() => {
                  playBlip()
                  router.push('/goals/squad?join=true')
                }}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-teal-500/50 hover:border-teal-400 text-teal-400 hover:text-teal-300 bg-teal-500/5 hover:bg-teal-500/10 font-space text-xs font-black uppercase tracking-widest transition-all duration-300 active:scale-95 cursor-pointer"
              >
                <Link className="text-base w-4 h-4" />
                JOIN WITH CODE
              </button>
            </div>
          </motion.div>
        </div>
      </Shell>
    )
  }

  const missionColor = currentTheme.color
  const isCurrentUserOwner = mission?.user_id === profile?.id
  const completedCount = mission?.tasks?.filter((t: any) => t.is_completed).length || 0
  const totalCount = mission?.tasks?.length || 0

  return (
    <Shell>
      <div className="w-full max-w-7xl mx-auto px-4 md:px-8 p-4 md:p-12 space-y-8 md:space-y-12">
        
        {/* Mission Header Overview */}
        <section className="bg-[var(--card-bg)] border border-[var(--card-border)] p-6 md:p-12 rounded-sm space-y-6 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2.5px]" style={{ background: missionColor }} />
            
            <div className="flex justify-between items-start gap-4">
               <div className="space-y-1 flex-1 min-w-0">
                  <h1 className="text-2xl md:text-5xl font-black font-space tracking-tighter uppercase text-[var(--text-primary)] leading-none break-words">
                     {mission.title}
                  </h1>
               </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                   <div className="flex items-center gap-2 md:gap-4">
                      <button 
                         onClick={deleteMission}
                         className="p-2 text-black/20 dark:text-white/10 hover:text-red-500 hover:bg-red-500/10 transition-all rounded-full"
                         title={isRTL ? 'حذف المهمة' : 'DELETE_GOAL'}
                      >
                         <HelpCircle />
                      </button>
                      <span className="text-3xl md:text-6xl font-black font-space" style={{ color: missionColor }}>{roundedProgress}%</span>
                   </div>
                   <p className="text-[9px] font-space text-[var(--text-secondary)] tracking-[0.4em] uppercase font-black">{isRTL ? 'مكتمل' : 'Complete'}</p>
                </div>
            </div>

            {/* Horizontal Stats Row */}
            <div className="flex flex-wrap items-center pt-4 border-t border-white/5 gap-y-2">
               <div className="inline-flex items-center text-xs font-mono text-white/50 border-r border-white/10 pr-3 mr-3 last:border-0">
                  <HelpCircle />
                  <span>{isRTL ? 'إجمالي التركيز:' : 'Total Focus:'} <strong className="text-white font-black ml-1">{Math.floor(totalTimeInvested / 60)}h {totalTimeInvested % 60}m</strong></span>
               </div>
               <div className="inline-flex items-center text-xs font-mono text-white/50 border-r border-white/10 pr-3 mr-3 last:border-0">
                  <HelpCircle />
                  <span>{isRTL ? 'مكتمل:' : 'Done:'} <strong className="text-white font-black ml-1">{completedCount}</strong></span>
               </div>
               <div className="inline-flex items-center text-xs font-mono text-white/50 border-r border-white/10 pr-3 mr-3 last:border-0">
                  <CheckSquare className="text-sm mr-1.5 w-3.5 h-3.5" style={{ color: missionColor }} />
                  <span>{isRTL ? 'المهام الإجمالية:' : 'Total Tasks:'} <strong className="text-white font-black ml-1">{totalCount}</strong></span>
               </div>
            </div>

            {/* Squad Facepile — Clickable, capped to 3 + overflow bubble */}
            {mission?.metadata?.type === 'squad' && squadMembers.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-white/5">
                <span className="text-[10px] font-mono text-white/40 tracking-widest uppercase font-black">
                  {isRTL ? '\u0627\u0644\u0641\u0631\u064a\u0642:' : 'SQUAD:'}
                </span>

                {/* Clickable Facepile */}
                <button
                  onClick={() => { playBlip(); setShowSquadPanel(true); }}
                  className="flex items-center group cursor-pointer"
                  title={isRTL ? '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0641\u0631\u064a\u0642' : 'Manage Squad'}
                >
                  <div className="flex items-center -space-x-2.5">
                    {squadMembers.slice(0, 3).map((m: any) => {
                      const isOwner = m.role === 'owner' || mission?.user_id === m.id || mission?.user_id === m.user_id
                      const onlinePresence = onlineUsers.find((ou: any) => ou.user_id === m.id)
                      return (
                        <div key={m.id} className="relative shrink-0 z-10 hover:z-20">
                          <div className={cn(
                            "w-8 h-8 rounded-full overflow-hidden bg-zinc-950 flex items-center justify-center relative transition-transform group-hover:scale-105",
                            isOwner ? "border-2 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]" : "border-2 border-teal-500/60"
                          )}>
                            {m.avatar_url ? (
                              <img src={m.avatar_url} alt={m.full_name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-bold text-white">
                                {m.full_name?.charAt(0) || '?'}
                              </span>
                            )}
                          </div>
                          {isOwner && (
                            <div className="absolute -top-2 -right-1.5 text-[10px] drop-shadow-[0_0_4px_rgba(0,0,0,0.8)] z-30 select-none">👑</div>
                          )}
                          {onlinePresence && (
                            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full z-30 flex">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: onlinePresence.session_color }}></span>
                              <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: onlinePresence.session_color }}></span>
                            </span>
                          )}
                        </div>
                      )
                    })}

                    {/* +X overflow bubble */}
                    {squadMembers.length > 3 && (
                      <div className="relative z-10 w-8 h-8 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center text-[10px] font-black text-white/70 group-hover:bg-zinc-700 transition-colors">
                        +{squadMembers.length - 3}
                      </div>
                    )}

                    {/* Pending requests badge */}
                    {pendingRequests.length > 0 && (
                      <div className="relative z-20 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-black animate-pulse" style={{ backgroundColor: '#f59e0b' }}>
                        {pendingRequests.length}
                      </div>
                    )}
                  </div>

                  {/* Count label */}
                  <span className="ml-3 text-xs font-mono text-white/40 group-hover:text-white/60 transition-colors">
                    {squadMembers.length} {isRTL ? '\u0639\u0636\u0648' : 'members'} {onlineUsers.length > 0 ? `• ${onlineUsers.length} ${isRTL ? '\u0623\u0648\u0646\u0644\u0627\u064a\u0646' : 'online'}` : ''}
                  </span>
                </button>
              </div>
            )}
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
              {/* PIN ICON TOGGLE */}
              <button 
                 onClick={() => { playBlip(); updateMission({ sync_to_dashboard: !mission.sync_to_dashboard }); }}
                 className={cn(
                    "p-3 border transition-all rounded-lg flex items-center justify-center cursor-pointer",
                    mission.sync_to_dashboard 
                       ? "bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]" 
                       : "border-[var(--card-border)] text-[var(--text-secondary)] hover:opacity-85 hover:border-white/20"
                 )}
                 style={mission.sync_to_dashboard ? { 
                    borderColor: missionColor, color: missionColor,
                    backgroundColor: `${missionColor}11`,
                    boxShadow: `0 0 15px ${missionColor}44`
                 } : {}}
                 title={mission.sync_to_dashboard ? (isRTL ? 'إلغاء التثبيت من الواجهة' : 'UNPIN FROM DASHBOARD') : (isRTL ? 'تثبيت في الواجهة' : 'PIN TO DASHBOARD')}
              >
                 <Pin className={cn("w-4.5 h-4.5", mission.sync_to_dashboard ? "rotate-45 fill-current" : "")} />
              </button>

              {/* GROUPED IMPORT DATA DROPDOWN */}
              <div className="relative">
                <button
                   onClick={() => { playBlip(); setShowImportDropdown(!showImportDropdown); }}
                   className="px-4 md:px-5 py-3 border font-space text-[10px] font-black tracking-[0.2em] transition-all rounded-lg uppercase flex items-center gap-2 border-[var(--card-border)] text-white hover:bg-white/5 hover:border-white/20 cursor-pointer"
                >
                   <span>[ IMPORT DATA ]</span>
                   <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", showImportDropdown && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {showImportDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowImportDropdown(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute left-0 mt-2 w-56 bg-zinc-950 border border-white/10 rounded-xl shadow-2xl z-50 p-1.5 space-y-1 font-space"
                      >
                        <button
                          onClick={() => { playBlip(); setShowPlaylistModal(true); setShowImportDropdown(false); }}
                          className="w-full text-left px-3.5 py-2.5 text-[9px] font-black tracking-wider uppercase text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <ListPlus className="w-3.5 h-3.5" />
                          {isRTL ? 'استيراد قائمة تشغيل' : 'IMPORT PLAYLIST'}
                        </button>
                        <button
                          onClick={() => { playBlip(); setShowSmartImportModal(true); setShowImportDropdown(false); }}
                          className="w-full text-left px-3.5 py-2.5 text-[9px] font-black tracking-wider uppercase text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <ClipboardIcon className="w-3.5 h-3.5" />
                          {isRTL ? 'استيراد ذكي' : 'SMART IMPORT'}
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* INTEL/NOTES button */}
              <button
                onClick={() => { playBlip(); setShowIntelModal(true); }}
                className="px-4 md:px-5 py-3 border font-space text-[10px] font-black tracking-[0.2em] transition-all rounded-lg uppercase flex items-center gap-2.5 relative border-[var(--card-border)] text-[var(--text-secondary)] hover:opacity-85 hover:border-white/20 cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
                {isRTL ? 'الملاحظات' : 'NOTES'}
                {linkedNotes.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center text-black" style={{ backgroundColor: missionColor }}>
                    {linkedNotes.length}
                  </span>
                )}
              </button>

              {/* TACTICAL SHARE button */}
              <button
                 onClick={handleShare}
                 className="px-4 md:px-6 py-3 border font-space text-[10px] font-black tracking-[0.2em] transition-all rounded-lg uppercase flex items-center gap-2.5 bg-cyan-500 border-cyan-500 hover:bg-cyan-400 hover:border-cyan-400 text-zinc-950 font-black shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_22px_rgba(6,182,212,0.6)] cursor-pointer"
              >
                 <Share2 className="w-4 h-4 stroke-[3px] text-zinc-950" />
                 {isRTL ? 'مشاركة' : 'SHARE'}
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

                  const details = encodeURIComponent(`Growth Hub Goal | Progress: ${percentage}% | Tasks: ${completed}/${total}`);
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
                <Calendar className="text-xl w-5 h-5" />
             </button>

             <button
                onClick={openAttachments}
                className="w-10 h-10 border border-[var(--card-border)] text-[var(--text-secondary)] hover:opacity-85 flex items-center justify-center rounded-sm relative transition-all"
                title="GOAL_ATTACHMENTS"
             >
                <Paperclip className="text-xl w-5 h-5" />
                {attachmentCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center text-black" style={{ backgroundColor: missionColor }}>
                    {attachmentCount}
                  </span>
                )}
             </button>
           </div>
         </div>

        {/* Full-width Kanban board / Tasks layout */}
        <div className="w-full space-y-8">
            <section className="space-y-8">
           <div className="flex justify-between items-center border-b border-[var(--card-border)] pb-4">
              <div className="flex items-center gap-4">
                <h2 className="text-[10px] font-black font-space text-[var(--text-secondary)] tracking-[0.5em] uppercase">{isRTL ? 'قائمة المهام' : 'TASKS'}</h2>
              </div>
              
              {/* Premium Segmented Layout View Toggle switcher with Smart Time Filters */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Smart Time Filters */}
                <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/5 backdrop-blur-md rounded-lg">
                  {[
                    { key: 'ALL', label: isRTL ? 'الكل' : 'All Active' },
                    { key: 'WEEK', label: isRTL ? 'هذا الأسبوع' : 'Upcoming This Week' },
                    { key: 'OVERDUE', label: isRTL ? 'المتأخرة' : 'Overdue' }
                  ].map(f => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => { playBlip(); setTimeFilter(f.key as any); }}
                      className={cn(
                        "px-2.5 py-1 rounded font-space text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                        timeFilter === f.key
                          ? "bg-white/10 text-white font-black"
                          : "text-white/40 hover:text-white/70"
                      )}
                      style={timeFilter === f.key ? { color: missionColor, backgroundColor: `${missionColor}10` } : {}}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/5 backdrop-blur-md rounded-lg">
                  <button
                    type="button"
                    onClick={() => { playBlip(); setActiveView('list'); }}
                    className={cn(
                      "px-3 py-1.5 font-space text-[10px] font-black tracking-widest uppercase transition-all rounded-md flex items-center gap-1.5 cursor-pointer",
                      activeView === 'list'
                        ? "bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                        : "text-white/40 hover:text-white/70"
                    )}
                    style={activeView === 'list' ? { color: missionColor, backgroundColor: `${missionColor}15`, borderColor: `${missionColor}30` } : {}}
                  >
                    <HelpCircle />
                    {isRTL ? 'قائمة' : 'LIST VIEW'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { playBlip(); setActiveView('board'); }}
                    className={cn(
                      "px-3 py-1.5 font-space text-[10px] font-black tracking-widest uppercase transition-all rounded-md flex items-center gap-1.5 cursor-pointer",
                      activeView === 'board'
                        ? "bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                        : "text-white/40 hover:text-white/70"
                    )}
                    style={activeView === 'board' ? { color: missionColor, backgroundColor: `${missionColor}15`, borderColor: `${missionColor}30` } : {}}
                  >
                    <HelpCircle />
                    {isRTL ? 'كانبان' : 'BOARD VIEW'}
                  </button>
                </div>
              </div>
            </div>

           <InlineGuideTip hasTasks={(mission.tasks || []).length > 0} />

           {/* Task List — V27.1 Symmetric Card Layout */}
           {activeView === 'list' ? (
             <div className="space-y-4">
                <AnimatePresence mode='popLayout'>
                   {(filteredTasks || []).map((task: any, index: number) => {
                     const taskMinutes = timeStatsMap[task.id] || 0
                     const timeFormatted = taskMinutes >= 60
                       ? `${Math.floor(taskMinutes / 60)}h ${taskMinutes % 60}m`
                       : taskMinutes > 0 ? `${taskMinutes}m` : null

                     const getYouTubeId = (urlOrId: string) => {
                       if (!urlOrId) return ''
                       if (urlOrId.length === 11 && !urlOrId.includes('/') && !urlOrId.includes('?')) return urlOrId
                       try {
                         const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
                         const match = urlOrId.match(regExp)
                         return (match && match[2].length === 11) ? match[2] : urlOrId
                       } catch (e) { return urlOrId }
                      }
                      const storedProgress = typeof window !== 'undefined' ? parseFloat(localStorage.getItem(`growth_hub_video_progress_${task.id}`) || '0') : 0
                     const storedDuration = typeof window !== 'undefined' ? parseFloat(localStorage.getItem(`growth_hub_video_duration_${task.id}`) || '0') : 0
                     const videoProgress = task.video_progress ?? storedProgress
                     const videoDuration = task.video_duration ?? storedDuration
                     const hasVideo = !!(task.video_id || task.video_url)

                     const formatVideoTime = (secs: number) => {
                       const h = Math.floor(secs / 3600)
                       const m = Math.floor((secs % 3600) / 60)
                       const s = Math.floor(secs % 60)
                       if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
                       return `${m}:${String(s).padStart(2,'0')}`
                     }

                     const videoProgressPct = videoDuration > 0 ? (videoProgress / videoDuration) * 100 : 0
                     const taskViewers = onlineUsers.filter((ou: any) => ou.cursor_task_id === task.id)
                     const firstViewer = taskViewers[0]

                     return (
                       <motion.div
                         key={task.id}
                         layout
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         exit={{ opacity: 0, scale: 0.95 }}
                         onClick={() => setSelectedTask(task)}
                         className={cn(
                           "group flex flex-col p-4 md:p-5 border border-[var(--card-border)] rounded-xl cursor-pointer hover:border-cyan-500/50 hover:bg-white/5 hover:scale-[1.01] transition-all duration-300 shadow-sm space-y-3 relative",
                           task.is_completed ? "opacity-40" : "opacity-100"
                         )}
                       >
                         {/* Task Viewers Overlapping Avatar Pile (Absolute in Top-Right) */}
                         {taskViewers.length > 0 && (
                            <div className="absolute -top-2 -right-2 flex items-center -space-x-1 select-none z-20">
                              {taskViewers.map((viewer: any) => (
                                <div
                                  key={viewer.user_id}
                                  className="w-6 h-6 rounded-full border bg-zinc-950 flex items-center justify-center text-[7px] font-space font-black uppercase text-white shadow-md relative overflow-hidden shrink-0 ring-2 ring-cyan-500 animate-pulse z-10"
                                  style={{ borderColor: viewer.session_color || 'cyan', boxShadow: `0 0 8px ${viewer.session_color || 'cyan'}55` }}
                                  title={`${viewer.full_name || 'CO-OPERATIVE'} is viewing this task`}
                                >
                                  {viewer.avatar_url ? (
                                    <img
                                      src={viewer.avatar_url}
                                      alt={viewer.full_name}
                                      className="w-full h-full object-cover animate-none"
                                    />
                                  ) : (
                                    <span>{viewer.full_name?.substring(0, 2) || 'OP'}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                         )}

                         {/* Main Row: Right = index+check, Center = title+details, Left = actions */}
                         <div className={cn(
                           "flex items-center justify-between gap-4 w-full",
                           isRTL ? "flex-row" : "flex-row-reverse"
                         )}>
                           {/* RIGHT SIDE: Index + Completion Check */}
                           <div className="flex items-center gap-3 shrink-0">
                             <span className="font-space font-black text-[11px] text-white/30 w-5 text-right select-none">
                               {String(index + 1).padStart(2, '0')}
                             </span>
                             <button
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  if (!canToggleTask(task)) {
                                    showToast(isRTL ? "غير مسموح // ليست مهمتك" : "RESTRICTED // NOT YOUR TASK", "warning");
                                    playError();
                                    return;
                                  }
                                  toggleTask(task.id, task.is_completed); 
                                }}
                                className="shrink-0 cursor-pointer flex items-center justify-center"
                              >
                                {task.is_completed ? (
                                  <NeonIcon icon={Zap} interactive size={22} style={{ color: currentTheme.color }} />
                                ) : (
                                  <NeonIcon icon={Crosshair} interactive size={22} className="text-white/30 hover:text-white" />
                                )}
                              </button>
                           </div>

                           {/* CENTER: Title + Detail Row (metrics + dashes) */}
                           <div className="flex-1 min-w-0 flex flex-col items-center justify-center text-center">
                             <span className={cn(
                               "text-base md:text-[17px] font-space font-bold tracking-tight text-[#FFFFFF] transition-all uppercase truncate max-w-full block",
                               task.is_completed && "text-[var(--text-secondary)] opacity-50 line-through"
                             )}>
                               {task.title}
                             </span>
                             <div className="flex items-center justify-center gap-3 mt-1 w-full">
                               {hasVideo ? (
                                 <>
                                   <svg width="13" height="13" viewBox="0 0 24 24" fill={currentTheme.color} className="shrink-0">
                                     <path d="M19.59 6.69a4.83 4.83 0 0 0-3.39-3.39C14.76 3 12 3 12 3s-2.76 0-4.2.3a4.83 4.83 0 0 0-3.39 3.39A48.6 48.6 0 0 0 4 12a48.6 48.6 0 0 0 .41 5.31 4.83 4.83 0 0 0 3.39 3.39C9.24 21 12 21 12 21s2.76 0 4.2-.3a4.83 4.83 0 0 0 3.39-3.39A48.6 48.6 0 0 0 20 12a48.6 48.6 0 0 0-.41-5.31zM10 15V9l5 3z"/>
                                   </svg>
                                   <span className="font-mono text-[11px] text-[#FFFFFF] tracking-wider">
                                     {formatVideoTime(videoProgress)} / {formatVideoTime(videoDuration)}
                                   </span>
                                 </>
                               ) : timeFormatted ? (
                                 <span className="font-mono text-[11px] text-white/50 bg-white/[0.03] border border-white/5 px-2 py-0.5 rounded-md tracking-wider inline-flex items-center">
                                   {timeFormatted}
                                 </span>
                               ) : null}
                                {task.metadata?.endDate && (() => {
                                  const tDate = new Date(task.metadata.endDate)
                                  tDate.setHours(0,0,0,0)
                                  const todayDate = new Date()
                                  todayDate.setHours(0,0,0,0)
                                  const isOverdue = !task.is_completed && tDate < todayDate
                                  return (
                                    <span className={cn(
                                      "font-mono text-[10px] px-2 py-0.5 rounded-md tracking-wider inline-flex items-center gap-1 border",
                                      isOverdue 
                                        ? "text-red-500 border-red-500/30 bg-red-950/15 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse font-black" 
                                        : "text-white/40 border-white/5 bg-white/[0.02]"
                                    )}>
                                      📅 {task.metadata.endDate}
                                    </span>
                                  )
                                })()}
                               <ComplexityDashes weight={task.weight} color={currentTheme.color} />
                             </div>
                           </div>

                           {/* LEFT SIDE: Assignee, XP, and Utility Actions */}
                           <div className="flex items-center gap-3 shrink-0 relative">

                             {/* Assignee Area (Squad only) */}
                             {mission?.metadata?.type === 'squad' && (
                               <div className="relative">
                                 {task.assigned_to && task.assignee ? (
                                   <button
                                     onClick={(e) => handleAssignClick(e, task)}
                                     className={cn(
                                       "w-7 h-7 rounded-full overflow-hidden shrink-0 flex items-center justify-center relative hover:opacity-80 transition-opacity",
                                       getRankRingClass(task.assignee.rank)
                                     )}
                                     title={isRTL ? `assigned_to_${task.assignee.full_name}` : `Assigned to ${task.assignee.full_name}`}
                                   >
                                     {task.assignee.avatar_url ? (
                                       <img src={task.assignee.avatar_url} className="w-full h-full object-cover" />
                                     ) : (
                                       <span className="text-[10px] font-bold text-white">
                                         {task.assignee.full_name?.charAt(0) || '?'}
                                       </span>
                                     )}
                                   </button>
                                 ) : (
                                   <button
                                     onClick={(e) => handleAssignClick(e, task)}
                                     className="px-2 py-1 border border-dashed border-white/25 hover:border-teal-500 hover:text-teal-400 text-white/40 text-[9px] font-mono tracking-wider rounded transition-colors"
                                   >
                                     [ + ASSIGN ]
                                   </button>
                                 )}

                                 {/* Assignee Popover dropdown */}
                                 {activeAssignPopover === task.id && (
                                   <div 
                                     className="absolute right-0 bottom-full mb-2 w-48 bg-[#0a0a0f] border border-white/10 rounded-lg shadow-2xl z-[150] p-2 space-y-1 font-space text-left"
                                     onClick={e => e.stopPropagation()}
                                   >
                                     <div className="text-[9px] font-black text-zinc-500 tracking-widest uppercase p-1.5 border-b border-white/5">
                                       {isRTL ? "ASSIGN" : "ASSIGN OPERATOR"}
                                     </div>
                                     <div className="max-h-40 overflow-y-auto py-1">
                                       {squadMembers.map((member: any) => (
                                         <button
                                           key={member.id}
                                           onClick={async (e) => {
                                             e.stopPropagation()
                                             setActiveAssignPopover(null)
                                             const { error } = await supabase
                                               .from('tasks')
                                               .update({ assigned_to: member.id })
                                               .eq('id', task.id)
                                             if (!error) {
                                               const memberProfile = {
                                                 id: member.id,
                                                 full_name: member.full_name,
                                                 avatar_url: member.avatar_url,
                                                 rank: member.rank
                                               }
                                               setMission((prev: any) => ({
                                                 ...prev,
                                                 tasks: prev.tasks.map((t: any) => t.id === task.id ? { ...t, assigned_to: member.id, assignee: memberProfile } : t)
                                               }))
                                               showToast(isRTL ? `ASSIGNED` : `ASSIGNED TO ${member.full_name.toUpperCase()}`, "success")
                                               playSuccess()
                                             }
                                           }}
                                           className={cn(
                                             "w-full flex items-center gap-2 p-1.5 hover:bg-white/5 rounded text-left transition-colors text-xs text-white",
                                             task.assigned_to === member.id ? "bg-white/5 font-bold" : ""
                                           )}
                                         >
                                           {member.avatar_url ? (
                                             <img src={member.avatar_url} className="w-5 h-5 rounded-full object-cover" />
                                           ) : (
                                             <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[8px] font-bold text-white">
                                               {member.full_name?.charAt(0) || '?'}
                                             </div>
                                           )}
                                           <span className="truncate">{member.full_name}</span>
                                         </button>
                                       ))}
                                     </div>
                                     {task.assigned_to && (
                                       <button
                                         onClick={async (e) => {
                                           e.stopPropagation()
                                           setActiveAssignPopover(null)
                                           const { error } = await supabase
                                             .from('tasks')
                                             .update({ assigned_to: null })
                                             .eq('id', task.id)
                                           if (!error) {
                                             setMission((prev: any) => ({
                                               ...prev,
                                               tasks: prev.tasks.map((t: any) => t.id === task.id ? { ...t, assigned_to: null, assignee: null } : t)
                                             }))
                                             showToast(isRTL ? "UNASSIGN" : "TASK UNASSIGNED", "success")
                                             playSuccess()
                                           }
                                         }}
                                         className="w-full text-center py-1.5 hover:bg-red-500/10 text-red-400 hover:text-red-300 font-black tracking-widest text-[9px] uppercase border-t border-white/5 mt-1 rounded transition-colors"
                                       >
                                         {isRTL ? "UNASSIGN" : "UNASSIGN"}
                                       </button>
                                     )}
                                   </div>
                                 )}
                               </div>
                             )}

                             {/* XP Reward Badge */}
                             <div className="flex items-center gap-1 bg-[#14b8a6]/10 border border-[#14b8a6]/20 px-2 py-0.5 rounded text-[10px] font-mono text-[#14b8a6] tracking-wider shrink-0 font-bold">
                               +{task.weight * 10} XP
                             </div>

                             {/* Utility Actions */}
                             <div className="flex items-center gap-x-1 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                               {hasVideo && (
                                 <button
                                   onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
                                   className="p-2 transition-all"
                                   style={{ color: selectedTask?.id === task.id ? currentTheme.color : 'var(--text-secondary)' }}
                                   onMouseEnter={e => { if (selectedTask?.id !== task.id) e.currentTarget.style.color = currentTheme.color }}
                                   onMouseLeave={e => { if (selectedTask?.id !== task.id) e.currentTarget.style.color = '' }}
                                   title={selectedTask?.id === task.id ? 'CLOSE_VIDEO' : 'PLAY_VIDEO'}
                                 >
                                   {selectedTask?.id === task.id ? (
                                      <Tv className="w-4 h-4 mx-auto" />
                                    ) : (
                                      <Play className="w-4 h-4 mx-auto" />
                                    )}
                                 </button>
                               )}
                               <button
                                 onClick={(e) => { e.stopPropagation(); startFocus(task.title, task.id, id as string); }}
                                 className="p-2 text-[var(--text-secondary)] transition-all"
                                 onMouseEnter={e => e.currentTarget.style.color = currentTheme.color}
                                 onMouseLeave={e => e.currentTarget.style.color = ''}
                                 title="START_FOCUS_SESSION"
                               >
                                 <Timer className="text-lg w-[18px] h-[18px]" />
                               </button>

                               <button
                                 onClick={(e) => { 
                                   e.stopPropagation(); 
                                   if (mission?.metadata?.type === 'squad') {
                                     const currentUserMember = squadMembers.find(m => m.id === profile?.id)
                                     const currentUserRole = currentUserMember?.role
                                     const isOwner = mission?.user_id === profile?.id || currentUserRole === 'owner'
                                     const isCoAdmin = currentUserRole === 'co-admin'
                                     const isPrivileged = isOwner || isCoAdmin
                                     if (!isPrivileged) {
                                       showToast(isRTL ? "RESTRICTED" : "RESTRICTED // SQUAD ADMINS ONLY", "warning")
                                       playError()
                                       return
                                     }
                                   }
                                   deleteTask(task.id); 
                                 }}
                                 className="p-2 text-[var(--text-secondary)] hover:text-red-500 transition-all"
                                 title="DELETE_TASK"
                               >
                                 <Trash2 className="text-lg w-[18px] h-[18px]" />
                               </button>
                             </div>
                           </div>
                         </div>

                         {/* Full-width progress line (rank color) */}
                         {(hasVideo && videoDuration > 0) && (
                           <div className="relative h-[2px] bg-white/5 rounded-full overflow-hidden w-full">
                             <motion.div
                               initial={{ width: 0 }}
                               animate={{ width: `${videoProgressPct}%` }}
                               transition={{ duration: 0.4 }}
                               className="h-full absolute top-0 left-0 rounded-full"
                               style={{ backgroundColor: currentTheme.color, boxShadow: `0 0 6px ${currentTheme.color}` }}
                             />
                           </div>
                         )}
                       </motion.div>
                     )
                   })}
                </AnimatePresence>
             </div>
           ) : (
             <KanbanBoard
               tasks={filteredTasks}
               onMoveTask={onMoveTask}
               themeColor={missionColor}
               isRTL={isRTL}
               currentTheme={currentTheme}
               toggleTask={toggleTask}
               setSelectedTask={setSelectedTask}
               selectedTask={selectedTask}
               timeStatsMap={timeStatsMap}
               cupId={id as string}
             />
           )}

           {/* Add Task Input */}
           <div className="relative mt-8 md:mt-12 flex flex-col gap-3">
             <form onSubmit={addTask} className="relative flex flex-col md:flex-row gap-4 md:gap-6">
                <div className="relative flex-1">
                   <input
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      placeholder={isRTL ? 'إضافة مهمة... (ENTER)' : 'ADD_TASK... (PRESS ENTER)'}
                      className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] p-4 md:p-6 font-space text-sm font-black text-[var(--text-primary)] outline-none transition-all"
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
                       <HelpCircle className="text-[12px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors" />
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
                     <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-xs text-yellow-500/80 font-space px-2">
                       {isRTL ? "واضح إن الهدف ده فيه مهام كتير! إيه رأيك تكبر حجمه لـ Medium عشان يعكس مجهودك الحقيقي وتكسب نقاط XP أكتر؟" : "Looks like this goal has a lot of tasks! How about upgrading it to Medium to reflect your true effort and earn more XP?"}
                     </motion.div>
                   )
                 }
               } else if (sizeStr === 'md' || sizeStr === 'm' || sizeStr === 'medium') {
                 if (tCount > 8) {
                   return (
                     <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-xs text-yellow-500/80 font-space px-2">
                       {isRTL ? "المهام بدأت تزيد هنا! إيه رأيك تخليه Large؟ الحجم الأكبر هيديك مساحة أفضل وسقف XP أعلى يناسب تعبك." : "Tasks are piling up! Consider upgrading to Large to give yourself more space and unlock a higher XP ceiling."}
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
                    <h2 className="text-xl md:text-2xl font-black font-space uppercase" style={{ color: missionColor }}>
                      {isRTL ? 'الملاحظات' : 'NOTES'}
                    </h2>
                    <p className="text-[12px] font-space text-[var(--text-secondary)] tracking-widest uppercase font-black mt-1">
                      {linkedNotes.length} {isRTL ? 'سجل مرتبط' : 'RECORDS LINKED TO THIS GOAL'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowIntelModal(false)}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                  >
                    <X className="text-2xl w-6 h-6" />
                  </button>
                </div>

                {linkedNotes.length === 0 ? (
                  <div className="py-16 text-center space-y-4">
                    <HelpCircle />
                    <p className="text-[11px] font-space text-[var(--text-secondary)] tracking-[0.4em] uppercase font-black">
                      {isRTL ? 'لا توجد سجلات مرتبطة' : 'NO_INTEL_LINKED'}
                    </p>
                    <p className="text-[14px] font-space text-[var(--text-primary)] tracking-wider">
                      {isRTL ? 'اذهب إلى العقل وأنشئ ملاحظة مرتبطة بهذه المهمة' : 'Go to NOTES → NEW_LOG and link it to this goal'}
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
                            <Pin className="text-xs w-3 h-3" style={{ color: missionColor }} />
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
          
          // Switch view to list and persist choice
          setActiveView('list')
          const updatedMetadata = { ...(mission?.metadata || {}), defaultView: 'list' }
          updateMission({ metadata: updatedMetadata })
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

          // Switch view to list and persist choice
          setActiveView('list')
          const updatedMetadata = { ...(mission?.metadata || {}), defaultView: 'list' }
          updateMission({ metadata: updatedMetadata })
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

      {/* Squad Management Slide Panel */}
      <AnimatePresence>
        {showSquadPanel && (
          <div className="fixed inset-0 z-[250] flex justify-end">
                      {(() => {
                        const myMemberRow = squadMembers.find((m: any) => m.id === profile?.id || m.user_id === profile?.id)
                        const isOwner = mission?.user_id === profile?.id || myMemberRow?.role === 'owner'
                        const isCoAdmin = myMemberRow?.role === 'co-admin'
                        const isAdmin = isOwner || isCoAdmin
                        const isMemberOnly = !isAdmin && myMemberRow?.role === 'member'
                        
                        // We return the actual sliding panel body here to keep variables in scope!
                        return (
                          <>
                          {/* Backdrop overlay */}
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { playBlip(); setShowSquadPanel(false); }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md cursor-pointer"
                          />

                          {/* Slide panel */}
                          <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="relative w-full md:w-[35vw] max-w-xl h-full bg-[#050505]/95 border-l border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col font-space text-white backdrop-blur-2xl z-10"
                            style={{
                              boxShadow: `-10px 0 50px rgba(20, 184, 166, 0.05)`
                            }}
                          >
                            {/* Decorative top neon bar */}
                            <div className="absolute top-0 inset-x-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #14b8a6, transparent)' }} />

                            {/* Panel Header */}
                            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/[0.01]">
                              <div className="space-y-1">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#14b8a6] flex items-center gap-2">
                                  <Shield className="text-sm w-3.5 h-3.5" />
                                  {isRTL ? 'إدارة الفريق // العمليات' : 'SQUAD_CONTROL // OPERATIONS'}
                                </h3>
                                <p className="text-[10px] text-[var(--text-secondary)] font-bold tracking-wider uppercase">
                                  ID: {mission?.id?.substring(0, 8)}
                                </p>
                              </div>
                              <button
                                onClick={() => { playBlip(); setShowSquadPanel(false); }}
                                className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white hover:border-white/20 transition-all cursor-pointer bg-white/5"
                              >
                                <X className="text-sm w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                              {/* SECTION 1: MEMBERS (Always visible) */}
                              <div className="space-y-4">
                                <h4 className="text-[10px] font-black tracking-[0.3em] uppercase text-zinc-500 border-b border-white/5 pb-1">
                                  {isRTL ? 'أعضاء الفريق' : 'SQUAD MEMBERS'} ({squadMembers.length})
                                </h4>

                                <div className="space-y-3">
                                  {squadMembers.map((member: any) => {
                                    const isMemberOwner = member.role === 'owner' || mission?.user_id === member.id || mission?.user_id === member.user_id
                                    const isMemberCoAdmin = member.role === 'co-admin'
                                    const onlinePresence = onlineUsers.find((ou: any) => ou.user_id === member.id)
                                    
                                    return (
                                      <div key={member.id} className="flex items-center justify-between p-3 border border-white/5 bg-white/[0.02] rounded-lg">
                                        <div className="flex items-center gap-3">
                                          <div className="relative shrink-0">
                                            {member.avatar_url ? (
                                              <img src={member.avatar_url} alt={member.full_name} className="w-9 h-9 rounded-full border border-white/10 object-cover" />
                                            ) : (
                                              <div className="w-9 h-9 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center">
                                                <span className="text-xs font-bold">{member.full_name?.charAt(0) || '?'}</span>
                                              </div>
                                            )}
                                            {/* Status dot */}
                                            <div 
                                              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-black shadow-sm"
                                              style={{ backgroundColor: onlinePresence ? onlinePresence.session_color : '#4b5563' }}
                                            />
                                          </div>
                                          <div className="flex flex-col">
                                            <span className="text-xs font-bold">{member.full_name}</span>
                                            <span className="text-[8px] font-black text-white/40 tracking-wider flex items-center gap-1">
                                              <CheckCircle2 className="text-[8px]" />
                                              {member.rank || 'ROOKIE'}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          {isMemberOwner ? (
                                            <span className="px-1.5 py-0.5 text-[8px] font-black tracking-widest bg-amber-950/30 border border-amber-500/30 text-amber-400 rounded-sm">
                                              👑 OWNER
                                            </span>
                                          ) : isMemberCoAdmin ? (
                                            <span className="px-1.5 py-0.5 text-[8px] font-black tracking-widest bg-teal-950/30 border border-teal-500/30 text-teal-400 rounded-sm">
                                              CO-ADMIN
                                            </span>
                                          ) : (
                                            <span className="px-1.5 py-0.5 text-[8px] font-black tracking-widest bg-zinc-900 border border-white/10 text-zinc-400 rounded-sm">
                                              MEMBER
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>

                              {/* SECTION 2: PENDING JOIN REQUESTS (Admins only) */}
                              {isAdmin && (
                                <div className="space-y-4">
                                  <h4 className="text-[10px] font-black tracking-[0.3em] uppercase text-zinc-500 border-b border-white/5 pb-1">
                                    {isRTL ? 'طلبات الانضمام المعلقة' : 'PENDING REQUESTS'}
                                  </h4>

                                  {pendingRequests.length === 0 ? (
                                    <div className="text-center py-6 border border-dashed border-white/5 rounded-lg bg-white/[0.01]">
                                      <p className="text-[10px] font-black tracking-widest text-zinc-600 uppercase">
                                        {isRTL ? 'لا توجد طلبات معلقة // الفريق آمن' : 'NO PENDING REQUESTS // SQUAD SECURE'}
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      {pendingRequests.map((req: any) => {
                                        const requesterProfile = req.profiles || {}
                                        return (
                                          <div key={req.id} className="flex flex-col gap-3 p-4 border border-amber-500/10 bg-amber-500/[0.02] rounded-lg">
                                            <div className="flex items-center gap-3">
                                              {requesterProfile.avatar_url ? (
                                                <img src={requesterProfile.avatar_url} alt={requesterProfile.full_name} className="w-8 h-8 rounded-full border border-white/10 object-cover" />
                                              ) : (
                                                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center">
                                                  <span className="text-xs font-bold">{requesterProfile.full_name?.charAt(0) || '?'}</span>
                                                </div>
                                              )}
                                              <div className="flex flex-col">
                                                <span className="text-xs font-bold">{requesterProfile.full_name || 'Unknown Operator'}</span>
                                                <span className="text-[8px] font-black text-amber-500/60 tracking-wider">
                                                  RANK: {requesterProfile.rank || 'ROOKIE'}
                                                </span>
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-2 mt-1">
                                              <button
                                                disabled={isReviewing !== null}
                                                onClick={async () => {
                                                  setIsReviewing(req.id)
                                                  playBlip()
                                                  const { data, error } = await supabase.rpc('review_squad_join_request', { p_request_id: req.id, p_action: 'approve' })
                                                  if (error) {
                                                    showToast(isRTL ? 'فشل قبول الطلب' : 'FAILED TO APPROVE', 'warning')
                                                    playError()
                                                  } else {
                                                    showToast(isRTL ? 'تم قبول العضو الجديد في الفريق!' : 'MEMBER APPROVED // JOINED SQUAD', 'success')
                                                    playSuccess()
                                                    await fetchPendingRequests()
                                                    await fetchMission() // reload members list
                                                  }
                                                  setIsReviewing(null)
                                                }}
                                                className="flex-1 py-1.5 border border-teal-500/40 hover:border-teal-400 text-teal-400 hover:text-teal-300 bg-teal-500/5 hover:bg-teal-500/10 rounded font-black tracking-widest text-[9px] uppercase transition-all duration-300 disabled:opacity-50 cursor-pointer text-center"
                                              >
                                                {isReviewing === req.id ? 'PROCESSING...' : (isRTL ? '✓ قبول' : '✓ APPROVE')}
                                              </button>
                                              <button
                                                disabled={isReviewing !== null}
                                                onClick={async () => {
                                                  setIsReviewing(req.id)
                                                  playBlip()
                                                  const { data, error } = await supabase.rpc('review_squad_join_request', { p_request_id: req.id, p_action: 'reject' })
                                                  if (error) {
                                                    showToast(isRTL ? 'فشل رفض الطلب' : 'FAILED TO REJECT', 'warning')
                                                    playError()
                                                  } else {
                                                    showToast(isRTL ? 'تم رفض طلب الانضمام' : 'MEMBER REJECTED // SQUAD SECURE', 'success')
                                                    playSuccess()
                                                    await fetchPendingRequests()
                                                  }
                                                  setIsReviewing(null)
                                                }}
                                                className="flex-1 py-1.5 border border-red-500/40 hover:border-red-400 text-red-400 hover:text-red-300 bg-red-500/5 hover:bg-red-500/10 rounded font-black tracking-widest text-[9px] uppercase transition-all duration-300 disabled:opacity-50 cursor-pointer text-center"
                                              >
                                                {isReviewing === req.id ? 'PROCESSING...' : (isRTL ? '✗ رفض' : '✗ REJECT')}
                                              </button>
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* SECTION 3: ROLE MANAGEMENT & KICK ACTIONS (Admins only) */}
                              {isAdmin && (
                                <div className="space-y-4">
                                  <h4 className="text-[10px] font-black tracking-[0.3em] uppercase text-zinc-500 border-b border-white/5 pb-1">
                                    {isRTL ? 'أدوار وأعضاء الفريق' : 'SQUAD ROLES & KICK'}
                                  </h4>

                                  {squadMembers.filter(m => m.id !== mission?.user_id).length === 0 ? (
                                    <div className="text-center py-6 border border-dashed border-white/5 rounded-lg bg-white/[0.01]">
                                      <p className="text-[10px] font-black tracking-widest text-zinc-600 uppercase">
                                        {isRTL ? 'لا يوجد أعضاء آخرون في الفريق' : 'NO OTHER MEMBERS IN SQUAD'}
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      {squadMembers.filter(m => m.id !== mission?.user_id).map((member: any) => {
                                        const isMemberOwner = member.role === 'owner'
                                        const isMemberCoAdmin = member.role === 'co-admin'
                                        
                                        // Kick logic rules: Owner kicks anyone. Co-admin kicks only regular members.
                                        const canKick = isOwner ? true : (isCoAdmin && member.role === 'member')

                                        return (
                                          <div key={member.id} className="flex flex-col gap-3 p-3 border border-white/5 bg-white/[0.01] rounded-lg">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-3">
                                                {member.avatar_url ? (
                                                  <img src={member.avatar_url} alt={member.full_name} className="w-8 h-8 rounded-full border border-white/10 object-cover" />
                                                ) : (
                                                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center">
                                                    <span className="text-xs font-bold">{member.full_name?.charAt(0) || '?'}</span>
                                                  </div>
                                                )}
                                                <div className="flex flex-col">
                                                  <span className="text-xs font-bold">{member.full_name}</span>
                                                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">{member.role}</span>
                                                </div>
                                              </div>

                                              {canKick && (
                                                <button
                                                  onClick={async () => {
                                                    if (confirm(isRTL ? `هل أنت متأكد من إزالة ${member.full_name} من الفريق؟` : `Are you sure you want to remove ${member.full_name} from the squad?`)) {
                                                      playBlip()
                                                      const { error } = await supabase
                                                        .from('goal_members')
                                                        .delete()
                                                        .eq('id', member.member_row_id)
                                                      
                                                      if (error) {
                                                        showToast(isRTL ? 'فشل إزالة العضو' : 'FAILED TO REMOVE MEMBER', 'warning')
                                                        playError()
                                                      } else {
                                                        showToast(isRTL ? 'تم إزالة العضو من الفريق' : 'MEMBER REMOVED FROM SQUAD', 'success')
                                                        playSuccess()
                                                        await fetchMission() // Reload members
                                                      }
                                                    }
                                                  }}
                                                  className="w-7 h-7 rounded border border-red-500/20 hover:border-red-500/50 bg-red-500/5 hover:bg-red-500/15 flex items-center justify-center text-red-400 hover:text-red-300 transition-all cursor-pointer"
                                                  title="KICK"
                                                >
                                                  <Trash2 className="text-[15px]" />
                                                </button>
                                              )}
                                            </div>

                                            {/* Role management controls (Owner only) */}
                                            {isOwner && (
                                              <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black uppercase text-zinc-500 shrink-0">
                                                  {isRTL ? 'الدور:' : 'ROLE:'}
                                                </span>
                                                <div className="flex-1 flex gap-1 bg-black/40 border border-white/10 p-0.5 rounded-sm">
                                                  <button
                                                    onClick={async () => {
                                                      if (member.role === 'member') return
                                                      playBlip()
                                                      const { error } = await supabase
                                                        .from('goal_members')
                                                        .update({ role: 'member' })
                                                        .eq('id', member.member_row_id)
                                                      if (error) {
                                                        showToast(isRTL ? 'فشل تحديث الدور' : 'FAILED TO UPDATE ROLE', 'warning')
                                                        playError()
                                                      } else {
                                                        showToast(isRTL ? 'تم تحديث الدور إلى عضو!' : 'ROLE UPDATED TO MEMBER', 'success')
                                                        playSuccess()
                                                        await fetchMission()
                                                      }
                                                    }}
                                                    className={cn(
                                                      "flex-1 py-1 text-[8px] font-black tracking-widest uppercase text-center rounded-sm transition-all cursor-pointer",
                                                      member.role === 'member'
                                                        ? "bg-zinc-800 text-zinc-300 border border-white/10 font-bold"
                                                        : "text-zinc-600 hover:text-zinc-400"
                                                    )}
                                                  >
                                                    MEMBER
                                                  </button>
                                                  <button
                                                    onClick={async () => {
                                                      if (member.role === 'co-admin') return
                                                      playBlip()
                                                      const { error } = await supabase
                                                        .from('goal_members')
                                                        .update({ role: 'co-admin' })
                                                        .eq('id', member.member_row_id)
                                                      if (error) {
                                                        showToast(isRTL ? 'فشل تحديث الدور' : 'FAILED TO UPDATE ROLE', 'warning')
                                                        playError()
                                                      } else {
                                                        showToast(isRTL ? 'تم تحديث الدور إلى مشرف!' : 'ROLE UPDATED TO CO-ADMIN', 'success')
                                                        playSuccess()
                                                        await fetchMission()
                                                      }
                                                    }}
                                                    className={cn(
                                                      "flex-1 py-1 text-[8px] font-black tracking-widest uppercase text-center rounded-sm transition-all cursor-pointer",
                                                      member.role === 'co-admin'
                                                        ? "bg-teal-950/50 text-[#14b8a6] border border-[#14b8a6]/30 font-bold"
                                                        : "text-zinc-600 hover:text-zinc-400"
                                                    )}
                                                  >
                                                    CO-ADMIN
                                                  </button>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* SECTION 4: SQUAD RULES (Admins only) */}
                              {isAdmin && (
                                <div className="space-y-4">
                                  <h4 className="text-[10px] font-black tracking-[0.3em] uppercase text-zinc-500 border-b border-white/5 pb-1">
                                    {isRTL ? 'قواعد الفريق // RULES' : 'SQUAD RULES'}
                                  </h4>
                                  <div className="space-y-3 p-4 border border-white/5 bg-black/40 rounded-lg">
                                    <label className="flex items-center justify-between text-[11px] font-bold text-zinc-300 hover:text-white cursor-pointer select-none">
                                      <span>No date changes for members</span>
                                      <input
                                        type="checkbox"
                                        checked={!!mission?.metadata?.rules?.no_date_changes}
                                        onChange={() => toggleSquadRule(mission, 'no_date_changes')}
                                        className="accent-teal-400 cursor-pointer"
                                      />
                                    </label>

                                    <label className="flex items-center justify-between text-[11px] font-bold text-zinc-300 hover:text-white cursor-pointer select-none">
                                      <span>XP penalty 2x for late tasks</span>
                                      <input
                                        type="checkbox"
                                        checked={!!mission?.metadata?.rules?.xp_multiplier}
                                        onChange={() => toggleSquadRule(mission, 'xp_multiplier')}
                                        className="accent-teal-400 cursor-pointer"
                                      />
                                    </label>

                                    <label className="flex items-center justify-between text-[11px] font-bold text-zinc-300 hover:text-white cursor-pointer select-none">
                                      <span>Members cannot delete tasks</span>
                                      <input
                                        type="checkbox"
                                        checked={!!mission?.metadata?.rules?.no_delete}
                                        onChange={() => toggleSquadRule(mission, 'no_delete')}
                                        className="accent-teal-400 cursor-pointer"
                                      />
                                    </label>
                                  </div>
                                </div>
                              )}

                              {/* SECTION 5: LEAVE SQUAD ACTION (Regular members / Co-Admins) */}
                              {!isOwner && (
                                <div className="pt-6 border-t border-white/5">
                                  <button
                                    onClick={leaveSquad}
                                    className="w-full py-3 border border-red-500/40 hover:border-red-400 bg-red-500/5 hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded-xl font-space font-black text-xs uppercase tracking-widest cursor-pointer transition-all hover:scale-[1.02]"
                                  >
                                    {isRTL ? '✗ مغادرة الفريق' : '✗ LEAVE SQUAD'}
                                  </button>
                                </div>
                              )}

                            </div>
                          </motion.div>
                          </>
                        )
                      })()}

          </div>
        )}
      </AnimatePresence>

      {/* Premium Centered Glassmorphic Share Modal */}
            {/* Premium Centered Glassmorphic Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md"
            onClick={() => { playBlip(); setShowShareModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-zinc-950 border border-cyan-500/30 rounded-2xl p-6 max-w-md w-full relative overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.15)] space-y-6"
            >
              {/* Decorative top neon bar */}
              <div className="absolute top-0 inset-x-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, #22d3ee, transparent)` }} />

              {/* Header */}
              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <div>
                  <h3 className="font-space text-base font-black tracking-widest uppercase text-white flex items-center gap-2">
                    <Share2 className="w-[16px] h-[16px] text-cyan-400" />
                    {isRTL ? 'ACCESS_KEY_GENERATOR // مشاركة الهدف' : 'ACCESS_KEY_GENERATOR'}
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-1">
                    {isRTL ? 'اختر طريقة مشاركة هذه المهمة' : 'Choose secure channel to export access'}
                  </p>
                </div>
                <button
                  onClick={() => { playBlip(); setShowShareModal(false); }}
                  className="text-zinc-500 hover:text-white transition-all cursor-pointer bg-transparent border-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Share Options Rows */}
              <div className="space-y-5 relative">
                {/* Generating Overlay for Achievement Card */}
                {isGeneratingCard && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-zinc-950/90 backdrop-blur-md rounded-xl border border-white/5">
                    <div className="relative w-12 h-12">
                      <div className="absolute inset-0 rounded-full border-t-2 border-l-2 border-transparent animate-spin" style={{ borderTopColor: missionColor, borderLeftColor: missionColor, filter: `drop-shadow(0 0 6px ${missionColor})` }} />
                      <div className="absolute inset-2 rounded-full border-b-2 border-r-2 border-transparent animate-spin" style={{ borderBottomColor: missionColor, borderRightColor: missionColor, opacity: 0.5, animationDirection: 'reverse' }} />
                    </div>
                    <span className="font-space text-[9px] tracking-[0.3em] uppercase animate-pulse" style={{ color: missionColor }}>
                      {isRTL ? 'جارٍ توليد الكارت...' : 'GENERATING CARD...'}
                    </span>
                  </div>
                )}

                {/* Invite to Squad (Only Squad Goals) */}
                {mission?.metadata?.type === 'squad' && (
                  <div className="border border-white/5 bg-zinc-900/20 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] text-zinc-500 tracking-widest uppercase">INVITATION_KEY // SECURE_CHANNEL</span>
                      <span className="font-mono text-[8px] bg-red-950/20 border border-red-500/20 text-red-400 px-1.5 py-0.5 rounded-sm tracking-wider">PRIVATE</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}/goals/squad?join=${mission.metadata?.invite_code || ''}`}
                        className="flex-grow bg-zinc-900/60 border border-white/5 py-2 px-3 rounded-lg text-[10px] font-mono text-zinc-400 outline-none select-all focus:border-cyan-500/30"
                      />
                      <button
                        onClick={() => {
                          playBlip()
                          const inviteUrl = `${window.location.origin}/goals/squad?join=${mission.metadata?.invite_code || ''}`
                          navigator.clipboard.writeText(inviteUrl)
                          setCopiedRow('invite')
                          setTimeout(() => setCopiedRow(null), 2000)
                          showToast(isRTL ? 'تم نسخ رابط الدعوة!' : 'SQUAD INVITE URL COPIED', 'success')
                          playSuccess()
                        }}
                        className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-[10px] font-mono font-black rounded-lg transition-all shrink-0 cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.2)] hover:scale-105"
                      >
                        {copiedRow === 'invite' ? 'COPIED' : 'COPY'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Public View Link (Solo & Squad Goals) */}
                <div className="border border-white/5 bg-zinc-900/20 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] text-zinc-500 tracking-widest uppercase">PUBLIC_VIEW_LINK // INTEL_ACCESS</span>
                    <span className="font-mono text-[8px] bg-cyan-950/20 border border-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-sm tracking-wider">PUBLIC</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/goals/public/${id}`}
                      className="flex-grow bg-zinc-900/60 border border-white/5 py-2 px-3 rounded-lg text-[10px] font-mono text-zinc-400 outline-none select-all focus:border-cyan-500/30"
                    />
                    <button
                      onClick={async () => {
                        playBlip()
                        const publicUrl = `${window.location.origin}/goals/public/${id}`
                        navigator.clipboard.writeText(publicUrl)
                        setCopiedRow('public')
                        setTimeout(() => setCopiedRow(null), 2000)
                        showToast(isRTL ? 'تم نسخ الرابط العام!' : 'PUBLIC VIEW LINK COPIED', 'success')
                        playSuccess()

                        // Database public_share update
                        const currentMetadata = mission?.metadata || {}
                        if (currentMetadata.public_share !== 'true' && currentMetadata.public_share !== true) {
                          const newMetadata = { ...currentMetadata, public_share: true }
                          setMission((prev: any) => {
                            if (!prev) return prev
                            return { ...prev, metadata: newMetadata }
                          })
                          const { error } = await supabase
                            .from('cups')
                            .update({ metadata: newMetadata })
                            .eq('id', id)
                          if (error) {
                            console.error("Error enabling public share:", error)
                          }
                        }
                      }}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-[10px] font-mono font-black rounded-lg transition-all shrink-0 cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.2)] hover:scale-105"
                    >
                      {copiedRow === 'public' ? 'COPIED' : 'COPY'}
                    </button>
                  </div>
                </div>

                {/* Share Achievement Flex Card */}
                <div className="border border-white/5 bg-zinc-900/20 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] text-zinc-500 tracking-widest uppercase">ACHIEVEMENT_STORY_CARD // STORY_EXPORT</span>
                    <span className="font-mono text-[8px] bg-amber-950/20 border border-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-sm tracking-wider">FLEX</span>
                  </div>
                  <button
                    onClick={downloadCardImage}
                    disabled={isGeneratingCard}
                    className="w-full flex items-center justify-between p-3.5 border border-white/10 hover:border-cyan-500/50 bg-white/[0.02] hover:bg-white/5 rounded-xl transition-all duration-300 group cursor-pointer text-left disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <Medal className="w-5 h-5 text-amber-500 animate-pulse" />
                      <div className="flex flex-col">
                        <span className="font-space text-xs font-black text-white uppercase tracking-wider">
                          {isRTL ? 'تحميل كارت الإنجاز' : 'DOWNLOAD ACHIEVEMENT STORY'}
                        </span>
                        <span className="font-space text-[8px] uppercase tracking-widest text-zinc-500 mt-0.5">
                          {isRTL ? 'تصدير تقدمك كصورة لمشاركتها' : 'Export progress metrics as custom image'}
                        </span>
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-zinc-400 group-hover:text-cyan-400 transition-colors shrink-0" />
                  </button>
                </div>
              </div>

              {/* Status Footer */}
              <div className="p-3 bg-zinc-900/20 rounded-xl border border-white/5 text-center flex items-center justify-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-500"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="font-mono text-[8px] tracking-[0.25em] text-emerald-400 uppercase">
                  SYSTEMS_ACTIVE // SHARE_READY
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Task Drawer */}
      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          isGuest={typeof id === 'string' && id.startsWith('local_')}
          themeColor={missionColor}
          onComplete={() => toggleTask(selectedTask.id, selectedTask.is_completed)}
          onProgressUpdate={(currentTime, duration) => updateTaskProgress(selectedTask.id, currentTime, duration)}
          onUpdateTask={onUpdateTask}
          missionOwnerId={mission?.user_id}
        />
      )}
      </div>
    </Shell>
  )
}
