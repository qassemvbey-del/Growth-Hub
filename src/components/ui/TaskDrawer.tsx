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
  StickyNote, Link as LinkIcon, Smile, AtSign, Send, MessageSquare, Play,
  PlusSquare, Target, Circle, CheckCircle2} from 'lucide-react'
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
  cupId?: string
  squadMembers?: any[]
  isSquad?: boolean
  missionOwnerId?: string | null
}

const getYouTubeId = (urlOrId: string) => {
  if (!urlOrId) return ''
  if (urlOrId.length === 11 && !urlOrId.includes('/') && !urlOrId.includes('?')) return urlOrId
  try {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
    const match = urlOrId.match(regExp)
    return (match && match[2].length === 11) ? match[2] : urlOrId
  } catch (e) { return urlOrId }
}

export default function TaskDrawer({
  task,
  onClose,
  isGuest,
  themeColor,
  onComplete,
  onProgressUpdate,
  onUpdateTask,
  cupId,
  squadMembers = [],
  isSquad = false,
  missionOwnerId = null
}: TaskDrawerProps) {
  const { isRTL, t, addXp, profile } = useGrowth()
  const { startFocus } = usePomodoro()

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
                    alert(isRTL ? `الملف الشخصي: ${name} • الرتبة: ${member.rank || 'عضو'}` : `Member Profile: ${name} • Rank: ${member.rank || 'ROOKIE'}`)
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
  const [taskTitle, setTaskTitle] = useState(task.title || '')
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

  useEffect(() => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('gd_access_token')
    const expiry = parseInt(localStorage.getItem('gd_expires_at') || '0', 10)
    if (token && Date.now() < expiry) setIsDriveConnected(true)
  }, [])

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
          cupId: task?.cup_id || cupId,
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
  }, [currentUserId, profile?.full_name, task?.id, task?.title, cupId, isSquad])



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

    tryAuth('none', () => tryAuth('select_account'))

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
            const newAttachment = { id: fileId, name: fileName, url: fileUrl, type: fileType }
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
    const newAttachment = { id: `manual_${Date.now()}`, name, url, type: fileType }
    const attachments = task.metadata?.attachments || []
    const updatedAttachments = [newAttachment, ...attachments]
    const updatedMetadata = { ...task.metadata, attachments: updatedAttachments }
    await updateTask(task.id, { metadata: updatedMetadata })
    setManualLinkName('')
    setManualLinkUrl('')
    setShowManualLink(false)
    setIsAddingLink(false)
  }

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
    const link = `${window.location.origin}/goals/squad/${task.cup_id}?task=${task.id}`
    navigator.clipboard.writeText(link)
    alert(isRTL ? 'تم نسخ رابط المهمة!' : 'Task link copied to clipboard!')
  }

  return (
    <div className="fixed inset-0 z-[9990] flex items-stretch">
      {/* 1. Backdrop Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9990] cursor-pointer"
      />

      {/* 2. Side Panel */}
      <motion.div
        initial={{ x: isRTL ? '-100%' : '100%' }}
        animate={{ x: 0 }}
        exit={{ x: isRTL ? '-100%' : '100%' }}
        transition={{ type: 'tween', duration: 0.35, ease: 'easeOut' }}
        className={`fixed top-0 bottom-0 z-[9995] w-full md:w-[50vw] lg:w-[45vw] bg-zinc-950/98 shadow-2xl flex flex-col border-white/10 ${
          isRTL ? 'left-0 border-r-2' : 'right-0 border-l-2'
        }`}
        style={{ borderColor: themeColor }}
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
          cupId={cupId}
          currentUserId={currentUserId}
          profile={profile}
          isRTL={isRTL}
          t={t}
          sendNotification={sendNotification}
          updateTask={onUpdateTask}
          handleCopyLink={handleCopyLink}
        />

        {/* Single Scrollable view content wrapper */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 select-none">
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
          />

          <TaskDrawerDescription
            task={task}
            description={description}
            setDescription={setDescription}
            isRTL={isRTL}
            updateTask={onUpdateTask}
          />

          <TaskDrawerChecklist
            task={task}
            subtasks={subtasks}
            newSubtaskText={newSubtaskText}
            setNewSubtaskText={setNewSubtaskText}
            handleAddSubtask={handleAddSubtask}
            handleToggleSubtask={handleToggleSubtask}
            handleDeleteSubtask={handleDeleteSubtask}
            isRTL={isRTL}
            themeColor={themeColor}
          />

          {/* E. GOOGLE DRIVE ATTACHMENTS */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">
              {isRTL ? 'المرفقات // ATTACHMENTS' : 'DRIVE ATTACHMENTS // FILES'}
            </h3>
            
            <div className="space-y-2 p-4 rounded-xl bg-zinc-900/50 border border-white/5">
              <button
                onClick={handleGoogleDrivePicker}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 font-space font-black text-xs uppercase tracking-widest text-white/90 bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-white/20 transition-all duration-300 rounded-xl cursor-pointer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/Google_Drive_icon_(2020).svg" alt="Drive" className="w-5 h-5 mr-2" />
                <span>{isDriveConnected ? '[ OPEN ]' : '[ CONNECT ]'}</span>
              </button>

              <button
                onClick={() => setShowManualLink(!showManualLink)}
                className="w-full flex items-center justify-between py-2 px-1 text-[10px] font-space font-black uppercase tracking-widest text-white/40 hover:text-white/70 transition-colors"
              >
                <span>{isRTL ? 'إضافة رابط يدوياً' : 'Add Manual Link'}</span>
                {showManualLink ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              <AnimatePresence>
                {showManualLink && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-col gap-2 overflow-hidden"
                  >
                    <input
                      type="text"
                      placeholder={isRTL ? 'اسم المرفق...' : 'ATTACHMENT_NAME...'}
                      value={manualLinkName}
                      onChange={e => setManualLinkName(e.target.value)}
                      className="w-full bg-zinc-900/80 border border-white/8 py-2.5 px-4 font-space text-xs font-black text-white uppercase tracking-widest outline-none placeholder:text-white/20 transition-all rounded-xl focus:border-white/20"
                    />
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="HTTPS://..."
                        value={manualLinkUrl}
                        onChange={e => setManualLinkUrl(e.target.value)}
                        className="flex-1 bg-zinc-900/80 border border-white/8 py-2.5 px-4 font-space text-xs font-black text-white uppercase tracking-widest outline-none placeholder:text-white/20 transition-all rounded-xl focus:border-white/20"
                      />
                      <button
                        onClick={handleAddManualLink}
                        disabled={isAddingLink || !manualLinkName.trim() || !manualLinkUrl.trim()}
                        className="py-2.5 px-4 font-space font-black uppercase tracking-widest text-[10px] text-black transition-all rounded-xl shrink-0 cursor-pointer disabled:opacity-40"
                        style={{ backgroundColor: themeColor }}
                      >
                        {isAddingLink ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto text-black" /> : (isRTL ? 'إضافة' : 'ADD')}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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
                        className="group flex items-center justify-between gap-3 p-3.5 rounded-xl border bg-zinc-900/30 border-white/5 hover:border-white/10 hover:bg-zinc-900/50 transition-all relative overflow-hidden cursor-pointer"
                        onClick={() => window.open(att.url, '_blank')}
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl" style={{ backgroundColor: themeColor }} />
                        <div className="flex items-center gap-3 min-w-0 pl-1">
                          <Paperclip className="w-4 h-4 shrink-0" style={{ color: themeColor }} />
                          <div className="min-w-0">
                            <p className="font-space font-black text-xs text-white/90 uppercase truncate tracking-wide">{att.name}</p>
                            <p className="font-space text-[9px] uppercase tracking-widest text-white/30 mt-0.5">{typeKey.toUpperCase()}</p>
                          </div>
                        </div>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation()
                            const updated = attachments.filter((_: any, i: number) => i !== idx)
                            await updateTask(task.id, { metadata: { ...task.metadata, attachments: updated } })
                          }}
                          className="w-7 h-7 flex items-center justify-center border border-white/5 text-white/25 hover:border-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-all rounded-lg shrink-0 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          {/* F. COLLABORATIVE SQUAD ACTIVITY & COMMENTS CHAT FEED */}
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
      </motion.div>
    </div>
  )
}
