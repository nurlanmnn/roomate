import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from '../AppText';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, fontSizes, fontWeights, spacing, radii, shadows } from '../../theme';

interface ActiveListCardProps {
  listName: string;
  toBuyCount: number;
  completedCount: number;
  itemLabel: string;
  itemsLabel: string;
  onEdit: () => void;
  onDelete: () => void;
  /** Strip outer card chrome when nested in SettingsGroupCard. */
  embedded?: boolean;
}

export const ActiveListCard: React.FC<ActiveListCardProps> = ({
  listName,
  toBuyCount,
  completedCount,
  itemLabel,
  itemsLabel,
  onEdit,
  onDelete,
  embedded = false,
}) => {
  const colors = useThemeColors();
  const total = toBuyCount + completedCount;
  const progress = total > 0 ? completedCount / total : 0;

  const styles = React.useMemo(() => StyleSheet.create({
    card: embedded
      ? {
          marginBottom: 0,
          backgroundColor: 'transparent',
          borderRadius: 0,
          padding: spacing.md,
          borderWidth: 0,
          shadowOpacity: 0,
          elevation: 0,
        }
      : {
          marginBottom: spacing.lg,
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: colors.borderLight,
          ...(shadows.sm as object),
        },
    top: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    left: {
      flex: 1,
      minWidth: 0,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: radii.md,
      backgroundColor: colors.primaryUltraSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    listName: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.bold,
      color: colors.text,
      marginBottom: 2,
    },
    meta: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xxs,
    },
    actionBtn: {
      width: 36,
      height: 36,
      borderRadius: radii.md,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressWrap: {
      marginTop: spacing.md,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.borderLight,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      borderRadius: 2,
      backgroundColor: colors.primary,
    },
  }), [colors, embedded]);

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.left}>
          <View style={styles.iconWrap}>
            <Ionicons name="cart-outline" size={20} color={colors.primary} />
          </View>
          <AppText style={styles.listName} numberOfLines={1}>{listName}</AppText>
          <AppText style={styles.meta}>
            {toBuyCount} {toBuyCount === 1 ? itemLabel : itemsLabel}
            {completedCount > 0 && ` · ${completedCount} done`}
          </AppText>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={onEdit} activeOpacity={0.7}>
            <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={onDelete} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
      {total > 0 && (
        <View style={styles.progressWrap}>
          <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
        </View>
      )}
    </View>
  );
};
