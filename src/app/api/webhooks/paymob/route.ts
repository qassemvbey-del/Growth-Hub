import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createAdminClient } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  try {
    const url = new URL(req.url)
    const hmacParam = url.searchParams.get('hmac')
    const body = await req.json()

    if (!body || !body.obj) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const transaction = body.obj
    const secret = process.env.PAYMOB_HMAC_SECRET

    if (!secret) {
      return NextResponse.json({ error: 'Secret not configured' }, { status: 500 })
    }

    // Official Paymob HMAC Concatenation string construction
    // Keys in lexicographical order:
    // amount_cents, created_at, currency, error_occured, has_parent_transaction, id, integration_id, is_3d_secure, is_auth, is_capture, is_voided, order, owner, pending, source_data.pan, source_data.sub_type, source_data.type, success
    const orderId = transaction.order?.id || transaction.order
    const pan = transaction.source_data?.pan || ''
    const subType = transaction.source_data?.sub_type || ''
    const type = transaction.source_data?.type || ''

    const concatenatedString =
      String(transaction.amount_cents) +
      String(transaction.created_at) +
      String(transaction.currency) +
      String(transaction.error_occured) +
      String(transaction.has_parent_transaction) +
      String(transaction.id) +
      String(transaction.integration_id) +
      String(transaction.is_3d_secure) +
      String(transaction.is_auth) +
      String(transaction.is_capture) +
      String(transaction.is_voided) +
      String(orderId) +
      String(transaction.owner) +
      String(transaction.pending) +
      String(pan) +
      String(subType) +
      String(type) +
      String(transaction.success)

    const calculatedHmac = createHmac('sha256', secret)
      .update(concatenatedString)
      .digest('hex')

    // Verify HMAC matches the request parameter
    if (hmacParam !== calculatedHmac) {
      return NextResponse.json({ error: 'Signature mismatch' }, { status: 401 })
    }

    // Process only successful transactions
    if (transaction.success === true) {
      const amountCents = transaction.amount_cents
      const extraData = transaction.extra_data || {}
      
      // Extract profile ID from extra_data or order merchant order ID
      const profileId = extraData.profile_id || transaction.order?.merchant_order_id || transaction.merchant_order_id

      if (!profileId) {
        return NextResponse.json({ error: 'Profile ID not found in transaction' }, { status: 400 })
      }

      const supabase = createAdminClient()

      if (amountCents === 6000) {
        // PRO Plan (60 EGP)
        const { error } = await supabase
          .from('profiles')
          .update({ user_tier: 'pro' })
          .eq('id', profileId)
        if (error) throw error
      } else if (amountCents === 11500) {
        // ELITE Plan (115 EGP)
        const { error } = await supabase
          .from('profiles')
          .update({ user_tier: 'elite' })
          .eq('id', profileId)
        if (error) throw error
      } else if (amountCents === 1500) {
        // Instant AI Refill Pack (15 EGP)
        const { error } = await supabase
          .from('profiles')
          .update({
            ai_request_count: 0,
            last_ai_reset: new Date().toISOString()
          })
          .eq('id', profileId)
        if (error) throw error
      }
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err: any) {
    console.error('Paymob Webhook Error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
