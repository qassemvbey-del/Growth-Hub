'use client'

import React, { useState, FormEvent, KeyboardEvent, useEffect, useRef, useCallback } from 'react'
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
import { cn } from '@/lib/utils'

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
    const parts = text.split(/(@\S+)/g)
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="text-cyan-400 font-bold font-space" style={{ textShadow: `0 0 8px ${themeColor}44` }}>
            {part}
          </span>
        )
      }
      return part
    })
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

  const [noteInput, setNoteInput] = useState('')
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showMentionsDropdown, setShowMentionsDropdown] = useState(false)
  const [mentionsSearch, setMentionsSearch] = useState('')
  const [filteredMembers, setFilteredMembers] = useState<any[]>([])
  const [selectedMentions, setSelectedMentions] = useState<Set<string>>(new Set())
  const [activeReactionPicker, setActiveReactionPicker] = useState<string | number | null>(null)
  const [mentionPickerMode, setMentionPickerMode] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // --- NOTIFICATION SENDER ---
  const sendNotification = useCallback(async (
    targetUserId: string,
    type: 'mention' | 'reaction',
    title: string,
    contentText: string
  ) => {
    if (!targetUserId || targetUserId === currentUserId) return
    try {
      const supabase = createClient()
      await supabase.from('inbox_reports').insert({
        user_id: targetUserId,
        type: 'daily_brief',
        title,
        content: {
          text: contentText,
          notification_type: type,
          task_id: task?.id,
          task_title: task?.title,
          sender_id: currentUserId,
          sender_name: profile?.full_name || 'Operator'
        }
      })
    } catch (err) {
      console.error('Failed to send notification:', err)
    }
  }, [currentUserId, profile?.full_name, task?.id, task?.title])

  // Click outside to dismiss Emoji Picker, Mentions Dropdown, and Reaction Picker
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
      // Close reaction picker when clicking outside
      if (activeReactionPicker !== null) {
        const clickedInsideReaction = target.closest('.reaction-picker-panel')
        const clickedReactBtn = target.closest('.react-trigger-btn')
        if (!clickedInsideReaction && !clickedReactBtn) {
          setActiveReactionPicker(null)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [showEmojiPicker, showMentionsDropdown, activeReactionPicker])

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

  const handleAddNote = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    if (!noteInput.trim()) return

    const rawText = noteInput.trim()
    const mentionIds = Array.from(selectedMentions)
    const mentionTags = mentionIds.map(memberId => {
      const member = squadMembers.find(m => m.id === memberId)
      return member ? `@${member.full_name || member.user_name}` : ''
    }).filter(Boolean).join(' ')
    
    const noteText = mentionTags ? `${rawText} ${mentionTags}` : rawText
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    // Build mentions list from selectedMentions + inline @mentions
    const mentionedIds = new Set<string>(selectedMentions)
    // Also parse inline @Name mentions
    const mentionRegex = /@([\w\s]+?)(?=\s@|$|\s[^@])/g
    let match
    while ((match = mentionRegex.exec(noteText)) !== null) {
      const mentionedName = match[1].trim().toLowerCase()
      const found = squadMembers.find(m => 
        (m.full_name || '').toLowerCase() === mentionedName ||
        (m.user_name || '').toLowerCase() === mentionedName
      )
      if (found) mentionedIds.add(found.id)
    }

    const newLocalNote = {
      id: `note_${Date.now()}`,
      content: noteText,
      created_at: new Date().toISOString(),
      user_id: user?.id || null,
      user_name: profile?.full_name || (user ? squadMembers.find(m => m.id === user.id)?.full_name : null) || 'Operator',
      avatar_url: profile?.avatar_url || (user ? squadMembers.find(m => m.id === user.id)?.avatar_url : null) || null,
      mentioned_ids: Array.from(mentionedIds)
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

      // Send mention notifications to all mentioned users
      const senderName = profile?.full_name || 'Operator'
      for (const mentionedId of mentionedIds) {
        if (mentionedId !== user.id) {
          const mentionedMember = squadMembers.find(m => m.id === mentionedId)
          const notifTitle = isRTL
            ? `💬 ${senderName} ذكرك في تعليق`
            : `💬 ${senderName} mentioned you`
          const notifContent = isRTL
            ? `${senderName} ذكرك في تعليق على مهمة "${task.title}": "${noteText.substring(0, 100)}${noteText.length > 100 ? '...' : ''}"`
            : `${senderName} mentioned you in a comment on task "${task.title}": "${noteText.substring(0, 100)}${noteText.length > 100 ? '...' : ''}"`
          await sendNotification(mentionedId, 'mention', notifTitle, notifContent)
        }
      }
    }

    await updateTask(task.id, { metadata: updatedMetadata })
    setNoteInput('')
    setSelectedMentions(new Set())
    setMentionPickerMode(false)
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
                  updateTask(task.id, { title: taskTitle.trim() })
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
                {isRTL ? 'المسؤول' : 'ASSIGNED TO'}
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
                    
                    {/* Only owner can unassign */}
                    {(currentUserId === missionOwnerId) && (
                    <button
                      type="button"
                      onClick={() => updateTask(task.id, { assigned_to: null, assignee: null })}
                      className="px-3 py-1.5 border border-red-500/30 hover:border-red-500 hover:bg-red-500/10 text-red-400 hover:text-red-300 font-black tracking-widest text-[9px] uppercase rounded-lg transition-colors cursor-pointer"
                    >
                      {isRTL ? 'إلغاء التعيين' : 'UNASSIGN'}
                    </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-white/[0.01] border border-dashed border-white/10 p-4 rounded-xl w-full text-center text-white/40 text-xs font-space">
                    <span>{isRTL ? 'المهمة غير معينة لأي عضو' : 'No one assigned yet'}</span>
                  </div>
                )}
                
                {/* Only owner can assign */}
                {(currentUserId === missionOwnerId) && (
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest font-mono text-zinc-500">
                    {isRTL ? 'تعيين عضو:' : 'Assign to:'}
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
                            updateTask(task.id, {
                              assigned_to: member.id,
                              assignee: {
                                id: member.id,
                                full_name: member.full_name,
                                avatar_url: member.avatar_url,
                                rank: member.rank
                              }
                            })
                            
                            // Send custom assignee notification
                            if (member.id !== currentUserId) {
                              const senderName = profile?.full_name || 'Operator'
                              const notifTitle = isRTL
                                ? `👤 تم تعيين مهمة جديدة لك`
                                : `👤 New task assigned to you`
                              const notifContent = isRTL
                                ? `${senderName} قام بتعيين مهمة "${task.title}" لك`
                                : `${senderName} assigned you to the task "${task.title}"`
                              sendNotification(member.id, 'reaction', notifTitle, notifContent)
                            }
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
                )}
              </div>
            </div>
          )}

          {/* C. TASK DESCRIPTION SECTION */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">
              {isRTL ? 'وصف المهمة' : 'TASK DESCRIPTION'}
            </h3>
            <div className="border border-white/5 rounded-xl overflow-hidden bg-zinc-950/40">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => {
                  if (description !== task.description) {
                    updateTask(task.id, { description })
                  }
                }}
                className="w-full min-h-[120px] bg-transparent border-none p-4 font-space text-sm text-white outline-none focus:ring-0 placeholder-white/20 resize-y"
                placeholder={isRTL ? "أضف وصفاً..." : "Add a description..."}
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
          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" style={{ color: themeColor }} />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">
                {isRTL ? 'التعليقات' : 'COMMENTS'}
              </h3>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {notes.map((note: any, index: number) => {
                  const noteContent = typeof note === 'string' ? note : note.content
                  const noteUser = typeof note === 'string' ? null : note
                  const noteTime = noteUser?.created_at ? new Date(noteUser.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
                  const noteKey = noteUser?.id || index
                  
                  return (
                    <motion.div
                      key={noteKey}
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
                          <span className="text-xs font-black text-white/95">{noteUser?.user_name || 'User'}</span>
                          <span className="text-[9px] font-mono text-zinc-500">{noteTime}</span>
                        </div>
                        
                        <div className="mt-1 flex items-start justify-between gap-3 p-3 border bg-zinc-900/20 border-white/5 rounded-xl rounded-tl-none">
                          <p className="text-xs text-white/80 leading-relaxed font-space break-words flex-1">
                            {formatNoteContent(noteContent)}
                          </p>
                          <button
                            onClick={() => handleDeleteNote(noteUser?.id, index)}
                            className="p-1 text-white/20 hover:text-red-400 transition-colors shrink-0"
                            title="DELETE"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Note Actions & Reactions */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 px-1">
                          {/* Active reactions list */}
                          {noteUser?.reactions && Object.entries(noteUser.reactions).map(([emoji, userIds]: [string, any]) => {
                            if (!Array.isArray(userIds) || userIds.length === 0) return null
                            const hasReacted = currentUserId ? userIds.includes(currentUserId) : false
                            return (
                              <button
                                key={emoji}
                                onClick={() => handleToggleReaction(noteUser.id || index, emoji)}
                                className={cn(
                                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border transition-all duration-300 font-space cursor-pointer",
                                  hasReacted
                                    ? "bg-teal-500/10 border-teal-500/40 text-teal-400 font-bold"
                                    : "bg-white/5 border-white/5 text-white/50 hover:text-white hover:border-white/10"
                                )}
                              >
                                <span>{emoji}</span>
                                <span>{userIds.length}</span>
                              </button>
                            )
                          })}

                          {/* Add Reaction Button - Click based */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setActiveReactionPicker(activeReactionPicker === noteKey ? null : noteKey)}
                              className="react-trigger-btn flex items-center justify-center p-1 rounded-full text-white/30 hover:text-white/70 hover:bg-white/5 transition-all text-[10px] cursor-pointer"
                              title="React"
                            >
                              <Smile className="w-3 h-3" />
                            </button>
                            
                            {/* Click-based Reaction Panel */}
                            <AnimatePresence>
                              {activeReactionPicker === noteKey && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.9 }}
                                  transition={{ duration: 0.12 }}
                                  className="reaction-picker-panel absolute bottom-full left-0 mb-1 flex items-center gap-1.5 p-1.5 bg-zinc-950/95 border border-white/10 rounded-full shadow-2xl z-30 backdrop-blur-md"
                                >
                                  {['👍', '❤️', '😂', '🎉', '😢', '🔥'].map((emoji) => (
                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={() => {
                                        handleToggleReaction(noteUser?.id || index, emoji)
                                        setActiveReactionPicker(null)
                                      }}
                                      className="w-7 h-7 flex items-center justify-center text-sm hover:bg-white/10 active:scale-75 transition-all rounded-full cursor-pointer"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              {notes.length === 0 && (
                <div className="text-center py-6 text-white/25 text-[10px] font-space tracking-widest uppercase">
                  {isRTL ? 'لا توجد تعليقات بعد' : 'No comments yet'}
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
                placeholder={isRTL ? 'اكتب تعليقاً...' : 'Write a comment...'}
                className="flex-grow bg-transparent border-none outline-none focus:ring-0 text-xs text-white placeholder-white/20 resize-none max-h-16 font-space pr-12"
                rows={1}
              />
              
              {/* Sticky bar actions */}
              <div className="absolute right-3 flex items-center gap-2 text-zinc-500">
                <button
                  type="button"
                  onClick={() => { setShowEmojiPicker(!showEmojiPicker); setMentionPickerMode(false) }}
                  className="hover:text-white transition-colors cursor-pointer"
                  title="EMOJI"
                >
                  <Smile className="w-4 h-4" style={{ color: showEmojiPicker ? themeColor : 'inherit' }} />
                </button>
                {isSquad && squadMembers && squadMembers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setMentionPickerMode(!mentionPickerMode)
                      setShowEmojiPicker(false)
                      setShowMentionsDropdown(false)
                    }}
                    className="relative hover:text-white transition-colors cursor-pointer"
                    title="MENTION"
                  >
                    <AtSign className="w-4 h-4" style={{ color: mentionPickerMode ? themeColor : 'inherit' }} />
                    {selectedMentions.size > 0 && (
                      <span 
                        className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] rounded-full text-[8px] font-black flex items-center justify-center text-black"
                        style={{ backgroundColor: themeColor }}
                      >
                        {selectedMentions.size}
                      </span>
                    )}
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

            {/* Selected mentions tags */}
            {selectedMentions.size > 0 && (
              <div className="flex flex-wrap gap-1.5 px-1">
                {Array.from(selectedMentions).map(memberId => {
                  const member = squadMembers.find(m => m.id === memberId)
                  if (!member) return null
                  return (
                    <span
                      key={memberId}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-space border transition-all"
                      style={{ backgroundColor: `${themeColor}15`, borderColor: `${themeColor}40`, color: themeColor }}
                    >
                      @{member.full_name || member.user_name}
                      <button
                        type="button"
                        onClick={() => {
                          const next = new Set(selectedMentions)
                          next.delete(memberId)
                          setSelectedMentions(next)
                        }}
                        className="ml-0.5 hover:opacity-70 cursor-pointer"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}

            {/* Mention Picker Dropdown (multi-select with Select All) */}
            <AnimatePresence>
              {mentionPickerMode && squadMembers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15 }}
                  className="mentions-dropdown-container absolute bottom-full mb-2 left-3 right-3 bg-zinc-950/98 border border-white/10 rounded-xl max-h-64 overflow-y-auto shadow-2xl p-1.5 z-50 backdrop-blur-xl"
                >
                  <div className="text-[8px] font-mono tracking-[0.2em] font-black uppercase text-zinc-500 px-3 py-1.5 border-b border-white/5 mb-1 flex items-center justify-between">
                    <span>{isRTL ? 'اختر أعضاء للإشارة' : 'SELECT MEMBERS TO MENTION'}</span>
                    <span className="text-[9px]" style={{ color: themeColor }}>{selectedMentions.size}/{squadMembers.length}</span>
                  </div>

                  {/* Select All / Deselect All */}
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedMentions.size === squadMembers.length) {
                        setSelectedMentions(new Set())
                      } else {
                        setSelectedMentions(new Set(squadMembers.map(m => m.id)))
                      }
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer group border-b border-white/5 mb-1"
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      selectedMentions.size === squadMembers.length
                        ? 'border-teal-500 bg-teal-500'
                        : selectedMentions.size > 0
                          ? 'border-teal-500/50 bg-teal-500/20'
                          : 'border-white/20 bg-transparent'
                    }`}>
                      {selectedMentions.size === squadMembers.length && <Check className="w-3 h-3 text-black stroke-[3px]" />}
                      {selectedMentions.size > 0 && selectedMentions.size < squadMembers.length && (
                        <div className="w-2 h-0.5 bg-teal-400 rounded-full" />
                      )}
                    </div>
                    <span className="text-xs font-space font-black uppercase tracking-wider" style={{ color: themeColor }}>
                      {selectedMentions.size === squadMembers.length
                        ? (isRTL ? 'إلغاء تحديد الكل' : 'DESELECT ALL')
                        : (isRTL ? 'تحديد الكل' : 'SELECT ALL')}
                    </span>
                  </button>

                  {squadMembers.map((member) => {
                    const isSelected = selectedMentions.has(member.id)
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => {
                          const next = new Set(selectedMentions)
                          if (isSelected) {
                            next.delete(member.id)
                          } else {
                            next.add(member.id)
                          }
                          setSelectedMentions(next)
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2.5 transition-all cursor-pointer group ${
                          isSelected ? 'bg-white/[0.04]' : 'hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                          isSelected ? 'border-teal-500 bg-teal-500' : 'border-white/20 bg-transparent'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-black stroke-[3px]" />}
                        </div>
                        {member.avatar_url ? (
                          <img src={member.avatar_url} className="w-6 h-6 rounded-full object-cover border border-white/10" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                            {member.full_name?.charAt(0) || member.user_name?.charAt(0) || 'OP'}
                          </div>
                        )}
                        <span className={`text-xs font-space font-semibold uppercase truncate ${
                          isSelected ? 'text-white' : 'text-white/60 group-hover:text-white/80'
                        }`}>
                          {member.full_name || member.user_name}
                        </span>
                        {isSelected && (
                          <AtSign className="w-3 h-3 ml-auto shrink-0" style={{ color: themeColor }} />
                        )}
                      </button>
                    )
                  })}

                  {/* Done button */}
                  <div className="pt-1.5 mt-1 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => setMentionPickerMode(false)}
                      className="w-full py-2 rounded-lg text-[10px] font-black font-space uppercase tracking-widest transition-all cursor-pointer text-black"
                      style={{ backgroundColor: themeColor }}
                    >
                      {isRTL ? `تم (${selectedMentions.size})` : `DONE (${selectedMentions.size} SELECTED)`}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Inline Mentions Dropdown (triggered by typing @) */}
            {showMentionsDropdown && !mentionPickerMode && filteredMembers.length > 0 && (
              <div className="mentions-dropdown-container absolute bottom-full mb-2 left-3 bg-zinc-950/95 border border-white/10 rounded-xl max-h-48 overflow-y-auto w-56 shadow-2xl p-1 z-50 backdrop-blur-md">
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
                {isRTL ? 'Enter للإرسال · Shift+Enter لسطر جديد' : 'Enter to send · Shift+Enter for new line'}
              </span>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
