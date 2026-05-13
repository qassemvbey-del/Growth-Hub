'use client'

import { useState, useEffect } from 'react'
import Shell from '@/components/layout/Shell'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import { useGrowth } from '@/context/GrowthContext'

const PALETTE = [
  { name: 'green',  color: '#39FF14', bg: 'bg-[#39FF14]/5',  border: 'border-[#39FF14]/15', hover: 'hover:border-[#39FF14]/50 hover:shadow-[0_0_20px_rgba(57,255,20,0.08)]' },
  { name: 'purple', color: '#b600f8', bg: 'bg-[#b600f8]/5',  border: 'border-[#b600f8]/15', hover: 'hover:border-[#b600f8]/50 hover:shadow-[0_0_20px_rgba(182,0,248,0.08)]' },
  { name: 'blue',   color: '#00F0FF', bg: 'bg-[#00F0FF]/5',  border: 'border-[#00F0FF]/15', hover: 'hover:border-[#00F0FF]/50 hover:shadow-[0_0_20px_rgba(0,240,255,0.08)]' },
  { name: 'orange', color: '#FFBD33', bg: 'bg-[#FFBD33]/5',  border: 'border-[#FFBD33]/15', hover: 'hover:border-[#FFBD33]/50 hover:shadow-[0_0_20px_rgba(255,189,51,0.08)]' },
  { name: 'red',    color: '#FF3131', bg: 'bg-[#FF3131]/5',  border: 'border-[#FF3131]/15', hover: 'hover:border-[#FF3131]/50 hover:shadow-[0_0_20px_rgba(255,49,49,0.08)]' },
]

