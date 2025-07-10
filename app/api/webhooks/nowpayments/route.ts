// app/api/webhooks/nowpayments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { useDirectus } from '@/lib/directus/directus'
import { createItem } from '@directus/sdk'
import {
  verifyWebhookSignature,
  sendPaymentConfirmationEmail,
  sendPaymentFailureEmail,
  handlePartialPayment,
  mapPaymentStatus
} from '@/lib/api/nowpayments'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-nowpayments-sig')
    
    console.log('=== NOWPAYMENTS WEBHOOK DEBUG ===')
    console.log('Received webhook with signature:', !!signature)
    console.log('Webhook body:', body)
    
    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      console.error('Webhook signature verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    
    const payload = JSON.parse(body)
    const {
      payment_id,
      payment_status,
      order_id,
      order_description,
      price_amount,
      price_currency,
      pay_amount,
      pay_currency,
      actually_paid,
      outcome_amount,
      outcome_currency
    } = payload
    
    console.log('Processing webhook for payment:', {
      payment_id,
      payment_status,
      order_id,
      order_description,
      price_amount,
      price_currency,
      timestamp: new Date().toISOString()
    })
    
    // Handle different payment statuses
    switch (payment_status) {
      case 'finished':
      case 'confirmed':
        await handlePaymentSuccess(payment_id, payload)
        break
      case 'failed':
      case 'expired':
        await handlePaymentFailure(payment_id, payload)
        break
      case 'partially_paid':
        await handlePartialPayment(order_id, payment_id, payload)
        break
      case 'waiting':
      case 'confirming':
        await handlePaymentPending(payment_id, payload)
        break
      default:
        console.log(`Unhandled payment status: ${payment_status}`)
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handlePaymentSuccess(paymentId: string, payload: any) {
  console.log(`Payment success for payment: ${paymentId}`)
  
  try {
    const { directus } = useDirectus()
    const adminToken = process.env.DIRECTUS_ADMIN_TOKEN
    
    if (!adminToken) {
      console.error('DIRECTUS_ADMIN_TOKEN not configured')
      return
    }

    // For hosted payments, we need to store the payment record
    // and potentially trigger lore submission processing
    
    // Create payment record in Directus
    await directus.request(
      createItem('payments', {
        payment_id: paymentId,
        status: 'completed',
        amount: payload.price_amount,
        currency: payload.price_currency,
        pay_amount: payload.actually_paid || payload.pay_amount,
        pay_currency: payload.pay_currency,
        payment_method: 'crypto',
        provider: 'nowpayments',
        provider_data: JSON.stringify(payload),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    )
    
    console.log(`Payment record created for payment: ${paymentId}`)
    
    // Send confirmation email
    await sendPaymentConfirmationEmail(payload.order_id || paymentId)
    
  } catch (error) {
    console.error('Error handling payment success:', error)
  }
}

async function handlePaymentFailure(paymentId: string, payload: any) {
  console.log(`Payment failure for payment: ${paymentId}`)
  
  try {
    const { directus } = useDirectus()
    const adminToken = process.env.DIRECTUS_ADMIN_TOKEN
    
    if (!adminToken) {
      console.error('DIRECTUS_ADMIN_TOKEN not configured')
      return
    }

    // Create/update payment record with failed status
    await directus.request(
      createItem('payments', {
        payment_id: paymentId,
        status: 'failed',
        amount: payload.price_amount,
        currency: payload.price_currency,
        payment_method: 'crypto',
        provider: 'nowpayments',
        provider_data: JSON.stringify(payload),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    )
    
    console.log(`Failed payment record created for payment: ${paymentId}`)
    
    // Send failure notification
    await sendPaymentFailureEmail(payload.order_id || paymentId)
    
  } catch (error) {
    console.error('Error handling payment failure:', error)
  }
}

async function handlePaymentPending(paymentId: string, payload: any) {
  console.log(`Payment pending for payment: ${paymentId}, status: ${payload.payment_status}`)
  
  try {
    const { directus } = useDirectus()
    const adminToken = process.env.DIRECTUS_ADMIN_TOKEN
    
    if (!adminToken) {
      console.error('DIRECTUS_ADMIN_TOKEN not configured')
      return
    }

    const internalStatus = mapPaymentStatus(payload.payment_status)
    
    // Create/update payment record with pending status
    await directus.request(
      createItem('payments', {
        payment_id: paymentId,
        status: internalStatus,
        amount: payload.price_amount,
        currency: payload.price_currency,
        payment_method: 'crypto',
        provider: 'nowpayments',
        provider_data: JSON.stringify(payload),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    )
    
    console.log(`Pending payment record created for payment: ${paymentId}`)
    
  } catch (error) {
    console.error('Error handling payment pending:', error)
  }
}