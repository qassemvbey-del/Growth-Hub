'use client'

/* Commented out original imports for safety rules
import { FileText, Keyboard, Layers, Link, Pin, Plus, Save, Search, Trash2, X, Bold, Italic } from 'lucide-react'
*/
import { FileText, Keyboard, Layers, Link, Pin, Plus, Save, Search, Trash2, X, Bold, Italic, Target } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
// import Shell from '@/components/layout/Shell'
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
  // const [newMissionId, setNewMissionId] = useState<string>('')
  const [newGoalId, setNewGoalId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTag, setFilterTag] = useState('all')
  // const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null)
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const [noteSourceFilter, setNoteSourceFilter] = useState<'all' | 'personal' | 'task'>('personal')
  const router = useRouter()
  const supabase = createClient()
  const { currentTheme, isRTL, mounted } = useGrowth()

  // const uniqueMissions = useMemo(() => {
  //   const missionsMap = new Map<string, string>()
  //   notes.forEach(note => {
  //     const missionId = note.cups?.id || note.mission_id || note.cup_id
  //     const missionTitle = note.cups?.title || note.cups_title
  //     if (missionId && missionTitle) {
  //       missionsMap.set(missionId, missionTitle)
  //     }
  //   })
  //   return Array.from(missionsMap.entries()).map(([id, title]) => ({ id, title }))
  // }, [notes])
  const uniqueGoals = useMemo(() => {
    const goalsMap = new Map<string, string>()
    notes.forEach(note => {
      const goalId = note.cups?.id || note.goal_id
      const goalTitle = note.cups?.title || note.cups_title
      if (goalId && goalTitle) {
        goalsMap.set(goalId, goalTitle)
      }
    })
    return Array.from(goalsMap.entries()).map(([id, title]) => ({ id, title }))
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
          .select('*, goals(id, title)')
          .eq('user_id', user.id)
        if (notesData) dbNotes = notesData

        // 2. Fetch all user cups (missions) with tasks
        const { data: cupsData } = await supabase
          .from('goals')
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
                    // pos_x: 0,
                    // pos_y: 0,
                    position_x: 0,
                    position_y: 0,
                    font_settings: { family: 'space', weight: 'normal', style: 'normal' },
                    // mission_id: mission.id,
                    goal_id: mission.id,
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
                // pos_x: 0,
                // pos_y: 0,
                position_x: 0,
                position_y: 0,
                font_settings: { family: 'space', weight: 'normal', style: 'normal' },
                // mission_id: mission.id,
                goal_id: mission.id,
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
        .from('goals')
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
        // const { task_id, mission_id, _noteIndex } = noteToDelete
        // if (mission_id && mission_id.startsWith('local_')) {
        //   // Guest mode
        //   const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
        //   const goal = guestGoals.find((g: any) => g.id === mission_id)
        const { task_id, goal_id, _noteIndex } = noteToDelete
        if (goal_id && goal_id.startsWith('local_')) {
          // Guest mode
          const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
          const goal = guestGoals.find((g: any) => g.id === goal_id)
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
      // const { task_id, mission_id, _noteIndex } = noteToUpdate
      // if (mission_id && mission_id.startsWith('local_')) {
      //   // Guest mode
      //   const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
      //   const goal = guestGoals.find((g: any) => g.id === mission_id)
      const { task_id, goal_id, _noteIndex } = noteToUpdate
      if (goal_id && goal_id.startsWith('local_')) {
        // Guest mode
        const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
        const goal = guestGoals.find((g: any) => g.id === goal_id)
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
      // console.log("FINAL_PAYLOAD_DEBUG:", JSON.stringify(updates, null, 2));
      // await supabase.from('notes').update(updates).eq('id', id)
      
      const allowedKeys = ['title', 'content', 'tag', 'goal_id', 'is_locked', 'position_x', 'position_y', 'font_settings']
      const sanitizedUpdates: any = {}
      allowedKeys.forEach(key => {
        if (updates[key] !== undefined) {
          sanitizedUpdates[key] = updates[key]
        }
      })
      console.log("FINAL_PAYLOAD_DEBUG:", JSON.stringify(sanitizedUpdates, null, 2))
      await supabase.from('notes').update(sanitizedUpdates).eq('id', id)
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
    // const missionId = n.cups?.id || n.mission_id || n.cup_id
    // const matchesMission = selectedMissionId === null || missionId === selectedMissionId
    const goalId = n.cups?.id || n.goal_id
    const matchesGoal = selectedGoalId === null || goalId === selectedGoalId
    const matchesSource = (
      noteSourceFilter === 'all' ||
      (noteSourceFilter === 'personal' && !n._isTaskNote) ||
      (noteSourceFilter === 'task' && n._isTaskNote)
    )
    return matchesSearch && matchesTag && matchesGoal && matchesSource
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
      // pos_x: 0,
      // pos_y: 0,
      position_x: 0,
      position_y: 0,
      font_settings: { family: 'space', weight: 'normal', style: 'normal' }
    }
    // if (newMissionId) newNote.mission_id = newMissionId
    if (newGoalId) newNote.goal_id = newGoalId

    const { data } = await supabase.from('notes').insert(newNote).select('*, goals(id, title)').single()
    if (data) {
      setNotes([data, ...notes])
      setIsCreating(false)
      setNewContent('')
      setNewTitle('')
      setNewTag('')
      // setNewMissionId('')
      setNewGoalId('')
    }
  }

  if (loading) return (
    <>
      <div className="p-4 md:p-12 space-y-10">
        {/* Subtle holographic connection subtitle */}
        <div className="text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--theme-color)]/5 border border-[var(--theme-color)]/10 backdrop-blur-md">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--theme-color)] animate-ping" />
            <span className="font-space text-[9px] tracking-[0.25em] font-black uppercase text-[var(--theme-color)]">
              {isRTL ? 'جاري تحميل الملاحظات...' : 'Loading notes...'}
            </span>
          </div>
        </div>

        {/* Shimmer skeleton matching notes grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div 
              key={idx}
              className="relative p-7 border border-[var(--card-border)] bg-[var(--card-bg)] min-h-[220px] flex flex-col justify-between overflow-hidden"
            >
              {/* Shimmer Accent top border */}
              <div 
                className="absolute top-0 left-0 right-0 h-[1.5px]" 
                style={{ background: `linear-gradient(90deg, transparent, ${currentTheme.color}60, transparent)` }} 
              />
              
              {/* Fake Mission Badge Link */}
              <div className="w-20 h-4 rounded bg-[var(--theme-color)]/10 self-end mb-2" />

              {/* Fake Title */}
              <div className="w-3/4 h-5 rounded bg-[var(--theme-color)]/10 mt-4 mb-3" />

              {/* Fake Content Lines */}
              <div className="space-y-2 flex-1 mt-2">
                <div className="w-full h-3 rounded bg-[var(--theme-color)]/5" />
                <div className="w-5/6 h-3 rounded bg-[var(--theme-color)]/5" />
                <div className="w-2/3 h-3 rounded bg-[var(--theme-color)]/5" />
              </div>

              {/* Fake Footer */}
              <div className="flex justify-between items-center mt-5 pt-3 border-t border-[var(--card-border)]/30">
                <div className="flex gap-2">
                  <div className="w-10 h-4.5 rounded bg-[var(--theme-color)]/15" />
                  <div className="w-12 h-3.5 rounded bg-[var(--theme-color)]/5 align-middle self-center" />
                </div>
                <div className="w-4 h-4 rounded bg-[var(--theme-color)]/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )

  return (
    <>
      <div className="p-4 md:p-12 space-y-10">
        {/* Header */}
        <header className="flex flex-col gap-4 w-full">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-3">
              <h1 className={cn(
                "font-black font-heading tracking-tight text-black dark:text-white leading-none",
                isRTL ? "text-2xl md:text-5xl" : "text-2xl md:text-5xl"
              )}>
                {isRTL ? 'الملاحظات' : 'Notes'}
              </h1>
              <span className="inline-flex items-center justify-center px-3 py-1 bg-white/10 rounded-md text-sm font-space font-bold text-white/50 tracking-normal normal-case">
                {filteredNotes.length}
              </span>
            </div>

            {/* Mobile Add Note Button (placed in row with title on mobile) */}
            <button
              onClick={() => setIsCreating(true)}
              className="flex md:hidden flex-row items-center justify-center gap-2 h-11 px-4 bg-white/5 border border-white/10 text-white/70 font-medium transition-all duration-150 text-sm rounded-xl shrink-0 active:scale-[0.97] hover:bg-white/10 hover:text-white"
            >
              <Plus className="w-4 h-4" />
              {isRTL ? 'إضافة' : 'Add'}
            </button>
          </motion.div>

          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 w-full">
            {/* Search Bar */}
            <div className="relative group flex-1 md:flex-none">
              <Search className={cn(" absolute top-1/2 -translate-y-1/2 text-[var(--text-secondary)]/40 group-focus-within:text-[var(--text-secondary)] transition-colors text-[18px]", isRTL ? "right-3.5" : "left-3.5")} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={isRTL ? 'البحث في الملاحظات...' : 'Search notes...'}
                className={cn(
                  "h-11 w-full md:w-64 bg-white/5 border border-white/5 rounded-2xl font-space text-[11px] text-[var(--text-primary)] tracking-wide outline-none focus:outline-none focus:ring-2 focus:border-transparent transition-all",
                  isRTL ? "pr-10 pl-4" : "pl-10 pr-4"
                )}
                style={{ ['--tw-ring-color' as any]: `${currentTheme.color}55` }}
              />
            </div>

            {/* Desktop Add Note Button */}
            <button
              onClick={() => setIsCreating(true)}
              className="hidden md:flex flex-row items-center justify-center gap-2 h-11 px-5 bg-white/5 border border-white/10 text-white/70 font-medium transition-all duration-150 text-sm rounded-xl shrink-0 active:scale-[0.97] hover:bg-white/10 hover:text-white"
            >
              <Plus className="w-4 h-4" />
              {isRTL ? 'إضافة ملاحظة' : 'New Note'}
            </button>
          </div>
        </header>

        {/* Sleek Source Origin Segmented Selector to filter out Comments/Task Notes */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-black/5 dark:border-white/5 pb-4">
          {/* Commented out legacy Source Origin Selector for safety rules
          <div className="flex bg-[var(--input-bg)] border border-[var(--card-border)] rounded-full p-1 w-full sm:w-auto relative shadow-sm overflow-x-auto flex-nowrap scrollbar-hide -webkit-overflow-scrolling-touch scroll-snap-x gap-2 px-4 pb-1 max-w-full">
            <button 
              onClick={() => setNoteSourceFilter('personal')}
              className={cn(
                "flex-1 sm:flex-none h-9 px-4 rounded-full text-[13px] font-space font-black tracking-wider uppercase transition-all duration-200 cursor-pointer text-center whitespace-nowrap scroll-snap-align-start flex-shrink-0 min-w-fit flex items-center justify-center border",
                noteSourceFilter === 'personal' 
                  ? "text-black border-transparent shadow-md font-black" 
                  : "border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold"
              )}
              style={noteSourceFilter === 'personal' ? { backgroundColor: currentTheme.color } : {}}
            >
              {isRTL ? 'ملاحظاتي الحرة' : 'PERSONAL NOTES'}
            </button>
            <button 
              onClick={() => setNoteSourceFilter('task')}
              className={cn(
                "flex-1 sm:flex-none h-9 px-4 rounded-full text-[13px] font-space font-black tracking-wider uppercase transition-all duration-200 cursor-pointer text-center whitespace-nowrap scroll-snap-align-start flex-shrink-0 min-w-fit flex items-center justify-center border",
                noteSourceFilter === 'task' 
                  ? "text-black border-transparent shadow-md font-black" 
                  : "border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold"
              )}
              style={noteSourceFilter === 'task' ? { backgroundColor: currentTheme.color } : {}}
            >
              {isRTL ? 'تعليقات المهام' : 'TASK COMMENTS'}
            </button>
            <button 
              onClick={() => setNoteSourceFilter('all')}
              className={cn(
                "flex-1 sm:flex-none h-9 px-4 rounded-full text-[13px] font-space font-black tracking-wider uppercase transition-all duration-200 cursor-pointer text-center whitespace-nowrap scroll-snap-align-start flex-shrink-0 min-w-fit flex items-center justify-center border",
                noteSourceFilter === 'all' 
                  ? "text-black border-transparent shadow-md font-black" 
                  : "border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold"
              )}
              style={noteSourceFilter === 'all' ? { backgroundColor: currentTheme.color } : {}}
            >
              {isRTL ? 'عرض الكل' : 'SHOW ALL'}
            </button>
          </div>
          */}
          <div className="flex bg-[var(--input-bg)] border border-[var(--card-border)] rounded-full p-0.5 w-full sm:w-auto relative shadow-sm overflow-x-auto flex-nowrap scrollbar-hide -webkit-overflow-scrolling-touch scroll-snap-x gap-1 px-2 pb-0.5 max-w-full">
            <button 
              onClick={() => setNoteSourceFilter('personal')}
              className={cn(
                "flex-1 sm:flex-none h-7 px-3 py-1 rounded-full text-[10px] font-space font-black tracking-wider uppercase transition-all duration-200 cursor-pointer text-center whitespace-nowrap scroll-snap-align-start flex-shrink-0 min-w-fit flex items-center justify-center border",
                noteSourceFilter === 'personal' 
                  ? "text-black border-transparent shadow-md font-black" 
                  : "border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold"
              )}
              style={noteSourceFilter === 'personal' ? { backgroundColor: currentTheme.color } : {}}
            >
              {isRTL ? 'ملاحظاتي الحرة' : 'PERSONAL NOTES'}
            </button>
            <button 
              onClick={() => setNoteSourceFilter('task')}
              className={cn(
                "flex-1 sm:flex-none h-7 px-3 py-1 rounded-full text-[10px] font-space font-black tracking-wider uppercase transition-all duration-200 cursor-pointer text-center whitespace-nowrap scroll-snap-align-start flex-shrink-0 min-w-fit flex items-center justify-center border",
                noteSourceFilter === 'task' 
                  ? "text-black border-transparent shadow-md font-black" 
                  : "border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold"
              )}
              style={noteSourceFilter === 'task' ? { backgroundColor: currentTheme.color } : {}}
            >
              {isRTL ? 'تعليقات المهام' : 'TASK COMMENTS'}
            </button>
            <button 
              onClick={() => setNoteSourceFilter('all')}
              className={cn(
                "flex-1 sm:flex-none h-7 px-3 py-1 rounded-full text-[10px] font-space font-black tracking-wider uppercase transition-all duration-200 cursor-pointer text-center whitespace-nowrap scroll-snap-align-start flex-shrink-0 min-w-fit flex items-center justify-center border",
                noteSourceFilter === 'all' 
                  ? "text-black border-transparent shadow-md font-black" 
                  : "border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold"
              )}
              style={noteSourceFilter === 'all' ? { backgroundColor: currentTheme.color } : {}}
            >
              {isRTL ? 'عرض الكل' : 'SHOW ALL'}
            </button>
          </div>

          <div className="text-[10px] text-[var(--text-secondary)]/60 tracking-wide hidden sm:block">
            {isRTL 
              ? `عرض ${filteredNotes.length} من إجمالي ${notes.length}`
              : `Showing ${filteredNotes.length} of ${notes.length}`}
          </div>
        </div>

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
                      "px-3 py-1.5 rounded-md font-space text-[9px] font-black tracking-widest border transition-all",
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
                    // value={newMissionId}
                    // onChange={val => setNewMissionId(val)}
                    value={newGoalId}
                    onChange={val => setNewGoalId(val)}
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
                  <button onClick={() => { setIsCreating(false); setNewContent(''); setNewTitle(''); setNewTag(''); setNewGoalId('') }} className="text-[var(--text-secondary)] font-space uppercase text-[10px] tracking-widest hover:text-[var(--text-primary)] transition-all">{isRTL ? 'إلغاء' : 'CANCEL'}</button>
                  <button 
                    onClick={createNote} 
                    className="px-8 py-2 text-black font-space font-black uppercase text-xs tracking-widest rounded-md transition-all duration-300 hover:brightness-110 active:scale-95"
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
        {uniqueGoals.length > 0 && (
          /* Commented out legacy bordered container and title for safety
          <div className="flex flex-col gap-2 bg-white/[0.01] dark:bg-white/[0.01] border border-black/5 dark:border-white/5 p-4 rounded-md backdrop-blur-md">
            <span className="text-[10px] font-space text-black/40 dark:text-white/30 tracking-widest uppercase font-black">
              {isRTL ? 'تصفية حسب الهدف' : 'Filter by Goal'}
            </span>
            <div className="flex overflow-x-auto flex-nowrap scrollbar-hide -webkit-overflow-scrolling-touch scroll-snap-x gap-2 px-4 pb-2.5 max-w-full">
              <button
                onClick={() => setSelectedGoalId(null)}
                className={cn(
                  "h-9 px-4 rounded-full text-[13px] border font-space font-black tracking-widest uppercase transition-all duration-200 whitespace-nowrap scroll-snap-align-start flex-shrink-0 min-w-fit flex items-center justify-center cursor-pointer",
                  selectedGoalId === null
                    ? "text-black border-transparent shadow-md"
                    : "border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[var(--card-border)]/50 hover:text-[var(--text-primary)]"
                )}
                style={selectedGoalId === null ? { backgroundColor: currentTheme.color, borderColor: currentTheme.color, boxShadow: `0 0 15px ${currentTheme.color}33` } : {}}
              >
                {isRTL ? 'جميع الأهداف' : 'ALL GOALS'}
              </button>
              {uniqueGoals.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedGoalId(selectedGoalId === m.id ? null : m.id)}
                  className={cn(
                    "h-9 px-4 rounded-full text-[13px] border font-space font-black tracking-widest uppercase transition-all duration-200 whitespace-nowrap scroll-snap-align-start flex-shrink-0 min-w-fit flex items-center justify-center cursor-pointer",
                    selectedGoalId === m.id
                      ? "text-black border-transparent shadow-md"
                      : "border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[var(--card-border)]/50 hover:text-[var(--text-primary)]"
                  )}
                  style={selectedGoalId === m.id ? { backgroundColor: currentTheme.color, borderColor: currentTheme.color, boxShadow: `0 0 15px ${currentTheme.color}33` } : {}}
                >
                  {m.title.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          */
          <div className="w-full">
            <div className="flex overflow-x-auto flex-nowrap scrollbar-hide -webkit-overflow-scrolling-touch scroll-snap-x gap-1.5 px-1 pb-1.5 max-w-full">
              <button
                onClick={() => setSelectedGoalId(null)}
                className={cn(
                  "h-7 px-3 py-1 rounded-full text-[10px] border font-space font-black tracking-widest uppercase transition-all duration-200 whitespace-nowrap scroll-snap-align-start flex-shrink-0 min-w-fit flex items-center justify-center cursor-pointer",
                  selectedGoalId === null
                    ? "text-black border-transparent shadow-md"
                    : "border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[var(--card-border)]/50 hover:text-[var(--text-primary)]"
                )}
                style={selectedGoalId === null ? { backgroundColor: currentTheme.color, borderColor: currentTheme.color, boxShadow: `0 0 15px ${currentTheme.color}33` } : {}}
              >
                {isRTL ? 'جميع الأهداف' : 'ALL GOALS'}
              </button>
              {uniqueGoals.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedGoalId(selectedGoalId === m.id ? null : m.id)}
                  className={cn(
                    "h-7 px-3 py-1 rounded-full text-[10px] border font-space font-black tracking-widest uppercase transition-all duration-200 whitespace-nowrap scroll-snap-align-start flex-shrink-0 min-w-fit flex items-center justify-center cursor-pointer",
                    selectedGoalId === m.id
                      ? "text-black border-transparent shadow-md"
                      : "border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[var(--card-border)]/50 hover:text-[var(--text-primary)]"
                  )}
                  style={selectedGoalId === m.id ? { backgroundColor: currentTheme.color, borderColor: currentTheme.color, boxShadow: `0 0 15px ${currentTheme.color}33` } : {}}
                >
                  {m.title.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Commented out legacy Tag Filter Bar for safety rules
        <div className="flex overflow-x-auto flex-nowrap scrollbar-hide -webkit-overflow-scrolling-touch scroll-snap-x gap-2 px-4 pb-2.5 max-w-full">
          <button
            onClick={() => setFilterTag('all')}
            className={cn(
              "h-9 px-4 rounded-full text-[13px] border font-space font-black tracking-widest uppercase transition-all duration-200 whitespace-nowrap scroll-snap-align-start flex-shrink-0 min-w-fit flex items-center justify-center cursor-pointer",
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
                "h-9 px-4 rounded-full text-[13px] border font-space font-black tracking-widest uppercase transition-all duration-200 whitespace-nowrap scroll-snap-align-start flex-shrink-0 min-w-fit flex items-center justify-center cursor-pointer",
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
        */}

        {/* Tag Filter Bar */}
        <div className="flex overflow-x-auto flex-nowrap scrollbar-hide -webkit-overflow-scrolling-touch scroll-snap-x gap-1.5 px-1 pb-1.5 max-w-full">
          <button
            onClick={() => setFilterTag('all')}
            className={cn(
              "h-7 px-3 py-1 rounded-full text-[10px] border font-space font-black tracking-widest uppercase transition-all duration-200 whitespace-nowrap scroll-snap-align-start flex-shrink-0 min-w-fit flex items-center justify-center cursor-pointer",
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
                "h-7 px-3 py-1 rounded-full text-[10px] border font-space font-black tracking-widest uppercase transition-all duration-200 whitespace-nowrap scroll-snap-align-start flex-shrink-0 min-w-fit flex items-center justify-center cursor-pointer",
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
        {/* Original flat empty state replaced — see git history for old version */}
        {filteredNotes.length === 0 ? (
          <div className="flex items-center justify-center py-12 sm:py-20">
            <div 
              className="w-full max-w-md mx-auto p-6 sm:p-8 border border-white/10 bg-black/40 backdrop-blur-xl rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden"
              style={{ boxShadow: `0 0 25px ${currentTheme.color}10, inset 0 0 15px ${currentTheme.color}05` }}
            >
              {/* Decorative corner accents */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 rounded-tl-2xl pointer-events-none" style={{ borderColor: `${currentTheme.color}30` }} />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 rounded-br-2xl pointer-events-none" style={{ borderColor: `${currentTheme.color}30` }} />

              {/* Pulsing circular badge */}
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mb-5 relative"
                style={{ backgroundColor: `${currentTheme.color}10`, border: `1px solid ${currentTheme.color}30`, boxShadow: `0 0 20px ${currentTheme.color}20` }}
              >
                <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: currentTheme.color }} />
                <FileText className="w-7 h-7 animate-pulse" style={{ color: currentTheme.color }} />
              </div>

              {/* Status label */}
              <span className="text-[10px] uppercase tracking-[0.2em] font-space font-black mb-2" style={{ color: currentTheme.color }}>
                {searchQuery 
                  ? (isRTL ? 'نتائج البحث' : 'SEARCH RESULTS') 
                  : (isRTL ? 'الملاحظات' : 'NOTES')}
              </span>

              {/* <h3 className="text-sm font-bold font-space text-zinc-200 tracking-wide uppercase mb-1"> */}
              <h3 className="text-sm font-bold font-space text-zinc-200 tracking-wide mb-1">
                {searchQuery
                  ? (isRTL ? 'لا توجد ملاحظات مطابقة' : 'No Matching Notes Found')
                  : (isRTL ? 'لا توجد ملاحظات مضافة بعد' : 'No notes added yet')}
              </h3>

              <p className="text-xs font-space text-zinc-500 leading-relaxed max-w-[280px]">
                {searchQuery
                  ? (isRTL ? 'جرب كلمات بحث مختلفة للعثور على ما تبحث عنه.' : 'Try different search terms to find what you\'re looking for.')
                  : (isRTL ? 
                      // 'لا توجد ملاحظات مضافة بعد. اضغط على زر "إضافة ملاحظة" لكتابة فكرتك الأولى.'
                      'كشكولك فاضي. اكتب أول فكرة تيجي في دماغك هنا.'
                      : 
                      // 'You haven\'t added any notes yet. Tap "Add Note" to write your first one.'
                      'Your notebook is empty. Drop your first thought here.'
                    )}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredNotes.map((note, idx) => {
                const noteColor = currentTheme.color
                const linkedMission = note.cups
                const tagObj = TAGS.find(t => t.value === note.tag)
                const dateObj = new Date(note.created_at)
                const date = dateObj.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                const dateSuffix = `${dateObj.getDate()}_${dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}`
                const plainText = (note.content || '')
                  .replace(/<[^>]*>/g, '') // Strip HTML
                  .replace(/[#*`_~]/g, '') // Strip Markdown symbols
                  .trim()
                  .slice(0, 160) || (isRTL ? 'ملاحظة فارغة...' : 'Empty note...')

                return (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => setEditingNote(note)}
                    className={cn(
                      /* Commented out original card styles for safety rules
                      "group relative px-4 py-3 border cursor-pointer transition-all duration-300 h-auto flex flex-col",
                      "bg-[var(--card-bg)] border-[var(--card-border)] hover:border-[var(--card-border)]/50",
                      "backdrop-blur-xl",
                      */
                      "group relative p-4 border cursor-pointer h-auto flex flex-col rounded-2xl transition-all duration-300",
                      /* Commented out original border settings for safety rules
                      "bg-zinc-900/10 dark:bg-zinc-900/30 border-zinc-200/50 dark:border-zinc-800/60 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50 hover:border-zinc-300 dark:hover:border-zinc-700",
                      */
                      "bg-zinc-900/20 backdrop-blur-xl border-white/5 hover:bg-zinc-900/30 hover:border-white/10",
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

                    {/* Pin indicator */}
                    {note.is_locked && (
                      <div className="absolute top-3 left-3 opacity-50">
                        <Pin className="text-sm w-3.5 h-3.5" style={{ color: noteColor }} />
                      </div>
                    )}

                    {/* Group Title and Preview into space-y-0.5 */}
                    <div className="flex flex-col space-y-0.5">
                      {/* Title */}
                      <h3 className="text-sm font-medium font-space text-[var(--text-primary)] uppercase tracking-wide truncate">
                        {note.title && note.title !== 'Untitled Note' ? note.title : (isRTL ? `ملاحظة — ${dateSuffix}` : `Note — ${dateSuffix}`)}
                      </h3>

                      {/* Preview */}
                      <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 font-space line-clamp-3">
                        "{plainText}"
                      </p>
                    </div>

                    {/* Footer / Meta */}
                    <div className="mt-auto pt-3 border-t border-zinc-200/10 dark:border-zinc-800/20 flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                         {tagObj && (
                           /* Commented out legacy border styled tags for safety rules
                           <span 
                             className="px-1.5 py-0.5 border text-[9px] font-black font-space tracking-widest uppercase rounded"
                             style={{ borderColor: `${noteColor}40`, color: noteColor, backgroundColor: `${noteColor}08` }}
                           >
                             {tagObj.label}
                           </span>
                           */
                           <span className="px-1.5 py-0.5 border border-zinc-200/10 dark:border-zinc-800/30 text-[10px] font-bold font-space tracking-wider uppercase rounded text-zinc-600 dark:text-zinc-500 bg-zinc-800/5">
                             {tagObj.label}
                           </span>
                         )}
                         {note._isTaskNote && (
                           <span 
                             className="text-[10px] font-bold text-indigo-400/80 shrink-0 select-none mr-1"
                             title={isRTL ? 'تعليق مدمج بالمهمة' : 'Nested Task Comment'}
                           >
                             ↳
                           </span>
                         )}
                         {/* Commented out original smaller Date span for safety rules
                         <span className="text-[9px] font-space text-[var(--text-secondary)] font-black tracking-widest shrink-0">
                           {date}
                         </span>
                         */}
                         <span className="text-[10px] font-space text-zinc-600 dark:text-zinc-500 font-bold tracking-wider shrink-0 select-none">
                           {date}
                         </span>
                         {linkedMission && (
                           <div 
                             onClick={(e) => {
                               e.stopPropagation()
                               const mId = linkedMission.id || note.goal_id
                               if (mId) {
                                 const g = missions.find(m => m.id === mId)
                                 const isPublic = g?.metadata?.type === 'public'
                                 router.push(isPublic ? `/goals/public/${mId}` : `/goals/squad/${mId}`)
                               }
                             }}
                             className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-400 transition-all cursor-pointer select-none"
                           >
                             <Target className="w-3.5 h-3.5" style={{ color: noteColor }} />
                             <span className="max-w-[100px] truncate font-space font-bold uppercase tracking-wider">{linkedMission.title}</span>
                           </div>
                         )}
                      </div>
                      
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteNote(note.id) }}
                        className="text-[var(--text-secondary)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      >
                        <Trash2 className="text-base w-3.5 h-3.5" />
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
              className="w-[calc(100%-2rem)] mx-auto md:max-w-3xl p-5 md:p-12 pb-28 relative border border-white/5 bg-zinc-900/20 backdrop-blur-xl shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col h-auto min-h-[300px] max-h-[90vh] overflow-hidden rounded-3xl my-auto"
            >
              {/* Neon top bar */}
              <div
                className="absolute top-0 left-0 right-0 h-[1px]"
                style={{ background: `linear-gradient(90deg, transparent, ${currentTheme.color}, transparent)` }}
              />

              {/* Sticky Controls Header */}
              <div className="flex-shrink-0">
                {/* Compacting Header: Goal selector and close inline on the same line */}
                <div className="flex justify-between items-center w-full mb-3 border-b border-zinc-800/30 pb-2">
                  {missions.length > 0 && (
                    <div className="flex items-center gap-2 max-w-xs sm:max-w-md w-full sm:w-auto">
                      <span className="text-[10px] font-space text-zinc-500 font-bold uppercase tracking-wider shrink-0 select-none">
                        {isRTL ? 'الهدف:' : 'Goal:'}
                      </span>
                      <CustomSelect
                        minimal
                        value={editingNote.goal_id || ''}
                        onChange={val => updateNote(editingNote.id, { goal_id: val || null })}
                        options={[
                          { value: '', label: isRTL ? '— بدون ربط —' : '— NO LINK —' },
                          ...missions.map(m => ({ value: m.id, label: m.title.toUpperCase() }))
                        ]}
                        className="w-full sm:w-auto min-w-[200px]"
                      />
                    </div>
                  )}
                  
                  <button
                    onClick={() => setEditingNote(null)}
                    className="text-[var(--text-secondary)] hover:text-white transition-all cursor-pointer p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Formatting Bar: compact buttons with less padding */}
                <div className="flex gap-1 items-center flex-wrap border-b border-zinc-800/30 pb-2 mb-3">
                  {[
                    { component: Bold, field: 'weight', active: 'bold', inactive: 'normal' },
                    { component: Italic, field: 'style', active: 'italic', inactive: 'normal' },
                  ].map(({ component: IconComp, field, active, inactive }) => (
                    <button
                      key={field}
                      onClick={() => updateNote(editingNote.id, {
                        font_settings: { ...editingNote.font_settings, [field]: editingNote.font_settings?.[field] === active ? inactive : active }
                      })}
                      className={cn('p-1.5 border rounded transition-all cursor-pointer', editingNote.font_settings?.[field] === active ? 'bg-[var(--input-bg)] border-zinc-700' : 'bg-transparent border-zinc-800/60 hover:opacity-80')}
                    >
                      <IconComp className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                    </button>
                  ))}
                  <button
                    onClick={() => updateNote(editingNote.id, {
                      font_settings: { ...editingNote.font_settings, family: editingNote.font_settings?.family === 'tajawal' ? 'space' : 'tajawal' }
                    })}
                    className={cn('px-2.5 py-1.5 border rounded font-space text-[10px] font-black tracking-wider text-[var(--text-primary)] transition-all cursor-pointer', editingNote.font_settings?.family === 'tajawal' ? 'bg-[var(--input-bg)] border-zinc-700' : 'bg-transparent border-zinc-800/60 hover:opacity-80')}
                  >
                    {editingNote.font_settings?.family === 'tajawal' ? 'TAJAWAL' : 'SPACE'}
                  </button>
                  <button
                    onClick={() => updateNote(editingNote.id, { is_locked: !editingNote.is_locked })}
                    className={cn('p-1.5 border rounded transition-all cursor-pointer', editingNote.is_locked ? 'text-black border-transparent' : 'bg-transparent border-zinc-800/60 hover:opacity-80')}
                    style={editingNote.is_locked ? { backgroundColor: currentTheme.color } : {}}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Tags Harmonization: Single flex-wrap row with compact bg-zinc-800/30 pills */}
                <div className="flex gap-1.5 flex-wrap mb-4 border-b border-zinc-800/30 pb-3">
                  {TAGS.map(t => (
                    <button
                      key={t.value}
                      onClick={() => updateNote(editingNote.id, { tag: editingNote.tag === t.value ? null : t.value })}
                      className={cn(
                        "px-2 py-0.5 rounded-full font-space text-[10px] font-bold tracking-wider transition-all border-0 cursor-pointer",
                        editingNote.tag === t.value 
                          ? "text-black font-black" 
                          : "bg-zinc-800/30 text-zinc-400 hover:text-zinc-200"
                      )}
                      style={editingNote.tag === t.value ? { backgroundColor: currentTheme.color } : {}}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable Editor Canvas Area */}
              <div className="flex-grow overflow-y-auto space-y-4 pr-1">
                <input 
                   value={editingNote.title || ''}
                   onChange={(e) => updateNote(editingNote.id, { title: e.target.value })}
                   placeholder={isRTL ? 'عنوان الملاحظة...' : 'Note title...'}
                   className={cn(
                     "w-full bg-transparent border-none p-0 mb-3 font-space font-black text-4xl md:text-5xl text-[var(--text-primary)] outline-none transition-colors tracking-tighter",
                     isRTL ? "text-right" : "text-left"
                   )}
                   onFocus={e => e.currentTarget.style.color = currentTheme.color}
                   onBlur={e => e.currentTarget.style.color = ''}
                 />

                {/* Wikipedia and search areas with shrunk padding */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2 border-b border-zinc-800/20 pb-1">
                  <span className="text-[10px] font-space tracking-widest text-[var(--text-secondary)]/30 uppercase font-black">
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
              </div>

              {/* Sticky Footer */}
              <div className="pt-4 mt-2 flex justify-end items-center shrink-0">
                <div className="flex items-center gap-3 text-zinc-600">
                   <span className="text-[10px] font-space tracking-widest uppercase font-normal">
                     {isRTL ? 'حفظ تلقائي' : 'Auto-saved'}
                   </span>
                  <Save className="text-sm w-4 h-4" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
