'use client'

import Shell from '@/components/layout/Shell'
import { NeonIcon } from '@/components/ui/NeonIcon'
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
/*
import { 
  Trophy, Medal, Award, Layers, Settings, Link as LinkIcon, Calendar, Paperclip, 
  ArrowRight, Search, Shield, Users, CheckCircle2, XCircle, Plus,
  HelpCircle, Eye, Info, List, Kanban, Loader2, Sparkles, Check, 
  AlertTriangle, FolderClosed, UserPlus, Users2, Network, X, BookOpen, 
  Settings2, Flame, SignalHigh, SignalMedium, SignalLow, LayoutDashboard, Circle, Zap
} from 'lucide-react'
*/
import { 
  Trophy, Medal, Award, Layers, Settings, Link as LinkIcon, Calendar, Paperclip, 
  ArrowRight, Search, Shield, Users, CheckCircle2, XCircle, Plus,
  HelpCircle, Eye, Info, List, Kanban, Loader2, Sparkles, Check, 
  AlertTriangle, FolderClosed, UserPlus, Users2, Network, X, BookOpen, 
  Settings2, Flame, SignalHigh, SignalMedium, SignalLow, LayoutDashboard, Circle, Zap, Target
} from 'lucide-react'


const SIZES = [
  { key: 'lg', label: 'LARGE GOAL',  desc: 'Macro Objective', icon: Flame },
  { key: 'md', label: 'MEDIUM GOAL', desc: 'Standard Focus',  icon: SignalMedium },
  { key: 'sm', label: 'SMALL GOAL',  desc: 'Micro Focus',     icon: SignalLow },
]

