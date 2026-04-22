import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from '../AppText';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { useThemeColors, fontSizes, fontWeights, spacing, radii, shadows } from '../../theme';
import { ShoppingList } from '../../api/shoppingApi';

interface ListTabsProps {
  lists: ShoppingList[];
  selectedListId: string | null;
  onSelectList: (list: ShoppingList) => void;
  onLongPressList: (list: ShoppingList) => void;
  onAddList: () => void;
  newListLabel: string;
  /** Inside SettingsGroupCard — tighter padding, no outer strip background. */
  embedded?: boolean;
}

/** Show this many list chips before collapsing the rest behind a "Show more" toggle. */
const COLLAPSED_VISIBLE_COUNT = 8;

export const ListTabs: React.FC<ListTabsProps> = ({
  lists,
  selectedListId,
  onSelectList,
  onLongPressList,
  onAddList,
  newListLabel,
  embedded = false,
}) => {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  const shouldCollapse = lists.length > COLLAPSED_VISIBLE_COUNT;
  const selectedIsHidden = useMemo(() => {
    if (!shouldCollapse || !selectedListId) return false;
    const idx = lists.findIndex((l) => l._id === selectedListId);
    return idx >= COLLAPSED_VISIBLE_COUNT;
  }, [lists, selectedListId, shouldCollapse]);

  const showExpanded = expanded || selectedIsHidden;
  const visibleLists = shouldCollapse && !showExpanded
    ? lists.slice(0, COLLAPSED_VISIBLE_COUNT)
    : lists;
  const hiddenCount = lists.length - COLLAPSED_VISIBLE_COUNT;

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      paddingVertical: embedded ? spacing.xs : spacing.sm,
      paddingHorizontal: embedded ? spacing.sm : spacing.xl,
      backgroundColor: embedded ? 'transparent' : colors.background,
    },
    wrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: spacing.sm,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderLight,
      minHeight: 40,
      maxWidth: '100%',
    },
    chipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      ...(shadows.sm as object),
    },
    chipText: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.medium,
      color: colors.text,
    },
    chipTextSelected: {
      color: colors.surface,
      fontWeight: fontWeights.semibold,
    },
    addChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: colors.primaryUltraSoft,
      borderWidth: 1,
      borderColor: colors.primarySoft,
      minHeight: 40,
    },
    addChipText: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.primary,
    },
    moreChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderStyle: 'dashed',
      minHeight: 40,
    },
    moreChipText: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.semibold,
      color: colors.textSecondary,
    },
  }), [colors, embedded]);

  return (
    <View style={styles.container}>
      <View style={styles.wrap}>
        <TouchableOpacity
          style={styles.addChip}
          onPress={onAddList}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={18} color={colors.primary} />
          <AppText style={styles.addChipText}>{newListLabel}</AppText>
        </TouchableOpacity>
        {visibleLists.map((list) => {
          const isSelected = selectedListId === list._id;
          return (
            <TouchableOpacity
              key={list._id}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => onSelectList(list)}
              onLongPress={() => onLongPressList(list)}
              activeOpacity={0.7}
            >
              <AppText
                style={[styles.chipText, isSelected && styles.chipTextSelected]}
                numberOfLines={1}
              >
                {list.name}
              </AppText>
            </TouchableOpacity>
          );
        })}
        {shouldCollapse ? (
          <TouchableOpacity
            style={styles.moreChip}
            onPress={() => setExpanded((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.textSecondary}
            />
            <AppText style={styles.moreChipText}>
              {showExpanded
                ? t('common.showLess')
                : `+${hiddenCount} ${t('common.showMore').toLowerCase()}`}
            </AppText>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};
