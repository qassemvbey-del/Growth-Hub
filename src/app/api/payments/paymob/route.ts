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

    // Sanitize env variables
    const apiKey = process.env.PAYMOB_API_KEY?.trim()
    const integrationId = process.env.PAYMOB_INTEGRATION_ID?.trim()

    if (!apiKey || !integrationId) {
      console.error('Paymob V1: Missing PAYMOB_API_KEY or PAYMOB_INTEGRATION_ID')
      return NextResponse.json({ error: 'Payment gateway configuration missing' }, { status: 500 })
    }

    const normalizedPlanId = String(planId).toLowerCase()
    let amountCents = 0
    if (normalizedPlanId === 'pro') amountCents = 6000
    else if (normalizedPlanId === 'elite') amountCents = 11500
    else if (normalizedPlanId === 'refill') amountCents = 1500
    else return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 })

    // STEP 1: Authentication
    const authRes = await fetch('https://accept.paymob.com/api/auth/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey })
    })
    if (!authRes.ok) throw new Error(`V1 Auth Failed: ${await authRes.text()}`)
    const authData = await authRes.json()
    const authToken = authData.token

    // STEP 2: Order Registration
    const orderRes = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authToken,
        delivery_needed: "false",
        amount_cents: amountCents.toString(),
        currency: "EGP",
        items: [] 
      })
    })
    if (!orderRes.ok) throw new Error(`V1 Order Failed: ${await orderRes.text()}`)
    const orderData = await orderRes.json()
    const orderId = orderData.id

    // STEP 3: Payment Key Generation
    const keyRes = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authToken,
        amount_cents: amountCents.toString(),
        expiration: 3600,
        order_id: orderId.toString(),
        billing_data: {
          apartment: "NA", email: user.email || "user@growthhub.com", floor: "NA",
          first_name: "Growth", street: "NA", building: "NA", phone_number: "+201000000000",
          shipping_method: "NA", postal_code: "NA", city: "NA", country: "EG",
          last_name: "User", state: "NA"
        },
        currency: "EGP",
        integration_id: Number(integrationId)
      })
    })
    if (!keyRes.ok) throw new Error(`V1 Payment Key Failed: ${await keyRes.text()}`)
    const keyData = await keyRes.json()
    const paymentToken = keyData.token

    // THE BYPASS: Send V1 Token to V2 Unified Checkout directly
    return NextResponse.json({
      url: `https://accept.paymob.com/unifiedcheckout/?payment_token=${paymentToken}`
    })

  } catch (err: any) {
    console.error('Paymob V1 Bypass Exception:', err.message)
    return NextResponse.json({ error: err.message || 'Internal payment error' }, { status: 500 })
  }
}