const renderSizeIcon = (key: string, className?: string, style?: any) => {
  const LucideIcon = key === 'lg' ? Flame : key === 'md' ? SignalMedium : SignalLow
  return <LucideIcon className={className} style={style} />
}


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
  const { playDeploy, playBlip, playError, playClick } = useSound()
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
  const [joinRoleInput, setJoinRoleInput] = useState<string | null>(null)
  
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
    const sizeIcon = mission.size || 'md'
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
          "group relative flex flex-row items-center justify-between bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--card-border)]/50 cursor-pointer transition-all rounded-md shadow-xl overflow-hidden",
          typeFilter === 'squad' && "border-l-4",
          "p-3"
        )}
        style={typeFilter === 'squad' ? { borderLeftColor: mission.color || color } : {}}
      >
        <div className="absolute top-0 inset-x-0 h-[2px]" style={{ backgroundColor: isInRedZone ? '#FF0055' : (mission.color || color) }} />

        {/* Left Section: Info and Controls */}
        <div className="flex flex-col flex-1 min-w-0 pr-3">
          <div className="flex items-center gap-2 flex-wrap">
            {renderSizeIcon(sizeIcon, "w-3.5 h-3.5 opacity-40 shrink-0", { color: isInRedZone ? '#FF0055' : (mission.color || color) })}
            <p className="text-[8px] font-space tracking-[0.3em] uppercase font-black opacity-40">
              {mission.sync_to_dashboard ? (isRTL ? 'نشط' : 'ACTIVE') : (isRTL ? 'استعداد' : 'STANDBY')}
            </p>
            {typeFilter === 'solo' && (
              <span className="text-[8px] font-space tracking-widest font-black uppercase text-zinc-500 opacity-60 bg-zinc-500/10 border border-zinc-500/20 px-1.5 py-0.5 rounded-md">
                ◆ SOLO
              </span>
            )}
            {typeFilter === 'squad' && (
              mission.user_id === profile?.id ? (
                <span className="text-[8px] font-space tracking-widest font-black uppercase text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-[0_0_8px_rgba(245,158,11,0.1)]">
                  👑 ADMIN
                </span>
              ) : (
                <span className="text-[8px] font-space tracking-widest font-black uppercase text-zinc-400 bg-zinc-400/10 border border-zinc-400/20 px-1.5 py-0.5 rounded-md">
                  MEMBER
                </span>
              )
            )}
          </div>

          <h3 className="text-base md:text-lg font-space font-black uppercase text-[var(--text-primary)] truncate mt-1">
            {mission.title}
          </h3>

          {typeFilter === 'squad' && (
            <div className="flex flex-col gap-1.5 my-1.5 py-1 border-y border-zinc-800/40 select-none">
              <div className="flex items-center justify-between flex-wrap gap-1.5">
                <div className="flex items-center -space-x-1.5">
                  {(goalMembersMap[mission.id] || []).slice(0, 4).map((member: any) => (
                    <div
                      key={member.id}
                      className={cn(
                        "w-5 h-5 rounded-full border bg-zinc-900 flex items-center justify-center text-[7px] font-space font-black uppercase text-white shadow-md relative overflow-hidden shrink-0",
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
                    <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[6px] font-space font-black text-teal-400 shadow-md shrink-0">
                      +{(goalMembersMap[mission.id] || []).length - 4}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[8px] font-space font-black text-zinc-400 uppercase tracking-wider">
                    {(goalMembersMap[mission.id] || []).length} MEMBER{((goalMembersMap[mission.id] || []).length !== 1) ? 'S' : ''}
                  </span>
                  <span className="text-zinc-600 text-[8px] font-space font-black">•</span>
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[8px] font-space font-black text-emerald-400 uppercase tracking-wider">
                      {goalActiveTodayMap[mission.id] || 0} ACTIVE
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap mt-1">
            <p className="text-[8px] font-space text-[var(--text-secondary)] uppercase font-black tracking-widest">
              {completedTasks}/{totalTasks} {isRTL ? 'المهام' : 'TASKS'}
            </p>
            {(mission.start_date || mission.end_date) && (
              <p className="text-[7px] font-space text-[var(--text-secondary)]/50 uppercase tracking-wider">
                {fmtDate(mission.start_date)} → {fmtDate(mission.end_date)}
              </p>
            )}
          </div>

          <div className="w-full h-[1.5px] bg-[var(--input-bg)] relative mt-2 mb-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              className="h-full absolute top-0 start-0"
              style={{ backgroundColor: isInRedZone ? '#FF0055' : (mission.color || color), boxShadow: `0 0 10px ${isInRedZone ? '#FF0055' : (mission.color || color)}` }}
            />
          </div>

          {/* Action Buttons inside Left Column */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {typeFilter === 'squad' && mission.metadata?.invite_code && (
              <button
                onClick={(e) => handleCopyInviteLink(e, mission.metadata.invite_code)}
                className="relative flex items-center justify-center w-6 h-6 border border-[var(--card-border)] hover:border-teal-400/50 hover:bg-teal-500/5 transition-all rounded-md shrink-0 cursor-pointer"
                title="COPY_INVITE_CODE"
              >
                <LinkIcon className="text-[10px] text-teal-400 w-3 h-3" />
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
              className="relative flex items-center justify-center w-6 h-6 border border-[var(--card-border)] transition-all rounded-md shrink-0 cursor-pointer"
              onMouseEnter={e => e.currentTarget.style.borderColor = `${(mission.color || color)}60`}
              onMouseLeave={e => e.currentTarget.style.borderColor = ''}
              title="ADD_TO_GOOGLE_CALENDAR"
            >
              <Calendar className="text-[10px] w-3 h-3" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                openAttachments(mission.id);
              }}
              className="relative flex items-center justify-center w-6 h-6 border border-[var(--card-border)] transition-all rounded-md shrink-0 cursor-pointer"
              onMouseEnter={e => e.currentTarget.style.borderColor = `${(mission.color || color)}60`}
              onMouseLeave={e => e.currentTarget.style.borderColor = ''}
              title="ATTACHMENTS"
              style={{
                borderColor: (attachmentCounts[mission.id] || 0) > 0 ? `${(mission.color || color)}44` : undefined,
                boxShadow: (attachmentCounts[mission.id] || 0) > 0 ? `0 0 10px ${(mission.color || color)}22` : undefined
              }}
            >
              <Paperclip className="text-[10px] w-3 h-3" style={{ 
                color: (attachmentCounts[mission.id] || 0) > 0 ? (mission.color || color) : 'inherit',
              }} />
              {(attachmentCounts[mission.id] || 0) > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 text-black text-[7px] font-black flex items-center justify-center rounded-full shadow-lg"
                  style={{ backgroundColor: (mission.color || color), boxShadow: `0 0 6px ${(mission.color || color)}` }}
                >
                  {attachmentCounts[mission.id]}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Right Section: Energy Cell & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex flex-col items-center">
            <EnergyCell
              percentage={percentage}
              color={isInRedZone ? '#FF0055' : (mission.color || color)}
              size="sm"
              isInRedZone={isInRedZone}
            />
          </div>

          <div className="flex flex-col items-center gap-2">
            {typeFilter === 'squad' && mission.user_id === profile?.id && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playBlip();
                    setActiveRulesGoalId(activeRulesGoalId === mission.id ? null : mission.id);
                  }}
                  className="text-[var(--text-secondary)] hover:text-white transition-colors p-1 flex items-center justify-center cursor-pointer shrink-0"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>

                <AnimatePresence>
                  {activeRulesGoalId === mission.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute right-0 top-full mt-2 w-64 bg-zinc-950/95 border border-zinc-800 rounded-md p-4 shadow-2xl backdrop-blur-md z-[150] space-y-3 font-space text-left"
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
            <ArrowRight className="w-4.5 h-4.5 text-[var(--text-secondary)]/35 group-hover:translate-x-1.5 rtl:group-hover:-translate-x-1.5 transition-transform shrink-0" />
          </div>
        </div>
      </motion.div>
    )
  }

  useEffect(() => { 
    if (mounted) {
      fetchMissions() 
      if (window.location.search.includes('create=true')) {
        const params = new URLSearchParams(window.location.search)
        const createTask = params.get('createTask')
        if (createTask) {
          setNewTitle(createTask)
        }
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
      const roleParam = params.get('role')
      if (joinParam) {
        setJoinCodeInput(joinParam.toUpperCase())
        if (roleParam) {
          setJoinRoleInput(roleParam.toLowerCase())
        }
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

    let active = true;
    let channel: any = null;

    const initRealtime = async () => {
      // Ensure the client has loaded its session and JWT token
      const { data: { session } } = await supabase.auth.getSession()
      if (!active) return

      if (session?.access_token) {
        console.log('🔐 REALTIME JWT LOADED, SETTING AUTH ON CLIENT');
        supabase.realtime.setAuth(session.access_token)
      } else {
        console.log('⚠️ REALTIME WARNING: NO ACTIVE SESSION JWT FOUND');
      }

      channel = supabase
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
          { event: '*', schema: 'public', table: 'squad_join_requests' },
          () => {
            fetchMissions()
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: '*' },
          (payload: any) => {
            console.log('🔥 GLOBAL CATCH-ALL PAYLOAD:', payload)
          }
        )
        .subscribe((status: string) => {
          console.log('📡 CHANNEL STATUS:', status)
        })
    };

    initRealtime();

    return () => {
      active = false;
      if (channel) {
        supabase.removeChannel(channel)
      }
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
        // Fetch goal ID to update the role on join request
        const { data: cupData } = await supabase
          .from('goals')
          .select('id')
          .eq('metadata->>invite_code', code)
          .single()
        
        if (cupData && joinRoleInput && ['admin', 'member', 'viewer', 'guest'].includes(joinRoleInput)) {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            await supabase
              .from('squad_join_requests')
              .update({ role: joinRoleInput })
              .eq('goal_id', cupData.id)
              .eq('user_id', user.id)
              .eq('status', 'pending')
          }
        }

        setJoinStatus('success')
        showToast(
          /* isRTL 
            ? 'تم إرسال طلب الانضمام // بانتظار موافقة القائد' 
            : 'JOIN REQUEST SUBMITTED // WAITING FOR OWNER APPROVAL', */
          isRTL 
            ? 'طلب الانضمام اتبعت // مستنيين موافقة القائد' 
            : 'JOIN REQUEST SUBMITTED // WAITING FOR OWNER APPROVAL',
          'success'
        )
        playDeploy()
        setTimeout(() => {
          setShowJoinGoal(false)
          setJoinCodeInput('')
          setJoinStatus('idle')
          setJoinRoleInput(null)
          fetchMissions()
        }, 2000)
      } else {
        const err = result?.error || 'INVALID_CODE // TRY AGAIN'
        if (err.includes('ALREADY IN THIS SQUAD')) {
          setJoinStatus('already_member')
        } else if (err.includes('REQUEST_PENDING')) {
          setJoinStatus('invalid')
          /* setJoinErrorText(isRTL ? 'الطلب قيد الانتظار بالفعل // يرجى الانتظار' : 'REQUEST_PENDING // ALREADY SENT') */
          setJoinErrorText(isRTL ? 'الطلب متعلق فعلاً // من فضلك استنى' : 'REQUEST_PENDING // ALREADY SENT')
          playError()
        } else if (err.includes('REQUEST_REJECTED')) {
          setJoinStatus('invalid')
          /* setJoinErrorText(isRTL ? 'تم رفض طلبك السابق // الوصول مصنف' : 'REQUEST_REJECTED // ACCESS CLASSIFIED') */
          setJoinErrorText(isRTL ? 'طلبك القديم اترفض // الوصول ممنوع' : 'REQUEST_REJECTED // ACCESS CLASSIFIED')
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
    /* showToast(isRTL ? 'تم نسخ الرابط' : 'INVITE LINK COPIED', 'success') */
    showToast(isRTL ? 'الرابط اتنسخ' : 'INVITE LINK COPIED', 'success')
    playBlip()
  }

  const toggleSquadRule = async (mission: any, ruleKey: string) => {
    const newMetadata = { ...mission.metadata }
    newMetadata.rules = { ...newMetadata.rules, [ruleKey]: !newMetadata.rules?.[ruleKey] }
    
    const { error } = await supabase.from('goals').update({ metadata: newMetadata }).eq('id', mission.id)
    if (!error) {
      setMissions(prev => prev.map(m => m.id === mission.id ? { ...m, metadata: newMetadata } : m))
      /* showToast(isRTL ? 'تم تحديث القاعدة!' : 'RULE UPDATED', 'success') */
      showToast(isRTL ? 'القاعدة اتحدثت!' : 'RULE UPDATED', 'success')
      playDeploy()
    } else {
      /* showToast(isRTL ? 'فشل التحديث!' : 'UPDATE FAILED', 'warning') */
      showToast(isRTL ? 'التحديث مش اشتغل!' : 'UPDATE FAILED', 'warning')
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
    const memberGoalIds = memberRows ? memberRows.map((r: any) => r.goal_id) : []

    let query = supabase
      .from('goals')
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
      
      const squadGoals = data.filter((m: any) => m.metadata?.type === 'squad')
      if (squadGoals.length > 0) {
        const squadGoalIds = squadGoals.map((m: any) => m.id)
        
        // Fetch squad members and map them (exclude blocked)
        const { data: members } = await supabase
          .from('goal_members')
          .select('*, profiles(*)')
          .in('goal_id', squadGoalIds)
        
        if (members) {
          const map: Record<string, any[]> = {}
          members.forEach((m: any) => {
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
          // .select('cup_id, user_id')
          .select('goal_id, user_id')
          // .in('cup_id', squadGoalIds)
          .in('goal_id', squadGoalIds)
          .gte('started_at', todayMidnight.toISOString())

        if (activeLogs) {
          const activeMap: Record<string, Set<string>> = {}
          activeLogs.forEach((log: any) => {
            // if (!activeMap[log.cup_id]) activeMap[log.cup_id] = new Set()
            if (!activeMap[log.goal_id]) activeMap[log.goal_id] = new Set()
            // activeMap[log.cup_id].add(log.user_id)
            activeMap[log.goal_id].add(log.user_id)
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
    // return allTasks.filter(t => t.cup_id === activeTab)
    return allTasks.filter(t => t.goal_id === activeTab)
  }, [allTasks, activeTab])

  async function toggleTask(task: any) {
    const updatedStatus = !task.is_completed
    setMissions(prev => prev.map(m => ({
      ...m,
      tasks: m.tasks?.map((t: any) => t.id === task.id ? { ...t, is_completed: updatedStatus } : t)
    })))

    // Support guest goals locally
    // if (task.cup_id?.startsWith('local_')) {
    if (task.goal_id?.startsWith('local_')) {
      const guestGoals = JSON.parse(localStorage.getItem('guest_goals') || '[]')
      const updatedGoals = guestGoals.map((m: any) => {
        // if (m.id === task.cup_id) {
        if (m.id === task.goal_id) {
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
      // const mission = missions.find(m => m.id === task.cup_id)
      const mission = missions.find(m => m.id === task.goal_id)
      if (mission && mission.tasks) {
        const taskIndex = mission.tasks.findIndex((t: any) => t.id === task.id)
        if (taskIndex !== -1) {
          const sizeStr = mission.size?.toLowerCase() || 'md'
          let xpCeiling = 8
          if (sizeStr === 'sm' || sizeStr === 's' || sizeStr === 'small') xpCeiling = 4
          else if (sizeStr === 'lg' || sizeStr === 'l' || sizeStr === 'large') xpCeiling = 20

          if (taskIndex < xpCeiling) {
            await addXp(updatedStatus ? ((Number(task.weight) || 3) * 10) : -((Number(task.weight) || 3) * 10), updatedStatus ? task.title : undefined)
          }
        }
      }

      if (updatedStatus) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('task_completion_log').insert([{
            user_id: user.id,
            task_id: task.id,
            // cup_id: task.cup_id,
            completed_at: new Date().toISOString()
          }])
        }
      }
    }
  }

  const fetchAllAttachmentCounts = useCallback(async (userId: string, missionIds: string[]) => {
    if (!missionIds.length) return
    const { data } = await supabase
      .from('goal_attachments')
      // .select('mission_id')
      .select('goal_id')
      .eq('user_id', userId)
      // .in('mission_id', missionIds)
      .in('goal_id', missionIds)
    if (data) {
      const counts: Record<string, number> = {}
      data.forEach((row: any) => {
        // counts[row.mission_id] = (counts[row.mission_id] || 0) + 1
        counts[row.goal_id] = (counts[row.goal_id] || 0) + 1
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
      .from('goal_attachments')
      .select('*')
      // .eq('mission_id', missionId)
      .eq('goal_id', missionId)
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
        /* showToast(isRTL ? 'يجب إدخال اسم للهدف' : 'Goal title is required', 'warning') */
        showToast(isRTL ? 'لازم تكتب اسم للـ Goal' : 'Goal title is required', 'warning')
        playError()
        return
      }

      const { isValid } = validateContent(titleToCheck)
      if (!isValid) {
        /* showToast(isRTL ? 'برجاء الالتزام بلغة لائقة في النظام' : 'Please maintain professional language', 'warning') */
        showToast(isRTL ? 'من فضلك اتكلم بطريقة مناسبة في السيستم' : 'Please maintain professional language', 'warning')
        playError()
        return
      }

      const isAiValid = await aiProfanityCheck(titleToCheck)
      if (!isAiValid) {
        /* showToast(isRTL ? 'برجاء الالتزام بلغة لائقة في النظام' : 'Please maintain professional language', 'warning') */
        showToast(isRTL ? 'من فضلك اتكلم بطريقة مناسبة في السيستم' : 'Please maintain professional language', 'warning')
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
        /* showToast(isRTL ? 'تم حفظ الهدف محلياً' : 'Goal saved locally!', 'success') */
        showToast(isRTL ? 'الـ Goal اتحفظ عندك محلياً' : 'Goal saved locally!', 'success')
        playDeploy()
        router.push(`/goals/squad/${fakeId}`)
        return
      }

    // 1. Get synced cups to check capacity
    const { data: synced } = await supabase
      .from('goals')
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
          /* isRTL
            ? `سعة المحطة ممتلئة (${usedSlots.toFixed(1).replace('.0','')}/9 فتحات) - أتمم أو أزل مهمات موجودة.`
            : `FOCUS CAPACITY FULL (${usedSlots.toFixed(1).replace('.0','')}/9 SLOTS) — Complete or un-equip existing goals.`, */
          isRTL
            ? `سعة المحطة مليانة (${usedSlots.toFixed(1).replace('.0','')}/9 فتحات) - خلص أو شيل Goals موجودة.`
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

      const { data, error } = await supabase.from('goals').insert(insertData).select().single()
      
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
        /* showToast(isRTL ? 'تم إنشاء الهدف' : 'Goal activated!', 'success') */
        showToast(isRTL ? 'الـ Goal اتعمل' : 'Goal activated!', 'success')
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
        {/* Subtle holographic subtitle */}
        <div className="text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--theme-color)]/5 border border-[var(--theme-color)]/10 backdrop-blur-md">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--theme-color)] animate-ping" />
            <span className="font-space text-[9px] tracking-[0.25em] font-black uppercase text-[var(--theme-color)]">
              {/* {isRTL ? 'مزامنة أهداف مساحة العمل السحابية...' : 'SYNCING_CLOUD_WORKSPACE_OBJECTIVES...'} */}
              {isRTL ? 'مزامنة الـ Goals السحابية...' : 'SYNCING_CLOUD_WORKSPACE_OBJECTIVES...'}
            </span>
          </div>
        </div>

        {/* Shimmer skeleton matching grid goals layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-pulse">
          {[1, 2, 3].map((idx) => (
            <div 
              key={idx}
              className="relative p-8 border border-[var(--card-border)] bg-[var(--card-bg)] rounded-3xl min-h-[350px] flex flex-col justify-between overflow-hidden"
            >
              {/* Theme glow effect */}
              <div 
                className="absolute top-0 left-0 right-0 h-[2px]" 
                style={{ background: `linear-gradient(90deg, transparent, ${currentTheme.color}80, transparent)` }} 
              />
              
              {/* Header Telemetry */}
              <div className="flex justify-between items-center w-full">
                <div className="w-24 h-4.5 rounded bg-[var(--theme-color)]/15" />
                <div className="w-8 h-8 rounded-full bg-[var(--theme-color)]/10" />
              </div>

              {/* Central Circle Progress Shimmer */}
              <div className="flex flex-col items-center justify-center my-8 space-y-4">
                <div 
                  className="w-24 h-24 rounded-full border-4 border-dashed flex items-center justify-center animate-[spin_30s_linear_infinite]"
                  style={{ borderColor: `${currentTheme.color}25` }}
                >
                  <div className="w-16 h-16 rounded-full border border-dotted" style={{ borderColor: `${currentTheme.color}15` }} />
                </div>
                <div className="w-16 h-4.5 rounded bg-[var(--theme-color)]/15" />
              </div>

              {/* Subtasks outline */}
              <div className="space-y-2.5 w-full">
                <div className="w-full h-8 rounded-xl bg-[var(--theme-color)]/5 border border-[var(--theme-color)]/10" />
                <div className="w-full h-8 rounded-xl bg-[var(--theme-color)]/5 border border-[var(--theme-color)]/10" />
              </div>

              {/* Footer Slots */}
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-[var(--card-border)]/30 w-full">
                <div className="w-20 h-4 rounded bg-[var(--theme-color)]/10" />
                <div className="w-16 h-4 rounded bg-[var(--theme-color)]/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  )

  return (
    <Shell>
      <div className="max-w-7xl mx-auto p-6 md:p-12 space-y-6 md:space-y-12">
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 border-b border-black/5 dark:border-white/5 pb-6"
        >
          <div className="flex flex-row justify-between items-center w-full md:w-auto gap-4">
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                {typeFilter === 'solo' ? (
                  <Target className="w-6 h-6 md:w-10 md:h-10 shrink-0" style={{ color: currentTheme.color }} />
                ) : (
                  <Users className="w-6 h-6 md:w-10 md:h-10 shrink-0" style={{ color: currentTheme.color }} />
                )}
                <h1 className="text-2xl md:text-6xl font-black font-space tracking-wider uppercase text-black dark:text-white leading-none truncate">
                  {typeFilter === 'solo' ? (
                    <>{isRTL ? 'Goals' : 'Personal'}<span style={{ color: currentTheme.color }}>{isRTL ? ' شخصية' : ' Goals'}</span></>
                  ) : typeFilter === 'squad' ? (
                    <>{isRTL ? 'Goals' : 'Squad'}<span style={{ color: currentTheme.color }}>{isRTL ? ' الـ Squad' : ' Goals'}</span></>
                  ) : (
                    <>{isRTL ? 'لوحة' : 'Goal'}<span style={{ color: currentTheme.color }}>{isRTL ? ' الـ Goals' : ' Canvas'}</span></>
                  )}
                </h1>

                {/* Compact XP/Rank Badge Chip in the title row */}
                <div className="inline-flex items-center gap-1 border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 md:px-2.5 md:py-1 rounded text-amber-500 shrink-0">
                  <Sparkles className="w-3 h-3 animate-pulse" />
                  <span className="text-[9px] md:text-[10px] font-space font-black uppercase tracking-wider select-none">
                    {profile?.rank || 'SILVER'} • {profile?.xp || 0} XP
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile-only create/join CTA trigger next to title if not squad layout */}
            {typeFilter !== 'squad' && (
              <button
                onClick={() => { playBlip(); setShowCreate(true); }}
                className="flex md:hidden flex-row items-center justify-center gap-1.5 h-11 px-4 rounded-md font-space text-xs font-black uppercase tracking-widest transition-all duration-300 hover:brightness-110 active:scale-[0.97] shadow-lg shrink-0"
                style={{ backgroundColor: currentTheme.color, color: '#000', boxShadow: `0 4px 20px ${currentTheme.color}33` }}
              >
                <Plus className="w-4 h-4" />
                {isRTL ? 'إنشاء' : 'Create'}
              </button>
            )}
          </div>
          
          {typeFilter === 'squad' ? (
            /* Commented out legacy full-width button styling
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button
                onClick={() => { playBlip(); setShowJoinGoal(true); }}
                className="flex flex-row items-center justify-center gap-2 w-full md:w-auto h-12 md:h-11 min-h-[48px] md:min-h-0 px-6 rounded-md border border-teal-500/50 hover:border-teal-400 text-teal-400 hover:text-teal-300 bg-teal-500/5 hover:bg-teal-500/10 font-space text-xs font-black uppercase tracking-widest transition-all duration-300 active:scale-[0.97] shadow-lg cursor-pointer animate-pulse"
              >
                <LinkIcon className="w-4.5 h-4.5" />
                {isRTL ? 'ادخل في Goal' : 'JOIN GOAL'}
              </button>
              <button
                onClick={() => { playBlip(); setShowCreate(true); }}
                className="flex flex-row items-center justify-center gap-2 w-full md:w-auto h-12 md:h-11 min-h-[48px] md:min-h-0 px-6 rounded-md font-space text-xs font-black uppercase tracking-widest transition-all duration-300 hover:brightness-110 active:scale-[0.97] shadow-lg cursor-pointer"
                style={{ backgroundColor: currentTheme.color, color: '#000', boxShadow: `0 4px 20px ${currentTheme.color}33` }}
              >
                <Plus className="w-4 h-4" />
                {isRTL ? 'اعمل Squad Goal' : 'CREATE SQUAD GOAL'}
              </button>
            </div>
            */
            <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:flex-row sm:gap-3 md:w-auto">
              <button
                onClick={() => { playBlip(); setShowJoinGoal(true); }}
                className="flex flex-row items-center justify-center gap-1 sm:gap-2 w-full md:w-auto h-11 px-2 sm:px-6 rounded-md border border-teal-500/50 hover:border-teal-400 text-teal-400 hover:text-teal-300 bg-teal-500/5 hover:bg-teal-500/10 font-space text-[9px] min-[375px]:text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest transition-all duration-300 active:scale-[0.97] shadow-lg cursor-pointer animate-pulse"
              >
                <LinkIcon className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
                {isRTL ? 'ادخل في Goal' : 'JOIN GOAL'}
              </button>
              <button
                onClick={() => { playBlip(); setShowCreate(true); }}
                className="flex flex-row items-center justify-center gap-1 sm:gap-2 w-full md:w-auto h-11 px-2 sm:px-6 rounded-md font-space text-[9px] min-[375px]:text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest transition-all duration-300 hover:brightness-110 active:scale-[0.97] shadow-lg cursor-pointer"
                style={{ backgroundColor: currentTheme.color, color: '#000', boxShadow: `0 4px 20px ${currentTheme.color}33` }}
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {isRTL ? 'اعمل Squad Goal' : 'CREATE SQUAD GOAL'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => { playBlip(); setShowCreate(true); }}
              className="flex flex-row items-center justify-center gap-2 w-full md:w-auto h-11 px-6 rounded-md font-space text-xs font-black uppercase tracking-widest transition-all duration-300 hover:brightness-110 active:scale-95 shadow-lg cursor-pointer"
              style={{ backgroundColor: currentTheme.color, color: '#000', boxShadow: `0 4px 20px ${currentTheme.color}33` }}
            >
              <Plus className="w-4 h-4" />
              {/* {typeFilter === 'solo' ? (isRTL ? 'إنشاء هدف فردي' : 'CREATE GOAL') : (isRTL ? 'إنشاء هدف' : 'Create Goal')} */}
              {typeFilter === 'solo' ? (isRTL ? 'اعمل Goal شخصي' : 'CREATE GOAL') : (isRTL ? 'اعمل Goal' : 'Create Goal')}
            </button>
          )}
        </motion.header>

        {/* Commented out legacy command bar code for XP and join squad
        {typeFilter && (
          <div className="w-full h-12 bg-white/5 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/80 rounded-md px-4 flex items-center justify-between backdrop-blur-md shadow-sm">
            <div className="flex items-center gap-2 border border-amber-500/20 bg-amber-500/5 px-3 py-1 rounded-md text-amber-500">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span className="text-[10px] font-space font-black uppercase tracking-widest select-none">
                {profile?.rank || 'SILVER'} • {profile?.xp || 0} XP
              </span>
            </div>
            
            {typeFilter === 'solo' && (
              <button
                onClick={() => { playBlip(); setShowJoinGoal(true); }}
                className="flex items-center gap-1.5 px-3 h-8 border border-teal-500/40 hover:border-teal-400 text-teal-400 hover:text-teal-300 bg-teal-500/5 hover:bg-teal-500/10 rounded-md font-space text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 cursor-pointer"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                {isRTL ? 'الانضمام للفريق' : 'JOIN A TEAM GOAL'}
              </button>
            )}
          </div>
        )}
        */}

        {/* Dynamic Command Bar - only rendered for solo filter to join a team */}
        {typeFilter === 'solo' && (
          <div className="w-full h-12 bg-white/5 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/80 rounded-md px-4 flex items-center justify-end backdrop-blur-md shadow-sm">
            <button
              onClick={() => { playBlip(); setShowJoinGoal(true); }}
              className="flex items-center gap-1.5 px-3 h-8 border border-teal-500/40 hover:border-teal-400 text-teal-400 hover:text-teal-300 bg-teal-500/5 hover:bg-teal-500/10 rounded-md font-space text-[10px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 cursor-pointer"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              {isRTL ? 'الانضمام للفريق' : 'JOIN A TEAM GOAL'}
            </button>
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
                  className="absolute top-4 right-4 rtl:left-4 rtl:right-auto text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="space-y-4">
                  {isRTL ? (
                    <div className="space-y-2 border-r-4 pr-4 border-l-0 rtl:border-l-0 rtl:border-r-4 text-right" style={{ borderColor: currentTheme.color }}>
                      {/* <p className="text-xl md:text-2xl lg:text-3xl font-black text-[var(--text-primary)] mb-3 leading-snug">
                        مرحباً بك في منصتك الشخصية لإدارة الأهداف والإنتاجية. هذا النظام مصمم لمساعدتك على تنظيم يومك وبناء عادات مستدامة.
                      </p> */}
                      <p className="text-xl md:text-2xl lg:text-3xl font-black text-[var(--text-primary)] mb-3 leading-snug">
                        أهلاً بك في منصتك الشخصية عشان تدير الـ Goals بتاعتك والإنتاجية. السيستم ده معمول عشان يساعدك تنظم يومك وتعمل عادات تعيش معاك.
                      </p>
                      <ol className="list-decimal list-inside space-y-2 text-sm md:text-base text-[var(--text-primary)]/80 font-bold">
                        {/* <li><span style={{ color: currentTheme.color }}>سعة التركيز (Focus Capacity):</span> تدعم واجهة العمل بحد أقصى 9 مهام نشطة في نفس الوقت لضمان تركيزك الكامل وتجنب تشتت الانتباه.</li>
                        <li><span style={{ color: currentTheme.color }}>نقاط الإنجاز (XP System):</span> إكمال المهام يمنحك نقاط خبرة لتوثيق حجم مجهودك ومراقبة تزايد معدل إنتاجيتك بشكل ملموس.</li>
                        <li><span style={{ color: currentTheme.color }}>مؤشر الالتزام:</span> التراجع عن متابعة أهدافك اليومية أو التكاسل لفترات طويلة يؤدي إلى انخفاض نقاطك تدريجياً، لتنبيهك بضرورة العودة للمسار الصحيح.</li> */}
                        <li><span style={{ color: currentTheme.color }}>سعة الـ Focus:</span> الـ Dashboard بتدعم لحد 9 Goals شغالة في نفس الوقت عشان تفضل مركز ومفيش حاجة تشتتك.</li>
                        <li><span style={{ color: currentTheme.color }}>نظام الـ XP:</span> لما تخلص الـ Tasks هتاخد XP عشان تشوف مجهودك وتتابع إنتاجيتك بوضوح.</li>
                        <li><span style={{ color: currentTheme.color }}>مؤشر الالتزام:</span> لو كبّرت دماغك ومتابعتش الـ Goals بتاعتك أو كسلت كتير، الـ XP هيقل تدريجياً عشان يفكرك ترجع على التراك تاني.</li>
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
              className="fixed inset-0 z-[200] flex items-center justify-center bg-white/90 dark:bg-black/90 backdrop-blur-sm p-4 overflow-y-auto"
              onClick={() => setShowCreate(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-[380px] bg-zinc-950/95 border border-white/10 p-6 space-y-5 rounded-md shadow-2xl my-auto relative"
              >
                <button 
                  onClick={() => { setShowCreate(false); setDefaultView('list'); }} 
                  className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-black uppercase text-white tracking-wider">
                    {typeFilter === 'squad'
                      ? (isRTL ? 'إنشاء هدف فريق' : /* 'Create Team Goal' */ 'Create Squad Goal')
                      : (isRTL ? 'إنشاء هدف جديد' : 'Create New Goal')}
                  </h2>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black tracking-widest uppercase text-zinc-400">
                    {isRTL ? 'العنوان' : 'Goal Title'}
                  </label>
                  <input
                    autoFocus
                    value={newTitle}
                    placeholder={isRTL ? 'ما الذي تريد تحقيقه؟...' : 'What do you want to achieve?...'}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 focus:border-[var(--theme-color)] py-3 px-4 rounded-md text-base font-bold text-white outline-none transition-all placeholder:text-zinc-600 shadow-inner"
                    style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                  />
                </div>

                {/* Deadline */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black tracking-widest uppercase text-zinc-400">
                    {isRTL ? 'تاريخ الاستحقاق (اختياري)' : 'Deadline (Optional)'}
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 focus:border-[var(--theme-color)] py-2.5 px-4 text-sm font-bold text-white outline-none transition-all rounded-md date-input-tactical"
                    style={{ colorScheme: 'dark', borderColor: 'rgba(255,255,255,0.08)' }}
                  />
                </div>

                {/* Show on Dashboard Checkbox */}
                <div className="flex items-center justify-between py-2 border-t border-b border-white/[0.05]">
                  <span className="text-[10px] font-black tracking-widest uppercase text-zinc-400">
                    {isRTL ? 'تثبيت في اللوحة الرئيسة' : 'Pin to Dashboard'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={syncOnCreate}
                      onChange={() => { playBlip(); setSyncOnCreate(!syncOnCreate); }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-zinc-400 peer-checked:after:bg-black after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--theme-color)]"
                      style={{ '--theme-color': currentTheme.color } as React.CSSProperties}
                    ></div>
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button 
                    onClick={() => { playClick(); setShowCreate(false); setDefaultView('list'); }} 
                    className="px-4 py-2.5 rounded-md text-xs uppercase tracking-widest text-zinc-400 hover:text-white transition-all font-black cursor-pointer"
                  >
                    {/* {isRTL ? 'إلغاء' : 'Cancel'} */}
                    {isRTL ? 'اتركها' : 'Cancel'}
                  </button>
                  <button 
                    onClick={() => { playClick(); addMission(); }} 
                    disabled={isSubmitting}
                    className="px-6 py-2.5 font-space font-black text-xs uppercase tracking-widest rounded-md flex items-center justify-center gap-2 cursor-pointer text-black hover:brightness-110 transition-all shadow-md"
                    style={{ backgroundColor: currentTheme.color }}
                  >
                    {isSubmitting && <Loader2 className="w-3 h-3 animate-spin text-black" />}
                    {/* {isRTL ? 'إنشاء هدف' : 'CREATE GOAL'} */}
                    {isRTL ? 'عمل Goal' : 'CREATE GOAL'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Commented out My Tasks section block to permanently remove it from the site
        {!typeFilter && (
          <div className="w-full bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-md p-6 md:p-8 space-y-6 shadow-md transition-all duration-300 hover:shadow-[0_0_0_1px_rgba(161,161,170,0.3)] backdrop-blur-md">
            <div className="flex flex-row justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-zinc-500 shrink-0" style={{ color: currentTheme.color }} />
                <h2 className="text-xl font-space font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                  {isRTL ? 'مهامي' : 'My Tasks'}
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-space font-black">
                {allTasks.length} {isRTL ? 'مهام' : 'tasks'}
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => setActiveTab('ALL')}
                className={cn(
                  "px-4 py-2 rounded-md border font-space font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap shrink-0 cursor-pointer",
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
                    "px-4 py-2 rounded-md border font-space font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap shrink-0 cursor-pointer max-w-[200px] truncate",
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
                    "flex items-center justify-between p-4 rounded-md border transition-all duration-300 group",
                    "bg-white/50 dark:bg-zinc-950/20 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700/80",
                    task.is_completed ? "opacity-60" : ""
                  )}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <button
                      onClick={() => toggleTask(task)}
                      className="shrink-0 cursor-pointer flex items-center justify-center"
                    >
                      {task.is_completed ? (
                        <NeonIcon icon={CheckCircle2} interactive size={18} style={{ color: task.missionColor }} />
                      ) : (
                        <NeonIcon icon={Circle} interactive size={18} className="opacity-40 hover:opacity-80 text-zinc-400 hover:text-white transition-opacity" />
                      )}
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
                  <CheckCircle2 className="w-9 h-9 text-zinc-300 dark:text-white/20 mx-auto" />
                  <p className="text-sm font-space text-zinc-500 dark:text-white/40">
                    {isRTL ? 'لا توجد مهام في هذه القائمة.' : 'No tasks in this view.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        */}

        <div className="w-full">
          {typeFilter === 'squad' ? (
            <div className="space-y-10 w-full">
              {/* COMMANDING SECTION */}
              <div>
                <h2 className="text-xl font-bold text-teal-400 mb-4">LEADING</h2>
                {commandingMissions.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                    <p className="text-[10px] font-space font-black tracking-widest text-zinc-500 uppercase">
                      {isRTL ? 'لا توجد أهداف تقودها حالياً' : 'NO LEADING TEAM GOALS'}
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
                      {isRTL ? 'لا توجد أهداف معينة لك حالياً' : 'NO ASSIGNED TEAM GOALS'}
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
              // missionId={attachmentMissionId}
              goalId={attachmentMissionId}
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
                      <AlertTriangle className="w-7 h-7 animate-pulse text-[#FF0055]" />
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
                        {isRTL ? 'الاستمرار بالتركيز' : 'Keep Focusing'}
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
                      No Solo Goals Yet
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
                    <Plus className="w-4 h-4 text-black" />
                    Create Goal
                  </button>
                </>
              ) : typeFilter === 'squad' ? (
                <>
                  <div className="space-y-2 flex flex-col items-center justify-center select-none">
                    <Users className="w-12 h-12 text-zinc-500 mb-2 animate-pulse" />
                    <h3 className="text-2xl font-black font-space tracking-widest text-zinc-400 dark:text-zinc-500 uppercase">
                      No team goals yet
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-600 text-sm font-space">
                      Lead a team or join one with an invite code
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={() => { playBlip(); setShowJoinGoal(true); }}
                      className="flex flex-row items-center justify-center gap-2 h-11 px-6 rounded-sm border border-teal-500/50 hover:border-teal-400 text-teal-400 hover:text-teal-300 bg-teal-500/5 hover:bg-teal-500/10 font-space text-xs font-black uppercase tracking-widest transition-all duration-300 active:scale-95 shadow-lg cursor-pointer animate-pulse"
                    >
                      <LinkIcon className="w-4 h-4" />
                      Join with Code
                    </button>
                    <button
                      onClick={() => { playBlip(); setShowCreate(true); }}
                      className="flex flex-row items-center justify-center gap-2 h-11 px-6 rounded-sm font-space text-xs font-black uppercase tracking-widest transition-all duration-300 hover:brightness-110 active:scale-95 shadow-lg cursor-pointer"
                      style={{ backgroundColor: currentTheme.color, color: '#000', boxShadow: `0 4px 20px ${currentTheme.color}33` }}
                    >
                      <Plus className="w-4 h-4 text-black" />
                      Create Team Goal
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-[var(--text-secondary)]/50 text-sm text-center font-space">
                  {isRTL ? 
                    // 'مفيش Goals نشطة دلوقتي. استخدم لوحة الإنشاء فوق عشان تبدأ.'
                    'مفيش مهام نشطة دلوقتي. خد نفسك وخطط لخطوتك الجاية.'
                    : 
                    // 'No active goals synced. Use the action panel above to initiate.'
                    'No active tasks. Take a breath and plan your next move.'
                  }
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* JOIN TEAM GOAL MODAL (Part 4) */}
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
                className="absolute top-4 right-4 rtl:left-4 rtl:right-auto text-[var(--text-secondary)] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-6">
                <div className="flex items-center gap-3 text-teal-400">
                  <UserPlus className="w-6 h-6 animate-pulse text-teal-400" />
                  <h2 className="text-xl font-space font-black uppercase tracking-widest">
                    {/* {isRTL ? 'الانضمام للفريق' : 'JOIN_A_SQUAD'} */}
                    {isRTL ? 'ادخل الـ Squad' : 'JOIN_A_SQUAD'}
                  </h2>
                </div>

                <div className="space-y-4">
                  <p className="text-xs font-space text-zinc-400 uppercase tracking-wider">
                    {/* {isRTL ? 'أدخل رمز الدعوة أو رابط الهدف' : 'Enter an invite code or paste a goal link'} */}
                    {isRTL ? 'اكتب كود الدعوة أو لينك الـ Goal' : 'Enter an invite code or paste a goal link'}
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
                        {/* {isRTL ? 'تم تقديم الطلب // بانتظار موافقة القائد' : 'REQUEST SUBMITTED // WAITING FOR APPROVAL'} */}
                        {isRTL ? 'الطلب اتبعت // مستنيين موافقة القائد' : 'REQUEST SUBMITTED // WAITING FOR APPROVAL'}
                      </p>
                    )}
                  </div>

                  {/* Main Scan/Confirm Button */}
                  {joinStatus === 'valid' ? (
                    <button
                      onClick={handleConfirmJoin}
                      className="w-full h-11 bg-emerald-500 hover:bg-emerald-400 text-black font-space font-black text-xs uppercase tracking-widest transition-all duration-300 rounded-sm cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-black" />
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
                          <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                          SCANNING...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 text-black fill-current" />
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

/*
LEGACY_COMMENTED_OUT_LAYOUT:
return (
  <motion.div
    key={mission.id}
    layout
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: idx * 0.05 }}
    onClick={() => { playBlip(); router.push(`/goals/squad/${mission.id}`); }}
    className={cn(
      "group relative flex flex-col bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--card-border)]/50 cursor-pointer transition-all rounded-md shadow-xl overflow-hidden",
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
          {renderSizeIcon(sizeIcon, "w-3 h-3 opacity-40 shrink-0", { color: isInRedZone ? '#FF0055' : (mission.color || color) })}
          <p className="text-[8px] font-space tracking-[0.3em] uppercase font-black opacity-40">
             {mission.sync_to_dashboard ? (isRTL ? 'نشط' : 'ACTIVE') : (isRTL ? 'استعداد' : 'STANDBY')}
          </p>
          {typeFilter === 'solo' && (
            <span className="text-[8px] font-space tracking-widest font-black uppercase text-zinc-500 opacity-60 bg-zinc-500/10 border border-zinc-500/20 px-1.5 py-0.5 rounded-md">
              ◆ SOLO
            </span>
          )}
          {typeFilter === 'squad' && (
            mission.user_id === profile?.id ? (
              <span className="text-[8px] font-space tracking-widest font-black uppercase text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-[0_0_8px_rgba(245,158,11,0.1)]">
                👑 ADMIN
              </span>
            ) : (
              <span className="text-[8px] font-space tracking-widest font-black uppercase text-zinc-400 bg-zinc-400/10 border border-zinc-400/20 px-1.5 py-0.5 rounded-md">
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
              className="text-[var(--text-secondary)] hover:text-white transition-colors p-1 flex items-center justify-center cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            
            <AnimatePresence>
              {activeRulesGoalId === mission.id && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute right-0 top-full mt-2 w-64 bg-zinc-950/95 border border-zinc-800 rounded-md p-4 shadow-2xl backdrop-blur-md z-[150] space-y-3 font-space text-left"
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
                className="relative flex items-center justify-center w-8 h-8 border border-[var(--card-border)] hover:border-teal-400/50 hover:bg-teal-500/5 transition-all rounded-md shrink-0 animate-pulse cursor-pointer"
                title="COPY_INVITE_CODE"
              >
                <LinkIcon className="w-3.5 h-3.5 text-teal-400" />
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
              className="relative flex items-center justify-center w-8 h-8 border border-[var(--card-border)] transition-all rounded-md shrink-0 cursor-pointer"
              onMouseEnter={e => e.currentTarget.style.borderColor = `${(mission.color || color)}60`}
              onMouseLeave={e => e.currentTarget.style.borderColor = ''}
              title="ADD_TO_GOOGLE_CALENDAR"
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                openAttachments(mission.id);
              }}
              className="relative flex items-center justify-center w-8 h-8 border border-[var(--card-border)] transition-all rounded-md shrink-0 cursor-pointer"
              onMouseEnter={e => e.currentTarget.style.borderColor = `${(mission.color || color)}60`}
              onMouseLeave={e => e.currentTarget.style.borderColor = ''}
              title="ATTACHMENTS"
              style={{
                borderColor: (attachmentCounts[mission.id] || 0) > 0 ? `${(mission.color || color)}44` : undefined,
                boxShadow: (attachmentCounts[mission.id] || 0) > 0 ? `0 0 10px ${(mission.color || color)}22` : undefined
              }}
            >
              <Paperclip className="w-3.5 h-3.5" style={{ 
                color: (attachmentCounts[mission.id] || 0) > 0 ? (mission.color || color) : 'inherit',
              }} />
              {(attachmentCounts[mission.id] || 0) > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 text-black text-[8px] font-black flex items-center justify-center rounded-full shadow-lg"
                  style={{ backgroundColor: (mission.color || color), boxShadow: `0 0 10px ${(mission.color || color)}` }}
                >
                  {attachmentCounts[mission.id]}
                </span>
              )}
            </button>
           <ArrowRight className="w-4.5 h-4.5 text-[var(--text-secondary)]/35 group-hover:translate-x-2 rtl:group-hover:-translate-x-2 transition-transform shrink-0" />
         </div>
      </div>
    </div>
  </motion.div>
)
*/

