import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, shadows, radii } from '../../theme';

interface ShoppingFABProps {
  onPress: () => void;
  bottomOffset: number;
}

export const ShoppingFAB: React.FC<ShoppingFABProps> = ({ onPress, bottomOffset }) => {
  const colors = useThemeColors();
  const styles = React.useMemo(() => StyleSheet.create({
    wrap: {
      position: 'absolute',
      bottom: bottomOffset,
      right: spacing.xl,
      zIndex: 1000,
    },
    fab: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...(shadows.lg as object),
      elevation: 6,
    },
  }), [colors, bottomOffset]);

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.fab} onPress={onPress} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={colors.surface} />
      </TouchableOpacity>
    </View>
  );
};
