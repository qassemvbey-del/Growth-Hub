'use client'

import { NeonIcon } from '@/components/ui/NeonIcon'
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
// import Shell from '@/components/layout/Shell'
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
import { 
  Lock, Link as LinkIcon, Trash2, Clock, Radio, CheckSquare, 
  Plus, List, Kanban, Check, Timer, HelpCircle, X, Pin, 
  Shield, CheckCircle2, Award, Download, Clipboard as ClipboardIcon, FileText, 
  Share2, Calendar, Paperclip, Users2, Medal, EyeOff, ListPlus, LayoutGrid, Eye, ChevronDown, Play, Tv, Circle, Trophy
} from 'lucide-react'


const formatDeadline = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return `DUE: ${dateStr.toUpperCase()}`;
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `DUE: ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  } catch (e) {
    return `DUE: ${dateStr.toUpperCase()}`;
  }
}

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
          /* rounded-md */
          className={`w-3 h-[2px] rounded-md transition-all duration-300 ${i < activeCount ? '' : 'bg-white/10'}`}
          style={i < activeCount ? { backgroundColor: color, boxShadow: `0 0 5px ${color}` } : {}}
        />
      ))}
    </div>
  )
}

interface SquadMember {
  id: string
  member_row_id: string
  full_name: string
  avatar_url: string | null
  rank: string
  role: string
  last_seen: string | null
}

interface UseSquadPermissionsParams {
  mission: any
  profile: any
  squadMembers: SquadMember[]
}

function useSquadPermissions({ mission, profile, squadMembers }: UseSquadPermissionsParams) {
  const myMemberRow = useMemo(() => {
    return squadMembers.find((m: any) => m.id === profile?.id || m.user_id === profile?.id)
  }, [squadMembers, profile?.id])

  const userRole = useMemo(() => {
    if (mission?.user_id === profile?.id) return 'owner'
    return myMemberRow?.role || 'guest'
  }, [mission?.user_id, profile?.id, myMemberRow])

  const normalizedRole = useMemo(() => {
    return userRole === 'co-admin' ? 'admin' : userRole
  }, [userRole])

  const canDeleteSquad = normalizedRole === 'owner'
  const canManageMembers = ['owner', 'admin'].includes(normalizedRole)
  const canAssignTasks = ['owner', 'admin'].includes(normalizedRole)
  const canCreateGoal = ['owner', 'admin'].includes(normalizedRole)
  const canAddTask = ['owner', 'admin', 'member'].includes(normalizedRole)
  const canCompleteTask = ['owner', 'admin', 'member'].includes(normalizedRole)
  const canComment = true

  return {
    normalizedRole,
    canDeleteSquad,
    canManageMembers,
    canAssignTasks,
    canCreateGoal,
    canAddTask,
    canCompleteTask,
    canComment
  }
}

export default function MissionDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { calculateAccountability, t, isRTL, mounted, addXp, currentTheme, profile } = useGrowth()
  const { showToast } = useToast()
  const { playSuccess, playError, playBlip } = useSound()
  const [mission, setMission] = useState<any>(null)
  const [squadMembers, setSquadMembers] = useState<SquadMember[]>([])
  const [showSquadPanel, setShowSquadPanel] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer' | 'guest'>('member')
  const [isReviewing, setIsReviewing] = useState<string | null>(null)
  const [activeAssignPopover, setActiveAssignPopover] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'list' | 'board'>('list')
  const [activeViewInitialized, setActiveViewInitialized] = useState(false)
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'WEEK' | 'OVERDUE'>('ALL')
  const [selectedTaskState, setSelectedTaskState] = useState<any | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!mission?.tasks) return
    const targetTaskId = searchParams.get('taskId')
    if (targetTaskId) {
      const task = mission.tasks.find((t: any) => t.id === targetTaskId)
      if (task) {
        setSelectedTaskState(task)
      }
    }
  }, [mission?.tasks, searchParams])
  const selectedTask = useMemo(() => {
    if (!selectedTaskState) return null
    return mission?.tasks?.find((t: any) => t.id === selectedTaskState.id) || selectedTaskState
  }, [mission?.tasks, selectedTaskState])

  const [onlineUsers, setOnlineUsers] = useState<any[]>([])
  const [mySessionColor, setMySessionColor] = useState<string | null>(null)
  const presenceChannelRef = useRef<any>(null)

  const {
    normalizedRole,
    canDeleteSquad,
    canManageMembers,
    canAssignTasks,
    canCreateGoal,
    canAddTask,
    canCompleteTask,
    canComment
  } = useSquadPermissions({ mission, profile, squadMembers })

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
  // const [attachmentMissionId, setAttachmentMissionId] = useState<string | null>(null)
  const [attachmentGoalId, setAttachmentGoalId] = useState<string | null>(null)
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
    
    if (!canCompleteTask) return false
    
    const isPrivileged = ['owner', 'admin'].includes(normalizedRole)
    if (!task.assigned_to) {
      return isPrivileged || normalizedRole === 'member'
    } else {
      return task.assigned_to === profile?.id || isPrivileged
    }
  }

  const handleAssignClick = async (e: React.MouseEvent, task: any) => {
    e.stopPropagation()
    if (mission?.metadata?.type !== 'squad') return
    
    if (!['owner', 'admin', 'member'].includes(normalizedRole)) {
      showToast(isRTL ? "⚠️ ليس لديك صلاحية لهذا الإجراء" : "⚠️ You don't have permission for this action", "warning")
      playError()
      return
    }
    
    const isPrivileged = ['owner', 'admin'].includes(normalizedRole)
    
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
          // showToast(isRTL ? "تم تعيين المهمة لك" : "TASK ASSIGNED TO YOU", "success")
          showToast(isRTL ? "تم تعيين المهمة لك" : "Task assigned to you", "success")
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
          // showToast(isRTL ? "تم إلغاء التعيين" : "TASK UNASSIGNED", "success")
          showToast(isRTL ? "تم إلغاء التعيين" : "Task unassigned", "success")
          playSuccess()
        }
      } else {
        // showToast(isRTL ? "هذه المهمة معينة بالفعل لشخص آخر" : "TASK ALREADY ASSIGNED TO ANOTHER MEMBER", "warning")
        showToast(isRTL ? "هذه المهمة معينة بالفعل لشخص آخر" : "Task already assigned to another member", "warning")
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
      // showToast(isRTL ? 'تم نسخ صورة البطاقة بنجاح!' : 'CARD IMAGE COPIED TO CLIPBOARD', 'success')
      showToast(isRTL ? 'تم نسخ صورة البطاقة بنجاح!' : 'Card image copied to clipboard', 'success')
      playSuccess()
      setShowShareModal(false)
    } catch (err) {
      console.error('Failed to copy image blob:', err)
      // showToast(isRTL ? 'الكارت غير متوفر حالياً // يعمل في البيئة الإنتاجية' : 'CARD_UNAVAILABLE // Works on production', 'warning')
      showToast(isRTL ? 'الكارت غير متوفر حالياً - يعمل في البيئة الإنتاجية' : 'Card unavailable - Works on production', 'warning')
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
      // showToast(isRTL ? 'تم تحميل الكارت بنجاح!' : 'GOAL CARD DOWNLOADED SUCCESSFULLY', 'success')
      showToast(isRTL ? 'تم تحميل الكارت بنجاح!' : 'Goal card downloaded successfully', 'success')
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
      // .eq('cup_id', id)
      .eq('goal_id', id)
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
      setAttachmentGoalId(null)
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
      .from('goal_attachments')
      .select('*', { count: 'exact', head: true })
      .eq('goal_id', id)
      .eq('user_id', user.id)
    if (count !== null) setAttachmentCount(count)
  }

  const openAttachments = async () => {
    playBlip()
    setModalLoading(true)
    const { data } = await supabase
      .from('goal_attachments')
      .select('*, profiles(full_name, avatar_url)')
      .eq('goal_id', id)
      .order('created_at', { ascending: false })
    if (data) {
      setActiveAttachments(data)
      setAttachmentCount(data.length)
    }
    setAttachmentGoalId(id as string)
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
      // showToast(isRTL ? 'تم تنظيف العناوين بنجاح' : 'TITLES_CLEANED // OPTIMIZED', 'success')
      showToast(isRTL ? 'تم تنظيف العناوين بنجاح' : 'Titles cleaned and optimized', 'success')
      playSuccess()
    } catch (err) {
      console.error(err)
      // showToast(isRTL ? 'فشل تنظيف العناوين' : 'CLEAN_ERROR', 'warning')
      showToast(isRTL ? 'فشل تنظيف العناوين' : 'Failed to clean titles', 'warning')
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
        // router.push('/goals/squad')
        if (window.location.pathname !== '/goals/squad') {
          router.push('/goals/squad')
        }
      }
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('goals')
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
      // router.push('/goals/squad')
      if (window.location.pathname !== '/goals/squad') {
        router.push('/goals/squad')
      }
    }
    setLoading(false)
  }

  async function fetchLinkedNotes() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('goal_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setLinkedNotes(data)
  }

  // --- REAL-TIME CHANNEL SYNCHRONIZATION (squad goals only) ---
  useEffect(() => {
    console.log('🚀 REALTIME HOOK MOUNTED');
    if (!profile?.id) {
      console.log('Realtime hook waiting: profile session is not yet loaded');
      return;
    }
    if (!id || typeof id !== 'string' || id.startsWith('local_')) {
      console.log('Realtime hook returning early because id is invalid or local:', id);
      return;
    }

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

    console.log('SUBSCRIBING TO REALTIME EVENTS FOR WORKSPACE:', id)

    let active = true;
    let channel: any = null;

    const initRealtime = async () => {
      // Ensure the client has loaded its session and JWT token
      const { data: { session } } = await supabase.auth.getSession()
      if (!active) return

      if (session?.access_token) {
        console.log('🔐 REALTIME JWT LOADED, SETTING AUTH ON CLIENT');
        supabase.realtime.setAuth(session.access_token)
      } else {
        console.log('⚠️ REALTIME WARNING: NO ACTIVE SESSION JWT FOUND');
      }

      channel = supabase
        .channel(`squad-tasks-workspace-${id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks' },
          async (payload: any) => {
            console.log('REALTIME PAYLOAD:', payload)
            // Re-fetch clean state from DB to guarantee 100% accurate state update and React re-render
            await fetchMission()
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'goal_members' },
          async (payload: any) => {
            console.log('REALTIME GOAL MEMBERS PAYLOAD:', payload)
            refetchSquadMembers()
            fetchPendingRequests()
            await fetchMission()
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'squad_join_requests' },
          async (payload: any) => {
            console.log('REALTIME JOIN REQUESTS PAYLOAD:', payload)
            fetchPendingRequests()
            await fetchMission()
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: '*' },
          (payload: any) => {
            console.log('🔥 GLOBAL CATCH-ALL PAYLOAD:', payload)
          }
        )
        .subscribe((status: string) => {
          console.log('📡 CHANNEL STATUS:', status)
        })
    };

    initRealtime();

    return () => {
      active = false;
      console.log('UNSUBSCRIBING FROM REALTIME EVENTS FOR WORKSPACE:', id)
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [id, supabase, fetchPendingRequests, profile?.id])

  // --- REAL-TIME PRESENCE ---
  useEffect(() => {
    if (!id || typeof id !== 'string' || id.startsWith('local_')) return
    if (mission?.metadata?.type !== 'squad' || !profile?.id) return

    const PALETTE = ['#1D9E75', '#BA7517', '#7F77DD', '#D85A30', '#378ADD']

    const channel = supabase.channel(`workspace:${id}`, {
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
          .from('goals')
          .update({ is_archived: true, status: 'completed', color: currentTheme.color })
          .eq('id', id)
        
        if (!error) {
          setMission((prev: any) => ({ ...prev, is_archived: true, status: 'completed' }))
          // showToast(isRTL ? 'تم اكتمال المهمة! نقلت إلى الخزنة' : 'GOAL ACHIEVED! MOVED TO WINS', 'success')
          showToast(isRTL ? 'تم اكتمال المهمة! نقلت إلى الخزنة' : 'Goal achieved! Moved to wins', 'success')
          playSuccess()
        }
      } else if (roundedProgress < 100 && mission.is_archived) {
        const { error } = await supabase
          .from('goals')
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
    // Force "no_date_changes" rule check
    const isDeadlineChange = updates.metadata && 'endDate' in updates.metadata
    if (isDeadlineChange && mission?.metadata?.rules?.no_date_changes) {
      const isPrivileged = ['owner', 'admin'].includes(normalizedRole)
      if (!isPrivileged) {
        showToast(isRTL ? "⚠️ لا يمكنك تغيير الموعد النهائي بسبب قواعد الفريق" : "⚠️ You cannot change deadlines due to team rules", "warning")
        playError()
        return
      }
    }

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
      // showToast(isRTL ? 'فشل تحديث البيانات في قاعدة البيانات' : 'DATABASE_UPDATE_ERROR', 'warning')
      showToast(isRTL ? 'فشل تحديث البيانات في قاعدة البيانات' : 'Failed to update database', 'warning')
      playError()
    }
  }

  const toggleTask = async (taskId: string, currentStatus: boolean) => {
    const taskObj = mission?.tasks?.find((t: any) => t.id === taskId)
    if (mission?.metadata?.type === 'squad' && taskObj && !canToggleTask(taskObj)) {
      showToast(isRTL ? "⚠️ ليس لديك صلاحية لهذا الإجراء" : "⚠️ You don't have permission for this action", "warning")
      playError()
      return
    }

    const nextStatus = !currentStatus
    const isLocal = typeof id === 'string' && id.startsWith('local_')

    // Optimistically update the state
    setMission((prev: any) => ({
      ...prev,
      tasks: prev.tasks.map((t: any) =>
        t.id === taskId ? { ...t, is_completed: nextStatus } : t
      )
    }))

    if (isLocal) {
      const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
      const next = {
        ...mission,
        tasks: mission.tasks.map((t: any) => t.id === taskId ? { ...t, is_completed: nextStatus } : t)
      }
      const updatedGoals = guestGoals.map((g: any) => g.id === id ? next : g)
      localStorage.setItem('guest_goals', JSON.stringify(updatedGoals))
      if (nextStatus) playSuccess()
      else playBlip()
      return
    }

    const { error } = await supabase
      .from('tasks')
      .update({ is_completed: nextStatus })
      .eq('id', taskId)

    if (error) {
      // Rollback on error
      setMission((prev: any) => ({
        ...prev,
        tasks: prev.tasks.map((t: any) =>
          t.id === taskId ? { ...t, is_completed: currentStatus } : t
        )
      }))
      // showToast(isRTL ? 'فشل تحديث البيانات في قاعدة البيانات' : 'DATABASE_UPDATE_ERROR', 'warning')
      showToast(isRTL ? 'فشل تحديث البيانات في قاعدة البيانات' : 'Failed to update database', 'warning')
      playError()
      return
    }

    if (nextStatus) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('task_completion_log').insert({
          user_id: user.id,
          completed_at: new Date().toISOString()
        })

        if (mission?.metadata?.type === 'squad') {
          const { data: members } = await supabase
            .from('goal_members')
            .select('user_id')
            .eq('goal_id', id)
          
          if (members) {
            const userName = profile?.full_name || 'Someone'
            const goalName = mission.title
            
            const notifTitle = isRTL ? `✅ إكمال مهمة في الفريق` : `✅ Squad Task Completed`
            const notifContent = isRTL 
              ? `أكمل [${userName}] مهمة في [${goalName}]` 
              : `[${userName}] completed a task in [${goalName}]`

            for (const member of members) {
              if (member.user_id && member.user_id !== user.id) {
                await supabase.from('inbox_reports').insert({
                  user_id: member.user_id,
                  type: 'squad_member_completed_task',
                  title: notifTitle,
                  content: {
                    text: notifContent,
                    goal_id: id,
                    task_id: taskId,
                    sender_id: user.id,
                    sender_name: userName
                  }
                })
              }
            }
          }
        }

        const taskIndex = mission.tasks.findIndex((t: any) => t.id === taskId)
        const task = mission.tasks[taskIndex]
        if (task) {
          const sizeStr = mission.size?.toLowerCase() || 'md'
          let xpCeiling = 8
          if (sizeStr === 'sm' || sizeStr === 's' || sizeStr === 'small') xpCeiling = 4
          else if (sizeStr === 'lg' || sizeStr === 'l' || sizeStr === 'large') xpCeiling = 20

          if (taskIndex < xpCeiling) {
            await addXp(task.weight * 10, task.title, task.id)
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

  useEffect(() => {
    const handleOnboardingAction = async (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!mission?.tasks) return

      let targetTask = null
      if (detail === 'ctrl-k') {
        targetTask = mission.tasks.find((t: any) => t.title.toUpperCase().includes('CTRL + K') && !t.is_completed)
      } else if (detail === 'pin') {
        targetTask = mission.tasks.find((t: any) => (t.title.toUpperCase().includes('PIN') || t.title.includes('📌')) && !t.is_completed)
      } else if (detail === 'import-playlist') {
        targetTask = mission.tasks.find((t: any) => t.title.toUpperCase().includes('YOUTUBE') && !t.is_completed)
      } else if (detail === 'ai-coach') {
        targetTask = mission.tasks.find((t: any) => t.title.toUpperCase().includes('AI COACH') && !t.is_completed)
      }

      if (targetTask) {
        await toggleTask(targetTask.id, false)
      }
    }

    window.addEventListener('onboarding-action', handleOnboardingAction)
    return () => window.removeEventListener('onboarding-action', handleOnboardingAction)
  }, [mission?.tasks, toggleTask])

  const onMoveTask = async (taskId: string, newColumnId: string) => {
    if (mission?.metadata?.type === 'squad' && !canCompleteTask) {
      showToast(isRTL ? "⚠️ ليس لديك صلاحية لهذا الإجراء" : "⚠️ You don't have permission for this action", "warning")
      playError()
      return
    }

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

            if (mission?.metadata?.type === 'squad') {
              const { data: members } = await supabase
                .from('goal_members')
                .select('user_id')
                .eq('goal_id', id)
              
              if (members) {
                const userName = profile?.full_name || 'Someone'
                const goalName = mission.title
                
                const notifTitle = isRTL ? `✅ إكمال مهمة في الفريق` : `✅ Squad Task Completed`
                const notifContent = isRTL 
                  ? `أكمل [${userName}] مهمة في [${goalName}]` 
                  : `[${userName}] completed a task in [${goalName}]`

                for (const member of members) {
                  if (member.user_id && member.user_id !== user.id) {
                    await supabase.from('inbox_reports').insert({
                      user_id: member.user_id,
                      type: 'squad_member_completed_task',
                      title: notifTitle,
                      content: {
                        text: notifContent,
                        goal_id: id,
                        task_id: taskId,
                        sender_id: user.id,
                        sender_name: userName
                      }
                    })
                  }
                }
              }
            }

            const sizeStr = mission.size?.toLowerCase() || 'md'
            let xpCeiling = 8
            if (sizeStr === 'sm' || sizeStr === 's' || sizeStr === 'small') xpCeiling = 4
            else if (sizeStr === 'lg' || sizeStr === 'l' || sizeStr === 'large') xpCeiling = 20

            if (taskIndex < xpCeiling) {
              await addXp(task.weight * 10, task.title, task.id)
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
      // showToast(isRTL ? 'فشل نقل المهمة' : 'TASK_MOVE_ERROR', 'warning')
      showToast(isRTL ? 'فشل نقل المهمة' : 'Failed to move task', 'warning')
      playError()
    }
  }

  const addTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (mission?.metadata?.type === 'squad' && !canAddTask) {
      showToast(isRTL ? "⚠️ ليس لديك صلاحية لهذا الإجراء" : "⚠️ You don't have permission for this action", "warning")
      playError()
      return
    }

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
      goal_id: id,
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
      // showToast(isRTL ? 'تم إضافة الهدف محلياً' : 'TASK_SAVED', 'success')
      return
    }

    const { data } = await supabase.from('tasks').insert(payload).select().single()

    if (data) {
      setMission((prev: any) => ({ ...prev, tasks: [...prev.tasks, data] }))
      setNewTaskTitle('')
      // showToast(isRTL ? 'تم إضافة الهدف' : 'TASK_SAVED', 'success')
    }
  }

  const deleteTask = async (taskId: string) => {
    if (mission?.metadata?.type === 'squad') {
      const currentRules = mission.metadata?.rules || {}
      const isMemberOrLower = ['member', 'viewer', 'guest'].includes(normalizedRole)
      if (!['owner', 'admin', 'member'].includes(normalizedRole) || (currentRules.no_delete && isMemberOrLower)) {
        showToast(isRTL ? "⚠️ ليس لديك صلاحية لهذا الإجراء" : "⚠️ You don't have permission for this action", "warning")
        playError()
        return
      }
    }

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
      // showToast(isRTL ? 'تم التحديث' : 'GOAL UPDATED', 'success')
      return
    }

    if (updates.sync_to_dashboard === true) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: synced } = await supabase
          .from('goals')
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

    const { error } = await supabase.from('goals').update(updates).eq('id', id)
    if (!error) {
      setMission((prev: any) => ({ ...prev, ...updates }))
      // showToast(isRTL ? 'تم التحديث' : 'GOAL UPDATED', 'success')
    }
  }

  const deleteMission = async () => {
    if (mission?.metadata?.type === 'squad' && !canDeleteSquad) {
      showToast(isRTL ? "⚠️ ليس لديك صلاحية لهذا الإجراء" : "⚠️ You don't have permission for this action", "warning")
      playError()
      return
    }
    // if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذه المهمة؟' : 'CONFIRM GOAL TERMINATION?')) return
    if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذه المهمة؟' : 'Are you sure you want to delete this goal?')) return
    const isLocal = typeof id === 'string' && id.startsWith('local_')

    if (isLocal) {
      const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
      const updatedGoals = guestGoals.filter((g: any) => g.id !== id)
      localStorage.setItem('guest_goals', JSON.stringify(updatedGoals))
      // showToast(isRTL ? 'تم حذف المهمة' : 'GOAL DELETED', 'success')
      showToast(isRTL ? 'تم حذف المهمة' : 'Goal deleted', 'success')
      router.push('/goals/squad')
      return
    }

    const { error } = await supabase.from('goals').delete().eq('id', id)
    if (error) {
      console.error('Delete cup error:', error)
      // showToast(isRTL ? `فشل الحذف: ${error.message}` : `DELETE FAILED: ${error.message}`, 'warning')
      showToast(isRTL ? `فشل الحذف: ${error.message}` : `Delete failed: ${error.message}`, 'warning')
    } else {
      showToast(isRTL ? 'تم حذف المهمة' : 'GOAL DELETED', 'success')
      router.push('/goals/squad')
    }
  }

    const toggleSquadRule = async (targetMission: any, ruleKey: string) => {
    playBlip()
    if (targetMission?.metadata?.type === 'squad' && !canManageMembers) {
      showToast(isRTL ? "⚠️ ليس لديك صلاحية لهذا الإجراء" : "⚠️ You don't have permission for this action", "warning")
      playError()
      return
    }
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
      .from('goals')
      .update({ metadata: newMetadata })
      .eq('id', id)
    
    if (error) {
      // showToast(isRTL ? "فشل تحديث القواعد" : "FAILED TO UPDATE TEAM RULES", "warning")
      showToast(isRTL ? "فشل تحديث القواعد" : "Failed to update team rules", "warning")
      playError()
    } else {
      // showToast(isRTL ? "تم تحديث قواعد الفريق!" : "TEAM RULES UPDATED", "success")
      showToast(isRTL ? "تم تحديث قواعد الفريق!" : "Team rules updated", "success")
      playSuccess()
    }
  }

  const leaveSquad = async () => {
    if (confirm(isRTL ? 'هل أنت متأكد من مغادرة الفريق؟' : 'Are you sure you want to leave the team?')) {
      playBlip()
      const { error } = await supabase
        .from('goal_members')
        .delete()
        .eq('goal_id', id)
        .eq('user_id', profile?.id)
      
      if (error) {
        // showToast(isRTL ? 'فشل مغادرة الفريق' : 'FAILED TO LEAVE TEAM', 'warning')
        showToast(isRTL ? 'فشل مغادرة الفريق' : 'Failed to leave team', 'warning')
        playError()
      } else {
        // showToast(isRTL ? 'لقد غادرت الفريق بنجاح' : 'YOU HAVE LEFT THE TEAM', 'success')
        showToast(isRTL ? 'لقد غادرت الفريق بنجاح' : 'You have left the team', 'success')
        playSuccess()
        setShowSquadPanel(false)
        router.push('/goals/squad')
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
    <>
      <div className="p-16 font-space animate-pulse text-sm" style={{ color: currentTheme.color }}>
        {/* {isRTL ? 'جاري التحميل...' : 'LOADING WORKSPACE...'} */}
        {isRTL ? 'جاري التحميل...' : 'Loading workspace...'}
      </div>
    </>
  )

  if (!mission) {
    return (
      <>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center font-space">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            /* rounded-md */
            className="w-full max-w-lg bg-black/60 border border-[#FF0055]/30 backdrop-blur-xl p-8 md:p-12 rounded-md shadow-[0_0_50px_rgba(255,0,85,0.15)] relative overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-[#FF0055]" />

            <div className="flex flex-col items-center gap-6">
              <Lock className="w-12 h-12 text-[#FF0055] animate-pulse" />
              <div className="space-y-2">
                <h2 className="text-xl md:text-2xl font-black text-[#FF0055]">
                  {/* CLASSIFIED_GOAL // ACCESS DENIED */}
                  Access Denied
                </h2>
                <p className="text-xs md:text-sm font-bold text-zinc-400 max-w-sm leading-relaxed">
                  This is a Team goal. Join with an invite code to access.
                </p>
              </div>

              <button
                onClick={() => {
                  playBlip()
                  router.push('/goals/squad?join=true')
                }}
                /* rounded-md */
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-md border border-teal-500/50 hover:border-teal-400 text-teal-400 hover:text-teal-300 bg-teal-500/5 hover:bg-teal-500/10 font-space text-xs font-black uppercase tracking-widest transition-all duration-300 active:scale-95 cursor-pointer"
              >
                <LinkIcon className="w-4 h-4 text-teal-400" />
                {/* JOIN WITH CODE */}
                Join with Code
              </button>
            </div>
          </motion.div>
        </div>
      </>
    )
  }

  const missionColor = currentTheme.color
  const isCurrentUserOwner = mission?.user_id === profile?.id
  const completedCount = mission?.tasks?.filter((t: any) => t.is_completed).length || 0
  const totalCount = mission?.tasks?.length || 0

  return (
    <>
      <div className="w-full max-w-7xl mx-auto px-4 md:px-8 p-4 md:p-12 space-y-8 md:space-y-12">
        
        {/* Mission Header Overview */}
        {/* rounded-md */}
        <section className="bg-[var(--card-bg)] border border-[var(--card-border)] p-6 md:p-12 rounded-md space-y-6 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2.5px]" style={{ background: missionColor }} />
            
            <div className="flex justify-between items-start gap-4">
               <div className="space-y-1 flex-1 min-w-0">
                  <h1 className="text-2xl md:text-5xl font-black font-space text-[var(--text-primary)] leading-none break-words">
                     {mission.title}
                  </h1>
               </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                   <div className="flex items-center gap-2 md:gap-4">
                      <button 
                         onClick={deleteMission}
                         className="p-2 text-black/20 dark:text-white/10 hover:text-red-500 hover:bg-red-500/10 transition-all rounded-full"
                         // title={isRTL ? 'حذف المهمة' : 'DELETE_GOAL'}
                         title={isRTL ? 'حذف المهمة' : 'Delete Goal'}
                      >
                         <Trash2 className="w-5 h-5 text-zinc-400 hover:text-red-500" />
                      </button>
                      <span className="text-3xl md:text-6xl font-black font-space" style={{ color: missionColor }}>{roundedProgress}%</span>
                   </div>
                   <p className="text-[9px] font-space text-[var(--text-secondary)] font-medium">{isRTL ? 'مكتمل' : 'Complete'}</p>
                </div>
            </div>

            {/* Horizontal Stats Row */}
            <div className="flex flex-wrap items-center pt-4 border-t border-white/5 gap-y-2">
               <div className="inline-flex items-center text-xs font-mono text-white/50 border-r border-white/10 pr-3 mr-3 last:border-0">
                  <Clock className="w-4 h-4 mr-1.5" style={{ color: missionColor }} />
                  <span>{isRTL ? 'إجمالي التركيز:' : 'Total Focus:'} <strong className="text-white font-black ml-1">{Math.floor(totalTimeInvested / 60)}h {totalTimeInvested % 60}m</strong></span>
               </div>
               <div className="inline-flex items-center text-xs font-mono text-white/50 border-r border-white/10 pr-3 mr-3 last:border-0">
                  <Radio className="w-4 h-4 mr-1.5" style={{ color: missionColor }} />
                  <span>{isRTL ? 'مكتمل:' : 'Done:'} <strong className="text-white font-black ml-1">{completedCount}</strong></span>
               </div>
               <div className="inline-flex items-center text-xs font-mono text-white/50 border-r border-white/10 pr-3 mr-3 last:border-0">
                  <CheckSquare className="w-4 h-4 mr-1.5" style={{ color: missionColor }} />
                  <span>{isRTL ? 'المهام الإجمالية:' : 'Total Tasks:'} <strong className="text-white font-black ml-1">{totalCount}</strong></span>
               </div>
            </div>

            {/* Squad Facepile — Clickable, capped to 3 + overflow bubble */}
            {mission?.metadata?.type === 'squad' && squadMembers.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-white/5">
                <span className="text-[10px] font-mono text-white/40 font-medium">
                  {isRTL ? '\u0627\u0644\u0641\u0631\u064a\u0642:' : 'Team:'}
                </span>

                {/* Clickable Facepile */}
                <button
                  onClick={() => { playBlip(); setShowSquadPanel(true); }}
                  className="flex items-center group cursor-pointer"
                  title={isRTL ? '\u0625\u062f\u0627\u0631\\u0629 \u0627\u0644\u0641\u0631\u064a\u0642' : 'Manage Team'}
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
            {/* Redesigned Native Action Bar */}
            <div className="flex flex-row justify-around items-center py-2 border-y border-zinc-800/50 w-full">
              {/* PIN ACTION */}
              <button 
                 onClick={() => { 
                    playBlip(); 
                    const nextVal = !mission.sync_to_dashboard;
                    updateMission({ sync_to_dashboard: nextVal }); 
                    if (nextVal) {
                      window.dispatchEvent(new CustomEvent('onboarding-action', { detail: 'pin' }));
                    }
                 }}
                 className="flex flex-col items-center justify-center p-2 transition-colors cursor-pointer text-zinc-400 hover:text-white"
                 style={mission.sync_to_dashboard ? { color: missionColor } : {}}
                 // title={mission.sync_to_dashboard ? (isRTL ? 'إلغاء التثبيت من الواجهة' : 'UNPIN FROM DASHBOARD') : (isRTL ? 'تثبيت في الواجهة' : 'PIN TO DASHBOARD')}
                  title={mission.sync_to_dashboard ? (isRTL ? 'إلغاء التثبيت من الواجهة' : 'Unpin from Dashboard') : (isRTL ? 'تثبيت في الواجهة' : 'Pin to Dashboard')}
              >
                 <Pin className={cn("w-5 h-5 mb-1", mission.sync_to_dashboard ? "rotate-45 fill-current" : "")} />
                 <span className="text-[10px] font-space font-medium">
                   {/* {mission.sync_to_dashboard ? (isRTL ? 'إلغاء التثبيت' : 'UNPIN') : (isRTL ? 'تثبيت' : 'PIN')} */}
                    {mission.sync_to_dashboard ? (isRTL ? 'إلغاء التثبيت' : 'Unpin') : (isRTL ? 'تثبيت' : 'Pin')}
                 </span>
              </button>

              {/* IMPORT ACTION */}
              <div className="relative">
                <button
                   onClick={() => { playBlip(); setShowImportDropdown(!showImportDropdown); }}
                   className="flex flex-col items-center justify-center p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                   <ListPlus className="w-5 h-5 mb-1" />
                   <span className="text-[10px] font-space font-medium flex items-center gap-0.5">
                      {/* {isRTL ? 'استيراد' : 'IMPORT'} */}
                       {isRTL ? 'استيراد' : 'Import'}
                      <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", showImportDropdown && "rotate-180")} />
                   </span>
                </button>

                <AnimatePresence>
                  {showImportDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowImportDropdown(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute left-1/2 -translate-x-1/2 mt-2 w-48 bg-zinc-950 border border-zinc-800 rounded-md shadow-2xl z-50 p-1.5 space-y-1 font-space"
                      >
                        <button
                          onClick={() => { 
                            playBlip(); 
                            setShowPlaylistModal(true); 
                            setShowImportDropdown(false); 
                            window.dispatchEvent(new CustomEvent('onboarding-action', { detail: 'import-playlist' }));
                          }}
                          className="w-full text-left px-3 py-2 text-[9px] font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-md transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <ListPlus className="w-3.5 h-3.5" />
                          {isRTL ? 'استيراد قائمة تشغيل' : 'Import Playlist'}
                        </button>
                        <button
                          onClick={() => { playBlip(); setShowSmartImportModal(true); setShowImportDropdown(false); }}
                          className="w-full text-left px-3 py-2 text-[9px] font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-md transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <ClipboardIcon className="w-3.5 h-3.5" />
                          {isRTL ? 'استيراد ذكي' : 'Smart Import'}
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* NOTES ACTION */}
              <button
                onClick={() => { playBlip(); setShowIntelModal(true); }}
                className="flex flex-col items-center justify-center p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer relative"
              >
                <FileText className="w-5 h-5 mb-1" />
                <span className="text-[10px] tracking-wider uppercase font-space font-black">
                  {/* {isRTL ? 'الملاحظات' : 'NOTES'} */}
                  {isRTL ? 'الملاحظات' : 'Notes'}
                </span>
                {linkedNotes.length > 0 && (
                  <span className="absolute top-1 right-2 w-3.5 h-3.5 rounded-full text-[8px] font-black flex items-center justify-center text-black" style={{ backgroundColor: missionColor }}>
                    {linkedNotes.length}
                  </span>
                )}
              </button>

              {/* SHARE ACTION */}
              <button
                 onClick={handleShare}
                 className="flex flex-col items-center justify-center p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                 <Share2 className="w-5 h-5 mb-1" />
                 <span className="text-[10px] font-space font-medium">
                   {/* {isRTL ? 'مشاركة' : 'SHARE'} */}
                   {isRTL ? 'مشاركة' : 'Share'}
                 </span>
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
                  
                  const cleanDate = (mission.end_date || mission.start_date || new Date().toISOString().split('T')[0]).replace(/-/g, '').substring(0, 8);
                  const dates = `${cleanDate}T230000/${cleanDate}T235900`;
                  const title = encodeURIComponent(`[Growth Hub] ${mission.title}`);
                  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://playgrowthhub.com';
                  const details = encodeURIComponent(`Growth Hub Goal | Progress: ${percentage}% | Tasks: ${completed}/${total} | Click here to open: ${appUrl}/goals/squad/${id}`);
                  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=Growth_Hub`;
                  
                  window.open(googleUrl, '_blank');
                  playBlip();
                }}
                /* rounded-md */
                className="w-10 h-10 border border-[var(--card-border)] flex items-center justify-center rounded-md transition-all"
                style={{ color: `${currentTheme.color}99` }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = currentTheme.color;
                  e.currentTarget.style.borderColor = `${currentTheme.color}60`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = `${currentTheme.color}99`;
                  e.currentTarget.style.borderColor = '';
                }}
                // title="ADD_TO_GOOGLE_CALENDAR"
                title="Add to Google Calendar"
             >
                <Calendar className="text-xl w-5 h-5" />
             </button>

             <button
                onClick={openAttachments}
                /* rounded-md */
                className="w-10 h-10 border border-[var(--card-border)] text-[var(--text-secondary)] hover:opacity-85 flex items-center justify-center rounded-md relative transition-all"
                // title="GOAL_ATTACHMENTS"
                title="Attachments"
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
           <div className="flex justify-between items-center border-b border-zinc-800/80 pb-3">
             <h2 className="text-[10px] font-medium font-space text-[var(--text-secondary)]">
               {isRTL ? 'قائمة المهام' : 'Tasks'}
             </h2>
             
             {/* View Toggles (Icon Only) on the Far Right */}
             <div className="flex items-center gap-1 p-0.5 bg-black/40 border border-white/5 backdrop-blur-md rounded-md">
               <button
                 type="button"
                 onClick={() => { playBlip(); setActiveView('list'); }}
                 className={cn(
                   "p-1.5 rounded transition-colors cursor-pointer",
                   activeView === 'list' ? "text-white" : "text-white/40 hover:text-white/70"
                 )}
                 style={activeView === 'list' ? { color: missionColor, backgroundColor: `${missionColor}15` } : {}}
                 title={isRTL ? 'عرض القائمة' : 'List View'}
               >
                 <List className="w-4 h-4" />
               </button>
               <button
                 type="button"
                 onClick={() => { playBlip(); setActiveView('board'); }}
                 className={cn(
                   "p-1.5 rounded transition-colors cursor-pointer",
                   activeView === 'board' ? "text-white" : "text-white/40 hover:text-white/70"
                 )}
                 style={activeView === 'board' ? { color: missionColor, backgroundColor: `${missionColor}15` } : {}}
                 title={isRTL ? 'عرض كانبان' : 'Board View'}
               >
                 <Kanban className="w-4 h-4" />
               </button>
             </div>
           </div>

           {/* Smart Time Filters wrapped underneath the header row */}
           <div className="flex flex-wrap gap-2 py-2 p-3 bg-zinc-900/30 border border-white/5 rounded-lg">
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
                   "h-8 px-4 rounded-full text-[10px] font-space font-black uppercase tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap flex items-center justify-center border",
                   timeFilter === f.key
                     ? "text-black border-transparent shadow-md font-black"
                     : "border-zinc-800 text-zinc-400 hover:text-white bg-black/20"
                 )}
                 style={timeFilter === f.key ? { color: '#000', backgroundColor: missionColor } : {}}
               >
                 {f.label}
               </button>
             ))}
           </div>

           <InlineGuideTip hasTasks={(mission.tasks || []).length > 0} />

           {/* Task List — V27.1 Symmetric Card Layout */}
           {activeView === 'list' ? (
             <div className="space-y-3">
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
                      const taskViewers = onlineUsers.filter((ou: any) => ou.cursor_task_id === task.id && ou.user_id !== profile?.id)

                     return (
                       <motion.div
                         key={task.id}
                         layout
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         exit={{ opacity: 0, scale: 0.95 }}
                         onClick={() => setSelectedTask(task)}
                         className={cn(
                           "group flex flex-col p-4 md:p-5 border border-[var(--card-border)] rounded-md cursor-pointer hover:border-cyan-500/50 hover:bg-white/5 hover:scale-[1.01] transition-all duration-300 shadow-sm space-y-3 relative",
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

                                   {/* Main Row: Checkbox, index, title */}
                          <div className="flex items-center justify-between gap-4 w-full">
                            <div className={cn(
                              "flex items-center gap-3 w-full",
                              isRTL ? "flex-row-reverse" : "flex-row"
                            )}>
                              {/* RIGHT SIDE: Index + Check */}
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="font-space font-black text-[11px] text-white/30 w-5 text-right select-none">
                                  {String(index + 1).padStart(2, '0')}
                                </span>
                                <button
                                   onClick={(e) => { 
                                     e.stopPropagation(); 
                                     if (!canToggleTask(task)) {
                                       // showToast(isRTL ? 'غير مسموح // ليست مهمتك' : 'RESTRICTED // NOT YOUR TASK', 'warning')
                                       showToast(isRTL ? 'غير مسموح - ليست مهمتك' : 'Restricted - Not your task', 'warning');
                                       playError();
                                       return;
                                     }
                                     if (navigator.vibrate) navigator.vibrate(50);
                                     toggleTask(task.id, task.is_completed); 
                                   }}
                                   className="shrink-0 cursor-pointer flex items-center justify-center"
                                 >
                                   {task.is_completed ? (
                                     <NeonIcon icon={CheckCircle2} interactive size={22} style={{ color: currentTheme.color }} />
                                   ) : (
                                     <NeonIcon icon={Circle} interactive size={22} className="opacity-40 hover:opacity-80 text-white/60 hover:text-white transition-opacity" />
                                   )}
                                 </button>
                              </div>

                              {/* CENTER: Title & Metadata */}
                              <div className={cn(
                                "flex-1 min-w-0 flex flex-col justify-center",
                                isRTL ? "items-end text-right" : "items-start text-left"
                              )}>
                                <span className={cn(
                                  "text-base md:text-[17px] font-space font-bold tracking-tight transition-all duration-300 ease-in-out uppercase truncate max-w-full block",
                                  task.is_completed ? "text-gray-500 line-through opacity-55" : "text-white"
                                )}>
                                  {task.title}
                                </span>
                                
                                {/* Tier 2: Metadata row directly below Title */}
                                <div className={cn(
                                  "flex flex-wrap items-center gap-2 mt-2 w-full",
                                  isRTL ? "justify-end" : "justify-start"
                                )}>
                                  {hasVideo ? (
                                    <div className="flex items-center gap-1.5 shrink-0 bg-white/[0.03] border border-zinc-800 px-2 py-0.5 rounded text-[11px] font-mono text-white/60">
                                      <Play className="w-3.5 h-3.5 fill-current" style={{ color: currentTheme.color }} />
                                      <span className="font-mono text-[11px] text-[#FFFFFF] tracking-wider">
                                        {formatVideoTime(videoProgress)} / {formatVideoTime(videoDuration)}
                                      </span>
                                    </div>
                                  ) : timeFormatted ? (
                                    <span className="font-mono text-[11px] text-white/50 bg-white/[0.03] border border-zinc-800 px-2 py-0.5 rounded tracking-wider inline-flex items-center gap-1.5">
                                      <Timer className="w-3.5 h-3.5" style={{ color: currentTheme.color }} />
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
                                        "font-mono text-[10px] px-2 py-0.5 rounded tracking-wider inline-flex items-center gap-1.5 border shrink-0",
                                        isOverdue 
                                          ? "bg-red-500/10 border-red-500 text-red-500 font-bold" 
                                          : "text-white/40 border-zinc-800 bg-white/[0.02]"
                                      )}>
                                        <Calendar className={cn("w-3.5 h-3.5", isOverdue ? "text-red-500" : "text-cyan-500/80")} />
                                        {formatDeadline(task.metadata.endDate)}
                                      </span>
                                    )
                                  })()}
                                  <div className="flex items-center gap-2 bg-white/[0.01] border border-zinc-900/50 px-2 py-0.5 rounded shrink-0">
                                    <span className="text-[9px] uppercase font-mono text-white/30 tracking-widest">{isRTL ? 'الوزن:' : 'Weight:'}</span>
                                    <ComplexityDashes weight={task.weight} color={currentTheme.color} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Restructured Thumb-Friendly action row with divider containing actions */}
                          <div className="w-full flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                            {/* Left side: Assignee & XP Badge */}
                            <div className="flex items-center gap-3 shrink-0">
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
                                      {/* [ + ASSIGN ] */}
                                       [ + Assign ]
                                    </button>
                                  )}

                                  {/* Assignee Popover dropdown */}
                                  {activeAssignPopover === task.id && (
                                    <div 
                                      className="absolute left-0 bottom-full mb-2 w-48 bg-[#0a0a0f] border border-white/10 rounded-md shadow-2xl z-[150] p-2 space-y-1 font-space text-left"
                                      onClick={e => e.stopPropagation()}
                                    >
                                      <div className="text-[9px] font-black text-zinc-500 tracking-widest uppercase p-1.5 border-b border-white/5">
                                        {/* {isRTL ? 'ASSIGN' : 'ASSIGN OPERATOR'} */}
                                        {isRTL ? 'تعيين' : 'Assign Operator'}
                                      </div>
                                      <div className="max-h-40 overflow-y-auto py-1">
                                        {squadMembers.map((member) => (
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
                                                // showToast(isRTL ? `ASSIGNED` : `ASSIGNED TO ${member.full_name.toUpperCase()}`, 'success')
                                                 showToast(isRTL ? `تم التعيين` : `Assigned to ${member.full_name}`, 'success')
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
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* XP Reward Badge */}
                              <div className="flex items-center gap-1 bg-[#14b8a6]/10 border border-[#14b8a6]/20 px-2 py-0.5 rounded text-[10px] font-mono text-[#14b8a6] tracking-wider shrink-0 font-bold">
                                +{task.weight * 10} XP
                              </div>
                            </div>

                            {/* Right side: Delete action only */}
                            <div className="flex items-center gap-x-1 shrink-0">
                              <button
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  if (mission?.metadata?.type === 'squad') {
                                    const currentRules = mission.metadata?.rules || {}
                                    const isMemberOrLower = ['member', 'viewer', 'guest'].includes(normalizedRole)
                                    if (!['owner', 'admin', 'member'].includes(normalizedRole) || (currentRules.no_delete && isMemberOrLower)) {
                                      showToast(isRTL ? "⚠️ ليس لديك صلاحية لهذا الإجراء" : "⚠️ You don't have permission for this action", "warning")
                                      playError()
                                      return
                                    }
                                  }
                                  deleteTask(task.id); 
                                }}
                                className="p-2.5 md:p-1.5 text-[var(--text-secondary)] hover:text-red-500 transition-all cursor-pointer"
                                // title="DELETE_TASK"
                                title="Delete Task"
                              >
                                <Trash2 className="w-5 h-5 md:w-4 md:h-4" />
                              </button>
                            </div>
                          </div>
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
               goalId={id as string}
               onlineUsers={onlineUsers}
               currentUserId={profile?.id}
             />
           )}

           {/* Add Task Input */}
           <div className="relative mt-8 md:mt-12 flex flex-col gap-3">
             <form onSubmit={addTask} className="relative flex flex-col md:flex-row gap-4 md:gap-6">
                <div className="relative flex-1">
                   <input
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      placeholder={isRTL ? 'إضافة مهمة... (Enter)' : 'Add task... (Press Enter)'}
                      className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] p-4 md:p-6 font-space text-sm font-black text-[var(--text-primary)] outline-none transition-all"
                      style={{ borderColor: `${currentTheme.color}20` }}
                   />
                   <button 
                      type="submit"
                      className="absolute end-4 top-1/2 -translate-y-1/2 px-4 md:px-6 py-2 font-space text-[10px] font-medium transition-all"
                      style={{ backgroundColor: `${currentTheme.color}11`, color: currentTheme.color, borderColor: `${currentTheme.color}33` }}
                   >
                      + {isRTL ? 'إضافة' : 'Add'}
                   </button>
                </div>

                <div className="flex flex-col gap-2 justify-center px-4 md:px-6 py-3 md:py-0 border border-[var(--card-border)] bg-[var(--input-bg)]">
                   <div className="flex items-center gap-2">
                     <span className="text-[8px] font-space text-[var(--text-secondary)] font-medium">Set Power</span>
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
              className="w-[calc(100%-2rem)] mx-auto md:max-w-2xl max-h-[85vh] overflow-y-auto relative border border-[var(--card-border)] bg-[var(--card-bg)] rounded-md my-auto"
              style={{ borderColor: `${missionColor}30` }}
            >
              {/* Top neon bar */}
              <div className="absolute top-0 inset-x-0 h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${missionColor}, transparent)` }} />

              <div className="p-6 md:p-10 space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl md:text-2xl font-black font-space" style={{ color: missionColor }}>
                      {isRTL ? 'الملاحظات' : 'Notes'}
                    </h2>
                    <p className="text-[12px] font-space text-[var(--text-secondary)] font-medium mt-1">
                      {linkedNotes.length} {isRTL ? 'سجل مرتبط' : 'records linked to this goal'}
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
                    <p className="text-[11px] font-space text-[var(--text-secondary)] font-medium">
                      {isRTL ? 'لا توجد سجلات مرتبطة' : 'No notes linked'}
                    </p>
                    <p className="text-[14px] font-space text-[var(--text-primary)] tracking-wider">
                      {isRTL ? 'اذهب إلى الملاحظات وأنشئ ملاحظة مرتبطة بهذه المهمة' : 'Go to Notes → New Log and link it to this goal'}
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
                        className="p-5 border rounded-md relative"
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
        goalId={id as string}
        themeColor={missionColor}
        onTasksAdded={(newTasks) => {
          setMission((prev: any) => {
            const nextTasks = [...(prev.tasks || []), ...newTasks]
            return {
              ...prev,
              tasks: nextTasks
            }
          })
          showToast(isRTL ? 'تم استيراد قائمة التشغيل بنجاح' : 'Playlist imported successfully', 'success')
          playSuccess()
          
          // Automatically complete "Import Tutorial Task" if it exists (Point 3)
          const tutorialImportTask = mission?.tasks?.find((t: any) => t.metadata?.is_tutorial_import === true && !t.is_completed)
          if (tutorialImportTask) {
            toggleTask(tutorialImportTask.id, false)
          }
          
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
        goalId={id as string}
        themeColor={missionColor}
        onTasksAdded={(newTasks) => {
          setMission((prev: any) => ({
            ...prev,
            tasks: [...(prev.tasks || []), ...newTasks]
          }))
          showToast(
            isRTL
              ? `تم إضافة ${newTasks.length} مهمة بنجاح`
              : `Smart import complete — ${newTasks.length} tasks added`,
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
      {attachmentGoalId && (
        <MissionAttachmentsModal
          goalId={attachmentGoalId}
          missionTitle={mission?.title ?? ''}
          themeColor={missionColor}
          isOpen={!!attachmentGoalId}
          attachments={activeAttachments}
          setAttachments={setActiveAttachments}
          loading={modalLoading}
          onClose={() => {
            setAttachmentGoalId(null)
            setActiveAttachments([])
          }}
          onCountChange={count => setAttachmentCount(count)}
          canAddAttachment={(() => {
            const myMemberRow = squadMembers.find((m: any) => m.id === profile?.id || m.user_id === profile?.id)
            const isOwner = mission?.user_id === profile?.id || myMemberRow?.role === 'owner'
            const isMember = !!myMemberRow
            return !!(isOwner || isMember)
          })()}
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
                                <h3 className="text-sm font-medium text-zinc-100 flex items-center gap-2">
                                  <Shield className="w-4 h-4 text-[#14b8a6]" />
                                  {isRTL ? 'إدارة الفريق' : 'Squad Management'}
                                </h3>
                                {/* Removed ID block to purge cyberpunk aesthetics
                                <p className="text-[10px] text-[var(--text-secondary)] font-bold tracking-wider uppercase">
                                  ID: {mission?.id?.substring(0, 8)}
                                </p>
                                */}
                              </div>
                              <button
                                onClick={() => { playBlip(); setShowSquadPanel(false); }}
                                className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white hover:border-white/20 transition-all cursor-pointer bg-white/5"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                              {/* SECTION 1: MEMBERS (Always visible) */}
                              <div className="space-y-4">
                                <h4 className="text-xs font-semibold text-zinc-400 border-b border-white/5 pb-2">
                                  {isRTL ? 'أعضاء الفريق' : 'Squad Members'} ({squadMembers.length})
                                </h4>

                                <div className="space-y-3">
                                  {squadMembers.map((member: any) => {
                                    const isMemberOwner = member.role === 'owner' || mission?.user_id === member.id || mission?.user_id === member.user_id
                                    const isMemberCoAdmin = member.role === 'co-admin'
                                    const onlinePresence = onlineUsers.find((ou: any) => ou.user_id === member.id)
                                    
                                    return (
                                      <div key={member.id} className="flex items-center justify-between p-3 border border-white/5 bg-white/[0.02] rounded-md gap-4 flex-wrap sm:flex-nowrap">
                                        {/* LEFT SIDE: Avatar, Name, Rank badge */}
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
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="text-xs font-bold text-zinc-100">{member.full_name}</span>
                                              {isMemberOwner ? (
                                                <span className="px-1.5 py-0.5 text-[8px] font-medium tracking-wide bg-amber-950/30 border border-amber-500/30 text-amber-400 rounded-md">
                                                  {isRTL ? 'مالك' : 'Owner'}
                                                </span>
                                              ) : isMemberCoAdmin ? (
                                                <span className="px-1.5 py-0.5 text-[8px] font-medium tracking-wide bg-teal-950/30 border border-teal-500/30 text-teal-400 rounded-md">
                                                  {isRTL ? 'مشرف' : 'Co-Admin'}
                                                </span>
                                              ) : (
                                                <span className="px-1.5 py-0.5 text-[8px] font-medium tracking-wide bg-zinc-900 border border-white/10 text-zinc-400 rounded-md">
                                                  {isRTL ? 'عضو' : 'Member'}
                                                </span>
                                              )}
                                            </div>
                                            <span className="text-[8px] text-white/40 tracking-wider flex items-center gap-1 mt-0.5">
                                              <CheckCircle2 className="w-2 h-2 text-[#14b8a6]" />
                                              {member.rank || 'ROOKIE'}
                                            </span>
                                          </div>
                                        </div>

                                        {/* RIGHT SIDE: Role dropdown and Kick button directly here */}
                                        <div className="flex items-center gap-2 ms-auto shrink-0">
                                          {/* Role select dropdown (Owner only can modify, and not for their own row) */}
                                          {isOwner && member.id !== mission?.user_id && member.user_id !== mission?.user_id && (
                                            <select
                                              value={member.role || 'member'}
                                              onChange={async (e) => {
                                                const newRole = e.target.value
                                                if (newRole === member.role) return
                                                playBlip()
                                                const { error } = await supabase
                                                  .from('goal_members')
                                                  .update({ role: newRole })
                                                  .eq('id', member.member_row_id)
                                                if (error) {
                                                  // showToast(isRTL ? 'فشل تحديث الدور' : 'FAILED TO UPDATE ROLE', 'warning')
                                                  showToast(isRTL ? 'فشل تحديث الدور' : 'Failed to update role', 'warning')
                                                  playError()
                                                } else {
                                                  showToast(isRTL ? 'تم تحديث الدور بنجاح!' : `Role updated to ${newRole}`, 'success')
                                                  playSuccess()
                                                  await fetchMission()
                                                }
                                              }}
                                              className="bg-zinc-900 border border-white/10 text-zinc-300 py-1 px-2 rounded-md text-[10px] outline-none focus:border-teal-500/50 cursor-pointer font-space transition-all h-8"
                                            >
                                              {/* <option value="admin">ADMIN</option> */}
                                              {/* <option value="member">MEMBER</option> */}
                                              {/* <option value="viewer">VIEWER</option> */}
                                              {/* <option value="guest">GUEST</option> */}
                                              <option value="admin">Admin</option>
                                              <option value="member">Member</option>
                                              <option value="viewer">Viewer</option>
                                              <option value="guest">Guest</option>
                                            </select>
                                          )}

                                          {/* Kick button */}
                                          {isAdmin && member.id !== mission?.user_id && member.user_id !== mission?.user_id && (() => {
                                            const canKick = isOwner ? true : (isCoAdmin && member.role === 'member')
                                            if (!canKick) return null
                                            return (
                                              <button
                                                onClick={async () => {
                                                  if (confirm(isRTL ? `هل أنت متأكد من إزالة ${member.full_name} من الفريق؟` : `Are you sure you want to remove ${member.full_name} from the squad?`)) {
                                                    playBlip()
                                                    const { error } = await supabase
                                                      .from('goal_members')
                                                      .delete()
                                                      .eq('id', member.member_row_id)
                                                    
                                                    if (error) {
                                                      // showToast(isRTL ? 'فشل إزالة العضو' : 'FAILED TO REMOVE MEMBER', 'warning')
                                                      showToast(isRTL ? 'فشل إزالة العضو' : 'Failed to remove member', 'warning')
                                                      playError()
                                                    } else {
                                                      showToast(isRTL ? 'تم إزالة العضو من الفريق' : 'Member removed from squad', 'success')
                                                      playSuccess()
                                                      await fetchMission() // Reload members
                                                    }
                                                  }
                                                }}
                                                className="w-8 h-8 rounded border border-red-500/20 hover:border-red-500/50 bg-red-500/5 hover:bg-red-500/15 flex items-center justify-center text-red-400 hover:text-red-300 transition-all cursor-pointer"
                                                title="Kick"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            )
                                          })()}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>

                              {/* SECTION 2: PENDING JOIN REQUESTS (Admins only) */}
                              {isAdmin && (
                                <div className="space-y-4">
                                  <h4 className="text-xs font-semibold text-zinc-400 border-b border-white/5 pb-2">
                                    {isRTL ? 'طلبات الانضمام المعلقة' : 'Pending Requests'}
                                  </h4>

                                  {pendingRequests.length === 0 ? (
                                    <div className="text-center py-6 border border-dashed border-white/5 rounded-md bg-white/[0.01]">
                                      <p className="text-xs text-zinc-500">
                                        {isRTL ? 'لا توجد طلبات انضمام' : 'No pending requests'}
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      {pendingRequests.map((req: any) => {
                                        const requesterProfile = req.profiles || {}
                                        return (
                                          <div key={req.id} className="flex flex-col gap-3 p-4 border border-amber-500/10 bg-amber-500/[0.02] rounded-md">
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
                                                    // showToast(isRTL ? 'فشل قبول الطلب' : 'FAILED TO APPROVE', 'warning')
                                                    showToast(isRTL ? 'فشل قبول الطلب' : 'Failed to approve', 'warning')
                                                    playError()
                                                  } else {
                                                    if (req.role && ['admin', 'member', 'viewer', 'guest'].includes(req.role)) {
                                                      await supabase
                                                        .from('goal_members')
                                                        .update({ role: req.role })
                                                        .eq('goal_id', id)
                                                        .eq('user_id', req.user_id)
                                                    }
                                                    // showToast(isRTL ? 'تم قبول العضو الجديد في الفريق!' : 'MEMBER APPROVED // JOINED SQUAD', 'success')
                                                    showToast(isRTL ? 'تم قبول العضو الجديد في الفريق!' : 'Member approved - Joined squad', 'success')
                                                    playSuccess()
                                                    await fetchPendingRequests()
                                                    await fetchMission() // reload members list
                                                  }
                                                  setIsReviewing(null)
                                                }}
                                                className="flex-1 py-1.5 border border-teal-500/40 hover:border-teal-400 text-teal-400 hover:text-teal-300 bg-teal-500/5 hover:bg-teal-500/10 rounded font-black tracking-widest text-[9px] uppercase transition-all duration-300 disabled:opacity-50 cursor-pointer text-center"
                                              >
                                                {/* {isReviewing === req.id ? 'PROCESSING...' : (isRTL ? '✓ قبول' : '✓ APPROVE')} */}
                                                {isReviewing === req.id ? 'Processing...' : (isRTL ? '✓ قبول' : '✓ Approve')}
                                              </button>
                                              <button
                                                disabled={isReviewing !== null}
                                                onClick={async () => {
                                                  setIsReviewing(req.id)
                                                  playBlip()
                                                  console.log('REJECT RPC call with:', {
                                                     p_request_id: req.id,
                                                     p_action: 'reject',
                                                     req_object: req
                                                   })
                                                   // Commented out per rule "Never delete code, only comment it out":
                                                   // const { data, error } = await supabase.rpc('review_squad_join_request', { p_request_id: req.id, p_action: 'reject' })
                                                   const { data, error } = await supabase.rpc(
                                                     'review_squad_join_request', {
                                                     p_request_id: req.id,
                                                     p_action: 'reject'
                                                   })
                                                   console.log('REJECT result:', { data, error })
                                                  if (error) {
                                                    // showToast(isRTL ? 'فشل رفض الطلب' : 'FAILED TO REJECT', 'warning')
                                                    showToast(isRTL ? 'فشل رفض الطلب' : 'Failed to reject', 'warning')
                                                    playError()
                                                  } else {
                                                    // showToast(isRTL ? 'تم رفض طلب الانضمام' : 'MEMBER REJECTED // SQUAD SECURE', 'success')
                                                    showToast(isRTL ? 'تم رفض طلب الانضمام' : 'Member rejected - Squad secure', 'success')
                                                    playSuccess()
                                                    await fetchPendingRequests()
                                                  }
                                                  setIsReviewing(null)
                                                }}
                                                className="flex-1 py-1.5 border border-red-500/40 hover:border-red-400 text-red-400 hover:text-red-300 bg-red-500/5 hover:bg-red-500/10 rounded font-black tracking-widest text-[9px] uppercase transition-all duration-300 disabled:opacity-50 cursor-pointer text-center"
                                              >
                                                {/* {isReviewing === req.id ? 'PROCESSING...' : (isRTL ? '✗ رفض' : '✗ REJECT')} */}
                                                {isReviewing === req.id ? 'Processing...' : (isRTL ? '✗ رفض' : '✗ Reject')}
                                              </button>
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* SECTION 3: ROLE MANAGEMENT & KICK ACTIONS commented out to eliminate duplication in primary member row
                              {isAdmin && (
                                <div className="space-y-4">
                                  <h4 className="text-[10px] font-black tracking-[0.3em] uppercase text-zinc-500 border-b border-white/5 pb-1">
                                    {isRTL ? 'أدوار وأعضاء الفريق' : 'SQUAD ROLES & KICK'}
                                  </h4>

                                  {squadMembers.filter(m => m.id !== mission?.user_id).length === 0 ? (
                                    <div className="text-center py-6 border border-dashed border-white/5 rounded-md bg-white/[0.01]">
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
                                          <div key={member.id} className="flex flex-col gap-3 p-3 border border-white/5 bg-white/[0.01] rounded-md">
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
                                                  <Trash2 className="w-[15px] h-[15px]" />
                                                </button>
                                              )}
                                            </div>

                                            {/* Role management controls (Owner only) *\/}
                                            {isOwner && (
                                              <div className="flex flex-col gap-2 w-full mt-1.5 pt-1.5 border-t border-white/5">
                                                <div className="flex items-center justify-between">
                                                  <label htmlFor={`role-select-${member.id}`} className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                                                    {isRTL ? 'الدور والامتيازات:' : 'ROLE & PERMISSIONS:'}
                                                  </label>
                                                  <div className="group relative flex items-center">
                                                    <HelpCircle className="w-3.5 h-3.5 text-zinc-500 hover:text-teal-400 transition-colors cursor-help" />
                                                    <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-zinc-950/95 border border-white/10 rounded-md text-[10px] leading-relaxed text-zinc-300 font-medium font-sans uppercase tracking-wider hidden group-hover:block z-[200] shadow-xl backdrop-blur-md">
                                                      <div className="text-[#14b8a6] font-black mb-1">ROLE SCHEMATICS // INFO:</div>
                                                      <div className="mb-1"><span className="text-teal-400 font-bold">🛡️ ADMIN:</span> Manager controls, no deletion</div>
                                                      <div className="mb-1"><span className="text-zinc-200 font-bold">⚡ MEMBER:</span> Task deployment & execution</div>
                                                      <div className="mb-1"><span className="text-blue-400 font-bold">👁️ VIEWER:</span> Read-only access & comments</div>
                                                      <div><span className="text-zinc-500 font-bold">👤 GUEST:</span> Restricted view & comments</div>
                                                    </div>
                                                  </div>
                                                </div>
                                                <select
                                                  id={`role-select-${member.id}`}
                                                  value={member.role}
                                                  onChange={async (e) => {
                                                    const newRole = e.target.value
                                                    if (newRole === member.role) return
                                                    playBlip()
                                                    const { error } = await supabase
                                                      .from('goal_members')
                                                      .update({ role: newRole })
                                                      .eq('id', member.member_row_id)
                                                    if (error) {
                                                      showToast(isRTL ? 'فشل تحديث الدور' : 'FAILED TO UPDATE ROLE', 'warning')
                                                      playError()
                                                    } else {
                                                      showToast(isRTL ? 'تم تحديث الدور بنجاح!' : `ROLE UPDATED TO ${newRole.toUpperCase()}`, 'success')
                                                      playSuccess()
                                                      await fetchMission()
                                                    }
                                                  }}
                                                  className="w-full bg-zinc-900 border border-white/10 text-zinc-300 py-1.5 px-2.5 rounded-md text-xs outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 cursor-pointer font-space transition-all"
                                                >
                                                  <option value="admin">ADMIN</option>
                                                  <option value="member">MEMBER</option>
                                                  <option value="viewer">VIEWER</option>
                                                  <option value="guest">GUEST</option>
                                                </select>
                                              </div>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                              */}

                              {/* SECTION 4: SQUAD RULES (Admins only) */}
                              {isAdmin && (
                                <div className="space-y-4">
                                  <h4 className="text-[10px] font-black tracking-[0.3em] uppercase text-zinc-500 border-b border-white/5 pb-1">
                                    {/* {isRTL ? 'قواعد الفريق // RULES' : 'SQUAD RULES'} */}
                                    {isRTL ? 'قواعد الفريق - القوانين' : 'Squad Rules'}
                                  </h4>
                                  <div className="space-y-3 p-4 border border-white/5 bg-black/40 rounded-md">
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
                                    <div className="mt-3 pt-3 border-t border-white/5 space-y-1 text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                                      {/* <div className="text-zinc-400 font-bold">SYSTEM ROLE POLICIES // ضوابط الأدوار:</div> */}
                                      <div className="text-zinc-400 font-bold">Role Details</div>
                                      <div>• {isRTL ? 'الضيف (Guest) تنتهي صلاحيته بعد 7 أيام' : 'Guest access expires automatically after 7 days'}</div>
                                      <div>• {isRTL ? 'المشاهد والضيف لا يمكنهم تعديل أو نقل المهام' : 'Viewer & Guest cannot add, complete, or move tasks'}</div>
                                      <div>• {isRTL ? 'المشرفون (Admin) لا يمكنهم حذف الفريق' : 'Admins cannot terminate the squad'}</div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* SECTION 5: LEAVE SQUAD ACTION (Regular members / Co-Admins) */}
                              {!isOwner && (
                                <div className="pt-6 border-t border-white/5">
                                  <button
                                    onClick={leaveSquad}
                                    className="w-full py-3 border border-red-500/40 hover:border-red-400 bg-red-500/5 hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded-md font-space font-black text-xs uppercase tracking-widest cursor-pointer transition-all hover:scale-[1.02]"
                                  >
                                    {/* {isRTL ? '✗ مغادرة الفريق' : '✗ LEAVE SQUAD'} */}
                                    {isRTL ? '✗ مغادرة الفريق' : '✗ Leave Squad'}
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
      {/* ORIGINAL SHARE MODAL COMMENTED OUT
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
              className="bg-white/60 dark:bg-black/40 backdrop-blur-3xl border border-black/5 dark:border-white/5 border rounded-md p-6 max-w-md w-full relative overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.15)] space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-0 inset-x-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, #22d3ee, transparent)` }} />

              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <div>
                  <h3 className="font-space text-base font-black tracking-widest uppercase text-white flex items-center gap-2">
                    <Share2 className="w-[16px] h-[16px] text-cyan-400" />
                    {isRTL ? 'مشاركة الهدف' : 'Share Goal'}
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

              <div className="space-y-5 relative">
                {isGeneratingCard && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/60 dark:bg-black/40 backdrop-blur-3xl rounded-md border border-black/5 dark:border-white/5">
                    <div className="relative w-12 h-12">
                      <div className="absolute inset-0 rounded-full border-t-2 border-l-2 border-transparent animate-spin" style={{ borderTopColor: missionColor, borderLeftColor: missionColor, filter: `drop-shadow(0 0 6px ${missionColor})` }} />
                      <div className="absolute inset-2 rounded-full border-b-2 border-r-2 border-transparent animate-spin" style={{ borderBottomColor: missionColor, borderRightColor: missionColor, opacity: 0.5, animationDirection: 'reverse' }} />
                    </div>
                    <span className="font-space text-[9px] tracking-[0.3em] uppercase animate-pulse" style={{ color: missionColor }}>
                      {isRTL ? 'جارٍ توليد الكارت...' : 'Generating card...'}
                    </span>
                  </div>
                )}

                {mission?.metadata?.type === 'squad' && (
                  <div className="border border-white/5 bg-zinc-900/20 p-4 rounded-md space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] text-zinc-500 font-medium">Invitation Link</span>
                      <span className="font-mono text-[8px] bg-red-950/20 border border-red-500/20 text-red-400 px-1.5 py-0.5 rounded-md">Private</span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                      <span className="text-[10px] font-black text-zinc-400">
                        {isRTL ? 'دعوة كـ:' : 'Invite as:'}
                      </span>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as any)}
                        className="bg-zinc-900 border border-white/10 text-zinc-300 py-1 px-2.5 rounded text-[10px] outline-none focus:border-cyan-500/50 cursor-pointer font-space"
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                        <option value="guest">Guest</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}/goals/squad?join=${mission.metadata?.invite_code || ''}&role=${inviteRole}`}
                        className="flex-grow bg-zinc-900/60 border border-white/5 py-2 px-3 rounded-md text-[10px] font-mono text-zinc-400 outline-none select-all focus:border-cyan-500/30"
                      />
                      <button
                        onClick={() => {
                          playBlip()
                          const inviteUrl = `${window.location.origin}/goals/squad?join=${mission.metadata?.invite_code || ''}&role=${inviteRole}`
                          navigator.clipboard.writeText(inviteUrl)
                          setCopiedRow('invite')
                          setTimeout(() => setCopiedRow(null), 2000)
                          showToast(isRTL ? 'تم نسخ رابط الدعوة!' : 'Squad invite URL copied', 'success')
                          playSuccess()
                        }}
                        className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-[10px] font-mono font-black rounded-md transition-all shrink-0 cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.2)] hover:scale-105"
                      >
                        {copiedRow === 'invite' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="border border-white/5 bg-zinc-900/20 p-4 rounded-md space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] text-zinc-500 font-medium">Public View Link</span>
                    <span className="font-mono text-[8px] bg-cyan-950/20 border border-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-md">Public</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/goals/public/${id}`}
                      className="flex-grow bg-zinc-900/60 border border-white/5 py-2 px-3 rounded-md text-[10px] font-mono text-zinc-400 outline-none select-all focus:border-cyan-500/30"
                    />
                    <button
                      onClick={async () => {
                        playBlip()
                        const publicUrl = `${window.location.origin}/goals/public/${id}`
                        navigator.clipboard.writeText(publicUrl)
                        setCopiedRow('public')
                        setTimeout(() => setCopiedRow(null), 2000)
                        showToast(isRTL ? 'تم نسخ الرابط العام!' : 'Public view link copied', 'success')
                        playSuccess()

                        const currentMetadata = mission?.metadata || {}
                        if (currentMetadata.public_share !== 'true' && currentMetadata.public_share !== true) {
                          const newMetadata = { ...currentMetadata, public_share: true }
                          setMission((prev: any) => {
                            if (!prev) return prev
                            return { ...prev, metadata: newMetadata }
                          })
                          const { error } = await supabase
                            .from('goals')
                            .update({ metadata: newMetadata })
                            .eq('id', id)
                          if (error) {
                            console.error("Error enabling public share:", error)
                          }
                        }
                      }}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-[10px] font-mono font-black rounded-md transition-all shrink-0 cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.2)] hover:scale-105"
                    >
                      {copiedRow === 'public' ? 'COPIED' : 'COPY'}
                    </button>
                  </div>
                </div>

                <div className="border border-white/5 bg-zinc-900/20 p-4 rounded-md space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] text-zinc-500 tracking-widest uppercase">ACHIEVEMENT_STORY_CARD // STORY_EXPORT</span>
                    <span className="font-mono text-[8px] bg-amber-950/20 border border-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-md tracking-wider">FLEX</span>
                  </div>
                  <button
                    onClick={downloadCardImage}
                    disabled={isGeneratingCard}
                    className="w-full flex items-center justify-between p-3.5 border border-white/10 hover:border-cyan-500/50 bg-white/[0.02] hover:bg-white/5 rounded-md transition-all duration-300 group cursor-pointer text-left disabled:opacity-50"
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

              <div className="p-3 bg-zinc-900/20 rounded-md border border-white/5 text-center flex items-center justify-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-500"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="font-mono text-[8px] tracking-[0.25em] text-emerald-400">
                  Ready to Share
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      */}
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
              className="bg-white/60 dark:bg-[#09090b]/80 backdrop-blur-3xl border border-white/10 rounded-2xl p-6 max-w-md w-full relative overflow-hidden shadow-2xl space-y-6"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-start pb-3 border-b border-white/5">
                <div>
                  <h3 className="font-heading text-lg font-medium text-white flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-teal-400" />
                    {isRTL ? 'مشاركة الهدف' : 'Share Goal'}
                  </h3>
                  <p className="text-xs text-white/50 mt-1">
                    {isRTL ? 'إعدادات الوصول والمشاركة للهدف' : 'Access and sharing settings for this goal'}
                  </p>
                </div>
                <button
                  onClick={() => { playBlip(); setShowShareModal(false); }}
                  className="text-zinc-500 hover:text-white transition-all cursor-pointer bg-transparent border-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Link Input Row */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-white/40 block">
                  {isRTL ? 'رابط المشاركة' : 'Invite Link'}
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/goals/public/${id}` : ''}
                    className="flex-grow bg-white/5 border border-white/10 py-2 px-3 rounded-xl text-xs text-zinc-300 outline-none select-all focus:border-teal-500/30"
                  />
                  <button
                    onClick={() => {
                      playBlip()
                      const inviteUrl = `${window.location.origin}/goals/public/${id}`
                      navigator.clipboard.writeText(inviteUrl)
                      setCopiedRow('invite')
                      setTimeout(() => setCopiedRow(null), 2000)
                      // showToast(isRTL ? 'تم نسخ الرابط!' : 'INVITE LINK COPIED', 'success')
                      showToast(isRTL ? 'تم نسخ الرابط!' : 'Invite link copied', 'success')
                      playSuccess()
                    }}
                    className="shrink-0 h-9 px-4 bg-teal-500 text-black text-xs font-semibold rounded-xl transition-all duration-150 active:scale-[0.97]"
                  >
                    {copiedRow === 'invite' ? (isRTL ? "تم النسخ ✓" : "Copied ✓") : (isRTL ? "نسخ" : "Copy")}
                  </button>
                </div>
              </div>

              {/* Google Sheets Style Access Control */}
              <div className="space-y-3">
                <span className="text-xs font-semibold text-white/40 block">
                  {isRTL ? 'الوصول العام' : 'General Access'}
                </span>
                
                <div className="space-y-2.5">
                  <label className="flex items-start gap-3 p-3.5 bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:bg-white/10 transition-all duration-150">
                    <input
                      type="radio"
                      name="sharing_mode"
                      checked={mission?.is_public === true && mission?.requires_approval === false}
                      onChange={async () => {
                        setMission((prev: any) => ({ ...prev, is_public: true, requires_approval: false }));
                        await supabase
                          .from('goals')
                          .update({ is_public: true, requires_approval: false })
                          .eq('id', id);
                        showToast(isRTL ? 'تم التحديث: انضمام مباشر' : 'Updated: Anyone can join', 'success');
                      }}
                      className="mt-1 accent-orange-500 w-4 h-4 shrink-0"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-white block">
                        {isRTL ? 'أي شخص عنده الرابط' : 'Anyone with the link'}
                      </span>
                      <span className="text-xs text-white/50 block mt-0.5 leading-tight">
                        {isRTL ? 'ينضم تلقائياً كعضو' : 'Joins automatically as a member'}
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3.5 bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:bg-white/10 transition-all duration-150">
                    <input
                      type="radio"
                      name="sharing_mode"
                      checked={mission?.requires_approval !== false}
                      onChange={async () => {
                        setMission((prev: any) => ({ ...prev, is_public: true, requires_approval: true }));
                        await supabase
                          .from('goals')
                          .update({ is_public: true, requires_approval: true })
                          .eq('id', id);
                        showToast(isRTL ? 'تم التحديث: يتطلب الموافقة' : 'Updated: Requires approval', 'success');
                      }}
                      className="mt-1 accent-orange-500 w-4 h-4 shrink-0"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-white block">
                        {isRTL ? 'يحتاج موافقتي' : 'Requires approval'}
                      </span>
                      <span className="text-xs text-white/50 block mt-0.5 leading-tight">
                        {isRTL ? 'بتوافق على كل طلب انضمام' : 'You approve each join request'}
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Status Footer */}
              <div className="p-3 bg-zinc-900/20 rounded-xl border border-white/5 text-center flex items-center justify-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-500"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-medium text-emerald-400">
                  {isRTL ? 'جاهز للمشاركة' : 'Ready to Share'}
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
          // cupId={typeof id === 'string' ? id : undefined}
          goalId={typeof id === 'string' ? id : undefined}
          squadMembers={squadMembers}
          isSquad={mission?.metadata?.type === 'squad'}
          missionOwnerId={mission?.user_id}
        />
      )}
      </div>
    </>
  )
}
