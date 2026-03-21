import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '../AppText';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, fontSizes, fontWeights, spacing, radii, shadows } from '../../theme';

interface SmartTipCardProps {
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

/**
 * Helpful tip / smart assistant style card.
 * Modern, compact, with clear hierarchy.
 */
export const SmartTipCard: React.FC<SmartTipCardProps> = ({
  title,
  message,
  icon = 'bulb-outline',
}) => {
  const colors = useThemeColors();
  const styles = React.useMemo(() => StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: colors.accentUltraSoft,
      borderRadius: radii.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.accentSoft,
      ...(shadows.xs as object),
      gap: spacing.md,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: radii.md,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.text,
      marginBottom: 2,
    },
    message: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      lineHeight: 20,
    },
  }), [colors]);

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={22} color={colors.accent} />
      </View>
      <View style={styles.content}>
        <AppText style={styles.title}>{title}</AppText>
        <AppText style={styles.message}>{message}</AppText>
      </View>
    </View>
  );
};
