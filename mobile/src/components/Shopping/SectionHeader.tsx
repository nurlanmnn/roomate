import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from '../AppText';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, fontSizes, fontWeights, spacing } from '../../theme';

interface SectionHeaderProps {
  title: string;
  count?: number;
  collapsed?: boolean;
  onToggle?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  embedded?: boolean;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title, count, collapsed, onToggle, actionLabel, onAction, embedded = false,
}) => {
  const colors = useThemeColors();
  const label = (
    <>
      {onToggle ? <Ionicons name={collapsed ? 'chevron-forward-outline' : 'chevron-down-outline'} size={22} color={colors.textSecondary} /> : null}
      <AppText accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
        {title}{count != null && count > 0 ? ` (${count})` : ''}
      </AppText>
    </>
  );
  return (
    <View style={[styles.container, { paddingHorizontal: embedded ? 0 : spacing.lg }]}>
      {onToggle ? (
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: !collapsed }} style={styles.left} onPress={onToggle}>
          {label}
        </TouchableOpacity>
      ) : <View style={styles.left}>{label}</View>}
      {actionLabel && onAction ? (
        <TouchableOpacity accessibilityRole="button" style={styles.action} onPress={onAction}>
          <AppText style={[styles.actionText, { color: colors.primary }]}>{actionLabel}</AppText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs, paddingTop: spacing.lg, paddingBottom: spacing.xs },
  left: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1, minHeight: 44, minWidth: 0 },
  title: { fontSize: 20, fontWeight: fontWeights.bold, flexShrink: 1 },
  action: { minHeight: 44, minWidth: 44, justifyContent: 'center', maxWidth: '100%' },
  actionText: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold },
});
