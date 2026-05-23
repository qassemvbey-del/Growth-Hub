'use client'

import React, { useState, useEffect } from 'react'
import Shell from '@/components/layout/Shell'
import EnergyCell from '@/components/ui/EnergyCell'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useGrowth } from '@/context/GrowthContext'
import { VaultContent } from '../vault/page'

export default function WinsPage() {
  const { profile, calculateAccountability, t, isRTL, mounted, currentTheme } = useGrowth()
  const [archived, setArchived] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'WINS' | 'RANKS'>('WINS')
  const [loading, setLoading] = useState(true)
  const [selectedMission, setSelectedMission] = useState<any | null>(null)
  const supabase = createClient()

  useEffect(() => { 
    if (mounted) {
      fetchArchived() 
    }
  }, [mounted])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 5000)
    return () => clearTimeout(timeout)
  }, [])

  async function fetchArchived() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      console.log('USER_ID:', user?.id)
      console.log('FETCH_START')

      if (!user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('cups')
        .select('*, tasks(*)')
        .eq('user_id', user.id)
        .eq('is_archived', true)
        .order('created_at', { ascending: false })

      console.log('FETCH_RESULT:', data)
      console.log('FETCH_ERROR:', error)
      console.log('CUPS_FOUND:', data?.length)

      if (error) {
        console.error('ERROR:', error)
        setArchived([])
      } else {
        const enriched = (data || []).map((m: any) => {
          const tasks = m.tasks || []
          return {
            ...m,
            totalTasks: tasks.length,
            completedTasks: tasks.filter((t: any) => t.is_completed).length,
          }
        })
        setArchived(enriched)
      }
    } catch (err) {
      console.error('ERROR:', err)
      setArchived([])
    } finally {
      setLoading(false)
    }
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
        {/* Tabs */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <button 
            onClick={() => setActiveTab('WINS')}
            className={cn(
              "px-8 py-3 font-space font-black uppercase tracking-widest text-[11px] md:text-sm border transition-all",
              activeTab === 'WINS' ? "text-black border-transparent shadow-lg" : "bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
            style={activeTab === 'WINS' ? { backgroundColor: currentTheme.color, borderColor: currentTheme.color, boxShadow: `0 0 15px ${currentTheme.color}33` } : {}}
          >
            🏆 {isRTL ? 'سجل الإنجازات' : 'WINS'}
          </button>
          <button 
            onClick={() => setActiveTab('RANKS')}
            className={cn(
              "px-8 py-3 font-space font-black uppercase tracking-widest text-[11px] md:text-sm border transition-all",
              activeTab === 'RANKS' ? "text-black border-transparent shadow-lg" : "bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
            style={activeTab === 'RANKS' ? { backgroundColor: currentTheme.color, borderColor: currentTheme.color, boxShadow: `0 0 15px ${currentTheme.color}33` } : {}}
          >
            ⚡ {isRTL ? 'الرتب' : 'RANKS'}
          </button>
        </div>

        {activeTab === 'RANKS' ? (
          <VaultContent />
        ) : (
          <>
            {/* Header */}
            <div className="text-center space-y-4 relative">
              <div className="flex items-center justify-center gap-6 mb-2">
                <div className="w-20 h-[1px] opacity-30" style={{ background: `linear-gradient(to right, transparent, ${currentTheme.color})` }} />
                <span className="material-symbols-outlined text-3xl md:text-4xl" style={{ color: currentTheme.color }}>military_tech</span>
                <div className="w-20 h-[1px] opacity-30" style={{ background: `linear-gradient(to left, transparent, ${currentTheme.color})` }} />
              </div>
              <h1 className="text-4xl md:text-7xl font-black font-space tracking-wider uppercase not-italic text-[var(--text-primary)] leading-none">
                {isRTL ? (
                  <span className="font-black">إنجازاتي</span>
                ) : (
                  <>
                    <span className="font-black">MY</span>{' '}
                    <span className="font-black" style={{ color: currentTheme.color }}>WINS</span>
                  </>
                )}
              </h1>
              <p className="text-[11px] font-space text-[var(--text-secondary)] tracking-[0.35em] uppercase font-bold">
                {isRTL ? 'المهام المكتملة' : 'Completed'} &nbsp;·&nbsp; {archived.length} {isRTL ? 'سجل' : 'total'}
              </p>
            </div>

        {loading ? (
          <div className="text-center font-space animate-pulse tracking-widest text-sm" style={{ color: currentTheme.color }}>
            {isRTL ? 'جاري فتح الخزنة...' : 'ACCESSING_VAULT...'}
          </div>
        ) : archived.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-6">
            <div className="relative">
              <div className="w-32 h-32 border-2 border-[var(--card-border)] flex items-center justify-center animate-pulse"
                style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }}>
                <span className="material-symbols-outlined text-5xl text-black/20 dark:text-white/10">lock</span>
              </div>
            </div>
            <p className="text-[11px] md:text-xs font-space text-[var(--text-secondary)] tracking-[0.5em] uppercase font-black text-center leading-relaxed">
              {isRTL ? 'لا توجد جوائز بعد // أكمل هدفاً أولاً' : 'NO_WINS_YET // Complete a goal first'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-8 items-end justify-items-center">
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
                  <div className="text-[8px] md:text-[10px] font-space tracking-[0.4em] uppercase font-black mb-4" style={{ color: `${currentTheme.color}66` }}>
                    ★ {isRTL ? 'مكتمل' : 'COMPLETE'}
                  </div>

                  <div className="relative flex flex-col items-center pb-8 pt-4">
                    {/* Holographic Projector Base */}
                    <div 
                      className="absolute bottom-0 w-24 h-6 bg-[var(--input-bg)] rounded-[100%] blur-[1px] border border-[var(--card-border)] flex items-center justify-center z-0" 
                      style={{ boxShadow: `0 10px 20px ${color}40, inset 0 2px 10px ${color}20` }}
                    >
                      {/* Projector Lens Core */}
                      <div className="w-12 h-2 rounded-[100%] blur-[1px] opacity-80" style={{ backgroundColor: color, boxShadow: `0 0 15px ${color}` }} />
                      
                      {/* Rising neon light beams */}
                      <div 
                        className="absolute bottom-2 w-20 h-32 blur-[8px] opacity-30 mix-blend-screen animate-pulse pointer-events-none" 
                        style={{ background: `linear-gradient(to top, ${color}, transparent)`, clipPath: 'polygon(20% 100%, 80% 100%, 100% 0, 0 0)' }} 
                      />
                    </div>

                    <div className="relative z-10" style={{ filter: `drop-shadow(0 15px 25px ${color}40)` }}>
                      <EnergyCell
                        percentage={100}
                        color={color}
                        size="md"
                        isInRedZone={false}
                      />
                    </div>
                  </div>

                  <p className="text-xs md:text-sm font-space font-black text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] tracking-widest uppercase text-center transition-all max-w-[120px] leading-tight truncate mt-2">
                    {mission.title}
                  </p>

                  <button
                    onClick={(e) => { e.preventDefault(); unarchive(mission.id, e as any) }}
                    className="text-[8px] md:text-[10px] font-space text-[var(--text-secondary)]/50 hover:text-[var(--text-primary)] transition-all tracking-widest uppercase mt-1"
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
              className="fixed inset-0 z-[200] flex items-center justify-center bg-white/95 dark:bg-black/95 backdrop-blur-md p-6"
              onClick={() => setSelectedMission(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9 }}
                onClick={e => e.stopPropagation()}
                className="w-[calc(100%-2rem)] mx-auto md:max-w-2xl bg-[var(--card-bg)] border border-[var(--card-border)] p-5 md:p-12 space-y-10 max-h-[90vh] overflow-y-auto custom-scrollbar rounded-2xl shadow-2xl my-auto"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-sm" style={{ color: currentTheme.color }}>military_tech</span>
                      <span className="text-[10px] md:text-xs font-space tracking-widest uppercase font-black" style={{ color: currentTheme.color }}>{isRTL ? 'إنجاز مكتمل' : 'COMPLETED WIN'}</span>
                    </div>
                    <h2 className="text-2xl md:text-4xl font-space font-black uppercase italic text-[var(--text-primary)] tracking-tighter">
                      {selectedMission.title}
                    </h2>
                  </div>
                  <button onClick={() => setSelectedMission(null)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all">
                    <span className="material-symbols-outlined text-3xl">close</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-y border-[var(--card-border)]">
                  <div className="space-y-1">
                    <p className="text-[9px] md:text-xs font-space text-[var(--text-secondary)] tracking-widest uppercase">{isRTL ? 'المدة' : 'DURATION'}</p>
                    <p className="text-sm md:text-base font-space font-black text-[var(--text-primary)]">{calculateDuration(selectedMission.start_date, selectedMission.end_date)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] md:text-xs font-space text-[var(--text-secondary)] tracking-widest uppercase">{isRTL ? 'المهام' : 'TASKS'}</p>
                    <p className="text-sm md:text-base font-space font-black text-[var(--text-primary)]">{selectedMission.totalTasks}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] md:text-xs font-space text-[var(--text-secondary)] tracking-widest uppercase">{isRTL ? 'الإنجاز' : 'COMPLETION'}</p>
                    <p className="text-sm md:text-base font-space font-black" style={{ color: currentTheme.color }}>100%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] md:text-xs font-space text-[var(--text-secondary)] tracking-widest uppercase">{isRTL ? 'التاريخ' : 'STAMP'}</p>
                    <p className="text-sm md:text-base font-space font-black text-[var(--text-secondary)]">
                      {new Date(selectedMission.created_at).toISOString().split('T')[0].replace(/-/g, '.')}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                   <h4 className="text-[11px] md:text-sm font-space tracking-[0.4em] uppercase font-black" style={{ color: currentTheme.color }}>{isRTL ? 'سجل المهام الفرعية' : 'Task Log'}</h4>
                   <div className="space-y-3">
                     {selectedMission.tasks?.map((task: any) => (
                       <div key={task.id} className="flex items-center justify-between py-2.5 px-4 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl">
                         <div className="flex items-center gap-4">
                           <span className="material-symbols-outlined text-sm" style={{ color: currentTheme.color }}>check_circle</span>
                           <span className="text-sm md:text-base font-space font-bold text-[var(--text-primary)]">{task.title}</span>
                         </div>
                         <span className="text-[10px] md:text-xs font-space text-[var(--text-secondary)] tracking-widest uppercase font-black">{isRTL ? 'الثقل' : 'WEIGHT'}: {task.weight}</span>
                       </div>
                     ))}
                   </div>
                </div>

                <button
                  onClick={(e) => unarchive(selectedMission.id, e)}
                  className="w-full py-2.5 px-4 border font-space text-[10px] md:text-xs tracking-widest uppercase font-black transition-all rounded-xl shadow-lg"
                  style={{ borderColor: `${currentTheme.color}30`, color: currentTheme.color, background: `${currentTheme.color}08` }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = currentTheme.color; (e.currentTarget as HTMLElement).style.color = '#000'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = `${currentTheme.color}08`; (e.currentTarget as HTMLElement).style.color = currentTheme.color; }}
                >
                  {isRTL ? 'استعادة المهمة إلى الوضع النشط' : 'RESTORE_GOAL_TO_ACTIVE'}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
          </>
        )}
      </div>
    </Shell>
  )
}
