import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Commented out per rule "Never delete code, only comment it out"
// export async function POST() {
//   return NextResponse.json(
//     { message: 'Payment gateway is being reconfigured. Please check back soon.' },
//     { status: 200 }
//   )
// }

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

    const secretKey = process.env.PAYMOB_SECRET_KEY
    const integrationId = process.env.PAYMOB_INTEGRATION_ID

    if (!secretKey || !integrationId) {
      console.error('Paymob V2: Missing required environment variables PAYMOB_SECRET_KEY or PAYMOB_INTEGRATION_ID')
      return NextResponse.json({ error: 'Payment gateway is not fully configured' }, { status: 500 })
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

    const paymobRes = await fetch('https://accept.paymob.com/api/v1/intention/', {
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
        },
        extras: {
          profile_id: user.id,
          plan_id: planId
        }
      })
    })

    if (!paymobRes.ok) {
      const errorText = await paymobRes.text()
      console.error('Paymob Error:', errorText)
      return NextResponse.json({ error: 'Paymob rejected the request', details: errorText }, { status: 500 })
    }

    const data = await paymobRes.json()
    return NextResponse.json({
      url: 'https://accept.paymob.com/unifiedcheckout/?client_secret=' + data.client_secret
    })
  } catch (err: any) {
    console.error('Paymob V2 Payment Handler Exception:', err)
    return NextResponse.json({ error: err.message || 'Internal payment gateway error' }, { status: 500 })
  }
}
