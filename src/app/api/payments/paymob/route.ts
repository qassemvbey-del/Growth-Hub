import { NextResponse } from 'next/server'

// Paymob payment integration — temporary skeleton while the V2 Intention API
// configuration is being re-established. Full implementation coming soon.

export async function POST() {
  return NextResponse.json(
    { message: 'Payment gateway is being reconfigured. Please check back soon.' },
    { status: 200 }
  )
}
