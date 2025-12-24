import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ShoppingItem } from '../api/shoppingApi';
import { colors, fontSizes, fontWeights, radii, spacing, shadows } from '../theme';

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
  return (
    <View style={[styles.row, item.completed && styles.rowCompleted]}>
      <TouchableOpacity onPress={onToggle} style={styles.checkboxContainer}>
        <View style={[styles.checkbox, item.completed && styles.checkboxChecked]}>
          {item.completed && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
      <View style={styles.content}>
        <Text style={[styles.name, item.completed && styles.nameCompleted]}>
          {item.name}
        </Text>
        <View style={styles.details}>
          {item.quantity && (
            <Text style={styles.detailText}>Qty: {item.quantity}</Text>
          )}
          {item.weight && (
            <Text style={styles.detailText}>
              {item.quantity ? ' • ' : ''}Weight: {item.weight}{item.weightUnit ? ` ${item.weightUnit}` : ''}
            </Text>
          )}
        </View>
        <View style={styles.meta}>
          {item.isShared ? (
            <Text style={styles.sharedBadge}>Shared</Text>
          ) : (
            item.ownerId && (
              <Text style={styles.personalBadge}>{item.ownerId.name}</Text>
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
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    ...(shadows.sm as object),
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
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  checkmark: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    marginBottom: spacing.xxs,
    color: colors.text,
  },
  nameCompleted: {
    textDecorationLine: 'line-through',
    color: colors.muted,
  },
  details: {
    flexDirection: 'row',
    marginBottom: spacing.xxs,
  },
  detailText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  sharedBadge: {
    fontSize: fontSizes.xs,
    color: colors.accent,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  personalBadge: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  deleteButton: {
    padding: spacing.xs,
  },
});

