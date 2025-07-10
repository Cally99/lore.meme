import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paymentId = params.id

    const response = await fetch(`https://api-sandbox.nowpayments.io/v1/payment/${paymentId}`, {
      method: 'GET',
      headers: {
        'x-api-key': process.env.NOWPAYMENTS_API_KEY!,
      },
    })

    if (!response.ok) {
      throw new Error(`NowPayments API error: ${response.status}`)
    }

    const result = await response.json()
    return NextResponse.json(result)

  } catch (error) {
    console.error('Error fetching payment status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment status' },
      { status: 500 }
    )
  }
}