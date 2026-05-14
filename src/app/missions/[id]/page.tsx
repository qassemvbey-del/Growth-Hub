'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Shell from '@/components/layout/Shell'
import EnergyCell from '@/components/ui/EnergyCell'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { useGrowth } from '@/context/GrowthContext'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'

// --- HELPER COMPONENT: CYBERPUNK WEIGHT BARS ---
const WeightVisualizer = ({ weight, color, isCompleted = false, onSelect }: { weight: number, color: string, isCompleted?: boolean, onSelect?: (w: number) => void }) => {
  const bars = [1, 2, 3, 4, 5, 6]
  return (
    <div className="flex gap-[3px]">
      {bars.map(i => (
        <div 
          key={i}
          onClick={() => onSelect?.(i)}
          className={cn(
            "w-[6px] h-[16px] transition-all duration-300 rounded-[1px]",
            onSelect ? "cursor-pointer hover:opacity-80" : "",
            i <= weight 
              ? "opacity-100" 
              : "bg-white/5 dark:bg-white/5"
          )}
          style={i <= weight ? { 
            backgroundColor: isCompleted ? '#333' : color,
            boxShadow: isCompleted ? 'none' : `0 0 12px ${color}88`
          } : {}}
        />
      ))}
    </div>
  )
}

export default function MissionDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { calculateAccountability, t, isRTL, mounted, addXp, currentTheme } = useGrowth()
  const { showToast } = useToast()
  const [mission, setMission] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskWeight, setNewTaskWeight] = useState(3)
  const [linkedNotes, setLinkedNotes] = useState<any[]>([])
  const [showIntelModal, setShowIntelModal] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (mounted) fetchMission()
  }, [id, mounted])

  useEffect(() => {
    if (id) fetchLinkedNotes()
  }, [id])

  async function fetchMission() {
    const { data } = await supabase
      .from('cups')
      .select('*, tasks(*)')
      .eq('id', id)
      .single()

    if (data) {
      data.tasks = (data.tasks || []).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      setMission(data)
    } else {
      router.push('/missions')
    }
    setLoading(false)
  }

  async function fetchLinkedNotes() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('mission_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (data) setLinkedNotes(data)
  }

  // MISSION PERSISTENCE ENGINE
  useEffect(() => {
    if (!mission || !mission.tasks || mission.tasks.length === 0) return

    const checkCompletionStatus = async () => {
      const { progress } = calculateAccountability(mission)
      const roundedProgress = Math.round(progress)

      if (roundedProgress === 100 && !mission.is_archived) {
        const { error } = await supabase
          .from('cups')
          .update({ is_archived: true, status: 'completed' })
          .eq('id', id)
        
        if (!error) {
          setMission((prev: any) => ({ ...prev, is_archived: true, status: 'completed' }))
          showToast(isRTL ? 'تم اكتمال المهمة! نقلت إلى الخزنة' : 'MISSION COMPLETE! ARCHIVED TO VAULT', 'success')
        }
      } else if (roundedProgress < 100 && mission.is_archived) {
        const { error } = await supabase
          .from('cups')
          .update({ is_archived: false, status: 'active' })
          .eq('id', id)
        
        if (!error) {
          setMission((prev: any) => ({ ...prev, is_archived: false, status: 'active' }))
        }
      }
    }

    checkCompletionStatus()
  }, [mission?.tasks])

  const toggleTask = async (taskId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus
    const { error } = await supabase
      .from('tasks')
      .update({ is_completed: nextStatus })
      .eq('id', taskId)

    if (!error) {
      setMission((prev: any) => ({
        ...prev,
        tasks: prev.tasks.map((t: any) =>
          t.id === taskId ? { ...t, is_completed: nextStatus } : t
        )
      }))

      if (nextStatus) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('task_completion_log').insert({
            user_id: user.id,
            completed_at: new Date().toISOString()
          })
          const task = mission.tasks.find((t: any) => t.id === taskId)
          if (task) await addXp(task.weight * 10)
        }
      }
    }
  }

  const addTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!newTaskTitle.trim()) return
    
    const payload = {
      cup_id: id,
      title: newTaskTitle.trim(),
      weight: newTaskWeight,
      is_completed: false,
      type: 'standard'
    }

    const { data } = await supabase.from('tasks').insert(payload).select().single()

    if (data) {
      setMission((prev: any) => ({ ...prev, tasks: [...prev.tasks, data] }))
      setNewTaskTitle('')
      showToast(isRTL ? 'تم إضافة الهدف' : 'TASK_SAVED', 'success')
    }
  }

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (!error) {
      setMission((prev: any) => ({
        ...prev,
        tasks: prev.tasks.filter((t: any) => t.id !== taskId)
      }))
    }
  }

  // ── HUD CAPACITY LOGIC ──
  // Total slots = 9 max. S=1 slot, M=1.5 slots, L=3 slots.
  const SIZE_SLOTS: Record<string, number> = { sm: 1, md: 1.5, lg: 3, s: 1, m: 1.5, l: 3, small: 1, medium: 1.5, large: 3 }

  const updateMission = async (updates: any) => {
    // Guard: If enabling HUD sync, check capacity first
    if (updates.sync_to_dashboard === true) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: synced } = await supabase
          .from('cups')
          .select('id, size')
          .eq('user_id', user.id)
          .eq('sync_to_dashboard', true)
          .eq('is_archived', false)
          .neq('id', id) // exclude current mission

        const usedSlots = (synced || []).reduce((acc: number, m: any) => {
          return acc + (SIZE_SLOTS[m.size?.toLowerCase()] ?? 1)
        }, 0)
        const thisMissionSlots = SIZE_SLOTS[mission.size?.toLowerCase()] ?? 1
        const totalAfter = usedSlots + thisMissionSlots

        if (totalAfter > 9) {
          const remaining = Math.max(0, 9 - usedSlots).toFixed(1).replace('.0', '')
          showToast(
            isRTL
              ? `سعة المحطة ممتلئة (${usedSlots.toFixed(1).replace('.0','')}/9 فتحات) - أتمم أو أزل مهمات موجودة.`
              : `FOCUS CAPACITY FULL (${usedSlots.toFixed(1).replace('.0','')}/9 SLOTS) — Complete or un-equip existing missions.`,
            'error'
          )
          return // ← BLOCK the update
        }
      }
    }

    const { error } = await supabase.from('cups').update(updates).eq('id', id)
    if (!error) {
      setMission((prev: any) => ({ ...prev, ...updates }))
      showToast(isRTL ? 'تم التحديث' : 'PROTOCOL_UPDATED', 'success')
    }
  }

  const deleteMission = async () => {
    if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذه المهمة؟' : 'CONFIRM MISSION TERMINATION?')) return
    const { error } = await supabase.from('cups').delete().eq('id', id)
    if (!error) {
      showToast(isRTL ? 'تم حذف المهمة' : 'MISSION TERMINATED', 'success')
      router.push('/missions')
    }
  }

  const { progress, isInRedZone } = useMemo(() => {
    if (!mission) return { progress: 0, isInRedZone: false, status: 'ON_TRACK' }
    return calculateAccountability(mission)
  }, [mission])

  const roundedProgress = Math.round(progress)

  if (loading || !mounted) return (
    <Shell>
      <div className="p-16 font-space animate-pulse tracking-widest text-sm uppercase" style={{ color: currentTheme.color }}>
        {isRTL ? 'جاري التحميل...' : 'LOADING_UPLINK...'}
      </div>
    </Shell>
  )

  const missionColor = currentTheme.color
  const completedCount = mission.tasks?.filter((t: any) => t.is_completed).length || 0
  const totalCount = mission.tasks?.length || 0

  return (
    <Shell>
      <div className="max-w-4xl mx-auto p-4 md:p-12 space-y-8 md:space-y-12">
        
        {/* Mission Header Overview */}
        <section className="bg-white/5 dark:bg-[#0A0A0A] border border-white/5 p-6 md:p-12 rounded-sm space-y-8 md:space-y-10 relative overflow-hidden">
           <div className="absolute top-0 inset-x-0 h-[2.5px]" style={{ background: missionColor }} />
           
           <div className="flex justify-between items-start gap-4">
              <div className="space-y-1 flex-1 min-w-0">
                 <h1 className="text-2xl md:text-5xl font-black font-space tracking-tighter uppercase italic text-black dark:text-white leading-none break-words">
                    {mission.title}
                 </h1>
                 <p className="text-[9px] font-space text-black/30 dark:text-white/20 tracking-widest uppercase font-black">
                    UPLINK_STABLE // MISSION_ID: {mission.id.slice(0, 8).toUpperCase()}
                 </p>
              </div>
               <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex items-center gap-2 md:gap-4">
                     <button 
                        onClick={deleteMission}
                        className="p-2 text-black/20 dark:text-white/10 hover:text-red-500 hover:bg-red-500/10 transition-all rounded-full"
                        title={isRTL ? 'حذف المهمة' : 'DELETE_MISSION'}
                     >
                        <span className="material-symbols-outlined text-xl">delete_forever</span>
                     </button>
                     <span className="text-3xl md:text-6xl font-black font-space italic" style={{ color: missionColor }}>{roundedProgress}%</span>
                  </div>
                  <p className="text-[9px] font-space text-black/30 dark:text-white/20 tracking-[0.4em] uppercase font-black">{isRTL ? 'مزامنة' : 'SYNC_COMPLETE'}</p>
               </div>
           </div>

           <div className="w-full h-[1.5px] bg-black/5 dark:bg-white/5 relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${roundedProgress}%` }}
                className="h-full absolute top-0 start-0"
                style={{ backgroundColor: missionColor, boxShadow: `0 0 15px ${missionColor}` }}
              />
           </div>
        </section>

         {/* Mission Configuration */}
         <section className="flex flex-wrap gap-4 md:gap-6 items-center">
            <button 
               onClick={() => updateMission({ sync_to_dashboard: !mission.sync_to_dashboard })}
               className={cn(
                  "px-4 md:px-6 py-3 border font-space text-[10px] font-black tracking-[0.2em] transition-all rounded-sm uppercase flex items-center gap-3",
                  mission.sync_to_dashboard 
                     ? "bg-white/10 border-white text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]" 
                     : "border-black/10 dark:border-white/5 text-black/30 dark:text-white/20 hover:border-black/20 dark:hover:border-white/20"
               )}
               style={mission.sync_to_dashboard ? { 
                  borderColor: missionColor, color: missionColor,
                  backgroundColor: `${missionColor}11`,
                  boxShadow: `0 0 20px ${missionColor}22`
               } : {}}
            >
               <span className="material-symbols-outlined text-base">
                  {mission.sync_to_dashboard ? 'sensors' : 'sensors_off'}
               </span>
               {mission.sync_to_dashboard ? (isRTL ? 'متصل بالشبكة' : 'GRID_CONNECTED') : (isRTL ? 'خارج الشبكة' : 'OFF_GRID')}
            </button>

            {/* INTEL button */}
            <button
              onClick={() => setShowIntelModal(true)}
              className="px-4 md:px-6 py-3 border font-space text-[10px] font-black tracking-[0.2em] transition-all rounded-sm uppercase flex items-center gap-3 relative border-black/10 dark:border-white/5 text-black/50 dark:text-white/30 hover:border-black/30 dark:hover:border-white/20"
            >
              <span className="material-symbols-outlined text-base">notes</span>
              INTEL_NOTES
              {linkedNotes.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center text-black" style={{ backgroundColor: missionColor }}>
                  {linkedNotes.length}
                </span>
              )}
            </button>
         </section>

        {/* Task Management Section */}
        <section className="space-y-8">
           <div className="flex justify-between items-end border-b border-black/5 dark:border-white/5 pb-4">
              <h2 className="text-[10px] font-black font-space text-black/40 dark:text-white/30 tracking-[0.5em] uppercase">{isRTL ? 'قائمة المهام' : 'CHECKLIST_TASKS'}</h2>
              <span className="text-[10px] font-space text-black/40 dark:text-white/30 tracking-widest uppercase font-black">
                 {completedCount}/{totalCount} {isRTL ? 'مهمة مكتملة' : 'TASK_COMPLETE'}
              </span>
           </div>

           {/* Task List */}
           <div className="space-y-4">
              <AnimatePresence mode='popLayout'>
                 {(mission.tasks || []).map((task: any) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={cn(
                        "group flex items-center justify-between py-4 border-b border-black/5 dark:border-white/5 transition-all",
                        task.is_completed ? "opacity-40" : "opacity-100"
                      )}
                    >
                       <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0">
                          <button 
                            onClick={() => toggleTask(task.id, task.is_completed)}
                            className={cn(
                              "shrink-0 w-7 h-7 flex items-center justify-center transition-all border-2",
                               task.is_completed 
                                 ? "shadow-[0_0_15px_rgba(57,255,20,0.4)]" 
                                 : "border-black/20 dark:border-white/20"
                             )}
                             style={{ 
                               backgroundColor: task.is_completed ? missionColor : 'transparent',
                               borderColor: task.is_completed ? missionColor : undefined 
                             }}
                          >
                             {task.is_completed && <span className="material-symbols-outlined text-black font-black text-lg">check</span>}
                          </button>
                          
                          <span className={cn(
                             "text-base md:text-xl font-space font-bold tracking-tight transition-all uppercase truncate",
                             task.is_completed ? "text-black/30 dark:text-white/20 line-through" : "text-black/90 dark:text-white/90"
                          )}>
                             {task.title}
                          </span>
                       </div>

                       <div className="flex items-center gap-4 md:gap-8 shrink-0">
                          <WeightVisualizer weight={task.weight} color={missionColor} isCompleted={task.is_completed} />
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="opacity-0 group-hover:opacity-100 text-black/20 dark:text-white/10 hover:text-red-500 transition-all p-2"
                          >
                             <span className="material-symbols-outlined text-xl">delete_sweep</span>
                          </button>
                       </div>
                    </motion.div>
                 ))}
              </AnimatePresence>
           </div>

           {/* Add Task Input */}
           <form onSubmit={addTask} className="relative mt-8 md:mt-12 flex flex-col md:flex-row gap-4 md:gap-6">
              <div className="relative flex-1">
                 <input
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    placeholder={isRTL ? 'إضافة مهمة... (ENTER)' : 'ADD_TASK... (PRESS ENTER)'}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 p-4 md:p-6 font-space text-sm font-black text-black dark:text-white outline-none transition-all uppercase italic"
                    style={{ borderColor: `${currentTheme.color}20` }}
                 />
                 <button 
                    type="submit"
                    className="absolute end-4 top-1/2 -translate-y-1/2 px-4 md:px-6 py-2 font-space text-[10px] font-black uppercase tracking-widest transition-all"
                    style={{ backgroundColor: `${currentTheme.color}11`, color: currentTheme.color, borderColor: `${currentTheme.color}33` }}
                 >
                    + {isRTL ? 'إضافة' : 'ADD'}
                 </button>
              </div>

              <div className="flex flex-col gap-2 justify-center px-4 md:px-6 py-3 md:py-0 border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
                 <span className="text-[8px] font-space text-black/30 dark:text-white/20 uppercase tracking-widest font-black">SET_POWER</span>
                 <WeightVisualizer 
                   weight={newTaskWeight} 
                   color={missionColor} 
                   onSelect={(w) => setNewTaskWeight(w)} 
                 />
              </div>
           </form>
        </section>
      </div>

      {/* ── INTEL MODAL: Notes linked to this mission ── */}
      <AnimatePresence>
        {showIntelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-md"
            onClick={() => setShowIntelModal(false)}
          >
            <motion.div
              initial={{ scale: 0.93, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.93, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[80vh] overflow-y-auto relative border bg-[#050505] rounded-sm"
              style={{ borderColor: `${missionColor}30` }}
            >
              {/* Top neon bar */}
              <div className="absolute top-0 inset-x-0 h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${missionColor}, transparent)` }} />

              <div className="p-6 md:p-10 space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl md:text-2xl font-black font-space uppercase italic" style={{ color: missionColor }}>
                      INTEL_NOTES
                    </h2>
                    <p className="text-[9px] font-space text-white/20 tracking-widest uppercase font-black mt-1">
                      {linkedNotes.length} {isRTL ? 'سجل مرتبط' : 'RECORDS LINKED TO THIS MISSION'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowIntelModal(false)}
                    className="text-white/20 hover:text-white transition-all"
                  >
                    <span className="material-symbols-outlined text-2xl">close</span>
                  </button>
                </div>

                {linkedNotes.length === 0 ? (
                  <div className="py-16 text-center space-y-4">
                    <span className="material-symbols-outlined text-4xl text-white/10">notes</span>
                    <p className="text-[11px] font-space text-white/20 tracking-[0.4em] uppercase font-black">
                      {isRTL ? 'لا توجد سجلات مرتبطة' : 'NO_INTEL_LINKED'}
                    </p>
                    <p className="text-[10px] font-space text-white/10 tracking-wider">
                      {isRTL ? 'اذهب إلى BRAIN وأنشئ ملاحظة مرتبطة بهذه المهمة' : 'Go to BRAIN → NEW_LOG and link it to this mission'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {linkedNotes.map((note, idx) => (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-5 border rounded-sm relative"
                        style={{ borderColor: `${missionColor}20`, backgroundColor: `${missionColor}05` }}
                      >
                        <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: `linear-gradient(90deg, ${missionColor}60, transparent)` }} />
                        <p className={cn(
                          'text-sm leading-relaxed text-white/80',
                          note.font_settings?.family === 'tajawal' ? 'font-tajawal' : 'font-space',
                          note.font_settings?.style === 'italic' ? 'italic' : ''
                        )}>
                          {note.content}
                        </p>
                        <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center">
                          <span className="text-[8px] font-space text-white/20 tracking-widest uppercase">
                            {new Date(note.created_at).toLocaleDateString()}
                          </span>
                          {note.is_locked && (
                            <span className="material-symbols-outlined text-xs" style={{ color: missionColor }}>push_pin</span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Shell>
  )
}
