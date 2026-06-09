'use client'

import { ArrowRight, Check, CheckSquare, Clock, HelpCircle, Home, Lock, Shield, User, Zap } from 'lucide-react'
import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import ProgressCup from '@/components/ui/ProgressCup'
import { cn } from '@/lib/utils'

function calculateAccountability(mission: any) {
  if (!mission || !mission.tasks || mission.tasks.length === 0) {
    return { progress: 0, status: 'ON_TRACK', isInRedZone: false }
  }

  const tasks = mission.tasks
  const totalWeight = tasks.reduce((sum: number, t: any) => sum + (t.weight || 1), 0)
  const completedWeight = tasks
    .filter((t: any) => t.is_completed)
    .reduce((sum: number, t: any) => sum + (t.weight || 1), 0)

  const progress = totalWeight === 0 ? 0 : (completedWeight / totalWeight) * 100

  let status = 'ON_TRACK'
  let isInRedZone = false
  if (mission.end_date) {
    const end = new Date(mission.end_date).getTime()
    const now = Date.now()
    const daysLeft = (end - now) / (1000 * 60 * 60 * 24)
    if (daysLeft < 3 && progress < 80) {
      status = 'CRITICAL'
      isInRedZone = true
    } else if (daysLeft < 7 && progress < 50) {
      status = 'WARNING'
    }
  }

  return { progress, status, isInRedZone }
}

