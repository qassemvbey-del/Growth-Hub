import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

export const dynamic = 'force-dynamic'

webpush.setVapidDetails(
  'mailto:your@email.com',
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
)

export async function POST(req: Request) {
  try {
    const { userId, title, body, url } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('PUSH_ROUTE_CRASH: Supabase environment variables are missing.')
      return NextResponse.json({ error: 'Supabase environment configuration is missing' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false
      }
    })

    // Fetch user subscriptions
    const { data: subscriptions, error: fetchError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('user_id', userId)

    if (fetchError) {
      console.error('Failed to fetch push subscriptions:', fetchError)
      return NextResponse.json({ error: 'Database fetch failed' }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, message: 'No subscriptions found for user' })
    }

    const payload = JSON.stringify({
      title: title || 'Growth Hub',
      body: body || '',
      url: url || '/'
    })

    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(sub.subscription, payload)
          return { id: sub.id, success: true }
        } catch (err: any) {
          console.error(`Failed to send push to subscription ${sub.id}:`, err)
          // If the subscription is expired/invalid (410 Gone / 404 Not Found), delete it
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log(`Deleting invalid push subscription: ${sub.id}`)
            await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
          }
          return { id: sub.id, success: false, error: err.message || String(err) }
        }
      })
    )

    return NextResponse.json({ success: true, results })
  } catch (err: any) {
    console.error('PUSH_ROUTE_ERROR:', err)
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
