/**
 * Email Template Utilities
 * Frontend-based email templates for Lore.meme
 */

export interface PasswordResetEmailData {
  resetToken: string;
  userEmail: string;
  resetUrl: string;
  expirationHours?: number;
}

/**
 * Generates HTML email template for password reset
 */
export function generatePasswordResetEmailHTML(data: PasswordResetEmailData): string {
  const { resetToken, resetUrl, expirationHours = 24 } = data;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your lore.meme password</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
      margin: 0; 
      padding: 0; 
      background-color: #f8f8f8; 
      line-height: 1.6;
    }
    .container { 
      max-width: 600px; 
      margin: 40px auto; 
      background-color: #ffffff; 
      border: 1px solid #e0e0e0; 
      border-radius: 8px; 
      overflow: hidden; 
    }
    .header { 
      padding: 20px; 
      text-align: center; 
      background-color: #ffffff; 
    }
    .header img { 
      max-width: 150px; 
      height: auto; 
    }
    .content { 
      padding: 30px; 
      color: #333333; 
    }
    .content h2 { 
      color: #111111; 
      margin-bottom: 20px; 
      font-size: 24px;
    }
    .content p {
      margin-bottom: 16px;
    }
    .button-container { 
      text-align: center; 
      margin: 30px 0; 
    }
    .button { 
      display: inline-block; 
      padding: 12px 25px; 
      background-color: #007bff; 
      color: #ffffff !important; 
      text-decoration: none; 
      border-radius: 5px; 
      font-weight: bold; 
      font-size: 16px;
    }
    .button:hover { 
      background-color: #0056b3; 
    }
    .footer { 
      padding: 20px; 
      text-align: center; 
      font-size: 12px; 
      color: #888888; 
      background-color: #f1f1f1; 
    }
    .warning { 
      background-color: #fff3cd; 
      border: 1px solid #ffeaa7; 
      padding: 15px; 
      border-radius: 5px; 
      margin: 20px 0; 
    }
    .security-note {
      background-color: #f8f9fa;
      border-left: 4px solid #007bff;
      padding: 15px;
      margin: 20px 0;
      font-size: 14px;
    }
    @media only screen and (max-width: 600px) {
      .container {
        margin: 20px;
        width: auto;
      }
      .content {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://lore.meme/Logo.png" alt="lore.meme Logo">
    </div>
    <div class="content">
      <h2>Reset your lore.meme password</h2>
      <p>Hello,</p>
      <p>We received a request to reset the password for your lore.meme account. If you did not make this request, please ignore this email and contact our support team if you have concerns.</p>
      <p>To reset your password, click the button below:</p>
      
      <div class="button-container">
        <a href="${resetUrl}?token=${resetToken}" class="button">Reset Your Password</a>
      </div>
      
      <div class="warning">
        <p><strong>Important:</strong> This link will expire in ${expirationHours} hours for security reasons.</p>
      </div>

      <div class="security-note">
        <p><strong>Security tip:</strong> If you didn't request this password reset, someone may be trying to access your account. Consider updating your password and enabling two-factor authentication.</p>
      </div>

      <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #007bff;">${resetUrl}?token=${resetToken}</p>
    </div>
    <div class="footer">
      <p>All the best,</p>
      <p><strong>The lore.meme Team</strong></p>
      <p>&copy; 2025 lore.meme. All rights reserved.</p>
      <p>This email was sent to you because a password reset was requested for your account.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generates plain text email template for password reset (fallback)
 */
export function generatePasswordResetEmailText(data: PasswordResetEmailData): string {
  const { resetToken, resetUrl, expirationHours = 24 } = data;
  
  return `
Reset your lore.meme password

Hello,

We received a request to reset the password for your lore.meme account. If you did not make this request, please ignore this email.

To reset your password, visit this link:
${resetUrl}?token=${resetToken}

Important: This link will expire in ${expirationHours} hours for security reasons.

If you didn't request this password reset, someone may be trying to access your account. Consider updating your password and enabling two-factor authentication.

All the best,
The lore.meme Team

© 2025 lore.meme. All rights reserved.
This email was sent to you because a password reset was requested for your account.
`;
}

/**
 * Email template configuration
 */
export const EMAIL_CONFIG = {
  from: 'dontreply@lore.meme',
  fromName: 'lore team',
  subject: 'Reset your lore.meme password',
  replyTo: 'support@lore.meme',
} as const;