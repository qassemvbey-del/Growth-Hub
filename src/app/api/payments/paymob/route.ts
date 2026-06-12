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

    // Commented out per rule "Never delete code, only comment it out"
    // // Map plans to EGP cents
    // let amountCents = 0
    // if (planId === 'pro') {
    //   amountCents = 6000 // 60 EGP
    // } else if (planId === 'elite') {
    //   amountCents = 11500 // 115 EGP
    // } else if (planId === 'refill') {
    //   amountCents = 1500 // 15 EGP
    // } else {
    //   return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 })
    // }

    // Case-Insensitive Mapping
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

    const paymobApiKey = process.env.PAYMOB_API_KEY
    const hmacSecret = process.env.PAYMOB_HMAC_SECRET
    const integrationId = process.env.PAYMOB_INTEGRATION_ID
    // Commented out per rule "Never delete code, only comment it out"
    // const integrationId = process.env.PAYMOB_CARD_INTEGRATION_ID
    // Commented out per rule "Never delete code, only comment it out"
    // const iframeId = process.env.PAYMOB_IFRAME_ID

    // Commented out per rule "Never delete code, only comment it out"
    // if (!paymobApiKey || !integrationId || !iframeId) {
    //   return NextResponse.json({ error: 'Paymob parameters are not fully configured' }, { status: 500 })
    // }
    // Commented out per rule "Never delete code, only comment it out"
    // if (!paymobApiKey || !integrationId) {
    //   return NextResponse.json({ error: 'Paymob parameters are not fully configured' }, { status: 500 })
    // }
    if (!paymobApiKey || !hmacSecret || !integrationId) {
      return NextResponse.json({ error: 'Paymob parameters are not fully configured' }, { status: 500 })
    }

    // 1. Get Auth Token from Paymob
    const authRes = await fetch('https://accept.paymob.com/api/auth/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: paymobApiKey })
    })

    if (!authRes.ok) {
      const errorText = await authRes.text()
      console.error('Paymob Auth Request Failed:', errorText)
      return NextResponse.json({ error: 'Paymob authentication gateway failure' }, { status: 500 })
    }

    const authData = await authRes.json()
    const authToken = authData.token

    // 2. Register Order (Use a unique merchant_order_id)
    const uniqueOrderId = `${user.id}-${Date.now()}`
    const orderRes = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authToken,
        // Commented out per rule "Never delete code, only comment it out"
        // delivery_needed: false,
        delivery_needed: 'false',
        // Commented out per rule "Never delete code, only comment it out"
        // amount_cents: amountCents,
        amount_cents: String(amountCents),
        currency: 'EGP',
        merchant_order_id: uniqueOrderId,
        // Commented out per rule "Never delete code, only comment it out"
        // items: []
        items: [
          {
            name: 'Growth Hub Subscription',
            amount_cents: String(amountCents),
            description: 'Plan Upgrade',
            quantity: '1'
          }
        ]
      })
    })

    if (!orderRes.ok) {
      const errorText = await orderRes.text()
      console.error('Paymob Order Registration Failed:', errorText)
      return NextResponse.json({ error: 'Paymob order generation failure' }, { status: 500 })
    }

    const orderData = await orderRes.json()
    const paymobOrderId = orderData.id

    // 3. Generate Payment Key
    const keyRes = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authToken,
        // Commented out per rule "Never delete code, only comment it out"
        // amount_cents: String(amountCents),
        amount_cents: amountCents,
        expiration: 3600,
        order_id: paymobOrderId,
        // Commented out per rule "Never delete code, only comment it out"
        // billing_data: {
        //   apartment: 'NA',
        //   email: user.email || 'operator@playgrowthhub.com',
        //   floor: 'NA',
        //   first_name: user.user_metadata?.first_name || 'Operator',
        //   street: 'NA',
        //   building: 'NA',
        //   phone_number: user.phone || '+201000000000',
        //   shipping_method: 'NA',
        //   postal_code: 'NA',
        //   city: 'Cairo',
        //   country: 'EG',
        //   last_name: user.user_metadata?.last_name || 'Member',
        //   state: 'Cairo'
        // },
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
          state: 'NA'
        },
        currency: 'EGP',
        // Commented out per rule "Never delete code, only comment it out"
        // integration_id: Number(integrationId),
        integration_id: Number(process.env.PAYMOB_INTEGRATION_ID),
        lock_order_when_paid: true,
        extra_data: {
          profile_id: user.id
        }
      })
    })

    if (!keyRes.ok) {
      const errorText = await keyRes.text()
      console.error('Paymob Payment Key Generation Failed:', errorText)
      return NextResponse.json({ error: 'Paymob transaction key generation failure' }, { status: 500 })
    }

    const keyData = await keyRes.json()
    const paymentToken = keyData.token

    // Commented out per rule "Never delete code, only comment it out"
    // const checkoutUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentToken}`
    const checkoutUrl = `https://accept.paymob.com/unifiedcheckout/?payment_token=${paymentToken}`
    return NextResponse.json({ url: checkoutUrl })
  } catch (err: any) {
    console.error('Paymob Payment Initialization Handler Exception:', err)
    return NextResponse.json({ error: err.message || 'Internal payment gateway error' }, { status: 500 })
  }
}
