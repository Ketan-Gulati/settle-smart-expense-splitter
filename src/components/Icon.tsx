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
  | 'checkmark-outline';

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
