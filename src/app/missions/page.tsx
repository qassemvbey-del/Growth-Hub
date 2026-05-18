'use client'

import Shell from '@/components/layout/Shell'
import { motion, AnimatePresence } from 'framer-motion'
import { useGrowth } from '@/context/GrowthContext'
import { cn } from '@/lib/utils'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'
import EnergyCell from '@/components/ui/EnergyCell'
import React from 'react'
import { useSound } from '@/context/SoundContext'
import MissionAttachmentsModal from '@/components/ui/MissionAttachmentsModal'
import { validateContent } from '@/lib/profanityFilter'
import { aiProfanityCheck } from '@/app/actions/profanityCheck'

const SIZES = [
  { key: 'lg', label: 'LARGE GOAL',  desc: 'Macro Objective', icon: 'trophy' },
  { key: 'md', label: 'MEDIUM GOAL', desc: 'Standard Focus',  icon: 'military_tech' },
  { key: 'sm', label: 'SMALL GOAL',  desc: 'Micro Focus',     icon: 'workspace_premium' },
]

export default function MissionsPage() {
  const { profile, t, calculateAccountability, isRTL, mounted, currentTheme } = useGrowth()
  const { showToast } = useToast()
  const router = useRouter()
  const { playDeploy, playBlip, playError } = useSound()
  const [missions, setMissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newSize, setNewSize] = useState('md')
  const [syncOnCreate, setSyncOnCreate] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [warningSlots, setWarningSlots] = useState(0)
  const [warningCriticalCount, setWarningCriticalCount] = useState(0)
  const supabase = createClient()

  // ── Attachments state ─────────────────────────────────────────────────
  const [attachmentMissionId, setAttachmentMissionId] = useState<string | null>(null)
  const [attachmentCounts, setAttachmentCounts] = useState<Record<string, number>>({})
  const [activeAttachments, setActiveAttachments] = useState<any[]>([])
  const [modalLoading, setModalLoading] = useState(false)

  useEffect(() => { 
    if (mounted) {
      fetchMissions() 
      if (window.location.search.includes('create=true')) {
        setShowCreate(true)
        window.history.replaceState({}, '', '/missions')
      }
    }
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
    if (data) {
      setMissions(data)
      // Pre-fetch attachment counts for all missions
      fetchAllAttachmentCounts(user.id, data.map((m: any) => m.id))
    }
    setLoading(false)
  }

  const fetchAllAttachmentCounts = useCallback(async (userId: string, missionIds: string[]) => {
    if (!missionIds.length) return
    const { data } = await supabase
      .from('mission_attachments')
      .select('mission_id')
      .eq('user_id', userId)
      .in('mission_id', missionIds)
    if (data) {
      const counts: Record<string, number> = {}
      data.forEach((row: any) => {
        counts[row.mission_id] = (counts[row.mission_id] || 0) + 1
      })
      setAttachmentCounts(counts)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAttachmentCountChange = useCallback((missionId: string, count: number) => {
    setAttachmentCounts(prev => ({ ...prev, [missionId]: count }))
  }, [])

  const openAttachments = async (missionId: string) => {
    playBlip()
    setModalLoading(true)
    
    const { data } = await supabase
      .from('mission_attachments')
      .select('*')
      .eq('mission_id', missionId)
      .order('created_at', { ascending: false })
    
    if (data) {
      setActiveAttachments(data)
      setAttachmentCounts(prev => ({ ...prev, [missionId]: data.length }))
    }
    
    setAttachmentMissionId(missionId)
    setModalLoading(false)
  }

  const SIZE_SLOTS: Record<string, number> = { sm: 1, md: 1.5, lg: 3, s: 1, m: 1.5, l: 3 }

  const addMission = async (bypassWarning: boolean = false) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const titleToCheck = newTitle.trim() || (isRTL ? 'هدف جديد' : 'New Goal')
    const { isValid } = validateContent(titleToCheck)
    if (!isValid) {
      showToast(isRTL ? 'برجاء الالتزام بلغة لائقة في النظام' : 'Please maintain professional language', 'warning')
      playError()
      return
    }

    const isAiValid = await aiProfanityCheck(titleToCheck)
    if (!isAiValid) {
      showToast(isRTL ? 'برجاء الالتزام بلغة لائقة في النظام' : 'Please maintain professional language', 'warning')
      playError()
      return
    }

    // 1. Get synced cups to check capacity
    const { data: synced } = await supabase
      .from('cups')
      .select('id, size')
      .eq('user_id', user.id)
      .eq('sync_to_dashboard', true)
      .eq('is_archived', false)

    const usedSlots = (synced || []).reduce((acc: number, m: any) => {
      return acc + (SIZE_SLOTS[m.size?.toLowerCase()] ?? 1)
    }, 0)

    // Capacity guard: only check if syncing to dashboard
    if (syncOnCreate) {
      const newSlots = SIZE_SLOTS[newSize] ?? 1
      if (usedSlots + newSlots > 9) {
        showToast(
          isRTL
            ? `سعة المحطة ممتلئة (${usedSlots.toFixed(1).replace('.0','')}/9 فتحات) - أتمم أو أزل مهمات موجودة.`
            : `FOCUS CAPACITY FULL (${usedSlots.toFixed(1).replace('.0','')}/9 SLOTS) — Complete or un-equip existing missions.`,
          'warning'
        )
        playError()
        return
      }
    }

    // 2. Perform Feature 3 checks (Context Switching Warning):
    if (!bypassWarning) {
      const cooldown = localStorage.getItem('context_warning_cooldown')
      const isCooldownActive = cooldown && (Date.now() - Number(cooldown) < 24 * 60 * 60 * 1000)

      if (!isCooldownActive) {
        // Condition A: Is active Focus Capacity Used >= 77%? (7/9 slots or more occupied)
        const isCapacityHeavy = usedSlots >= 7

        // Condition B: Are there critical missions? (end_date <= 5 days remaining AND progress < 50%)
        const criticalMissions = missions.filter(m => {
          if (!m.end_date) return false
          const daysLeft = (new Date(m.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          const { progress } = calculateAccountability(m)
          return daysLeft <= 5 && progress < 50
        })
        const hasCriticalMissions = criticalMissions.length > 0

        if (isCapacityHeavy || hasCriticalMissions) {
          setWarningSlots(usedSlots)
          setWarningCriticalCount(criticalMissions.length)
          setShowWarningModal(true)
          playError()
          return // Halt creation flow!
        }
      }
    }

    const insertData: any = {
      user_id: user.id,
      title: newTitle.trim() || (isRTL ? 'هدف جديد' : 'New Goal'),
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
      setShowWarningModal(false)
      setNewTitle('')
      setNewSize('md')
      setStartDate('')
      setEndDate('')
      showToast(isRTL ? 'تم إنشاء الهدف' : 'Goal activated!', 'success')
      playDeploy()
      router.push(`/missions/${data.id}`)
    }
  }

  if (loading || !mounted) return (
    <Shell>
      <div className="max-w-7xl mx-auto p-6 md:p-12 space-y-12">
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
      <div className="max-w-7xl mx-auto p-6 md:p-12 space-y-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-black/5 dark:border-white/5 pb-8">
          <div className="space-y-4 text-center md:text-start">
            <div className="flex items-center gap-4 justify-center md:justify-start">
              <span className="material-symbols-outlined text-3xl md:text-4xl" style={{ color: currentTheme.color }}>layers</span>
              <h1 className="text-4xl md:text-6xl font-black font-space tracking-wider uppercase not-italic text-black dark:text-white leading-none">
                {isRTL ? 'لوحة' : 'GOAL'}<span style={{ color: currentTheme.color }}>{isRTL ? ' الأهداف' : '_CANVAS'}</span>
              </h1>
              <button onClick={() => setShowGuide(true)} className="material-symbols-outlined text-[var(--text-secondary)]/40 hover:text-[var(--text-secondary)] transition-colors duration-300 text-xl" title="Guide">
                info
              </button>
            </div>
            <p className={cn("text-[11px] font-space tracking-[0.35em] uppercase font-bold", isRTL ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]")}>
               {isRTL ? 'الأهداف الأساسية النشطة' : 'Active Goals'} &nbsp;·&nbsp; {missions.length} {isRTL ? 'هدف نشط' : 'total'}
            </p>
          </div>
          <button
            onClick={() => { playBlip(); setShowCreate(true); }}
            className="flex flex-row items-center justify-center gap-2 w-full md:w-auto h-11 px-6 rounded-xl font-space text-xs font-black uppercase tracking-widest transition-all duration-300 hover:brightness-110 active:scale-95 shadow-lg"
            style={{ backgroundColor: currentTheme.color, color: '#000', boxShadow: `0 4px 20px ${currentTheme.color}33` }}
          >
            <span className="material-symbols-outlined text-[16px] leading-none">add</span>
            {isRTL ? 'إنشاء هدف' : 'Create Goal'}
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
                className="w-full max-w-2xl bg-[var(--card-bg)] border border-[var(--card-border)] p-8 md:p-12 space-y-8 rounded-sm shadow-2xl my-8 relative"
              >
                <button 
                  onClick={() => setShowGuide(false)} 
                  className="absolute top-6 right-6 rtl:left-6 rtl:right-auto material-symbols-outlined text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  close
                </button>
                <div className="space-y-6">
                  <div className="space-y-2 border-l-4 pl-4 rtl:pl-0 rtl:pr-4 rtl:border-l-0 rtl:border-r-4" style={{ borderColor: currentTheme.color }}>
                    <p className="text-2xl md:text-3xl font-black text-[var(--text-primary)] mb-4">
                      أهلاً بيك في ساحة المعركة يا وحش! ده مش مجرد جدول مهام، ده سيستم (Battle Royale) لحياتك.
                    </p>
                    <ol className="list-decimal list-inside space-y-3 text-lg text-[var(--text-primary)]/80 font-bold">
                      <li><span style={{ color: currentTheme.color }}>ميزان القوة (الـ HUD):</span> عقلك والداشبورد بيشيلوا ٩ وحدات بس. الصغير (Small) بـ ١، المتوسط (Medium) بـ ١.٥، والكبير (Large) بـ ٣ أماكن.</li>
                      <li><span style={{ color: currentTheme.color }}>عقود الاشتباك (XP):</span> كل شرطة مجهود بـ ١٠ XP. والمهمات الكبيرة ليها "بونص" ٥٠ نقطة لما تقفلها.</li>
                      <li><span style={{ color: currentTheme.color }}>نزيف الطاقة (XP Bleed):</span> لو اتأخرت عن ميعادك، السيستم هيسحب منك ٥ XP كل يوم. ولو كسلت أسبوع، فيه غرامة ١٠ XP.</li>
                    </ol>
                  </div>
                  
                  <div className="h-px w-full bg-[var(--card-border)] my-8"></div>

                  <div className="space-y-2 border-l-4 pl-4 rtl:pl-0 rtl:pr-4 rtl:border-l-0 rtl:border-r-4" style={{ borderColor: currentTheme.color }}>
                    <p className="text-xl md:text-2xl font-black font-space text-[var(--text-primary)] uppercase italic tracking-tighter mb-4">
                      "Welcome, Soldier. This is your Tactical Life OS."
                    </p>
                    <ol className="list-decimal list-inside space-y-3 text-base md:text-lg text-[var(--text-primary)]/80 font-bold font-space">
                      <li><span className="uppercase tracking-widest" style={{ color: currentTheme.color }}>Grid Slots:</span> Your HUD has 9 slots total. Small = 1, Medium = 1.5, Large = 3.</li>
                      <li><span className="uppercase tracking-widest" style={{ color: currentTheme.color }}>XP Logic:</span> 1 Task Bar = 10 XP. Large missions give +50 XP bonus.</li>
                      <li><span className="uppercase tracking-widest" style={{ color: currentTheme.color }}>The Penalties:</span> Delay costs -5 XP/day. Inactivity for 7 days costs -10 XP.</li>
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
                className="w-full max-w-xl bg-[var(--card-bg)] border border-[var(--card-border)] p-8 md:p-12 space-y-10 rounded-sm shadow-2xl my-8"
              >
                <h2 className="text-2xl md:text-3xl font-space font-black uppercase italic text-black dark:text-white tracking-tighter">
                  {isRTL ? 'إنشاء هدف جديد' : 'Create New Goal'}
                </h2>

                {/* Title */}
                <div className="space-y-3">
                  <label className="text-sm md:text-base font-space tracking-widest uppercase font-black" style={{ color: currentTheme.color }}>{isRTL ? 'عنوان الهدف' : 'Goal Title'}</label>
                  <input
                    autoFocus
                    value={newTitle}
                    placeholder={isRTL ? 'اسم هدفك...' : 'Name your goal...'}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] p-4 font-space text-lg md:text-xl font-black text-[var(--text-primary)] italic outline-none transition-all"
                    onFocus={e => e.currentTarget.style.borderColor = currentTheme.color}
                    onBlur={e => e.currentTarget.style.borderColor = ''}
                  />
                </div>

                {/* Size Selection */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm md:text-base font-space tracking-widest uppercase font-black" style={{ color: currentTheme.color }}>{isRTL ? 'حجم الهدف' : 'Goal Size'}</label>
                    <div className="group relative flex items-center cursor-help">
                      <span className="material-symbols-outlined text-[var(--text-secondary)] text-sm md:text-base transition-colors group-hover:text-white">info</span>
                      <div className="pointer-events-none absolute bottom-full mb-2 w-64 md:w-80 rounded bg-[var(--card-bg)] border border-[var(--card-border)] p-3 md:p-4 text-xs md:text-sm text-[var(--text-primary)] shadow-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-[300]">
                        {isRTL 
                          ? "حجم الهدف يحدد سعة الـ Slots المستهلكة في لوحة القيادة، وسقف نقاط الـ XP المكتسبة (Small: 4 مهام، Medium: 8 مهام، Large: 20 مهمة). يمكنك إضافة مهام إضافية بعد السقف للتنظيم فقط."
                          : "Goal size determines Focus Slots consumed on the dashboard and the XP reward ceiling (Small: 4 tasks, Medium: 8 tasks, Large: 20 tasks). Extra tasks can be added freely for organization."}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {SIZES.map(s => (
                      <button
                        key={s.key}
                        onClick={() => setNewSize(s.key)}
                        className={cn(
                          "p-4 border flex flex-col items-center gap-2 transition-all rounded-sm",
                          newSize === s.key 
                            ? "text-black border-transparent shadow-lg" 
                            : "border-[var(--card-border)] text-[var(--text-secondary)] hover:border-transparent"
                        )}
                        style={newSize === s.key ? { backgroundColor: currentTheme.color, borderColor: currentTheme.color, boxShadow: `0 0 15px ${currentTheme.color}55` } : {}}
                        onMouseEnter={e => { if (newSize !== s.key) e.currentTarget.style.borderColor = `${currentTheme.color}60` }}
                        onMouseLeave={e => { if (newSize !== s.key) e.currentTarget.style.borderColor = '' }}
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
                      className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] p-4 font-space text-sm md:text-base font-black text-[var(--text-primary)] outline-none transition-all uppercase rounded-sm date-input-tactical"
                      style={{ colorScheme: 'dark' }}
                      onFocus={e => e.currentTarget.style.borderColor = currentTheme.color}
                      onBlur={e => e.currentTarget.style.borderColor = ''}
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
                      className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] p-4 font-space text-sm md:text-base font-black text-[var(--text-primary)] outline-none transition-all uppercase rounded-sm date-input-tactical"
                      style={{ colorScheme: 'dark' }}
                      onFocus={e => e.currentTarget.style.borderColor = currentTheme.color}
                      onBlur={e => e.currentTarget.style.borderColor = ''}
                    />
                  </div>
                </div>

                {/* HUD Visibility */}
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="space-y-3 flex-1">
                     <label className="text-sm md:text-base font-space tracking-widest uppercase font-black" style={{ color: currentTheme.color }}>{isRTL ? 'عرض في اللوحة' : 'Show on Dashboard'}</label>
                     <button 
                       onClick={() => setSyncOnCreate(!syncOnCreate)}
                       className="w-full p-4 border font-space text-sm md:text-base font-black uppercase tracking-widest transition-all duration-300 rounded-sm flex items-center justify-between gap-4"
                       style={syncOnCreate ? {
                         backgroundColor: currentTheme.color,
                         borderColor: currentTheme.color,
                         color: '#000',
                         boxShadow: `0 0 18px ${currentTheme.color}55`
                       } : {
                         backgroundColor: 'transparent',
                         borderColor: 'var(--card-border)',
                         color: 'var(--text-secondary)'
                       }}
                     >
                       <span className="flex items-center gap-3">
                         <span className="material-symbols-outlined text-xl">
                           {syncOnCreate ? 'hub' : 'hub'}
                         </span>
                         {syncOnCreate
                           ? (isRTL ? 'مرئي في اللوحة' : 'SHOW ON DASHBOARD')
                           : (isRTL ? 'مخفي من اللوحة' : 'STAY OFF-GRID')}
                       </span>
                       {/* ON / OFF pill */}
                       <span
                         className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full border transition-all duration-300"
                         style={syncOnCreate ? {
                           backgroundColor: 'rgba(0,0,0,0.25)',
                           borderColor: 'rgba(0,0,0,0.2)',
                           color: '#000'
                         } : {
                           backgroundColor: 'transparent',
                           borderColor: 'var(--card-border)',
                           color: 'var(--text-secondary)'
                         }}
                       >
                         {syncOnCreate ? 'ON' : 'OFF'}
                       </span>
                     </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-6 pt-4 border-t border-black/5 dark:border-white/5">
                  <button onClick={() => setShowCreate(false)} className="text-[var(--text-secondary)] font-space text-sm md:text-base uppercase tracking-widest hover:text-[var(--text-primary)] font-black">{isRTL ? 'إلغاء' : 'Cancel'}</button>
                  <button onClick={() => addMission()} className="px-10 py-4 font-space font-black text-sm md:text-base uppercase tracking-widest shadow-lg rounded-xl" style={{ backgroundColor: currentTheme.color, color: '#000', boxShadow: `0 0 20px ${currentTheme.color}4d` }}>{isRTL ? 'تفعيل' : 'Activate'}</button>
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
                  onClick={() => { playBlip(); router.push(`/missions/${mission.id}`); }}
                  className={cn(
                    "group relative flex flex-col bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--card-border)]/50 cursor-pointer transition-all rounded-sm shadow-xl overflow-hidden",
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
                           {mission.sync_to_dashboard ? (isRTL ? 'نشط' : 'ACTIVE') : (isRTL ? 'استعداد' : 'STANDBY')}
                        </p>
                      </div>
                      <h3 className="text-base md:text-lg font-space font-black uppercase italic text-[var(--text-primary)] truncate">
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
                    <div className="w-full h-[1.5px] bg-[var(--input-bg)] relative">
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
                          <p className="text-[8px] font-space text-[var(--text-secondary)] uppercase font-black tracking-widest">
                            {completedTasks}/{totalTasks} {isRTL ? 'المهام' : 'TASKS'}
                          </p>
                          {(mission.start_date || mission.end_date) && (
                            <p className="text-[7px] font-space text-[var(--text-secondary)]/50 uppercase tracking-wider">
                              {fmtDate(mission.start_date)} → {fmtDate(mission.end_date)}
                            </p>
                          )}
                       </div>
                       <div className="flex items-center gap-2">
                         <button
                           onClick={(e) => {
                             e.stopPropagation();
                             const { progress } = calculateAccountability(mission);
                             const percentage = Math.round(progress);
                             const completed = mission.tasks?.filter((t: any) => t.is_completed).length || 0;
                             const total = mission.tasks?.length || 0;
                             
                             const formatDate = (dateStr: string | null, fallbackDate?: Date) => {
                               const d = dateStr ? new Date(dateStr) : (fallbackDate || new Date());
                               return d.toISOString().split('T')[0].replace(/-/g, '');
                             };

                             const dtStart = formatDate(mission.start_date);
                             let dtEnd;
                             if (mission.end_date) {
                               dtEnd = formatDate(mission.end_date);
                             } else {
                               const d = mission.start_date ? new Date(mission.start_date) : new Date();
                               d.setDate(d.getDate() + 30);
                               dtEnd = d.toISOString().split('T')[0].replace(/-/g, '');
                             }

                             const details = encodeURIComponent(`Growth Hub Mission | Progress: ${percentage}% | Tasks: ${completed}/${total}`);
                             const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(mission.title)}&dates=${dtStart}/${dtEnd}&details=${details}&location=Growth_Hub`;
                             
                             window.open(googleUrl, '_blank');
                             playBlip();
                           }}
                           className="relative flex items-center justify-center w-8 h-8 border border-[var(--card-border)] transition-all rounded-sm"
                            onMouseEnter={e => e.currentTarget.style.borderColor = `${color}60`}
                            onMouseLeave={e => e.currentTarget.style.borderColor = ''}
                            title="ADD_TO_GOOGLE_CALENDAR"
                          >
                            <span className="material-symbols-outlined text-sm" style={{ color, textShadow: `0 0 8px ${color}` }}>calendar_month</span>
                         </button>

                         <button
                           onClick={(e) => {
                             e.stopPropagation();
                             openAttachments(mission.id);
                           }}
                           className="relative flex items-center justify-center w-8 h-8 border border-[var(--card-border)] transition-all rounded-sm group/attach"
                            onMouseEnter={e => e.currentTarget.style.borderColor = `${color}60`}
                            onMouseLeave={e => e.currentTarget.style.borderColor = ''}
                           style={{ 
                             borderColor: (attachmentCounts[mission.id] || 0) > 0 ? `${color}44` : undefined,
                             boxShadow: (attachmentCounts[mission.id] || 0) > 0 ? `0 0 10px ${color}22` : undefined
                           }}
                         >
                           <span className="material-symbols-outlined text-sm" style={{ 
                             color: (attachmentCounts[mission.id] || 0) > 0 ? color : 'inherit',
                             textShadow: (attachmentCounts[mission.id] || 0) > 0 ? `0 0 8px ${color}` : 'none'
                           }}>attach_file</span>
                           {(attachmentCounts[mission.id] || 0) > 0 && (
                             <span className="absolute -top-1.5 -right-1.5 w-4 h-4 text-black text-[8px] font-black flex items-center justify-center rounded-full shadow-lg"
                               style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
                             >
                               {attachmentCounts[mission.id]}
                             </span>
                           )}
                         </button>
                         <span className="material-symbols-outlined text-[var(--text-secondary)]/35 group-hover:translate-x-2 rtl:group-hover:-translate-x-2 transition-transform text-lg">arrow_forward</span>
                       </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* ── ATTACHMENTS MODAL (rendered once, outside cards) ── */}
          {attachmentMissionId && (
            <MissionAttachmentsModal
              missionId={attachmentMissionId}
              missionTitle={missions.find(m => m.id === attachmentMissionId)?.title ?? ''}
              themeColor={currentTheme.color}
              isOpen={!!attachmentMissionId}
              attachments={activeAttachments}
              setAttachments={setActiveAttachments}
              loading={modalLoading}
              onClose={() => {
                setAttachmentMissionId(null)
                setActiveAttachments([])
              }}
              onCountChange={count => handleAttachmentCountChange(attachmentMissionId, count)}
            />
          )}

          {/* FEATURE 3: CONTEXT SWITCHING WARNING OVERLAY */}
          <AnimatePresence>
            {showWarningModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="w-full max-w-md border bg-[var(--card-bg)] p-6 rounded-sm shadow-[0_0_50px_rgba(255,0,85,0.3)] relative overflow-hidden"
                  style={{ borderColor: '#FF0055' }}
                >
                  {/* Neon alert top line */}
                  <div className="absolute top-0 inset-x-0 h-[2.5px] bg-[#FF0055]" />
                  
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 text-[#FF0055]">
                      <span className="material-symbols-outlined text-3xl animate-pulse">warning</span>
                      <h3 className="text-lg font-black tracking-widest uppercase font-space">
                        {isRTL ? 'تحذير: تشتيت التركيز' : 'WARNING: CONTEXT SWITCHING'}
                      </h3>
                    </div>

                    <div className="space-y-4 font-space text-xs leading-relaxed text-[var(--text-primary)]">
                      <p className="font-bold border-l-2 border-[#FF0055] pl-3 py-1 bg-[#FF0055]/5">
                        {isRTL 
                          ? '🚧 تشتيت التركيز يقلل الأداء الذهني بنسبة تصل إلى 40%.' 
                          : '🚧 WARNING: Context Switching degrades cognitive performance by up to 40%.'}
                      </p>
                      <p className="text-[var(--text-secondary)]">
                        {isRTL
                          ? 'توجد مهام نشطة تستهلك سعة التركيز أو مهام حرجة قريبة من الموعد النهائي. إضافة هدف جديد سيقلل من جودة التنفيذ.'
                          : 'Multiple cognitive focus slots are active, or critical missions are near their deadline. Adding a new goal will degrade execution quality.'}
                      </p>
                      
                      <div className="p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-sm space-y-2">
                        {warningSlots >= 7 && (
                          <div className="flex justify-between items-center text-[10px] uppercase font-bold text-[var(--text-secondary)] font-space">
                            <span>{isRTL ? 'سعة التركيز النشطة:' : 'Active Focus Capacity:'}</span>
                            <span className="text-[#FF0055] font-black">{warningSlots.toFixed(1).replace('.0','')}/9 Slots ({(warningSlots/9 * 100).toFixed(0)}%)</span>
                          </div>
                        )}
                        {warningCriticalCount > 0 && (
                          <div className="flex justify-between items-center text-[10px] uppercase font-bold text-[var(--text-secondary)] font-space">
                            <span>{isRTL ? 'المهام الحرجة القريبة:' : 'Critical Near-Deadline Goals:'}</span>
                            <span className="text-[#FF0055] font-black">{warningCriticalCount} {isRTL ? 'مهام' : 'Missions'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        onClick={() => {
                          localStorage.setItem('context_warning_cooldown', Date.now().toString());
                          addMission(true);
                        }}
                        className="flex-1 py-2.5 bg-[#FF0055]/10 text-[#FF0055] border border-[#FF0055]/30 hover:bg-[#FF0055]/20 font-space font-black text-xs uppercase tracking-widest transition-all"
                      >
                        {isRTL ? 'استبدال المهمة' : 'FORCE SWAP'}
                      </button>
                      <button
                        onClick={() => {
                          playBlip();
                          setShowWarningModal(false);
                        }}
                        className="flex-1 py-2.5 text-white dark:text-black font-space font-black text-xs uppercase tracking-widest transition-all"
                        style={{ backgroundColor: currentTheme.color }}
                      >
                        {isRTL ? 'الاستمرار بالتركيز' : 'KEEP FOCUSING'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {missions.length === 0 && !loading && (
            <div className="col-span-full py-24">
              <p className="text-white/30 text-sm text-center">No active goals synced. Use the action panel above to initiate.</p>
            </div>
          )}
        </div>
      </div>
    </Shell>
  )
}
