'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Trash2, Smile, AtSign, Send, Check, X } from 'lucide-react'
import { NeonIcon } from '../NeonIcon'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'

interface TaskDrawerCommentsProps {
  task: any
  notes: any[]
  isRTL: boolean
  themeColor: string
  isSquad: boolean
  squadMembers: any[]
  currentUserId: string | null
  profile: any
  updateTask: (taskId: string, updates: any) => Promise<void> | void
  sendNotification: (targetUserId: string, type: 'mention' | 'reaction', title: string, contentText: string) => Promise<void> | void
  handleDeleteNote: (noteId: string, index: number) => Promise<void> | void
  handleToggleReaction: (noteIdOrIndex: string | number, emoji: string) => Promise<void> | void
  formatNoteContent: (text: string) => React.ReactNode
}

export default function TaskDrawerComments({
  task,
  notes,
  isRTL,
  themeColor,
  isSquad,
  squadMembers,
  currentUserId,
  profile,
  updateTask,
  sendNotification,
  handleDeleteNote,
  handleToggleReaction,
  formatNoteContent
}: TaskDrawerCommentsProps) {
  const [noteInput, setNoteInput] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showMentionsDropdown, setShowMentionsDropdown] = useState(false)
  const [mentionsSearch, setMentionsSearch] = useState('')
  const [filteredMembers, setFilteredMembers] = useState<any[]>([])
  const [selectedMentions, setSelectedMentions] = useState<Set<string>>(new Set())
  const [activeReactionPicker, setActiveReactionPicker] = useState<string | number | null>(null)
  const [mentionPickerMode, setMentionPickerMode] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddNote()
    }
  }

  const handleAddNote = async (e?: React.FormEvent) => {
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
    
    const mentionedIds = new Set<string>(selectedMentions)
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

    if (user) {
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

      const senderName = profile?.full_name || 'Operator'
      for (const mentionedId of mentionedIds) {
        if (mentionedId !== user.id) {
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

  return (
    <>
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
                  className="flex items-start gap-3 animate-none"
                >
                  {/* Avatar */}
                  {noteUser?.avatar_url ? (
                    <img src={noteUser.avatar_url} className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" />
                  ) : (
                    /* bg-zinc-800 */
                    <div className="w-8 h-8 rounded-full bg-transparent dark:bg-white/10 border border-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {noteUser?.user_name?.charAt(0) || 'OP'}
                    </div>
                  )}

                  {/* Chat Bubble Layout */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-black text-white/95">{noteUser?.user_name || 'User'}</span>
                      <span className="text-[9px] font-mono text-zinc-500">{noteTime}</span>
                    </div>
                    
                    {/* bg-zinc-900/20 */}
                    <div className="mt-1 flex items-start justify-between gap-3 p-3 border bg-transparent dark:bg-white/5 border-white/5 rounded-md rounded-tl-none">
                      <div className="text-xs text-white/80 leading-relaxed font-space break-words flex-1">
                        {formatNoteContent(noteContent)}
                      </div>
                      <button
                        onClick={() => handleDeleteNote(noteUser?.id, index)}
                        className="p-1 text-white/20 hover:text-red-400 transition-colors shrink-0 cursor-pointer"
                        title="DELETE"
                      >
                        <NeonIcon icon={Trash2} interactive intent="danger" className="w-3.5 h-3.5" />
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
                              /* bg-zinc-950/95 */
                              className="reaction-picker-panel absolute bottom-full left-0 mb-1 flex items-center gap-1.5 p-1.5 bg-black/80 border border-white/10 rounded-full shadow-2xl z-30 backdrop-blur-md"
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

      {/* 3. STICKY INPUT FOOTER AT BOTTOM */}
      {/* bg-zinc-950/60 */}
      <div className="p-4 border-t border-white/5 bg-transparent shrink-0 space-y-3 relative">
        <form onSubmit={handleAddNote} className="flex flex-col gap-2.5">
          {/* bg-zinc-900/60 */}
          <div className="relative flex items-center bg-transparent dark:bg-white/5 border border-white/5 rounded-md focus-within:border-white/15 px-3 py-2">
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
                /* bg-zinc-950/98 */
                className="mentions-dropdown-container absolute bottom-full mb-2 left-3 right-3 bg-black/80 border border-white/10 rounded-md max-h-64 overflow-y-auto shadow-2xl p-1.5 z-50 backdrop-blur-xl"
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
                  className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-md flex items-center gap-2.5 transition-colors cursor-pointer group border-b border-white/5 mb-1"
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    selectedMentions.size === squadMembers.length
                      ? 'border-teal-500 bg-teal-500'
                      : selectedMentions.size > 0
                        ? 'border-teal-500/50 bg-teal-500/20'
                        : 'border-white/20 bg-transparent'
                  }`}>
                    {selectedMentions.size === squadMembers.length && <NeonIcon icon={Check} className="w-3 h-3 text-black" />}
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
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md flex items-center gap-2.5 transition-all cursor-pointer group",
                        isSelected ? 'bg-white/[0.04]' : 'hover:bg-white/[0.03]'
                      )}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                        isSelected ? 'border-teal-500 bg-teal-500' : 'border-white/20 bg-transparent'
                      }`}>
                        {isSelected && <NeonIcon icon={Check} className="w-3 h-3 text-black" />}
                      </div>
                      {member.avatar_url ? (
                        <img src={member.avatar_url} className="w-6 h-6 rounded-full object-cover border border-white/10" />
                      ) : (
                        /* bg-zinc-800 */
                        <div className="w-6 h-6 rounded-full bg-transparent dark:bg-white/10 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                          {member.full_name?.charAt(0) || member.user_name?.charAt(0) || 'OP'}
                        </div>
                      )}
                      <span className={cn(
                        "text-xs font-space font-semibold uppercase truncate",
                        isSelected ? 'text-white' : 'text-white/60 group-hover:text-white/80'
                      )}>
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
                    className="w-full py-2 rounded-md text-[10px] font-black font-space uppercase tracking-widest transition-all cursor-pointer text-black"
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
            /* bg-zinc-950/95 */
            <div className="mentions-dropdown-container absolute bottom-full mb-2 left-3 bg-black/80 border border-white/10 rounded-md max-h-48 overflow-y-auto w-56 shadow-2xl p-1 z-50 backdrop-blur-md">
              <div className="text-[8px] font-mono tracking-[0.2em] font-black uppercase text-zinc-500 px-3 py-1.5 border-b border-white/5 mb-1">
                {isRTL ? 'إشارة إلى عضو // SQUAD_MEMBERS' : 'MENTION SQUAD MEMBER'}
              </div>
              {filteredMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => insertMention(member)}
                  className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-md flex items-center gap-2.5 transition-colors cursor-pointer group"
                >
                  {member.avatar_url ? (
                    <img src={member.avatar_url} className="w-6 h-6 rounded-full object-cover border border-white/10" />
                  ) : (
                    /* bg-zinc-800 */
                    <div className="w-6 h-6 rounded-full bg-transparent dark:bg-white/10 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white uppercase">
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
            /* bg-zinc-950/95 */
            <div className="absolute bottom-full mb-2 right-3 bg-black/80 border border-white/10 rounded-md shadow-2xl p-2.5 z-50 max-w-[240px] backdrop-blur-md">
              <div className="text-[8px] font-mono tracking-[0.2em] font-black uppercase text-zinc-500 px-1 py-1 border-b border-white/5 mb-2">
                {isRTL ? 'اختر رمز تعبيري // SELECT_EMOJI' : 'SELECT EMOJI'}
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {['⚡', '☕', '🔥', '🚀', '🎯', '👾', '💻', '🧠', '✅', '❌', '👍', '😂', '🎉', '👀', '✨', '🙌', '💯', '❤️'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="w-8 h-8 text-sm hover:bg-white/15 active:scale-90 transition-all rounded-md flex items-center justify-center cursor-pointer"
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
    </>
  )
}
