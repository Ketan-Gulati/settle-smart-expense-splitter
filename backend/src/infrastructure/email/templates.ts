import { env } from '../../config/env';

export enum EmailTemplateType {
  EMAIL_VERIFICATION_OTP = 'EMAIL_VERIFICATION_OTP',
  PASSWORD_RESET_OTP = 'PASSWORD_RESET_OTP',
  WELCOME_EMAIL = 'WELCOME_EMAIL',
  GROUP_INVITATION = 'GROUP_INVITATION',
  SETTLEMENT_REMINDER = 'SETTLEMENT_REMINDER',
}

export interface EmailVerificationOtpVariables {
  FIRST_NAME: string;
  OTP: string;
  EXPIRY_MINUTES: string | number;
}

export type EmailTemplateVariables = {
  [EmailTemplateType.EMAIL_VERIFICATION_OTP]: EmailVerificationOtpVariables;
  [EmailTemplateType.PASSWORD_RESET_OTP]: { FIRST_NAME: string; OTP: string; EXPIRY_MINUTES: string | number };
  [EmailTemplateType.WELCOME_EMAIL]: { FIRST_NAME: string };
  [EmailTemplateType.GROUP_INVITATION]: { INVITER_NAME: string; GROUP_NAME: string; INVITE_URL: string };
  [EmailTemplateType.SETTLEMENT_REMINDER]: { PAYER_NAME: string; AMOUNT: string; GROUP_NAME: string };
};

export class EmailTemplateRegistry {
  /**
   * Resolves the published template ID from environment configuration.
   */
  public static getTemplateId(type: EmailTemplateType): string | null {
    switch (type) {
      case EmailTemplateType.EMAIL_VERIFICATION_OTP:
      case EmailTemplateType.PASSWORD_RESET_OTP:
        return env.RESEND_OTP_TEMPLATE_ID || null;
      default:
        return null;
    }
  }
}
