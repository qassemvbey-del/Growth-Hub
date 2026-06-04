'use server'

import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL

async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const adminEmail = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL
  
  console.log('AUTH_CHECK // USER_EMAIL:', user?.email)
  console.log('AUTH_CHECK // ADMIN_EMAIL:', adminEmail)

  if (!user || user.email?.toLowerCase() !== adminEmail?.toLowerCase()) {
    throw new Error('UNAUTHORIZED_ACCESS // ADMIN_ONLY')
  }
  return user
}

export async function getAdminStats() {
  await checkAdmin()
  const supabase = createAdminClient()

  // 1. Total Users
  const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true })

  // 2. Total Active Missions
  const { count: activeMissions } = await supabase.from('goals').select('*', { count: 'exact', head: true }).eq('is_archived', false).eq('sync_to_dashboard', true)

  // 3. Missions Completed Today
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const { count: completedToday } = await supabase
    .from('xp_logs')
    .select('*', { count: 'exact', head: true })
    .ilike('reason', 'MISSION_COMPLETE%')
    .gte('created_at', todayStart.toISOString())

  // 4. New Users (Today, Week, Month)
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const monthStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const { count: newToday } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString())
  const { count: newWeek } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekStart.toISOString())
  const { count: newMonth } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', monthStart.toISOString())

  // 5. Total XP
  const { data: xpData } = await supabase.from('profiles').select('xp')
  const totalXp = xpData?.reduce((acc, p) => acc + (p.xp || 0), 0) || 0

  // 6. Total Tasks Completed
  const { count: totalTasks } = await supabase.from('task_completion_log').select('*', { count: 'exact', head: true })

  // 7. Online Now (last 5 mins)
  const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000)
  const { count: onlineNow } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_seen', fiveMinsAgo.toISOString())

  return {
    totalUsers,
    activeMissions,
    completedToday,
    newToday,
    newWeek,
    newMonth,
    totalXp,
    totalTasks,
    onlineNow
  }
}

export async function getMemberRegistry() {
  await checkAdmin()
  const supabase = createAdminClient()

  // Fetch profiles
  const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
  
  // Fetch auth users to get emails
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers()

  // Fetch all missions to count
  const { data: missions } = await supabase.from('goals').select('id, user_id, status')
  
  const registry = profiles?.map(p => {
    const authUser = authUsers.find(u => u.id === p.id)
    const userMissions = missions?.filter(m => m.user_id === p.id) || []
    
    // Rank logic based on XP
    let rank = 'RECRUIT'
    const xp = p.xp || 0
    if (xp >= 1160) rank = 'CONQUEROR'
    else if (xp >= 180) rank = 'ACE'

    return {
      ...p,
      email: authUser?.email || 'OFFLINE_IDENTITY',
      rank,
      active_mission_count: userMissions.filter(m => m.status !== 'complete').length,
      completed_mission_count: userMissions.filter(m => m.status === 'complete').length,
      last_login: authUser?.last_sign_in_at
    }
  })

  return registry || []
}

export async function toggleBlockUser(userId: string, blocked: boolean) {
  await checkAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('profiles')
    .update({ blocked })
    .eq('id', userId)

  if (error) throw error
  return { success: true }
}

async function purgeUserDataCascading(supabaseAdmin: ReturnType<typeof createAdminClient>, userId: string) {
  // 1. Get all goal IDs
  const { data: goals, error: goalsError } = await supabaseAdmin
    .from('goals')
    .select('id')
    .eq('user_id', userId)

  if (goalsError) {
    console.error('PURGE_SEQUENCE // GET_GOALS_FAILED:', goalsError)
    throw goalsError
  }

  const goalIds = goals?.map(g => g.id) || []

  // 2. Delete attachments
  await supabaseAdmin.from('goal_attachments').delete().eq('user_id', userId)
  if (goalIds.length > 0) {
    await supabaseAdmin.from('goal_attachments').delete().in('goal_id', goalIds)
  }

  // 3. Delete inbox reports
  await supabaseAdmin.from('inbox_reports').delete().eq('user_id', userId)

  // 4. Delete squad join requests
  await supabaseAdmin.from('squad_join_requests').delete().eq('user_id', userId)
  if (goalIds.length > 0) {
    await supabaseAdmin.from('squad_join_requests').delete().in('goal_id', goalIds)
  }

  // 5. Delete notes
  await supabaseAdmin.from('notes').delete().eq('user_id', userId)
  if (goalIds.length > 0) {
    await supabaseAdmin.from('notes').delete().in('goal_id', goalIds)
  }

  // 6. Delete time logs
  await supabaseAdmin.from('time_logs').delete().eq('user_id', userId)
  if (goalIds.length > 0) {
    await supabaseAdmin.from('time_logs').delete().in('goal_id', goalIds)
  }

  // 7. Delete task completion log
  await supabaseAdmin.from('task_completion_log').delete().eq('user_id', userId)

  // 8. Delete task progress
  await supabaseAdmin.from('task_progress').delete().eq('user_id', userId)

  // 9. Nullify parent_id in tasks to break self-referential hierarchy, then delete tasks
  if (goalIds.length > 0) {
    await supabaseAdmin.from('tasks').update({ parent_id: null }).in('goal_id', goalIds)
    await supabaseAdmin.from('tasks').delete().in('goal_id', goalIds)
  }
  await supabaseAdmin.from('tasks').delete().eq('assigned_to', userId)

  // 10. Delete goal members
  await supabaseAdmin.from('goal_members').delete().eq('user_id', userId)
  if (goalIds.length > 0) {
    await supabaseAdmin.from('goal_members').delete().in('goal_id', goalIds)
  }

  // 11. Delete goals
  await supabaseAdmin.from('goals').delete().eq('user_id', userId)

  // 12. Delete rank up logs
  await supabaseAdmin.from('rank_up_logs').delete().eq('user_id', userId)

  // 13. Delete xp logs
  await supabaseAdmin.from('xp_logs').delete().eq('user_id', userId)

  // 14. Delete profiles
  const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', userId)
  if (profileError) {
    console.error('PURGE_SEQUENCE // PROFILE_DELETE_FAILED:', profileError)
    throw profileError
  }
}

