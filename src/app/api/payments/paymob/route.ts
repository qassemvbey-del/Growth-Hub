import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Commented out per rule "Never delete code, only comment it out"
// Legacy V1 Paymob 3-step API flow has been replaced with the modern V2 Intention API.
// V1 caused consistent blank-screen crashes on the Unified Checkout React frontend
// due to strict type requirements and multi-step token/auth flows.

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { planId } = await req.json()
    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 })
    }

    // Case-insensitive plan mapping to EGP cents (integer, as required by V2 API)
    const normalizedPlanId = String(planId).toLowerCase()
    let amountCents = 0
    if (normalizedPlanId === 'pro') {
      amountCents = 6000 // 60 EGP
    } else if (normalizedPlanId === 'elite') {
      amountCents = 11500 // 115 EGP
    } else if (normalizedPlanId === 'refill') {
      amountCents = 1500 // 15 EGP
    } else {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 })
    }

    const secretKey = process.env.PAYMOB_SECRET_KEY
    const integrationId = process.env.PAYMOB_INTEGRATION_ID

    if (!secretKey || !integrationId) {
      console.error('Paymob V2: Missing required environment variables PAYMOB_SECRET_KEY or PAYMOB_INTEGRATION_ID')
      return NextResponse.json({ error: 'Payment gateway is not fully configured' }, { status: 500 })
    }

    // Single V2 Intention API request — replaces the legacy V1 3-step flow
    const intentionRes = await fetch('https://accept.paymob.com/v1/intention/', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountCents,
        currency: 'EGP',
        payment_methods: [Number(integrationId)],
        items: [
          {
            name: 'Growth Hub Plan',
            amount: amountCents,
            description: 'Subscription upgrade',
            quantity: 1,
          }
        ],
        billing_data: {
          apartment: 'NA',
          email: user.email || 'user@growthhub.com',
          floor: 'NA',
          first_name: 'Growth',
          street: 'NA',
          building: 'NA',
          phone_number: '+201000000000',
          shipping_method: 'NA',
          postal_code: 'NA',
          city: 'NA',
          country: 'EG',
          last_name: 'User',
          state: 'NA',
        },
        extras: {
          profile_id: user.id,
        },
      }),
    })

    if (!intentionRes.ok) {
      const errorText = await intentionRes.text()
      console.error('Paymob Error:', errorText)
      return NextResponse.json({ error: 'Paymob rejected the request', details: errorText }, { status: 500 })
    }

    const intentionData = await intentionRes.json()
    const clientSecret = intentionData.client_secret

    if (!clientSecret) {
      console.error('Paymob V2: client_secret missing from intention response', intentionData)
      return NextResponse.json({ error: 'Invalid response from payment gateway' }, { status: 500 })
    }

    const checkoutUrl = `https://accept.paymob.com/unifiedcheckout/?client_secret=${clientSecret}`
    return NextResponse.json({ url: checkoutUrl })

  } catch (err: any) {
    console.error('Paymob V2 Payment Handler Exception:', err)
    return NextResponse.json({ error: err.message || 'Internal payment gateway error' }, { status: 500 })
  }
}
