'use client'

import React, { useState, FormEvent, KeyboardEvent, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGrowth } from '@/context/GrowthContext'
import { createClient } from '@/lib/supabase'
import { usePomodoro } from '@/context/PomodoroContext'
import SmartTaskPlayer from './SmartTaskPlayer'
import { 
  X, ChevronDown, ChevronUp, Check, Calendar, Lock, Zap, Plus, 
  Trash2, Loader2, RefreshCw, FolderOpen, Paperclip, ExternalLink, 
  StickyNote, Link as LinkIcon, Smile, AtSign, Send, MessageSquare, Play
} from 'lucide-react'

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
  isSquad = false
}: TaskDrawerProps) {
  const { isRTL, t, addXp, profile } = useGrowth()
  const { startFocus } = usePomodoro()
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

  const [noteInput, setNoteInput] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showMentionsDropdown, setShowMentionsDropdown] = useState(false)
  const [mentionsSearch, setMentionsSearch] = useState('')
  const [filteredMembers, setFilteredMembers] = useState<any[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Click outside to dismiss Emoji Picker and Mentions Dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement
      if (showEmojiPicker || showMentionsDropdown) {
        const clickedSmileBtn = target.closest('button[title="EMOJI"]')
        const clickedMentionBtn = target.closest('button[title="MENTION"]')
        const clickedInsideEmoji = target.closest('.emoji-picker-container')
        const clickedInsideMentions = target.closest('.mentions-dropdown-container')
        
        if (!clickedSmileBtn && !clickedMentionBtn && !clickedInsideEmoji && !clickedInsideMentions) {
          setShowEmojiPicker(false)
          setShowMentionsDropdown(false)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [showEmojiPicker, showMentionsDropdown])

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = textarea.value
      const before = text.substring(0, start)
      const after = text.substring(end, text.length)
      setNoteInput(before + emoji + after)
      
      setTimeout(() => {
        textarea.focus()
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length
      }, 0)
    } else {
      setNoteInput(prev => prev + emoji)
    }
    setShowEmojiPicker(false)
  }

  const handleNoteInputChange = (val: string) => {
    setNoteInput(val)

    const textarea = textareaRef.current
    if (!textarea) return

    const cursorPosition = textarea.selectionStart
    const textBeforeCursor = val.substring(0, cursorPosition)
    
    const match = textBeforeCursor.match(/@(\w*)$/)
    if (match) {
      setShowMentionsDropdown(true)
      const query = match[1].toLowerCase()
      setMentionsSearch(query)
      
      const filtered = squadMembers.filter(member => {
        const name = (member.full_name || member.user_name || '').toLowerCase()
        return name.includes(query)
      })
      setFilteredMembers(filtered)
    } else {
      setShowMentionsDropdown(false)
      setFilteredMembers([])
    }
  }

  const insertMention = (member: any) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const cursorPosition = textarea.selectionStart
    const textBeforeCursor = noteInput.substring(0, cursorPosition)
    const textAfterCursor = noteInput.substring(cursorPosition)

    const lastAtIdx = textBeforeCursor.lastIndexOf('@')
    if (lastAtIdx !== -1) {
      const name = member.full_name || member.user_name || 'Operator'
      const mentionText = `@${name} `
      const before = textBeforeCursor.substring(0, lastAtIdx)
      const newText = before + mentionText + textAfterCursor
      setNoteInput(newText)
      
      setTimeout(() => {
        textarea.focus()
        textarea.selectionStart = textarea.selectionEnd = lastAtIdx + mentionText.length
      }, 0)
    }
    setShowMentionsDropdown(false)
  }

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
            await onUpdateTask(task.id, { metadata: updatedMetadata })
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
    await onUpdateTask(task.id, { metadata: updatedMetadata })
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
    await onUpdateTask(task.id, { metadata: { ...task.metadata, subtasks: updatedSubtasks } })
    setNewSubtaskText('')
  }

  const handleToggleSubtask = async (subId: string, currentStatus: boolean) => {
    const updatedSubtasks = subtasks.map((s: any) => s.id === subId ? { ...s, is_completed: !currentStatus } : s)
    await onUpdateTask(task.id, { metadata: { ...task.metadata, subtasks: updatedSubtasks } })
  }

  const handleDeleteSubtask = async (subId: string) => {
    const updatedSubtasks = subtasks.filter((s: any) => s.id !== subId)
    await onUpdateTask(task.id, { metadata: { ...task.metadata, subtasks: updatedSubtasks } })
  }

  const handleAddNote = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    if (!noteInput.trim()) return

    const noteText = noteInput.trim()
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const newLocalNote = {
      id: `note_${Date.now()}`,
      content: noteText,
      created_at: new Date().toISOString(),
      user_id: user?.id || null,
      user_name: profile?.full_name || (user ? squadMembers.find(m => m.id === user.id)?.full_name : null) || 'Operator',
      avatar_url: profile?.avatar_url || (user ? squadMembers.find(m => m.id === user.id)?.avatar_url : null) || null
    }

    const updatedNotes = [newLocalNote, ...notes]
    const updatedMetadata = { ...task.metadata, notes: updatedNotes }

    if (!isGuest && user) {
      try {
        const newNotePayload = {
          user_id: user.id,
          title: task.title || (isRTL ? 'ملاحظة مهمة' : 'Task Note'),
          tag: 'task',
          content: noteText,
          color: themeColor || '#06B6D4',
          is_locked: false,
          is_on_home: false,
          pos_x: 0,
          pos_y: 0,
          font_settings: { family: 'space', weight: 'normal', style: 'normal' },
          mission_id: task.cup_id || null,
          cup_id: task.cup_id || null,
          task_id: task.id || null,
        }
        await supabase.from('notes').insert(newNotePayload)
      } catch (err) {
        console.error('Error syncing note to global notes:', err)
      }
    }

    await onUpdateTask(task.id, { metadata: updatedMetadata })
    setNoteInput('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddNote()
    }
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

    await onUpdateTask(task.id, { metadata: updatedMetadata })
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

        {/* Drawer Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.01] shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span 
                className="text-[10px] uppercase font-mono tracking-widest font-black"
                style={{ color: themeColor }}
              >
                TASK ID: #{task.id?.substring(0, 8) || 'LOCAL'}
              </span>
              <button
                onClick={handleCopyLink}
                className="p-1 hover:text-white transition-colors"
                title="COPY LINK"
              >
                <LinkIcon className="w-3.5 h-3.5" />
              </button>
            </div>
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              onBlur={() => {
                if (taskTitle.trim() && taskTitle !== task.title) {
                  onUpdateTask(task.id, { title: taskTitle.trim() })
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur()
                }
              }}
              className="text-xl font-bold font-space text-[#FFFFFF] tracking-tight uppercase bg-transparent w-full border-none focus:outline-none focus:ring-0 p-0 mt-1"
              placeholder={isRTL ? "اسم المهمة..." : "Task Name..."}
            />
          </div>
          
          <div className="flex items-center gap-3 ml-4 shrink-0">
            {/* Start Focus Button */}
            {!task.is_completed && (
              <button
                type="button"
                onClick={() => {
                  startFocus(task.title, task.id, cupId)
                  onClose()
                }}
                className="px-3.5 py-2 rounded-lg text-[9px] font-space font-black tracking-widest cursor-pointer transition-all border flex items-center gap-1.5 hover:scale-105 bg-orange-500/10 border-orange-500/30 text-orange-500 hover:bg-orange-500/20"
                title="START FOCUS"
              >
                <Play className="w-3 h-3 fill-current" />
                <span className="hidden sm:inline">{isRTL ? 'تركيز' : 'FOCUS'}</span>
              </button>
            )}

            {/* Complete Button */}
            <button
              type="button"
              onClick={() => {
                onComplete()
                onClose()
              }}
              className="px-3.5 py-2 rounded-lg text-[9px] font-space font-black tracking-widest cursor-pointer transition-all border flex items-center gap-1.5 hover:scale-105"
              style={{
                backgroundColor: task.is_completed ? 'transparent' : themeColor,
                borderColor: themeColor,
                color: task.is_completed ? themeColor : '#000000',
                boxShadow: task.is_completed ? 'none' : `0 0 10px ${themeColor}40`
              }}
            >
              {task.is_completed ? <RefreshCw className="w-3 h-3" /> : <Check className="w-3 h-3 stroke-[3px]" />}
              <span className="hidden sm:inline">{task.is_completed ? t('markIncomplete') : t('markCompleted')}</span>
            </button>

            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full flex items-center justify-center border border-white/10 hover:border-white/20 bg-white/[0.02] text-[var(--text-secondary)] hover:text-white transition-all cursor-pointer"
              title="CLOSE"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Single Scrollable view content wrapper */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 select-none">
          {/* A. STATUS, WEIGHT, XP & TIMELINE PANEL */}
          <div className="p-5 border border-white/5 bg-zinc-900/40 rounded-xl space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">
              {isRTL ? 'بيانات المهمة // METADATA' : 'TASK METADATA // PROFILE'}
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="flex flex-col space-y-1">
                <span className="text-[10px] text-white/40 uppercase font-mono">{t('currentStatus')}</span>
                <span className="text-sm font-bold font-space flex items-center gap-1.5" style={{ color: task.is_completed ? '#10B981' : themeColor }}>
                  <span className={`w-2 h-2 rounded-full ${task.is_completed ? 'bg-emerald-500' : 'bg-amber-500'}`} style={!task.is_completed ? { backgroundColor: themeColor } : {}} />
                  {task.is_completed ? t('completed') : t('inProgress')}
                </span>
              </div>
              
              <div className="flex flex-col space-y-1">
                <span className="text-[10px] text-white/40 uppercase font-mono">{t('taskWeight')}</span>
                <span className="text-sm font-mono font-bold" style={{ color: themeColor }}>
                  ⚡ {task.weight || 1} / 6
                </span>
              </div>

              <div className="flex flex-col space-y-1">
                <span className="text-[10px] text-white/40 uppercase font-mono">{isRTL ? 'المكافأة' : 'XP REWARD'}</span>
                <span className="text-sm font-mono font-bold text-teal-400">
                  +{ (task.weight || 1) * 10 } XP
                </span>
              </div>

              <div className="flex flex-col space-y-1">
                <span className="text-[10px] text-white/40 uppercase font-mono">{isRTL ? 'الموعد' : 'DEADLINE'}</span>
                <span className="text-xs font-mono font-bold text-white/80">
                  {endDate || (isRTL ? 'غير محدد' : 'NOT SET')}
                </span>
              </div>
            </div>
          </div>

          {/* B. ASSIGNEE SECTION (Squad Goals Only) */}
          {isSquad && squadMembers && squadMembers.length > 0 && (
            <div className="p-5 border border-white/5 bg-zinc-900/40 rounded-xl space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">
                {isRTL ? 'المسؤول // ASSIGNEE' : 'OPERATOR ASSIGNMENT // ASSIGNEE'}
              </h3>
              
              <div className="space-y-4">
                {task.assignee ? (
                  <div className="flex items-center gap-3 bg-white/[0.02] border border-white/10 p-3 rounded-xl w-full justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {task.assignee.avatar_url ? (
                        <img src={task.assignee.avatar_url} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-bold text-white">
                          {task.assignee.full_name?.charAt(0) || '?'}
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-white truncate">{task.assignee.full_name}</span>
                        <span className="text-[9px] font-black text-white/40 uppercase tracking-wider">{task.assignee.rank || 'ROOKIE'}</span>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => onUpdateTask(task.id, { assigned_to: null, assignee: null })}
                      className="px-3 py-1.5 border border-red-500/30 hover:border-red-500 hover:bg-red-500/10 text-red-400 hover:text-red-300 font-black tracking-widest text-[9px] uppercase rounded-lg transition-colors cursor-pointer"
                    >
                      {isRTL ? 'إلغاء التعيين' : 'UNASSIGN'}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-white/[0.01] border border-dashed border-white/10 p-4 rounded-xl w-full text-center text-white/40 text-xs font-space">
                    <span>{isRTL ? 'المهمة غير معينة لأي عضو' : 'NO OPERATOR ASSIGNED TO THIS TASK'}</span>
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest font-mono text-zinc-500">
                    {isRTL ? 'تعيين عضو:' : 'ASSIGN OPERATOR:'}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                    {squadMembers.map((member: any) => {
                      const isAssigned = task.assigned_to === member.id
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => {
                            if (isAssigned) return
                            onUpdateTask(task.id, {
                              assigned_to: member.id,
                              assignee: {
                                id: member.id,
                                full_name: member.full_name,
                                avatar_url: member.avatar_url,
                                rank: member.rank
                              }
                            })
                          }}
                          className={`flex items-center gap-3 p-2.5 border rounded-xl text-left transition-all duration-300 cursor-pointer min-w-0 w-full ${
                            isAssigned
                              ? "bg-teal-500/10 border-teal-500/50 text-[#14b8a6]"
                              : "bg-white/[0.01] border-white/5 hover:border-white/15 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {member.avatar_url ? (
                            <img src={member.avatar_url} className="w-6 h-6 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] font-bold shrink-0 text-white">
                              {member.full_name?.charAt(0) || '?'}
                            </div>
                          )}
                          <span className="text-xs font-bold truncate flex-1">{member.full_name}</span>
                          {isAssigned && (
                            <Check className="text-sm font-black shrink-0 text-[#14b8a6] w-3.5 h-3.5" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* C. TASK DESCRIPTION SECTION */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">
              {isRTL ? 'الوصف التفصيلي // DESCRIPTION' : 'TASK DESCRIPTION // INTEL'}
            </h3>
            <div className="border border-white/5 rounded-xl overflow-hidden bg-zinc-950/40">
              {/* Fake Rich Text Editor Toolbar */}
              <div className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.02] border-b border-white/5 text-zinc-400 select-none">
                <button type="button" className="p-1 hover:text-white hover:bg-white/5 rounded transition-all cursor-default" title="Bold">
                  <span className="font-bold text-xs">B</span>
                </button>
                <button type="button" className="p-1 hover:text-white hover:bg-white/5 rounded transition-all cursor-default" title="Italic">
                  <span className="italic text-xs font-serif">I</span>
                </button>
                <button type="button" className="p-1 hover:text-white hover:bg-white/5 rounded transition-all cursor-default" title="Underline">
                  <span className="underline text-xs">U</span>
                </button>
                <div className="w-[1px] h-3.5 bg-white/10 mx-1" />
                <button type="button" className="p-1 hover:text-white hover:bg-white/5 rounded transition-all cursor-default font-mono text-[10px]" title="Code Block">
                  &lt;/&gt;
                </button>
                <button type="button" className="p-1 hover:text-white hover:bg-white/5 rounded transition-all cursor-default" title="Insert Link">
                  <LinkIcon className="w-3.5 h-3.5" />
                </button>
                <button type="button" className="p-1 hover:text-white hover:bg-white/5 rounded transition-all cursor-default" title="Insert Image">
                  <Paperclip className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => {
                  if (description !== task.description) {
                    onUpdateTask(task.id, { description })
                  }
                }}
                className="w-full min-h-[120px] bg-transparent border-none p-4 font-space text-sm text-white outline-none focus:ring-0 placeholder-white/20 resize-y"
                placeholder={isRTL ? "أضف وصفاً تفصيلياً للمهمة هنا..." : "Add detailed task intelligence here..."}
              />
            </div>
          </div>

          {/* D. CHECKLIST / SUBTASKS SECTION */}
          <div className="space-y-3 p-5 border border-white/5 bg-zinc-900/40 rounded-xl">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">
              {isRTL ? 'المهام الفرعية // SUBTASKS' : 'CHECKLIST // SUBTASKS'}
            </h3>
            
            <form onSubmit={handleAddSubtask} className="flex gap-2">
              <input
                type="text"
                placeholder={isRTL ? 'مهمة فرعية جديدة...' : 'Add checklist item...'}
                value={newSubtaskText}
                onChange={e => setNewSubtaskText(e.target.value)}
                className="flex-1 bg-zinc-900/80 border border-white/8 py-2 px-3 font-space text-xs text-white outline-none transition-all rounded-lg focus:border-white/20"
              />
              <button
                type="submit"
                className="p-2 border rounded-lg bg-teal-500/10 border-teal-500/30 text-teal-400 hover:bg-teal-500/20 transition-all cursor-pointer flex items-center justify-center shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            <div className="space-y-2 mt-3">
              {subtasks.map((sub: any) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-lg border bg-zinc-950/40 border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleSubtask(sub.id, sub.is_completed)}
                      className="w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0"
                      style={{
                        borderColor: sub.is_completed ? '#10B981' : 'rgba(255,255,255,0.2)',
                        backgroundColor: sub.is_completed ? '#10B981' : 'transparent'
                      }}
                    >
                      {sub.is_completed && <Check className="w-2.5 h-2.5 text-black stroke-[3px]" />}
                    </button>
                    <span
                      className={`text-xs font-space truncate ${
                        sub.is_completed ? 'line-through text-white/30' : 'text-white/80'
                      }`}
                    >
                      {sub.title}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteSubtask(sub.id)}
                    className="p-1 text-white/35 hover:text-red-400 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

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
                            await onUpdateTask(task.id, { metadata: { ...task.metadata, attachments: updated } })
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
          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" style={{ color: themeColor }} />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">
                {isRTL ? 'النشاط والمحادثات // DISCUSSIONS' : 'COLLABORATIVE DISCUSSIONS & ACTIVITY'}
              </h3>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {notes.map((note: any, index: number) => {
                  const noteContent = typeof note === 'string' ? note : note.content
                  const noteUser = typeof note === 'string' ? null : note
                  const noteTime = noteUser?.created_at ? new Date(noteUser.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
                  
                  return (
                    <motion.div
                      key={noteUser?.id || index}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-start gap-3"
                    >
                      {/* Avatar */}
                      {noteUser?.avatar_url ? (
                        <img src={noteUser.avatar_url} className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {noteUser?.user_name?.charAt(0) || 'OP'}
                        </div>
                      )}

                      {/* Chat Bubble Layout */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-black text-white/95">{noteUser?.user_name || 'Operator'}</span>
                          <span className="text-[9px] font-mono text-zinc-500">{noteTime}</span>
                        </div>
                        
                        <div className="mt-1 flex items-start justify-between gap-3 p-3 border bg-zinc-900/20 border-white/5 rounded-xl rounded-tl-none">
                          <p className="text-xs text-white/80 leading-relaxed font-space break-words flex-1">
                            {noteContent}
                          </p>
                          <button
                            onClick={() => handleDeleteNote(noteUser?.id, index)}
                            className="p-1 text-white/20 hover:text-red-400 transition-colors shrink-0"
                            title="DELETE"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              {notes.length === 0 && (
                <div className="text-center py-6 text-white/25 text-[10px] font-space tracking-widest uppercase">
                  {isRTL ? 'لا توجد مناقشات بعد' : 'NO DEBATES RECORDED // SECURE CHANNEL'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. STICKY INPUT FOOTER AT BOTTOM */}
        <div className="p-4 border-t border-white/5 bg-zinc-950/60 shrink-0 space-y-3 relative">
          <form onSubmit={handleAddNote} className="flex flex-col gap-2.5">
            <div className="relative flex items-center bg-zinc-900/60 border border-white/5 rounded-xl focus-within:border-white/15 px-3 py-2">
              <textarea
                ref={textareaRef}
                value={noteInput}
                onChange={e => handleNoteInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isRTL ? 'اكتب تعليقاً أو فكرة...' : 'Secure transmission / enter message...'}
                className="flex-grow bg-transparent border-none outline-none focus:ring-0 text-xs text-white placeholder-white/20 resize-none max-h-16 font-space pr-12"
                rows={1}
              />
              
              {/* Sticky bar actions */}
              <div className="absolute right-3 flex items-center gap-2 text-zinc-500">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="hover:text-white transition-colors cursor-pointer"
                  title="EMOJI"
                >
                  <Smile className="w-4 h-4" style={{ color: showEmojiPicker ? themeColor : 'inherit' }} />
                </button>
                {isSquad && squadMembers && squadMembers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const textarea = textareaRef.current
                      if (textarea) {
                        const start = textarea.selectionStart
                        const text = textarea.value
                        const newText = text.substring(0, start) + '@' + text.substring(start)
                        handleNoteInputChange(newText)
                        setTimeout(() => {
                          textarea.focus()
                          textarea.selectionStart = textarea.selectionEnd = start + 1
                        }, 0)
                      }
                    }}
                    className="hover:text-white transition-colors cursor-pointer"
                    title="MENTION"
                  >
                    <AtSign className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!noteInput.trim()}
                  className="p-1.5 rounded-lg text-black transition-all disabled:opacity-30 cursor-pointer"
                  style={{ backgroundColor: noteInput.trim() ? themeColor : 'transparent', color: noteInput.trim() ? '#000000' : 'inherit' }}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Mentions Dropdown Popover */}
            {showMentionsDropdown && filteredMembers.length > 0 && (
              <div className="absolute bottom-full mb-2 left-3 bg-zinc-950/95 border border-white/10 rounded-xl max-h-48 overflow-y-auto w-56 shadow-2xl p-1 z-50 backdrop-blur-md">
                <div className="text-[8px] font-mono tracking-[0.2em] font-black uppercase text-zinc-500 px-3 py-1.5 border-b border-white/5 mb-1">
                  {isRTL ? 'إشارة إلى عضو // SQUAD_MEMBERS' : 'MENTION SQUAD MEMBER'}
                </div>
                {filteredMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => insertMention(member)}
                    className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer group"
                  >
                    {member.avatar_url ? (
                      <img src={member.avatar_url} className="w-6 h-6 rounded-full object-cover border border-white/10" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                        {member.full_name?.charAt(0) || member.user_name?.charAt(0) || 'OP'}
                      </div>
                    )}
                    <span className="text-xs text-white/80 group-hover:text-white font-space font-semibold uppercase">{member.full_name || member.user_name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Emoji Picker Popover */}
            {showEmojiPicker && (
              <div className="absolute bottom-full mb-2 right-3 bg-zinc-950/95 border border-white/10 rounded-xl shadow-2xl p-2.5 z-50 max-w-[240px] backdrop-blur-md">
                <div className="text-[8px] font-mono tracking-[0.2em] font-black uppercase text-zinc-500 px-1 py-1 border-b border-white/5 mb-2">
                  {isRTL ? 'اختر رمز تعبيري // SELECT_EMOJI' : 'SELECT EMOJI'}
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {['⚡', '☕', '🔥', '🚀', '🎯', '👾', '💻', '🧠', '✅', '❌', '👍', '😂', '🎉', '👀', '✨', '🙌', '💯', '❤️'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="w-8 h-8 text-sm hover:bg-white/15 active:scale-90 transition-all rounded-lg flex items-center justify-center cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono text-zinc-500">
                {isRTL ? 'اضغط Enter للإرسال' : 'PRESS ENTER TO SEND // SHIFT+ENTER FOR NEW LINE'}
              </span>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
