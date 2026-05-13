'use client'

import React, { useState, useEffect } from 'react'
import Shell from '@/components/layout/Shell'
import EnergyCell from '@/components/ui/EnergyCell'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useGrowth } from '@/context/GrowthContext'

export default function LegacyVaultPage() {
  const { profile, calculateAccountability, t, isRTL, mounted } = useGrowth()
  const [archived, setArchived] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMission, setSelectedMission] = useState<any | null>(null)
  const supabase = createClient()

  useEffect(() => { 
    if (mounted && profile?.id) {
      fetchArchived() 
    }
  }, [profile?.id, mounted])

  async function fetchArchived() {
    setIsLoading(true)
    // Fetch all missions to check progress locally, or those marked archived
    const { data, error } = await supabase
      .from('cups')
      .select('*, tasks(*)')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })

    if (data) {
      const processed = data
        .map(m => {
          const { progress } = calculateAccountability(m)
          return {
            ...m,
            totalTasks: m.tasks?.length || 0,
            completedTasks: m.tasks?.filter((t: any) => t.is_completed).length || 0,
            progress: Math.round(progress),
          }
        })
        .filter(m => m.is_archived === true || m.progress === 100)
      
      setArchived(processed)
    }
    setIsLoading(false)
  }

  const unarchive = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await supabase.from('cups').update({ is_archived: false, status: 'ACTIVE' }).eq('id', id)
    setArchived(prev => prev.filter(m => m.id !== id))
    if (selectedMission?.id === id) setSelectedMission(null)
  }

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return isRTL ? 'غير محدد' : 'N/A'
    const s = new Date(start)
    const e = new Date(end)
    const diff = e.getTime() - s.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    return days > 0 ? `${days} ${isRTL ? 'أيام' : 'DAYS'}` : (isRTL ? 'يوم واحد' : 'SINGLE_DAY')
  }

  if (!mounted) return null

  return (
    <Shell>
      <div className="p-6 md:p-12 space-y-12 md:space-y-16">
        {/* Header */}
        <div className="text-center space-y-4 relative">
          <div className="flex items-center justify-center gap-6 mb-2">
            <div className="w-20 h-[1px] bg-gradient-to-r from-transparent to-neon-green opacity-30" />
            <span className="material-symbols-outlined text-neon-green text-3xl md:text-4xl">military_tech</span>
            <div className="w-20 h-[1px] bg-gradient-to-l from-transparent to-neon-green opacity-30" />
          </div>
          <h1 className="text-4xl md:text-7xl font-black font-space tracking-tighter uppercase italic text-black dark:text-white leading-none">
            {isRTL ? 'خزنة' : 'LEGACY'}<span className="text-neon-green">{isRTL ? ' الإنجازات' : '_VAULT'}</span>
          </h1>
          <p className="text-[10px] md:text-xs font-space text-neon-green tracking-[0.8em] uppercase font-bold opacity-40">
            {isRTL ? 'المهام المكتملة' : 'COMPLETED_CYCLES'} // {archived.length} {isRTL ? 'سجل' : 'RECORDS'}
          </p>
        </div>

        {isLoading ? (
          <div className="text-center text-neon-green font-space animate-pulse tracking-widest text-sm">
            {isRTL ? 'جاري فتح الخزنة...' : 'ACCESSING_VAULT...'}
          </div>
        ) : archived.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-6">
            <div className="relative">
              <div className="w-32 h-32 border-2 border-black/10 dark:border-white/5 flex items-center justify-center"
                style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }}>
                <span className="material-symbols-outlined text-5xl text-black/20 dark:text-white/10">lock</span>
              </div>
            </div>
            <p className="text-[10px] md:text-xs font-space text-black/60 dark:text-white/30 tracking-[0.5em] uppercase font-black text-center leading-relaxed">
              {isRTL ? 'لا توجد جوائز بعد' : 'NO_TROPHIES_YET'}<br/>{isRTL ? 'أكمل مهمة لملء الخزنة' : 'COMPLETE A CYCLE TO FILL THE VAULT'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 items-end justify-items-center">
            {archived.map((mission, i) => {
              const color = mission.color || '#39FF14'

              return (
                <motion.div
                  key={mission.id}
                  onClick={() => setSelectedMission(mission)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="group flex flex-col items-center gap-3 cursor-pointer"
                >
                  <div className="text-[8px] md:text-[10px] font-space tracking-[0.4em] text-neon-green/40 uppercase font-black">
                    ★ {isRTL ? 'مكتمل' : 'COMPLETE'}
                  </div>

                  <EnergyCell
                    percentage={100}
                    label=""
                    color={color}
                    size="md"
                    isInRedZone={false}
                  />

                  <p className="text-xs md:text-sm font-space font-black text-black/50 dark:text-white/50 group-hover:text-black/90 dark:group-hover:text-white/90 tracking-widest uppercase text-center transition-all max-w-[120px] leading-tight truncate mt-2">
                    {mission.title}
                  </p>

                  <button
                    onClick={(e) => { e.preventDefault(); unarchive(mission.id, e as any) }}
                    className="text-[8px] md:text-[10px] font-space text-black/30 dark:text-white/10 hover:text-black/60 dark:hover:text-white/40 transition-all tracking-widest uppercase mt-1"
                  >
                    {isRTL ? 'استعادة ←' : 'RESTORE →'}
                  </button>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Mission Detail Modal */}
        <AnimatePresence>
          {selectedMission && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center bg-[#F0F2F5]/95 dark:bg-[#050505]/95 backdrop-blur-md p-6"
              onClick={() => setSelectedMission(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-2xl bg-white dark:bg-[#0A0A0A] border border-black/10 dark:border-white/10 p-8 md:p-12 space-y-10 max-h-[90vh] overflow-y-auto custom-scrollbar rounded-sm shadow-2xl"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-neon-green">military_tech</span>
                      <span className="text-[10px] md:text-xs font-space text-neon-green tracking-widest uppercase font-black">{isRTL ? 'سجل قديم' : 'LEGACY_RECORD'}</span>
                    </div>
                    <h2 className="text-2xl md:text-4xl font-space font-black uppercase italic text-black dark:text-white tracking-tighter">
                      {selectedMission.title}
                    </h2>
                  </div>
                  <button onClick={() => setSelectedMission(null)} className="text-black/30 dark:text-white/20 hover:text-black dark:hover:text-white transition-all">
                    <span className="material-symbols-outlined text-3xl">close</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-y border-black/5 dark:border-white/5">
                  <div className="space-y-1">
                    <p className="text-[9px] md:text-xs font-space text-black/40 dark:text-white/30 tracking-widest uppercase">{isRTL ? 'المدة' : 'DURATION'}</p>
                    <p className="text-sm md:text-base font-space font-black text-black dark:text-white">{calculateDuration(selectedMission.start_date, selectedMission.end_date)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] md:text-xs font-space text-black/40 dark:text-white/30 tracking-widest uppercase">{isRTL ? 'المهام' : 'TASKS'}</p>
                    <p className="text-sm md:text-base font-space font-black text-black dark:text-white">{selectedMission.totalTasks}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] md:text-xs font-space text-black/40 dark:text-white/30 tracking-widest uppercase">{isRTL ? 'الإنجاز' : 'COMPLETION'}</p>
                    <p className="text-sm md:text-base font-space font-black text-neon-green">100%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] md:text-xs font-space text-black/40 dark:text-white/30 tracking-widest uppercase">{isRTL ? 'التاريخ' : 'STAMP'}</p>
                    <p className="text-sm md:text-base font-space font-black text-black/60 dark:text-white/60">
                      {new Date(selectedMission.created_at).toISOString().split('T')[0].replace(/-/g, '.')}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                   <h4 className="text-[11px] md:text-sm font-space text-neon-green tracking-[0.4em] uppercase font-black">{isRTL ? 'سجل المهام الفرعية' : 'TASK_LOG'}</h4>
                   <div className="space-y-3">
                     {selectedMission.tasks?.map((task: any) => (
                       <div key={task.id} className="flex items-center justify-between p-4 bg-black/5 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 rounded-sm">
                         <div className="flex items-center gap-4">
                           <span className="material-symbols-outlined text-neon-green text-sm">check_circle</span>
                           <span className="text-sm md:text-base font-space font-bold text-black/80 dark:text-white/80">{task.title}</span>
                         </div>
                         <span className="text-[10px] md:text-xs font-space text-black/30 dark:text-white/20 tracking-widest uppercase font-black">{isRTL ? 'الثقل' : 'WEIGHT'}: {task.weight}</span>
                       </div>
                     ))}
                   </div>
                </div>

                <button
                  onClick={(e) => unarchive(selectedMission.id, e)}
                  className="w-full py-5 bg-neon-green/10 border border-neon-green/30 text-neon-green font-space text-[10px] md:text-xs tracking-widest uppercase font-black hover:bg-neon-green hover:text-black transition-all rounded-sm shadow-lg shadow-neon-green/5"
                >
                  {isRTL ? 'استعادة المهمة إلى الوضع النشط' : 'RESTORE_MISSION_TO_ACTIVE'}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Shell>
  )
}
