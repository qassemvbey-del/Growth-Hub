'use server'

import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function checkAndAutoJoinSquadGoal(goalId: string) {
  try {
    if (!goalId || goalId.startsWith('local_')) {
      return { success: false, error: 'INVALID_GOAL_ID' }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'UNAUTHENTICATED' }
    }

    // Try using RPC first
    const { data: rpcData, error: rpcError } = await supabase.rpc('join_squad_by_link', {
      p_goal_id: goalId
    })

    if (rpcError) {
      return { success: false, error: rpcError.message }
    }
    return rpcData
  } catch (err: any) {
    console.error('checkAndAutoJoinSquadGoal Error:', err)
    return { success: false, error: err.message || String(err) }
  }
}