export default function PublicGoalPage() {
  const { id } = useParams()
  const router = useRouter()
  const [goal, setGoal] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [timeInvested, setTimeInvested] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [joinState, setJoinState] = useState<'none' | 'pending' | 'approved'>('none')
  const [isMember, setIsMember] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function checkSession() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    checkSession()
  }, [supabase])

  const handleJoinGoal = async () => {
    if (!user) {
      localStorage.setItem('pendingJoinGoal', id as string);
      localStorage.setItem('pendingJoinMessage', isRTL ? `سجّل دخولك للانضمام لـ "${goal?.title || 'الهدف'}"` : `Sign in to join "${goal?.title || 'Goal'}"`);
      router.push('/auth/login');
      return;
    }

    try {
      // Check if already a member
      const { data: existingMember } = await supabase
        .from('goal_members')
        .select('*')
        .eq('goal_id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingMember) {
        alert(isRTL ? 'أنت عضو بالفعل في هذا الهدف!' : 'You are already a member of this goal!');
        router.push(`/goals/squad/${id}`);
        return;
      }

      // Check if requires_approval is true (default is true if not explicitly false)
      const requiresApproval = goal.requires_approval !== false;

      if (!requiresApproval) {
        // Case 1: Direct Join
        const { error: joinError } = await supabase
          .from('goal_members')
          .insert({
            goal_id: id,
            user_id: user.id,
            role: 'member'
          });

        if (joinError) throw joinError;

        // Commented out per rule "Never delete code, only comment it out":
        /*
        // Notify all admins of the goal
        const { data: admins } = await supabase
          .from('goal_members')
          .select('user_id')
          .eq('goal_id', id)
          .in('role', ['owner', 'admin'])

        if (admins) {
          const userName = user.user_metadata?.full_name || (isRTL ? 'مستخدم' : 'User')
          const goalName = goal?.title || 'Goal'
          const notifications = admins.map((admin: any) => ({
            user_id: admin.user_id,
            type: 'member_joined',
            title: isRTL ? 'عضو جديد انضم' : 'New member joined',
            content: {
              goal_id: id,
              goal_title: goalName,
              user_id: user.id,
              user_name: userName,
              message: isRTL
                ? `${userName} انضم لـ ${goalName}`
                : `${userName} joined ${goalName}`
            },
            is_read: false
          }))
          
          await supabase
            .from('inbox_reports')
            .insert(notifications)
        }
        */

        const { data: goalData } = await supabase
          .from('goals')
          .select('user_id')
          .eq('id', id)
          .single()

        const { data: admins } = await supabase
          .from('goal_members')
          .select('user_id')
          .eq('goal_id', id)
          .in('role', ['owner', 'admin'])

        // Combine owner + admins, remove duplicates
        const adminIds = [
          ...(goalData ? [{ user_id: goalData.user_id }] : []),
          ...(admins || [])
        ].filter((v, i, arr) => 
          arr.findIndex(x => x.user_id === v.user_id) === i
        )

        if (adminIds && adminIds.length > 0) {
          const userName = user.user_metadata?.full_name || (isRTL ? 'مستخدم' : 'User')
          const goalName = goal?.title || 'Goal'
          const notifications = adminIds.map((admin: any) => ({
            user_id: admin.user_id,
            type: 'member_joined',
            title: isRTL ? 'عضو جديد انضم' : 'New member joined',
            content: {
              goal_id: id,
              goal_title: goalName,
              user_id: user.id,
              user_name: userName,
              message: isRTL
                ? `${userName} انضم لـ ${goalName}`
                : `${userName} joined ${goalName}`
            },
            is_read: false
          }))
          
          await supabase
            .from('inbox_reports')
            .insert(notifications)
        }



        /*
        // Fetch squad owner and admins to notify
        const { data: admins } = await supabase
          .from('goal_members')
          .select('user_id')
          .eq('goal_id', id)
          .in('role', ['owner', 'admin']);

        const adminIds = new Set<string>();
        if (goal.user_id) adminIds.add(goal.user_id);
        if (admins) {
          admins.forEach((a: any) => {
            if (a.user_id) adminIds.add(a.user_id);
          });
        }

        const notifications = Array.from(adminIds).map(adminId => ({
          user_id: adminId,
          title: isRTL 
            ? `${user.user_metadata?.full_name || 'مستخدم'} انضم لـ ${goal.title}`
            : `${user.user_metadata?.full_name || 'User'} joined ${goal.title}`,
          type: 'join_direct',
          content: {
            goal_id: id,
            goal_title: goal.title,
            user_id: user.id,
            user_name: user.user_metadata?.full_name || 'User',
          },
          is_read: false
        }));

        await supabase.from('inbox_reports').insert(notifications);
        */

        alert(isRTL ? 'تم الانضمام بنجاح!' : 'Successfully joined the goal!');
        router.push(`/goals/squad/${id}`);
      } else {
        // Case 2: Requires Approval
        // Check if request already pending
        // Commented out per rule "Never delete code, only comment it out":
        /*
        const { data: existingRequest } = await supabase
          .from('squad_join_requests')
          .select('*')
          .eq('goal_id', id)
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .maybeSingle();

        if (existingRequest) {
          alert(isRTL ? 'طلبك قيد الانتظار بالفعل.' : 'Your request is already pending.');
          return;
        }

        // Insert pending join request
        const { data: insertedData, error: requestError } = await supabase
          .from('squad_join_requests')
          .insert({
            goal_id: id,
            user_id: user.id,
            status: 'pending',
            role: 'member'
          })
          .select()
          .single();

        if (requestError) throw requestError;
        */

        // Check if request already exists
        const { data: existingRequest } = await supabase
          .from('squad_join_requests')
          .select('*')
          .eq('goal_id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingRequest) {
          if (existingRequest.status === 'pending') {
            alert(isRTL ? 'طلبك قيد الانتظار بالفعل.' : 'Your request is already pending.');
            return;
          }
          if (existingRequest.status === 'approved') {
            alert(isRTL ? 'أنت عضو بالفعل في هذا الفريق.' : 'You are already a member of this squad.');
            return;
          }
        }

        // Upsert pending join request (handles previous rejected status)
        const { data: insertedData, error: requestError } = await supabase
          .from('squad_join_requests')
          .upsert({
            id: existingRequest?.id, // specifying id updates the row if it exists
            goal_id: id,
            user_id: user.id,
            status: 'pending',
            role: 'member',
            requested_at: new Date().toISOString(),
            reviewed_at: null
          })
          .select()
          .single();

        if (requestError) throw requestError;

        // Commented out per rule "Never delete code, only comment it out":
        /*
        // Fetch squad owner and admins to notify
        const { data: admins } = await supabase
          .from('goal_members')
          .select('user_id')
          .eq('goal_id', id)
          .in('role', ['owner', 'admin'])

        if (admins && admins.length > 0) {
          const userName = user.user_metadata?.full_name || (isRTL ? 'مستخدم' : 'User')
          const goalName = goal.title
          await supabase.from('inbox_reports').insert(
            admins.map((admin: any) => ({
              user_id: admin.user_id,
              type: 'join_request',
              title: isRTL
                ? `${userName} يريد الانضمام`
                : `${userName} wants to join`,
              content: {
                goal_id: id,
                goal_title: goalName,
                requester_id: user.id,
                requester_name: userName,
                request_id: insertedData.id,
                message: isRTL
                  ? `${userName} يريد الانضمام لـ ${goalName}`
                  : `${userName} wants to join ${goalName}`
              },
              is_read: false
            }))
          )
        }
        */

        const { data: goalData } = await supabase
          .from('goals')
          .select('user_id')
          .eq('id', id)
          .single()

        const { data: admins } = await supabase
          .from('goal_members')
          .select('user_id')
          .eq('goal_id', id)
          .in('role', ['owner', 'admin'])

        // Combine owner + admins, remove duplicates
        const adminIds = [
          ...(goalData ? [{ user_id: goalData.user_id }] : []),
          ...(admins || [])
        ].filter((v, i, arr) => 
          arr.findIndex(x => x.user_id === v.user_id) === i
        )

        if (adminIds && adminIds.length > 0) {
          const userName = user.user_metadata?.full_name || (isRTL ? 'مستخدم' : 'User')
          const goalName = goal.title
          await supabase.from('inbox_reports').insert(
            adminIds.map((admin: any) => ({
              user_id: admin.user_id,
              type: 'join_request',
              title: isRTL
                ? `${userName} يريد الانضمام`
                : `${userName} wants to join`,
              content: {
                goal_id: id,
                goal_title: goalName,
                requester_id: user.id,
                requester_name: userName,
                request_id: insertedData.id,
                message: isRTL
                  ? `${userName} يريد الانضمام لـ ${goalName}`
                  : `${userName} wants to join ${goalName}`
              },
              is_read: false
            }))
          )
        }



        setJoinState('pending')
        alert(isRTL ? "تم إرسال طلبك، انتظر موافقة المشرف" : "Request sent! Waiting for admin approval");
      }
    } catch (err: any) {
      console.error('Error joining goal:', err);
      alert(isRTL ? 'حدث خطأ أثناء الانضمام.' : 'An error occurred while joining.');
    }
  };

  useEffect(() => {
    if (user && goal && typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search)
      if (searchParams.get('autojoin') === 'true') {
        const url = new URL(window.location.href)
        url.searchParams.delete('autojoin')
        window.history.replaceState({}, '', url.toString())
        handleJoinGoal()
      }
    }
  }, [user, goal])

  useEffect(() => {
    async function checkMembershipAndRequest() {
      if (!user || !id) return
      try {
        const { data: member } = await supabase
          .from('goal_members')
          .select('*')
          .eq('goal_id', id)
          .eq('user_id', user.id)
          .maybeSingle()
        
        if (member) {
          setIsMember(true)
          return
        }

        const { data: existingRequest } = await supabase
          .from('squad_join_requests')
          .select('status')
          .eq('goal_id', id)
          .eq('user_id', user.id)
          .maybeSingle()
          
        if (existingRequest?.status === 'approved') {
          router.push(`/goals/squad/${id}`)
        } else if (existingRequest?.status === 'pending') {
          setJoinState('pending')
        }
      } catch (err) {
        console.error('Error checking join request status:', err)
      }
    }
    checkMembershipAndRequest()
  }, [user, id, supabase, router])

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch goal + tasks
        const { data: cup, error: cupError } = await supabase
          .from('goals')
          .select('*, tasks(*), profiles:user_id(*)')
          .eq('id', id)
          .single()

        console.log('Goal data:', cup)
        console.log('is_public:', cup?.is_public)
        console.log('requires_approval:', cup?.requires_approval)

        if (cupError || !cup) {
          throw new Error('Not found or classified')
        }

        // Must explicitly have public_share = 'true' or is_public = true
        const isGoalPublic = cup.is_public === true || cup.metadata?.public_share === 'true' || cup.metadata?.public_share === true;
        if (!isGoalPublic) {
          throw new Error('Not public')
        }

        // Sort tasks
        if (cup.tasks) {
          cup.tasks.sort((a: any, b: any) => {
            const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            return diff !== 0 ? diff : a.id.localeCompare(b.id)
          })
        }
        setGoal(cup)

        // If squad, fetch members
        if (cup.metadata?.type === 'squad') {
          const { data: squadMembers } = await supabase
            .from('goal_members')
            .select('*, profiles(*)')
            .eq('goal_id', id)
          
          if (squadMembers) {
            setMembers(squadMembers.map((m: any) => ({ ...m.profiles, role: m.role })))
          }
        }

        // Fetch time logs
        const { data: logs } = await supabase
          .from('time_logs')
          .select('duration_minutes')
          // .eq('cup_id', id)
          .eq('goal_id', id)

        if (logs) {
          const totalMins = logs.reduce((sum: number, log: any) => sum + (log.duration_minutes || 0), 0)
          setTimeInvested(totalMins)
        }

      } catch (err: any) {
        console.error('Public fetch error:', err)
        setError('CLASSIFIED')
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchData()
  }, [id, supabase])

  const { progress, isInRedZone } = useMemo(() => calculateAccountability(goal), [goal])
  const completedCount = goal?.tasks?.filter((t: any) => t.is_completed).length || 0
  const totalCount = goal?.tasks?.length || 0
  const isSquad = goal?.metadata?.type === 'squad'
  const themeColor = '#f97316'

  const isRTL = useMemo(() => {
    if (typeof window !== 'undefined') {
      if (document.dir === 'rtl' || document.documentElement.lang === 'ar' || document.documentElement.dir === 'rtl') {
        return true
      }
    }
    if (goal?.title && /[\u0600-\u06FF]/.test(goal.title)) {
      return true
    }
    return false
  }, [goal])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center font-space text-white/50 tracking-widest text-sm uppercase animate-pulse">
        LOADING SIGNAL...
      </div>
    )
  }

  if (error || !goal) {
    console.log('Showing private because:', 
      'is_public =', goal?.is_public,
      'condition result =', !goal?.is_public)
//     /*
//     return (
//       <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center font-space relative overflow-hidden">
//         {/* Simple grid background */}
//         <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-20" />
//         
//         <motion.div
//           initial={{ opacity: 0, scale: 0.95, y: 10 }}
//           animate={{ opacity: 1, scale: 1, y: 0 }}
//           className="w-full max-w-lg bg-black/80 border border-[#FF0055]/30 backdrop-blur-xl p-8 md:p-12 rounded-2xl shadow-[0_0_50px_rgba(255,0,85,0.15)] relative z-10"
//         >
//           <div className="absolute top-0 inset-x-0 h-1 bg-[#FF0055]" />
//           <div className="flex flex-col items-center gap-6">
//             <Lock className="text-5xl text-[#FF0055] animate-pulse w-12 h-12" />
//             <div className="space-y-2">
//               <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-[#FF0055]">
//                 CLASSIFIED_GOAL // ACCESS DENIED
//               </h2>
//               <p className="text-xs md:text-sm font-bold text-zinc-400 max-w-sm leading-relaxed">
//                 This goal does not exist or is not public.
//               </p>
//             </div>
//             <button
//               onClick={() => router.push('/')}
//               className="mt-4 flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-teal-500/50 hover:border-teal-400 text-teal-400 hover:text-teal-300 bg-teal-500/5 hover:bg-teal-500/10 font-space text-xs font-black uppercase tracking-widest transition-all duration-300"
//             >
//               <Home className="text-base w-4 h-4" />
//               RETURN TO BASE
//             </button>
//           </div>
//         </motion.div>
//       </div>
//     )
//     */

    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center font-space relative overflow-hidden bg-[radial-gradient(ellipse_at_50%_30%,rgba(249,115,22,0.06)_0%,transparent_70%)]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-10" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-md bg-white/[0.02] border border-white/10 backdrop-blur-xl p-8 md:p-10 rounded-2xl relative z-10 space-y-6"
        >
          <div className="flex flex-col items-center gap-5">
            <Lock size={48} className="text-teal-400" />
            <div className="space-y-2">
              <h2 className="text-xl md:text-2xl font-semibold text-white">
                {isRTL ? "هذا الهدف خاص" : "This goal is private"}
              </h2>
              <p className="text-sm text-white/50 max-w-xs leading-relaxed mx-auto">
                {isRTL ? "اطلب من صاحب الهدف يشاركك رابط الدعوة" : "Ask the goal owner to share an invite link with you."}
              </p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="mt-2 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-semibold text-sm transition-all duration-300 shadow-lg shadow-orange-500/20 active:scale-[0.98]"
            >
              {isRTL ? "الرئيسية" : "Go Home"}
            </button>
          </div>
        </motion.div>
      </div>
    )
  }


