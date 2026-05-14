'use client'

import Shell from '@/components/layout/Shell'
import { motion, AnimatePresence } from 'framer-motion'
import { useGrowth } from '@/context/GrowthContext'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'
import EnergyCell from '@/components/ui/EnergyCell'
import React from 'react'

const SIZES = [
  { key: 'lg', label: 'BIG MISSION',  desc: 'Macro Objective', icon: 'trophy' },
  { key: 'md', label: 'MID MISSION',    desc: 'Standard Task', icon: 'military_tech' },
  { key: 'sm', label: 'SMALL MISSION',  desc: 'Micro Focus', icon: 'workspace_premium' },
]

export default function MissionsPage() {
  const { profile, t, calculateAccountability, isRTL, mounted, currentTheme } = useGrowth()
  const { showToast } = useToast()
  const router = useRouter()
  const [missions, setMissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newSize, setNewSize] = useState('md')
  const [syncOnCreate, setSyncOnCreate] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const supabase = createClient()

  useEffect(() => { 
    if (mounted) fetchMissions() 
  }, [mounted])

  async function fetchMissions() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('cups')
      .select('*, tasks(*)')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
    if (data) setMissions(data)
    setLoading(false)
  }

  const SIZE_SLOTS: Record<string, number> = { sm: 1, md: 1.5, lg: 3, s: 1, m: 1.5, l: 3 }

  const addMission = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Capacity guard: only check if syncing to dashboard
    if (syncOnCreate) {
      const { data: synced } = await supabase
        .from('cups')
        .select('id, size')
        .eq('user_id', user.id)
        .eq('sync_to_dashboard', true)
        .eq('is_archived', false)

      const usedSlots = (synced || []).reduce((acc: number, m: any) => {
        return acc + (SIZE_SLOTS[m.size?.toLowerCase()] ?? 1)
      }, 0)
      const newSlots = SIZE_SLOTS[newSize] ?? 1
      if (usedSlots + newSlots > 9) {
        showToast(
          isRTL
            ? `سعة المحطة ممتلئة (${usedSlots}/9 فتحات) - أتمم أو أزل مهمات موجودة.`
            : `FOCUS CAPACITY FULL (${usedSlots}/9 SLOTS) — Complete or un-equip existing missions first.`,
          'error'
        )
        return
      }
    }

    const insertData: any = {
      user_id: user.id,
      title: newTitle.trim() || (isRTL ? 'مهمة جديدة' : 'NEW_MISSION'),
      status: 'active',
      size: newSize,
      is_archived: false,
      sync_to_dashboard: syncOnCreate
    }
    if (startDate) insertData.start_date = startDate
    if (endDate) insertData.end_date = endDate

    const { data, error } = await supabase.from('cups').insert(insertData).select().single()
    
    if (data) {
      setMissions([data, ...missions])
      setShowCreate(false)
      setNewTitle('')
      setNewSize('md')
      setStartDate('')
      setEndDate('')
      showToast(isRTL ? 'تم إنشاء المهمة' : 'MISSION_INITIALIZED', 'success')
      router.push(`/missions/${data.id}`)
    }
  }

  if (loading || !mounted) return (
    <Shell>
      <div className="p-16 text-neon-green font-space animate-pulse tracking-widest text-sm md:text-base">
        {isRTL ? 'جاري التحميل...' : 'SCANNING_CORE_OBJECTIVES...'}
      </div>
    </Shell>
  )

  return (
    <Shell>
      <div className="max-w-7xl mx-auto p-6 md:p-12 space-y-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-8 border-b border-black/5 dark:border-white/5 pb-8">
          <div className="space-y-4 text-center md:text-start">
            <div className="flex items-center gap-4 justify-center md:justify-start">
              <span className="material-symbols-outlined text-neon-green text-3xl md:text-4xl">layers</span>
              <h1 className="text-4xl md:text-6xl font-black font-space tracking-tighter uppercase italic text-black dark:text-white leading-none break-words break-all sm:break-normal">
                {isRTL ? 'لوحة' : 'MISSION'}<span className="text-neon-green">{isRTL ? ' الأهداف' : '_CANVAS'}</span>
              </h1>
              <button onClick={() => setShowGuide(true)} className="material-symbols-outlined text-neon-green/60 hover:text-neon-green transition-colors text-2xl md:text-3xl" title="Tactical Guide">
                info
              </button>
            </div>
            <p className="text-[9px] md:text-[11px] font-space text-neon-green tracking-[0.4em] uppercase font-bold opacity-40">
               {isRTL ? 'الأهداف الأساسية النشطة' : 'ACTIVE_CORE_OBJECTIVES'} // {missions.length} {isRTL ? 'قيد التنفيذ' : 'MISSIONS RUNNING'}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="w-full md:w-auto bg-neon-green text-black px-12 py-5 font-space text-xs md:text-sm tracking-[0.2em] font-black uppercase hover:scale-105 active:scale-95 transition-all shadow-lg shadow-neon-green/20 flex items-center justify-center gap-4 rounded-sm"
          >
            <span className="material-symbols-outlined font-black">add_circle</span>
            {isRTL ? 'إنشاء مهمة' : 'INITIALIZE_MISSION'}
          </button>
        </header>

        {/* Tactical Guide Modal */}
        <AnimatePresence>
          {showGuide && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center bg-white/90 dark:bg-black/90 backdrop-blur-md p-4 overflow-y-auto"
              onClick={() => setShowGuide(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-2xl bg-white dark:bg-[#0A0A0A] border border-black/10 dark:border-white/10 p-8 md:p-12 space-y-8 rounded-sm shadow-2xl my-8 relative"
              >
                <button 
                  onClick={() => setShowGuide(false)} 
                  className="absolute top-6 right-6 rtl:left-6 rtl:right-auto material-symbols-outlined text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
                >
                  close
                </button>
                <div className="space-y-6">
                  <div className="space-y-2 border-l-4 border-neon-green pl-4 rtl:pl-0 rtl:pr-4 rtl:border-l-0 rtl:border-r-4">
                    <p className="text-2xl md:text-3xl font-black text-black dark:text-white mb-4">
                      أهلاً بيك في ساحة المعركة يا وحش! ده مش مجرد جدول مهام، ده سيستم (Battle Royale) لحياتك.
                    </p>
                    <ol className="list-decimal list-inside space-y-3 text-lg text-black/80 dark:text-white/80 font-bold">
                      <li><span className="text-neon-green">ميزان القوة (الـ HUD):</span> عقلك والداشبورد بيشيلوا ٩ وحدات بس. الصغير (Small) بـ ١، المتوسط (Medium) بـ ١.٥، والكبير (Large) بـ ٣ أماكن.</li>
                      <li><span className="text-neon-green">عقود الاشتباك (XP):</span> كل شرطة مجهود بـ ١٠ XP. والمهمات الكبيرة ليها "بونص" ٥٠ نقطة لما تقفلها.</li>
                      <li><span className="text-neon-green">نزيف الطاقة (XP Bleed):</span> لو اتأخرت عن ميعادك، السيستم هيسحب منك ٥ XP كل يوم. ولو كسلت أسبوع، فيه غرامة ١٠ XP.</li>
                    </ol>
                  </div>
                  
                  <div className="h-px w-full bg-black/10 dark:bg-white/10 my-8"></div>

                  <div className="space-y-2 border-l-4 border-neon-green pl-4 rtl:pl-0 rtl:pr-4 rtl:border-l-0 rtl:border-r-4">
                    <p className="text-xl md:text-2xl font-black font-space text-black dark:text-white uppercase italic tracking-tighter mb-4">
                      "Welcome, Soldier. This is your Tactical Life OS."
                    </p>
                    <ol className="list-decimal list-inside space-y-3 text-base md:text-lg text-black/80 dark:text-white/80 font-bold font-space">
                      <li><span className="text-neon-green uppercase tracking-widest">Grid Slots:</span> Your HUD has 9 slots total. Small = 1, Medium = 1.5, Large = 3.</li>
                      <li><span className="text-neon-green uppercase tracking-widest">XP Logic:</span> 1 Task Bar = 10 XP. Large missions give +50 XP bonus.</li>
                      <li><span className="text-neon-green uppercase tracking-widest">The Penalties:</span> Delay costs -5 XP/day. Inactivity for 7 days costs -10 XP.</li>
                    </ol>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════════════════════════════════════════════ */}
        {/* ██  CREATE MISSION MODAL — WITH DATES RESTORED  ██ */}
        {/* ═══════════════════════════════════════════════════ */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center bg-white/90 dark:bg-black/90 backdrop-blur-md p-4 overflow-y-auto"
              onClick={() => setShowCreate(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-xl bg-white dark:bg-[#0A0A0A] border border-black/10 dark:border-white/10 p-8 md:p-12 space-y-10 rounded-sm shadow-2xl my-8"
              >
                <h2 className="text-2xl md:text-3xl font-space font-black uppercase italic text-black dark:text-white tracking-tighter">
                  {isRTL ? 'إعدادات المهمة الجديدة' : 'MISSION_INITIALIZATION'}
                </h2>

                {/* Title */}
                <div className="space-y-3">
                  <label className="text-sm md:text-base font-space text-neon-green tracking-widest uppercase font-black">{t('title')}</label>
                  <input
                    autoFocus
                    value={newTitle}
                    placeholder={isRTL ? 'عنوان المهمة...' : 'MISSION_TITLE...'}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-4 font-space text-lg md:text-xl font-black text-black dark:text-white italic outline-none focus:border-neon-green/50 transition-all uppercase"
                  />
                </div>

                {/* Size Selection */}
                <div className="space-y-3">
                  <label className="text-sm md:text-base font-space text-neon-green tracking-widest uppercase font-black">{isRTL ? 'حجم المهمة' : 'MISSION_SCALE'}</label>
                  <div className="grid grid-cols-3 gap-4">
                    {SIZES.map(s => (
                      <button
                        key={s.key}
                        onClick={() => setNewSize(s.key)}
                        className={cn(
                          "p-4 border flex flex-col items-center gap-2 transition-all rounded-sm",
                          newSize === s.key 
                            ? "bg-neon-green border-neon-green text-black shadow-[0_0_15px_rgba(57,255,20,0.3)]" 
                            : "border-black/10 dark:border-white/10 text-black/40 dark:text-white/20 hover:border-neon-green/40"
                        )}
                      >
                        <span className="material-symbols-outlined text-2xl">{s.icon}</span>
                        <span className="text-sm font-space font-black uppercase tracking-tighter">{isRTL ? (s.key === 'lg' ? 'كبيرة' : s.key === 'md' ? 'متوسطة' : 'صغيرة') : s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ══════════════════════════════════════ */}
                {/* ██ START DATE & END DATE — RESTORED ██ */}
                {/* ══════════════════════════════════════ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-sm md:text-base font-space tracking-widest uppercase font-black" style={{ color: currentTheme.color }}>
                      {t('start_date')}
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-4 font-space text-sm md:text-base font-black text-black dark:text-white outline-none focus:border-neon-green/50 transition-all uppercase rounded-sm date-input-tactical"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm md:text-base font-space tracking-widest uppercase font-black" style={{ color: currentTheme.color }}>
                      {t('end_date')}
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-4 font-space text-sm md:text-base font-black text-black dark:text-white outline-none focus:border-neon-green/50 transition-all uppercase rounded-sm date-input-tactical"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                </div>

                {/* HUD Visibility */}
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="space-y-3 flex-1">
                     <label className="text-sm md:text-base font-space tracking-widest uppercase font-black" style={{ color: currentTheme.color }}>{isRTL ? 'عرض في اللوحة' : 'HUD_VISIBILITY'}</label>
                     <button 
                       onClick={() => setSyncOnCreate(!syncOnCreate)}
                       style={{ 
                         backgroundColor: syncOnCreate ? `${currentTheme.color}11` : 'transparent', 
                         color: syncOnCreate ? currentTheme.color : undefined, 
                         borderColor: syncOnCreate ? currentTheme.color : undefined 
                       }}
                       className={cn(
                         "w-full p-4 border font-space text-sm md:text-base font-black uppercase tracking-widest transition-all rounded-sm",
                         !syncOnCreate && "border-black/10 dark:border-white/10 text-black/40 dark:text-white/20"
                       )}
                     >
                        {syncOnCreate ? (isRTL ? 'مفعل' : 'SHOW ON DASHBOARD') : (isRTL ? 'مخفي' : 'STAY OFF-GRID')}
                     </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-6 pt-4 border-t border-black/5 dark:border-white/5">
                  <button onClick={() => setShowCreate(false)} className="text-black/40 dark:text-white/20 font-space text-sm md:text-base uppercase tracking-widest hover:text-black dark:hover:text-white font-black">{t('cancel')}</button>
                  <button onClick={addMission} className="px-10 py-4 font-space font-black text-sm md:text-base uppercase tracking-widest shadow-lg" style={{ backgroundColor: currentTheme.color, color: '#000', boxShadow: `0 0 20px ${currentTheme.color}44` }}>{t('deploy')}</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═════════════════════════════════════════ */}
        {/* ██  MISSION GRID — STRICT 3-COL LAYOUT ██ */}
        {/* ═════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AnimatePresence mode='popLayout'>
            {missions.map((mission, idx) => {
              const { progress, isInRedZone } = calculateAccountability(mission)
              const percentage = Math.round(progress)
              const color = currentTheme.color
              const completedTasks = mission.tasks?.filter((t: any) => t.is_completed).length || 0
              const totalTasks = mission.tasks?.length || 0
              const kasaSize = mission.size === 'lg' ? 'md' : mission.size === 'md' ? 'sm' : 'sm'
              
              // Map size to icon
              const sizeIcon = SIZES.find(s => s.key === mission.size)?.icon || 'layers'

              // Format dates
              const fmtDate = (d: string | null) => {
                if (!d) return '—'
                try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) } catch { return '—' }
              }

              return (
                <motion.div
                  key={mission.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => router.push(`/missions/${mission.id}`)}
                  className={cn(
                    "group relative flex flex-col bg-white dark:bg-[#0A0A0A] border border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/10 cursor-pointer transition-all rounded-sm shadow-xl overflow-hidden",
                    "min-h-[240px] max-h-[340px] p-5 md:p-6"
                  )}
                >
                  {/* Top accent line */}
                  <div className="absolute top-0 inset-x-0 h-[2.5px]" style={{ backgroundColor: isInRedZone ? '#FF0055' : color }} />
                  
                  {/* === TOP SECTION: Title & Status === */}
                  <div className="flex justify-between items-start mb-auto">
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-xs opacity-40" style={{ color: isInRedZone ? '#FF0055' : color }}>{sizeIcon}</span>
                        <p className="text-[8px] font-space tracking-[0.3em] uppercase font-black opacity-40">
                           {mission.sync_to_dashboard ? (isRTL ? 'نشط' : 'HUD_ACTIVE') : (isRTL ? 'استعداد' : 'STANDBY')}
                        </p>
                      </div>
                      <h3 className="text-base md:text-lg font-space font-black uppercase italic text-black dark:text-white truncate">
                         {mission.title}
                      </h3>
                    </div>
                    <span className="text-xl md:text-2xl font-black font-space italic shrink-0 ml-2" style={{ color: isInRedZone ? '#FF0055' : color }}>{percentage}%</span>
                  </div>

                  {/* === CENTER: Energy Kasa (Crystal Trophy) === */}
                  <div className="flex justify-center items-center py-3">
                    <EnergyCell
                      percentage={percentage}
                      color={isInRedZone ? '#FF0055' : color}
                      size={kasaSize as 'sm' | 'md'}
                      isInRedZone={isInRedZone}
                    />
                  </div>

                  {/* === BOTTOM: Progress bar + Dates + Tasks === */}
                  <div className="mt-auto space-y-3">
                    {/* Progress Bar */}
                    <div className="w-full h-[1.5px] bg-black/5 dark:bg-white/5 relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        className="h-full absolute top-0 start-0"
                        style={{ backgroundColor: isInRedZone ? '#FF0055' : color, boxShadow: `0 0 10px ${isInRedZone ? '#FF0055' : color}` }}
                      />
                    </div>

                    {/* Footer: Tasks count + Dates + Arrow */}
                    <div className="flex justify-between items-center">
                       <div className="flex items-center gap-3">
                         <p className="text-[8px] font-space text-black/30 dark:text-white/20 uppercase font-black tracking-widest">
                           {completedTasks}/{totalTasks} {isRTL ? 'المهام' : 'TASKS'}
                         </p>
                         {(mission.start_date || mission.end_date) && (
                           <p className="text-[7px] font-space text-black/20 dark:text-white/15 uppercase tracking-wider">
                             {fmtDate(mission.start_date)} → {fmtDate(mission.end_date)}
                           </p>
                         )}
                       </div>
                       <span className="material-symbols-outlined text-black/20 dark:text-white/10 group-hover:translate-x-2 rtl:group-hover:-translate-x-2 transition-transform text-lg">arrow_forward</span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Create Mission Card Shortcut */}
          {missions.length > 0 && (
             <motion.div
               onClick={() => setShowCreate(true)}
               className="flex flex-col items-center justify-center p-8 border border-dashed border-black/10 dark:border-white/5 rounded-sm hover:border-neon-green/30 transition-all cursor-pointer group min-h-[240px] max-h-[340px]"
             >
                <span className="material-symbols-outlined text-4xl text-black/10 dark:text-white/10 group-hover:text-neon-green/40 transition-colors">add_circle</span>
             </motion.div>
          )}

          {missions.length === 0 && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full py-32 flex flex-col items-center justify-center border border-dashed border-black/10 dark:border-white/5 rounded-sm cursor-pointer hover:border-neon-green/30 transition-all group"
              onClick={() => setShowCreate(true)}
            >
               <span className="material-symbols-outlined text-6xl text-black/10 dark:text-white/10 group-hover:text-neon-green/40 transition-colors">layers</span>
               <p className="text-[10px] font-space tracking-[0.5em] uppercase font-black mt-4 text-black/30 dark:text-white/20">{isRTL ? 'لا توجد مهام - ابدأ الآن' : 'EMPTY_STACK - INITIALIZE'}</p>
            </motion.div>
          )}
        </div>
      </div>
    </Shell>
  )
}
