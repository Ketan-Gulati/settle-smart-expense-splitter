import { env } from '../../config/env';
import { Logger } from '../../utils/logger';
import { ResendClient } from './resend.client';
import { EmailTemplateType, EmailVerificationOtpVariables, EmailTemplateRegistry } from './templates';

export class EmailService {
  /**
   * Dispatches an email using a Resend template if configured.
   * If a published template ID is configured, passes template.id and template.variables.
   * Otherwise falls back gracefully to formatted HTML in development.
   */
  public static async sendTemplateEmail<T extends EmailTemplateType>(
    to: string,
    templateType: T,
    variables: any,
    fallbackSubject: string,
    fallbackHtml: string
  ): Promise<{ messageId?: string; success: boolean }> {
    const resend = ResendClient.getInstance();
    const fromAddress = env.EMAIL_FROM;
    const templateId = EmailTemplateRegistry.getTemplateId(templateType);

    if (resend) {
      try {
        let payload: any;
        if (templateId) {
          payload = {
            from: fromAddress,
            to,
            template: {
              id: templateId,
              variables,
            },
          };
        } else {
          payload = {
            from: fromAddress,
            to,
            subject: fallbackSubject,
            html: fallbackHtml,
          };
        }

        let response = await resend.emails.send(payload);

        // If template ID failed (e.g. template ID not published on Resend yet), fallback to direct HTML
        if (response.error && templateId) {
          Logger.warn('Resend template dispatch failed, falling back to direct HTML delivery');
          response = await resend.emails.send({
            from: fromAddress,
            to,
            subject: fallbackSubject,
            html: fallbackHtml,
          });
        }

        if (response.error) {
          Logger.error('Resend provider returned error on email dispatch', {
            error: response.error,
            templateType,
          });
          return { success: false };
        }

        return { messageId: response.data?.id, success: true };
      } catch (err) {
        Logger.error('Exception during Resend email dispatch', {
          error: err instanceof Error ? err.message : String(err),
          templateType,
        });
        return { success: false };
      }
    } else {
      // In development when Resend is unconfigured, indicate email was sent without logging sensitive payloads
      console.log(`\n📧 [DEV EMAIL] To: ${to} | Subject: "${fallbackSubject}" (Template: ${templateType})\n`);
      return { success: true, messageId: `dev-mock-${Date.now()}` };
    }
  }

  /**
   * Sends an OTP verification email using the Resend template.
   */
  public static async sendOtpEmail(
    email: string,
    otp: string,
    firstName: string = 'Settle User',
    expiryMinutes: number = Math.round(env.AUTH_OTP_TTL_SECONDS / 60)
  ): Promise<{ success: boolean; messageId?: string }> {
    const variables: EmailVerificationOtpVariables = {
      FIRST_NAME: firstName,
      OTP: otp,
      EXPIRY_MINUTES: String(expiryMinutes),
    };

    const fallbackSubject = 'Your Settle verification code';
    const fallbackHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background-color: #0A0F1D; color: #FFFFFF; border-radius: 16px; border: 1px solid #1E293B;">
        <div style="margin-bottom: 24px;">
          <h1 style="color: #6366F1; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">Settle</h1>
        </div>
        <h2 style="font-size: 20px; font-weight: 600; color: #FFFFFF; margin-top: 0;">Your verification code</h2>
        <p style="font-size: 15px; line-height: 24px; color: #94A3B8;">
          Hello ${firstName}, use the 6-digit code below to verify your account:
        </p>
        <div style="margin: 28px 0; padding: 20px; background-color: #1E293B; border-radius: 12px; text-align: center; letter-spacing: 8px;">
          <span style="font-family: monospace, Courier; font-size: 32px; font-weight: 700; color: #38BDF8;">${otp}</span>
        </div>
        <p style="font-size: 14px; color: #94A3B8; margin-top: 16px;">
          This code expires in <strong>${expiryMinutes} minutes</strong>.
        </p>
        <p style="font-size: 13px; color: #64748B; margin-top: 24px; border-top: 1px solid #334155; padding-top: 16px;">
          If you didn't request this code, you can safely ignore this email. Never share this code with anyone.
        </p>
      </div>
    `;

    return this.sendTemplateEmail(
      email,
      EmailTemplateType.EMAIL_VERIFICATION_OTP,
      variables,
      fallbackSubject,
      fallbackHtml
    );
  }

  /**
   * Sends an account verification link email.
   */
  public static async sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
    const verifyUrl = `${env.FRONTEND_URL}/auth/verify-email?token=${encodeURIComponent(token)}`;
    const subject = 'Verify your Settle account';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background-color: #0A0F1D; color: #FFFFFF; border-radius: 16px;">
        <div style="margin-bottom: 24px;">
          <h1 style="color: #6366F1; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">Settle</h1>
        </div>
        <h2 style="font-size: 20px; font-weight: 600; color: #FFFFFF; margin-top: 0;">Verify your email address</h2>
        <p style="font-size: 15px; line-height: 24px; color: #94A3B8;">
          Welcome to Settle, ${name}. Verify your email to finish setting up your account and start managing shared expenses.
        </p>
        <div style="margin: 32px 0;">
          <a href="${verifyUrl}" style="background-color: #6366F1; color: #FFFFFF; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; display: inline-block;">
            Verify Email
          </a>
        </div>
        <p style="font-size: 13px; color: #64748B; margin-top: 24px;">
          This link will expire in 24 hours. If you did not create a Settle account, you can safely ignore this email.
        </p>
      </div>
    `;

    const resend = ResendClient.getInstance();
    if (resend) {
      try {
        await resend.emails.send({
          from: env.EMAIL_FROM,
          to: email,
          subject,
          html,
        });
      } catch (err) {
        Logger.error('Failed to send verification email via Resend', { error: err });
      }
    } else {
      console.log(`\n📧 [DEV EMAIL] To: ${email} | Subject: "${subject}"\n🔗 Verify URL: ${verifyUrl}\n`);
    }
  }

  /**
   * Sends a password reset email with a secure reset link.
   */
  public static async sendPasswordResetEmail(email: string, name: string, token: string): Promise<void> {
    const resetUrl = `${env.FRONTEND_URL}/auth/reset-password?token=${encodeURIComponent(token)}`;
    const subject = 'Reset your Settle password';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background-color: #0A0F1D; color: #FFFFFF; border-radius: 16px;">
        <div style="margin-bottom: 24px;">
          <h1 style="color: #6366F1; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">Settle</h1>
        </div>
        <h2 style="font-size: 20px; font-weight: 600; color: #FFFFFF; margin-top: 0;">Reset your password</h2>
        <p style="font-size: 15px; line-height: 24px; color: #94A3B8;">
          Hello ${name}, we received a request to reset your Settle password. Tap the button below to choose a new one:
        </p>
        <div style="margin: 32px 0;">
          <a href="${resetUrl}" style="background-color: #6366F1; color: #FFFFFF; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="font-size: 13px; color: #64748B; margin-top: 24px;">
          This link expires in 1 hour. If you didn't ask to reset your password, please ignore this email.
        </p>
      </div>
    `;

    const resend = ResendClient.getInstance();
    if (resend) {
      try {
        await resend.emails.send({
          from: env.EMAIL_FROM,
          to: email,
          subject,
          html,
        });
      } catch (err) {
        Logger.error('Failed to send password reset email via Resend', { error: err });
      }
    } else {
      console.log(`\n📧 [DEV EMAIL] To: ${email} | Subject: "${subject}"\n🔗 Reset URL: ${resetUrl}\n`);
    }
  }
}
