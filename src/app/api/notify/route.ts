import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ALLOWED_TYPES = new Set(['mention', 'reaction'])

export async function POST(request: Request) {
  try {
    // 1. Require a logged-in user
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse and validate request body
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const {
      targetUserId,
      type,
      title,
      contentText,
      taskId,
      taskTitle,
      goalId,
      cupId,
      isSquad
    } = body || {}

    if (!targetUserId || typeof targetUserId !== 'string' || targetUserId === 'guest' || !UUID_REGEX.test(targetUserId)) {
      return NextResponse.json({ error: 'Missing or invalid targetUserId' }, { status: 400 })
    }

    // Allowed notification types: 'mention' | 'reaction'
    if (!type || typeof type !== 'string' || !ALLOWED_TYPES.has(type)) {
      return NextResponse.json({ error: 'Invalid or missing notification type' }, { status: 400 })
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0 || title.length > 120) {
      return NextResponse.json(
        { error: 'Title is required and must not exceed 120 characters' },
        { status: 400 }
      )
    }

    const text = typeof contentText === 'string' ? contentText : (typeof body.text === 'string' ? body.text : '')
    if (!text || text.trim().length === 0 || text.length > 500) {
      return NextResponse.json(
        { error: 'Text is required and must not exceed 500 characters' },
        { status: 400 }
      )
    }

    // Validate taskId if present
    if (taskId !== undefined && taskId !== null && taskId !== '') {
      if (typeof taskId !== 'string' || !UUID_REGEX.test(taskId)) {
        return NextResponse.json({ error: 'Invalid taskId format' }, { status: 400 })
      }
    }
    const validTaskId = (taskId && typeof taskId === 'string' && UUID_REGEX.test(taskId)) ? taskId : null

    // Validate goalId / cupId if present
    const rawGoalId = goalId || cupId
    if (rawGoalId !== undefined && rawGoalId !== null && rawGoalId !== '') {
      if (typeof rawGoalId !== 'string' || !UUID_REGEX.test(rawGoalId)) {
        return NextResponse.json({ error: 'Invalid goalId format' }, { status: 400 })
      }
    }

    // Limit taskTitle to 200 characters (cut longer text)
    const validTaskTitle = typeof taskTitle === 'string' ? taskTitle.slice(0, 200) : null

    // 3. Sender is the authenticated user; read sender name from sender's profile
    const supabaseAdmin = createAdminClient()
    const senderId = user.id

    const { data: senderProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', senderId)
      .maybeSingle()

    const senderName = senderProfile?.full_name || 'Operator'

    // 4. Verify sender and target share a goal (both are owner or members of the same goal)
    const [senderGoals, senderMemberships] = await Promise.all([
      supabaseAdmin.from('goals').select('id').eq('user_id', senderId),
      supabaseAdmin.from('goal_members').select('goal_id').eq('user_id', senderId)
    ])

    const senderGoalIds = Array.from(new Set([
      ...(senderGoals.data || []).map((g) => g.id),
      ...(senderMemberships.data || []).map((m) => m.goal_id)
    ]))

    if (senderGoalIds.length === 0) {
      return NextResponse.json({ error: 'Forbidden: No shared goals' }, { status: 403 })
    }

    const [targetOwned, targetMemberships] = await Promise.all([
      supabaseAdmin.from('goals').select('id').eq('user_id', targetUserId).in('id', senderGoalIds).limit(1),
      supabaseAdmin.from('goal_members').select('goal_id').eq('user_id', targetUserId).in('goal_id', senderGoalIds).limit(1)
    ])

    const sharesGoal = Boolean(
      (targetOwned.data && targetOwned.data.length > 0) ||
      (targetMemberships.data && targetMemberships.data.length > 0)
    )

    if (!sharesGoal) {
      return NextResponse.json({ error: 'Forbidden: Sender and target do not share a goal' }, { status: 403 })
    }

    // goalId must also be one of the goals the sender is in (senderGoalIds); otherwise store null
    const validGoalId = (rawGoalId && typeof rawGoalId === 'string' && senderGoalIds.includes(rawGoalId)) ? rawGoalId : null

    // 5. Insert notification into inbox_reports
    const { data, error } = await supabaseAdmin.from('inbox_reports').insert({
      user_id: targetUserId,
      type: 'daily_brief',
      title: title.trim(),
      content: {
        text: text.trim(),
        notification_type: type,
        task_id: validTaskId,
        task_title: validTaskTitle,
        sender_id: senderId,
        sender_name: senderName,
        goal_id: validGoalId,
        isSquad: Boolean(isSquad)
      }
    }).select().single()

    if (error) {
      console.error('Error inserting inbox report via admin client:', error)
      return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('Notify API Error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
