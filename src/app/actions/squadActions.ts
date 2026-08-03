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

    if (!rpcError && rpcData && rpcData.success) {
      return { success: true, ...rpcData }
    }

    // Fallback using Admin client if RPC is not deployed yet or encounters an issue
    const adminSupabase = createAdminClient()

    const { data: goal, error: goalError } = await adminSupabase
      .from('goals')
      .select('id, user_id, is_public, requires_approval, general_access, metadata')
      .eq('id', goalId)
      .maybeSingle()

    if (goalError || !goal) {
      return { success: false, error: 'GOAL_NOT_FOUND' }
    }

    const isPublicAccess =
      goal.general_access === 'anyone_with_link' ||
      (goal.is_public === true && goal.requires_approval === false) ||
      (goal.metadata && (goal.metadata as any).general_access === 'anyone_with_link')

    if (!isPublicAccess) {
      return { success: false, error: 'ACCESS_RESTRICTED', goal }
    }

    if (goal.user_id === user.id) {
      return { success: true, status: 'OWNER', role: 'owner' }
    }

    // Check existing membership
    const { data: member } = await adminSupabase
      .from('goal_members')
      .select('id, role')
      .eq('goal_id', goalId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (member) {
      return { success: true, status: 'ALREADY_MEMBER', role: member.role }
    }

    // Auto-join user
    const { error: insertError } = await adminSupabase
      .from('goal_members')
      .insert({
        goal_id: goalId,
        user_id: user.id,
        role: 'member',
        joined_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Auto-join insert error:', insertError)
      return { success: false, error: insertError.message }
    }

    return { success: true, status: 'JOINED', role: 'member' }
  } catch (err: any) {
    console.error('checkAndAutoJoinSquadGoal Error:', err)
    return { success: false, error: err.message || String(err) }
  }
}
