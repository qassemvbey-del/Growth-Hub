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

    const normalizedPlanId = String(planId).toLowerCase()
    let amountCents = 0
    if (normalizedPlanId === 'pro') amountCents = 6000
    else if (normalizedPlanId === 'elite') amountCents = 11500
    else if (normalizedPlanId === 'refill') amountCents = 1500
    else return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 })

    const paymobRes = await fetch('https://accept.paymob.com/v1/intention/', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountCents,
        currency: 'EGP',
        // OMITTED: payment_methods array. Paymob will auto-resolve active methods.
        items: [
          {
            name: `Growth Hub ${planId.toUpperCase()} Plan`,
            amount: amountCents,
            description: "Subscription upgrade",
            quantity: 1
          }
        ],
        billing_data: {
          apartment: "NA", email: user.email || "user@growthhub.com", floor: "NA",
          first_name: "Growth", street: "NA", building: "NA", phone_number: "+201000000000",
          shipping_method: "NA", postal_code: "NA", city: "NA", country: "EG",
          last_name: "User", state: "NA"
        }
      })
    })

    if (!paymobRes.ok) {
      const errorText = await paymobRes.text()
      console.error('V2 Intention Error:', errorText)
      return NextResponse.json({ error: 'Paymob rejected the request', details: errorText }, { status: 500 })
    }

    const data = await paymobRes.json()
    return NextResponse.json({
      url: `https://accept.paymob.com/unifiedcheckout/?client_secret=${data.client_secret}`
    })

  } catch (err: any) {
    console.error('Paymob V2 Auto-Resolve Exception:', err.message)
    return NextResponse.json({ error: err.message || 'Internal payment error' }, { status: 500 })
  }
}
