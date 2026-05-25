'use client'

import { HelpCircle, TrendingUp, User } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useGrowth } from '@/context/GrowthContext'
import { useRouter } from 'next/navigation'
import { 
  getAdminStats, 
  getMemberRegistry, 
  toggleBlockUser, 
  deleteUser, 
  getRecentActivity,
  getGoalAnalytics 
} from '@/app/actions/adminActions'

export default function AdminDashboard() {
  const { profile, isLoading: profileLoading } = useGrowth()
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [checking, setChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState<'users' | 'analytics' | 'activity'>('users')

  useEffect(() => {
    if (profileLoading) return
    
    const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'qassemvbey@gmail.com').toLowerCase().trim()
    const userEmail = profile?.email?.toLowerCase().trim()
    
    console.log('ADMIN_CHECK // ATTEMPT:', { userEmail, adminEmail })

    if (userEmail && adminEmail && userEmail === adminEmail) {
      console.log('ADMIN_CHECK // SUCCESS')
      setIsAdmin(true)
      loadData()
    } else {
      if (!isAdmin && !checking) { // Only redirect if we are sure
         console.error('ADMIN_CHECK // FAILED: Unauthorized')
         router.push('/')
      }
    }
    
    setChecking(false)
  }, [profileLoading, profile])

  const loadData = async () => {
    try {
      setDataLoading(true)
      const [s, u, a, an] = await Promise.all([
        getAdminStats(),
        getMemberRegistry(),
        getRecentActivity(),
        getGoalAnalytics()
      ])
      setStats(s)
      setUsers(u)
      setActivity(a)
      setAnalytics(an)
    } catch (err) {
      console.error('ADMIN_LOAD_ERROR:', err)
      router.push('/')
    } finally {
      setDataLoading(false)
    }
  }

  const handleToggleBlock = async (userId: string, isBlocked: boolean) => {
    if (!confirm(`Confirm ${isBlocked ? 'BLOCK' : 'UNBLOCK'} operation for member ${userId}?`)) return
    await toggleBlockUser(userId, isBlocked)
    loadData()
  }

  const handleDelete = async (userId: string) => {
    if (!confirm(`WARNING: Permanent deletion of member ${userId} and all associated data? This cannot be undone.`)) return
    await deleteUser(userId)
    loadData()
  }

  if (profileLoading || checking || dataLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center font-space">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-2 border-red-500/20 border-t-red-600 rounded-full animate-spin" />
          <p className="text-red-500 text-xs font-black tracking-[0.3em] animate-pulse uppercase">LOADING_ADMIN_DASHBOARD...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-[#050505] text-white font-space pb-20 overflow-x-hidden">
      {/* Background FX */}
      <div className="fixed inset-0 pointer-events-none z-0 scanlines opacity-[0.03]" />
      <div className="fixed inset-0 pointer-events-none z-0 cyber-grid opacity-[0.05]" />
      
      {/* Red Glow Header */}
      <div className="relative z-10 p-6 md:p-10 border-b border-red-500/20 bg-black/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 text-red-500 mb-1">
              <HelpCircle />
              <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase">ADMIN_CONTROL_CENTER</h1>
            </div>
            <p className="text-[10px] md:text-xs font-black tracking-[0.5em] text-red-500/40 uppercase">SYSTEM_OVERSIGHT // CLASSIFIED // LEVEL_BLACK</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[9px] text-white/30 font-black tracking-widest uppercase">ADMIN_IN_CHARGE</p>
              <p className="text-sm font-bold text-red-500">{profile?.full_name}</p>
            </div>
            <div className="w-12 h-12 border border-red-500/30 rounded-sm bg-red-500/10 flex items-center justify-center">
              <HelpCircle />
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-4 md:p-10 relative z-10 space-y-10">
        
        {/* STATS GRID */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="TOTAL_MEMBERS" value={stats?.totalUsers} icon="groups" trend="GROWTH_METRICS" />
          <StatsCard title="ACTIVE_GOALS" value={stats?.activeMissions} icon="target" />
          <StatsCard title="ONLINE_NOW" value={stats?.onlineNow} icon="sensors" isOnline />
          <StatsCard title="TOTAL_XP_GENERATED" value={stats?.totalXp?.toLocaleString()} icon="bolt" />
          
          <StatsCard title="NEW_TODAY" value={stats?.newToday} icon="today" color="red" />
          <StatsCard title="NEW_THIS_WEEK" value={stats?.newWeek} icon="calendar_view_week" />
          <StatsCard title="COMPLETED_TODAY" value={stats?.completedToday} icon="verified" />
          <StatsCard title="TASKS_EXECUTED" value={stats?.totalTasks} icon="task_alt" />
        </section>

        {/* TABS */}
        <div className="flex border-b border-white/5 gap-8">
          <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} label="MEMBER_REGISTRY" icon="badge" />
          <TabButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} label="GOAL_ANALYTICS" icon="analytics" />
          <TabButton active={activeTab === 'activity'} onClick={() => setActiveTab('activity')} label="RECENT_ACTIVITY" icon="history" />
        </div>

        {/* CONTENT AREA */}
        <div className="min-h-[500px]">
          <AnimatePresence mode="wait">
            {activeTab === 'users' && (
              <motion.div
                key="users"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="overflow-x-auto"
              >
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-red-500/30 bg-red-500/5">
                      <th className="p-4 text-[10px] font-black tracking-widest text-red-400 uppercase">MEMBER</th>
                      <th className="p-4 text-[10px] font-black tracking-widest text-red-400 uppercase">RANK/XP</th>
                      <th className="p-4 text-[10px] font-black tracking-widest text-red-400 uppercase">GOALS</th>
                      <th className="p-4 text-[10px] font-black tracking-widest text-red-400 uppercase">STATUS</th>
                      <th className="p-4 text-[10px] font-black tracking-widest text-red-400 uppercase">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                             <div className="relative">
                               <div className="w-10 h-10 bg-red-500/10 border border-white/10 rounded-sm flex items-center justify-center">
                                 <User className="text-red-500/50" />
                               </div>
                               {/* Status Dot */}
                               <div className={cn(
                                 "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#050505]",
                                 u.blocked ? "bg-red-600 shadow-[0_0_8px_#dc2626]" :
                                 isUserOnline(u.last_seen) ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-gray-500"
                               )} />
                             </div>
                             <div>
                               <p className="text-sm font-bold text-white leading-none">{u.full_name}</p>
                               <p className="text-[9px] text-white/30 font-mono mt-1">{u.email}</p>
                             </div>
                          </div>
                        </td>
                        <td className="p-4">
                           <div className="flex items-center gap-2">
                             <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-[9px] font-black text-red-400 rounded-sm uppercase tracking-tighter">
                               {u.rank}
                             </span>
                             <span className="text-[11px] font-mono text-white/60">{u.xp} XP</span>
                           </div>
                        </td>
                        <td className="p-4">
                           <div className="flex gap-4">
                             <div className="text-center">
                               <p className="text-[11px] font-bold text-white">{u.active_mission_count}</p>
                               <p className="text-[8px] text-white/20 font-black uppercase">ACTIVE</p>
                             </div>
                             <div className="text-center">
                               <p className="text-[11px] font-bold text-green-500">{u.completed_mission_count}</p>
                               <p className="text-[8px] text-white/20 font-black uppercase">DONE</p>
                             </div>
                           </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <p className="text-[9px] text-white/40 uppercase font-black">LAST_SEEN: {formatRelativeTime(u.last_seen)}</p>
                            <p className="text-[9px] text-white/20 uppercase font-black">CREATED: {new Date(u.created_at).toLocaleDateString()}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleToggleBlock(u.id, !u.blocked)}
                              className={cn(
                                "px-3 py-1.5 text-[9px] font-black tracking-widest uppercase transition-all rounded-sm",
                                u.blocked ? "bg-white/10 text-white hover:bg-white/20" : "bg-orange-600/20 text-orange-500 border border-orange-500/30 hover:bg-orange-600 hover:text-white"
                              )}
                            >
                              {u.blocked ? 'UNBLOCK' : 'BLOCK'}
                            </button>
                            <button 
                              onClick={() => handleDelete(u.id)}
                              className="px-3 py-1.5 bg-red-600/20 text-red-500 border border-red-500/30 hover:bg-red-600 hover:text-white text-[9px] font-black tracking-widest uppercase transition-all rounded-sm"
                            >
                              PURGE
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
              >
                <div className="bg-white/[0.02] border border-white/5 p-6 rounded-sm">
                  <h3 className="text-red-500 font-black text-xs tracking-widest uppercase mb-6 flex items-center gap-2">
                    <TrendingUp className="text-sm w-3.5 h-3.5" />
                    TOP_MISSION_VECTORS
                  </h3>
                  <div className="space-y-4">
                    {analytics?.topTopics.map(([topic, count]: any, i: number) => (
                      <div key={topic} className="flex items-center justify-between p-3 bg-black/40 border border-white/5">
                        <div className="flex items-center gap-3">
                          <span className="text-red-500/40 font-mono text-[10px]">0{i+1}</span>
                          <span className="text-sm font-bold uppercase">{topic}</span>
                        </div>
                        <span className="text-xs font-mono text-red-500">{count} UNITS</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white/[0.02] border border-white/5 p-6 rounded-sm">
                   <h3 className="text-red-500 font-black text-xs tracking-widest uppercase mb-6 flex items-center gap-2">
                    <HelpCircle />
                    SYSTEM_PERFORMANCE
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-black/40 border border-white/5 text-center">
                      <p className="text-2xl font-black text-white">75%</p>
                      <p className="text-[9px] text-white/30 font-black uppercase mt-1">AVG_COMPLETION</p>
                    </div>
                    <div className="p-4 bg-black/40 border border-white/5 text-center">
                      <p className="text-2xl font-black text-white">4.2</p>
                      <p className="text-[9px] text-white/30 font-black uppercase mt-1">TASKS_PER_MISSION</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'activity' && (
              <motion.div
                key="activity"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {activity.map((act, i) => (
                  <div key={act.id} className="flex items-center justify-between p-4 bg-white/[0.02] border-l-2 border-l-red-500 border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-sm text-red-500">
                          {act.type === 'mission_complete' ? 'verified' : act.type === 'task_complete' ? 'task_alt' : 'person_add'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-white/80">
                          <span className="font-black text-red-500 uppercase">{act.name}</span>
                          {" "}
                          {act.type === 'mission_complete' ? 'completed mission' : act.type === 'task_complete' ? 'completed task' : 'joined the system'}
                          {" "}
                          <span className="text-white font-bold">{act.content?.title || act.content?.mission_title || ''}</span>
                        </p>
                        <p className="text-[9px] text-white/20 uppercase font-black mt-1">
                          {new Date(act.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-red-500/50">LOG_ID: {act.id.slice(0,8)}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

function StatsCard({ title, value, icon, trend, isOnline, color = 'white' }: any) {
  return (
    <div className="relative group overflow-hidden">
      <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="p-6 bg-black/40 border border-red-500/20 backdrop-blur-sm rounded-sm relative">
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 border border-red-500/30 rounded-sm flex items-center justify-center bg-red-500/5">
            <span className="material-symbols-outlined text-red-500 text-xl">{icon}</span>
          </div>
          {isOnline && <div className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[8px] font-black tracking-widest border border-green-500/20 rounded-full animate-pulse">LIVE</div>}
        </div>
        <div>
          <h4 className="text-[10px] font-black tracking-[0.3em] text-white/40 uppercase mb-1">{title}</h4>
          <p className="text-2xl font-black text-white leading-none">
            {value ?? '---'}
          </p>
          {trend && <p className="text-[8px] text-red-500 font-black uppercase mt-2 tracking-widest">{trend}</p>}
        </div>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, label, icon }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 py-4 px-2 border-b-2 transition-all duration-300 relative",
        active ? "border-red-600 text-red-500" : "border-transparent text-white/30 hover:text-white/60"
      )}
    >
      {active && <div className="absolute inset-x-0 bottom-0 h-4 bg-red-600/10 blur-xl" />}
      <span className="material-symbols-outlined text-sm">{icon}</span>
      <span className="text-[10px] font-black tracking-[0.2em] uppercase">{label}</span>
    </button>
  )
}

function isUserOnline(lastSeen: string | null) {
  if (!lastSeen) return false
  const now = new Date().getTime()
  const last = new Date(lastSeen).getTime()
  return (now - last) < (5 * 60 * 1000)
}

function formatRelativeTime(dateString: string | null) {
  if (!dateString) return 'NEVER'
  const now = new Date().getTime()
  const then = new Date(dateString).getTime()
  const diff = now - then
  
  if (diff < 60000) return 'JUST_NOW'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m_AGO`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h_AGO`
  return new Date(dateString).toLocaleDateString()
}
