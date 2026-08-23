import React from 'react';
import { View, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Text } from './Text';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface NumericKeypadProps {
  onKeyPress: (key: string) => void;
  onDelete: () => void;
  style?: ViewStyle;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({ onKeyPress, onDelete, style }) => {
  const theme = useAppTheme();

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', 'delete'],
  ];

  return (
    <View style={[styles.container, style]}>
      {keys.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.row}>
          {row.map((key) => {
            const isDelete = key === 'delete';
            return (
              <Pressable
                key={key}
                onPress={() => (isDelete ? onDelete() : onKeyPress(key))}
                style={({ pressed }) => [
                  styles.key,
                  {
                    backgroundColor: pressed ? theme.colors.surfaceElevated : 'transparent',
                  },
                ]}
              >
                {isDelete ? (
                  <Text style={[styles.deleteIcon, { color: theme.colors.textPrimary }]}>⌫</Text>
                ) : (
                  <Text variant="headline" weight="semibold" color={theme.colors.textPrimary}>
                    {key}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  key: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginHorizontal: 8,
  },
  deleteIcon: {
    fontSize: 22,
    fontWeight: 'bold',
  },
});
