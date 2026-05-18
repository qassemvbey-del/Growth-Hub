'use client'

import { useState, useEffect } from 'react'
import Shell from '@/components/layout/Shell'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import { useGrowth } from '@/context/GrowthContext'
import CustomSelect from '@/components/ui/CustomSelect'

interface WikiSearchProps {
  onInsert: (text: string) => void
  color: string
  isRTL: boolean
}

function WikiSearch({ onInsert, color, isRTL }: WikiSearchProps) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    
    // Arabic char detection logic
    const hasArabic = /[\u0600-\u06FF]/.test(query)
    const domain = hasArabic ? 'ar' : 'en'
    const url = `https://${domain}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query.trim())}`

    try {
      const res = await fetch(url)
      if (!res.ok) {
        throw new Error('Not found')
      }
      const data = await res.ok ? await res.json() : null
      if (data && data.extract) {
        onInsert(data.extract)
        setQuery('')
      } else {
        throw new Error('No extract')
      }
    } catch (e) {
      setError(isRTL ? 'لم نجد نتائج لهذا الموضوع' : 'No results found for this topic')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[280px] md:max-w-[320px] shrink-0 text-left">
      <span className="text-[10px] font-mono tracking-widest text-black/30 dark:text-white/30 uppercase block mb-1">
        W // WIKIPEDIA
      </span>
      <div className="flex relative">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
          placeholder={loading ? (isRTL ? 'جاري البحث...' : 'Searching...') : (isRTL ? 'بحث سريع...' : 'Quick search...')}
          disabled={loading}
          className="w-full bg-black/[0.01] dark:bg-white/[0.01] border border-black/5 dark:border-white/5 rounded-l-md px-2 py-1 text-xs text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/20 focus:outline-none focus:border-black/20 dark:focus:border-white/10 transition-all font-space"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="border-y border-r border-black/5 dark:border-white/5 bg-black/[0.03] dark:bg-white/[0.03] px-2.5 py-1 text-xs text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white rounded-r-md transition-colors font-mono shrink-0 active:scale-95 flex items-center justify-center min-w-[50px]"
        >
          {loading ? '...' : (isRTL ? 'بحث' : 'GO')}
        </button>
        
        {loading && (
          <div className="absolute right-[60px] top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
            <span className="w-1 h-1 rounded-full animate-ping" style={{ backgroundColor: color }} />
          </div>
        )}
      </div>
      {error && (
        <span className="text-[9px] font-space font-bold tracking-wide text-red-500/80 mt-1 block">
          {error}
        </span>
      )}
    </div>
  )
}