export default function NotesPage() {
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [editingNote, setEditingNote] = useState<any>(null)
  const [newContent, setNewContent] = useState('')
  const supabase = createClient()
  const { isRTL, currentTheme } = useGrowth()

  useEffect(() => { fetchNotes() }, [])

  async function fetchNotes() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setNotes(data)
    setLoading(false)
  }

  const deleteNote = async (id: string) => {
    if (confirm('PURGE CORE LOG?')) {
      setNotes(prev => prev.filter(n => n.id !== id))
      await supabase.from('notes').delete().eq('id', id)
    }
  }

  const updateNote = async (id: string, updates: any) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n))
    if (editingNote?.id === id) setEditingNote((prev: any) => ({ ...prev, ...updates }))
    await supabase.from('notes').update(updates).eq('id', id)
  }

  async function createNote() {
    if (!newContent.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const newNote = {
      user_id: user.id,
      content: newContent,
      color: currentTheme.color,
      is_locked: false,
      is_on_home: false,
      pos_x: 0,
      pos_y: 0,
      font_settings: { family: 'space', weight: 'normal', style: 'normal' }
    }
    const { data } = await supabase.from('notes').insert(newNote).select().single()
    if (data) {
      setNotes([data, ...notes])
      setIsCreating(false)
      setNewContent('')
    }
  }

  if (loading) return (
    <Shell>
      <div className="p-16 text-neon-green font-space animate-pulse tracking-widest">
        INITIALIZING_CORE_DATABASE...
      </div>
    </Shell>
  )

  return (
    <Shell>
      <div className="p-6 md:p-12 space-y-10">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-6xl font-black font-space tracking-tighter uppercase italic text-black dark:text-white leading-none">
              BRAIN
            </h1>
            <p className="text-[10px] font-space text-neon-green tracking-[0.8em] uppercase font-bold opacity-40">
              CORE_MEMORY // {notes.length}_RECORDS_STABLE
            </p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="w-full md:w-auto px-10 py-4 bg-neon-green/10 border border-neon-green text-neon-green font-space font-black uppercase tracking-widest hover:bg-neon-green hover:text-black transition-all shadow-[0_0_20px_rgba(57,255,20,0.15)]"
          >
            NEW_LOG +
          </button>
        </header>

        {/* Create Panel */}
        <AnimatePresence>
          {isCreating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-panel p-6 md:p-10 border-neon-green/25 bg-neon-green/[0.03] space-y-6 overflow-hidden"
            >
              <textarea
                autoFocus
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) createNote() }}
                placeholder="INPUT_CORE_DATA..."
                className="w-full bg-transparent border-none text-xl md:text-2xl font-space font-black text-black dark:text-white italic outline-none min-h-[100px] placeholder:text-black/30 dark:placeholder:text-white/10 resize-none"
                dir="auto"
              />
              <div className="flex justify-end gap-6">
                <button onClick={() => { setIsCreating(false); setNewContent('') }} className="text-black/40 dark:text-white/20 font-space uppercase text-[10px] tracking-widest hover:text-black dark:hover:text-white transition-all">ABORT</button>
                <button onClick={createNote} className="px-8 py-2 bg-neon-green text-black font-space font-black uppercase text-xs tracking-widest">UPLOAD</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Static Grid */}
        {notes.length === 0 && !isCreating ? (
          <div className="flex items-center justify-center py-40">
            <p className="text-black/30 dark:text-white/10 font-space text-[11px] tracking-[0.5em] uppercase font-black">
              NO_CORE_RECORDS_FOUND
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence mode="popLayout">
              {notes.map((note, idx) => {
                const noteColor = currentTheme.color
                return (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => setEditingNote(note)}
                    className={cn(
                      "group relative p-7 border cursor-pointer transition-all duration-300",
                      "backdrop-blur-xl",
                      "hover:[border-color:var(--note-color)] hover:[box-shadow:0_0_20px_var(--note-color)]",
                      isRTL ? 'text-right' : 'text-left'
                    )}
                    style={{
                      '--note-color': noteColor,
                      backgroundColor: `${noteColor}05`,
                      borderColor: `${noteColor}15`,
                      background: `linear-gradient(135deg, ${noteColor}08 0%, transparent 60%)`,
                    } as any}
                  >
                    {/* 1px neon top accent */}
                    <div
                      className="absolute top-0 left-0 right-0 h-[1px] opacity-60 group-hover:opacity-100 transition-opacity"
                      style={{ background: `linear-gradient(90deg, transparent, ${noteColor}, transparent)` }}
                    />

                    {/* Pin indicator */}
                    {note.is_locked && (
                      <div className="absolute top-3 right-3 opacity-50">
                        <span className="material-symbols-outlined text-sm" style={{ color: noteColor }}>push_pin</span>
                      </div>
                    )}

                    {/* Delete button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNote(note.id) }}
                      className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 text-black/30 dark:text-white/30 hover:text-red-500 transition-all"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>

                    {/* Content */}
                    <p className={cn(
                      'text-sm leading-relaxed text-black/80 dark:text-white/80 line-clamp-6 mt-2',
                      note.font_settings?.family === 'cairo' ? 'font-cairo' : 'font-space',
                      note.font_settings?.weight === 'bold' ? 'font-black' : 'font-normal',
                      note.font_settings?.style === 'italic' ? 'italic' : ''
                    )}>
                      {note.content}
                    </p>

                    {/* Footer */}
                    <div className="mt-5 pt-4 border-t border-black/5 dark:border-white/5 flex justify-between items-center">
                      <span className="text-[8px] font-space tracking-[0.3em] text-black/50 dark:text-white/20 uppercase font-black">CORE_LOG</span>
                      <span className="material-symbols-outlined text-black/30 dark:text-white/15 text-sm group-hover:text-black/70 dark:group-hover:text-white/40 transition-all">open_in_full</span>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-8 bg-[#F0F2F5]/90 dark:bg-[#050505]/90 backdrop-blur-md"
            onClick={() => setEditingNote(null)}
          >
            <motion.div
              initial={{ scale: 0.93, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.93, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'w-full max-w-3xl p-6 md:p-12 relative border backdrop-blur-3xl shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-y-auto max-h-[90vh]'
              )}
              style={{
                backgroundColor: `${currentTheme.color}05`,
                borderColor: `${currentTheme.color}15`
              }}
            >
              {/* Neon top bar */}
              <div
                className="absolute top-0 left-0 right-0 h-[1px]"
                style={{
                  background: `linear-gradient(90deg, transparent, ${currentTheme.color}, transparent)`
                }}
              />

              {/* Close */}
              <button
                onClick={() => setEditingNote(null)}
                className="absolute top-5 right-5 text-black/30 dark:text-white/20 hover:text-black dark:hover:text-white transition-all"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>

              {/* Font Controls */}
              <div className="flex gap-3 border-b border-black/5 dark:border-white/5 pb-6 mb-8">
                {[
                  { icon: 'format_bold', field: 'weight', active: 'bold', inactive: 'normal' },
                  { icon: 'format_italic', field: 'style', active: 'italic', inactive: 'normal' },
                ].map(({ icon, field, active, inactive }) => (
                  <button
                    key={field}
                    onClick={() => updateNote(editingNote.id, {
                      font_settings: { ...editingNote.font_settings, [field]: editingNote.font_settings?.[field] === active ? inactive : active }
                    })}
                    className={cn('p-2.5 border transition-all', editingNote.font_settings?.[field] === active ? 'bg-black/10 dark:bg-white/20 border-black/30 dark:border-white' : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30')}
                  >
                    <span className="material-symbols-outlined text-black dark:text-white text-base">{icon}</span>
                  </button>
                ))}
                <button
                  onClick={() => updateNote(editingNote.id, {
                    font_settings: { ...editingNote.font_settings, family: editingNote.font_settings?.family === 'tajawal' ? 'space' : 'tajawal' }
                  })}
                  className={cn('px-5 py-2 border font-space text-sm font-black tracking-widest text-black dark:text-white transition-all', editingNote.font_settings?.family === 'tajawal' ? 'bg-black/10 dark:bg-white/20 border-black/30 dark:border-white' : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30')}
                >
                  {editingNote.font_settings?.family === 'tajawal' ? 'TAJAWAL' : 'SPACE'}
                </button>
                <button
                  onClick={() => updateNote(editingNote.id, { is_locked: !editingNote.is_locked })}
                  className={cn('p-2.5 border transition-all', editingNote.is_locked ? 'bg-neon-green/20 border-neon-green text-neon-green' : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30')}
                >
                  <span className="material-symbols-outlined text-base">push_pin</span>
                </button>
              </div>

              {/* Textarea */}
              <textarea
                autoFocus
                value={editingNote.content}
                onChange={(e) => updateNote(editingNote.id, { content: e.target.value })}
                className={cn(
                  'w-full bg-transparent border-none text-3xl leading-relaxed text-black dark:text-white outline-none min-h-[280px] resize-none',
                  editingNote.font_settings?.family === 'cairo' ? 'font-cairo' : 'font-space',
                  editingNote.font_settings?.weight === 'bold' ? 'font-black' : 'font-normal',
                  editingNote.font_settings?.style === 'italic' ? 'italic' : '',
                  isRTL ? 'text-right' : 'text-left'
                )}
                dir="auto"
              />

              {/* Footer */}
              <div className="pt-8 border-t border-black/5 dark:border-white/5 flex justify-end items-center">
                <div className="flex items-center gap-3 text-black/40 dark:text-white/20">
                  <span className="text-[9px] font-space tracking-widest uppercase font-black">AUTO_SAVED</span>
                  <span className="material-symbols-outlined text-xl">save</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Shell>
  )
}
