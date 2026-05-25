'use client'

import Shell from '@/components/layout/Shell'
import { motion, AnimatePresence } from 'framer-motion'
import { useGrowth } from '@/context/GrowthContext'
import { cn } from '@/lib/utils'
import { useState, useEffect, useCallback, useMemo } from 'react'
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

const getRankBorderClass = (rank: string) => {
  const r = rank?.toLowerCase() || ''
  if (r.includes('conqueror')) return 'border-purple-500'
  if (r.includes('ace')) return 'border-teal-400'
  return 'border-zinc-500'
}

export default function SquadGoalsPage() {
  let typeFilter = 'squad' as string
  const { profile, t, calculateAccountability, isRTL, mounted, currentTheme, setShowAuthModal, addXp } = useGrowth()
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
  const [defaultView, setDefaultView] = useState<'list' | 'board'>('list')
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [warningSlots, setWarningSlots] = useState(0)
  const [warningCriticalCount, setWarningCriticalCount] = useState(0)
  const [activeTab, setActiveTab] = useState<'ALL' | string>('ALL')
  const [showJoinGoal, setShowJoinGoal] = useState(false)
  const [activeRulesGoalId, setActiveRulesGoalId] = useState<string | null>(null)
  const [goalMembersMap, setGoalMembersMap] = useState<Record<string, any[]>>({})
  const [goalActiveTodayMap, setGoalActiveTodayMap] = useState<Record<string, number>>({})
  
  // Join Goal Modal states
  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [joinStatus, setJoinStatus] = useState<'idle' | 'scanning' | 'valid' | 'invalid' | 'already_member' | 'success'>('idle')
  const [scannedGoalName, setScannedGoalName] = useState('')
  const [joinErrorText, setJoinErrorText] = useState('')
  
  const supabase = createClient()

  // ── Attachments state ─────────────────────────────────────────────────
  const [attachmentMissionId, setAttachmentMissionId] = useState<string | null>(null)
  const [attachmentCounts, setAttachmentCounts] = useState<Record<string, number>>({})
  const [activeAttachments, setActiveAttachments] = useState<any[]>([])
  const [modalLoading, setModalLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const getUserRole = (mission: any) => {
    if (mission.user_id === profile?.id) return 'OWNER'
    const members = goalMembersMap[mission.id] || []
    const me = members.find((m: any) => m.id === profile?.id)
    if (me) {
      if (me.role?.toLowerCase() === 'owner') return 'OWNER'
      if (me.role?.toLowerCase() === 'co-admin' || me.role?.toLowerCase() === 'co_admin') return 'CO-ADMIN'
      return 'MEMBER'
    }
    return 'MEMBER'
  }

  const renderMissionCard = (mission: any, idx: number) => {
    const { progress, isInRedZone } = calculateAccountability(mission)
    const percentage = Math.round(progress)
    const color = currentTheme.color
    const completedTasks = mission.tasks?.filter((t: any) => t.is_completed).length || 0
    const totalTasks = mission.tasks?.length || 0
    const kasaSize = mission.size === 'lg' ? 'md' : mission.size === 'md' ? 'sm' : 'sm'
    const sizeIcon = SIZES.find(s => s.key === mission.size)?.icon || 'layers'
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
        onClick={() => { playBlip(); router.push(`/goals/squad/${mission.id}`); }}
        className={cn(
          "group relative flex flex-col bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--card-border)]/50 cursor-pointer transition-all rounded-sm shadow-xl overflow-hidden",
          typeFilter === 'squad'
            ? "min-h-[290px] max-h-[380px]"
            : "min-h-[240px] max-h-[340px]",
          typeFilter === 'squad' && "border-l-4",
          "p-5 md:p-6"
        )}
        style={typeFilter === 'squad' ? { borderLeftColor: mission.color || color } : {}}
      >
        <div className="absolute top-0 inset-x-0 h-[2.5px]" style={{ backgroundColor: isInRedZone ? '#FF0055' : (mission.color || color) }} />
        
        <div className="flex justify-between items-start mb-auto">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="material-symbols-outlined text-xs opacity-40" style={{ color: isInRedZone ? '#FF0055' : (mission.color || color) }}>{sizeIcon}</span>
              <p className="text-[8px] font-space tracking-[0.3em] uppercase font-black opacity-40">
                 {mission.sync_to_dashboard ? (isRTL ? 'نشط' : 'ACTIVE') : (isRTL ? 'استعداد' : 'STANDBY')}
              </p>
              {typeFilter === 'solo' && (
                <span className="text-[8px] font-space tracking-widest font-black uppercase text-zinc-500 opacity-60 bg-zinc-500/10 border border-zinc-500/20 px-1.5 py-0.5 rounded-sm">
                  ◆ SOLO
                </span>
              )}
              {typeFilter === 'squad' && (
                mission.user_id === profile?.id ? (
                  <span className="text-[8px] font-space tracking-widest font-black uppercase text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-sm flex items-center gap-0.5 shadow-[0_0_8px_rgba(245,158,11,0.1)]">
                    👑 ADMIN
                  </span>
                ) : (
                  <span className="text-[8px] font-space tracking-widest font-black uppercase text-zinc-400 bg-zinc-400/10 border border-zinc-400/20 px-1.5 py-0.5 rounded-sm">
                    MEMBER
                  </span>
                )
              )}
            </div>
            <h3 className="text-lg md:text-xl font-space font-black uppercase text-[var(--text-primary)] truncate mt-1">
               {mission.title}
            </h3>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xl md:text-2xl font-black font-space shrink-0" style={{ color: isInRedZone ? '#FF0055' : (mission.color || color) }}>{percentage}%</span>
            {typeFilter === 'squad' && mission.user_id === profile?.id && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playBlip();
                    setActiveRulesGoalId(activeRulesGoalId === mission.id ? null : mission.id);
                  }}
                  className="material-symbols-outlined text-sm text-[var(--text-secondary)] hover:text-white transition-colors p-1"
                >
                  settings
                </button>
                
                <AnimatePresence>
                  {activeRulesGoalId === mission.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute right-0 top-full mt-2 w-64 bg-zinc-950/95 border border-zinc-800 rounded-xl p-4 shadow-2xl backdrop-blur-md z-[150] space-y-3 font-space text-left"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="text-[10px] font-black tracking-widest text-zinc-500 uppercase border-b border-zinc-800/80 pb-1.5">
                        SQUAD RULES // OWNER ONLY
                      </p>
                      
                      <label className="flex items-center justify-between text-[11px] font-bold text-zinc-300 hover:text-white cursor-pointer select-none">
                        <span>No date changes for members</span>
                        <input
                          type="checkbox"
                          checked={!!mission.metadata?.rules?.no_date_changes}
                          onChange={() => toggleSquadRule(mission, 'no_date_changes')}
                          className="accent-teal-400 cursor-pointer"
                        />
                      </label>

                      <label className="flex items-center justify-between text-[11px] font-bold text-zinc-300 hover:text-white cursor-pointer select-none">
                        <span>XP penalty 2x for late tasks</span>
                        <input
                          type="checkbox"
                          checked={!!mission.metadata?.rules?.xp_multiplier}
                          onChange={() => toggleSquadRule(mission, 'xp_multiplier')}
                          className="accent-teal-400 cursor-pointer"
                        />
                      </label>

                      <label className="flex items-center justify-between text-[11px] font-bold text-zinc-300 hover:text-white cursor-pointer select-none">
                        <span>Members cannot delete tasks</span>
                        <input
                          type="checkbox"
                          checked={!!mission.metadata?.rules?.no_delete}
                          onChange={() => toggleSquadRule(mission, 'no_delete')}
                          className="accent-teal-400 cursor-pointer"
                        />
                      </label>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center items-center py-3">
          <EnergyCell
            percentage={percentage}
            color={isInRedZone ? '#FF0055' : (mission.color || color)}
            size={kasaSize as 'sm' | 'md'}
            isInRedZone={isInRedZone}
          />
        </div>

        {typeFilter === 'squad' && (
          <div className="flex flex-col gap-2 my-2 py-1.5 border-y border-zinc-800/40 select-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center -space-x-2">
                {(goalMembersMap[mission.id] || []).slice(0, 4).map((member: any) => (
                  <div
                    key={member.id}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 bg-zinc-900 flex items-center justify-center text-[8px] font-space font-black uppercase text-white shadow-md relative overflow-hidden shrink-0",
                      getRankBorderClass(member.rank)
                    )}
                    title={`${member.full_name} (${member.rank || 'MEMBER'}) - ${member.role}`}
                  >
                    {member.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={member.avatar_url}
                        alt={member.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{member.full_name?.substring(0, 2) || 'OP'}</span>
                    )}
                  </div>
                ))}
                
                {(goalMembersMap[mission.id] || []).length > 4 && (
                  <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[7px] font-space font-black text-teal-400 shadow-md shrink-0">
                    +{(goalMembersMap[mission.id] || []).length - 4}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-space font-black text-zinc-400 uppercase tracking-wider">
                  {(goalMembersMap[mission.id] || []).length} MEMBER{((goalMembersMap[mission.id] || []).length !== 1) ? 'S' : ''}
                </span>
                <span className="text-zinc-600 text-[8px] font-space font-black">•</span>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[8px] font-space font-black text-emerald-400 uppercase tracking-wider">
                    {goalActiveTodayMap[mission.id] || 0} ACTIVE TODAY
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-auto space-y-3">
          <div className="w-full h-[1.5px] bg-[var(--input-bg)] relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              className="h-full absolute top-0 start-0"
              style={{ backgroundColor: isInRedZone ? '#FF0055' : (mission.color || color), boxShadow: `0 0 10px ${isInRedZone ? '#FF0055' : (mission.color || color)}` }}
            />
          </div>

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
                {typeFilter === 'squad' && mission.metadata?.invite_code && (
                  <button
                    onClick={(e) => handleCopyInviteLink(e, mission.metadata.invite_code)}
                    className="relative flex items-center justify-center w-8 h-8 border border-[var(--card-border)] hover:border-teal-400/50 hover:bg-teal-500/5 transition-all rounded-sm shrink-0 animate-pulse"
                    title="COPY_INVITE_CODE"
                  >
                    <span className="material-symbols-outlined text-sm text-teal-400">link</span>
                  </button>
                )}

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

                    const details = encodeURIComponent(`Growth Hub Goal | Progress: ${percentage}% | Tasks: ${completed}/${total}`);
                    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(mission.title)}&dates=${dtStart}/${dtEnd}&details=${details}&location=Growth_Hub`;
                    
                    window.open(googleUrl, '_blank');
                    playBlip();
                  }}
                  className="relative flex items-center justify-center w-8 h-8 border border-[var(--card-border)] transition-all rounded-sm shrink-0"
                  onMouseEnter={e => e.currentTarget.style.borderColor = `${(mission.color || color)}60`}
                  onMouseLeave={e => e.currentTarget.style.borderColor = ''}
                  title="ADD_TO_GOOGLE_CALENDAR"
                >
                  <span className="material-symbols-outlined text-sm">calendar_month</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openAttachments(mission.id);
                  }}
                  className="relative flex items-center justify-center w-8 h-8 border border-[var(--card-border)] transition-all rounded-sm shrink-0"
                  onMouseEnter={e => e.currentTarget.style.borderColor = `${(mission.color || color)}60`}
                  onMouseLeave={e => e.currentTarget.style.borderColor = ''}
                  title="ATTACHMENTS"
                  style={{
                    borderColor: (attachmentCounts[mission.id] || 0) > 0 ? `${(mission.color || color)}44` : undefined,
                    boxShadow: (attachmentCounts[mission.id] || 0) > 0 ? `0 0 10px ${(mission.color || color)}22` : undefined
                  }}
                >
                  <span className="material-symbols-outlined text-sm" style={{ 
                    color: (attachmentCounts[mission.id] || 0) > 0 ? (mission.color || color) : 'inherit',
                    textShadow: (attachmentCounts[mission.id] || 0) > 0 ? `0 0 8px ${(mission.color || color)}` : 'none'
                  }}>attach_file</span>
                  {(attachmentCounts[mission.id] || 0) > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 text-black text-[8px] font-black flex items-center justify-center rounded-full shadow-lg"
                      style={{ backgroundColor: (mission.color || color), boxShadow: `0 0 10px ${(mission.color || color)}` }}
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
  }

  useEffect(() => { 
    if (mounted) {
      fetchMissions() 
      if (window.location.search.includes('create=true')) {
        setShowCreate(true)
        window.history.replaceState({}, '', '/goals/squad')
      }
    }
  }, [mounted])

  // Handle auto-join URL param (?join=CODE)
  useEffect(() => {
    if (mounted) {
      const params = new URLSearchParams(window.location.search)
      const joinParam = params.get('join')
      if (joinParam) {
        setJoinCodeInput(joinParam.toUpperCase())
        setShowJoinGoal(true)
        // Clean URL parameter
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  // --- REAL-TIME SUBSCRIPTION FOR SQUAD CANVAS UPDATES ---
  useEffect(() => {
    console.log('🚀 REALTIME HOOK MOUNTED');
    if (!profile?.id) {
      console.log('Realtime hook waiting: profile session is not yet loaded');
      return;
    }
    if (!mounted) {
      console.log('Realtime hook returning early because page is not mounted');
      return;
    }

    const channel = supabase
      .channel('squad-goals-canvas-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cups' },
        () => {
          fetchMissions()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          fetchMissions()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'goal_members' },
        () => {
          fetchMissions()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: '*' },
        (payload) => {
          console.log('🔥 GLOBAL CATCH-ALL PAYLOAD:', payload)
        }
      )
      .subscribe((status) => {
        console.log('📡 CHANNEL STATUS:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [mounted, profile?.id])

  const extractCode = (input: string) => {
    let clean = input.trim().toUpperCase()
    try {
      const url = new URL(clean)
      const joinParam = url.searchParams.get('join')
      if (joinParam) {
        clean = joinParam.trim().toUpperCase()
      }
    } catch (e) {
      // Direct code
    }
    return clean
  }

  const handleScanCode = async () => {
    const code = extractCode(joinCodeInput)
    if (!code) {
      setJoinStatus('invalid')
      setJoinErrorText('INVALID_CODE // TRY AGAIN')
      return
    }

    setJoinStatus('scanning')
    playBlip()

    try {
      const { data, error } = await supabase.rpc('verify_squad_invite', { input_code: code })
      
      if (error) {
        setJoinStatus('invalid')
        setJoinErrorText('INVALID_CODE // TRY AGAIN')
        playError()
        return
      }

      const result = typeof data === 'string' ? JSON.parse(data) : data
      if (result && result.success) {
        setJoinStatus('valid')
        setScannedGoalName(result.goal_title)
        playDeploy()
      } else {
        const err = result?.error || 'INVALID_CODE // TRY AGAIN'
        if (err.includes('ALREADY IN THIS SQUAD')) {
          setJoinStatus('already_member')
        } else {
          setJoinStatus('invalid')
          setJoinErrorText(err)
        }
        playError()
      }
    } catch (err) {
      setJoinStatus('invalid')
      setJoinErrorText('INVALID_CODE // TRY AGAIN')
      playError()
    }
  }

  const handleConfirmJoin = async () => {
    const code = extractCode(joinCodeInput)
    setJoinStatus('scanning')
    playBlip()

    try {
      const { data, error } = await supabase.rpc('submit_squad_join_request', { input_code: code })
      
      if (error) {
        setJoinStatus('invalid')
        setJoinErrorText('INVALID_CODE // TRY AGAIN')
        playError()
        return
      }

      const result = typeof data === 'string' ? JSON.parse(data) : data
      if (result && result.success) {
        setJoinStatus('success')
        showToast(
          isRTL 
            ? 'تم إرسال طلب الانضمام // بانتظار موافقة القائد' 
            : 'JOIN REQUEST SUBMITTED // WAITING FOR OWNER APPROVAL', 
          'success'
        )
        playDeploy()
        setTimeout(() => {
          setShowJoinGoal(false)
          setJoinCodeInput('')
          setJoinStatus('idle')
          fetchMissions()
        }, 2000)
      } else {
        const err = result?.error || 'INVALID_CODE // TRY AGAIN'
        if (err.includes('ALREADY IN THIS SQUAD')) {
          setJoinStatus('already_member')
        } else if (err.includes('REQUEST_PENDING')) {
          setJoinStatus('invalid')
          setJoinErrorText(isRTL ? 'الطلب قيد الانتظار بالفعل // يرجى الانتظار' : 'REQUEST_PENDING // ALREADY SENT')
          playError()
        } else if (err.includes('REQUEST_REJECTED')) {
          setJoinStatus('invalid')
          setJoinErrorText(isRTL ? 'تم رفض طلبك السابق // الوصول مصنف' : 'REQUEST_REJECTED // ACCESS CLASSIFIED')
          playError()
        } else {
          setJoinStatus('invalid')
          setJoinErrorText(err)
          playError()
        }
      }
    } catch (err) {
      setJoinStatus('invalid')
      setJoinErrorText('INVALID_CODE // TRY AGAIN')
      playError()
    }
  }

  const handleCopyInviteLink = (e: React.MouseEvent, code: string) => {
    e.stopPropagation()
    const link = `${window.location.origin}/goals/squad?join=${code}`
    navigator.clipboard.writeText(link)
    showToast(isRTL ? 'تم نسخ الرابط' : 'INVITE LINK COPIED', 'success')
    playBlip()
  }

  const toggleSquadRule = async (mission: any, ruleKey: string) => {
    const newMetadata = { ...mission.metadata }
    newMetadata.rules = { ...newMetadata.rules, [ruleKey]: !newMetadata.rules?.[ruleKey] }
    
    const { error } = await supabase.from('cups').update({ metadata: newMetadata }).eq('id', mission.id)
    if (!error) {
      setMissions(prev => prev.map(m => m.id === mission.id ? { ...m, metadata: newMetadata } : m))
      showToast(isRTL ? 'تم تحديث القاعدة!' : 'RULE UPDATED', 'success')
      playDeploy()
    } else {
      showToast(isRTL ? 'فشل التحديث!' : 'UPDATE FAILED', 'warning')
      playError()
    }
  }

  // Close all modals event listener from global Shell ESC matrix
  useEffect(() => {
    const handleCloseAll = () => {
      setShowCreate(false)
      setShowGuide(false)
      setShowWarningModal(false)
      setAttachmentMissionId(null)
      setActiveAttachments([])
      setDefaultView('list')
      setActiveRulesGoalId(null)
      setShowJoinGoal(false)
    }
    window.addEventListener('close-all-modals', handleCloseAll)
    return () => window.removeEventListener('close-all-modals', handleCloseAll)
  }, [])

  async function fetchMissions() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      if (typeof window !== 'undefined') {
        const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
        setMissions(guestGoals)
      }
      setLoading(false)
      return
    }

    // Fetch goals where user is a squad member
    const { data: memberRows } = await supabase
      .from('goal_members')
      .select('goal_id')
      .eq('user_id', user.id)
    const memberGoalIds = memberRows ? memberRows.map(r => r.goal_id) : []

    let query = supabase
      .from('cups')
      .select('*, tasks(*)')
      .eq('is_archived', false)
      .order('created_at', { ascending: false })

    if (memberGoalIds.length > 0) {
      const idList = memberGoalIds.join(',')
      query = query.or(`user_id.eq.${user.id},id.in.(${idList})`)
    } else {
      query = query.eq('user_id', user.id)
    }

    if (typeFilter === 'solo') query = query.eq('metadata->>type', 'solo')
    if (typeFilter === 'squad') query = query.eq('metadata->>type', 'squad')

    const { data } = await query
    if (data) {
      setMissions(data)
      fetchAllAttachmentCounts(user.id, data.map((m: any) => m.id))
      
      const squadGoals = data.filter(m => m.metadata?.type === 'squad')
      if (squadGoals.length > 0) {
        const squadGoalIds = squadGoals.map(m => m.id)
        
        // Fetch squad members and map them (exclude blocked)
        const { data: members } = await supabase
          .from('goal_members')
          .select('*, profiles(*)')
          .in('goal_id', squadGoalIds)
        
        if (members) {
          const map: Record<string, any[]> = {}
          members.forEach(m => {
            if (m.profiles && !m.profiles.blocked) {
              if (!map[m.goal_id]) map[m.goal_id] = []
              map[m.goal_id].push({ ...m.profiles, role: m.role })
            }
          })
          setGoalMembersMap(map)
        }

        // Fetch active today distinct user logs in time_logs
        const todayMidnight = new Date()
        todayMidnight.setUTCHours(0, 0, 0, 0)
        const { data: activeLogs } = await supabase
          .from('time_logs')
          .select('cup_id, user_id')
          .in('cup_id', squadGoalIds)
          .gte('started_at', todayMidnight.toISOString())

        if (activeLogs) {
          const activeMap: Record<string, Set<string>> = {}
          activeLogs.forEach(log => {
            if (!activeMap[log.cup_id]) activeMap[log.cup_id] = new Set()
            activeMap[log.cup_id].add(log.user_id)
          })
          const activeCounts: Record<string, number> = {}
          Object.keys(activeMap).forEach(cupId => {
            activeCounts[cupId] = activeMap[cupId].size
          })
          setGoalActiveTodayMap(activeCounts)
        }
      }
    }
    setLoading(false)
  }

  const allTasks = useMemo(() => {
    const list: any[] = []
    missions.forEach(m => {
      if (m.tasks) {
        m.tasks.forEach((t: any) => {
          list.push({ ...t, missionTitle: m.title, missionColor: m.color || currentTheme.color })
        })
      }
    })
    return list
  }, [missions, currentTheme.color])

  const filteredTasks = useMemo(() => {
    if (activeTab === 'ALL') return allTasks
    return allTasks.filter(t => t.cup_id === activeTab)
  }, [allTasks, activeTab])

  async function toggleTask(task: any) {
    const updatedStatus = !task.is_completed
    setMissions(prev => prev.map(m => ({
      ...m,
      tasks: m.tasks?.map((t: any) => t.id === task.id ? { ...t, is_completed: updatedStatus } : t)
    })))

    // Support guest goals locally
    if (task.cup_id?.startsWith('local_')) {
      const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
      const updatedGoals = guestGoals.map((m: any) => {
        if (m.id === task.cup_id) {
          return {
            ...m,
            tasks: m.tasks?.map((t: any) => t.id === task.id ? { ...t, is_completed: updatedStatus } : t)
          }
        }
        return m
      })
      localStorage.setItem('guest_goals', JSON.stringify(updatedGoals))
      return
    }

    const { error } = await supabase.from('tasks').update({ is_completed: updatedStatus }).eq('id', task.id)
    if (error) {
      fetchMissions()
    } else {
      const mission = missions.find(m => m.id === task.cup_id)
      if (mission && mission.tasks) {
        const taskIndex = mission.tasks.findIndex((t: any) => t.id === task.id)
        if (taskIndex !== -1) {
          const sizeStr = mission.size?.toLowerCase() || 'md'
          let xpCeiling = 8
          if (sizeStr === 'sm' || sizeStr === 's' || sizeStr === 'small') xpCeiling = 4
          else if (sizeStr === 'lg' || sizeStr === 'l' || sizeStr === 'large') xpCeiling = 20

          if (taskIndex < xpCeiling) {
            await addXp(updatedStatus ? ((Number(task.weight) || 3) * 10) : -((Number(task.weight) || 3) * 10))
          }
        }
      }

      if (updatedStatus) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('task_completion_log').insert([{
            user_id: user.id,
            task_id: task.id,
            cup_id: task.cup_id,
            completed_at: new Date().toISOString()
          }])
        }
      }
    }
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
    if (isSubmitting) return
    setIsSubmitting(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const titleToCheck = newTitle.trim()
      if (!titleToCheck) {
        showToast(isRTL ? 'يجب إدخال اسم للهدف' : 'Goal title is required', 'warning')
        playError()
        return
      }

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

      // Guest Flow Support
      if (!user) {
        const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
        if (guestGoals.length >= 1) {
          setShowAuthModal(true)
          playError()
          setIsSubmitting(false)
          return
        }

        const fakeId = 'local_' + Math.random().toString(36).substring(2, 9)
        const newLocalGoal = {
          id: fakeId,
          user_id: 'guest',
          title: titleToCheck,
          status: 'active',
          size: newSize,
          is_archived: false,
          sync_to_dashboard: syncOnCreate,
          start_date: startDate || null,
          end_date: endDate || null,
          created_at: new Date().toISOString(),
          tasks: [],
          metadata: { defaultView }
        }

        const updated = [newLocalGoal, ...guestGoals]
        localStorage.setItem('guest_goals', JSON.stringify(updated))
        setMissions(updated)
        
        setShowCreate(false)
        setShowWarningModal(false)
        setNewTitle('')
        setNewSize('md')
        setStartDate('')
        setEndDate('')
        setDefaultView('list')
        showToast(isRTL ? 'تم حفظ الهدف محلياً' : 'Goal saved locally!', 'success')
        playDeploy()
        router.push(`/goals/squad/${fakeId}`)
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
            : `FOCUS CAPACITY FULL (${usedSlots.toFixed(1).replace('.0','')}/9 SLOTS) — Complete or un-equip existing goals.`,
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

      const metadataPayload: any = {
        defaultView,
        type: typeFilter || 'solo'
      }
      if (typeFilter === 'squad') {
        metadataPayload.invite_code = Math.random().toString(36).substring(2, 8).toUpperCase()
        metadataPayload.rules = {
          no_date_changes: false,
          xp_multiplier: false,
          no_delete: false
        }
      }
      const insertData: any = {
        user_id: user.id,
        title: titleToCheck,
        status: 'active',
        size: newSize,
        is_archived: false,
        sync_to_dashboard: syncOnCreate,
        metadata: metadataPayload
      }
    if (startDate) insertData.start_date = startDate
    if (endDate) insertData.end_date = endDate

      const { data, error } = await supabase.from('cups').insert(insertData).select().single()
      
      if (data) {
        if (typeFilter === 'squad') {
          await supabase.from('goal_members').insert({
            goal_id: data.id,
            user_id: user.id,
            role: 'owner'
          })
        }
        setMissions([data, ...missions])
        setShowCreate(false)
        setShowWarningModal(false)
        setNewTitle('')
        setNewSize('md')
        setStartDate('')
        setEndDate('')
        setDefaultView('list')
        showToast(isRTL ? 'تم إنشاء الهدف' : 'Goal activated!', 'success')
        playDeploy()
        router.push(`/goals/squad/${data.id}`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const commandingMissions = missions.filter(m => {
    const role = getUserRole(m)
    return role === 'OWNER' || role === 'CO-ADMIN'
  })

  const assignedMissions = missions.filter(m => {
    const role = getUserRole(m)
    return role === 'MEMBER'
  })

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
              <h1 className="text-4xl md:text-6xl font-black font-space tracking-wider uppercase not- text-black dark:text-white leading-none">
                {typeFilter === 'solo' ? (
                  <>{isRTL ? 'مهمات' : 'SOLO'}<span style={{ color: currentTheme.color }}>{isRTL ? ' فردية' : '_MISSIONS'}</span></>
                ) : typeFilter === 'squad' ? (
                  <>{isRTL ? 'عمليات' : 'SQUAD'}<span style={{ color: currentTheme.color }}>{isRTL ? ' الفريق' : '_OPS'}</span></>
                ) : (
                  <>{isRTL ? 'لوحة' : 'GOAL'}<span style={{ color: currentTheme.color }}>{isRTL ? ' الأهداف' : '_CANVAS'}</span></>
                )}
              </h1>
              <button onClick={() => setShowGuide(true)} className="material-symbols-outlined text-[var(--text-secondary)]/40 hover:text-[var(--text-secondary)] transition-colors duration-300 text-xl" title="Guide">
                info
              </button>
            </div>
            <p className={cn("text-[11px] font-space tracking-[0.35em] uppercase font-bold", isRTL ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]")}>
               {typeFilter === 'solo' ? (
                 <>{isRTL ? 'أهداف شخصية نشطة' : 'PERSONAL GOALS'} &nbsp;·&nbsp; {missions.length} {isRTL ? 'نشط' : 'ACTIVE'}</>
               ) : typeFilter === 'squad' ? (
                 <>{isRTL ? 'أهداف تعاونية نشطة' : 'COLLABORATIVE GOALS'} &nbsp;·&nbsp; {missions.length} {isRTL ? 'نشط' : 'ACTIVE'}</>
               ) : (
                 <>{isRTL ? 'الأهداف الأساسية النشطة' : 'Active Goals'} &nbsp;·&nbsp; {missions.length} {isRTL ? 'هدف نشط' : 'total'}</>
               )}
            </p>
          </div>
          
          {typeFilter === 'squad' ? (
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <button
                onClick={() => { playBlip(); setShowJoinGoal(true); }}
                className="flex flex-row items-center justify-center gap-2 w-full md:w-auto h-11 px-6 rounded-sm border border-teal-500/50 hover:border-teal-400 text-teal-400 hover:text-teal-300 bg-teal-500/5 hover:bg-teal-500/10 font-space text-xs font-black uppercase tracking-widest transition-all duration-300 active:scale-95 shadow-lg cursor-pointer animate-pulse"
              >
                <span className="material-symbols-outlined text-[16px] leading-none">link</span>
                {isRTL ? 'الانضمام لهدف' : 'JOIN GOAL'}
              </button>
              <button
                onClick={() => { playBlip(); setShowCreate(true); }}
                className="flex flex-row items-center justify-center gap-2 w-full md:w-auto h-11 px-6 rounded-sm font-space text-xs font-black uppercase tracking-widest transition-all duration-300 hover:brightness-110 active:scale-95 shadow-lg"
                style={{ backgroundColor: currentTheme.color, color: '#000', boxShadow: `0 4px 20px ${currentTheme.color}33` }}
              >
                <span className="material-symbols-outlined text-[16px] leading-none">add</span>
                {isRTL ? 'إنشاء هدف فريق' : 'CREATE SQUAD GOAL'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => { playBlip(); setShowCreate(true); }}
              className="flex flex-row items-center justify-center gap-2 w-full md:w-auto h-11 px-6 rounded-sm font-space text-xs font-black uppercase tracking-widest transition-all duration-300 hover:brightness-110 active:scale-95 shadow-lg"
              style={{ backgroundColor: currentTheme.color, color: '#000', boxShadow: `0 4px 20px ${currentTheme.color}33` }}
            >
              <span className="material-symbols-outlined text-[16px] leading-none">add</span>
              {typeFilter === 'solo' ? (isRTL ? 'إنشاء هدف فردي' : 'CREATE GOAL') : (isRTL ? 'إنشاء هدف' : 'Create Goal')}
            </button>
          )}
        </header>

        {/* Command Bar for Solo and Squad Views */}
        {typeFilter && (
          <div className="w-full h-12 bg-white/5 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/80 rounded-xl px-4 flex items-center justify-between backdrop-blur-md shadow-sm">
            {/* Left side: Rank Badge */}
            <div className="flex items-center gap-2 border border-amber-500/20 bg-amber-500/5 px-3 py-1 rounded-lg">
              <span className="material-symbols-outlined text-xs text-amber-500 animate-pulse">bolt</span>
              <span className="text-[10px] font-space font-black text-amber-500 uppercase tracking-widest select-none">
                {profile?.rank || 'SILVER'} • {profile?.xp || 0} XP
              </span>
            </div>
            
            {/* Right side: JOIN SQUAD button only for solo goal view */}
            {typeFilter === 'solo' && (
              <button
                onClick={() => { playBlip(); setShowJoinGoal(true); }}
                className="flex items-center gap-1.5 px-3 h-8 border border-teal-500/40 hover:border-teal-400 text-teal-400 hover:text-teal-300 bg-teal-500/5 hover:bg-teal-500/10 rounded-lg font-space text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">link</span>
                {isRTL ? 'الانضمام للفريق' : 'JOIN A SQUAD GOAL'}
              </button>
            )}
          </div>
        )}

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
                className="w-[calc(100%-2rem)] mx-auto md:max-w-2xl bg-[var(--card-bg)]/90 backdrop-blur-xl border border-[var(--card-border)] p-5 md:p-8 space-y-6 rounded-2xl shadow-2xl my-auto max-h-[90vh] overflow-y-auto relative"
              >
                <button 
                  onClick={() => setShowGuide(false)} 
                  className="absolute top-4 right-4 rtl:left-4 rtl:right-auto material-symbols-outlined text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  close
                </button>
                <div className="space-y-4">
                  {isRTL ? (
                    <div className="space-y-2 border-r-4 pr-4 border-l-0 rtl:border-l-0 rtl:border-r-4 text-right" style={{ borderColor: currentTheme.color }}>
                      <p className="text-xl md:text-2xl lg:text-3xl font-black text-[var(--text-primary)] mb-3 leading-snug">
                        مرحباً بك في منصتك الشخصية لإدارة الأهداف والإنتاجية. هذا النظام مصمم لمساعدتك على تنظيم يومك وبناء عادات مستدامة.
                      </p>
                      <ol className="list-decimal list-inside space-y-2 text-sm md:text-base text-[var(--text-primary)]/80 font-bold">
                        <li><span style={{ color: currentTheme.color }}>سعة التركيز (Focus Capacity):</span> تدعم واجهة العمل بحد أقصى 9 مهام نشطة في نفس الوقت لضمان تركيزك الكامل وتجنب تشتت الانتباه.</li>
                        <li><span style={{ color: currentTheme.color }}>نقاط الإنجاز (XP System):</span> إكمال المهام يمنحك نقاط خبرة لتوثيق حجم مجهودك ومراقبة تزايد معدل إنتاجيتك بشكل ملموس.</li>
                        <li><span style={{ color: currentTheme.color }}>مؤشر الالتزام:</span> التراجع عن متابعة أهدافك اليومية أو التكاسل لفترات طويلة يؤدي إلى انخفاض نقاطك تدريجياً، لتنبيهك بضرورة العودة للمسار الصحيح.</li>
                      </ol>
                    </div>
                  ) : (
                    <div className="space-y-2 border-l-4 pl-4 rtl:pl-0 rtl:pr-4 rtl:border-l-0 rtl:border-r-4 text-left" style={{ borderColor: currentTheme.color }}>
                      <p className="text-lg md:text-xl lg:text-2xl font-black font-space text-[var(--text-primary)] uppercase tracking-tighter mb-3">
                        "Welcome, Soldier. This is your Tactical Life OS."
                      </p>
                      <ol className="list-decimal list-inside space-y-2 text-sm md:text-base text-[var(--text-primary)]/80 font-bold font-space">
                        <li><span className="uppercase tracking-widest" style={{ color: currentTheme.color }}>Grid Slots:</span> Your HUD has 9 slots total. Small = 1, Medium = 1.5, Large = 3.</li>
                        <li><span className="uppercase tracking-widest" style={{ color: currentTheme.color }}>XP Logic:</span> 1 Task Bar = 10 XP. Large goals give +50 XP bonus.</li>
                        <li><span className="uppercase tracking-widest" style={{ color: currentTheme.color }}>The Penalties:</span> Delay costs -5 XP/day. Inactivity for 7 days costs -10 XP.</li>
                      </ol>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
                className="w-[calc(100%-2rem)] mx-auto md:max-w-xl bg-zinc-950/90 border border-white/10 backdrop-blur-md p-5 md:p-8 space-y-6 rounded-2xl shadow-2xl my-auto max-h-[90vh] overflow-y-auto"
              >
                <div className="flex flex-col gap-1.5">
                  <h2 className="text-xl md:text-2xl font-space font-black uppercase text-black dark:text-white tracking-tighter">
                    {typeFilter === 'squad'
                      ? (isRTL ? 'إنشاء هدف فريق' : 'CREATE SQUAD GOAL')
                      : (isRTL ? 'إنشاء هدف جديد' : 'Create New Goal')}
                  </h2>
                  {typeFilter === 'squad' && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-500/10 border border-teal-500/25 rounded-md self-start">
                      <span className="text-[10px] font-space font-black text-teal-400 uppercase tracking-widest">
                        ⚔ SQUAD GOAL — Collaborative
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs md:text-sm font-space tracking-widest uppercase font-black" style={{ color: currentTheme.color }}>{isRTL ? 'عنوان الهدف' : 'Goal Title'}</label>
                  <input
                    autoFocus
                    value={newTitle}
                    placeholder={isRTL ? 'اسم هدفك...' : 'Name your goal...'}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full bg-zinc-900/50 border border-white/10 py-2.5 px-4 rounded-xl font-space text-base font-black text-white outline-none transition-all placeholder:text-zinc-500"
                    onFocus={e => e.currentTarget.style.borderColor = currentTheme.color}
                    onBlur={e => e.currentTarget.style.borderColor = ''}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs md:text-sm font-space tracking-widest uppercase font-black" style={{ color: currentTheme.color }}>{isRTL ? 'حجم الهدف' : 'Goal Size'}</label>
                    <div className="group relative flex items-center cursor-help">
                      <span className="material-symbols-outlined text-sm transition-colors group-hover:text-white">info</span>
                      <div className="pointer-events-none absolute bottom-full mb-2 w-64 md:w-80 rounded-xl bg-zinc-900 border border-white/10 p-3 md:p-4 text-xs md:text-sm text-zinc-200 shadow-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-[300]">
                        {isRTL 
                          ? "حجم الهدف يحدد سعة الـ Slots المستهلكة في لوحة القيادة، وسقف نقاط الـ XP المكتسبة (Small: 4 مهام، Medium: 8 مهام، Large: 20 مهمة). يمكنك إضافة مهام إضافية بعد السقف للتنظيم فقط."
                          : "Goal size determines Focus Slots consumed on the dashboard and the XP reward ceiling (Small: 4 tasks, Medium: 8 tasks, Large: 20 tasks). Extra tasks can be added freely for organization."}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {SIZES.map(s => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => { playBlip(); setNewSize(s.key); }}
                        className={cn(
                          "p-3 border flex items-center justify-center gap-2 transition-all rounded-xl cursor-pointer text-sm font-bold uppercase tracking-wider",
                          newSize === s.key 
                            ? "text-black border-transparent shadow-lg" 
                            : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white bg-black/20"
                        )}
                        style={newSize === s.key ? { backgroundColor: currentTheme.color, borderColor: currentTheme.color, boxShadow: `0 0 15px ${currentTheme.color}55` } : {}}
                        onMouseEnter={e => { if (newSize !== s.key) e.currentTarget.style.borderColor = `${currentTheme.color}60` }}
                        onMouseLeave={e => { if (newSize !== s.key) e.currentTarget.style.borderColor = '' }}
                      >
                        <span className="material-symbols-outlined text-base md:text-lg">{s.icon}</span>
                        <span className="text-xs md:text-sm font-space font-black uppercase tracking-tighter">{isRTL ? (s.key === 'lg' ? 'كبيرة' : s.key === 'md' ? 'متوسطة' : 'صغيرة') : (s.key === 'lg' ? 'Large' : s.key === 'md' ? 'Medium' : 'Small')}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs md:text-sm font-space tracking-widest uppercase font-black" style={{ color: currentTheme.color }}>
                    {isRTL ? 'طريقة العرض الافتراضية' : 'DEFAULT LAYOUT'}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => { playBlip(); setDefaultView('list'); }}
                      className={cn(
                        "p-3 border flex items-center justify-center gap-2.5 transition-all rounded-xl cursor-pointer text-sm font-black uppercase tracking-wider",
                        defaultView === 'list'
                          ? "text-black border-transparent shadow-lg"
                          : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white bg-black/20"
                      )}
                      style={defaultView === 'list' ? { backgroundColor: currentTheme.color, borderColor: currentTheme.color, boxShadow: `0 0 15px ${currentTheme.color}55` } : {}}
                      onMouseEnter={e => { if (defaultView !== 'list') e.currentTarget.style.borderColor = `${currentTheme.color}60` }}
                      onMouseLeave={e => { if (defaultView !== 'list') e.currentTarget.style.borderColor = '' }}
                    >
                      <span className="material-symbols-outlined text-base md:text-lg">list</span>
                      <span className="text-xs md:text-sm font-space font-black uppercase tracking-tighter">
                        {isRTL ? 'قائمة (المناهج)' : 'List View'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { playBlip(); setDefaultView('board'); }}
                      className={cn(
                        "p-3 border flex items-center justify-center gap-2.5 transition-all rounded-xl cursor-pointer text-sm font-black uppercase tracking-wider",
                        defaultView === 'board'
                          ? "text-black border-transparent shadow-lg"
                          : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white bg-black/20"
                      )}
                      style={defaultView === 'board' ? { backgroundColor: currentTheme.color, borderColor: currentTheme.color, boxShadow: `0 0 15px ${currentTheme.color}55` } : {}}
                      onMouseEnter={e => { if (defaultView !== 'board') e.currentTarget.style.borderColor = `${currentTheme.color}60` }}
                      onMouseLeave={e => { if (defaultView !== 'board') e.currentTarget.style.borderColor = '' }}
                    >
                      <span className="material-symbols-outlined text-base md:text-lg">view_kanban</span>
                      <span className="text-xs md:text-sm font-space font-black uppercase tracking-tighter">
                        {isRTL ? 'لوحة (المشاريع)' : 'Board View'}
                      </span>
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-medium tracking-wide leading-normal">
                    {isRTL 
                      ? "قائمة: تناسب المسارات التعليمية والخطوات المنهجية. لوحة: تناسب المشاريع والمهام التفاعلية."
                      : "List View: Perfect for courses, syllabi and sequential steps. Board View: Ideal for interactive projects and kanban tasks."}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-space tracking-widest uppercase font-black" style={{ color: currentTheme.color }}>
                      {t('start_date')}
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full bg-zinc-900/50 border border-white/10 py-2.5 px-4 font-space text-base font-black text-white outline-none transition-all uppercase rounded-xl date-input-tactical"
                      style={{ colorScheme: 'dark' }}
                      onFocus={e => e.currentTarget.style.borderColor = currentTheme.color}
                      onBlur={e => e.currentTarget.style.borderColor = ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-space tracking-widest uppercase font-black" style={{ color: currentTheme.color }}>
                      {t('end_date')}
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full bg-zinc-900/50 border border-white/10 py-2.5 px-4 font-space text-base font-black text-white outline-none transition-all uppercase rounded-xl date-input-tactical"
                      style={{ colorScheme: 'dark' }}
                      onFocus={e => e.currentTarget.style.borderColor = currentTheme.color}
                      onBlur={e => e.currentTarget.style.borderColor = ''}
                    />
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                  <div className="space-y-2 flex-1">
                     <label className="text-xs md:text-sm font-space tracking-widest uppercase font-black" style={{ color: currentTheme.color }}>{isRTL ? 'عرض في اللوحة' : 'Show on Dashboard'}</label>
                     <button 
                       type="button"
                       onClick={() => { playBlip(); setSyncOnCreate(!syncOnCreate); }}
                       className="w-full py-2.5 px-4 border font-space text-base font-black uppercase tracking-widest transition-all duration-300 rounded-xl flex items-center justify-between gap-4 cursor-pointer"
                       style={syncOnCreate ? {
                         backgroundColor: currentTheme.color,
                         borderColor: currentTheme.color,
                         color: '#000',
                         boxShadow: `0 0 18px ${currentTheme.color}55`
                       } : {
                         backgroundColor: 'transparent',
                         borderColor: 'white/10',
                         color: 'var(--text-secondary)'
                       }}
                     >
                       <span className="flex items-center gap-3">
                         <span className="material-symbols-outlined text-xl">
                           hub
                         </span>
                         {syncOnCreate
                           ? (isRTL ? 'مرئي في اللوحة' : 'SHOW ON DASHBOARD')
                           : (isRTL ? 'مخفي من اللوحة' : 'STAY OFF-GRID')}
                       </span>
                       <span
                         className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full border transition-all duration-300"
                         style={syncOnCreate ? {
                           backgroundColor: 'rgba(0,0,0,0.25)',
                           borderColor: 'rgba(0,0,0,0.2)',
                           color: '#000'
                         } : {
                           backgroundColor: 'transparent',
                           borderColor: 'white/10',
                           color: 'var(--text-secondary)'
                         }}
                       >
                         {syncOnCreate ? 'ON' : 'OFF'}
                       </span>
                     </button>
                  </div>
                </div>

                <div className="flex justify-end gap-6 pt-4 border-t border-white/10">
                  <button onClick={() => { setShowCreate(false); setDefaultView('list'); }} className="px-6 py-4 border border-white/10 rounded-xl text-zinc-400 font-space text-base uppercase tracking-widest hover:text-white hover:border-white/20 transition-all font-black cursor-pointer">{isRTL ? 'إلغاء' : 'Cancel'}</button>
                  <button 
                    onClick={() => addMission()} 
                    disabled={isSubmitting}
                    className={cn(
                      "px-10 py-4 font-space font-black text-base uppercase tracking-widest shadow-lg rounded-xl transition-all hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer",
                      isSubmitting && "opacity-50 cursor-not-allowed"
                    )}
                    style={{ backgroundColor: currentTheme.color, color: '#000', boxShadow: `0 0 20px ${currentTheme.color}4d` }}
                  >
                    {isSubmitting && <span className="material-symbols-outlined animate-spin text-sm">refresh</span>}
                    {isRTL ? 'تفعيل' : 'Activate'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {!typeFilter && (
          <div className="w-full bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 md:p-8 space-y-6 shadow-md transition-all duration-300 hover:shadow-[0_0_0_1px_rgba(161,161,170,0.3)] backdrop-blur-md">
            <div className="flex flex-row justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-2xl text-zinc-500" style={{ color: currentTheme.color }}>task</span>
                <h2 className="text-xl font-space font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                  {isRTL ? 'مهامي' : 'My Tasks'}
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-space font-black">
                {allTasks.length} {isRTL ? 'مهام' : 'tasks'}
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                onClick={() => setActiveTab('ALL')}
                className={cn(
                  "px-4 py-2 rounded-xl border font-space font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap shrink-0 cursor-pointer",
                  activeTab === 'ALL'
                    ? "bg-zinc-200/60 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 shadow-sm"
                    : "border-transparent text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                )}
                style={activeTab === 'ALL' ? { borderColor: currentTheme.color } : undefined}
              >
                {isRTL ? 'جميع المهام' : 'ALL TASKS'} ({allTasks.length})
              </button>
              {missions.map(m => (
                <button
                  key={m.id}
                  onClick={() => setActiveTab(m.id)}
                  className={cn(
                    "px-4 py-2 rounded-xl border font-space font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap shrink-0 cursor-pointer max-w-[200px] truncate",
                    activeTab === m.id
                      ? "bg-zinc-200/60 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 shadow-sm"
                      : "border-transparent text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                  )}
                  style={activeTab === m.id ? { borderColor: (m.color || currentTheme.color) } : undefined}
                >
                  {m.title}
                </button>
              ))}
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-2">
              {filteredTasks.map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border transition-all duration-300 group",
                    "bg-white/50 dark:bg-zinc-950/20 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700/80",
                    task.is_completed ? "opacity-60" : ""
                  )}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <button
                      onClick={() => toggleTask(task)}
                      className={cn(
                        "w-6 h-6 rounded-lg border flex items-center justify-center transition-all duration-300 shrink-0 cursor-pointer shadow-sm",
                        task.is_completed 
                          ? "text-white" 
                          : "border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500 bg-transparent"
                      )}
                      style={task.is_completed ? { backgroundColor: task.missionColor, borderColor: task.missionColor } : {}}
                    >
                      {task.is_completed && <span className="material-symbols-outlined text-sm font-black">check</span>}
                    </button>

                    <div className="space-y-1 truncate flex-1">
                      <p className={cn(
                        "text-sm font-space font-bold text-zinc-900 dark:text-zinc-100 truncate transition-all duration-300",
                        task.is_completed ? "line-through text-zinc-400 dark:text-zinc-500" : ""
                      )}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: task.missionColor }} />
                        <span className="text-[10px] font-space text-zinc-500 dark:text-zinc-400 uppercase tracking-wider truncate">
                          {task.missionTitle}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-[10px] font-space font-black tracking-widest uppercase text-zinc-500 dark:text-zinc-400 shrink-0 ml-4">
                    {task.weight || 3} {isRTL ? 'نقطة' : 'XP'}
                  </span>
                </motion.div>
              ))}

              {filteredTasks.length === 0 && (
                <div className="py-16 text-center space-y-3">
                  <span className="material-symbols-outlined text-4xl text-zinc-300 dark:text-white/20">task</span>
                  <p className="text-sm font-space text-zinc-500 dark:text-white/40">
                    {isRTL ? 'لا توجد مهام في هذه القائمة.' : 'No tasks in this view.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="w-full">
          {typeFilter === 'squad' ? (
            <div className="space-y-10 w-full">
              {/* COMMANDING SECTION */}
              <div>
                <h2 className="text-xl font-bold text-teal-400 mb-4">COMMANDING</h2>
                {commandingMissions.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                    <p className="text-[10px] font-space font-black tracking-widest text-zinc-500 uppercase">
                      {isRTL ? 'لا توجد أهداف تقودها حالياً' : 'NO COMMANDING SQUAD GOALS'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <AnimatePresence mode='popLayout'>
                      {commandingMissions.map((m, idx) => renderMissionCard(m, idx))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* ASSIGNED SECTION */}
              <div>
                <h2 className="text-xl font-bold text-zinc-400 mb-4 mt-8">ASSIGNED</h2>
                {assignedMissions.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                    <p className="text-[10px] font-space font-black tracking-widest text-zinc-500 uppercase">
                      {isRTL ? 'لا توجد أهداف معينة لك حالياً' : 'NO ASSIGNED SQUAD GOALS'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <AnimatePresence mode='popLayout'>
                      {assignedMissions.map((m, idx) => renderMissionCard(m, idx))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <AnimatePresence mode='popLayout'>
                {missions.map((mission, idx) => renderMissionCard(mission, idx))}
              </AnimatePresence>
            </div>
          )}

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
                className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-white/90 dark:bg-black/85 backdrop-blur-md"
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
                          : 'Multiple cognitive focus slots are active, or critical goals are near their deadline. Adding a new goal will degrade execution quality.'}
                      </p>
                      
                      <div className="p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl space-y-2">
                        {warningSlots >= 7 && (
                          <div className="flex justify-between items-center text-[10px] uppercase font-bold text-[var(--text-secondary)] font-space">
                            <span>{isRTL ? 'سعة التركيز النشطة:' : 'Active Focus Capacity:'}</span>
                            <span className="text-[#FF0055] font-black">{warningSlots.toFixed(1).replace('.0','')}/9 Slots ({(warningSlots/9 * 100).toFixed(0)}%)</span>
                          </div>
                        )}
                        {warningCriticalCount > 0 && (
                          <div className="flex justify-between items-center text-[10px] uppercase font-bold text-[var(--text-secondary)] font-space">
                            <span>{isRTL ? 'المهام الحرجة القريبة:' : 'Critical Near-Deadline Goals:'}</span>
                            <span className="text-[#FF0055] font-black">{warningCriticalCount} {isRTL ? 'مهام' : 'Goals'}</span>
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
                        className="flex-1 py-2.5 bg-[#FF0055]/10 text-[#FF0055] border border-[#FF0055]/30 hover:bg-[#FF0055]/20 font-space font-black text-xs uppercase tracking-widest transition-all rounded-xl"
                      >
                        {isRTL ? 'استبدال المهمة' : 'FORCE SWAP'}
                      </button>
                      <button
                        onClick={() => {
                          playBlip();
                          setShowWarningModal(false);
                        }}
                        className="flex-1 py-2.5 text-black font-space font-black text-xs uppercase tracking-widest transition-all shadow-lg rounded-xl"
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
            <div className="col-span-full py-24 flex flex-col items-center justify-center text-center space-y-6">
              {typeFilter === 'solo' ? (
                <>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black font-space tracking-widest text-zinc-400 dark:text-zinc-500 uppercase">
                      NO SOLO GOALS YET
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-600 text-sm font-space">
                      Create your first personal goal to begin
                    </p>
                  </div>
                  <button
                    onClick={() => { playBlip(); setShowCreate(true); }}
                    className="flex flex-row items-center justify-center gap-2 h-11 px-6 rounded-sm font-space text-xs font-black uppercase tracking-widest transition-all duration-300 hover:brightness-110 active:scale-95 shadow-lg cursor-pointer"
                    style={{ backgroundColor: currentTheme.color, color: '#000', boxShadow: `0 4px 20px ${currentTheme.color}33` }}
                  >
                    <span className="material-symbols-outlined text-[16px] leading-none">add</span>
                    CREATE GOAL
                  </button>
                </>
              ) : typeFilter === 'squad' ? (
                <>
                  <div className="space-y-2 flex flex-col items-center justify-center select-none">
                    <span className="material-symbols-outlined text-5xl text-zinc-600 dark:text-zinc-500 mb-2 animate-pulse">groups</span>
                    <h3 className="text-2xl font-black font-space tracking-widest text-zinc-400 dark:text-zinc-500 uppercase">
                      NO SQUAD GOALS YET
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-600 text-sm font-space">
                      Lead a squad or join one with an invite code
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={() => { playBlip(); setShowJoinGoal(true); }}
                      className="flex flex-row items-center justify-center gap-2 h-11 px-6 rounded-sm border border-teal-500/50 hover:border-teal-400 text-teal-400 hover:text-teal-300 bg-teal-500/5 hover:bg-teal-500/10 font-space text-xs font-black uppercase tracking-widest transition-all duration-300 active:scale-95 shadow-lg cursor-pointer animate-pulse"
                    >
                      <span className="material-symbols-outlined text-[16px] leading-none">link</span>
                      JOIN WITH CODE
                    </button>
                    <button
                      onClick={() => { playBlip(); setShowCreate(true); }}
                      className="flex flex-row items-center justify-center gap-2 h-11 px-6 rounded-sm font-space text-xs font-black uppercase tracking-widest transition-all duration-300 hover:brightness-110 active:scale-95 shadow-lg cursor-pointer"
                      style={{ backgroundColor: currentTheme.color, color: '#000', boxShadow: `0 4px 20px ${currentTheme.color}33` }}
                    >
                      <span className="material-symbols-outlined text-[16px] leading-none">add</span>
                      CREATE SQUAD GOAL
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-[var(--text-secondary)]/50 text-sm text-center font-space">
                  {isRTL ? 'لا توجد أهداف نشطة حالياً. استخدم لوحة الإنشاء بالأعلى للبدء.' : 'No active goals synced. Use the action panel above to initiate.'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* JOIN SQUAD GOAL MODAL (Part 4) */}
      <AnimatePresence>
        {showJoinGoal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-white/90 dark:bg-black/90 backdrop-blur-md p-4 overflow-y-auto"
            onClick={() => {
              setShowJoinGoal(false);
              setJoinStatus('idle');
              setJoinCodeInput('');
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className={cn(
                "w-[calc(100%-2rem)] mx-auto md:max-w-md bg-zinc-950/95 border backdrop-blur-md p-6 md:p-8 space-y-6 rounded-2xl shadow-2xl my-auto max-h-[90vh] overflow-y-auto relative text-left transition-all duration-300",
                joinStatus === 'invalid' ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]' :
                joinStatus === 'valid' ? 'border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]' :
                'border-teal-500/30'
              )}
            >
              <button 
                onClick={() => {
                  setShowJoinGoal(false);
                  setJoinStatus('idle');
                  setJoinCodeInput('');
                }} 
                className="absolute top-4 right-4 rtl:left-4 rtl:right-auto material-symbols-outlined text-[var(--text-secondary)] hover:text-white cursor-pointer"
              >
                close
              </button>

              <div className="space-y-6">
                <div className="flex items-center gap-3 text-teal-400">
                  <span className="material-symbols-outlined text-2xl animate-pulse">group_add</span>
                  <h2 className="text-xl font-space font-black uppercase tracking-widest">
                    {isRTL ? 'الانضمام للفريق' : 'JOIN_A_SQUAD'}
                  </h2>
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-space text-zinc-400 uppercase tracking-wider">
                    {isRTL ? 'أدخل رمز الدعوة أو رابط الهدف' : 'Enter an invite code or paste a goal link'}
                  </p>

                  <div className="space-y-2">
                    <input
                      value={joinCodeInput}
                      onChange={(e) => {
                        setJoinCodeInput(e.target.value);
                        if (joinStatus !== 'idle') setJoinStatus('idle');
                      }}
                      placeholder="PASTE CODE OR LINK HERE..."
                      className={cn(
                        "w-full bg-zinc-900/80 border text-center font-mono py-3 px-4 rounded-xl text-sm tracking-widest uppercase outline-none transition-all placeholder:text-zinc-600 placeholder:font-sans",
                        joinStatus === 'invalid' ? 'border-red-500 text-red-400 focus:border-red-400' :
                        joinStatus === 'valid' ? 'border-emerald-500 text-emerald-400 focus:border-emerald-400' :
                        'border-zinc-800 text-teal-400 focus:border-teal-500'
                      )}
                    />

                    {/* Status Message */}
                    {joinStatus === 'invalid' && (
                      <p className="text-[10px] font-space font-black text-red-500 uppercase tracking-widest text-center animate-bounce">
                        {joinErrorText}
                      </p>
                    )}
                    {joinStatus === 'valid' && (
                      <p className="text-[10px] font-space font-black text-emerald-400 uppercase tracking-widest text-center animate-pulse">
                        SQUAD FOUND: {scannedGoalName}
                      </p>
                    )}
                    {joinStatus === 'already_member' && (
                      <p className="text-[10px] font-space font-black text-amber-500 uppercase tracking-widest text-center">
                        YOU ARE ALREADY IN THIS SQUAD
                      </p>
                    )}
                    {joinStatus === 'success' && (
                      <p className="text-[10px] font-space font-black text-emerald-400 uppercase tracking-widest text-center animate-pulse">
                        {isRTL ? 'تم تقديم الطلب // بانتظار موافقة القائد' : 'REQUEST SUBMITTED // WAITING FOR APPROVAL'}
                      </p>
                    )}
                  </div>

                  {/* Main Scan/Confirm Button */}
                  {joinStatus === 'valid' ? (
                    <button
                      onClick={handleConfirmJoin}
                      className="w-full h-11 bg-emerald-500 hover:bg-emerald-400 text-black font-space font-black text-xs uppercase tracking-widest transition-all duration-300 rounded-sm cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-base">check_circle</span>
                      [ ✓ CONFIRM JOIN ]
                    </button>
                  ) : (
                    <button
                      onClick={handleScanCode}
                      disabled={joinStatus === 'scanning' || !joinCodeInput.trim()}
                      className={cn(
                        "w-full h-11 font-space font-black text-xs uppercase tracking-widest transition-all duration-300 rounded-sm cursor-pointer shadow-[0_0_15px_rgba(20,184,166,0.2)] flex items-center justify-center gap-1.5",
                        joinStatus === 'scanning' ? "bg-teal-900/50 text-teal-400 border border-teal-500/20" : "bg-teal-500 hover:bg-teal-400 text-black"
                      )}
                    >
                      {joinStatus === 'scanning' ? (
                        <>
                          <span className="material-symbols-outlined text-base animate-spin">sync</span>
                          SCANNING...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-base">bolt</span>
                          [ ⚡ JOIN NOW ]
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="flex items-center justify-center w-full gap-4">
                    <div className="h-[1px] bg-zinc-800 flex-1" />
                    <span className="text-[10px] font-space text-zinc-600 font-bold uppercase tracking-wider">— OR —</span>
                    <div className="h-[1px] bg-zinc-800 flex-1" />
                  </div>
                  <p className="text-[10px] font-space text-zinc-500 uppercase tracking-widest text-center select-none">
                    Ask someone to share their squad goal link
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Shell>
  )
}
