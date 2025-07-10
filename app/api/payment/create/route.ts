import { NextResponse } from 'next/server'

// This endpoint is deprecated - we now use NowPayments hosted solution
export async function POST() {
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated. Please use the hosted payment solution.',
      message: 'Payment creation is now handled through NowPayments hosted widget.'
    },
    { status: 410 } // Gone
  )
}