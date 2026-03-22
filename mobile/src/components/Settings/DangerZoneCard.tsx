import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '../AppText';
import { useThemeColors, fontSizes, fontWeights, radii, spacing } from '../../theme';

interface DangerZoneCardProps {
  /** Optional — omit when section heading is shown above */
  title?: string;
  description: string;
  children: React.ReactNode;
}

export const DangerZoneCard: React.FC<DangerZoneCardProps> = ({ title, description, children }) => {
  const colors = useThemeColors();
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        card: {
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.dangerSoft,
          backgroundColor: colors.dangerSoft,
          padding: spacing.lg,
        },
        title: {
          fontSize: fontSizes.sm,
          fontWeight: fontWeights.bold,
          color: colors.danger,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          marginBottom: spacing.xs,
        },
        description: {
          fontSize: fontSizes.sm,
          color: colors.textSecondary,
          lineHeight: 20,
          marginBottom: spacing.md,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.card}>
      {title ? <AppText style={styles.title}>{title}</AppText> : null}
      <AppText style={styles.description}>{description}</AppText>
      {children}
    </View>
  );
};
