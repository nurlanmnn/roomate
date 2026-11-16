import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../AppText';
import { Group, GroupRow } from '../ui/Group';
import { useLanguage } from '../../context/LanguageContext';
import { useThemeColors, spacing, radii, fontSizes } from '../../theme';

interface ActiveListCardProps {
  listName: string;
  toBuyCount: number;
  completedCount: number;
  itemLabel: string;
  itemsLabel: string;
  onEdit: () => void;
  onDelete: () => void;
  embedded?: boolean;
}

export const ActiveListCard: React.FC<ActiveListCardProps> = ({
  listName, toBuyCount, completedCount, itemLabel, itemsLabel, onEdit, onDelete, embedded = false,
}) => {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const total = toBuyCount + completedCount;
  const content = (
    <>
      <GroupRow
        title={listName}
        titleLines={0}
        trailing={
          <View style={styles.actions}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${t('shopping.editList')}: ${listName}`} style={styles.action} onPress={onEdit}>
              <Ionicons name="pencil-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${t('common.delete')}: ${listName}`} style={styles.action} onPress={onDelete}>
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </TouchableOpacity>
          </View>
        }
      />
      <AppText style={[styles.meta, { color: colors.textSecondary }]}>
        {t('shoppingList.toBuy')}: {toBuyCount} {toBuyCount === 1 ? itemLabel : itemsLabel} · {t('shopping.completed')}: {completedCount}
      </AppText>
      {total > 0 ? (
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={t('shopping.completed')}
          accessibilityValue={{ min: 0, max: total, now: completedCount }}
          style={[styles.track, { backgroundColor: colors.borderLight }]}
        >
          <View style={[styles.progress, { width: `${completedCount / total * 100}%`, backgroundColor: colors.primary }]} />
        </View>
      ) : null}
    </>
  );
  return embedded ? <View>{content}</View> : <Group>{content}</Group>;
};

const styles = StyleSheet.create({
  meta: { fontSize: fontSizes.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  actions: { flexDirection: 'row' },
  action: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  track: { height: spacing.xxs, borderRadius: radii.pill, marginHorizontal: spacing.md, marginBottom: spacing.md, overflow: 'hidden' },
  progress: { height: '100%', borderRadius: radii.pill },
});
