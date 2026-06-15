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

    // Call Paymob V2 Intention API
    const paymobRes = await fetch('https://accept.paymob.com/v1/intention/', {
      method: 'POST',
      headers: {
        // 'Authorization': `Bearer ${secretKey}`,
        'Authorization': `Token ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountCents,
        currency: 'EGP',
        payment_methods: [5723859], // Hardcoded verified Online Card Integration ID
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

    // Direct correct redirect to standard unified checkout with snake_case parameter
    return NextResponse.json({
      url: `https://accept.paymob.com/unifiedcheckout/?client_secret=${data.client_secret}`
    })

  } catch (err: any) {
    console.error('Paymob V2 Rebuild Exception:', err.message)
    return NextResponse.json({ error: err.message || 'Internal payment error' }, { status: 500 })
  }
}

// ============================================================================
// COMMENTED OUT OLD V1 3-STEP FLOW (Adhering strictly to safety rules)
// ============================================================================
// export async function POST_V1(req: Request) {
//   try {
//     const supabase = await createClient()
//     const { data: { user } } = await supabase.auth.getUser()
// 
//     if (!user) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//     }
// 
//     const { planId } = await req.json()
//     if (!planId) return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 })
// 
//     // Must use the long V1 API Key (ZXlKa...) from Vercel
//     const apiKey = process.env.PAYMOB_API_KEY?.trim()
//     if (!apiKey) return NextResponse.json({ error: 'Missing PAYMOB_API_KEY' }, { status: 500 })
// 
//     const normalizedPlanId = String(planId).toLowerCase()
//     let amountCents = 0
//     if (normalizedPlanId === 'pro') amountCents = 6000
//     else if (normalizedPlanId === 'elite') amountCents = 11500
//     else if (normalizedPlanId === 'refill') amountCents = 1500
//     else return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 })
// 
//     // STEP 1: Authentication
//     const authRes = await fetch('https://accept.paymob.com/api/auth/tokens', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ api_key: apiKey })
//     })
//     if (!authRes.ok) throw new Error('V1 Auth step failed')
//     const authData = await authRes.json()
//     const authToken = authData.token
// 
//     // STEP 2: Order Registration
//     const orderRes = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         auth_token: authToken,
//         delivery_needed: "false",
//         amount_cents: amountCents.toString(),
//         currency: "EGP",
//         items: [
//           {
//             name: `Growth Hub ${planId.toUpperCase()} Plan`,
//             amount_cents: amountCents.toString(),
//             description: "Subscription upgrade",
//             quantity: "1"
//           }
//         ]
//       })
//     })
//     if (!orderRes.ok) throw new Error('V1 Order step failed')
//     const orderData = await orderRes.json()
//     const orderId = orderData.id
// 
//     // STEP 3: Payment Key Generation
//     const paymentKeyRes = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         auth_token: authToken,
//         amount_cents: amountCents.toString(),
//         expiration: 3600,
//         order_id: orderId,
//         billing_data: {
//           apartment: "NA", email: user.email || "user@growthhub.com", floor: "NA",
//           first_name: "Growth", street: "NA", building: "NA", phone_number: "+201000000000",
//           shipping_method: "NA", postal_code: "NA", city: "NA", country: "EG",
//           last_name: "User", state: "NA"
//         },
//         currency: "EGP",
//         integration_id: 5723859 // STRICTLY HARDCODED: The valid Online Card ID
//       })
//     })
//     if (!paymentKeyRes.ok) throw new Error('V1 Payment Key step failed')
//     const paymentKeyData = await paymentKeyRes.json()
//     const paymentToken = paymentKeyData.token
// 
//     // REDIRECT TO UNIFIED CHECKOUT
//     return NextResponse.json({
//       url: `https://accept.paymob.com/unifiedcheckout/?payment_token=${paymentToken}`
//     })
// 
//   } catch (err: any) {
//     console.error('Paymob V1 Exception:', err.message)
//     return NextResponse.json({ error: err.message || 'Internal payment error' }, { status: 500 })
//   }
// }
