import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { Ionicons } from '@expo/vector-icons';
import { ShoppingItem } from '../api/shoppingApi';
import { useThemeColors, fontSizes, fontWeights, spacing } from '../theme';
import { SwipeableRow } from './SwipeableRow';

interface ShoppingItemRowProps {
  item: ShoppingItem;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  /** Row sits inside SettingsGroupCard (transparent row bg). */
  inGroupCard?: boolean;
}

export const ShoppingItemRow: React.FC<ShoppingItemRowProps> = ({
  item,
  onToggle,
  onEdit,
  onDelete,
  isFirst = false,
  isLast = false,
  inGroupCard = false,
}) => {
  const colors = useThemeColors();
  const styles = React.useMemo(() => StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      minHeight: 56,
      backgroundColor: inGroupCard ? 'transparent' : colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    rowFirst: {
      borderTopWidth: 0,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    rowCompleted: {
      backgroundColor: colors.primaryUltraSoft,
    },
    checkboxContainer: {
      marginRight: spacing.md,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    checkmark: {
      color: colors.surface,
      fontSize: 12,
      fontWeight: fontWeights.bold,
    },
    content: {
      flex: 1,
      flexShrink: 1,
      minWidth: 0,
    },
    name: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
      color: colors.text,
    },
    nameCompleted: {
      textDecorationLine: 'line-through',
      color: colors.textSecondary,
      fontWeight: fontWeights.regular,
    },
    details: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 2,
    },
    detailText: {
      fontSize: fontSizes.sm,
      color: colors.textTertiary,
    },
    meta: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginTop: 4,
    },
    badge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      alignSelf: 'flex-start',
    },
    sharedBadge: {
      fontSize: 10,
      color: colors.primary,
      fontWeight: fontWeights.semibold,
      backgroundColor: colors.primaryUltraSoft,
      overflow: 'hidden',
    },
    personalBadge: {
      fontSize: 10,
      color: colors.textTertiary,
      fontWeight: fontWeights.medium,
      backgroundColor: colors.background,
      overflow: 'hidden',
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginLeft: spacing.sm,
    },
    actionBtn: {
      padding: spacing.xs,
    },
  }), [colors, inGroupCard]);

  return (
    <SwipeableRow
      onSwipeLeft={onDelete}
      onSwipeRight={!item.completed ? onToggle : undefined}
      leftActionLabel="Delete"
      leftActionIcon="trash-outline"
      leftActionColor={colors.danger}
      rightActionLabel="Complete"
      rightActionIcon="checkmark-circle-outline"
      rightActionColor={colors.primary}
      disabled={item.completed}
    >
      <View style={[
        styles.row,
        isFirst && styles.rowFirst,
        isLast && styles.rowLast,
        item.completed && styles.rowCompleted,
      ]}>
        <TouchableOpacity onPress={onToggle} style={styles.checkboxContainer}>
          <View style={[styles.checkbox, item.completed && styles.checkboxChecked]}>
            {item.completed && <AppText style={styles.checkmark}>✓</AppText>}
          </View>
        </TouchableOpacity>
        <View style={styles.content}>
          <AppText style={[styles.name, item.completed && styles.nameCompleted]} numberOfLines={2} ellipsizeMode="tail">
            {item.name}
          </AppText>
          {(item.quantity || item.weight) ? (
            <View style={styles.details}>
              {item.quantity && (
                <AppText style={styles.detailText}>Qty: {item.quantity}</AppText>
              )}
              {item.weight && (
                <AppText style={styles.detailText}>
                  {item.quantity ? ' · ' : ''}{item.weight}{item.weightUnit ? ` ${item.weightUnit}` : ''}
                </AppText>
              )}
            </View>
          ) : null}
          <View style={styles.meta}>
            {item.isShared ? (
              <AppText style={[styles.badge, styles.sharedBadge]}>Shared</AppText>
            ) : (
              item.ownerId && (
                <AppText style={[styles.badge, styles.personalBadge]} numberOfLines={1}>
                  {item.ownerId.name}
                </AppText>
              )
            )}
          </View>
        </View>
        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
              <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SwipeableRow>
  );
};
