'use client'

import React, { useState, FormEvent, KeyboardEvent, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGrowth } from '@/context/GrowthContext'
import { createClient } from '@/lib/supabase'
import { usePomodoro } from '@/context/PomodoroContext'
import SmartTaskPlayer from './SmartTaskPlayer'
import { 
  X, ChevronDown, ChevronUp, Check, Calendar, Lock, Plus, 
  Trash2, Loader2, RefreshCw, FolderOpen, Paperclip, ExternalLink, 
  StickyNote, Link as LinkIcon, Smile, AtSign, Send, MessageSquare, Play, Pause,
  PlusSquare, Target, Circle, CheckCircle2, ListTodo, Video, Sparkles, Clock} from 'lucide-react'
import { NeonIcon } from './NeonIcon'
import { cn } from '@/lib/utils'
import TaskDrawerHeader from './task-drawer/TaskDrawerHeader'
import TaskDrawerMetadata from './task-drawer/TaskDrawerMetadata'
import TaskDrawerDescription from './task-drawer/TaskDrawerDescription'
import TaskDrawerChecklist from './task-drawer/TaskDrawerChecklist'
import TaskDrawerComments from './task-drawer/TaskDrawerComments'


interface TaskDrawerProps {
  task: any
  onClose: () => void
  isGuest: boolean
  themeColor: string
  onComplete: () => void
  onProgressUpdate?: (currentTime: number, duration: number) => void
  onUpdateTask: (taskId: string, updates: any) => Promise<void> | void
  // cupId?: string
  goalId?: string
  squadMembers?: any[]
  isSquad?: boolean
  missionOwnerId?: string | null
  onDelete?: () => void
}

const getYouTubeId = (urlOrId: string) => {
  if (!urlOrId) return ''
  // If it's already a clean 11-char ID, return it directly
  if (urlOrId.length === 11 && !urlOrId.includes('/') && !urlOrId.includes('?')) return urlOrId
  try {
    // Primary strategy: Use URL object to extract 'v' query parameter (handles playlist URLs robustly)
    const urlObj = new URL(urlOrId)
    const vParam = urlObj.searchParams.get('v')
    if (vParam && vParam.length === 11) return vParam
    // Handle youtu.be short links
    if (urlObj.hostname === 'youtu.be') {
      const pathId = urlObj.pathname.slice(1)
      if (pathId.length === 11) return pathId
    }
    // Handle /embed/ or /v/ paths
    const pathMatch = urlObj.pathname.match(/\/(embed|v)\/([a-zA-Z0-9_-]{11})/)
    if (pathMatch && pathMatch[2]) return pathMatch[2]
  } catch (_e) {
    // Fallback: legacy regex for non-standard inputs
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = urlOrId.match(regExp)
    return (match && match[2].length === 11) ? match[2] : urlOrId
  }
  return urlOrId
}

interface AiChecklistButtonProps {
  taskId: string
  finalVideoUrl: string
  canEdit: boolean
  isRTL: boolean
  themeColor: string
  onUpdateTask: (taskId: string, updates: any) => Promise<void> | void
  resolvedDuration: number
  taskTitle: string
  goalTitle: string
  hasAiChecklist: boolean
}

function AiChecklistButton({
  taskId,
  finalVideoUrl,
  canEdit,
  isRTL,
  themeColor,
  onUpdateTask,
  resolvedDuration,
  taskTitle,
  goalTitle,
  hasAiChecklist
}: AiChecklistButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)

  // Calculate dynamic countdown start time based on video duration
  const videoMinutes = resolvedDuration > 0 ? Math.floor(resolvedDuration / 60) : 0
  const baseSeconds = 15
  const variableSeconds = Math.floor(videoMinutes / 2)
  const countdownStart = Math.min(60, baseSeconds + variableSeconds)

  const [countdown, setCountdown] = useState(countdownStart)
  // Commented out count-up timer state to respect safety rules:
  // const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null)

  // Load active cooldown on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const storedCooldown = localStorage.getItem(`ai_cooldown_${taskId}`)
    if (storedCooldown) {
      const remaining = Math.max(0, Math.ceil((parseInt(storedCooldown, 10) - Date.now()) / 1000))
      if (remaining > 0) {
        setCooldownRemaining(remaining)
      }
    }
  }, [taskId])

  // Countdown timer loop
  useEffect(() => {
    if (cooldownRemaining <= 0) return
    const interval = setInterval(() => {
      setCooldownRemaining(prev => {
        const next = prev - 1
        if (next <= 0) {
          clearInterval(interval)
          return 0
        }
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [cooldownRemaining])

  // Countdown timer loop when generating
  useEffect(() => {
    if (!isGenerating) {
      setCountdown(countdownStart)
      return
    }
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isGenerating, countdownStart])

  // Commented out count-up timer loop to respect safety rules:
  // useEffect(() => {
  //   if (!isGenerating) {
  //     setElapsedSeconds(0)
  //     return
  //   }
  //   const interval = setInterval(() => {
  //     setElapsedSeconds(prev => prev + 1)
  //   }, 1000)
  //   return () => clearInterval(interval)
  // }, [isGenerating])

  const formatCooldownTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const formatCountdownVal = (seconds: number) => {
    return `00:${String(seconds).padStart(2, '0')}`
  }

  // Commented out old elapsed time formatter to respect safety rules:
  // const formatElapsedTime = (seconds: number) => {
  //   const mins = Math.floor(seconds / 60)
  //   const secs = seconds % 60
  //   return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  // }

  const handleGenerate = async () => {
    if (isGenerating || cooldownRemaining > 0 || !canEdit || !finalVideoUrl || hasAiChecklist) return
    setIsGenerating(true)
    setAiErrorMessage(null)

    try {
      const res = await fetch('/api/tasks/ai-checklist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskId: taskId,
          youtubeUrl: finalVideoUrl,
          taskTitle: taskTitle,
          goalTitle: goalTitle,
          language: isRTL ? 'ar' : 'en'
        })
      })

      const data = await res.json()
      if (res.status === 429) {
        const seconds = data.remainingSeconds || 15 * 60
        setCooldownRemaining(seconds)
        if (typeof window !== 'undefined') {
          localStorage.setItem(`ai_cooldown_${taskId}`, String(Date.now() + seconds * 1000))
        }
        setAiErrorMessage(data.message)
      } else if (!res.ok) {
        setAiErrorMessage(data.error || 'Failed to generate checklist')
      } else {
        const supabase = createClient()
        const { data: updatedTask } = await supabase
          .from('tasks')
          .select('metadata')
          .eq('id', taskId)
          .single()
        
        if (updatedTask) {
          await onUpdateTask(taskId, { metadata: updatedTask.metadata })
          const seconds = 15 * 60
          setCooldownRemaining(seconds)
          if (typeof window !== 'undefined') {
            localStorage.setItem(`ai_cooldown_${taskId}`, String(Date.now() + seconds * 1000))
          }
        }
      }
    } catch (err) {
      setAiErrorMessage(isRTL ? 'حدث خطأ في الاتصال بالخادم' : 'Server communication error')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-1 mt-2">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={isGenerating || cooldownRemaining > 0 || hasAiChecklist}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-2 px-3.5 rounded-xl font-medium text-xs transition-all duration-300 backdrop-blur-sm",
          (isGenerating || hasAiChecklist)
            ? "bg-zinc-800/80 text-[var(--text-muted)] dark:text-zinc-500 cursor-not-allowed border border-[var(--border)] dark:border-white/5 animate-pulse"
            : cooldownRemaining > 0
              ? "bg-zinc-900/40 text-[var(--text-muted)] dark:text-zinc-500 border border-[var(--border)] dark:border-white/5 cursor-not-allowed opacity-40"
              : "bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-teal-950/40 border border-indigo-500/20 hover:border-teal-500/40 text-indigo-200 hover:text-teal-200 shadow-[0_0_15px_rgba(99,102,241,0.05)] hover:shadow-[0_0_20px_rgba(20,184,166,0.15)] group cursor-pointer"
        )}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--text-secondary)] dark:text-zinc-400" />
            <span className="animate-pulse">
              {isRTL 
                ? `جاري استخراج المنهج الذكي... ${formatCountdownVal(countdown)}` 
                : `Extracting smart curriculum... ${formatCountdownVal(countdown)}`}
            </span>
          </>
        ) : hasAiChecklist ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span>{isRTL ? 'تم إنشاء المنهج الذكي بالفعل' : 'Smart Curriculum Active'}</span>
          </>
        ) : cooldownRemaining > 0 ? (
          <>
            <Clock className="w-3.5 h-3.5 text-[var(--text-muted)] dark:text-zinc-500" />
            <span>
              {isRTL 
                ? `فترة الانتظار للذكاء الاصطناعي (${formatCooldownTime(cooldownRemaining)})` 
                : `AI Cooldown (${formatCooldownTime(cooldownRemaining)})`}
            </span>
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5 animate-pulse group-hover:scale-110 text-indigo-400 group-hover:text-teal-400 transition-transform duration-300" />
            <span>{isRTL ? 'إنشاء قائمة المهام بالذكاء الاصطناعي' : 'Generate AI Checklist'}</span>
          </>
        )}
      </button>
      {aiErrorMessage && (
        <p className="text-[10px] text-red-500 mt-1 font-mono tracking-wide bg-red-500/5 px-2 py-1 rounded border border-red-500/10">
          {aiErrorMessage}
        </p>
      )}
    </div>
  )
}

