import React, { useState } from 'react';
import { AccessibilityInfo, View, StyleSheet, TouchableOpacity, Modal, ScrollView, Pressable } from 'react-native';
import { AppText } from './AppText';
import { Group } from './ui/Group';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EXPENSE_CATEGORIES, getExpenseCategoryLabel } from '../constants/expenseCategories';
import { useThemeColors, fontSizes, fontWeights, spacing, radii } from '../theme';
import { useLanguage } from '../context/LanguageContext';

interface CategoryPickerProps {
  selectedCategory?: string;
  onSelectCategory: (categoryId: string) => void;
  onClear?: () => void;
}

export const CategoryPicker: React.FC<CategoryPickerProps> = ({
  selectedCategory,
  onSelectCategory,
  onClear,
}) => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [reduceMotion, setReduceMotion] = useState(false);
  React.useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);
  const { t } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);
  const selectedCat = selectedCategory ? EXPENSE_CATEGORIES.find(c => c.id === selectedCategory) : null;

  const styles = React.useMemo(() => StyleSheet.create({
    pickerButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      minHeight: 44,
      justifyContent: 'center',
    },
    selectedContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    placeholderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    placeholderText: {
      flex: 1,
      fontSize: fontSizes.md,
      color: colors.textSecondary,
    },
    selectedText: {
      fontSize: fontSizes.md,
      color: colors.text,
      fontWeight: fontWeights.medium,
      flex: 1,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.shadowStrong,
    },
    modalOverlayInner: {
      flex: 1,
      justifyContent: 'flex-end',
      pointerEvents: 'box-none',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      paddingBottom: Math.max(insets.bottom, spacing.md),
      maxHeight: '80%',
      paddingTop: spacing.lg,
    },
    modalHeader: {
      gap: spacing.sm,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    closeButton: {
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalTitle: {
      flex: 1,
      fontSize: 20,
      fontWeight: fontWeights.bold,
      color: colors.text,
    },
    categoriesList: {
      paddingVertical: spacing.md,
    },
    categoryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
      minHeight: 60,
    },
    categoryItemSelected: {
      backgroundColor: colors.primaryUltraSoft,
    },
    categoryText: {
      fontSize: fontSizes.md,
      color: colors.text,
      flex: 1,
    },
  }), [colors, insets.bottom]);

  const handleSelect = (categoryId: string) => {
    onSelectCategory(categoryId);
    setModalVisible(false);
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    }
    setModalVisible(false);
  };

  const closeModal = () => setModalVisible(false);

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${t('expenses.categoryOptional')}: ${selectedCat ? getExpenseCategoryLabel(t, selectedCat.id) : t('expenses.categoryPickerPlaceholder')}`}
        accessibilityState={{ expanded: modalVisible }}
        style={styles.pickerButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        {selectedCat ? (
          <View style={styles.selectedContainer}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primaryUltraSoft }]}>
              <Ionicons name={selectedCat.icon} size={20} color={colors.primary} />
            </View>
            <AppText style={styles.selectedText}>
              {getExpenseCategoryLabel(t, selectedCat.id)}
            </AppText>
            <Ionicons name="chevron-down-outline" size={20} color={colors.textSecondary} />
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <AppText style={styles.placeholderText}>{t('expenses.categoryPickerPlaceholder')}</AppText>
            <Ionicons name="chevron-down-outline" size={20} color={colors.textSecondary} />
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType={reduceMotion ? 'none' : 'slide'}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            style={StyleSheet.absoluteFillObject}
            onPress={closeModal}
          />
          <View style={styles.modalOverlayInner}>
            <View style={styles.modalContent} accessibilityViewIsModal>
              <View style={styles.modalHeader}>
                <AppText accessibilityRole="header" style={styles.modalTitle}>{t('expenses.selectCategory')}</AppText>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('common.close')} style={styles.closeButton} onPress={closeModal}>
                  <Ionicons name="close-outline" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.categoriesList} showsVerticalScrollIndicator={false}>
              <Group>
              {onClear && selectedCategory && (
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.categoryItem}
                  onPress={handleClear}
                >
                  <View style={[styles.iconContainer, { backgroundColor: colors.surfaceAlt }]}>
                    <Ionicons name="close-circle-outline" size={20} color={colors.textSecondary} />
                  </View>
                  <AppText style={styles.categoryText}>{t('expenses.clearCategorySelection')}</AppText>
                </TouchableOpacity>
              )}
              
              {EXPENSE_CATEGORIES.map((category) => (
                <TouchableOpacity
                  accessibilityRole="radio"
                  accessibilityState={{ selected: selectedCategory === category.id, checked: selectedCategory === category.id }}
                  key={category.id}
                  style={[
                    styles.categoryItem,
                    selectedCategory === category.id && styles.categoryItemSelected,
                  ]}
                  onPress={() => handleSelect(category.id)}
                >
                  <View style={[styles.iconContainer, { backgroundColor: colors.primaryUltraSoft }]}>
                    <Ionicons name={category.icon} size={20} color={colors.primary} />
                  </View>
                  <AppText style={styles.categoryText}>{getExpenseCategoryLabel(t, category.id)}</AppText>
                  {selectedCategory === category.id && (
                    <Ionicons name="checkmark-circle-outline" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
              </Group>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

