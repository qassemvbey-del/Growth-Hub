import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function TestMindmapIndexPage() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // 1. Check if user has an existing active goal in Supabase
      const { data: existingGoal } = await supabase
        .from('goals')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingGoal?.id) {
        redirect(`/goals/test-mindmap/${existingGoal.id}`)
      }

      // 2. Create a test goal directly in Supabase database
      const { data: newGoal } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          title: 'Mindmap Test Goal',
          description: 'Interactive Board / Map View Test Canvas',
          category: 'DEVELOPMENT',
          size: 'medium',
          status: 'in_progress',
          metadata: { type: 'solo', color: '#10B981' }
        })
        .select()
        .single()

      if (newGoal?.id) {
        await supabase.from('tasks').insert([
          { goal_id: newGoal.id, title: 'Explore Map View Canvas', weight: 3, is_completed: false, type: 'standard', metadata: { subtasks: [{ id: 'st1', title: 'Click + Insert to add cards', is_completed: true }] } },
          { goal_id: newGoal.id, title: 'Connect Checklist & Notes', weight: 2, is_completed: false, type: 'standard', metadata: {} },
          { goal_id: newGoal.id, title: 'Drag nodes & adjust layout', weight: 1, is_completed: true, type: 'standard', metadata: {} }
        ])

        redirect(`/goals/test-mindmap/${newGoal.id}`)
      }
    }
  } catch (e) {
    // Fallback if unauthenticated
  }

  redirect('/goals/test-mindmap/local_demo')
}