export async function deleteUser(userId: string) {
  try {
    await checkAdmin()
    const supabase = createAdminClient()

    console.log('PURGE_SEQUENCE // INITIATED_FOR_MEMBER:', userId)

    // Commented out original RPC sequence:
    /*
    const { error: rpcError } = await supabase.rpc('purge_user_data', { target_user_id: userId })
    if (rpcError) {
      console.error('PURGE_SEQUENCE // DB_PURGE_FAILED:', rpcError)
      throw rpcError
    }
    */

    // Perform manual cascading deletes
    await purgeUserDataCascading(supabase, userId)

    // Delete from auth.users
    const { error } = await supabase.auth.admin.deleteUser(userId)
    
    if (error) {
      console.error('PURGE_SEQUENCE // AUTH_DELETE_FAILED:', error)
      throw error
    }

    console.log('PURGE_SEQUENCE // COMPLETE_FOR_MEMBER:', userId)
    return { success: true }
  } catch (error: any) {
    console.error('PURGE_SEQUENCE // SERVER_ACTION_ERROR:', error)
    return { success: false, error: error.message }
  }
}

export async function getRecentActivity() {
  await checkAdmin()
  const supabase = createAdminClient()

  const { data: logs } = await supabase
    .from('xp_logs')
    .select(`
      *,
      profiles (full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(20)

  return logs?.map(log => ({
    id: log.id,
    name: log.profiles?.full_name || 'UNKNOWN_MEMBER',
    type: 'XP_GAIN',
    content: { title: log.reason, amount: log.amount },
    timestamp: log.created_at
  })) || []
}

export async function getGoalAnalytics() {
  await checkAdmin()
  const supabase = createAdminClient()

  const { data: allMissions } = await supabase.from('goals').select('title, is_archived, tasks_count:tasks(count)')
  
  // Most common topics (basic implementation)
  const topics = allMissions?.reduce((acc: any, m) => {
    const title = m.title.toLowerCase()
    acc[title] = (acc[title] || 0) + 1
    return acc
  }, {})

  const topTopics = Object.entries(topics || {})
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 5)

  return {
    topTopics,
    avgCompletion: 75, // Placeholder or calculated from archived/total
    totalMissions: allMissions?.length || 0
  }
}

export async function deleteOwnAccount() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('UNAUTHORIZED_ACCESS // NOT_LOGGED_IN')
    }

    const userId = user.id
    const supabaseAdmin = createAdminClient()

    console.log('SELF_DESTRUCTION_SEQUENCE // INITIATED_BY_USER:', userId)

    // Commented out original RPC sequence:
    /*
    const { error: rpcError } = await supabaseAdmin.rpc('purge_user_data', { target_user_id: userId })
    if (rpcError) {
      console.error('SELF_DESTRUCTION_SEQUENCE // DB_PURGE_FAILED:', rpcError)
      throw rpcError
    }
    */

    // Perform manual cascading deletes
    await purgeUserDataCascading(supabaseAdmin, userId)

    // Final Boss: Delete from auth.users
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (error) {
      console.error('SELF_DESTRUCTION_SEQUENCE // AUTH_DELETE_FAILED:', error)
      throw error
    }

    console.log('SELF_DESTRUCTION_SEQUENCE // COMPLETE_FOR_USER:', userId)
    return { success: true }
  } catch (error: any) {
    console.error('SELF_DESTRUCTION_SEQUENCE // SERVER_ACTION_ERROR:', error)
    return { success: false, error: error.message }
  }
}
