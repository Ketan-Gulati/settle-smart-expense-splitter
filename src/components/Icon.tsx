import React from 'react';
import { Text as RNText, TextStyle, StyleProp, ColorValue } from 'react-native';

export type IconName =
  | 'home'
  | 'home-outline'
  | 'people'
  | 'people-outline'
  | 'notifications'
  | 'notifications-outline'
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
  | 'receipt-outline';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: ColorValue | string;
  style?: StyleProp<TextStyle>;
}

/**
 * Universal Zero-Dependency Line Icon Component
 * High-performance, works natively on iOS, Android, and Web without external font bundling issues.
 */
export const Icon: React.FC<IconProps> = ({ name, size = 20, color = '#0F172A', style }) => {
  // Mapping to clean typography / stroke glyph symbols
  const getGlyph = () => {
    switch (name) {
      case 'home':
        return '⌂';
      case 'home-outline':
        return '⌂';
      case 'people':
        return '👥';
      case 'people-outline':
        return '⚲';
      case 'notifications':
      case 'notifications-outline':
        return '◬';
      case 'card':
      case 'card-outline':
        return '▤';
      case 'settings-outline':
        return '⚙';
      case 'arrow-back':
        return '←';
      case 'restaurant-outline':
        return '🍽';
      case 'car-outline':
        return '🚗';
      case 'airplane-outline':
        return '✈';
      case 'bed-outline':
        return '🛏';
      case 'cart-outline':
        return '🛒';
      case 'document-text-outline':
        return '📄';
      case 'film-outline':
        return '🎬';
      case 'receipt-outline':
      default:
        return '🧾';
    }
  };

  return (
    <RNText
      style={[
        {
          fontSize: size,
          color,
          lineHeight: size * 1.15,
          textAlign: 'center',
          fontWeight: name.includes('outline') ? '400' : '700',
        },
        style,
      ]}
    >
      {getGlyph()}
    </RNText>
  );
};
