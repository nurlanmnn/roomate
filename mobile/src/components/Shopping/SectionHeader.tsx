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
  /** When parent already applies horizontal padding (e.g. next to SettingsSection). */
  embedded?: boolean;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  count,
  collapsed,
  onToggle,
  actionLabel,
  onAction,
  embedded = false,
}) => {
  const colors = useThemeColors();
  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: embedded ? 0 : spacing.xl,
      paddingVertical: spacing.sm,
      marginBottom: spacing.sm,
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      flex: 1,
    },
    title: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.semibold,
      color: colors.textTertiary,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    count: {
      fontSize: fontSizes.xs,
      color: colors.textTertiary,
      marginLeft: spacing.xxs,
    },
    action: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    actionText: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.primary,
    },
  }), [colors, embedded]);

  return (
    <View style={styles.container}>
      {onToggle ? (
        <TouchableOpacity style={styles.left} onPress={onToggle} activeOpacity={0.7}>
          <Ionicons
            name={collapsed ? 'chevron-forward' : 'chevron-down'}
            size={18}
            color={colors.textTertiary}
          />
          <AppText style={styles.title}>{title}</AppText>
          {count != null && count > 0 && (
            <AppText style={styles.count}>({count})</AppText>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.left}>
          <AppText style={styles.title}>{title}</AppText>
          {count != null && count > 0 && (
            <AppText style={styles.count}>({count})</AppText>
          )}
        </View>
      )}
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.action} onPress={onAction} activeOpacity={0.7}>
          <AppText style={styles.actionText}>{actionLabel}</AppText>
        </TouchableOpacity>
      )}
    </View>
  );
};
