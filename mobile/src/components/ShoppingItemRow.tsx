import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { Ionicons } from '@expo/vector-icons';
import { ShoppingItem } from '../api/shoppingApi';
import { useLanguage } from '../context/LanguageContext';
import { useThemeColors, fontSizes, fontWeights, radii, spacing } from '../theme';
import { GroupRow } from './ui/Group';
import { ShoppingSwipeableRow } from './Shopping/ShoppingSwipeableRow';

interface ShoppingItemRowProps {
  item: ShoppingItem;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  /** Row sits inside a grouped list. */
  inGroupCard?: boolean;
}

const ShoppingItemRowComponent: React.FC<ShoppingItemRowProps> = ({
  item, onToggle, onEdit, onDelete, isLast = false, inGroupCard = false,
}) => {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const details = [
    item.quantity ? `${t('shopping.quantity')}: ${item.quantity}` : '',
    item.weight ? `${item.weight}${item.weightUnit ? ` ${item.weightUnit}` : ''}` : '',
    item.isShared ? t('shopping.shared') : item.ownerId?.name ?? '',
  ].filter(Boolean).join(' · ');
  const checkbox = (
    <TouchableOpacity
      onPress={onToggle}
      style={styles.target}
      accessibilityRole="checkbox"
      accessibilityLabel={`${item.name}, ${t(item.completed ? 'shopping.completed' : 'shopping.active')}`}
      accessibilityState={{ checked: item.completed }}
    >
      <View style={[styles.checkbox, { borderColor: item.completed ? colors.primary : colors.textTertiary, backgroundColor: item.completed ? colors.primary : colors.surface }]}>
        {item.completed ? <Ionicons name="checkmark-outline" size={22} color={colors.onPrimary} /> : null}
      </View>
    </TouchableOpacity>
  );
  const actions = (
    <View style={styles.actions}>
      {onEdit ? (
        <TouchableOpacity onPress={onEdit} style={styles.target} accessibilityRole="button" accessibilityLabel={`${t('shopping.editItem')}: ${item.name}`}>
          <Ionicons name="pencil-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      ) : null}
      {onDelete ? (
        <TouchableOpacity onPress={onDelete} style={styles.target} accessibilityRole="button" accessibilityLabel={`${t('common.delete')}: ${item.name}`}>
          <Ionicons name="trash-outline" size={22} color={colors.danger} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
  return (
    <ShoppingSwipeableRow onSwipeLeft={onDelete} onSwipeRight={!item.completed ? onToggle : undefined} disabled={item.completed}>
      <View style={[
        { backgroundColor: colors.surface },
        !inGroupCard && !isLast && styles.separator,
        !inGroupCard && !isLast && { borderBottomColor: colors.borderLight },
      ]}>
        {item.completed ? (
          // GroupRow has no title-style override; this matching row keeps completion visible as a strike-through.
          <View style={styles.completedRow}>
            {checkbox}
            <View style={styles.content}>
              <AppText style={[styles.nameCompleted, { color: colors.textTertiary }]}>{item.name}</AppText>
              {details ? <AppText style={[styles.details, { color: colors.textSecondary }]}>{details}</AppText> : null}
            </View>
            {actions}
          </View>
        ) : (
          <>
            <GroupRow title={item.name} titleLines={0} leading={checkbox} trailing={actions} />
            {details ? <AppText style={[styles.rowDetails, { color: colors.textSecondary }]}>{details}</AppText> : null}
          </>
        )}
      </View>
    </ShoppingSwipeableRow>
  );
};

const styles = StyleSheet.create({
  target: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: 28, height: 28, borderRadius: radii.pill, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center' },
  completedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 60, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  content: { flex: 1, minWidth: 0 },
  nameCompleted: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, textDecorationLine: 'line-through' },
  details: { fontSize: fontSizes.sm, marginTop: spacing.xxs },
  rowDetails: { fontSize: fontSizes.sm, paddingLeft: spacing.md + 44 + spacing.sm, paddingRight: spacing.md, paddingBottom: spacing.sm },
  separator: { borderBottomWidth: StyleSheet.hairlineWidth },
});

/**
 * Memoized so that re-renders of the parent list (e.g. typing in the search
 * box, toggling another row) don't re-render every row. We compare only the
 * fields this row actually renders plus its position flags. Callback identity is
 * intentionally ignored: the handlers only close over `selectedList` /
 * `selectedHousehold`, which always change in lockstep with the items array
 * being replaced, so a skipped re-render can never run a stale closure.
 */
export const ShoppingItemRow = React.memo(
  ShoppingItemRowComponent,
  (prev, next) =>
    prev.item._id === next.item._id &&
    prev.item.name === next.item.name &&
    prev.item.completed === next.item.completed &&
    prev.item.quantity === next.item.quantity &&
    prev.item.weight === next.item.weight &&
    prev.item.weightUnit === next.item.weightUnit &&
    prev.item.isShared === next.item.isShared &&
    prev.item.ownerId?.name === next.item.ownerId?.name &&
    prev.isFirst === next.isFirst &&
    prev.isLast === next.isLast &&
    prev.inGroupCard === next.inGroupCard
);
