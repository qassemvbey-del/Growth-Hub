'use client'

import { Keyboard, Layers, Link, Pin, Plus, Save, Search, Trash2, X } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import Shell from '@/components/layout/Shell'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import { useGrowth } from '@/context/GrowthContext'
import CustomSelect from '@/components/ui/CustomSelect'
import { useRouter } from 'next/navigation'

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
        {isRTL ? 'و // ويكيبيديا' : 'W // WIKIPEDIA'}
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
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const { currentTheme, isRTL, mounted } = useGrowth()

  const uniqueMissions = useMemo(() => {
    const missionsMap = new Map<string, string>()
    notes.forEach(note => {
      const missionId = note.cups?.id || note.mission_id || note.cup_id
      const missionTitle = note.cups?.title || note.cups_title
      if (missionId && missionTitle) {
        missionsMap.set(missionId, missionTitle)
      }
    })
    return Array.from(missionsMap.entries()).map(([id, title]) => ({ id, title }))
  }, [notes])

  useEffect(() => { 
    fetchNotes()
    fetchMissions()
    if (window.location.search.includes('create=true')) {
      setIsCreating(true)
      window.history.replaceState({}, '', '/notes')
    }
  }, [])

  // Close all modals event listener from global Shell ESC matrix
  useEffect(() => {
    const handleCloseAll = () => {
      setIsCreating(false)
      setEditingNote(null)
    }
    window.addEventListener('close-all-modals', handleCloseAll)
    return () => window.removeEventListener('close-all-modals', handleCloseAll)
  }, [])

  async function fetchNotes() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      let dbNotes: any[] = []
      let extractedTaskNotes: any[] = []

      if (user) {
        // Authenticated mode:
        // 1. Fetch standalone notes
        const { data: notesData } = await supabase
          .from('notes')
          .select('*, cups(id, title)')
          .eq('user_id', user.id)
        if (notesData) dbNotes = notesData

        // 2. Fetch all user cups (missions) with tasks
        const { data: cupsData } = await supabase
          .from('cups')
          .select('*, tasks(*)')
          .eq('user_id', user.id)

        if (cupsData) {
          cupsData.forEach((mission: any) => {
            const tasks = mission.tasks || []
            tasks.forEach((task: any) => {
              const notesArr = task.metadata?.notes || []
              notesArr.forEach((noteItem: any, index: number) => {
                const content = typeof noteItem === 'string' ? noteItem : (noteItem.content || '')
                const createdAt = typeof noteItem === 'string' 
                  ? task.created_at || new Date().toISOString() 
                  : (noteItem.created_at || task.created_at || new Date().toISOString())
                
                // Deduplicate: If notesData already has a synced row with matching task_id and content
                const isDuplicate = dbNotes.some(n => n.task_id === task.id && n.content === content)
                if (!isDuplicate) {
                  extractedTaskNotes.push({
                    id: `task_note_${task.id}_${index}`,
                    user_id: user.id,
                    title: task.title || (isRTL ? 'ملاحظة مهمة' : 'Task Note'),
                    tag: 'task',
                    content: content,
                    color: mission.color || currentTheme.color,
                    is_locked: false,
                    is_on_home: false,
                    pos_x: 0,
                    pos_y: 0,
                    font_settings: { family: 'space', weight: 'normal', style: 'normal' },
                    mission_id: mission.id,
                    task_id: task.id,
                    created_at: createdAt,
                    cups: {
                      id: mission.id,
                      title: mission.title
                    },
                    _isTaskNote: true,
                    _noteIndex: index
                  })
                }
              })
            })
          })
        }
      } else {
        // Guest mode:
        // 1. Fetch from localStorage guest_goals
        const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
        guestGoals.forEach((mission: any) => {
          const tasks = mission.tasks || []
          tasks.forEach((task: any) => {
            const notesArr = task.metadata?.notes || []
            notesArr.forEach((noteItem: any, index: number) => {
              const content = typeof noteItem === 'string' ? noteItem : (noteItem.content || '')
              const createdAt = typeof noteItem === 'string'
                ? task.created_at || new Date().toISOString()
                : (noteItem.created_at || task.created_at || new Date().toISOString())

              extractedTaskNotes.push({
                id: `task_note_${task.id}_${index}`,
                user_id: '',
                title: task.title || (isRTL ? 'ملاحظة مهمة' : 'Task Note'),
                tag: 'task',
                content: content,
                color: mission.color || currentTheme.color,
                is_locked: false,
                is_on_home: false,
                pos_x: 0,
                pos_y: 0,
                font_settings: { family: 'space', weight: 'normal', style: 'normal' },
                mission_id: mission.id,
                task_id: task.id,
                created_at: createdAt,
                cups: {
                  id: mission.id,
                  title: mission.title
                },
                _isTaskNote: true,
                _noteIndex: index
              })
            })
          })
        })
      }

      // Merge and sort by created_at descending
      const merged = [...dbNotes, ...extractedTaskNotes].sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      setNotes(merged)
    } catch (error) {
      console.error('Error fetching notes:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchMissions() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('cups')
        .select('id, title')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
      if (data) setMissions(data)
    } else {
      const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
      const formatted = guestGoals.map((m: any) => ({ id: m.id, title: m.title }))
      setMissions(formatted)
    }
  }

  const deleteNote = async (id: string) => {
    const noteToDelete = notes.find(n => n.id === id)
    if (!noteToDelete) return

    if (confirm(isRTL ? 'هل تريد حذف هذه الملاحظة؟' : 'Delete this note?')) {
      setNotes(prev => prev.filter(n => n.id !== id))

      if (noteToDelete._isTaskNote) {
        const { task_id, mission_id, _noteIndex } = noteToDelete
        if (mission_id && mission_id.startsWith('local_')) {
          // Guest mode
          const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
          const goal = guestGoals.find((g: any) => g.id === mission_id)
          if (goal && goal.tasks) {
            const taskObj = goal.tasks.find((t: any) => t.id === task_id)
            if (taskObj && taskObj.metadata && taskObj.metadata.notes) {
              taskObj.metadata.notes = taskObj.metadata.notes.filter((_: any, idx: number) => idx !== _noteIndex)
              localStorage.setItem('guest_goals', JSON.stringify(guestGoals))
            }
          }
        } else {
          // Authenticated mode
          try {
            const supabase = createClient()
            // Delete from standalone notes if it matches
            await supabase.from('notes').delete().eq('task_id', task_id).eq('content', noteToDelete.content)

            // Update metadata in tasks table
            const { data: taskData } = await supabase
              .from('tasks')
              .select('metadata')
              .eq('id', task_id)
              .single()
            if (taskData) {
              const notesArr = taskData.metadata?.notes || []
              const updatedNotes = notesArr.filter((_: any, idx: number) => idx !== _noteIndex)
              const updatedMetadata = { ...taskData.metadata, notes: updatedNotes }
              await supabase
                .from('tasks')
                .update({ metadata: updatedMetadata })
                .eq('id', task_id)
            }
          } catch (err) {
            console.error('Error deleting task note in database:', err)
          }
        }
      } else {
        // Standalone note
        await supabase.from('notes').delete().eq('id', id)
      }
    }
  }

  const updateNote = async (id: string, updates: any) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n))
    if (editingNote?.id === id) setEditingNote((prev: any) => ({ ...prev, ...updates }))

    const noteToUpdate = notes.find(n => n.id === id)
    if (!noteToUpdate) return

    if (noteToUpdate._isTaskNote) {
      const { task_id, mission_id, _noteIndex } = noteToUpdate
      if (mission_id && mission_id.startsWith('local_')) {
        // Guest mode
        const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
        const goal = guestGoals.find((g: any) => g.id === mission_id)
        if (goal && goal.tasks) {
          const taskObj = goal.tasks.find((t: any) => t.id === task_id)
          if (taskObj && taskObj.metadata && taskObj.metadata.notes) {
            const notesArr = taskObj.metadata.notes
            const currentItem = notesArr[_noteIndex]
            if (typeof currentItem === 'string') {
              notesArr[_noteIndex] = updates.content !== undefined ? updates.content : currentItem
            } else if (currentItem) {
              notesArr[_noteIndex] = {
                ...currentItem,
                content: updates.content !== undefined ? updates.content : currentItem.content,
              }
            }
            localStorage.setItem('guest_goals', JSON.stringify(guestGoals))
          }
        }
      } else {
        // Authenticated mode
        try {
          const supabase = createClient()
          // Update in global notes table
          if (updates.content !== undefined || updates.title !== undefined) {
            const dbUpdates: any = {}
            if (updates.content !== undefined) dbUpdates.content = updates.content
            if (updates.title !== undefined) dbUpdates.title = updates.title
            await supabase.from('notes').update(dbUpdates).eq('task_id', task_id).eq('content', noteToUpdate.content)
          }

          // Update in tasks table metadata
          const { data: taskData } = await supabase
            .from('tasks')
            .select('metadata')
            .eq('id', task_id)
            .single()
          if (taskData) {
            const notesArr = taskData.metadata?.notes || []
            const currentItem = notesArr[_noteIndex]
            if (typeof currentItem === 'string') {
              notesArr[_noteIndex] = updates.content !== undefined ? updates.content : currentItem
            } else if (currentItem) {
              notesArr[_noteIndex] = {
                ...currentItem,
                content: updates.content !== undefined ? updates.content : currentItem.content,
              }
            }
            const updatedMetadata = { ...taskData.metadata, notes: notesArr }
            await supabase
              .from('tasks')
              .update({ metadata: updatedMetadata })
              .eq('id', task_id)
          }
        } catch (err) {
          console.error('Error updating task note in database:', err)
        }
      }
    } else {
      // Standalone note
      await supabase.from('notes').update(updates).eq('id', id)
    }
  }

  const TAGS = [
    { label: isRTL ? '💡 فكرة' : '💡 Idea', value: 'idea' },
    { label: isRTL ? '⚠️ هام' : '⚠️ Important', value: 'urgent' },
    { label: isRTL ? '📚 مصدر' : '📚 Source', value: 'source' },
    { label: isRTL ? '✅ مهمة' : '✅ Task', value: 'task' },
    { label: isRTL ? '🔖 مرجع' : '🔖 Reference', value: 'reference' }
  ]

  const filteredNotes = notes.filter(n => {
    const q = searchQuery.toLowerCase()
    const matchesSearch = (
      n.title?.toLowerCase().includes(q) ||
      n.content?.toLowerCase().includes(q) ||
      n.cups?.title?.toLowerCase().includes(q)
    )
    const matchesTag = filterTag === 'all' || n.tag === filterTag
    const missionId = n.cups?.id || n.mission_id || n.cup_id
    const matchesMission = selectedMissionId === null || missionId === selectedMissionId
    return matchesSearch && matchesTag && matchesMission
  })

  async function createNote() {
    if (!newContent.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const newNote: any = {
      user_id: user.id,
      title: newTitle || (isRTL ? 'ملاحظة غير معنونة' : 'Untitled Note'),
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
                {isRTL ? 'الملاحظات' : 'NOTES'}
              </h1>
              <span className="inline-flex items-center justify-center px-3 py-1 bg-white/10 rounded-lg text-sm font-space font-bold text-white/50 tracking-normal normal-case">
                {notes.length}
              </span>
            </div>
          </div>
          <div className="flex flex-row items-center gap-3 w-full md:w-auto">
            {/* Search Bar */}
            <div className="relative group flex-1 md:flex-none">
              <Search className={cn(" absolute top-1/2 -translate-y-1/2 text-[var(--text-secondary)]/40 group-focus-within:text-[var(--text-secondary)] transition-colors text-[18px]", isRTL ? "right-3.5" : "left-3.5")} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={isRTL ? 'البحث في الملاحظات...' : 'Search notes...'}
                className={cn(
                  "h-11 w-full md:w-64 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl font-space text-[11px] text-[var(--text-primary)] tracking-wide outline-none focus:outline-none focus:ring-2 focus:border-transparent transition-all",
                  isRTL ? "pr-10 pl-4" : "pl-10 pr-4"
                )}
                style={{ ['--tw-ring-color' as any]: `${currentTheme.color}55` }}
              />
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="flex flex-row items-center justify-center gap-2 h-11 px-5 bg-white/5 border border-white/10 text-white/70 font-space font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all duration-300 text-xs rounded-xl shrink-0"
            >
              <Plus className="text-[16px] leading-none" />
              {isRTL ? 'إضافة ملاحظة' : 'Add Note'}
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
                  placeholder={isRTL ? 'عنوان الملاحظة...' : 'Note title...'}
                  className={cn(
                    "w-full bg-transparent border-b border-white/10 p-3 font-space font-black text-2xl text-black dark:text-white outline-none transition-colors",
                    isRTL ? "text-right" : "text-left"
                  )}
                  onFocus={e => e.currentTarget.style.borderColor = currentTheme.color}
                  onBlur={e => e.currentTarget.style.borderColor = ''}
                  required
                />
                
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 sm:gap-4 mt-2 border-b border-black/5 dark:border-white/5 pb-2">
                  <span className="text-[10px] font-space tracking-widest text-black/30 dark:text-white/20 uppercase font-black mb-1">
                    {isRTL ? 'لوحة الملاحظة' : 'Note Canvas'}
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
                  placeholder={isRTL ? 'اكتب ملاحظتك هنا...' : 'Write your note here...'}
                  className={cn(
                    "w-full bg-transparent border-none text-lg font-space text-black/70 dark:text-white/60 outline-none min-h-[120px] placeholder:text-black/30 dark:placeholder:text-white/10 resize-none",
                    isRTL ? "text-right" : "text-left"
                  )}
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
                    {isRTL ? 'ربط بالهدف (اختياري)' : 'Link to Goal (optional)'}
                  </label>
                  <CustomSelect
                    value={newMissionId}
                    onChange={val => setNewMissionId(val)}
                    options={[
                      { value: '', label: isRTL ? '— بدون ربط —' : '— NO LINK —' },
                      ...missions.map(m => ({ value: m.id, label: m.title.toUpperCase() }))
                    ]}
                  />
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-[9px] font-space text-black/30 dark:text-white/20 tracking-widest uppercase">
                  <Keyboard className="text-sm w-3.5 h-3.5" />
                  {isRTL ? 'اضغط ⌘+Enter للحفظ' : '⌘+Enter to save'}
                </div>
                <div className="flex gap-6">
                  <button onClick={() => { setIsCreating(false); setNewContent(''); setNewTitle(''); setNewTag(''); setNewMissionId('') }} className="text-[var(--text-secondary)] font-space uppercase text-[10px] tracking-widest hover:text-[var(--text-primary)] transition-all">{isRTL ? 'إلغاء' : 'CANCEL'}</button>
                  <button 
                    onClick={createNote} 
                    className="px-8 py-2 text-black font-space font-black uppercase text-xs tracking-widest rounded-xl transition-all duration-300 hover:brightness-110 active:scale-95"
                    style={{ backgroundColor: currentTheme.color, boxShadow: `0 0 15px ${currentTheme.color}44` }}
                  >
                    {isRTL ? 'حفظ' : 'Save'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Goal Filter Bar */}
        {uniqueMissions.length > 0 && (
          <div className="flex flex-col gap-2 bg-white/[0.01] dark:bg-white/[0.01] border border-black/5 dark:border-white/5 p-4 rounded-xl backdrop-blur-md">
            <span className="text-[10px] font-space text-black/40 dark:text-white/30 tracking-widest uppercase font-black">
              {isRTL ? 'تصفية حسب الهدف' : 'Filter by Goal'}
            </span>
            <div className="flex gap-2.5 overflow-x-auto pb-1.5 no-scrollbar">
              <button
                onClick={() => setSelectedMissionId(null)}
                className={cn(
                  "px-4 py-1.5 border font-space text-[9px] font-black tracking-widest uppercase transition-all whitespace-nowrap rounded-lg cursor-pointer",
                  selectedMissionId === null
                    ? "text-black border-transparent shadow-md"
                    : "border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[var(--card-border)]/50 hover:text-[var(--text-primary)]"
                )}
                style={selectedMissionId === null ? { backgroundColor: currentTheme.color, borderColor: currentTheme.color, boxShadow: `0 0 15px ${currentTheme.color}33` } : {}}
              >
                {isRTL ? 'جميع الأهداف' : 'ALL GOALS'}
              </button>
              {uniqueMissions.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMissionId(selectedMissionId === m.id ? null : m.id)}
                  className={cn(
                    "px-4 py-1.5 border font-space text-[9px] font-black tracking-widest uppercase transition-all whitespace-nowrap rounded-lg cursor-pointer",
                    selectedMissionId === m.id
                      ? "text-black border-transparent shadow-md"
                      : "border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[var(--card-border)]/50 hover:text-[var(--text-primary)]"
                  )}
                  style={selectedMissionId === m.id ? { backgroundColor: currentTheme.color, borderColor: currentTheme.color, boxShadow: `0 0 15px ${currentTheme.color}33` } : {}}
                >
                  {m.title.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}

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
            {isRTL ? 'الكل' : 'ALL'}
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
              {searchQuery 
                ? (isRTL ? 'لا توجد ملاحظات مطابقة' : 'No matching notes') 
                : (isRTL ? 'لا توجد ملاحظات بعد — أضف ملاحظتك الأولى' : 'No notes yet — add your first')}
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
                
                // Clean preview text
                const plainText = (note.content || '')
                  .replace(/<[^>]*>/g, '') // Strip HTML
                  .replace(/[#*`_~]/g, '') // Strip Markdown symbols
                  .trim()
                  .slice(0, 60) || (isRTL ? 'ملاحظة فارغة...' : 'Empty note...')

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
                      isRTL ? "text-right" : "text-left",
                      note._isTaskNote && (isRTL 
                        ? "border-r-2 border-indigo-500/50 shadow-[inset_-3px_0_10px_rgba(99,102,241,0.05)]" 
                        : "border-l-2 border-indigo-500/50 shadow-[inset_3px_0_10px_rgba(99,102,241,0.05)]"
                      )
                    )}
                  >
                    {/* Neon top accent */}
                    <div
                      className="absolute top-0 left-0 right-0 h-[1px] opacity-60 group-hover:opacity-100 transition-opacity"
                      style={{ background: `linear-gradient(90deg, transparent, ${noteColor}, transparent)` }}
                    />

                    {/* Mission badge */}
                    {linkedMission && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation()
                          const mId = linkedMission.id || note.mission_id || note.cup_id
                          if (mId) router.push(`/missions/${mId}`)
                        }}
                        className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-sm text-[8px] font-space font-black tracking-wider uppercase hover:bg-zinc-800 hover:scale-105 transition-all cursor-pointer z-10"
                        style={{ backgroundColor: `${noteColor}15`, color: noteColor, border: `1px solid ${noteColor}30` }}
                      >
                        <Link className="text-[10px]" />
                        <span className="max-w-[80px] truncate">{linkedMission.title}</span>
                      </div>
                    )}

                    {/* Pin indicator */}
                    {note.is_locked && (
                      <div className="absolute top-3 left-3 opacity-50">
                        <Pin className="text-sm w-3.5 h-3.5" style={{ color: noteColor }} />
                      </div>
                    )}

                    {/* Title (Fix 5) */}
                    <h3 className="text-xl font-black font-space text-[var(--text-primary)] mt-4 uppercase tracking-tighter truncate">
                      {note.title && note.title !== 'Untitled Note' ? note.title : (isRTL ? `ملاحظة — ${dateSuffix}` : `Note — ${dateSuffix}`)}
                    </h3>

                    {/* Preview */}
                    <p className={cn(
                       'text-xs leading-relaxed text-[var(--text-secondary)] mt-3 font-space'
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
                        {note._isTaskNote && (
                          <span 
                            className="flex items-center gap-1 text-[8px] font-mono text-indigo-400 font-bold uppercase tracking-wider bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20"
                            title="Embedded Task Note"
                          >
                            <Layers className="text-[10px]" />
                            {isRTL ? 'مدمج' : 'NESTED'}
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
                        <Trash2 className="text-base w-4 h-4" />
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
              className="w-[calc(100%-2rem)] mx-auto md:max-w-3xl p-5 md:p-12 relative border border-[var(--card-border)] bg-[var(--card-bg)] backdrop-blur-3xl shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-y-auto max-h-[90vh] rounded-2xl my-auto"
            >
              {/* Neon top bar */}
              <div
                className="absolute top-0 left-0 right-0 h-[1px]"
                style={{ background: `linear-gradient(90deg, transparent, ${currentTheme.color}, transparent)` }}
              />

              <div className="flex justify-between items-center mb-6">
                 {editingNote.cups && (
                    <div 
                      onClick={() => {
                        const mId = editingNote.cups.id || editingNote.mission_id || editingNote.cup_id
                        if (mId) {
                          setEditingNote(null)
                          router.push(`/missions/${mId}`)
                        }
                      }}
                      className="flex items-center gap-2 text-[10px] font-space font-black tracking-widest uppercase hover:underline cursor-pointer transition-all" 
                      style={{ color: currentTheme.color }}
                    >
                      <Link className="text-sm w-3.5 h-3.5" />
                      {isRTL ? `مرتبط بـ: ${editingNote.cups.title}` : `Linked to: ${editingNote.cups.title}`}
                    </div>
                 )}
                  <span className="text-[9px] font-space text-[var(--text-secondary)]/30 font-black tracking-widest">
                    ID: {editingNote?.id?.slice(0, 8) ?? 'NEW'}
                  </span>
               </div>

              <input 
                 value={editingNote.title || ''}
                 onChange={(e) => updateNote(editingNote.id, { title: e.target.value })}
                 placeholder={isRTL ? 'عنوان الملاحظة...' : 'Note title...'}
                 className={cn(
                   "w-full bg-transparent border-none p-0 mb-8 font-space font-black text-4xl md:text-5xl text-[var(--text-primary)] outline-none transition-colors tracking-tighter",
                   isRTL ? "text-right" : "text-left"
                 )}
                 onFocus={e => e.currentTarget.style.color = currentTheme.color}
                 onBlur={e => e.currentTarget.style.color = ''}
               />

              <button
                onClick={() => setEditingNote(null)}
                 className="absolute top-5 right-5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
              >
                <X className="text-2xl w-6 h-6" />
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
                    className={cn('p-2.5 border rounded-xl transition-all', editingNote.font_settings?.[field] === active ? 'bg-[var(--input-bg)] border-[var(--card-border)]' : 'bg-[var(--input-bg)] border border-[var(--card-border)] hover:opacity-80')}
                  >
                    <span className="material-symbols-outlined text-[var(--text-primary)] text-base">{icon}</span>
                  </button>
                ))}
                <button
                  onClick={() => updateNote(editingNote.id, {
                    font_settings: { ...editingNote.font_settings, family: editingNote.font_settings?.family === 'tajawal' ? 'space' : 'tajawal' }
                  })}
                  className={cn('px-5 py-2 border rounded-xl font-space text-sm font-black tracking-widest text-[var(--text-primary)] transition-all', editingNote.font_settings?.family === 'tajawal' ? 'bg-[var(--input-bg)] border-[var(--card-border)]' : 'bg-[var(--input-bg)] border border-[var(--card-border)] hover:opacity-80')}
                >
                  {editingNote.font_settings?.family === 'tajawal' ? 'TAJAWAL' : 'SPACE'}
                </button>
                <button
                  onClick={() => updateNote(editingNote.id, { is_locked: !editingNote.is_locked })}
                  className={cn('p-2.5 border rounded-xl transition-all', editingNote.is_locked ? 'text-black border-transparent' : 'bg-[var(--input-bg)] border border-[var(--card-border)] hover:opacity-80')}
                  style={editingNote.is_locked ? { backgroundColor: currentTheme.color, boxShadow: `0 0 10px ${currentTheme.color}55` } : {}}
                >
                  <Pin className="text-base w-4 h-4" />
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
                      "py-2.5 px-4 rounded-xl font-space text-[10px] font-black tracking-widest border transition-all",
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
                  {isRTL ? 'محرر اللوحة' : 'Canvas Editor'}
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
                  isRTL ? "text-right" : "text-left"
                )}
                dir="auto"
              />

              <div className="pt-8 border-t border-[var(--card-border)] flex justify-end items-center">
                <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                   <span className="text-[9px] font-space tracking-widest uppercase font-black">
                     {isRTL ? 'حفظ تلقائي' : 'Auto-saved'}
                   </span>
                  <Save className="text-xl w-5 h-5" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Shell>
  )
}
