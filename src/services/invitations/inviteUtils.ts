import { Platform } from 'react-native';
import { Share } from 'react-native';

/**
 * Resolves the canonical base URL for invitations.
 * 1. If EXPO_PUBLIC_INVITE_BASE_URL is set in .env / Expo config, use that.
 * 2. In browser environments where window is available and not localhost:8081, use window.location.origin.
 * 3. In web development, defaults to the current web host (e.g. http://localhost:8081).
 * 4. In native mobile without a custom domain, uses the native deep link scheme 'settle://'.
 */
export function getInviteBaseUrl(): string {
  // 1. Explicit configuration from environment
  const configuredBaseUrl = process.env.EXPO_PUBLIC_INVITE_BASE_URL;
  if (configuredBaseUrl && configuredBaseUrl.trim() !== '') {
    return configuredBaseUrl.trim().replace(/\/+$/, '');
  }

  // 2. Web window location origin if available
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  // 3. Native mobile fallback scheme
  return 'settle://';
}

/**
 * Builds the canonical invite URL given a secure backend token or code.
 * The canonical route is `/invite/<tokenOrCode>`.
 */
export function buildInviteUrl(tokenOrCode: string): string {
  const base = getInviteBaseUrl();
  const cleanIdentifier = encodeURIComponent((tokenOrCode || '').trim());

  if (base.endsWith('://')) {
    // Custom native URI scheme: settle://invite/<token>
    return `${base}invite/${cleanIdentifier}`;
  }

  // HTTP/HTTPS Web URL: http://localhost:8081/invite/<token> or https://custom-domain.com/invite/<token>
  return `${base}/invite/${cleanIdentifier}`;
}

/**
 * Copies plain text to clipboard across Web, iOS, and Android.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback or native support via global document/navigator
    if (typeof document !== 'undefined') {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

export interface ShareInviteOptions {
  groupName: string;
  inviterName?: string;
  inviteTokenOrCode: string;
  inviteCode?: string;
}

/**
 * Invokes native OS share sheet (WhatsApp, Telegram, Messages, Mail, etc.)
 */
export async function shareGroupInvite(options: ShareInviteOptions): Promise<boolean> {
  const { groupName, inviterName, inviteTokenOrCode } = options;
  const inviteUrl = buildInviteUrl(inviteTokenOrCode);
  const inviter = inviterName ? inviterName : 'A group member';

  const title = `Join ${groupName} on Settle`;
  const message = `🧾 ${inviter} added you to ${groupName} on Settle.\n\nTrack expenses, see exactly what you owe, and settle everything without doing the math.\n\n👉 Join ${groupName}:\n${inviteUrl}`;

  try {
    // On web with navigator.share
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title,
          text: message,
          url: inviteUrl,
        });
        return true;
      } catch (webErr: any) {
        if (webErr.name === 'AbortError') return false; // User cancelled share
        // Fallback to React Native Share
      }
    }

    const result = await Share.share(
      {
        title,
        message,
        url: inviteUrl,
      },
      {
        dialogTitle: `Invite friends to ${groupName}`,
        subject: `Invitation to join ${groupName} on Settle`,
      }
    );

    return result.action === Share.sharedAction;
  } catch (err) {
    console.error('Failed to invoke native share sheet:', err);
    return false;
  }
}
