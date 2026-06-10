import { createClient } from '@/lib/supabase'

export function useTrack() {
  const supabase = createClient()
  const track = async (
    event: string, 
    properties?: Record<string, any>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      console.log('CURRENT USER:', user?.id)
      if (!user) {
        console.log('TRACK SKIPPED: No authenticated user')
        return
      }
      console.log('TRACK CALLED:', event, properties)
      const { error } = await supabase.from('app_events').insert({
        user_id: user.id,
        event,
        page: typeof window !== 'undefined' ? window.location.pathname : '',
        properties: properties || {}
      })
      console.log('TRACK RESULT:', error)
    } catch (err) {
      console.error('Tracking failed:', err)
    }
  }
  return { track }
}
