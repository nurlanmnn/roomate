import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '../AppText';
import { Group, SectionHeading } from '../ui/Group';
import { useThemeColors, fontSizes, spacing } from '../../theme';

interface DangerZoneCardProps {
  /** Optional — omit when section heading is shown above */
  title?: string;
  description: string;
  children: React.ReactNode;
}

/** Destructive actions are ordinary grouped rows with danger text. */
export const DangerZoneCard: React.FC<DangerZoneCardProps> = ({ title, description, children }) => {
  const colors = useThemeColors();

  return (
    <View>
      {title ? <SectionHeading title={title} /> : null}
      <AppText style={[styles.description, { color: colors.textSecondary }]}>{description}</AppText>
      <Group>{children}</Group>
    </View>
  );
};

const styles = StyleSheet.create({
  description: {
    fontSize: fontSizes.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
});
