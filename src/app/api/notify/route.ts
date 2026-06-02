import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { targetUserId, type, title, contentText, taskId, taskTitle, senderId, senderName, goalId, cupId, isSquad } = await request.json()

    if (!targetUserId) {
      return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false
      }
    })

    const { data, error } = await supabaseAdmin.from('inbox_reports').insert({
      user_id: targetUserId,
      type: 'daily_brief',
      title,
      content: {
        text: contentText,
        notification_type: type,
        task_id: taskId,
        task_title: taskTitle,
        sender_id: senderId,
        sender_name: senderName,
        // cup_id: cupId,
        goal_id: goalId || cupId,
        isSquad
      }
    }).select().single()

    if (error) {
      console.error('Error inserting inbox report via admin client:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('Notify API Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
