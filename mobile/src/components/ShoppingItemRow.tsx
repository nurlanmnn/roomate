import React from 'react';
import { Alert, AlertButton, Pressable, View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { Ionicons } from '@expo/vector-icons';
import { ShoppingItem } from '../api/shoppingApi';
import { useLanguage } from '../context/LanguageContext';
import { useThemeColors, fontSizes, fontWeights, radii, spacing } from '../theme';
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
    item.quantity && Number(item.quantity) !== 1 ? `×${item.quantity}` : '',
    item.weight ? `${item.weight}${item.weightUnit ? ` ${item.weightUnit}` : ''}` : '',
    item.isShared ? '' : item.ownerId?.name ?? '',
  ].filter(Boolean).join(' · ');
  const openMenu = () => {
    const buttons: AlertButton[] = [];
    if (onEdit) buttons.push({ text: t('common.edit'), onPress: onEdit });
    if (onDelete) buttons.push({ text: t('common.delete'), style: 'destructive', onPress: onDelete });
    buttons.push({ text: t('common.cancel'), style: 'cancel' });
    Alert.alert(item.name, undefined, buttons);
  };
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
  const actions = onEdit || onDelete ? (
    <TouchableOpacity
      onPress={openMenu}
      style={styles.target}
      accessibilityRole="button"
      accessibilityLabel={`${t('shopping.editItem')}: ${item.name}`}
    >
      <Ionicons name="ellipsis-horizontal" size={20} color={colors.textTertiary} />
    </TouchableOpacity>
  ) : null;
  return (
    <ShoppingSwipeableRow onSwipeLeft={onDelete} onSwipeRight={!item.completed ? onToggle : undefined} disabled={item.completed}>
      <View style={[
        { backgroundColor: colors.surface },
        !inGroupCard && !isLast && styles.separator,
        !inGroupCard && !isLast && { borderBottomColor: colors.borderLight },
      ]}>
        <View style={styles.row}>
          {checkbox}
          <Pressable
            style={styles.content}
            onPress={onEdit}
            disabled={!onEdit}
            accessibilityRole={onEdit ? 'button' : undefined}
            accessibilityLabel={[item.name, details].filter(Boolean).join(', ')}
            accessibilityHint={onEdit ? t('shopping.editItem') : undefined}
          >
            <AppText
              style={[
                styles.name,
                { color: item.completed ? colors.textTertiary : colors.text },
                item.completed && styles.struck,
              ]}
            >
              {item.name}
            </AppText>
            {details ? <AppText style={[styles.details, { color: colors.textSecondary }]}>{details}</AppText> : null}
          </Pressable>
          {actions}
        </View>
      </View>
    </ShoppingSwipeableRow>
  );
};

const styles = StyleSheet.create({
  target: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: 28, height: 28, borderRadius: radii.pill, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 56, paddingLeft: spacing.sm, paddingRight: spacing.xs, paddingVertical: spacing.xs },
  content: { flex: 1, minWidth: 0, minHeight: 44, justifyContent: 'center' },
  name: { fontSize: fontSizes.md, fontWeight: fontWeights.medium },
  struck: { textDecorationLine: 'line-through' },
  details: { fontSize: fontSizes.sm, marginTop: spacing.xxs },
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
