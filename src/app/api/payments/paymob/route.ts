export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

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

    const secretKey = process.env.PAYMOB_SECRET_KEY?.trim()
    if (!secretKey) {
      console.error('Paymob V2: Missing PAYMOB_SECRET_KEY')
      return NextResponse.json({ error: 'Payment gateway configuration missing' }, { status: 500 })
    }

    // STRICT FAIL-SAFE: Fallback to the exact Integration ID if the Vercel env variable fails
    const rawIntegrationId = process.env.PAYMOB_INTEGRATION_ID?.trim() || "5723234"
    const integrationId = parseInt(rawIntegrationId, 10)

    if (isNaN(integrationId)) {
      console.error('Paymob V2: Integration ID is NaN')
      return NextResponse.json({ error: 'Invalid Integration ID format' }, { status: 500 })
    }

    const normalizedPlanId = String(planId).toLowerCase()
    let amountCents = 0
    if (normalizedPlanId === 'pro') {
      amountCents = 6000
    } else if (normalizedPlanId === 'elite') {
      amountCents = 11500
    } else if (normalizedPlanId === 'refill') {
      amountCents = 1500
    } else {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 })
    }

    const paymobRes = await fetch('https://accept.paymob.com/v1/intention/', {
      method: 'POST',
      headers: {
        // 'Authorization': `Token ${secretKey}`,
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountCents,
        currency: 'EGP',
        payment_methods: [integrationId],
        items: [
          {
            name: `Growth Hub ${planId.toUpperCase()} Plan`,
            amount: amountCents,
            description: "Subscription upgrade",
            quantity: 1
          }
        ],
        billing_data: {
          apartment: "NA", 
          email: user.email || "user@growthhub.com", 
          floor: "NA",
          first_name: "Growth", 
          street: "NA", 
          building: "NA", 
          phone_number: "+201000000000",
          shipping_method: "NA", 
          postal_code: "NA", 
          city: "NA", 
          country: "EG",
          last_name: "User", 
          state: "NA"
        }
      })
    })

    if (!paymobRes.ok) {
      const errorText = await paymobRes.text()
      console.error('V2 Intention Error Raw Response:', errorText)
      return NextResponse.json({ error: 'Paymob rejected the request', details: errorText }, { status: 500 })
    }

    const data = await paymobRes.json()
    
    if (!data.client_secret) {
      console.error('V2 Intention Error: No client_secret in response', data)
      return NextResponse.json({ error: 'Invalid gateway response' }, { status: 500 })
    }

    return NextResponse.json({
      url: `https://accept.paymob.com/unifiedcheckout/?client_secret=${data.client_secret}`
    })

  } catch (err: any) {
    console.error('Paymob V2 Final Exception:', err.message)
    return NextResponse.json({ error: err.message || 'Internal payment error' }, { status: 500 })
  }
}
