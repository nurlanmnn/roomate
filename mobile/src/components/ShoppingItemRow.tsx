import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { Ionicons } from '@expo/vector-icons';
import { ShoppingItem } from '../api/shoppingApi';
import { useThemeColors, fontSizes, fontWeights, radii, spacing, shadows } from '../theme';
import { SwipeableRow } from './SwipeableRow';

interface ShoppingItemRowProps {
  item: ShoppingItem;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const ShoppingItemRow: React.FC<ShoppingItemRowProps> = ({
  item,
  onToggle,
  onEdit,
  onDelete,
}) => {
  const colors = useThemeColors();
  const styles = React.useMemo(() => StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      marginBottom: spacing.xs,
      borderWidth: 1,
      borderColor: colors.border,
      ...(shadows.xs as object),
    },
    rowCompleted: {
      opacity: 0.6,
    },
    checkboxContainer: {
      marginRight: spacing.md,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: radii.sm,
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
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.bold,
    },
    content: {
      flex: 1,
      flexShrink: 1,
    },
    name: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.semibold,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    nameCompleted: {
      textDecorationLine: 'line-through',
      color: colors.textSecondary,
    },
    details: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: spacing.xs,
    },
    detailText: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
    },
    meta: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    sharedBadge: {
      fontSize: fontSizes.xs,
      color: colors.primary,
      fontWeight: fontWeights.semibold,
    },
    personalBadge: {
      fontSize: fontSizes.xs,
      color: colors.textTertiary,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginLeft: spacing.sm,
    },
    editButton: {
      padding: spacing.xs,
    },
    deleteButton: {
      padding: spacing.xs,
    },
  }), [colors]);

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
      <View style={[styles.row, item.completed && styles.rowCompleted]}>
      <TouchableOpacity onPress={onToggle} style={styles.checkboxContainer}>
        <View style={[styles.checkbox, item.completed && styles.checkboxChecked]}>
          {item.completed && <AppText style={styles.checkmark}>✓</AppText>}
        </View>
      </TouchableOpacity>
      <View style={styles.content}>
        <AppText style={[styles.name, item.completed && styles.nameCompleted]} numberOfLines={2} ellipsizeMode="tail">
          {item.name}
        </AppText>
        <View style={styles.details}>
          {item.quantity && (
            <AppText style={styles.detailText}>Qty: {item.quantity}</AppText>
          )}
          {item.weight && (
            <AppText style={styles.detailText}>
              {item.quantity ? ' • ' : ''}Weight: {item.weight}{item.weightUnit ? ` ${item.weightUnit}` : ''}
            </AppText>
          )}
        </View>
        <View style={styles.meta}>
          {item.isShared ? (
            <AppText style={styles.sharedBadge}>Shared</AppText>
          ) : (
            item.ownerId && (
              <AppText style={styles.personalBadge}>{item.ownerId.name}</AppText>
            )
          )}
        </View>
      </View>
      <View style={styles.actions}>
        {onEdit && (
          <TouchableOpacity onPress={onEdit} style={styles.editButton}>
            <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        )}
      </View>
      </View>
    </SwipeableRow>
  );
};
