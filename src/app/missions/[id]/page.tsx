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
  const supabase = createClient()

  useEffect(() => {
    if (mounted) fetchMission()
  }, [id, mounted])

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

  // MISSION PERSISTENCE ENGINE (Reactive Vault Logic)
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
          
          // Add XP based on weight
          const task = mission.tasks.find((t: any) => t.id === taskId)
          if (task) {
            await addXp(task.weight * 10)
          }
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

    const { data, error } = await supabase
      .from('tasks')
      .insert(payload)
      .select()
      .single()

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

  const updateMission = async (updates: any) => {
    const { error } = await supabase
      .from('cups')
      .update(updates)
      .eq('id', id)
    
    if (!error) {
      setMission((prev: any) => ({ ...prev, ...updates }))
      showToast(isRTL ? 'تم التحديث' : 'PROTOCOL_UPDATED', 'success')
    }
  }

  const deleteMission = async () => {
    if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذه المهمة؟' : 'CONFIRM MISSION TERMINATION?')) return
    
    const { error } = await supabase
      .from('cups')
      .delete()
      .eq('id', id)
    
    if (!error) {
      showToast(isRTL ? 'تم حذف المهمة' : 'MISSION TERMINATED', 'success')
      router.push('/missions')
    }
  }

  const { progress, isInRedZone, status: missionStatus } = useMemo(() => {
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
      <div className="max-w-4xl mx-auto p-4 md:p-12 space-y-12">
        
        {/* Mission Header Overview */}
        <section className="bg-white/5 dark:bg-[#0A0A0A] border border-white/5 p-8 md:p-12 rounded-sm space-y-10 relative overflow-hidden">
           <div className="absolute top-0 inset-x-0 h-[2.5px]" style={{ background: missionColor }} />
           
           <div className="flex justify-between items-center">
              <div className="space-y-1">
                 <h1 className="text-3xl md:text-5xl font-black font-space tracking-tighter uppercase italic text-black dark:text-white leading-none">
                    {mission.title}
                 </h1>
                 <p className="text-[9px] font-space text-white/20 tracking-widest uppercase font-black">
                    UPLINK_STABLE // MISSION_ID: {mission.id.slice(0, 8).toUpperCase()}
                 </p>
              </div>
               <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-4">
                     <button 
                        onClick={deleteMission}
                        className="p-2 text-white/10 hover:text-red-500 hover:bg-red-500/10 transition-all rounded-full"
                        title={isRTL ? 'حذف المهمة' : 'DELETE_MISSION'}
                     >
                        <span className="material-symbols-outlined">delete_forever</span>
                     </button>
                     <span className="text-4xl md:text-6xl font-black font-space italic" style={{ color: missionColor }}>{roundedProgress}%</span>
                  </div>
                  <p className="text-[9px] font-space text-white/20 tracking-[0.4em] uppercase font-black">{isRTL ? 'مزامنة' : 'SYNC_COMPLETE'}</p>
               </div>
           </div>

           <div className="w-full h-[1.5px] bg-white/5 relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${roundedProgress}%` }}
                className="h-full absolute top-0 start-0"
                style={{ backgroundColor: missionColor, boxShadow: `0 0 15px ${missionColor}` }}
              />
           </div>
        </section>

         {/* Mission Configuration (Stealth Controls) */}
         <section className="flex flex-wrap gap-6 items-center">


            {/* Grid Uplink Toggle (Compact Style) */}
            <button 
               onClick={() => updateMission({ sync_to_dashboard: !mission.sync_to_dashboard })}
               className={cn(
                  "px-6 py-3 border font-space text-[10px] font-black tracking-[0.2em] transition-all rounded-sm uppercase flex items-center gap-3",
                  mission.sync_to_dashboard 
                     ? "bg-white/10 border-white text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]" 
                     : "border-white/5 text-white/20 hover:border-white/20"
               )}
               style={mission.sync_to_dashboard ? { 
                  borderColor: missionColor,
                  color: missionColor,
                  backgroundColor: `${missionColor}11`,
                  boxShadow: `0 0 20px ${missionColor}22`
               } : {}}
            >
               <span className="material-symbols-outlined text-base">
                  {mission.sync_to_dashboard ? 'sensors' : 'sensors_off'}
               </span>
               {mission.sync_to_dashboard ? (isRTL ? 'متصل بالشبكة' : 'GRID_CONNECTED') : (isRTL ? 'خارج الشبكة' : 'OFF_GRID')}
            </button>
         </section>

        {/* Task Management Section */}
        <section className="space-y-8">
           <div className="flex justify-between items-end border-b border-white/5 pb-4">
              <h2 className="text-[10px] font-black font-space text-white/30 tracking-[0.5em] uppercase">{isRTL ? 'قائمة المهام' : 'CHECKLIST_TASKS'}</h2>
              <span className="text-[10px] font-space text-white/30 tracking-widest uppercase font-black">
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
                        "group flex items-center justify-between py-4 border-b border-white/5 transition-all",
                        task.is_completed ? "opacity-40" : "opacity-100"
                      )}
                    >
                       <div className="flex items-center gap-6 flex-1">
                          <button 
                            onClick={() => toggleTask(task.id, task.is_completed)}
                            className={cn(
                              "w-7 h-7 flex items-center justify-center transition-all border-2",
                               task.is_completed 
                                 ? "shadow-[0_0_15px_rgba(57,255,20,0.4)]" 
                                 : "border-white/20"
                             )}
                             style={{ 
                               backgroundColor: task.is_completed ? missionColor : 'transparent',
                               borderColor: task.is_completed ? missionColor : undefined 
                             }}
                          >
                             {task.is_completed && <span className="material-symbols-outlined text-black font-black text-lg">check</span>}
                          </button>
                          
                          <span className={cn(
                             "text-lg md:text-xl font-space font-bold tracking-tight transition-all uppercase",
                             task.is_completed ? "text-white/20 line-through" : "text-white/90"
                          )}>
                             {task.title}
                          </span>
                       </div>

                       <div className="flex items-center gap-8">
                          <WeightVisualizer weight={task.weight} color={missionColor} isCompleted={task.is_completed} />
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="opacity-0 group-hover:opacity-100 text-white/10 hover:text-red-500 transition-all p-2"
                          >
                             <span className="material-symbols-outlined text-xl">delete_sweep</span>
                          </button>
                       </div>
                    </motion.div>
                 ))}
              </AnimatePresence>
           </div>

           {/* Add Node Input (Bottom) */}
           <form onSubmit={addTask} className="relative mt-12 flex flex-col md:flex-row gap-6">
              <div className="relative flex-1">
                 <input
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    placeholder={isRTL ? 'إضافة مهمة... (ENTER)' : 'ADD_TASK... (PRESS ENTER)'}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 p-6 font-space text-sm font-black text-black dark:text-white outline-none transition-all uppercase italic"
                    style={{ borderColor: `${currentTheme.color}20` }}
                 />
                 <button 
                    type="submit"
                    className="absolute end-4 top-1/2 -translate-y-1/2 px-6 py-2 font-space text-[10px] font-black uppercase tracking-widest transition-all"
                    style={{ backgroundColor: `${currentTheme.color}11`, color: currentTheme.color, borderColor: `${currentTheme.color}33` }}
                 >
                    + {isRTL ? 'إضافة' : 'ADD'}
                 </button>
              </div>

              {/* Stealth Weight Selection via Bars */}
              <div className="flex flex-col gap-2 justify-center px-6 border border-white/5 bg-white/[0.02]">
                 <span className="text-[8px] font-space text-white/20 uppercase tracking-widest font-black">SET_POWER</span>
                 <WeightVisualizer 
                   weight={newTaskWeight} 
                   color={missionColor} 
                   onSelect={(w) => setNewTaskWeight(w)} 
                 />
              </div>
           </form>
        </section>
      </div>
    </Shell>
  )
}
