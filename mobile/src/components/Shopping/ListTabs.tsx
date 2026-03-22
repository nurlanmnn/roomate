import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from '../AppText';
import { Ionicons } from '@expo/vector-icons';
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
  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      paddingVertical: embedded ? spacing.xs : spacing.sm,
      paddingHorizontal: embedded ? spacing.sm : spacing.xl,
      backgroundColor: embedded ? 'transparent' : colors.background,
    },
    scroll: {
      flexGrow: 0,
    },
    scrollContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingRight: spacing.lg,
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
  }), [colors, embedded]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scroll}
      >
        <TouchableOpacity
          style={styles.addChip}
          onPress={onAddList}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={18} color={colors.primary} />
          <AppText style={styles.addChipText}>{newListLabel}</AppText>
        </TouchableOpacity>
        {lists.map((list) => {
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
      </ScrollView>
    </View>
  );
};
