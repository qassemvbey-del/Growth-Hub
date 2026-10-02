import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import webpush from 'web-push'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

webpush.setVapidDetails(
  'mailto:your@email.com',
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
)

export async function POST(req: Request) {
  try {
    const pushSecret = process.env.PUSH_SECRET
    const incomingSecret = req.headers.get('x-push-secret')

    // Missing secret or env variable -> 403
    if (!pushSecret || !incomingSecret) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const pushSecretBuffer = Buffer.from(pushSecret)
    const incomingSecretBuffer = Buffer.from(incomingSecret)

    if (
      pushSecretBuffer.length !== incomingSecretBuffer.length ||
      !crypto.timingSafeEqual(pushSecretBuffer, incomingSecretBuffer)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { userId, title, body: pushBody, url } = body || {}

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Relative path starting with "/" (not "//")
    let targetUrl = '/'
    if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\')) {
      targetUrl = url
    }

    const supabaseAdmin = createAdminClient()

    // Fetch user subscriptions
    const { data: subscriptions, error: fetchError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('user_id', userId)

    if (fetchError) {
      console.error('Failed to fetch push subscriptions:', fetchError)
      return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, message: 'No subscriptions found for user' })
    }

    const payload = JSON.stringify({
      title: title || 'Growth Hub',
      body: pushBody || '',
      url: targetUrl
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
            await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
          }
          return { id: sub.id, success: false, error: 'Failed to send notification' }
        }
      })
    )

    return NextResponse.json({ success: true, results })
  } catch (err: any) {
    console.error('PUSH_ROUTE_ERROR:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
