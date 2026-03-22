import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '../AppText';
import { useThemeColors, fontSizes, fontWeights, spacing } from '../../theme';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

/**
 * Section label (uppercase, tertiary) + content — use with SettingsGroupCard inside children.
 */
export const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children }) => {
  const colors = useThemeColors();
  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          marginTop: spacing.xl,
          paddingHorizontal: spacing.xl,
        },
        label: {
          fontSize: fontSizes.xs,
          fontWeight: fontWeights.semibold,
          color: colors.textTertiary,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          marginBottom: spacing.sm,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.wrap}>
      <AppText style={styles.label}>{title}</AppText>
      {children}
    </View>
  );
};
