import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, spacing, shadows, radii } from '../../theme';

interface ShoppingFABProps {
  onPress: () => void;
  bottomOffset: number;
}

export const ShoppingFAB: React.FC<ShoppingFABProps> = ({ onPress, bottomOffset }) => {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const styles = React.useMemo(() => StyleSheet.create({
    wrap: {
      position: 'absolute',
      bottom: bottomOffset,
      right: spacing.md,
      zIndex: 1000,
    },
    fab: {
      width: 56,
      height: 56,
      borderRadius: radii.pill,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...(shadows.sm as object),
    },
  }), [colors, bottomOffset]);

  return (
    <View style={styles.wrap}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('shopping.addItem')} style={styles.fab} onPress={onPress} activeOpacity={0.85}>
        <Ionicons name="add-outline" size={28} color={colors.onPrimary} />
      </TouchableOpacity>
    </View>
  );
};