//   /*
//   return (
//     <div className="min-h-screen bg-[#050505] text-white selection:bg-teal-500/30 relative overflow-x-hidden font-space pb-32">
//       {/* Neural Grid Background */}
//       <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
//       <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,#1a1a1a_0%,#050505_100%)] pointer-events-none" />
// 
//       <div className="relative z-10 max-w-[800px] mx-auto pt-8 md:pt-16 px-4 md:px-8 space-y-12">
//         {/* Top Header Logo */}
//         <div className="flex justify-center">
//           <div className="px-4 py-1 border border-white/10 rounded-full bg-white/5 backdrop-blur-md flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.02)]">
//             <span className="w-2 h-2 rounded-full" style={{ backgroundColor: themeColor, boxShadow: `0 0 10px ${themeColor}` }} />
//             <span className="text-[10px] font-black tracking-[0.3em] uppercase opacity-80">GROWTH_HUB</span>
//           </div>
//         </div>
// 
//         {/* Goal Hero Section */}
//         <div className="flex flex-col items-center text-center space-y-6">
//           <h1 className="text-3xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter leading-tight break-words max-w-full drop-shadow-2xl">
//             {goal.title}
//           </h1>
//           
//           <div className="flex items-center gap-3 bg-white/5 border border-white/10 pr-4 pl-1.5 py-1.5 rounded-full backdrop-blur-sm">
//             {goal.profiles?.avatar_url ? (
//               <img src={goal.profiles.avatar_url} alt="Owner" className="w-8 h-8 rounded-full border border-white/20 object-cover" />
//             ) : (
//               <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
//                 <User className="text-[16px] opacity-50" />
//               </div>
//             )}
//             <div className="flex flex-col items-start text-left">
//               <span className="text-[11px] font-bold uppercase tracking-wider">{goal.profiles?.full_name || 'UNKNOWN OPERATOR'}</span>
//               <span className="text-[9px] font-black tracking-[0.2em] text-white/50 uppercase flex items-center gap-1">
//                 <Shield className="text-[10px]" />
//                 {goal.profiles?.rank || 'ROOKIE'}
//               </span>
//             </div>
//           </div>
//         </div>
// 
//         {/* Crystal & Progress */}
//         <div className="flex flex-col items-center justify-center py-8 relative">
//           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-gradient-to-tr from-transparent via-teal-500/5 to-transparent rounded-full blur-3xl opacity-50 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle, ${themeColor}15 0%, transparent 70%)` }} />
//           
//           <ProgressCup percentage={progress} isInRedZone={isInRedZone} />
//           
//           <div className="w-full max-w-sm h-[2px] bg-white/10 mt-12 relative rounded-full overflow-hidden">
//             <motion.div
//               initial={{ width: 0 }}
//               animate={{ width: `${Math.round(progress)}%` }}
//               transition={{ duration: 1, ease: 'easeOut' }}
//               className="absolute top-0 left-0 h-full rounded-full"
//               style={{ backgroundColor: themeColor, boxShadow: `0 0 15px ${themeColor}` }}
//             />
//           </div>
//         </div>
// 
//         {/* Stats Row */}
//         <div className="grid grid-cols-3 gap-2 md:gap-4 p-4 md:p-6 rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-md shadow-xl">
//           <div className="flex flex-col items-center text-center space-y-1 border-r border-white/10">
//             <CheckSquare className="text-lg mb-1 w-[18px] h-[18px]" style={{ color: themeColor }} />
//             <span className="text-xl md:text-2xl font-black">{totalCount}</span>
//             <span className="text-[8px] md:text-[9px] uppercase tracking-[0.2em] opacity-40 font-bold">Total Tasks</span>
//           </div>
//           <div className="flex flex-col items-center text-center space-y-1 border-r border-white/10">
//             <HelpCircle />
//             <span className="text-xl md:text-2xl font-black">{completedCount}</span>
//             <span className="text-[8px] md:text-[9px] uppercase tracking-[0.2em] opacity-40 font-bold">Completed</span>
//           </div>
//           <div className="flex flex-col items-center text-center space-y-1">
//             <HelpCircle />
//             <span className="text-xl md:text-2xl font-black">{Math.floor(timeInvested / 60)}h {timeInvested % 60}m</span>
//             <span className="text-[8px] md:text-[9px] uppercase tracking-[0.2em] opacity-40 font-bold">Invested</span>
//           </div>
//         </div>
// 
//         {/* Squad Stack */}
//         {isSquad && members.length > 0 && (
//           <div className="flex flex-col items-center gap-3 py-4">
//             <span className="text-[10px] font-black tracking-[0.3em] uppercase opacity-50 text-center">SQUAD DEPLOYED</span>
//             <div className="flex items-center justify-center -space-x-3">
//               {members.slice(0, 5).map((m, i) => (
//                 <div key={m.id || i} className="relative group cursor-default">
//                   {m.avatar_url ? (
//                     <img src={m.avatar_url} alt={m.full_name} className="w-10 h-10 rounded-full border-2 border-[#050505] object-cover relative z-10" />
//                   ) : (
//                     <div className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-[#050505] flex items-center justify-center relative z-10">
//                       <span className="text-xs font-bold">{m.full_name?.charAt(0) || '?'}</span>
//                     </div>
//                   )}
//                   {/* Tooltip */}
//                   <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-white/10 backdrop-blur-md rounded border border-white/20 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
//                     {m.full_name}
//                   </div>
//                 </div>
//               ))}
//               {members.length > 5 && (
//                 <div className="w-10 h-10 rounded-full bg-white/10 border-2 border-[#050505] flex items-center justify-center relative z-10 backdrop-blur-sm">
//                   <span className="text-xs font-black">+{members.length - 5}</span>
//                 </div>
//               )}
//             </div>
//           </div>
//         )}
// 
//         {/* Tasks List */}
//         <div className="space-y-4">
//           <h3 className="text-[10px] font-black tracking-[0.5em] uppercase opacity-50 border-b border-white/10 pb-2 mb-4">MISSION LOG</h3>
//           <AnimatePresence>
//             {(goal.tasks || []).map((task: any, index: number) => (
//               <motion.div
//                 key={task.id}
//                 initial={{ opacity: 0, y: 10 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 className={cn(
//                   "flex items-center gap-4 p-4 md:p-5 border rounded-xl shadow-sm space-y-0",
//                   task.is_completed 
//                     ? "bg-white/[0.01] border-white/[0.05] opacity-40" 
//                     : "bg-white/[0.03] border-white/10"
//                 )}
//               >
//                 {/* Index & Status */}
//                 <div className="flex items-center gap-3 shrink-0">
//                   <span className="font-black text-[11px] text-white/20 w-5 text-right">
//                     {String(index + 1).padStart(2, '0')}
//                   </span>
//                   <div 
//                     className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
//                     style={{
//                       borderColor: task.is_completed ? themeColor : 'rgba(255,255,255,0.1)',
//                       backgroundColor: task.is_completed ? themeColor : 'transparent'
//                     }}
//                   >
//                     {task.is_completed && <Check className="text-black text-sm font-black w-3.5 h-3.5" />}
//                   </div>
//                 </div>
// 
//                 {/* Title */}
//                 <div className="flex-1 min-w-0">
//                   <span className={cn(
//                     "text-base md:text-[17px] font-bold tracking-tight uppercase block truncate",
//                     task.is_completed ? "line-through opacity-70" : "text-white"
//                   )}>
//                     {task.title}
//                   </span>
//                 </div>
//               </motion.div>
//             ))}
//             {(!goal.tasks || goal.tasks.length === 0) && (
//               <div className="text-center py-8 opacity-30 text-xs tracking-widest font-bold">
//                 NO TASKS FOUND
//               </div>
//             )}
//           </AnimatePresence>
//         </div>
// 
//       </div>
// 
//       {/* Sticky Footer CTA */}
//       <div className="fixed bottom-0 inset-x-0 p-6 md:p-8 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent z-50 flex flex-col items-center justify-end pointer-events-none">
//         <div className="pointer-events-auto flex flex-col items-center gap-3 max-w-sm w-full">
//           <p className="text-[10px] uppercase font-bold tracking-widest opacity-40 text-center">
//             This goal was shared from Growth Hub
//           </p>
//           <button
//             onClick={() => router.push('/')}
//             className="w-full px-6 py-4 rounded-xl font-black uppercase tracking-[0.2em] text-xs transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-2xl flex items-center justify-center gap-2 group border"
//             style={{
//               backgroundColor: themeColor,
//               color: '#050505',
//               borderColor: `${themeColor}40`,
//               boxShadow: `0 10px 40px -10px ${themeColor}`
//             }}
//           >
//             <Zap className="" />
//             JOIN GROWTH HUB
//             <ArrowRight className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
//           </button>
  const formatRank = (rank: string) => {
    if (!rank) return isRTL ? 'مبتدئ' : 'Rookie'
    return rank.charAt(0).toUpperCase() + rank.slice(1).toLowerCase()
  }

  const radius = 50
  const strokeWidth = 8
  const circumference = 2 * Math.PI * radius
  const safeProgress = Math.min(Math.max(progress, 0), 100)
  const strokeDashoffset = circumference - (safeProgress / 100) * circumference

  const allTasks = goal.tasks || []
  const visibleTasks = allTasks.slice(0, 5)
  const hasMoreTasks = allTasks.length > 5

  return (
    <div 
      className="min-h-screen bg-[#0D0D0D] text-white selection:bg-orange-500/30 relative overflow-x-hidden font-space pb-32 bg-[radial-gradient(ellipse_at_50%_30%,rgba(249,115,22,0.06)_0%,transparent_70%)]"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="relative z-10 max-w-[640px] mx-auto pt-16 md:pt-24 px-4 md:px-6 space-y-10">
        
        <div className="flex justify-center">
          <div className="flex items-center justify-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-[11px] font-medium tracking-normal text-white/90">
              Growth Hub
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center text-center space-y-5">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight break-words max-w-full">
            {goal.title}
          </h1>
          
          <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 pr-3.5 pl-1.5 py-1.5 rounded-full backdrop-blur-sm">
            {goal.profiles?.avatar_url ? (
              <img src={goal.profiles.avatar_url} alt="Owner" className="w-7 h-7 rounded-full border border-white/20 object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                <User className="w-4 h-4 opacity-50" />
              </div>
            )}
            <div className="flex flex-col items-start text-left">
              <span className="text-xs font-medium text-white/90">
                {goal.profiles?.full_name || (isRTL ? 'مستخدم غير معروف' : 'Unknown User')}
              </span>
              <span className="text-[10px] text-white/50 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                {formatRank(goal.profiles?.rank)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-4 relative">
          <div className="relative w-[120px] h-[120px] flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-95">
              <circle
                cx="60"
                cy="60"
                r={radius}
                className="stroke-white/5"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke="#f97316"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-2xl font-bold text-white leading-none">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-0 p-4 rounded-xl border border-white/8 bg-white/5 backdrop-blur-md">
          <div className="flex flex-col items-center text-center space-y-0.5 border-r border-white/10">
            <span className="text-2xl font-bold text-white">{isSquad ? members.length : 1}</span>
            <span className="text-[10px] text-white/40 font-medium">
              {isRTL ? 'الأعضاء' : 'Members'}
            </span>
          </div>
          <div className="flex flex-col items-center text-center space-y-0.5 border-r border-white/10">
            <span className="text-2xl font-bold text-white">{totalCount}</span>
            <span className="text-[10px] text-white/40 font-medium">
              {isRTL ? 'المهام' : 'Tasks'}
            </span>
          </div>
          <div className="flex flex-col items-center text-center space-y-0.5">
            <span className="text-2xl font-bold text-white">{completedCount}</span>
            <span className="text-[10px] text-white/40 font-medium">
              {isRTL ? 'المكتملة' : 'Completed'}
            </span>
          </div>
        </div>

        {!isMember && (
          joinState === 'pending' ? (
            <div className="px-4 mt-6">
              <div className="w-full p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center gap-3">
                <Clock size={20} className="text-orange-400 shrink-0"/>
                <div>
                  <p className="text-sm font-medium text-white">
                    {isRTL ? "طلبك قيد المراجعة" : "Request pending"}
                  </p>
                  <p className="text-xs text-white/50 mt-0.5">
                    {isRTL 
                      ? "بتنتظر موافقة المشرف"
                      : "Waiting for admin approval"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-4 mt-6 mb-4">
              <button
                onClick={handleJoinGoal}
                className="w-full h-12 rounded-2xl bg-orange-500 hover:bg-orange-400 active:scale-[0.97] transition-all duration-150 text-white font-semibold text-sm flex items-center justify-center gap-2">
                {isRTL ? "انضم للهدف" : "Join Goal"}
              </button>
              
              {goal.requires_approval && (
                <p className="text-center text-xs text-white/40 mt-2">
                  {isRTL 
                    ? "يحتاج موافقة المشرف"
                    : "Requires admin approval"}
                </p>
              )}
            </div>
          )
        )}

        {isSquad && members.length > 0 && (
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="flex items-center justify-center -space-x-2.5">
              {members.slice(0, 5).map((m, i) => (
                <div key={m.id || i} className="relative group cursor-default">
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt={m.full_name} className="w-8 h-8 rounded-full border-2 border-[#050505] object-cover relative z-10" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-[#050505] flex items-center justify-center relative z-10">
                      <span className="text-xs font-bold">{m.full_name?.charAt(0) || '?'}</span>
                    </div>
                  )}
                </div>
              ))}
              {members.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-white/10 border-2 border-[#050505] flex items-center justify-center relative z-10 backdrop-blur-sm">
                  <span className="text-[10px] font-bold">+{members.length - 5}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-xs font-semibold tracking-wider text-white/40 border-b border-white/10 pb-1.5">
            {isRTL ? 'المهام' : 'Tasks'}
          </h3>
          <AnimatePresence>
            {visibleTasks.map((task: any, index: number) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex items-center gap-3.5 p-3.5 border rounded-xl space-y-0",
                  task.is_completed 
                    ? "bg-white/5 border-white/8 opacity-50" 
                    : "bg-white/5 border-white/8"
                )}
              >
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="font-bold text-[10px] text-white/20 w-4 text-right">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div 
                    className="w-5 h-5 rounded-full border flex items-center justify-center"
                    style={{
                      borderColor: task.is_completed ? '#06b6d4' : 'rgba(255,255,255,0.1)',
                      backgroundColor: task.is_completed ? 'rgba(6,182,212,0.1)' : 'transparent'
                    }}
                  >
                    {task.is_completed && <Check className="text-teal-400 w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <span className={cn(
                    "text-sm font-medium block truncate",
                    task.is_completed ? "line-through text-white/30" : "text-white"
                  )}>
                    {task.title}
                  </span>
                </div>
              </motion.div>
            ))}
            
            {hasMoreTasks && (
              <div className="pt-2 text-center">
                <div className="h-[1px] bg-white/10 mb-4 opacity-50" />
                <span className="text-xs text-white/50">
                  {isRTL ? 'سجل الدخول لرؤية باقي المهام...' : 'Sign in to view all tasks...'}
                </span>
              </div>
            )}

            {allTasks.length === 0 && (
              <div className="text-center py-6 text-xs text-white/30">
                {isRTL ? 'لا توجد مهام حالياً' : 'No tasks yet.'}
              </div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/*
      <div className="fixed bottom-0 inset-x-0 p-6 bg-[linear-gradient(to_top,#0D0D0D_50%,rgba(13,13,13,0.8)_75%,transparent_100%)] h-36 z-50 flex flex-col items-center justify-end pointer-events-none">
        <div className="pointer-events-auto flex flex-col items-center gap-2 max-w-sm w-full">
          <p className="text-[10px] font-medium tracking-normal text-white/40 text-center">
            {isRTL ? 'تمت مشاركته عبر Growth Hub' : 'Shared via Growth Hub'}
          </p>
          <button
            onClick={handleJoinGoal}
            className="w-full h-14 rounded-2xl bg-orange-500 hover:bg-orange-600 text-black font-semibold text-sm transition-all duration-300 shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
          >
            {isRTL ? 'انضم للهدف' : 'Join Goal'}
          </button>
        </div>
      </div>
      */}
    </div>
  )
}
