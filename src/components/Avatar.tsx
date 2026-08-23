import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { Text } from './Text';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface AvatarProps {
  name: string;
  imageUrl?: string;
  size?: 'small' | 'medium' | 'large' | 'huge';
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({ name, imageUrl, size = 'medium', style }) => {
  const theme = useAppTheme();

  const getDimensions = () => {
    switch (size) {
      case 'small':
        return { size: 28, fontSize: theme.typography.fontSizes.caption };
      case 'large':
        return { size: 48, fontSize: theme.typography.fontSizes.lg };
      case 'huge':
        return { size: 64, fontSize: theme.typography.fontSizes.displaySm };
      case 'medium':
      default:
        return { size: 36, fontSize: theme.typography.fontSizes.sm };
    }
  };

  const { size: dimSize, fontSize } = getDimensions();

  // Extract initials
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View
      style={[
        styles.avatar,
        {
          width: dimSize,
          height: dimSize,
          borderRadius: dimSize / 2,
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: dimSize, height: dimSize, borderRadius: dimSize / 2 }}
        />
      ) : (
        <Text
          style={{
            fontSize,
            fontWeight: theme.typography.fontWeights.bold,
            color: theme.colors.textPrimary,
          }}
        >
          {initials || '?'}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
});