export default function TaskDrawer({
  task,
  onClose,
  isGuest,
  themeColor,
  onComplete,
  onProgressUpdate,
  onUpdateTask,
  // cupId,
  goalId,
  squadMembers = [],
  isSquad = false,
  missionOwnerId = null,
  onDelete
}: TaskDrawerProps) {
  // const { isRTL, t, addXp, profile, setIsTaskDrawerOpen } = useGrowth()
  const { isRTL, t, addXp, profile, setIsTaskDrawerOpen, refreshProfile } = useGrowth()
  const { startFocus, startTimer, isActive, isPaused, taskId: activePomodoroTaskId, pause, resume, updateConfig, breakDuration } = usePomodoro()
  const isCurrentTaskFocus = activePomodoroTaskId === task.id
  const isCurrentFocusActive = isCurrentTaskFocus && isActive && !isPaused
 
  // const isGoalOwner = !!(profile?.id && missionOwnerId && profile.id === missionOwnerId)
  // const isAssignee = !!(profile?.id && task?.assigned_to && profile.id === task.assigned_to)
  // const canAddAttachment = !isSquad || isGoalOwner || isAssignee

  const [isExpanded, setIsExpanded] = useState(false)
  const myMemberRow = isSquad ? squadMembers?.find((m: any) => m.id === profile?.id || m.user_id === profile?.id) : null
  const isOwner = isSquad ? !!(profile?.id && missionOwnerId && profile.id === missionOwnerId) : true
  const isAdmin = isSquad ? !!(myMemberRow?.role === 'admin' || myMemberRow?.role === 'co-admin') : false
  const currentUser = profile || { id: null }
  const canEdit = isOwner || isAdmin || (currentUser.id === task.assigned_to || currentUser.id === task.assignee_id)
  const canAddAttachment = canEdit

  useEffect(() => {
    setIsTaskDrawerOpen(true)
    return () => {
      setIsTaskDrawerOpen(false)
    }
  }, [setIsTaskDrawerOpen])

  const updateTask = async (taskId: string, updates: any) => {
    await onUpdateTask(taskId, updates)
    
    // Send notification to the assignee if they are not the current user
    const assigneeId = task.assigned_to
    if (assigneeId && assigneeId !== currentUserId) {
      let actionTextEn = "updated the task"
      let actionTextAr = "تحديث المهمة"
      
      if ('title' in updates) {
        actionTextEn = `renamed the task to "${updates.title}"`
        actionTextAr = `تغيير اسم المهمة إلى "${updates.title}"`
      } else if ('description' in updates) {
        actionTextEn = "updated the task description"
        actionTextAr = "تحديث وصف المهمة"
      } else if ('metadata' in updates) {
        const oldMeta = task.metadata || {}
        const newMeta = updates.metadata || {}
        
        if (JSON.stringify(oldMeta.subtasks) !== JSON.stringify(newMeta.subtasks)) {
          actionTextEn = "updated the checklist"
          actionTextAr = "تحديث قائمة المهام الفرعية"
        } else if (JSON.stringify(oldMeta.notes) !== JSON.stringify(newMeta.notes)) {
          if ((oldMeta.notes?.length || 0) < (newMeta.notes?.length || 0)) {
            actionTextEn = "added a new comment"
            actionTextAr = "إضافة تعليق جديد"
          } else {
            actionTextEn = "deleted a comment"
            actionTextAr = "حذف تعليق"
          }
        } else if (JSON.stringify(oldMeta.attachments) !== JSON.stringify(newMeta.attachments)) {
          actionTextEn = "updated attachments"
          actionTextAr = "تحديث المرفقات"
        }
      }
      
      const senderName = profile?.full_name || 'Operator'
      const notifTitle = isRTL
        ? `⚙️ ${senderName} قام بـ ${actionTextAr}`
        : `⚙️ ${senderName} ${actionTextEn}`
      const notifContent = isRTL
        ? `${senderName} قام بـ ${actionTextAr} في مهمتك المعينة "${task.title}"`
        : `${senderName} ${actionTextEn} on your assigned task "${task.title}"`
        
      await sendNotification(assigneeId, 'reaction', notifTitle, notifContent)
    }
  }

  const formatNoteContent = (text: string) => {
    if (!text) return ''
    let elements: React.ReactNode[] = [text]

    if (squadMembers && squadMembers.length > 0) {
      squadMembers.forEach(member => {
        const name = member.full_name || member.user_name
        if (!name) return

        const tag = `@${name}`
        const nextElements: React.ReactNode[] = []

        elements.forEach(el => {
          if (typeof el !== 'string') {
            nextElements.push(el)
            return
          }

          const parts = el.split(new RegExp(`(${tag})`, 'g'))
          parts.forEach((part, idx) => {
            if (part === tag) {
              nextElements.push(
                <span 
                  key={`${member.id}-${idx}`}
                  onClick={() => {
                    // Commented out per safety rules:
                    // alert(isRTL ? `الملف الشخصي: ${name} • الرتبة: ${member.rank || 'عضو'}` : `Member Profile: ${name} • Rank: ${member.rank || 'ROOKIE'}`)
                    alert(isRTL ? `الملف الشخصي: ${name} • الرتبة: ${member.rank || 'عضو'}` : `Member Profile: ${name} • Rank: ${member.rank || 'Rookie'}`)
                  }}
                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 font-bold border border-blue-500/25 shadow-[0_0_8px_rgba(59,130,246,0.2)] transition-all cursor-pointer mx-0.5 relative z-10 font-space text-[11px]"
                  title={isRTL ? `عرض الملف الشخصي لـ ${name}` : `View ${name}'s profile`}
                >
                  {part}
                </span>
              )
            } else if (part) {
              nextElements.push(part)
            }
          })
        })
        elements = nextElements
      })
    }

    // Fallback formatting for any other @mentions
    const finalElements: React.ReactNode[] = []
    elements.forEach(el => {
      if (typeof el !== 'string') {
        finalElements.push(el)
        return
      }

      const parts = el.split(/(@\S+)/g)
      parts.forEach((part, idx) => {
        if (part.startsWith('@')) {
          finalElements.push(
            <span 
              key={idx}
              className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20 shadow-[0_0_8px_rgba(6,182,212,0.2)] mx-0.5 font-space text-[11px]"
            >
              {part}
            </span>
          )
        } else if (part) {
          finalElements.push(part)
        }
      })
    })

    return finalElements
  }
  // const [isAnimationComplete, setIsAnimationComplete] = useState(false)
  // useEffect(() => {
  //   setIsAnimationComplete(false)
  // }, [task.id])

  const [taskTitle, setTaskTitle] = useState(task.title || '')
  const [goals, setGoals] = useState<any[]>([])
  useEffect(() => {
    async function fetchGoals() {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (user) {
        const { data } = await sb
          .from('goals')
          .select('id, title')
          .eq('user_id', user.id)
        if (data) setGoals(data)
      }
    }
    fetchGoals()
  }, [])
  useEffect(() => {
    setTaskTitle(task.title || '')
  }, [task.title, task.id])

  // --- DATE STATE ---
  const [startDate, setStartDate] = useState<string>(task.metadata?.startDate || '')
  const [endDate, setEndDate] = useState<string>(task.metadata?.endDate || '')

  useEffect(() => {
    setStartDate(task.metadata?.startDate || '')
    setEndDate(task.metadata?.endDate || '')
  }, [task.id, task.metadata?.startDate, task.metadata?.endDate])

  // --- MANUAL LINK STATE ---
  const [showManualLink, setShowManualLink] = useState(false)
  const [manualLinkName, setManualLinkName] = useState('')
  const [manualLinkUrl, setManualLinkUrl] = useState('')
  const [isAddingLink, setIsAddingLink] = useState(false)
  const [isDriveConnected, setIsDriveConnected] = useState(false)
  const [isAttachOpen, setIsAttachOpen] = useState(false)
  const [youtubeUrlInput, setYoutubeUrlInput] = useState('')
  const [showYoutubeInput, setShowYoutubeInput] = useState(false)
  
  // AI Checklist States (Commented out to prevent unnecessary re-renders; logic moved to isolated AiChecklistButton component)
  // const [isGenerating, setIsGenerating] = useState(false)
  // const [cooldownRemaining, setCooldownRemaining] = useState(0)
  // const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null)

  // useEffect(() => {
  //   if (typeof window === 'undefined') return
  //   const token = localStorage.getItem('gd_access_token')
  //   const expiry = parseInt(localStorage.getItem('gd_expires_at') || '0', 10)
  //   if (token && Date.now() < expiry) setIsDriveConnected(true)
  // }, [])
  useEffect(() => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('gd_access_token')
    const expiry = parseInt(localStorage.getItem('gd_expires_at') || '0', 10)
    if (token && Date.now() < expiry) {
      setIsDriveConnected(true)
    } else if (profile?.drive_connected && profile.id !== 'guest') {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
      const google = (window as any).google
      if (clientId && google?.accounts?.oauth2) {
        try {
          const tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/drive.readonly',
            callback: (response: any) => {
              if (response.error !== undefined) {
                console.error("Silent OAuth failed:", response.error)
                const supabaseClient = createClient()
                supabaseClient.from('profiles').update({ drive_connected: false }).eq('id', profile.id).then(() => {
                  refreshProfile()
                })
                return
              }
              cacheToken(response.access_token)
            },
            error_callback: () => {
              const supabaseClient = createClient()
              supabaseClient.from('profiles').update({ drive_connected: false }).eq('id', profile.id).then(() => {
                refreshProfile()
              })
            }
          })
          tokenClient.requestAccessToken({ prompt: 'none' })
        } catch (e) {
          console.error("Silent OAuth initialization error:", e)
        }
      }
    }
  }, [profile?.drive_connected, profile?.id])

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  useEffect(() => {
    async function getUserId() {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
    }
    getUserId()
  }, [])


  // --- NOTIFICATION SENDER ---
  const sendNotification = useCallback(async (
    targetUserId: string,
    type: 'mention' | 'reaction',
    title: string,
    contentText: string
  ) => {
    if (!targetUserId) return
    try {
      const response = await fetch('/api/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUserId,
          type,
          title,
          contentText,
          taskId: task?.id,
          taskTitle: task?.title,
          senderId: currentUserId,
          senderName: profile?.full_name || 'Operator',
          // cupId: task?.cup_id || cupId,
          goalId: task?.goal_id || goalId,
          isSquad: isSquad || false
        })
      })

      if (!response.ok) {
        throw new Error(`Notification API failed with status ${response.status}`)
      }
      
      // Instantly broadcast the notification ping to the target user
      const supabase = createClient()
      const notifChannel = supabase.channel(`inbox-channel:${targetUserId}`)
      notifChannel.subscribe(async (status: any) => {
        if (status === 'SUBSCRIBED') {
          await notifChannel.send({
            type: 'broadcast',
            event: 'new-notification',
            payload: {
              senderId: currentUserId,
              title,
              content: contentText
            }
          })
          // Wait 2 seconds to guarantee delivery over WebSocket before removing
          setTimeout(() => {
            supabase.removeChannel(notifChannel)
          }, 2000)
        }
      })
    } catch (err) {
      console.error('Failed to send notification:', err)
    }
  }, [currentUserId, profile?.full_name, task?.id, task?.title, goalId, isSquad])



  // Supabase Sync description state
  const [description, setDescription] = useState(task.description || '')
  useEffect(() => {
    setDescription(task.description || '')
  }, [task.description, task.id])

  // Google API Loading States
  const [gapiLoaded, setGapiLoaded] = useState(false)
  const [pickerApiLoaded, setPickerApiLoaded] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const existingScript = document.getElementById('google-api-script')
    if (existingScript) {
      if ((window as any).gapi) {
        setGapiLoaded(true)
        if ((window as any).google?.picker) {
          setPickerApiLoaded(true)
        } else {
          loadPicker()
        }
      }
      return
    }

    const script = document.createElement('script')
    script.src = 'https://apis.google.com/js/api.js'
    script.id = 'google-api-script'
    script.async = true
    script.defer = true
    script.onload = () => {
      setGapiLoaded(true)
      loadPicker()
    }
    script.onerror = () => {
      console.error('Failed to load Google API script')
    }
    document.body.appendChild(script)

    const existingGsiScript = document.getElementById('google-gsi-script')
    if (!existingGsiScript) {
      const gsiScript = document.createElement('script')
      gsiScript.src = 'https://accounts.google.com/gsi/client'
      gsiScript.id = 'google-gsi-script'
      gsiScript.async = true
      gsiScript.defer = true
      document.body.appendChild(gsiScript)
    }

    function loadPicker() {
      const gapi = (window as any).gapi
      if (gapi) {
        gapi.load('client:picker', () => {
          setPickerApiLoaded(true)
        })
      }
    }
  }, [])

  const DRIVE_TOKEN_KEY = 'gd_access_token'
  const DRIVE_EXPIRY_KEY = 'gd_expires_at'

  const getCachedToken = (): string | null => {
    if (typeof window === 'undefined') return null
    const token = localStorage.getItem(DRIVE_TOKEN_KEY)
    const expiry = parseInt(localStorage.getItem(DRIVE_EXPIRY_KEY) || '0', 10)
    if (token && Date.now() < expiry) return token
    return null
  }

  const cacheToken = (token: string) => {
    localStorage.setItem(DRIVE_TOKEN_KEY, token)
    localStorage.setItem(DRIVE_EXPIRY_KEY, String(Date.now() + 3600 * 1000))
    setIsDriveConnected(true)
  }

  const handleGoogleDrivePicker = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY

    if (!clientId || !apiKey) {
      console.error("Missing Google Client ID or API Key in environment variables.")
      alert(t('googleApiNotConfigured'))
      return
    }

    const gapi = (window as any).gapi
    const google = (window as any).google

    if (!gapi || !google || !google.picker) {
      console.error("Google API or Picker not fully loaded.")
      return
    }

    const cached = getCachedToken()
    if (cached) {
      createPicker(cached)
      return
    }

    const tryAuth = (prompt: string, fallback?: () => void) => {
      try {
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive.readonly',
          callback: (response: any) => {
            if (response.error !== undefined) {
              if (fallback) { fallback(); return }
              console.error("OAuth error:", response.error)
              return
            }
            cacheToken(response.access_token)
            
            if (profile && profile.id !== 'guest') {
              const supabaseClient = createClient()
              supabaseClient.from('profiles').update({ drive_connected: true }).eq('id', profile.id).then(() => {
                refreshProfile()
              })
            }
            
            createPicker(response.access_token)
          },
          error_callback: (err: any) => {
            if (fallback) { fallback(); return }
            console.error("Silent OAuth failed:", err)
          }
        })
        tokenClient.requestAccessToken({ prompt })
      } catch (e) {
        if (fallback) { fallback(); return }
        console.error("OAuth client initialization failed", e)
        createPicker(null)
      }
    }

    // if (profile?.drive_connected) {
    //   tryAuth('none', () => tryAuth('select_account'))
    // } else {
    //   tryAuth('select_account')
    // }
    if (profile?.drive_connected) {
      tryAuth('none', () => tryAuth('consent'))
    } else {
      tryAuth('consent')
    }

    function createPicker(accessToken: string | null) {
      const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
      view.setSelectFolderEnabled(false)
      view.setIncludeFolders(true)

      const pickerBuilder = new google.picker.PickerBuilder()
        .addView(view)
        .setDeveloperKey(apiKey)
        .setCallback(async (data: any) => {
          if (data.action === google.picker.Action.PICKED) {
            const document = data.docs[0]
            const fileId = document[google.picker.Document.ID]
            const fileName = document[google.picker.Document.NAME]
            const fileUrl = document[google.picker.Document.URL]
            const mimeType = document.mimeType || ''

            let fileType = 'link'
            if (mimeType === 'application/pdf') fileType = 'pdf'
            else if (mimeType.includes('spreadsheet')) fileType = 'excel'
            else if (mimeType.includes('document')) fileType = 'doc'
            else if (mimeType.includes('image')) fileType = 'image'

            const attachments = task.metadata?.attachments || []
            const newAttachment = {
              id: fileId,
              name: fileName,
              url: fileUrl,
              type: fileType,
              uploaded_by: {
                id: profile?.id || 'unknown',
                name: profile?.full_name || 'Operator',
                avatar_url: profile?.avatar_url || '/avatars/omar.svg'
              }
            }
            const updatedAttachments = [newAttachment, ...attachments]
            const updatedMetadata = { ...task.metadata, attachments: updatedAttachments }
            await updateTask(task.id, { metadata: updatedMetadata })
          }
        })

      if (accessToken) pickerBuilder.setOAuthToken(accessToken)

      const picker = pickerBuilder.build()
      picker.setVisible(true)
    }
  }

  const handleDisconnectDrive = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(isRTL ? 'هل تريد إلغاء ربط جوجل درايف؟' : 'Do you want to unlink Google Drive?')) {
      localStorage.removeItem('gd_access_token')
      localStorage.removeItem('gd_expires_at')
      setIsDriveConnected(false)
      if (profile && profile.id !== 'guest') {
        const sb = createClient()
        await sb.from('profiles').update({ drive_connected: false }).eq('id', profile.id)
        await refreshProfile()
      }
    }
  }

  const detectFileType = (url: string): string => {
    const lower = url.toLowerCase().split('?')[0]
    if (/\.(pdf)$/.test(lower)) return 'pdf'
    if (/\.(xlsx?|csv|ods)$/.test(lower)) return 'excel'
    if (/\.(jpe?g|png|gif|webp|svg)$/.test(lower)) return 'image'
    if (/\.(docx?|txt|md)$/.test(lower)) return 'doc'
    if (/\.(mp4|mov|webm)$/.test(lower)) return 'video'
    if (/\.(mp3|wav|ogg)$/.test(lower)) return 'audio'
    return 'link'
  }

  const handleAddManualLink = async () => {
    const name = manualLinkName.trim()
    const url = manualLinkUrl.trim()
    if (!name || !url) return
    setIsAddingLink(true)
    const fileType = detectFileType(url)
    const newAttachment = {
      id: `manual_${Date.now()}`,
      name,
      url,
      type: fileType,
      uploaded_by: {
        id: profile?.id || 'unknown',
        name: profile?.full_name || 'Operator',
        avatar_url: profile?.avatar_url || '/avatars/omar.svg'
      }
    }
    const attachments = task.metadata?.attachments || []
    const updatedAttachments = [newAttachment, ...attachments]
    const updatedMetadata = { ...task.metadata, attachments: updatedAttachments }
    await updateTask(task.id, { metadata: updatedMetadata })
    setManualLinkName('')
    setManualLinkUrl('')
    setShowManualLink(false)
    setIsAddingLink(false)
  }

  const handleAttachYoutubeVideo = async () => {
    const url = youtubeUrlInput.trim()
    if (!url) return
    const videoId = getYouTubeId(url)
    if (!videoId) {
      alert(isRTL ? 'رابط يوتيوب غير صالح' : 'Invalid YouTube URL')
      return
    }
    const updatedMetadata = {
      ...task.metadata,
      youtube_url: url
    }
    await updateTask(task.id, { metadata: updatedMetadata })
    setYoutubeUrlInput('')
    setShowYoutubeInput(false)
  }

  // Load active cooldown on mount (Commented out, logic moved to AiChecklistButton)
  // useEffect(() => {
  //   if (typeof window === 'undefined') return
  //   const storedCooldown = localStorage.getItem(`ai_cooldown_${task.id}`)
  //   if (storedCooldown) {
  //     const remaining = Math.max(0, Math.ceil((parseInt(storedCooldown, 10) - Date.now()) / 1000))
  //     if (remaining > 0) {
  //       setCooldownRemaining(remaining)
  //     }
  //   }
  // }, [task.id])

  // Countdown timer loop (Commented out, logic moved to AiChecklistButton)
  // useEffect(() => {
  //   if (cooldownRemaining <= 0) return
  //   const interval = setInterval(() => {
  //     setCooldownRemaining(prev => {
  //       const next = prev - 1
  //       if (next <= 0) {
  //         clearInterval(interval)
  //         return 0
  //       }
  //       return next
  //     })
  //   }, 1000)
  //   return () => clearInterval(interval)
  // }, [cooldownRemaining])

  // const formatCooldownTime = (seconds: number) => {
  //   const mins = Math.floor(seconds / 60)
  //   const secs = seconds % 60
  //   return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  // }

  // const handleGenerateAiChecklist = async () => {
  //   if (isGenerating || cooldownRemaining > 0 || !canEdit || !finalVideoUrl) return
  //   setIsGenerating(true)
  //   setAiErrorMessage(null)
  //   try {
  //     const res = await fetch('/api/tasks/ai-checklist', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json'
  //       },
  //       body: JSON.stringify({
  //         taskId: task.id,
  //         youtubeUrl: finalVideoUrl
  //       })
  //     })
  //     const data = await res.json()
  //     if (res.status === 429) {
  //       const seconds = data.remainingSeconds || 15 * 60
  //       setCooldownRemaining(seconds)
  //       if (typeof window !== 'undefined') {
  //         localStorage.setItem(`ai_cooldown_${task.id}`, String(Date.now() + seconds * 1000))
  //       }
  //       setAiErrorMessage(data.message)
  //     } else if (!res.ok) {
  //       setAiErrorMessage(data.error || 'Failed to generate checklist')
  //     } else {
  //       const supabase = createClient()
  //       const { data: updatedTask } = await supabase
  //         .from('tasks')
  //         .select('metadata')
  //         .eq('id', task.id)
  //         .single()
  //       if (updatedTask) {
  //         await onUpdateTask(task.id, { metadata: updatedTask.metadata })
  //         const seconds = 15 * 60
  //         setCooldownRemaining(seconds)
  //         if (typeof window !== 'undefined') {
  //           localStorage.setItem(`ai_cooldown_${task.id}`, String(Date.now() + seconds * 1000))
  //         }
  //       }
  //     }
  //   } catch (err) {
  //     setAiErrorMessage(isRTL ? 'حدث خطأ في الاتصال بالخادم' : 'Server communication error')
  //   } finally {
  //     setIsGenerating(false)
  //   }
  // }

  // --- REAL-TIME WORKSPACE PRESENCE FOR TASK DRAWER ---
  useEffect(() => {
    if (isGuest || !task?.id) return

    const supabase = createClient()
    const channel = supabase.channel('workspace', {
      config: {
        presence: {
          key: task.id
        }
      }
    })

    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      channel.subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            full_name: profile?.full_name || 'Anonymous',
            avatar_url: profile?.avatar_url || null,
            cursor_task_id: task.id,
            task_id: task.id,
            session_color: '#1D9E75'
          })
        }
      })
    }

    run()

    return () => {
      channel.untrack()
      supabase.removeChannel(channel)
    }
  }, [task?.id, isGuest])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    const handleCloseAll = () => {
      onClose()
    }
    window.addEventListener('keydown', handleKeyDown as any)
    window.addEventListener('close-all-modals', handleCloseAll)
    return () => {
      window.removeEventListener('keydown', handleKeyDown as any)
      window.removeEventListener('close-all-modals', handleCloseAll)
    }
  }, [onClose])

  if (!task) return null

  const notes = task.metadata?.notes || []
  const subtasks = task.metadata?.subtasks || []
  const [newSubtaskText, setNewSubtaskText] = useState('')

  const handleAddSubtask = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    if (!newSubtaskText.trim()) return
    const newSub = {
      id: `sub_${Date.now()}`,
      title: newSubtaskText.trim(),
      is_completed: false
    }
    const updatedSubtasks = [...subtasks, newSub]
    await updateTask(task.id, { metadata: { ...task.metadata, subtasks: updatedSubtasks } })
    setNewSubtaskText('')
  }

  const handleToggleSubtask = async (subId: string, currentStatus: boolean) => {
    const updatedSubtasks = subtasks.map((s: any) => s.id === subId ? { ...s, is_completed: !currentStatus } : s)
    await updateTask(task.id, { metadata: { ...task.metadata, subtasks: updatedSubtasks } })
  }

  const handleDeleteSubtask = async (subId: string) => {
    const updatedSubtasks = subtasks.filter((s: any) => s.id !== subId)
    await updateTask(task.id, { metadata: { ...task.metadata, subtasks: updatedSubtasks } })
  }

  const handleUpdateSubtask = async (subId: string, newTitle: string) => {
    const updatedSubtasks = subtasks.map((s: any) => s.id === subId ? { ...s, title: newTitle } : s)
    await updateTask(task.id, { metadata: { ...task.metadata, subtasks: updatedSubtasks } })
  }



  const handleDeleteNote = async (noteId: string, index: number) => {
    const updatedNotes = notes.filter((n: any, i: number) => n.id ? n.id !== noteId : i !== index)
    const updatedMetadata = { ...task.metadata, notes: updatedNotes }

    if (!isGuest) {
      try {
        const noteToDelete = notes[index]
        const supabase = createClient()
        const noteContent = typeof noteToDelete === 'string' ? noteToDelete : noteToDelete.content
        await supabase
          .from('notes')
          .delete()
          .eq('content', noteContent)
          .eq('task_id', task.id)
      } catch (err) {
        console.error('Error deleting note from global notes:', err)
      }
    }

    await updateTask(task.id, { metadata: updatedMetadata })
  }

  const handleToggleReaction = async (noteIdOrIndex: string | number, emoji: string) => {
    const userId = currentUserId || profile?.id
    if (!userId) return

    let noteAuthorId: string | null = null
    let noteAuthorName: string | null = null

    const updatedNotes = notes.map((note: any, idx: number) => {
      const isMatch = typeof noteIdOrIndex === 'string' 
        ? note.id === noteIdOrIndex 
        : idx === noteIdOrIndex

      if (isMatch) {
        noteAuthorId = note.user_id || null
        noteAuthorName = note.user_name || null
        const reactions = { ...(note.reactions || {}) }
        const userIds = [...(reactions[emoji] || [])]

        const alreadyReacted = userIds.includes(userId)
        if (alreadyReacted) {
          reactions[emoji] = userIds.filter((id: string) => id !== userId)
        } else {
          reactions[emoji] = [...userIds, userId]
        }
        
        if (reactions[emoji].length === 0) {
          delete reactions[emoji]
        }

        // Send notification on new reaction (not on un-react)
        if (!alreadyReacted && noteAuthorId && noteAuthorId !== userId) {
          const senderName = profile?.full_name || 'Operator'
          const notifTitle = isRTL
            ? `${emoji} ${senderName} تفاعل على تعليقك`
            : `${emoji} ${senderName} reacted to your comment`
          const notifContent = isRTL
            ? `${senderName} تفاعل بـ ${emoji} على تعليقك في مهمة "${task.title}"`
            : `${senderName} reacted with ${emoji} to your comment on task "${task.title}"`
          sendNotification(noteAuthorId, 'reaction', notifTitle, notifContent)
        }

        return { ...note, reactions }
      }
      return note
    })

    const updatedMetadata = { ...task.metadata, notes: updatedNotes }
    await updateTask(task.id, { metadata: updatedMetadata })
  }

  const handleCopyLink = () => {
    if (typeof window === 'undefined') return
    // const link = `${window.location.origin}/goals/squad/${task.cup_id}?task=${task.id}`
    const link = isSquad
      ? `${window.location.origin}/goals/squad/${task.goal_id}?task=${task.id}`
      : `${window.location.origin}/goals/${task.goal_id}?task=${task.id}`
    navigator.clipboard.writeText(link)
    alert(isRTL ? 'تم نسخ رابط المهمة!' : 'Task link copied to clipboard!')
  }

  // --- VIDEO PLAYER LOGIC & EXTRACTION (COMMENTED OUT LEGACY REACTPLAYER HELPERS) ---
  /*
  const videoUrl = task.metadata?.videoUrl || task.metadata?.mediaUrl || (() => {
    const attachments = task.metadata?.attachments || []
    const youtubeAttach = attachments.find((att: any) => 
      att.url && (att.url.includes('youtube.com') || att.url.includes('youtu.be') || att.url.includes('mp4'))
    )
    if (youtubeAttach) return youtubeAttach.url

    const descMatches = task.description?.match(/https?:\/\/[^\s]+/)
    if (descMatches) return descMatches[0]

    return ''
  })()

  const playerRef = useRef<any>(null)

  const handlePlayerReady = () => {
    if (typeof window !== 'undefined' && playerRef.current) {
      const saved = localStorage.getItem(`video_progress_${task.id}`)
      if (saved) {
        const savedSeconds = parseFloat(saved)
        if (savedSeconds > 0) {
          playerRef.current.seekTo(savedSeconds)
        }
      }
    }
  }

  const handlePlayerProgress = (state: { playedSeconds: number }) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`video_progress_${task.id}`, String(state.playedSeconds))
    }
  }
  */

  // --- RESTORED ORIGINAL VIDEO PLAYER LOGIC (REVERSED EXTRACTION NUKE) ---
  const resolvedVideoUrl = task.video_url || task.metadata?.videoUrl || task.metadata?.mediaUrl || task.metadata?.youtubeUrl || task.metadata?.youtube_url || (() => {
    const attachments = task.metadata?.attachments || []
    const youtubeAttach = attachments.find((att: any) => 
      att.url && (att.url.includes('youtube.com') || att.url.includes('youtu.be') || att.url.includes('mp4'))
    )
    if (youtubeAttach) return youtubeAttach.url

    const descMatches = task.description?.match(/https?:\/\/[^\s]+/)
    if (descMatches) return descMatches[0]

    return ''
  })()

  const finalVideoUrl = resolvedVideoUrl || task.video_id || ''
  const hasVideo = !!finalVideoUrl


  // Stored local video details
  const storedProgress = typeof window !== 'undefined' ? parseFloat(localStorage.getItem(`growth_hub_video_progress_${task.id}`) || '0') : 0
  const storedDuration = typeof window !== 'undefined' ? parseFloat(localStorage.getItem(`growth_hub_video_duration_${task.id}`) || '0') : 0
  const videoProgress = task.video_progress ?? storedProgress
  const videoDuration = task.video_duration ?? storedDuration

  const [ytDuration, setYtDuration] = useState<number>(0)

  useEffect(() => {
    let active = true
    setYtDuration(0)
    
    if (!finalVideoUrl) return

    // 1. Try parsing duration using Regex from description or title first (e.g. [15:00], 15min, 15m, 15 mins)
    const textToParse = `${task.title || ''} ${task.description || ''}`
    const durationRegexes = [
      /\[(\d+):00\]/, // matches [15:00]
      /\b(\d+)\s*(?:mins|minutes|min)\b/i, // matches 15 mins, 15min, etc.
      /\b(\d+)m\b/i // matches 15m
    ]
    
    let detectedMin = 0
    for (const regex of durationRegexes) {
      const match = textToParse.match(regex)
      if (match && match[1]) {
        detectedMin = parseInt(match[1], 10)
        break
      }
    }

    if (detectedMin > 0) {
      setYtDuration(detectedMin * 60)
      return
    }

    // 2. Fetch oEmbed metadata and try to extract title/description, parsing duration from there.
    const videoId = getYouTubeId(finalVideoUrl)
    if (videoId && videoId.length === 11) {
      const fetchOEmbed = async () => {
        try {
          const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
          if (!res.ok) return
          const data = await res.json()
          if (!active) return
          // Parse duration from oEmbed data (e.g., if title contains something like "[15 mins]")
          const oembedText = `${data.title || ''} ${data.author_name || ''}`
          for (const regex of durationRegexes) {
            const match = oembedText.match(regex)
            if (match && match[1]) {
              detectedMin = parseInt(match[1], 10)
              break
            }
          }
          if (detectedMin > 0) {
            setYtDuration(detectedMin * 60)
          }
        } catch (e) {
          console.error('Error fetching oEmbed:', e)
        }
      }
      fetchOEmbed()
    }

    return () => {
      active = false
    }
  }, [task.id, finalVideoUrl, task.title, task.description])

  const resolvedDuration = videoDuration > 0 ? videoDuration : ytDuration

  const formatVideoTime = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = Math.floor(secs % 60)
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${m}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-stretch justify-end p-0">
      {/* 1. Backdrop Overlay (with backdrop blur as requested) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 z-[9999] cursor-pointer backdrop-blur-md"
      />

      {/* 2. Sliding Drawer Content Container */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        /* Commented out original theme-unaware drawer background for safety rules
        className={cn(
          "h-[100dvh] bg-zinc-950/95 backdrop-blur-xl border-t md:border-l md:border-t-0 border-[var(--border)] dark:border-white/5 shadow-2xl flex flex-col justify-between rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none relative overflow-hidden z-[9999] transition-all duration-300",
          isExpanded ? "w-full md:w-[90vw] max-w-5xl" : "w-full sm:w-[450px] max-w-md"
        )}
        */
        className={cn(
          "h-[100dvh] bg-[var(--background)] dark:bg-[#080810] text-[var(--text-primary)] transition-colors duration-200 border-t md:border-l md:border-t-0 border-[var(--border)] dark:border-[var(--border)] dark:border-white/5 shadow-2xl flex flex-col justify-between rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none relative overflow-hidden z-[9999]",
          isExpanded ? "w-full md:w-[90vw] max-w-5xl" : "w-full sm:w-[450px] max-w-md"
        )}
      >
        {/* Decorative Top Accent Glow */}
        <div 
          className="h-[2px] w-full shrink-0" 
          style={{ 
            background: `linear-gradient(90deg, transparent, ${themeColor}, transparent)`,
            boxShadow: `0 0 10px ${themeColor}` 
          }} 
        />

        <TaskDrawerHeader
          task={task}
          taskTitle={taskTitle}
          setTaskTitle={setTaskTitle}
          themeColor={themeColor}
          onComplete={onComplete}
          onClose={onClose}
          startFocus={startFocus}
          // cupId={cupId}
          goalId={goalId}
          currentUserId={currentUserId}
          profile={profile}
          isRTL={isRTL}
          t={t}
          sendNotification={sendNotification}
          updateTask={onUpdateTask}
          handleCopyLink={handleCopyLink}
          goals={goals}
          canEdit={canEdit}
          isExpanded={isExpanded}
          onToggleExpand={() => setIsExpanded(!isExpanded)}
        />

        {/* Content Area */}
        {!isExpanded ? (
          /* Mobile / Non-expanded layout: single scrollable column */
          <div className="flex-1 overflow-y-auto px-4 custom-scrollbar select-none space-y-6 pb-6">
            {/* YouTube Embed Player */}
            {hasVideo && (
              <div className="space-y-3 shrink-0">
                <div className="w-full aspect-video min-h-[200px] relative rounded-xl overflow-hidden shadow-lg border bg-black/40" style={{ borderColor: `${themeColor}20` }}>
                  <SmartTaskPlayer
                    taskId={task.id}
                    url={finalVideoUrl}
                    initialProgress={videoProgress}
                    isGuest={isGuest}
                    themeColor={themeColor}
                    onComplete={onComplete}
                    onProgressUpdate={onProgressUpdate}
                  />
                </div>
                {/* Mini video meta bar */}
                <div className="flex justify-between items-center text-[11px] font-mono text-[var(--text-muted)] dark:text-white/55 px-1 bg-[var(--background-secondary)]/50 dark:bg-white/[0.02] py-2 rounded-lg border border-[var(--border)] dark:border-white/5">
                  <span className="flex items-center gap-1.5 px-2">
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />
                    {t('savedProgress')}
                  </span>
                  <span className="px-2 tracking-widest">
                    {formatVideoTime(videoProgress)} / {formatVideoTime(resolvedDuration)}
                  </span>
                </div>
              </div>
            )}

            <TaskDrawerMetadata
              task={task}
              themeColor={themeColor}
              isRTL={isRTL}
              t={t}
              endDate={endDate}
              isSquad={isSquad}
              squadMembers={squadMembers}
              currentUserId={currentUserId}
              missionOwnerId={missionOwnerId}
              profile={profile}
              updateTask={onUpdateTask}
              sendNotification={sendNotification}
              canEdit={canEdit}
            />

            <TaskDrawerDescription
              task={task}
              description={description}
              setDescription={setDescription}
              isRTL={isRTL}
              updateTask={onUpdateTask}
              canEdit={canEdit}
            />

            {/* Render isolated AI Checklist button to prevent outer TaskDrawer re-renders on timer tick */}
            {canEdit && finalVideoUrl && (() => {
              const currentGoal = goals.find((g: any) => g.id === goalId || g.id === task.goal_id)
              const goalTitleText = currentGoal?.title || 'Specialized Curriculum'
              const hasAiChecklist = subtasks.some((s: any) => s.id?.startsWith('sub_ai_') || s.id?.startsWith('ai-'))
              return (
                <AiChecklistButton
                  taskId={task.id}
                  finalVideoUrl={finalVideoUrl}
                  canEdit={canEdit}
                  isRTL={isRTL}
                  themeColor={themeColor}
                  onUpdateTask={onUpdateTask}
                  resolvedDuration={resolvedDuration}
                  taskTitle={task.title}
                  goalTitle={goalTitleText}
                  hasAiChecklist={hasAiChecklist}
                />
              )
            })()}

            <TaskDrawerChecklist
              task={task}
              subtasks={subtasks}
              newSubtaskText={newSubtaskText}
              setNewSubtaskText={setNewSubtaskText}
              handleAddSubtask={handleAddSubtask}
              handleToggleSubtask={handleToggleSubtask}
              handleDeleteSubtask={handleDeleteSubtask}
              handleUpdateSubtask={handleUpdateSubtask}
              isRTL={isRTL}
              themeColor={themeColor}
              canEdit={canEdit}
            />

            {/* Google Drive Attachments */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-medium text-[var(--text-muted)] dark:text-zinc-500 mb-3 opacity-60">
                {isRTL ? 'المرفقات - Attachments' : 'Drive Attachments'}
              </h3>
              
              {canAddAttachment && (
                <div className="space-y-2">
                  {/* Accordion Attach Resource Button */}
                  <button
                    type="button"
                    onClick={() => setIsAttachOpen(!isAttachOpen)}
                    className="w-full flex items-center gap-2 py-2 px-3 rounded-md bg-[var(--background-secondary)] dark:bg-white/5 hover:bg-white/10 transition-all duration-300 font-space text-xs text-[var(--text-primary)] dark:text-white/90 border border-[var(--border)] dark:border-white/10 cursor-pointer"
                  >
                    <Paperclip className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-bold">{isRTL ? 'إضافة ملحقات' : 'Attach Resource'}</span>
                    <span className="ml-auto text-[10px] font-mono">{isAttachOpen ? '▲' : '▼'}</span>
                  </button>

                  {/* Accordion Expanded Submenu with smooth Tailwind transitions */}
                  <div 
                    className={cn(
                      "transition-all duration-200 ease-in-out overflow-hidden space-y-2", 
                      isAttachOpen ? "max-h-[500px] opacity-100 mt-2" : "max-h-0 opacity-0 pointer-events-none"
                    )}
                  >
                    <div className="p-3 bg-[var(--background-secondary)]/50 dark:bg-white/[0.02] border border-[var(--border)] dark:border-white/5 rounded-md space-y-2">
                      {/* Option 1: Google Drive Link */}
                      <button
                        type="button"
                        onClick={handleGoogleDrivePicker}
                        className="w-full flex items-center gap-2 py-2 px-3 rounded-md bg-[var(--background-secondary)] dark:bg-white/5 hover:bg-white/10 transition-all duration-300 font-space text-xs text-left cursor-pointer text-[var(--text-primary)] dark:text-white/90"
                      >
                        <img src="/Google_Drive_icon_(2020).svg" alt="Drive" className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-medium">
                          {isDriveConnected ? (isRTL ? 'إضافة من درايف' : 'Add from Drive') : (isRTL ? 'ربط جوجل درايف' : 'Link Google Drive')}
                        </span>
                        {isDriveConnected && (
                          <span className="ml-auto text-[10px] text-emerald-500 font-bold tracking-wider animate-pulse">
                            {isRTL ? 'متصل' : 'Connected'}
                          </span>
                        )}
                      </button>

                      {/* Option 2: Add Custom Link */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowManualLink(!showManualLink);
                          setShowYoutubeInput(false);
                        }}
                        className="w-full flex items-center gap-2 py-2 px-3 rounded-md bg-[var(--background-secondary)] dark:bg-white/5 hover:bg-white/10 transition-all duration-300 cursor-pointer font-space text-xs text-[var(--text-secondary)] dark:text-white/80 hover:text-white"
                      >
                        <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-medium">{isRTL ? 'إضافة رابط يدوياً' : 'Add Manual Link'}</span>
                      </button>

                      {/* Option 3: Attach YouTube Video (only if task doesn't have a video yet) */}
                      {!hasVideo && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowYoutubeInput(!showYoutubeInput);
                            setShowManualLink(false);
                          }}
                          className="w-full flex items-center gap-2 py-2 px-3 rounded-md bg-[var(--background-secondary)] dark:bg-white/5 hover:bg-white/10 transition-all duration-300 cursor-pointer font-space text-xs text-[var(--text-secondary)] dark:text-white/80 hover:text-white"
                        >
                          <Video className="w-3.5 h-3.5 shrink-0 text-red-500" />
                          <span className="font-medium">{isRTL ? 'ربط فيديو يوتيوب' : 'Attach YouTube Video'}</span>
                        </button>
                      )}

                      {/* Manual Link Input Form */}
                      <AnimatePresence>
                        {showManualLink && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex flex-col gap-2 overflow-hidden pt-2 border-t border-[var(--border)] dark:border-white/5"
                          >
                            <input
                              type="text"
                              placeholder={isRTL ? 'اسم المرفق...' : 'Attachment name...'}
                              value={manualLinkName}
                              onChange={e => setManualLinkName(e.target.value)}
                              className="w-full bg-zinc-900/80 border border-white/8 py-2 px-3 font-space text-xs font-medium text-white outline-none placeholder:text-[var(--text-muted)]/30 dark:text-white/20 transition-all rounded-md focus:border-white/20"
                            />
                            <div className="flex gap-2">
                              <input
                                type="url"
                                placeholder="https://..."
                                value={manualLinkUrl}
                                onChange={e => setManualLinkUrl(e.target.value)}
                                className="flex-1 bg-zinc-900/80 border border-white/8 py-2 px-3 font-space text-xs font-medium text-white outline-none placeholder:text-[var(--text-muted)]/30 dark:text-white/20 transition-all rounded-md focus:border-white/20"
                              />
                              <button
                                type="button"
                                onClick={handleAddManualLink}
                                disabled={isAddingLink || !manualLinkName.trim() || !manualLinkUrl.trim()}
                                className="py-2 px-3 font-space font-medium text-[10px] text-black transition-all rounded-md shrink-0 cursor-pointer disabled:opacity-40"
                                style={{ backgroundColor: themeColor }}
                              >
                                {isAddingLink ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto text-black" /> : (isRTL ? 'إضافة' : 'Add')}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* YouTube Video Link Input Form */}
                      <AnimatePresence>
                        {showYoutubeInput && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex flex-col gap-2 overflow-hidden pt-2 border-t border-[var(--border)] dark:border-white/5"
                          >
                            <div className="flex gap-2">
                              <input
                                type="url"
                                placeholder={isRTL ? 'رابط فيديو يوتيوب...' : 'YouTube URL...'}
                                value={youtubeUrlInput}
                                onChange={e => setYoutubeUrlInput(e.target.value)}
                                className="flex-1 bg-zinc-900/80 border border-white/8 py-2 px-3 font-space text-xs font-medium text-white outline-none placeholder:text-[var(--text-muted)]/30 dark:text-white/20 transition-all rounded-md focus:border-white/20"
                              />
                              <button
                                type="button"
                                onClick={handleAttachYoutubeVideo}
                                disabled={!youtubeUrlInput.trim()}
                                className="py-2 px-3 font-space font-medium text-[10px] text-black transition-all rounded-md shrink-0 cursor-pointer disabled:opacity-40"
                                style={{ backgroundColor: themeColor }}
                              >
                                {isRTL ? 'ربط' : 'Attach'}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              )}

              {/* Render List of Drive Files */}
              {(() => {
                const attachments: any[] = task.metadata?.attachments || []
                if (attachments.length === 0) return null

                return (
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {attachments.map((att: any, idx: number) => {
                      const typeKey = att.type || 'link'
                      return (
                        <div
                          key={att.id || idx}
                          className="group flex items-center justify-between gap-3 p-3.5 rounded-md border bg-transparent dark:bg-[var(--background-secondary)] dark:bg-white/5 border-[var(--border)] dark:border-white/5 hover:border-[var(--border)] dark:border-white/10 hover:bg-white/10 transition-all relative overflow-hidden cursor-pointer"
                          onClick={() => window.open(att.url, '_blank')}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl" style={{ backgroundColor: themeColor }} />
                          <div className="flex items-center gap-3 min-w-0 pl-1">
                            <Paperclip className="w-4 h-4 shrink-0" style={{ color: themeColor }} />
                            <div className="min-w-0">
                              <p className="font-space font-medium text-xs text-[var(--text-primary)] dark:text-white/90 truncate">{att.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-space text-[9px] text-[var(--text-muted)]/50 dark:text-white/30">{typeKey}</span>
                                {att.uploaded_by && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] text-[var(--text-muted)]/30 dark:text-white/20">•</span>
                                    <img
                                      src={att.uploaded_by.avatar_url || '/avatars/omar.svg'}
                                      alt={att.uploaded_by.name || 'User'}
                                      className="w-3.5 h-3.5 rounded-full border border-[var(--border)] dark:border-white/10"
                                    />
                                    <span className="text-[8px] text-[var(--text-secondary)] dark:text-zinc-400 font-space">
                                      {att.uploaded_by.name || 'Operator'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          {canAddAttachment && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                const updated = attachments.filter((_: any, i: number) => i !== idx)
                                await updateTask(task.id, { metadata: { ...task.metadata, attachments: updated } })
                              }}
                              className="w-7 h-7 flex items-center justify-center border border-[var(--border)] dark:border-white/5 text-[var(--text-muted)]/40 dark:text-white/25 hover:border-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-all rounded-md shrink-0 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>

            <div className="pt-6 border-t border-[var(--border)] dark:border-white/5">
              <TaskDrawerComments
                task={task}
                notes={notes}
                isRTL={isRTL}
                themeColor={themeColor}
                isSquad={isSquad}
                squadMembers={squadMembers}
                currentUserId={currentUserId}
                profile={profile}
                updateTask={updateTask}
                sendNotification={sendNotification}
                handleDeleteNote={handleDeleteNote}
                handleToggleReaction={handleToggleReaction}
                formatNoteContent={formatNoteContent}
              />
            </div>
          </div>
        ) : (
          /* Desktop / Expanded split view layout: 50/50 height-contained workspace split */
          <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-2 gap-6 px-6 pb-6 select-none">
            {/* Left Column container: Context & Media (Consumption) */}
            <div className="h-full overflow-y-auto overscroll-y-contain pr-2 custom-scrollbar space-y-6">
              {/* YouTube Embed Player */}
              {hasVideo && (
                <div className="space-y-3 shrink-0">
                  <div className="w-full aspect-video min-h-[200px] relative rounded-xl overflow-hidden shadow-lg border bg-black/40" style={{ borderColor: `${themeColor}20` }}>
                    <SmartTaskPlayer
                      taskId={task.id}
                      url={finalVideoUrl}
                      initialProgress={videoProgress}
                      isGuest={isGuest}
                      themeColor={themeColor}
                      onComplete={onComplete}
                      onProgressUpdate={onProgressUpdate}
                    />
                  </div>
                  {/* Mini video meta bar */}
                  <div className="flex justify-between items-center text-[11px] font-mono text-[var(--text-muted)] dark:text-white/55 px-1 bg-[var(--background-secondary)]/50 dark:bg-white/[0.02] py-2 rounded-lg border border-[var(--border)] dark:border-white/5">
                    <span className="flex items-center gap-1.5 px-2">
                      <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />
                      {t('savedProgress')}
                    </span>
                    <span className="px-2 tracking-widest">
                      {formatVideoTime(videoProgress)} / {formatVideoTime(resolvedDuration)}
                    </span>
                  </div>
                </div>
              )}

              <TaskDrawerMetadata
                task={task}
                themeColor={themeColor}
                isRTL={isRTL}
                t={t}
                endDate={endDate}
                isSquad={isSquad}
                squadMembers={squadMembers}
                currentUserId={currentUserId}
                missionOwnerId={missionOwnerId}
                profile={profile}
                updateTask={onUpdateTask}
                sendNotification={sendNotification}
                canEdit={canEdit}
              />

              <TaskDrawerDescription
                task={task}
                description={description}
                setDescription={setDescription}
                isRTL={isRTL}
                updateTask={onUpdateTask}
                canEdit={canEdit}
              />
            </div>

            {/* Right Column container: Execution & Collaboration */}
            <div className="h-full overflow-y-auto overscroll-y-contain pr-2 custom-scrollbar space-y-6 border-l border-[var(--border)] dark:border-[var(--border)] dark:border-white/5 pl-6">
              {/* Generate AI Checklist */}
              {canEdit && finalVideoUrl && (() => {
                const currentGoal = goals.find((g: any) => g.id === goalId || g.id === task.goal_id)
                const goalTitleText = currentGoal?.title || 'Specialized Curriculum'
                const hasAiChecklist = subtasks.some((s: any) => s.id?.startsWith('sub_ai_') || s.id?.startsWith('ai-'))
                return (
                  <AiChecklistButton
                    taskId={task.id}
                    finalVideoUrl={finalVideoUrl}
                    canEdit={canEdit}
                    isRTL={isRTL}
                    themeColor={themeColor}
                    onUpdateTask={onUpdateTask}
                    resolvedDuration={resolvedDuration}
                    taskTitle={task.title}
                    goalTitle={goalTitleText}
                    hasAiChecklist={hasAiChecklist}
                  />
                )
              })()}

              <TaskDrawerChecklist
                task={task}
                subtasks={subtasks}
                newSubtaskText={newSubtaskText}
                setNewSubtaskText={setNewSubtaskText}
                handleAddSubtask={handleAddSubtask}
                handleToggleSubtask={handleToggleSubtask}
                handleDeleteSubtask={handleDeleteSubtask}
                handleUpdateSubtask={handleUpdateSubtask}
                isRTL={isRTL}
                themeColor={themeColor}
                canEdit={canEdit}
              />

              {/* Google Drive Attachments */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-medium text-[var(--text-muted)] dark:text-zinc-500 mb-3 opacity-60">
                  {isRTL ? 'المرفقات - Attachments' : 'Drive Attachments'}
                </h3>
                
                {canAddAttachment && (
                  <div className="space-y-2">
                    {/* Accordion Attach Resource Button */}
                    <button
                      type="button"
                      onClick={() => setIsAttachOpen(!isAttachOpen)}
                      className="w-full flex items-center gap-2 py-2 px-3 rounded-md bg-[var(--background-secondary)] dark:bg-white/5 hover:bg-white/10 transition-all duration-300 font-space text-xs text-[var(--text-primary)] dark:text-white/90 border border-[var(--border)] dark:border-white/10 cursor-pointer"
                    >
                      <Paperclip className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-bold">{isRTL ? 'إضافة ملحقات' : 'Attach Resource'}</span>
                      <span className="ml-auto text-[10px] font-mono">{isAttachOpen ? '▲' : '▼'}</span>
                    </button>

                    {/* Accordion Expanded Submenu with smooth Tailwind transitions */}
                    <div 
                      className={cn(
                        "transition-all duration-200 ease-in-out overflow-hidden space-y-2", 
                        isAttachOpen ? "max-h-[500px] opacity-100 mt-2" : "max-h-0 opacity-0 pointer-events-none"
                      )}
                    >
                      <div className="p-3 bg-[var(--background-secondary)]/50 dark:bg-white/[0.02] border border-[var(--border)] dark:border-white/5 rounded-md space-y-2">
                        {/* Option 1: Google Drive Link */}
                        <button
                          type="button"
                          onClick={handleGoogleDrivePicker}
                          className="w-full flex items-center gap-2 py-2 px-3 rounded-md bg-[var(--background-secondary)] dark:bg-white/5 hover:bg-white/10 transition-all duration-300 font-space text-xs text-left cursor-pointer text-[var(--text-primary)] dark:text-white/90"
                        >
                          <img src="/Google_Drive_icon_(2020).svg" alt="Drive" className="w-3.5 h-3.5 shrink-0" />
                          <span className="font-medium">
                            {isDriveConnected ? (isRTL ? 'إضافة من درايف' : 'Add from Drive') : (isRTL ? 'ربط جوجل درايف' : 'Link Google Drive')}
                          </span>
                          {isDriveConnected && (
                            <span className="ml-auto text-[10px] text-emerald-500 font-bold tracking-wider animate-pulse">
                              {isRTL ? 'متصل' : 'Connected'}
                            </span>
                          )}
                        </button>

                        {/* Option 2: Add Custom Link */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowManualLink(!showManualLink);
                            setShowYoutubeInput(false);
                          }}
                          className="w-full flex items-center gap-2 py-2 px-3 rounded-md bg-[var(--background-secondary)] dark:bg-white/5 hover:bg-white/10 transition-all duration-300 cursor-pointer font-space text-xs text-[var(--text-secondary)] dark:text-white/80 hover:text-white"
                        >
                          <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                          <span className="font-medium">{isRTL ? 'إضافة رابط يدوياً' : 'Add Manual Link'}</span>
                        </button>

                        {/* Option 3: Attach YouTube Video */}
                        {!hasVideo && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowYoutubeInput(!showYoutubeInput);
                              setShowManualLink(false);
                            }}
                            className="w-full flex items-center gap-2 py-2 px-3 rounded-md bg-[var(--background-secondary)] dark:bg-white/5 hover:bg-white/10 transition-all duration-300 cursor-pointer font-space text-xs text-[var(--text-secondary)] dark:text-white/80 hover:text-white"
                          >
                            <Video className="w-3.5 h-3.5 shrink-0 text-red-500" />
                            <span className="font-medium">{isRTL ? 'ربط فيديو يوتيوب' : 'Attach YouTube Video'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Render List of Drive Files */}
              {(() => {
                const attachments: any[] = task.metadata?.attachments || []
                if (attachments.length === 0) return null

                return (
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {attachments.map((att: any, idx: number) => {
                      const typeKey = att.type || 'link'
                      return (
                        <div
                          key={att.id || idx}
                          className="group flex items-center justify-between gap-3 p-3.5 rounded-md border bg-transparent dark:bg-[var(--background-secondary)] dark:bg-white/5 border-[var(--border)] dark:border-white/5 hover:border-[var(--border)] dark:border-white/10 hover:bg-white/10 transition-all relative overflow-hidden cursor-pointer"
                          onClick={() => window.open(att.url, '_blank')}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl" style={{ backgroundColor: themeColor }} />
                          <div className="flex items-center gap-3 min-w-0 pl-1">
                            <Paperclip className="w-4 h-4 shrink-0" style={{ color: themeColor }} />
                            <div className="min-w-0">
                              <p className="font-space font-medium text-xs text-[var(--text-primary)] dark:text-white/90 truncate">{att.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-space text-[9px] text-[var(--text-muted)]/50 dark:text-white/30">{typeKey}</span>
                                {att.uploaded_by && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] text-[var(--text-muted)]/30 dark:text-white/20">•</span>
                                    <img
                                      src={att.uploaded_by.avatar_url || '/avatars/omar.svg'}
                                      alt={att.uploaded_by.name || 'User'}
                                      className="w-3.5 h-3.5 rounded-full border border-[var(--border)] dark:border-white/10"
                                    />
                                    <span className="text-[8px] text-[var(--text-secondary)] dark:text-zinc-400 font-space">
                                      {att.uploaded_by.name || 'Operator'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          {canAddAttachment && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                const updated = attachments.filter((_: any, i: number) => i !== idx)
                                await updateTask(task.id, { metadata: { ...task.metadata, attachments: updated } })
                              }}
                              className="w-7 h-7 flex items-center justify-center border border-[var(--border)] dark:border-white/5 text-[var(--text-muted)]/40 dark:text-white/25 hover:border-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-all rounded-md shrink-0 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}

              {/* Collaborative Activity Comments */}
              <TaskDrawerComments
                task={task}
                notes={notes}
                isRTL={isRTL}
                themeColor={themeColor}
                isSquad={isSquad}
                squadMembers={squadMembers}
                currentUserId={currentUserId}
                profile={profile}
                updateTask={updateTask}
                sendNotification={sendNotification}
                handleDeleteNote={handleDeleteNote}
                handleToggleReaction={handleToggleReaction}
                formatNoteContent={formatNoteContent}
              />
            </div>
          </div>
        )}

        {/* Fixed Thumb-Zone Footer */}
        {canEdit && (
          /* Commented out original dark theme footer for safety rules
          <div className="w-full z-[60] bg-[#09090b]/98 border-t border-[var(--border)] dark:border-white/5 px-4 py-3 flex items-center justify-center shrink-0 relative">
          */
          <div className="w-full z-[60] bg-[var(--background)]/98 dark:bg-[#09090b]/98 border-t border-[var(--border)] dark:border-[var(--border)] dark:border-white/5 px-4 py-3 flex items-center justify-center shrink-0 relative">
            <div className="flex items-center justify-center gap-6">
              {/* Pomodoro / Focus Button */}
              <button
                type="button"
                disabled={task.is_completed}
                onClick={(e) => {
                  e.stopPropagation()
                  const durationVal = resolvedDuration
                  if (durationVal > 0) {
                    updateConfig(Math.round(durationVal / 60), breakDuration)
                  }
                  if (isCurrentTaskFocus) {
                    if (isCurrentFocusActive) {
                      pause()
                    } else {
                      resume()
                    }
                  } else {
                    startFocus(task.title, task.id, goalId)
                    // Auto-start the timer — no navigation, stay in the drawer
                    setTimeout(() => startTimer(), 50)
                  }
                }}
                className={cn(
                  "flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer min-w-[120px] justify-center",
                  task.is_completed && "opacity-40 cursor-not-allowed",
                  isCurrentFocusActive
                    ? "bg-orange-500/10 border border-orange-500/30 shadow-[0_0_12px_rgba(249,115,22,0.15)]"
                    : isCurrentTaskFocus && !isCurrentFocusActive
                      ? "bg-orange-500/5 border border-orange-500/20"
                      : "bg-zinc-200/40 dark:bg-white/[0.03] border border-[var(--border)] dark:border-white/[0.06] hover:bg-zinc-200/60 dark:hover:bg-white/[0.06] hover:border-[var(--border)] dark:hover:border-[var(--border)] dark:border-white/10"
                )}
              >
                {isCurrentFocusActive ? (
                  <Pause className="w-4 h-4 text-orange-500 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current" style={{ color: isCurrentTaskFocus ? '#F97316' : 'var(--text-secondary)' }} />
                )}
                <span className={cn(
                  "text-[10px] font-medium",
                  isCurrentFocusActive ? "text-orange-500" : isCurrentTaskFocus ? "text-orange-400" : "text-[var(--text-secondary)] dark:text-zinc-400"
                )}>
                  {isCurrentFocusActive 
                    ? (isRTL ? "إيقاف" : "Pause")
                    : isCurrentTaskFocus
                      ? (isRTL ? "استكمال" : "Resume")
                      : (resolvedDuration > 0 
                          ? (isRTL ? `تركيز (${Math.round(resolvedDuration / 60)} د)` : `Focus (${Math.round(resolvedDuration / 60)} min)`)
                          : (isRTL ? "تركيز" : "Focus")
                        )}
                </span>
              </button>
   
              {/* Complete Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onComplete()
                  
                  // Send completion notification to assignee
                  const assigneeId = task.assigned_to
                  if (assigneeId && assigneeId !== currentUserId) {
                    const senderName = profile?.full_name || 'Operator'
                    const nextStatusEn = task.is_completed ? "set your task to incomplete" : "completed your task"
                    const nextStatusAr = task.is_completed ? "تغيير مهمتك لغير مكتملة" : "أكمل مهمتك المعينة"
                    
                    const notifTitle = isRTL
                      ? `✅ ${senderName} قام بـ ${nextStatusAr}`
                      : `✅ ${senderName} ${nextStatusEn}`
                    const notifContent = isRTL
                      ? `${senderName} قام بـ ${nextStatusAr} في مهمتك المعينة "${task.title}"`
                      : `${senderName} ${nextStatusEn} "${task.title}"`
                      
                    sendNotification(assigneeId, 'reaction', notifTitle, notifContent)
                  }
                }}
                className={cn(
                  "flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer min-w-[120px] justify-center",
                  task.is_completed
                    ? "bg-emerald-500/10 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                    : "bg-zinc-200/40 dark:bg-white/[0.03] border border-[var(--border)] dark:border-white/[0.06] hover:bg-zinc-200/60 dark:hover:bg-white/[0.06] hover:border-[var(--border)] dark:hover:border-[var(--border)] dark:border-white/10"
                )}
              >
                {task.is_completed ? (
                  <ListTodo className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Circle className="w-4 h-4 text-[var(--text-muted)] dark:text-zinc-500" />
                )}
                <span className={cn(
                  "text-[10px] font-medium",
                  task.is_completed ? "text-emerald-500" : "text-[var(--text-secondary)] dark:text-zinc-400"
                )}>
                {task.is_completed 
                  ? (isRTL ? "تم" : "Done") 
                  : (isRTL ? "مكتملة" : "Complete")}
                </span>
              </button>
            </div>
   
            {/* Delete Button (If handler is provided, absolutely positioned on the side to preserve central centering) */}
            {onDelete && (
              <div className={cn("absolute", isRTL ? "left-4" : "right-4")}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(isRTL ? 'هل أنت متأكد من حذف هذه المهمة؟' : 'Are you sure you want to delete this task?')) {
                      onDelete()
                      onClose()
                    }
                  }}
                  className="w-9 h-9 flex items-center justify-center bg-transparent hover:bg-red-500/10 text-[var(--text-muted)] dark:text-zinc-500 hover:text-red-500 rounded-xl transition-all cursor-pointer"
                  // Commented out per safety rules:
                  // title="DELETE TASK"
                  title="Delete Task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}