export default function NotesPage() {
  const [notes, setNotes] = useState<any[]>([])
  const [missions, setMissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [editingNote, setEditingNote] = useState<any>(null)
  const [newContent, setNewContent] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newTag, setNewTag] = useState('')
  const [newMissionId, setNewMissionId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTag, setFilterTag] = useState('all')
  const supabase = createClient()
  const { currentTheme, isRTL, mounted } = useGrowth()

  useEffect(() => { 
    fetchNotes()
    fetchMissions()
    if (window.location.search.includes('create=true')) {
      setIsCreating(true)
      window.history.replaceState({}, '', '/notes')
    }
  }, [])

  async function fetchNotes() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('notes')
      .select('*, cups(id, title)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setNotes(data)
    setLoading(false)
  }

  async function fetchMissions() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('cups')
      .select('id, title')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
    if (data) setMissions(data)
  }

  const deleteNote = async (id: string) => {
    if (confirm('Delete this note?')) {
      setNotes(prev => prev.filter(n => n.id !== id))
      await supabase.from('notes').delete().eq('id', id)
    }
  }

  const updateNote = async (id: string, updates: any) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n))
    if (editingNote?.id === id) setEditingNote((prev: any) => ({ ...prev, ...updates }))
    await supabase.from('notes').update(updates).eq('id', id)
  }

  const TAGS = [
    { label: '💡 Idea', value: 'idea' },
    { label: '⚠️ Important', value: 'urgent' },
    { label: '📚 Source', value: 'source' },
    { label: '✅ Task', value: 'task' },
    { label: '🔖 Reference', value: 'reference' }
  ]

  const filteredNotes = notes.filter(n => {
    const q = searchQuery.toLowerCase()
    const matchesSearch = (
      n.title?.toLowerCase().includes(q) ||
      n.content?.toLowerCase().includes(q) ||
      n.cups?.title?.toLowerCase().includes(q)
    )
    const matchesTag = filterTag === 'all' || n.tag === filterTag
    return matchesSearch && matchesTag
  })

  async function createNote() {
    if (!newContent.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const newNote: any = {
      user_id: user.id,
      title: newTitle || 'Untitled Note',
      tag: newTag || null,
      content: newContent,
      color: currentTheme.color,
      is_locked: false,
      is_on_home: false,
      pos_x: 0,
      pos_y: 0,
      font_settings: { family: 'space', weight: 'normal', style: 'normal' }
    }
    if (newMissionId) newNote.mission_id = newMissionId

    const { data } = await supabase.from('notes').insert(newNote).select('*, cups(id, title)').single()
    if (data) {
      setNotes([data, ...notes])
      setIsCreating(false)
      setNewContent('')
      setNewTitle('')
      setNewTag('')
      setNewMissionId('')
    }
  }

  if (loading) return (
    <Shell>
      <div className="p-4 md:p-12 space-y-10">
        <div className="animate-pulse flex flex-col gap-4">
          <div className="h-40 bg-gray-800 rounded"/>
          <div className="h-40 bg-gray-800 rounded"/>
          <div className="h-40 bg-gray-800 rounded"/>
        </div>
      </div>
    </Shell>
  )

  return (
    <Shell>
      <div className="p-4 md:p-12 space-y-10">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl md:text-6xl font-black font-space tracking-wider uppercase text-black dark:text-white leading-none">
                NOTES
              </h1>
              <span className="inline-flex items-center justify-center px-3 py-1 bg-white/10 rounded-lg text-sm font-space font-bold text-white/50 tracking-normal normal-case">
                {notes.length}
              </span>
            </div>
          </div>
          <div className="flex flex-row items-center gap-3 w-full md:w-auto">
            {/* Search Bar */}
            <div className="relative group flex-1 md:flex-none">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]/40 group-focus-within:text-[var(--text-secondary)] transition-colors text-[18px]">search</span>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search notes..."
                className="h-11 w-full md:w-64 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl pl-10 pr-4 font-space text-[11px] text-[var(--text-primary)] tracking-wide outline-none focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                style={{ ['--tw-ring-color' as any]: `${currentTheme.color}55` }}
              />
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="flex flex-row items-center justify-center gap-2 h-11 px-5 bg-white/5 border border-white/10 text-white/70 font-space font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all duration-300 text-xs rounded-xl shrink-0"
            >
              <span className="material-symbols-outlined text-[16px] leading-none">add</span>
              Add Note
            </button>
          </div>
        </header>

        {/* Create Panel */}
        <AnimatePresence>
          {isCreating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-panel p-6 md:p-10 border space-y-6 overflow-hidden"
              style={{ borderColor: `${currentTheme.color}25`, backgroundColor: `${currentTheme.color}03` }}
            >
              <div className="space-y-4">
                <input 
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Note title..."
                  className="w-full bg-transparent border-b border-white/10 p-3 font-space font-black text-2xl text-black dark:text-white outline-none transition-colors"
                  onFocus={e => e.currentTarget.style.borderColor = currentTheme.color}
                  onBlur={e => e.currentTarget.style.borderColor = ''}
                  required
                />
                
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 sm:gap-4 mt-2 border-b border-black/5 dark:border-white/5 pb-2">
                  <span className="text-[10px] font-space tracking-widest text-black/30 dark:text-white/20 uppercase font-black mb-1">
                    Note Canvas
                  </span>
                  <WikiSearch
                    isRTL={isRTL}
                    color={currentTheme.color}
                    onInsert={(text) => setNewContent(prev => prev ? `${prev}\n\n${text}` : text)}
                  />
                </div>
                
                <textarea
                  autoFocus
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) createNote() }}
                  placeholder="Write your note here..."
                  className="w-full bg-transparent border-none text-lg font-space text-black/70 dark:text-white/60 outline-none min-h-[120px] placeholder:text-black/30 dark:placeholder:text-white/10 resize-none"
                  dir="auto"
                />
              </div>

              {/* Tag Selector for creation */}
              <div className="flex gap-2 flex-wrap">
                {TAGS.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setNewTag(newTag === t.value ? '' : t.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-sm font-space text-[9px] font-black tracking-widest border transition-all",
                      newTag === t.value 
                        ? "text-black border-transparent shadow-lg" 
                        : "border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[var(--card-border)]/50"
                    )}
                    style={newTag === t.value ? { backgroundColor: currentTheme.color, borderColor: currentTheme.color, boxShadow: `0 0 10px ${currentTheme.color}55` } : {}}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Mission Link Dropdown */}
              {missions.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[9px] font-space text-black/40 dark:text-white/30 tracking-widest uppercase font-black">
                    Link to Goal (optional)
                  </label>
                  <CustomSelect
                    value={newMissionId}
                    onChange={val => setNewMissionId(val)}
                    options={[
                      { value: '', label: '— NO LINK —' },
                      ...missions.map(m => ({ value: m.id, label: m.title.toUpperCase() }))
                    ]}
                  />
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-[9px] font-space text-black/30 dark:text-white/20 tracking-widest uppercase">
                  <span className="material-symbols-outlined text-sm">keyboard</span>
                  ⌘+Enter to save
                </div>
                <div className="flex gap-6">
                  <button onClick={() => { setIsCreating(false); setNewContent(''); setNewTitle(''); setNewTag(''); setNewMissionId('') }} className="text-[var(--text-secondary)] font-space uppercase text-[10px] tracking-widest hover:text-[var(--text-primary)] transition-all">CANCEL</button>
                  <button 
                    onClick={createNote} 
                    className="px-8 py-2 text-black font-space font-black uppercase text-xs tracking-widest rounded-xl transition-all duration-300 hover:brightness-110 active:scale-95"
                    style={{ backgroundColor: currentTheme.color, boxShadow: `0 0 15px ${currentTheme.color}44` }}
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Tag Filter Bar */}
        <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
          <button
            onClick={() => setFilterTag('all')}
            className={cn(
              "px-6 py-2 border font-space text-[10px] font-black tracking-widest uppercase transition-all whitespace-nowrap",
              filterTag === 'all' 
                ? "text-black border-transparent shadow-lg" 
                : "border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[var(--card-border)]/50"
            )}
            style={filterTag === 'all' ? { backgroundColor: currentTheme.color, borderColor: currentTheme.color, boxShadow: `0 0 20px ${currentTheme.color}33` } : {}}
          >
            ALL
          </button>
          {TAGS.map(t => (
            <button
              key={t.value}
              onClick={() => setFilterTag(t.value)}
              className={cn(
                "px-6 py-2 border font-space text-[10px] font-black tracking-widest uppercase transition-all whitespace-nowrap",
                filterTag === t.value 
                  ? "text-black border-transparent shadow-lg" 
                  : "border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[var(--card-border)]/50"
              )}
              style={filterTag === t.value ? { backgroundColor: currentTheme.color, borderColor: currentTheme.color, boxShadow: `0 0 20px ${currentTheme.color}33` } : {}}
            >
              {t.label}
            </button>
          ))}
        </div>


        {/* Notes Grid */}
        {filteredNotes.length === 0 ? (
          <div className="flex items-center justify-center py-40">
            <p className="text-black/30 dark:text-white/10 font-space text-[11px] tracking-[0.5em] uppercase font-black">
              {searchQuery ? 'No matching notes' : 'No notes yet — add your first'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence mode="popLayout">
              {filteredNotes.map((note, idx) => {
                const noteColor = currentTheme.color
                const linkedMission = note.cups
                const tagObj = TAGS.find(t => t.value === note.tag)
                const dateObj = new Date(note.created_at)
                const date = dateObj.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                const dateSuffix = `${dateObj.getDate()}_${dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}`
                
                // Fix 4: Clean preview text
                const plainText = (note.content || '')
                  .replace(/<[^>]*>/g, '') // Strip HTML
                  .replace(/[#*`_~]/g, '') // Strip Markdown symbols
                  .trim()
                  .slice(0, 60) || 'Empty note...'

                return (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => setEditingNote(note)}
                    className={cn(
                      "group relative p-7 border cursor-pointer transition-all duration-300 min-h-[220px] flex flex-col",
                      "bg-[var(--card-bg)] border-[var(--card-border)] hover:border-[var(--card-border)]/50",
                      "backdrop-blur-xl",
                      "text-left"
                    )}
                  >
                    {/* Neon top accent */}
                    <div
                      className="absolute top-0 left-0 right-0 h-[1px] opacity-60 group-hover:opacity-100 transition-opacity"
                      style={{ background: `linear-gradient(90deg, transparent, ${noteColor}, transparent)` }}
                    />

                    {/* Mission badge */}
                    {linkedMission && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-sm text-[8px] font-space font-black tracking-wider uppercase" style={{ backgroundColor: `${noteColor}15`, color: noteColor, border: `1px solid ${noteColor}30` }}>
                        <span className="material-symbols-outlined text-[10px]">link</span>
                        <span className="max-w-[80px] truncate">{linkedMission.title}</span>
                      </div>
                    )}

                    {/* Pin indicator */}
                    {note.is_locked && (
                      <div className="absolute top-3 left-3 opacity-50">
                        <span className="material-symbols-outlined text-sm" style={{ color: noteColor }}>push_pin</span>
                      </div>
                    )}

                    {/* Title (Fix 5) */}
                    <h3 className="text-xl font-black font-space text-[var(--text-primary)] mt-4 uppercase italic tracking-tighter truncate">
                      {note.title && note.title !== 'Untitled Note' ? note.title : `Note — ${dateSuffix}`}
                    </h3>

                    {/* Preview */}
                    <p className={cn(
                      'text-xs leading-relaxed text-[var(--text-secondary)] mt-3 italic font-space'
                    )}>
                      "{plainText}"
                    </p>

                    {/* Footer / Meta */}
                    <div className="mt-auto pt-5 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                         {tagObj && (
                          <span 
                            className="px-2 py-0.5 border text-[9px] font-black font-space tracking-widest uppercase rounded-sm"
                            style={{ borderColor: `${noteColor}40`, color: noteColor, backgroundColor: `${noteColor}08` }}
                          >
                            {tagObj.label}
                          </span>
                        )}
                        <span className="text-[9px] font-space text-[var(--text-secondary)] font-black tracking-widest">
                          {date}
                        </span>
                      </div>
                      
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteNote(note.id) }}
                        className="text-[var(--text-secondary)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
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
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8 bg-white/90 dark:bg-black/90 backdrop-blur-md"
            onClick={() => setEditingNote(null)}
          >
            <motion.div
              initial={{ scale: 0.93, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.93, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl p-6 md:p-12 relative border border-[var(--card-border)] bg-[var(--card-bg)] backdrop-blur-3xl shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-y-auto max-h-[90vh]"
            >
              {/* Neon top bar */}
              <div
                className="absolute top-0 left-0 right-0 h-[1px]"
                style={{ background: `linear-gradient(90deg, transparent, ${currentTheme.color}, transparent)` }}
              />

              <div className="flex justify-between items-center mb-6">
                 {editingNote.cups && (
                   <div className="flex items-center gap-2 text-[10px] font-space font-black tracking-widest uppercase" style={{ color: currentTheme.color }}>
                     <span className="material-symbols-outlined text-sm">link</span>
                     Linked to: {editingNote.cups.title}
                   </div>
                 )}
                  <span className="text-[9px] font-space text-[var(--text-secondary)]/30 font-black tracking-widest">
                    ID: {editingNote?.id?.slice(0, 8) ?? 'NEW'}
                  </span>
               </div>

              <input 
                 value={editingNote.title || ''}
                 onChange={(e) => updateNote(editingNote.id, { title: e.target.value })}
                 placeholder="Note title..."
                 className="w-full bg-transparent border-none p-0 mb-8 font-space font-black text-4xl md:text-5xl text-[var(--text-primary)] outline-none transition-colors italic tracking-tighter"
                 onFocus={e => e.currentTarget.style.color = currentTheme.color}
                 onBlur={e => e.currentTarget.style.color = ''}
               />

              <button
                onClick={() => setEditingNote(null)}
                 className="absolute top-5 right-5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>

               <div className="flex gap-3 flex-wrap border-b border-[var(--card-border)] pb-6 mb-8">
                {[
                  { icon: 'format_bold', field: 'weight', active: 'bold', inactive: 'normal' },
                  { icon: 'format_italic', field: 'style', active: 'italic', inactive: 'normal' },
                ].map(({ icon, field, active, inactive }) => (
                  <button
                    key={field}
                    onClick={() => updateNote(editingNote.id, {
                      font_settings: { ...editingNote.font_settings, [field]: editingNote.font_settings?.[field] === active ? inactive : active }
                    })}
                    className={cn('p-2.5 border transition-all', editingNote.font_settings?.[field] === active ? 'bg-[var(--input-bg)] border-[var(--card-border)]' : 'bg-[var(--input-bg)] border border-[var(--card-border)] hover:opacity-80')}
                  >
                    <span className="material-symbols-outlined text-[var(--text-primary)] text-base">{icon}</span>
                  </button>
                ))}
                <button
                  onClick={() => updateNote(editingNote.id, {
                    font_settings: { ...editingNote.font_settings, family: editingNote.font_settings?.family === 'tajawal' ? 'space' : 'tajawal' }
                  })}
                  className={cn('px-5 py-2 border font-space text-sm font-black tracking-widest text-[var(--text-primary)] transition-all', editingNote.font_settings?.family === 'tajawal' ? 'bg-[var(--input-bg)] border-[var(--card-border)]' : 'bg-[var(--input-bg)] border border-[var(--card-border)] hover:opacity-80')}
                >
                  {editingNote.font_settings?.family === 'tajawal' ? 'TAJAWAL' : 'SPACE'}
                </button>
                <button
                  onClick={() => updateNote(editingNote.id, { is_locked: !editingNote.is_locked })}
                  className={cn('p-2.5 border transition-all', editingNote.is_locked ? 'text-black border-transparent' : 'bg-[var(--input-bg)] border border-[var(--card-border)] hover:opacity-80')}
                  style={editingNote.is_locked ? { backgroundColor: currentTheme.color, boxShadow: `0 0 10px ${currentTheme.color}55` } : {}}
                >
                  <span className="material-symbols-outlined text-base">push_pin</span>
                </button>

                {missions.length > 0 && (
                  <CustomSelect
                    value={editingNote.mission_id || ''}
                    onChange={val => updateNote(editingNote.id, { mission_id: val || null })}
                    options={[
                      { value: '', label: '— NO LINK —' },
                      ...missions.map(m => ({ value: m.id, label: m.title.toUpperCase() }))
                    ]}
                    className="w-48"
                  />
                )}
              </div>

              <div className="flex gap-2 flex-wrap mb-8 border-b border-[var(--card-border)] pb-6">
                {TAGS.map(t => (
                  <button
                    key={t.value}
                    onClick={() => updateNote(editingNote.id, { tag: editingNote.tag === t.value ? null : t.value })}
                    className={cn(
                      "px-4 py-2 rounded-sm font-space text-[10px] font-black tracking-widest border transition-all",
                      editingNote.tag === t.value 
                        ? "text-black border-transparent shadow-lg" 
                        : "border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[var(--card-border)]/50 hover:text-[var(--text-primary)]"
                    )}
                    style={editingNote.tag === t.value ? { backgroundColor: currentTheme.color, borderColor: currentTheme.color, boxShadow: `0 0 15px ${currentTheme.color}44` } : {}}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 sm:gap-4 mb-4 border-b border-black/5 dark:border-white/5 pb-2">
                <span className="text-[10px] font-space tracking-widest text-[var(--text-secondary)]/30 uppercase font-black mb-1">
                  Canvas Editor
                </span>
                <WikiSearch
                  isRTL={isRTL}
                  color={currentTheme.color}
                  onInsert={(text) => updateNote(editingNote.id, { content: editingNote.content ? `${editingNote.content}\n\n${text}` : text })}
                />
              </div>

              <textarea
                autoFocus
                value={editingNote.content}
                onChange={(e) => updateNote(editingNote.id, { content: e.target.value })}
                className={cn(
                  'w-full bg-transparent border-none text-3xl leading-relaxed text-[var(--text-primary)] outline-none min-h-[280px] resize-none',
                  editingNote.font_settings?.family === 'tajawal' ? 'font-tajawal' : 'font-space',
                  editingNote.font_settings?.weight === 'bold' ? 'font-black' : 'font-normal',
                  editingNote.font_settings?.style === 'italic' ? 'italic' : '',
                  "text-left"
                )}
                dir="auto"
              />

              <div className="pt-8 border-t border-[var(--card-border)] flex justify-end items-center">
                <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                   <span className="text-[9px] font-space tracking-widest uppercase font-black">Auto-saved</span>
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
