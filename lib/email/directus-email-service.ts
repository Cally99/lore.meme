/**
 * Directus Email Service
 * Handles sending emails through Directus using the SDK
 */

import { createDirectus, rest, staticToken } from '@directus/sdk';
import { generatePasswordResetEmailHTML, generatePasswordResetEmailText, EMAIL_CONFIG, type PasswordResetEmailData } from './templates';
import { authLogger } from '@/lib/monitoring/logger';

// Create a server-side Directus client with admin token
function createDirectusEmailClient() {
  const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL as string;
  const adminToken = process.env.DIRECTUS_ADMIN_TOKEN as string;
  
  if (!directusUrl || !adminToken) {
    throw new Error('Missing required environment variables for Directus email service');
  }
  
  return createDirectus(directusUrl)
    .with(rest())
    .with(staticToken(adminToken));
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
}

/**
 * Send email using Directus flows/operations
 * This uses Directus's built-in email functionality with custom templates
 */
export async function sendEmailViaDirectus(options: SendEmailOptions): Promise<boolean> {
  try {
    const client = createDirectusEmailClient();
    
    // Use Directus utils/send-email endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/utils/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DIRECTUS_ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        from: options.from || EMAIL_CONFIG.from,
        fromName: options.fromName || EMAIL_CONFIG.fromName,
        replyTo: options.replyTo || EMAIL_CONFIG.replyTo,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Directus email send failed:', response.status, errorData);
      return false;
    }

    console.log('✅ Email sent successfully via Directus');
    return true;
  } catch (error) {
    console.error('❌ Error sending email via Directus:', error);
    return false;
  }
}

/**
 * Generate a secure password reset token
 * In a real implementation, this should be cryptographically secure
 */
function generateResetToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Send password reset email using custom frontend template
 */
export async function sendPasswordResetEmail(
  userEmail: string, 
  resetUrl: string,
  expirationHours: number = 24
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    // Generate a secure reset token
    const resetToken = generateResetToken();
    
    // Prepare email data
    const emailData: PasswordResetEmailData = {
      resetToken,
      userEmail,
      resetUrl,
      expirationHours,
    };
    
    // Generate email content
    const htmlContent = generatePasswordResetEmailHTML(emailData);
    const textContent = generatePasswordResetEmailText(emailData);
    
    // Send email
    const emailSent = await sendEmailViaDirectus({
      to: userEmail,
      subject: EMAIL_CONFIG.subject,
      html: htmlContent,
      text: textContent,
      from: EMAIL_CONFIG.from,
      fromName: EMAIL_CONFIG.fromName,
      replyTo: EMAIL_CONFIG.replyTo,
    });
    
    if (!emailSent) {
      return { success: false, error: 'Failed to send email' };
    }
    
    return { success: true, token: resetToken };
  } catch (error) {
    console.error('❌ Error in sendPasswordResetEmail:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Send password reset email using Directus's built-in system
 * This properly uses Directus's token generation and email sending
 */
export async function sendCustomPasswordResetEmail(
  userEmail: string,
  resetUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = createDirectusEmailClient();
    
    // Use Directus's built-in password reset request
    // This will generate a token and send email automatically via Directus
    const resetResponse = await fetch(`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/auth/password/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DIRECTUS_ADMIN_TOKEN}`,
      },
      body: JSON.stringify({
        email: userEmail.toLowerCase(),
        reset_url: `${resetUrl}?email=${encodeURIComponent(userEmail)}`, // Include email in reset URL
      }),
    });

    if (!resetResponse.ok) {
      const errorData = await resetResponse.json().catch(() => ({}));
      console.error('❌ Directus password reset request failed:', resetResponse.status, errorData);
      
      // Handle user not found case
      if (resetResponse.status === 404) {
        // Still return success to prevent email enumeration
        return { success: true };
      }
      
      return { success: false, error: 'Failed to initiate password reset' };
    }

    console.log('✅ Directus password reset email sent successfully');
    
    // Log the successful request for monitoring
    authLogger.info('Password reset email sent via Directus', {
      email: userEmail.toLowerCase(),
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error('❌ Error in sendCustomPasswordResetEmail:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}