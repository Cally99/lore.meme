import crypto from 'crypto'

/**
 * Verify NowPayments webhook signature using HMAC-SHA512
 */
export function verifyWebhookSignature(body: string, signature: string | null): boolean {
  if (!signature) {
    console.error('No signature provided in webhook')
    return false
  }

  const secret = process.env.NOWPAYMENTS_IPN_SECRET
  if (!secret) {
    console.error('NOWPAYMENTS_IPN_SECRET not configured')
    return false
  }

  try {
    // Create HMAC-SHA512 hash of the body
    const expectedSignature = crypto
      .createHmac('sha512', secret)
      .update(body)
      .digest('hex')

    // Compare signatures (case-insensitive)
    const isValid = signature.toLowerCase() === expectedSignature.toLowerCase()
    
    if (!isValid) {
      console.error('Webhook signature mismatch:', {
        received: signature,
        expected: expectedSignature
      })
    }

    return isValid
  } catch (error) {
    console.error('Error verifying webhook signature:', error)
    return false
  }
}

/**
 * Send payment confirmation email (placeholder implementation)
 */
export async function sendPaymentConfirmationEmail(orderId: string): Promise<void> {
  console.log(`TODO: Send payment confirmation email for order ${orderId}`)
  // TODO: Implement email sending logic
}

/**
 * Send payment failure email (placeholder implementation)
 */
export async function sendPaymentFailureEmail(orderId: string): Promise<void> {
  console.log(`TODO: Send payment failure email for order ${orderId}`)
  // TODO: Implement email sending logic
}

/**
 * Handle partial payment (placeholder implementation)
 */
export async function handlePartialPayment(orderId: string, paymentId: string, payload: any): Promise<void> {
  console.log(`TODO: Handle partial payment for order ${orderId}, payment ${paymentId}`)
  // TODO: Implement partial payment handling logic
}

/**
 * Map NowPayments status to internal status
 */
export function mapPaymentStatus(nowpaymentsStatus: string): string {
  const statusMap: Record<string, string> = {
    'waiting': 'pending',
    'confirming': 'processing',
    'confirmed': 'completed',
    'finished': 'completed',
    'failed': 'failed',
    'refunded': 'refunded',
    'partially_paid': 'partial'
  }

  return statusMap[nowpaymentsStatus] || 'unknown'
}

/**
 * Generate a unique order ID for tracking payments
 */
export function generateOrderId(prefix: string = 'lore'): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}_${timestamp}_${random}`
}