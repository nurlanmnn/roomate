import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../AppText';
import { useThemeColors, fontSizes, fontWeights, spacing, radii } from '../../theme';

interface HomeSetupStepProps {
  stepNumber: number;
  title: string;
  subtitle: string;
  completed: boolean;
  onPress: () => void;
  isLast?: boolean;
}

/**
 * Single row in the household setup checklist — tappable with clear done state.
 */
export const HomeSetupStep: React.FC<HomeSetupStepProps> = ({
  stepNumber,
  title,
  subtitle,
  completed,
  onPress,
  isLast,
}) => {
  const colors = useThemeColors();

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.sm,
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: colors.borderLight,
        },
        indicator: {
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing.md,
          backgroundColor: completed ? colors.primary : colors.primaryUltraSoft,
          borderWidth: completed ? 0 : 1,
          borderColor: colors.primary + '55',
        },
        stepNum: {
          fontSize: fontSizes.md,
          fontWeight: fontWeights.bold,
          color: completed ? colors.surface : colors.primary,
        },
        textBlock: {
          flex: 1,
        },
        title: {
          fontSize: fontSizes.md,
          fontWeight: fontWeights.semibold,
          color: completed ? colors.textSecondary : colors.text,
          textDecorationLine: completed ? 'line-through' : 'none',
        },
        subtitle: {
          fontSize: fontSizes.sm,
          color: colors.textSecondary,
          marginTop: 2,
          lineHeight: 18,
        },
        chevron: {
          marginLeft: spacing.xs,
        },
      }),
    [colors, isLast]
  );

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85, backgroundColor: colors.surfaceElevated }]}
      accessibilityRole="button"
    >
      <View style={styles.indicator}>
        {completed ? (
          <Ionicons name="checkmark" size={22} color={colors.surface} />
        ) : (
          <AppText style={styles.stepNum}>{stepNumber}</AppText>
        )}
      </View>
      <View style={styles.textBlock}>
        <AppText style={styles.title}>{title}</AppText>
        <AppText style={styles.subtitle}>{subtitle}</AppText>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={styles.chevron} />
    </Pressable>
  );
};
