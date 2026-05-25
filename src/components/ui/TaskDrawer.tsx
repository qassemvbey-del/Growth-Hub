'use client'

import React, { useState, FormEvent, KeyboardEvent, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGrowth } from '@/context/GrowthContext'
import { createClient } from '@/lib/supabase'
import { usePomodoro } from '@/context/PomodoroContext'
import SmartTaskPlayer from './SmartTaskPlayer'
import { 
  X, ChevronDown, ChevronUp, Check, Calendar, Lock, Zap, Plus, 
  Trash2, Loader2, RefreshCw, FolderOpen, Paperclip, ExternalLink, StickyNote 
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
  const { isRTL, t, addXp } = useGrowth()
  const { startFocus } = usePomodoro()
  const [activeTab, setActiveTab] = useState<'details' | 'time' | 'notes' | 'attachments'>('details')
  const [taskTitle, setTaskTitle] = useState(task.title || '')
  useEffect(() => {
    setTaskTitle(task.title || '')
  }, [task.title, task.id])

  // --- DATE STATE ---
  const [startDate, setStartDate] = useState<string>(task.metadata?.startDate || '')
  const [endDate, setEndDate] = useState<string>(task.metadata?.endDate || '')

  // Sync dates if the task changes (e.g. drawer reopened for a different task)
  useEffect(() => {
    setStartDate(task.metadata?.startDate || '')
    setEndDate(task.metadata?.endDate || '')
  }, [task.id, task.metadata?.startDate, task.metadata?.endDate])

  // --- MANUAL LINK STATE for Attachments tab ---
  const [showManualLink, setShowManualLink] = useState(false)
  const [manualLinkName, setManualLinkName] = useState('')
  const [manualLinkUrl, setManualLinkUrl] = useState('')
  const [isAddingLink, setIsAddingLink] = useState(false)
  const [isDriveConnected, setIsDriveConnected] = useState(false)

  // Check for a valid cached Drive token on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('gd_access_token')
    const expiry = parseInt(localStorage.getItem('gd_expires_at') || '0', 10)
    if (token && Date.now() < expiry) setIsDriveConnected(true)
  }, [])

  const [noteInput, setNoteInput] = useState('')

  // Supabase Sync description state
  const [description, setDescription] = useState(task.description || '')
  useEffect(() => {
    setDescription(task.description || '')
  }, [task.description, task.id])

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

  // Google API & Picker Loading States
  const [gapiLoaded, setGapiLoaded] = useState(false)
  const [pickerApiLoaded, setPickerApiLoaded] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if script is already present
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

    // Load gsi client for OAuth token client
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

  // ─── DRIVE TOKEN CACHE KEYS ───────────────────────────────────────────────
  const DRIVE_TOKEN_KEY = 'gd_access_token'
  const DRIVE_EXPIRY_KEY = 'gd_expires_at'

  // Returns a valid cached token or null
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

    // ── 1. Try cached token first ──────────────────────────────────────────
    const cached = getCachedToken()
    if (cached) {
      createPicker(cached)
      return
    }

    // ── 2. Try silent renewal (no UI prompt) ──────────────────────────────
    const tryAuth = (prompt: string, fallback?: () => void) => {
      try {
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/drive.readonly',
          callback: (response: any) => {
            if (response.error !== undefined) {
              // Silent renewal failed — try interactive if we have a fallback
              if (fallback) { fallback(); return }
              console.error("OAuth error:", response.error)
              return
            }
            cacheToken(response.access_token)
            createPicker(response.access_token)
          },
          error_callback: (err: any) => {
            // prompt:'none' failed (no active session) — fall back to interactive
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

    // Silent first, interactive as fallback
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

            // Detect type
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

  // ─── MANUAL LINK HANDLER ─────────────────────────────────────────────────
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

  if (!task) return null

  const videoId = task.video_id || getYouTubeId(task.video_url || '')
  const hasVideo = !!videoId

  // Stored local video details
  const storedProgress = typeof window !== 'undefined' ? parseFloat(localStorage.getItem(`growth_hub_video_progress_${task.id}`) || '0') : 0
  const storedDuration = typeof window !== 'undefined' ? parseFloat(localStorage.getItem(`growth_hub_video_duration_${task.id}`) || '0') : 0
  const videoProgress = task.video_progress ?? storedProgress
  const videoDuration = task.video_duration ?? storedDuration

  const formatVideoTime = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = Math.floor(secs % 60)
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${m}:${String(s).padStart(2, '0')}`
  }

  // Underline Tabs using dynamic translations
  const tabs = [
    { id: 'details', label: t('details') },
    { id: 'time', label: t('time') },
    { id: 'notes', label: t('notes') },
    { id: 'attachments', label: t('attachments') },
  ]

  const notes = task.metadata?.notes || []

  const handleAddNote = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    if (!noteInput.trim()) return

    const noteText = noteInput.trim()
    const newLocalNote = {
      content: noteText,
      created_at: new Date().toISOString(),
      cup_id: task.cup_id || null,
      task_id: task.id || null
    }

    const updatedNotes = [newLocalNote, ...notes]
    const updatedMetadata = { ...task.metadata, notes: updatedNotes }

    if (!isGuest) {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
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
        }
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

  const handleDeleteNote = async (index: number) => {
    const noteToDelete = notes[index]
    const updatedNotes = notes.filter((_: any, i: number) => i !== index)
    const updatedMetadata = { ...task.metadata, notes: updatedNotes }

    if (!isGuest && noteToDelete) {
      try {
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
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.01]">
          <div className="flex-1 min-w-0">
            <span 
              className="text-[10px] uppercase font-space tracking-widest font-black"
              style={{ color: themeColor }}
            >
              {t('taskDetail')}
            </span>
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
              className="text-2xl font-bold font-space text-[#FFFFFF] tracking-tight uppercase bg-transparent w-full border-none focus:outline-none focus:ring-0 p-0 mt-1"
              placeholder={isRTL ? "اسم المهمة..." : "Task Name..."}
            />
          </div>
          
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center border border-white/10 hover:border-white/20 bg-white/[0.02] text-[var(--text-secondary)] hover:text-white transition-all shrink-0 ml-4 cursor-pointer"
            title="CLOSE"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Underline Tab Navigation - Strictly labeled in Arabic */}
        <div className="grid grid-cols-4 w-full border-b border-white/5 bg-zinc-950/40 px-1 relative shrink-0">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 text-center text-base font-space font-bold transition-all relative cursor-pointer ${
                  isActive
                    ? 'text-[#FFFFFF]'
                    : 'text-[var(--text-secondary)] hover:text-white/80'
                }`}
                style={isActive ? { color: themeColor } : {}}
              >
                <span className="relative z-10">{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeUnderlineIndicator"
                    className="absolute bottom-0 left-0 right-0 h-[2px] z-20"
                    style={{ backgroundColor: themeColor, boxShadow: `0 2px 8px ${themeColor}` }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Real-time Workspace Presence and Scrollable Content Wrapper */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Dynamic Content Panel based on Underline Tabs */}
          <div className="mt-4">
            {activeTab === 'details' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* 1. STATUS & COMPLEXITY */}
                <div className="p-5 border border-white/5 bg-zinc-900/40 rounded-xl space-y-4">
                  <h3 className="text-base font-bold text-white/90 font-space tracking-wide uppercase border-b border-white/5 pb-2">
                    {t('statusComplexity')}
                  </h3>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex flex-col space-y-1.5">
                      <span className="text-xs text-white/40 uppercase">{t('currentStatus')}</span>
                      <span className="text-base font-bold font-space flex items-center gap-1.5" style={{ color: task.is_completed ? '#10B981' : themeColor }}>
                        <span className={`w-2.5 h-2.5 rounded-full ${task.is_completed ? 'bg-emerald-500' : 'bg-amber-500'}`} style={!task.is_completed ? { backgroundColor: themeColor } : {}} />
                        {task.is_completed 
                          ? t('completed') 
                          : t('inProgress')}
                      </span>
                    </div>
                    <div className="flex flex-col space-y-1.5">
                      <span className="text-xs text-white/40 uppercase">{t('taskWeight')}</span>
                      <span className="text-base font-mono font-bold" style={{ color: themeColor }}>
                        ⚡ {task.weight || 1} / 6
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. ASSIGNEE SECTION (Squad Goals Only) */}
                {isSquad && squadMembers && squadMembers.length > 0 && (
                  <div className="p-5 border border-white/5 bg-zinc-900/40 rounded-xl space-y-4">
                    <h3 className="text-base font-bold text-white/90 font-space tracking-wide uppercase border-b border-white/5 pb-2">
                      {isRTL ? 'المنفذ المسؤول // ASSIGNEE' : 'OPERATOR ASSIGNMENT // ASSIGNEE'}
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
 ?"bg-teal-500/10 border-teal-500/50 text-[#14b8a6]"
 :"bg-white/[0.01] border-white/5 hover:border-white/15 text-zinc-400 hover:text-white"
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


              </motion.div>
            )}

            {activeTab === 'time' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Section Header */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${themeColor}15`, border: `1px solid ${themeColor}30` }}
                  >
                    <Calendar className="text-base w-4 h-4" style={{ color: themeColor }} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black font-space uppercase tracking-widest text-white/90">
                      {isRTL ? 'تواريخ المهمة' : 'TASK_TIMELINE'}
                    </h4>
                    <p className="text-[10px] text-white/40 font-mono mt-0.5">
                      {isRTL ? 'تغيير التواريخ المحددة يكلف 5 XP' : 'Changing established dates costs 5 XP'}
                    </p>
                  </div>
                </div>

                {/* Date Inputs */}
                <div className="grid grid-cols-1 gap-4">
                  {/* START DATE */}
                  {(() => {
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    const parsedStart = startDate ? new Date(startDate) : null
                    // Lock start date if it was set AND today >= startDate
                    const isStartLocked = !!(parsedStart && today >= parsedStart)

                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black uppercase tracking-widest font-mono" style={{ color: themeColor }}>
                            {isRTL ? '📅 تاريخ البدء' : '📅 START_DATE'}
                          </label>
                          {isStartLocked && (
                            <span className="flex items-center gap-1 text-[9px] font-mono text-amber-500/80 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                              <Lock className="text-[10px]" />
                              {isRTL ? 'مقفل' : 'LOCKED'}
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            type="date"
                            value={startDate}
                            disabled={isStartLocked}
                            onChange={async (e) => {
                              const newVal = e.target.value
                              const prevVal = startDate
                              // XP penalty only if overwriting an existing date
                              if (prevVal) {
                                const confirmed = window.confirm(
                                  isRTL
                                    ? '⚠️ تغيير موعد محدد مسبقاً يكلف 5 XP. هل تريد المتابعة؟'
                                    : '⚠️ Changing an established deadline costs 5 XP. Do you want to proceed?'
                                )
                                if (!confirmed) {
                                  // Revert — reset state back to previous value
                                  setStartDate(prevVal)
                                  e.target.value = prevVal
                                  return
                                }
                                await addXp(-5)
                              }
                              setStartDate(newVal)
                              const updatedMetadata = { ...task.metadata, startDate: newVal }
                              await onUpdateTask(task.id, { metadata: updatedMetadata })
                            }}
                            className="w-full bg-zinc-900/70 border rounded-xl px-4 py-3.5 text-base font-space font-bold text-white outline-none transition-all
 disabled:opacity-40 disabled:cursor-not-allowed
 [color-scheme:dark]
 [&::-webkit-calendar-picker-indicator]:opacity-40
 [&::-webkit-calendar-picker-indicator]:invert
 [&::-webkit-calendar-picker-indicator]:cursor-pointer
 focus:ring-0"
                            style={{
                              borderColor: isStartLocked ? 'rgba(245,158,11,0.25)' : `${themeColor}30`,
                              boxShadow: isStartLocked ? '0 0 8px rgba(245,158,11,0.08)' : `0 0 8px ${themeColor}08`
                            }}
                          />
                        </div>
                        {isStartLocked && (
                          <p className="text-[10px] font-mono text-amber-500/60 px-1">
                            {isRTL
                              ? '🔒 لقد مرّ تاريخ البدء — لا يمكن التعديل.'
                              : '🔒 Start date has passed — field is locked.'}
                          </p>
                        )}
                      </div>
                    )
                  })()}

                  {/* END DATE */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase tracking-widest font-mono text-red-400/80">
                        {isRTL ? '🎯 الموعد النهائي' : '🎯 END_DATE / DEADLINE'}
                      </label>
                      {endDate && (() => {
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        const parsedEnd = new Date(endDate)
                        const daysLeft = Math.ceil((parsedEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                        const isOverdue = daysLeft < 0
                        const isUrgent = daysLeft >= 0 && daysLeft <= 3
                        return (
                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
 isOverdue
 ? 'text-red-400 bg-red-500/10 border-red-500/20'
 : isUrgent
 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
 : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
 }`}>
                            {isOverdue
                              ? (isRTL ? `متأخر ${Math.abs(daysLeft)} يوم` : `${Math.abs(daysLeft)}d OVERDUE`)
                              : isUrgent
                                ? (isRTL ? `${daysLeft} أيام متبقية` : `${daysLeft}d LEFT ⚠️`)
                                : (isRTL ? `${daysLeft} يوم متبقي` : `${daysLeft}d remaining`)}
                          </span>
                        )
                      })()}
                    </div>
                    <div className="relative">
                      <input
                        type="date"
                        value={endDate}
                        onChange={async (e) => {
                          const newVal = e.target.value
                          const prevVal = endDate
                          if (prevVal) {
                            const confirmed = window.confirm(
                              isRTL
                                ? '⚠️ تغيير موعد محدد مسبقاً يكلف 5 XP. هل تريد المتابعة؟'
                                : '⚠️ Changing an established deadline costs 5 XP. Do you want to proceed?'
                            )
                            if (!confirmed) {
                              setEndDate(prevVal)
                              e.target.value = prevVal
                              return
                            }
                            await addXp(-5)
                          }
                          setEndDate(newVal)
                          const updatedMetadata = { ...task.metadata, endDate: newVal }
                          await onUpdateTask(task.id, { metadata: updatedMetadata })
                        }}
                        className="w-full bg-zinc-900/70 border border-red-500/20 rounded-xl px-4 py-3.5 text-base font-space font-bold text-white outline-none transition-all focus:border-red-500/40 focus:shadow-[0_0_8px_rgba(239,68,68,0.12)] [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-40 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer focus:ring-0"
                      />
                    </div>
                  </div>
                </div>

                {/* XP Warning Banner */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-500/5 border border-orange-500/15">
                  <Zap className="w-3.5 h-3.5 text-orange-500/70 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-mono text-white/40 leading-relaxed">
                    {isRTL
                      ? 'تحذير: تعديل التواريخ بعد تحديدها يُقلّص نقاط XP بمقدار 5. ضبط التواريخ لأول مرة مجاني.'
                      : 'WARNING: Modifying established dates deducts 5 XP. Setting dates for the first time is free.'}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Arabic Notes Console with reactive state retention */}
            {activeTab === 'notes' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <form onSubmit={handleAddNote} className="space-y-3">
                  <textarea
                    value={noteInput}
                    onChange={e => setNoteInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('writeNotePlaceholder')}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    className="w-full min-h-[200px] bg-zinc-900/60 border border-white/5 p-4 font-space text-base rounded-xl text-white outline-none transition-all focus:border-white/10 placeholder-white/30 resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!noteInput.trim()}
                      className="px-4 py-2 rounded-lg text-[10px] font-space font-black uppercase tracking-wider cursor-pointer transition-all border disabled:opacity-30 flex items-center gap-1 hover:scale-105"
                      style={{
                        backgroundColor: !noteInput.trim() ? 'transparent' : themeColor,
                        borderColor: themeColor,
                        color: !noteInput.trim() ? themeColor : '#000000',
                        boxShadow: !noteInput.trim() ? 'none' : `0 0 10px ${themeColor}40`
                      }}
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3px]" />
                      {t('addNote')}
                    </button>
                  </div>
                </form>

                {/* Render linked notes list */}
                <div className="space-y-2 mt-2">
                  <AnimatePresence initial={false}>
                    {notes.map((note: any, index: number) => {
                      const noteContent = typeof note === 'string' ? note : note.content
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div 
                            className="flex items-start justify-between gap-3 p-3.5 border bg-zinc-900/20 rounded-xl"
                            style={{ borderColor: 'rgba(255, 255, 255, 0.03)' }}
                          >
                            <div className="flex gap-2.5 min-w-0" dir="rtl">
                              <span className="text-base text-white/30 select-none pt-0.5">•</span>
                              <p className="text-base text-white/80 leading-relaxed font-space break-words">
                                {noteContent}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteNote(index)}
                              className="p-1 text-white/30 hover:text-red-400 transition-colors shrink-0 cursor-pointer"
                              title="DELETE"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* Task-Level Google Drive Attachments Tab */}
            {activeTab === 'attachments' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* ── Action Panel ─────────────────────────── */}
                <div className="space-y-2 p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                  {/* Drive Button */}
                  <button
                    onClick={handleGoogleDrivePicker}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 font-space font-black text-xs uppercase tracking-widest text-white/90 bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-white/20 transition-all duration-300 rounded-xl cursor-pointer"
                    style={{ boxShadow: `0 0 0 0 ${themeColor}00` }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 20px ${themeColor}22` }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/Google_Drive_icon_(2020).svg" alt="Drive" className="w-5 h-5 mr-2" />
                    <span>{isDriveConnected ? '[ OPEN ]' : '[ CONNECT ]'}</span>
                  </button>

                  {/* Manual Link accordion */}
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
                          onKeyDown={e => e.key === 'Enter' && handleAddManualLink()}
                          className="w-full bg-zinc-900/80 border border-white/8 py-2.5 px-4 font-space text-xs font-black text-white uppercase tracking-widest outline-none placeholder:text-white/20 transition-all rounded-xl focus:border-white/20"
                        />
                        <div className="flex gap-2">
                          <input
                            type="url"
                            placeholder="HTTPS://..."
                            value={manualLinkUrl}
                            onChange={e => setManualLinkUrl(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddManualLink()}
                            className="flex-1 bg-zinc-900/80 border border-white/8 py-2.5 px-4 font-space text-xs font-black text-white uppercase tracking-widest outline-none placeholder:text-white/20 transition-all rounded-xl focus:border-white/20"
                          />
                          <button
                            onClick={handleAddManualLink}
                            disabled={isAddingLink || !manualLinkName.trim() || !manualLinkUrl.trim()}
                            className="py-2.5 px-4 font-space font-black uppercase tracking-widest text-[10px] text-black transition-all rounded-xl shrink-0 cursor-pointer disabled:opacity-40"
                            style={{ backgroundColor: themeColor, boxShadow: `0 0 16px ${themeColor}44` }}
                          >
                            {isAddingLink
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto text-black" />
                              : (isRTL ? 'إضافة' : 'ADD')}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ── Attachment Cards ──────────────────────────── */}
                {(() => {
                  const attachments: any[] = task.metadata?.attachments || []
                  const typeIcons: Record<string, { icon: React.ComponentType<any>; color: string }> = {
                    pdf:   { icon: StickyNote,   color: '#EF4444' },
                    excel: { icon: StickyNote,   color: '#22C55E' },
                    image: { icon: FolderOpen,   color: '#E2E8F0' },
                    doc:   { icon: StickyNote,   color: '#3B82F6' },
                    video: { icon: ExternalLink, color: '#F97316' },
                    audio: { icon: ExternalLink, color: '#A855F7' },
                    link:  { icon: Paperclip,    color: themeColor },
                  }

                  if (attachments.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-10 gap-3 border border-dashed border-white/5 rounded-xl bg-white/[0.01] text-white/20">
                        <RefreshCw className="w-6 h-6 animate-pulse" style={{ color: themeColor, opacity: 0.25 }} />
                        <span className="text-[10px] font-space tracking-widest uppercase">
                          {isRTL ? 'لا توجد مرفقات بعد' : 'NO ATTACHMENTS SYNCD'}
                        </span>
                      </div>
                    )
                  }

                  return (
                    <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden">
                      <AnimatePresence initial={false}>
                        {attachments.map((att: any, idx: number) => {
                          const typeKey = att.type || 'link'
                          const { icon: IconComponent, color } = typeIcons[typeKey] || typeIcons.link
                          return (
                            <motion.div
                              key={att.id || idx}
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, height: 0 }}
                              className="group flex items-center justify-between gap-3 p-3.5 rounded-xl border bg-zinc-900/30 border-white/5 hover:border-white/10 hover:bg-zinc-900/50 transition-all relative overflow-hidden cursor-pointer"
                              onClick={() => window.open(att.url, '_blank')}
                            >
                              {/* Left accent bar */}
                              <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl" style={{ backgroundColor: color }} />
                              <div className="flex items-center gap-3 min-w-0 pl-1">
                                <IconComponent
                                  className="w-4.5 h-4.5 shrink-0"
                                  style={{ color, filter: `drop-shadow(0 0 5px ${color}44)` }}
                                />
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
                              {/* Bottom accent on hover */}
                              <div
                                className="absolute bottom-0 left-0 h-[1px] w-0 group-hover:w-full transition-all duration-300"
                                style={{ backgroundColor: color }}
                              />
                            </motion.div>
                          )
                        })}
                      </AnimatePresence>
                    </div>
                  )
                })()}
              </motion.div>
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-6 border-t border-white/5 bg-white/[0.01] shrink-0 flex items-center justify-end">
          <button
            onClick={() => {
              onComplete()
              // Close on completion toggled
              onClose()
            }}
            className="px-5 py-2.5 rounded-lg text-xs font-space font-black tracking-wide cursor-pointer transition-all border flex items-center gap-1.5 hover:scale-105"
            style={{
              backgroundColor: task.is_completed ? 'transparent' : themeColor,
              borderColor: themeColor,
              color: task.is_completed ? themeColor : '#000000',
              boxShadow: task.is_completed ? 'none' : `0 0 14px ${themeColor}60`
            }}
          >
            {task.is_completed ? (
              <RefreshCw className="w-3.5 h-3.5" />
            ) : (
              <Check className="w-3.5 h-3.5 stroke-[3px]" />
            )}
            {task.is_completed 
              ? t('markIncomplete') 
              : t('markCompleted')}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
