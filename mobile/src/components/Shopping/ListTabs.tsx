import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { AppText } from '../AppText';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useThemeColors, fontSizes, fontWeights, spacing, radii } from '../../theme';
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
  const { theme } = useTheme();
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
      marginHorizontal: embedded ? 0 : spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    track: {
      flex: 1,
      minWidth: 0,
      padding: spacing.xxs,
      borderRadius: radii.md,
      backgroundColor: theme === 'dark' ? colors.surface : colors.borderLight,
    },
    wrap: { alignItems: 'center', gap: spacing.xxs },
    chip: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: spacing.xxs, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm,
      borderRadius: radii.sm, minHeight: 44, minWidth: 44, maxWidth: '100%',
    },
    chipSelected: { backgroundColor: theme === 'dark' ? colors.border : colors.surface },
    chipText: { fontSize: fontSizes.sm, color: colors.textSecondary, flexShrink: 1 },
    chipTextSelected: { color: colors.text, fontWeight: fontWeights.semibold },
    addChip: {
      alignItems: 'center', justifyContent: 'center',
      height: 44, width: 44, flexShrink: 0, borderRadius: radii.sm,
    },
    moreChip: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: spacing.xxs, minHeight: 44, minWidth: 44, maxWidth: '100%',
      paddingHorizontal: spacing.sm, paddingVertical: spacing.sm,
    },
    moreChipText: { fontSize: fontSizes.sm, color: colors.textSecondary, flexShrink: 1 },
  }), [colors, embedded, theme]);

  return (
    <View style={styles.container}>
      <View style={styles.track} accessibilityRole="tablist">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.wrap}
        >
          {visibleLists.map((list) => {
            const isSelected = selectedListId === list._id;
            return (
              <TouchableOpacity
                accessibilityRole="tab"
                accessibilityLabel={list.name}
                accessibilityState={{ selected: isSelected }}
                key={list._id}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => onSelectList(list)}
                onLongPress={() => onLongPressList(list)}
                activeOpacity={0.7}
              >
                {isSelected ? <Ionicons name="checkmark-outline" size={22} color={colors.text} /> : null}
                <AppText
                  style={[styles.chipText, isSelected && styles.chipTextSelected]}
                >
                  {list.name}
                </AppText>
              </TouchableOpacity>
            );
          })}
          {shouldCollapse ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ expanded: showExpanded }}
              style={styles.moreChip}
              onPress={() => setExpanded((prev) => !prev)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
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
        </ScrollView>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={newListLabel}
        style={styles.addChip}
        onPress={onAddList}
        activeOpacity={0.7}
      >
        <Ionicons name="add-outline" size={22} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
};
