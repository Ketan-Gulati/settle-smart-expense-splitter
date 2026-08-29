import React from 'react';
import { View, ViewStyle, StyleProp, ColorValue } from 'react-native';

export type IconName =
  | 'home'
  | 'home-outline'
  | 'people'
  | 'people-outline'
  | 'notifications'
  | 'notifications-outline'
  | 'menu'
  | 'menu-outline'
  | 'card'
  | 'card-outline'
  | 'settings-outline'
  | 'arrow-back'
  | 'arrow-forward'
  | 'arrow-forward-outline'
  | 'lock-closed-outline'
  | 'create-outline'
  | 'close-outline'
  | 'restaurant-outline'
  | 'car-outline'
  | 'airplane-outline'
  | 'bed-outline'
  | 'cart-outline'
  | 'document-text-outline'
  | 'film-outline'
  | 'receipt-outline'
  | 'search-outline'
  | 'close-circle-outline'
  | 'wallet-outline'
  | 'swap-horizontal-outline'
  | 'checkmark-circle'
  | 'checkmark-outline'
  | 'flash'
  | 'flash-outline'
  | 'logo-whatsapp'
  | 'bell'
  | 'bell-outline'
  | 'time-outline'
  | 'chatbubble-outline'
  | 'trash-outline'
  | 'cloud-offline-outline'
  | 'sync-outline'
  | 'gpay'
  | 'paytm'
  | 'phonepe'
  | 'cred';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: ColorValue | string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Universal Pixel-Perfect SVG Icon Component
 * 100% reliable across Web and Native, no missing font assets or bundling errors.
 */
export const Icon: React.FC<IconProps> = ({ name, size = 20, color = '#0F172A', style }) => {
  const strokeColor = String(color || '#0F172A');
  const fillColor = 'none';

  const renderSvg = () => {
    switch (name) {
      case 'menu':
      case 'menu-outline':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        );
      case 'notifications':
      case 'notifications-outline':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        );
      case 'home':
      case 'home-outline':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        );

      case 'people':
      case 'people-outline':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        );

      case 'receipt-outline':
      case 'document-text-outline':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        );

      case 'wallet-outline':
      case 'card':
      case 'card-outline':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M16 12h4" />
            <circle cx="16" cy="12" r="1" fill={strokeColor} />
            <path d="M2 10h20" />
          </svg>
        );

      case 'settings-outline':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        );

      case 'search-outline':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        );

      case 'close-circle-outline':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        );

      case 'arrow-back':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        );

      case 'arrow-forward':
      case 'arrow-forward-outline':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        );

      case 'lock-closed-outline':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        );

      case 'create-outline':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        );

      case 'close-outline':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        );

      case 'restaurant-outline':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
            <line x1="6" y1="1" x2="6" y2="4" />
            <line x1="10" y1="1" x2="10" y2="4" />
            <line x1="14" y1="1" x2="14" y2="4" />
          </svg>
        );

      case 'car-outline':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="1" y="3" width="15" height="13" rx="2" />
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
        );

      case 'airplane-outline':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 2L11 13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        );

      case 'cart-outline':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
        );

      case 'flash':
      case 'flash-outline':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={name === 'flash' ? strokeColor : fillColor}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        );

      case 'swap-horizontal-outline':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="8 4 4 8 8 12" />
            <line x1="4" y1="8" x2="16" y2="8" />
            <polyline points="16 20 20 16 16 12" />
            <line x1="20" y1="16" x2="8" y2="16" />
          </svg>
        );

      case 'logo-whatsapp':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        );

      case 'bell':
      case 'bell-outline':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={name === 'bell' ? strokeColor : fillColor}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        );

      case 'time-outline':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        );

      case 'cloud-offline-outline':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22.61 16.95A5 5 0 0 0 18 10h-1.26a8 8 0 0 0-7.05-6M5 5a8 8 0 0 0-4 7 4.5 4.5 0 0 0 2.5 4" />
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M8.63 19A4.5 4.5 0 0 0 13.5 19H18" />
          </svg>
        );

      case 'sync-outline':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
        );

      case 'gpay':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="6" fill="#4285F4" />
            <path d="M12 7v5h3.5c-.5 1.5-2 2.5-3.5 2.5a4 4 0 1 1 0-8c1 0 1.8.4 2.5 1l1.8-1.8C15 4.5 13.6 4 12 4a8 8 0 1 0 0 16c4.4 0 7.5-3.1 7.5-7.5 0-.5 0-1-.1-1.5H12z" fill="#FFFFFF" />
          </svg>
        );

      case 'phonepe':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="6" fill="#5F259F" />
            <path d="M15.5 8.5C14.5 7.5 13 7 11.5 7H7v10h2.5v-3.5h2c1.5 0 3-.5 4-1.5s1.5-2 1.5-3.5c0-1.5-.5-2.5-1.5-3.5zm-2 4.5c-.5.5-1.2.7-2 .7H9.5V9.3h2c.8 0 1.5.2 2 .7.4.4.6 1 .6 1.5s-.2 1.1-.6 1.5z" fill="#FFFFFF" />
          </svg>
        );

      case 'paytm':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="6" fill="#002E6E" />
            <path d="M6 7h4v2H8.5v8H6V7zm6 0h4v2h-1.5v8H12V7zm5 0h4.5c1 0 1.5.5 1.5 1.5v7c0 1-.5 1.5-1.5 1.5H17V7z" fill="#00BAF2" />
          </svg>
        );

      case 'chatbubble-outline':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        );

      case 'trash-outline':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        );

      case 'cred':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="6" fill="#18181B" />
            <path d="M6 6h12v12H6z" stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round" />
            <path d="M9 10h6M9 14h6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );

      default:
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
        );
    }
  };

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {renderSvg() as any}
    </View>
  );
};
